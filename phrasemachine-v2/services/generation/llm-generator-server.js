const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const LLMGenerator = require('./llm-generator');

const app = express();
const PORT = process.env.LLM_GENERATOR_PORT || 3009;

// Initialize LLM generator
const llmGenerator = new LLMGenerator();

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
    const stats = await llmGenerator.getStats();
    const generatorReady = stats.components && !stats.error;
    
    res.json({
      status: generatorReady ? 'healthy' : 'degraded',
      service: 'llm_generator',
      components_status: {
        prompt_builder: stats.components?.prompt_builder?.service || 'unknown',
        decision_engine: stats.components?.decision_engine?.service || 'unknown'
      },
      generation_stats: stats.generation_stats || {},
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      service: 'llm_generator',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Generate high-quality phrases with scoring optimization
 * POST /generate-phrases
 * Body: { "count": 10, "category": "general", "quality_target": "good", "use_feedback": true }
 * Returns: { "generated_phrases": [...], "scored_phrases": [...], "quality_metrics": {...} }
 */
app.post('/generate-phrases', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const {
      count = 10,
      category = 'general',
      quality_target = 'good',
      max_attempts = 3,
      use_feedback = true
    } = req.body;
    
    // Validation
    if (count < 1 || count > 50) {
      return res.status(400).json({
        error: 'Invalid count',
        message: 'count must be between 1 and 50',
        duration_ms: Date.now() - startTime
      });
    }
    
    if (!['general', 'pop_culture', 'food', 'sports'].includes(category)) {
      return res.status(400).json({
        error: 'Invalid category',
        message: 'category must be one of: general, pop_culture, food, sports',
        duration_ms: Date.now() - startTime
      });
    }
    
    if (!['good', 'excellent'].includes(quality_target)) {
      return res.status(400).json({
        error: 'Invalid quality_target',
        message: 'quality_target must be "good" or "excellent"',
        duration_ms: Date.now() - startTime
      });
    }
    
    // Generate phrases
    const result = await llmGenerator.generateQualityPhrases({
      count,
      category,
      quality_target,
      max_attempts,
      use_feedback
    });
    
    // Add request metadata
    result.request_duration_ms = Date.now() - startTime;
    
    // Log performance warning if above threshold
    if (result.performance.total_duration_ms > 30000) { // 30 second threshold
      console.warn(`⚠️ Slow phrase generation: ${result.performance.total_duration_ms}ms for ${count} ${category} phrases`);
    }
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ Phrase generation error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Generate diverse batch of phrases across categories
 * POST /generate-diverse-batch
 * Body: { "total_count": 20, "categories": ["pop_culture", "food"], "quality_distribution": { "excellent": 0.3, "good": 0.7 } }
 */
app.post('/generate-diverse-batch', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const {
      total_count = 20,
      categories = ['general'],
      quality_distribution = { excellent: 0.3, good: 0.7 },
      diversity_level = 'high'
    } = req.body;
    
    // Validation
    if (total_count < 1 || total_count > 100) {
      return res.status(400).json({
        error: 'Invalid total_count',
        message: 'total_count must be between 1 and 100',
        duration_ms: Date.now() - startTime
      });
    }
    
    if (!Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({
        error: 'Invalid categories',
        message: 'categories must be a non-empty array',
        duration_ms: Date.now() - startTime
      });
    }
    
    const validCategories = ['general', 'pop_culture', 'food', 'sports'];
    const invalidCategories = categories.filter(cat => !validCategories.includes(cat));
    if (invalidCategories.length > 0) {
      return res.status(400).json({
        error: 'Invalid categories',
        message: `Invalid categories: ${invalidCategories.join(', ')}. Must be one of: ${validCategories.join(', ')}`,
        duration_ms: Date.now() - startTime
      });
    }
    
    // Generate diverse batch
    const result = await llmGenerator.generateDiverseBatch({
      total_count,
      categories,
      quality_distribution,
      diversity_level
    });
    
    // Add request metadata
    result.request_duration_ms = Date.now() - startTime;
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ Diverse batch generation error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Generate phrases with iterative feedback-based improvement
 * POST /generate-with-feedback
 * Body: { "initial_count": 20, "target_quality": 70, "max_iterations": 3, "category": "general" }
 */
app.post('/generate-with-feedback', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const {
      initial_count = 20,
      target_quality = 70,
      max_iterations = 3,
      category = 'general'
    } = req.body;
    
    // Validation
    if (initial_count < 1 || initial_count > 50) {
      return res.status(400).json({
        error: 'Invalid initial_count',
        message: 'initial_count must be between 1 and 50',
        duration_ms: Date.now() - startTime
      });
    }
    
    if (target_quality < 40 || target_quality > 100) {
      return res.status(400).json({
        error: 'Invalid target_quality',
        message: 'target_quality must be between 40 and 100',
        duration_ms: Date.now() - startTime
      });
    }
    
    if (max_iterations < 1 || max_iterations > 5) {
      return res.status(400).json({
        error: 'Invalid max_iterations',
        message: 'max_iterations must be between 1 and 5',
        duration_ms: Date.now() - startTime
      });
    }
    
    // Generate with feedback loop
    const result = await llmGenerator.generateWithFeedbackLoop({
      initial_count,
      target_quality,
      max_iterations,
      category
    });
    
    // Add request metadata
    result.request_duration_ms = Date.now() - startTime;
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ Feedback generation error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get LLM generator statistics and performance metrics
 */
app.get('/stats', async (req, res) => {
  try {
    const stats = await llmGenerator.getStats();
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
 * Test LLM generator with comprehensive phrase generation scenarios
 * GET /test
 */
app.get('/test', async (req, res) => {
  try {
    console.log('🧪 Running comprehensive LLM generator test...');
    
    // Test scenario 1: Category-specific generation
    const testResults = {};
    
    // Test pop-culture generation
    console.log('   🎬 Testing pop-culture generation...');
    const popCultureResult = await llmGenerator.generateQualityPhrases({
      count: 5,
      category: 'pop_culture',
      quality_target: 'good',
      use_feedback: false
    });
    testResults.pop_culture = {
      generated: popCultureResult.generated_phrases.length,
      avg_score: popCultureResult.quality_metrics.avg_score,
      acceptance_rate: popCultureResult.quality_metrics.acceptance_rate,
      duration_ms: popCultureResult.performance.total_duration_ms
    };
    
    // Test food generation
    console.log('   🍕 Testing food generation...');
    const foodResult = await llmGenerator.generateQualityPhrases({
      count: 5,
      category: 'food',
      quality_target: 'good',
      use_feedback: false
    });
    testResults.food = {
      generated: foodResult.generated_phrases.length,
      avg_score: foodResult.quality_metrics.avg_score,
      acceptance_rate: foodResult.quality_metrics.acceptance_rate,
      duration_ms: foodResult.performance.total_duration_ms
    };
    
    // Test sports generation
    console.log('   🏀 Testing sports generation...');
    const sportsResult = await llmGenerator.generateQualityPhrases({
      count: 5,
      category: 'sports',
      quality_target: 'good',
      use_feedback: false
    });
    testResults.sports = {
      generated: sportsResult.generated_phrases.length,
      avg_score: sportsResult.quality_metrics.avg_score,
      acceptance_rate: sportsResult.quality_metrics.acceptance_rate,
      duration_ms: sportsResult.performance.total_duration_ms
    };
    
    // Test scenario 2: Diverse batch generation
    console.log('   🌟 Testing diverse batch generation...');
    const diverseResult = await llmGenerator.generateDiverseBatch({
      total_count: 12,
      categories: ['pop_culture', 'food', 'sports'],
      quality_distribution: { excellent: 0.3, good: 0.7 }
    });
    testResults.diverse_batch = {
      generated: diverseResult.all_phrases.length,
      avg_score: diverseResult.overall_quality.avg_score,
      acceptance_rate: diverseResult.overall_quality.acceptance_rate,
      diversity_score: diverseResult.overall_quality.diversity_score,
      duration_ms: diverseResult.performance.total_duration_ms
    };
    
    // Calculate overall test metrics
    const allResults = [popCultureResult, foodResult, sportsResult];
    const overallMetrics = {
      total_phrases_generated: allResults.reduce((sum, r) => sum + r.generated_phrases.length, 0) + diverseResult.all_phrases.length,
      avg_score_across_tests: allResults.reduce((sum, r) => sum + r.quality_metrics.avg_score, 0) / allResults.length,
      avg_acceptance_rate: allResults.reduce((sum, r) => sum + r.quality_metrics.acceptance_rate, 0) / allResults.length,
      total_test_duration: Object.values(testResults).reduce((sum, r) => sum + r.duration_ms, 0)
    };
    
    console.log(`📊 Test completed:`);
    console.log(`   📝 Generated ${overallMetrics.total_phrases_generated} total phrases`);
    console.log(`   🎯 Average score: ${overallMetrics.avg_score_across_tests.toFixed(1)}/100`);
    console.log(`   ✅ Average acceptance rate: ${overallMetrics.avg_acceptance_rate.toFixed(1)}%`);
    console.log(`   ⏱️ Total test duration: ${overallMetrics.total_test_duration}ms`);
    
    // Log sample phrases from each category
    console.log(`\n📋 Sample phrases generated:`);
    const samplePhrases = [
      ...popCultureResult.generated_phrases.slice(0, 2).map(p => `🎬 ${p}`),
      ...foodResult.generated_phrases.slice(0, 2).map(p => `🍕 ${p}`),
      ...sportsResult.generated_phrases.slice(0, 2).map(p => `🏀 ${p}`)
    ];
    samplePhrases.forEach(phrase => console.log(`   ${phrase}`));
    
    res.json({
      test: 'llm_generator_comprehensive_test',
      test_results: testResults,
      overall_metrics: overallMetrics,
      test_success: {
        generation_success: overallMetrics.total_phrases_generated >= 27, // 5+5+5+12
        quality_success: overallMetrics.avg_score_across_tests >= 60,
        acceptance_success: overallMetrics.avg_acceptance_rate >= 70,
        performance_success: overallMetrics.total_test_duration <= 120000 // 2 minutes
      },
      sample_phrases: samplePhrases
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
 * Get detailed prompt analysis for debugging
 * POST /debug-prompt
 * Body: { "category": "general", "count": 5, "quality_target": "good" }
 */
app.post('/debug-prompt', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const {
      category = 'general',
      count = 5,
      quality_target = 'good',
      additional_constraints = [],
      previous_phrases = []
    } = req.body;
    
    // Build prompt for analysis
    const promptResult = llmGenerator.promptBuilder.buildPrompt({
      category,
      count,
      quality_target,
      additional_constraints,
      previous_phrases
    });
    
    // Get component stats for context
    const promptStats = llmGenerator.promptBuilder.getStats();
    
    const debugInfo = {
      prompt_analysis: {
        category,
        quality_target,
        estimated_tokens: promptResult.metadata.estimated_tokens,
        constraints_applied: promptResult.metadata.constraints_count,
        diversity_context: promptResult.metadata.diversity_context
      },
      prompt_content: {
        full_prompt: promptResult.prompt,
        template_used: promptResult.metadata.template_used,
        length_chars: promptResult.prompt.length
      },
      prompt_builder_stats: promptStats,
      optimization_insights: {
        scoring_insights: Object.keys(llmGenerator.promptBuilder.SCORING_INSIGHTS).length,
        category_templates: Object.keys(llmGenerator.promptBuilder.CATEGORY_TEMPLATES).length,
        quality_targets: Object.keys(llmGenerator.promptBuilder.QUALITY_TARGETS).length
      },
      request_duration_ms: Date.now() - startTime
    };
    
    res.json(debugInfo);
    
  } catch (error) {
    console.error('❌ Debug prompt error:', error);
    res.status(500).json({
      error: 'Debug failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get generation capabilities and configuration
 * GET /capabilities
 */
app.get('/capabilities', async (req, res) => {
  try {
    res.json({
      service: 'llm_generator',
      version: '1.0.0',
      generation_capabilities: {
        supported_categories: ['general', 'pop_culture', 'food', 'sports'],
        quality_targets: ['good', 'excellent'],
        max_count_per_request: 50,
        max_batch_size: 100,
        max_feedback_iterations: 5
      },
      optimization_features: {
        scoring_integration: true,
        feedback_optimization: true,
        diversity_controls: true,
        category_specialization: true,
        quality_targeting: true,
        batch_generation: true
      },
      performance_targets: {
        target_latency_single: '< 30s',
        target_latency_batch: '< 2min',
        target_quality_score: '60+ points',
        target_acceptance_rate: '70+ %'
      },
      scoring_integration: {
        distinctiveness_optimization: true,
        describability_optimization: true,
        legacy_heuristics_optimization: true,
        cultural_validation_optimization: true,
        real_time_scoring: true,
        iterative_improvement: true
      }
    });
  } catch (error) {
    console.error('❌ Capabilities error:', error);
    res.status(500).json({
      error: 'Failed to get capabilities',
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
    // Initialize LLM generator
    console.log('🔄 Initializing LLM generator with all components...');
    const initSuccess = await llmGenerator.initialize();
    
    if (initSuccess) {
      console.log('✅ LLM generator initialization successful - ready for production');
    } else {
      console.warn('⚠️ LLM generator initialization partial - running in degraded mode');
    }
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 LLM generator service running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🎯 Generate phrases: POST http://localhost:${PORT}/generate-phrases`);
      console.log(`🌟 Generate diverse batch: POST http://localhost:${PORT}/generate-diverse-batch`);
      console.log(`🔄 Generate with feedback: POST http://localhost:${PORT}/generate-with-feedback`);
      console.log(`🧪 Test generator: GET http://localhost:${PORT}/test`);
      console.log(`🐛 Debug prompts: POST http://localhost:${PORT}/debug-prompt`);
      console.log(`⚙️ Capabilities: GET http://localhost:${PORT}/capabilities`);
      console.log(`📈 Stats: http://localhost:${PORT}/stats`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down LLM generator service...');
  await llmGenerator.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down LLM generator service...');
  await llmGenerator.close();
  process.exit(0);
});

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app; 