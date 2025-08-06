const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const DecisionEngine = require('./decision-engine');

const app = express();
const PORT = process.env.DECISION_ENGINE_PORT || 3008;

// Initialize decision engine
const decisionEngine = new DecisionEngine();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

/**
 * Health check endpoint
 */
app.get('/health', async (req, res) => {
  try {
    const stats = await decisionEngine.getStats();
    const componentsHealthy = Object.values(stats.components).filter(c => !c.error).length;
    const totalComponents = Object.keys(stats.components).length;
    
    res.json({
      status: componentsHealthy >= 2 ? 'healthy' : 'degraded', // Need at least 2 components
      service: 'decision_engine',
      components_status: {
        total: totalComponents,
        healthy: componentsHealthy,
        degraded: totalComponents - componentsHealthy
      },
      algorithm: {
        weights: stats.algorithm?.weights || {},
        thresholds: stats.algorithm?.thresholds || {},
        quality_classifications: stats.algorithm?.quality_classifications || 0
      },
      performance: stats.performance || {},
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      service: 'decision_engine',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Score phrase with unified decision engine
 * POST /score-phrase
 * Body: { "phrase": "example phrase" }
 * Returns: { "final_score": 75.5, "quality_classification": "good", "decision": {...}, "component_scores": {...} }
 */
app.post('/score-phrase', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { phrase } = req.body;
    
    // Validation
    if (!phrase || typeof phrase !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'phrase is required and must be a string',
        duration_ms: Date.now() - startTime
      });
    }
    
    if (phrase.length < 2 || phrase.length > 100) {
      return res.status(400).json({
        error: 'Invalid phrase length',
        message: 'phrase must be between 2 and 100 characters',
        duration_ms: Date.now() - startTime
      });
    }
    
    // Score phrase with decision engine
    const result = await decisionEngine.scorePhrase(phrase);
    
    // Add request metadata
    result.request_duration_ms = Date.now() - startTime;
    
    // Log performance warning if above threshold
    if (result.performance.total_duration_ms > 800) {
      console.warn(`⚠️ Slow decision engine scoring: ${result.performance.total_duration_ms}ms for "${phrase}"`);
    }
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ Decision engine scoring error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      phrase: req.body.phrase,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Batch score multiple phrases with decision engine
 * POST /batch-score-phrases
 * Body: { "phrases": ["phrase1", "phrase2", ...] }
 */
app.post('/batch-score-phrases', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { phrases } = req.body;
    
    // Validation
    if (!Array.isArray(phrases)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'phrases must be an array',
        duration_ms: Date.now() - startTime
      });
    }
    
    if (phrases.length === 0 || phrases.length > 20) {
      return res.status(400).json({
        error: 'Invalid batch size',
        message: 'phrases array must contain 1-20 items',
        duration_ms: Date.now() - startTime
      });
    }
    
    // Batch score phrases with decision engine
    const batchResult = await decisionEngine.batchScorePhrase(phrases);
    
    // Add request metadata
    batchResult.request_duration_ms = Date.now() - startTime;
    
    res.json(batchResult);
    
  } catch (error) {
    console.error('❌ Batch decision engine scoring error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get decision engine statistics
 */
app.get('/stats', async (req, res) => {
  try {
    const stats = await decisionEngine.getStats();
    res.json(stats);
  } catch (error) {
    console.error('❌ Stats error:', error);
    res.status(500).json({
      error: 'Failed to get stats',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Test decision engine with comprehensive sample phrases
 * GET /test
 */
app.get('/test', async (req, res) => {
  try {
    const testPhrases = [
      // Expect excellent scores (80-100): High across all components
      'pizza delivery',           // Food + high concreteness + simple words + popular
      'taylor swift',             // Pop-culture + proper noun + simple words + celebrity
      
      // Expect good scores (60-79): Strong in most components
      'basketball court',         // Sports + high concreteness + simple words + popular
      'coffee shop',              // Food + high concreteness + simple words + popular
      'netflix show',             // Pop-culture + medium concreteness + simple words + popular
      
      // Expect acceptable scores (40-59): Mixed performance
      'machine learning',         // Technical + medium concreteness + complex words + medium popular
      'ice cream',                // Food + high concreteness + simple words + popular but short
      'social media',             // Pop-culture + medium concreteness + simple words + popular
      
      // Expect poor scores (20-39): Low in most components
      'quantum computing',        // Technical + low concreteness + complex words + low popular
      'administrative procedure', // Professional + low concreteness + complex words + low popular
      'abstract concept',         // Academic + low concreteness + medium words + low popular
      
      // Expect unacceptable scores (0-19): Very low across components
      'pharmaceutical research',  // Professional + low concreteness + complex words + low popular
      'test phrase',              // Generic + no category + simple words + no popular
      'unknown terminology'       // Generic + no category + complex words + no popular
    ];
    
    console.log('🧪 Running comprehensive decision engine test...');
    
    const batchResult = await decisionEngine.batchScorePhrase(testPhrases);
    const results = batchResult.results;
    const summary = batchResult.summary;
    
    // Calculate test success metrics
    const performanceRate = results.filter(r => r.performance.within_target).length / results.length * 100;
    const qualityDifferentiation = (summary.quality_distribution.excellent > 0 && 
                                   summary.quality_distribution.unacceptable > 0) ? 100 : 0;
    const acceptanceRate = summary.acceptance_rate;
    const avgScore = summary.avg_final_score;
    
    console.log(`📊 Test completed: ${performanceRate.toFixed(1)}% under 800ms target`);
    console.log(`📊 Quality differentiation: ${qualityDifferentiation.toFixed(1)}% (excellent vs unacceptable phrases detected)`);
    console.log(`📊 Acceptance rate: ${acceptanceRate}% of phrases recommended for acceptance`);
    console.log(`📊 Average final score: ${avgScore.toFixed(1)}/100 points`);
    
    // Log individual results with detailed breakdown
    for (const result of results) {
      const componentBreakdown = `[D:${result.component_scores.distinctiveness}, Des:${result.component_scores.describability}, L:${result.component_scores.legacy_heuristics}, C:${result.component_scores.cultural_validation}]`;
      const decision = result.decision.accept ? '✅' : '❌';
      console.log(`   📊 "${result.phrase}": ${result.final_score.toFixed(1)}/100 ${componentBreakdown} → ${result.quality_classification} ${decision} (${result.performance.total_duration_ms}ms)`);
    }
    
    res.json({
      test: 'decision_engine_comprehensive_test',
      results,
      summary: {
        ...summary,
        test_metrics: {
          performance_rate: `${performanceRate.toFixed(1)}%`,
          performance_target_met: performanceRate >= 80,
          quality_differentiation: `${qualityDifferentiation.toFixed(1)}%`,
          quality_differentiation_met: qualityDifferentiation >= 90,
          acceptance_rate: `${acceptanceRate}%`,
          acceptance_balanced: acceptanceRate >= 30 && acceptanceRate <= 70,
          avg_final_score: avgScore.toFixed(1),
          scoring_range_utilized: (Math.max(...results.map(r => r.final_score)) - 
                                  Math.min(...results.map(r => r.final_score))) > 50
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Test error:', error);
    res.status(500).json({
      error: 'Test failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get detailed component analysis for debugging
 * POST /debug
 * Body: { "phrase": "example phrase" }
 */
app.post('/debug', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { phrase } = req.body;
    
    if (!phrase || typeof phrase !== 'string') {
      return res.status(400).json({
        error: 'phrase is required and must be a string'
      });
    }
    
    // Get detailed analysis
    const result = await decisionEngine.scorePhrase(phrase);
    
    // Create comprehensive debug info
    const debugInfo = {
      phrase: result.phrase,
      final_analysis: {
        final_score: result.final_score,
        quality_classification: result.quality_classification,
        decision: result.decision,
        weighted_contributions: result.weighted_analysis.component_contributions
      },
      component_breakdown: {
        distinctiveness: {
          score: result.component_scores.distinctiveness,
          details: result.component_details.distinctiveness,
          contribution: result.weighted_analysis.component_contributions.distinctiveness?.toFixed(2) || '0.00'
        },
        describability: {
          score: result.component_scores.describability,
          details: result.component_details.describability,
          contribution: result.weighted_analysis.component_contributions.describability?.toFixed(2) || '0.00'
        },
        legacy_heuristics: {
          score: result.component_scores.legacy_heuristics,
          details: result.component_details.legacy_heuristics,
          contribution: result.weighted_analysis.component_contributions.legacy_heuristics?.toFixed(2) || '0.00'
        },
        cultural_validation: {
          score: result.component_scores.cultural_validation,
          details: result.component_details.cultural_validation,
          contribution: result.weighted_analysis.component_contributions.cultural_validation?.toFixed(2) || '0.00'
        }
      },
      algorithm_details: {
        weights: decisionEngine.WEIGHTS,
        thresholds: decisionEngine.THRESHOLDS,
        quality_classifications: decisionEngine.QUALITY_CLASSIFICATIONS[result.quality_classification]
      },
      performance: result.performance,
      request_duration_ms: Date.now() - startTime
    };
    
    res.json(debugInfo);
    
  } catch (error) {
    console.error('❌ Debug error:', error);
    res.status(500).json({
      error: 'Debug failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get algorithm configuration
 * GET /algorithm
 */
app.get('/algorithm', async (req, res) => {
  try {
    res.json({
      weights: decisionEngine.WEIGHTS,
      thresholds: decisionEngine.THRESHOLDS,
      quality_classifications: decisionEngine.QUALITY_CLASSIFICATIONS,
      performance_targets: decisionEngine.PERFORMANCE,
      scoring_components: [
        { name: 'distinctiveness', max_points: 25, weight: decisionEngine.WEIGHTS.DISTINCTIVENESS },
        { name: 'describability', max_points: 25, weight: decisionEngine.WEIGHTS.DESCRIBABILITY },
        { name: 'legacy_heuristics', max_points: 30, weight: decisionEngine.WEIGHTS.LEGACY_HEURISTICS },
        { name: 'cultural_validation', max_points: 20, weight: decisionEngine.WEIGHTS.CULTURAL_VALIDATION }
      ],
      total_max_score: 100,
      algorithm_version: '1.0.0'
    });
  } catch (error) {
    console.error('❌ Algorithm config error:', error);
    res.status(500).json({
      error: 'Failed to get algorithm configuration',
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
    timestamp: new Date().toISOString()
  });
});

// Initialize and start server
async function startServer() {
  try {
    // Initialize decision engine
    console.log('🔄 Initializing decision engine with all scoring components...');
    const initResults = await decisionEngine.initialize();
    
    const componentsReady = Object.values(initResults).filter(Boolean).length;
    const totalComponents = Object.keys(initResults).length;
    
    console.log(`✅ Decision engine initialization: ${componentsReady}/${totalComponents} components ready`);
    
    if (componentsReady < 2) {
      console.warn('⚠️ Limited components available - decision engine will run in degraded mode');
    }
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Decision engine service running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🎯 Score phrase: POST http://localhost:${PORT}/score-phrase`);
      console.log(`🧪 Test decision engine: GET http://localhost:${PORT}/test`);
      console.log(`🐛 Debug scoring: POST http://localhost:${PORT}/debug`);
      console.log(`⚙️ Algorithm config: GET http://localhost:${PORT}/algorithm`);
      console.log(`📈 Stats: http://localhost:${PORT}/stats`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down decision engine service...');
  await decisionEngine.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down decision engine service...');
  await decisionEngine.close();
  process.exit(0);
});

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app; 