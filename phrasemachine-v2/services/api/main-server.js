const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const fetch = require('node-fetch');

// Database integration
const { initializeDatabase, getDatabase } = require('../../database/connection');
const Phrase = require('../../database/models/phrase');
const PhraseScore = require('../../database/models/phrase-score');
const GenerationSession = require('../../database/models/generation-session');

const app = express();
const PORT = process.env.PHRASEMACHINE_API_PORT || 3000;

// Database instance
let db = null;

// Service configuration
const SERVICES = {
  distinctiveness: { port: 3004, name: 'Distinctiveness Scorer' },
  describability: { port: 3005, name: 'Describability Scorer' },
  legacy: { port: 3006, name: 'Legacy Heuristics Scorer' },
  cultural: { port: 3007, name: 'Cultural Validation Scorer' },
  decision_engine: { port: 3008, name: 'Decision Engine' },
  llm_generator: { port: 3009, name: 'LLM Generator' }
};

// Global state tracking
let systemHealth = {
  services: {},
  last_health_check: null,
  system_ready: false,
  startup_time: Date.now()
};

// Request tracking
let requestMetrics = {
  total_requests: 0,
  successful_requests: 0,
  failed_requests: 0,
  avg_response_time: 0,
  request_history: []
};

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging and metrics middleware
app.use((req, res, next) => {
  const start = Date.now();
  requestMetrics.total_requests++;
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // Update metrics
    if (res.statusCode < 400) {
      requestMetrics.successful_requests++;
    } else {
      requestMetrics.failed_requests++;
    }
    
    // Update average response time
    const totalResponses = requestMetrics.successful_requests + requestMetrics.failed_requests;
    requestMetrics.avg_response_time = 
      (requestMetrics.avg_response_time * (totalResponses - 1) + duration) / totalResponses;
    
    // Store request history (last 100 requests)
    requestMetrics.request_history.unshift({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      timestamp: new Date().toISOString()
    });
    requestMetrics.request_history = requestMetrics.request_history.slice(0, 100);
    
    console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  
  next();
});

/**
 * Utility function to make service requests
 */
async function callService(serviceName, endpoint, options = {}) {
  const service = SERVICES[serviceName];
  if (!service) {
    throw new Error(`Unknown service: ${serviceName}`);
  }
  
  const url = `http://localhost:${service.port}${endpoint}`;
  const requestOptions = {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    timeout: options.timeout || 30000
  };
  
  if (options.body) {
    requestOptions.body = JSON.stringify(options.body);
  }
  
  console.log(`🔗 Calling ${service.name}: ${requestOptions.method} ${url}`);
  
  try {
    const response = await fetch(url, requestOptions);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`${service.name} error: ${data.message || response.statusText}`);
    }
    
    return data;
  } catch (error) {
    console.error(`❌ Service call failed - ${service.name}: ${error.message}`);
    throw error;
  }
}

/**
 * Health check all services
 */
async function checkSystemHealth() {
  console.log('🏥 Performing system health check...');
  const healthResults = {};
  
  for (const [serviceName, service] of Object.entries(SERVICES)) {
    try {
      const startTime = Date.now();
      const response = await callService(serviceName, '/health');
      const responseTime = Date.now() - startTime;
      
      healthResults[serviceName] = {
        status: 'healthy',
        name: service.name,
        port: service.port,
        response_time_ms: responseTime,
        details: response,
        last_check: new Date().toISOString()
      };
      
      console.log(`✅ ${service.name} (${service.port}): healthy (${responseTime}ms)`);
    } catch (error) {
      healthResults[serviceName] = {
        status: 'unhealthy',
        name: service.name,
        port: service.port,
        error: error.message,
        last_check: new Date().toISOString()
      };
      
      console.error(`❌ ${service.name} (${service.port}): unhealthy - ${error.message}`);
    }
  }
  
  // Update global health state
  systemHealth.services = healthResults;
  systemHealth.last_health_check = new Date().toISOString();
  
  // Determine system readiness
  const healthyServices = Object.values(healthResults).filter(s => s.status === 'healthy').length;
  const totalServices = Object.keys(SERVICES).length;
  systemHealth.system_ready = healthyServices >= totalServices * 0.8; // 80% services must be healthy
  
  console.log(`🎯 System health: ${healthyServices}/${totalServices} services healthy, system ${systemHealth.system_ready ? 'ready' : 'not ready'}`);
  
  return healthResults;
}

/**
 * System health and status endpoint
 */
app.get('/health', async (req, res) => {
  try {
    const healthCheck = await checkSystemHealth();
    
    // Check database health
    let databaseHealth = { status: 'unknown', error: 'Database not initialized' };
    if (db) {
      try {
        databaseHealth = await db.checkHealth();
      } catch (error) {
        databaseHealth = { status: 'unhealthy', error: error.message };
      }
    }
    
    const summary = {
      system_status: systemHealth.system_ready && databaseHealth.status === 'healthy' ? 'healthy' : 'degraded',
      phrasemachine_version: '2.0.0',
      api_version: '1.0.0',
      services: healthCheck,
      database: databaseHealth,
      metrics: {
        uptime_ms: Date.now() - systemHealth.startup_time,
        total_requests: requestMetrics.total_requests,
        success_rate: requestMetrics.total_requests > 0 ? 
          (requestMetrics.successful_requests / requestMetrics.total_requests * 100).toFixed(1) + '%' : '0%',
        avg_response_time_ms: Math.round(requestMetrics.avg_response_time)
      },
      timestamp: new Date().toISOString()
    };
    
    const statusCode = systemHealth.system_ready && databaseHealth.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(summary);
  } catch (error) {
    res.status(500).json({
      system_status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Complete phrase evaluation and generation endpoint
 * POST /evaluate-and-generate
 * Body: { "requirements": { "category": "pop_culture", "count": 10, "quality_target": "good" } }
 */
app.post('/evaluate-and-generate', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const {
      requirements = {},
      generation_options = {},
      scoring_options = {}
    } = req.body;
    
    const {
      category = 'general',
      count = 10,
      quality_target = 'good',
      use_feedback = true
    } = requirements;
    
    console.log(`🎯 Starting complete phrase evaluation and generation: ${count} ${quality_target} ${category} phrases...`);
    
    // Step 1: Generate phrases using LLM Generator
    console.log('   📝 Step 1: Generating phrases...');
    const generationResult = await callService('llm_generator', '/generate-phrases', {
      method: 'POST',
      body: {
        count,
        category,
        quality_target,
        use_feedback,
        ...generation_options
      }
    });
    
    // Step 2: Additional scoring analysis (optional detailed breakdown)
    let detailedScoring = null;
    if (scoring_options.detailed_analysis) {
      console.log('   📊 Step 2: Performing detailed scoring analysis...');
      
      const phrases = generationResult.generated_phrases;
      const scoringResults = await Promise.all([
        callService('distinctiveness', '/batch-score-distinctiveness', {
          method: 'POST',
          body: { phrases }
        }),
        callService('describability', '/batch-score-describability', {
          method: 'POST',
          body: { phrases }
        }),
        callService('legacy', '/batch-score-legacy-heuristics', {
          method: 'POST',
          body: { phrases }
        }),
        callService('cultural', '/batch-score-cultural-validation', {
          method: 'POST',
          body: { phrases }
        })
      ]);
      
      detailedScoring = {
        distinctiveness: scoringResults[0],
        describability: scoringResults[1],
        legacy_heuristics: scoringResults[2],
        cultural_validation: scoringResults[3]
      };
    }
    
    // Compile complete result
    const result = {
      generation_result: generationResult,
      detailed_scoring: detailedScoring,
      system_performance: {
        total_duration_ms: Date.now() - startTime,
        generation_duration_ms: generationResult.performance?.total_duration_ms || 0,
        scoring_duration_ms: detailedScoring ? 
          Object.values(detailedScoring).reduce((sum, s) => sum + (s.performance_ms || 0), 0) : 0
      },
      metadata: {
        phrasemachine_version: '2.0.0',
        request_id: `pm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        requirements,
        system_health: systemHealth.system_ready
      }
    };
    
    console.log(`✅ Complete evaluation and generation completed: ${generationResult.generated_phrases?.length || 0} phrases, avg score ${generationResult.quality_metrics?.avg_score?.toFixed(1) || 'N/A'}/100 (${Date.now() - startTime}ms)`);
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ Evaluation and generation error:', error);
    
    res.status(500).json({
      error: 'Evaluation and generation failed',
      message: error.message,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      request_requirements: req.body.requirements || {}
    });
  }
});

/**
 * Quick phrase scoring endpoint
 * POST /score-phrases
 * Body: { "phrases": ["taylor swift", "pizza delivery"], "detailed": true }
 */
app.post('/score-phrases', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { phrases = [], detailed = false } = req.body;
    
    if (!Array.isArray(phrases) || phrases.length === 0) {
      return res.status(400).json({
        error: 'Invalid phrases',
        message: 'phrases must be a non-empty array',
        duration_ms: Date.now() - startTime
      });
    }
    
    if (phrases.length > 50) {
      return res.status(400).json({
        error: 'Too many phrases',
        message: 'Maximum 50 phrases per request',
        duration_ms: Date.now() - startTime
      });
    }
    
    console.log(`📊 Scoring ${phrases.length} phrases${detailed ? ' with detailed breakdown' : ''}...`);
    
    // Use decision engine for unified scoring
    const scoringResult = await callService('decision_engine', '/batch-score-phrases', {
      method: 'POST',
      body: { phrases }
    });
    
    // Get detailed component breakdown if requested
    let componentBreakdown = null;
    if (detailed) {
      console.log('   🔍 Getting detailed component breakdown...');
      
      const componentResults = await Promise.all([
        callService('distinctiveness', '/batch-score-distinctiveness', {
          method: 'POST',
          body: { phrases }
        }),
        callService('describability', '/batch-score-describability', {
          method: 'POST',
          body: { phrases }
        }),
        callService('legacy', '/batch-score-legacy-heuristics', {
          method: 'POST',
          body: { phrases }
        }),
        callService('cultural', '/batch-score-cultural-validation', {
          method: 'POST',
          body: { phrases }
        })
      ]);
      
      componentBreakdown = {
        distinctiveness: componentResults[0],
        describability: componentResults[1],
        legacy_heuristics: componentResults[2],
        cultural_validation: componentResults[3]
      };
    }
    
    const result = {
      unified_scoring: scoringResult,
      component_breakdown: componentBreakdown,
      performance: {
        total_duration_ms: Date.now() - startTime,
        phrases_count: phrases.length,
        avg_score: scoringResult.summary?.avg_final_score || 0
      },
      metadata: {
        phrasemachine_version: '2.0.0',
        detailed_analysis: detailed,
        timestamp: new Date().toISOString()
      }
    };
    
    console.log(`✅ Scoring completed: ${phrases.length} phrases, avg score ${result.performance.avg_score.toFixed(1)}/100 (${Date.now() - startTime}ms)`);
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ Phrase scoring error:', error);
    
    res.status(500).json({
      error: 'Phrase scoring failed',
      message: error.message,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Diverse batch generation endpoint
 * POST /generate-diverse-batch
 * Body: { "total_count": 20, "categories": ["pop_culture", "food"], "quality_distribution": { "excellent": 0.3, "good": 0.7 } }
 */
app.post('/generate-diverse-batch', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const batchOptions = req.body;
    
    console.log(`🌟 Generating diverse batch: ${batchOptions.total_count || 20} phrases...`);
    
    // Use LLM Generator for diverse batch generation
    const batchResult = await callService('llm_generator', '/generate-diverse-batch', {
      method: 'POST',
      body: batchOptions
    });
    
    const result = {
      batch_result: batchResult,
      system_performance: {
        total_duration_ms: Date.now() - startTime,
        generation_duration_ms: batchResult.performance?.total_duration_ms || 0
      },
      metadata: {
        phrasemachine_version: '2.0.0',
        request_id: `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        batch_options: batchOptions
      }
    };
    
    console.log(`✅ Diverse batch completed: ${batchResult.all_phrases?.length || 0} phrases, ${batchResult.overall_quality?.avg_score?.toFixed(1) || 'N/A'}/100 avg score (${Date.now() - startTime}ms)`);
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ Diverse batch generation error:', error);
    
    res.status(500).json({
      error: 'Diverse batch generation failed',
      message: error.message,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * System capabilities and configuration endpoint
 */
app.get('/capabilities', async (req, res) => {
  try {
    console.log('⚙️ Retrieving system capabilities...');
    
    // Get capabilities from all services
    const capabilityResults = await Promise.all([
      callService('llm_generator', '/capabilities'),
      callService('decision_engine', '/algorithm'),
      callService('distinctiveness', '/stats'),
      callService('describability', '/stats'),
      callService('legacy', '/stats'),
      callService('cultural', '/stats')
    ]);
    
    const capabilities = {
      phrasemachine_version: '2.0.0',
      api_version: '1.0.0',
      system_capabilities: {
        phrase_generation: {
          max_phrases_per_request: 50,
          max_batch_size: 100,
          supported_categories: ['general', 'pop_culture', 'food', 'sports'],
          quality_targets: ['good', 'excellent'],
          feedback_optimization: true,
          diversity_controls: true
        },
        phrase_scoring: {
          scoring_range: '0-100 points',
          components: ['distinctiveness', 'describability', 'legacy_heuristics', 'cultural_validation'],
          quality_classifications: ['excellent', 'good', 'acceptable', 'poor', 'unacceptable'],
          decision_categories: ['auto_accept', 'likely_accept', 'conditional_accept', 'likely_reject', 'auto_reject'],
          batch_scoring: true,
          real_time_evaluation: true
        },
        performance_targets: {
          single_generation: '< 30s',
          batch_generation: '< 2min',
          phrase_scoring: '< 10s',
          target_quality: '60+ points',
          target_acceptance_rate: '70+ %'
        }
      },
      service_capabilities: {
        llm_generator: capabilityResults[0],
        decision_engine: capabilityResults[1],
        distinctiveness: capabilityResults[2],
        describability: capabilityResults[3],
        legacy_heuristics: capabilityResults[4],
        cultural_validation: capabilityResults[5]
      },
      system_health: systemHealth,
      timestamp: new Date().toISOString()
    };
    
    res.json(capabilities);
    
  } catch (error) {
    console.error('❌ Capabilities retrieval error:', error);
    
    res.status(500).json({
      error: 'Failed to retrieve capabilities',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * System statistics and metrics endpoint
 */
app.get('/stats', async (req, res) => {
  try {
    console.log('📊 Retrieving system statistics...');
    
    // Get stats from all services
    const statsResults = await Promise.allSettled([
      callService('llm_generator', '/stats'),
      callService('decision_engine', '/stats'),
      callService('distinctiveness', '/stats'),
      callService('describability', '/stats'),
      callService('legacy', '/stats'),
      callService('cultural', '/stats')
    ]);
    
    const serviceStats = {};
    const serviceNames = ['llm_generator', 'decision_engine', 'distinctiveness', 'describability', 'legacy', 'cultural'];
    
    statsResults.forEach((result, index) => {
      const serviceName = serviceNames[index];
      if (result.status === 'fulfilled') {
        serviceStats[serviceName] = result.value;
      } else {
        serviceStats[serviceName] = { error: result.reason.message };
      }
    });
    
    const stats = {
      phrasemachine_version: '2.0.0',
      api_version: '1.0.0',
      system_metrics: {
        uptime_ms: Date.now() - systemHealth.startup_time,
        total_requests: requestMetrics.total_requests,
        successful_requests: requestMetrics.successful_requests,
        failed_requests: requestMetrics.failed_requests,
        success_rate: requestMetrics.total_requests > 0 ? 
          (requestMetrics.successful_requests / requestMetrics.total_requests * 100).toFixed(1) + '%' : '0%',
        avg_response_time_ms: Math.round(requestMetrics.avg_response_time),
        requests_per_minute: requestMetrics.request_history.filter(
          r => Date.now() - new Date(r.timestamp).getTime() < 60000
        ).length
      },
      service_stats: serviceStats,
      recent_requests: requestMetrics.request_history.slice(0, 10),
      system_health: systemHealth,
      timestamp: new Date().toISOString()
    };
    
    res.json(stats);
    
  } catch (error) {
    console.error('❌ Statistics retrieval error:', error);
    
    res.status(500).json({
      error: 'Failed to retrieve statistics',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Comprehensive system test endpoint
 */
app.get('/test', async (req, res) => {
  try {
    console.log('🧪 Running comprehensive system test...');
    
    const testResults = {
      test_start: new Date().toISOString(),
      phases: {}
    };
    
    // Phase 1: Service Health Check
    console.log('   🏥 Phase 1: Service Health Check...');
    const healthCheck = await checkSystemHealth();
    testResults.phases.health_check = {
      status: systemHealth.system_ready ? 'passed' : 'failed',
      healthy_services: Object.values(healthCheck).filter(s => s.status === 'healthy').length,
      total_services: Object.keys(SERVICES).length,
      details: healthCheck
    };
    
    // Phase 2: Phrase Scoring Test
    console.log('   📊 Phase 2: Phrase Scoring Test...');
    const testPhrases = ['taylor swift', 'pizza delivery', 'basketball court', 'abstract concept'];
    const scoringTest = await callService('decision_engine', '/batch-score-phrases', {
      method: 'POST',
      body: { phrases: testPhrases }
    });
    testResults.phases.scoring_test = {
      status: scoringTest.results.length === testPhrases.length ? 'passed' : 'failed',
      phrases_tested: testPhrases.length,
      avg_score: scoringTest.summary?.avg_final_score || 0,
      details: scoringTest.summary
    };
    
    // Phase 3: Phrase Generation Test
    console.log('   📝 Phase 3: Phrase Generation Test...');
    const generationTest = await callService('llm_generator', '/generate-phrases', {
      method: 'POST',
      body: { count: 5, category: 'general', quality_target: 'good' }
    });
    testResults.phases.generation_test = {
      status: generationTest.generated_phrases?.length === 5 ? 'passed' : 'failed',
      phrases_generated: generationTest.generated_phrases?.length || 0,
      avg_score: generationTest.quality_metrics?.avg_score || 0,
      sample_phrases: generationTest.generated_phrases?.slice(0, 3) || []
    };
    
    // Phase 4: Complete Workflow Test
    console.log('   🔄 Phase 4: Complete Workflow Test...');
    const workflowTest = await callService('llm_generator', '/generate-phrases', {
      method: 'POST',
      body: { count: 3, category: 'pop_culture', quality_target: 'excellent' }
    });
    testResults.phases.workflow_test = {
      status: workflowTest.generated_phrases?.length > 0 && workflowTest.quality_metrics?.avg_score > 50 ? 'passed' : 'failed',
      phrases_generated: workflowTest.generated_phrases?.length || 0,
      avg_score: workflowTest.quality_metrics?.avg_score || 0,
      acceptance_rate: workflowTest.quality_metrics?.acceptance_rate || 0
    };
    
    // Calculate overall test result
    const totalPhases = Object.keys(testResults.phases).length;
    const passedPhases = Object.values(testResults.phases).filter(p => p.status === 'passed').length;
    
    testResults.overall_result = {
      status: passedPhases === totalPhases ? 'passed' : 'failed',
      passed_phases: passedPhases,
      total_phases: totalPhases,
      success_rate: Math.round((passedPhases / totalPhases) * 100) + '%'
    };
    
    testResults.test_end = new Date().toISOString();
    testResults.test_duration_ms = new Date(testResults.test_end).getTime() - new Date(testResults.test_start).getTime();
    
    console.log(`📊 System test completed: ${testResults.overall_result.success_rate} success rate (${passedPhases}/${totalPhases} phases passed)`);
    
    res.json(testResults);
    
  } catch (error) {
    console.error('❌ System test error:', error);
    
    res.status(500).json({
      error: 'System test failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Endpoint ${req.method} ${req.originalUrl} not found`,
    available_endpoints: [
      'GET /health - System health and service status',
      'POST /evaluate-and-generate - Complete phrase evaluation and generation',
      'POST /score-phrases - Quick phrase scoring with optional detailed breakdown',
      'POST /generate-diverse-batch - Diverse batch generation across categories',
      'GET /capabilities - System capabilities and configuration',
      'GET /stats - System statistics and metrics',
      'GET /test - Comprehensive system test'
    ],
    timestamp: new Date().toISOString()
  });
});

// Initialize and start server
async function startServer() {
  try {
    console.log('🚀 Starting PhraseMachine v2 API Server...');
    console.log('⚙️ Service Configuration:');
    Object.entries(SERVICES).forEach(([name, service]) => {
      console.log(`   ${service.name}: http://localhost:${service.port}`);
    });
    
    // Initialize database
    db = await initializeDatabase();
    console.log('✅ Database initialized');

    // Perform initial health check
    await checkSystemHealth();
    
    if (systemHealth.system_ready) {
      console.log('✅ All services healthy - system ready for production');
    } else {
      console.warn('⚠️ Some services unhealthy - starting in degraded mode');
    }
    
    // Start server
    app.listen(PORT, () => {
      console.log(`\n🎯 PhraseMachine v2 API Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🎯 Complete workflow: POST http://localhost:${PORT}/evaluate-and-generate`);
      console.log(`📊 Score phrases: POST http://localhost:${PORT}/score-phrases`);
      console.log(`🌟 Diverse batch: POST http://localhost:${PORT}/generate-diverse-batch`);
      console.log(`⚙️ Capabilities: http://localhost:${PORT}/capabilities`);
      console.log(`📈 Statistics: http://localhost:${PORT}/stats`);
      console.log(`🧪 System test: http://localhost:${PORT}/test`);
      console.log(`\n🎉 PhraseMachine v2 API ready for production use!`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down PhraseMachine v2 API Server...');
  if (db) {
    await db.close();
    console.log('✅ Database connection closed');
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down PhraseMachine v2 API Server...');
  if (db) {
    await db.close();
    console.log('✅ Database connection closed');
  }
  process.exit(0);
});

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app; 