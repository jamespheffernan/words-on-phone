const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const CulturalValidationScorer = require('./cultural-validation-scorer');

const app = express();
const PORT = process.env.CULTURAL_VALIDATION_PORT || 3007;

// Initialize cultural validation scorer
const culturalValidationScorer = new CulturalValidationScorer();

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
    const stats = await culturalValidationScorer.getStats();
    res.json({
      status: 'healthy',
      service: 'cultural_validation_scorer',
      components_available: {
        category_boost: stats.components.category_boost.available || false,
        reddit_validation: stats.components.reddit_validation.available || false,
        language_bonus: stats.components.language_bonus.available || false
      },
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      service: 'cultural_validation_scorer',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Score cultural validation for a phrase
 * POST /score-cultural-validation
 * Body: { "phrase": "example phrase" }
 * Returns: { "total_score": 18, "components": {...}, "breakdown": {...}, "cultural_classification": "highly_popular", "duration_ms": 12 }
 */
app.post('/score-cultural-validation', async (req, res) => {
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
    
    // Score cultural validation
    const result = await culturalValidationScorer.scoreCulturalValidation(phrase);
    
    // Add request metadata
    result.request_duration_ms = Date.now() - startTime;
    
    // Log performance warning if above threshold
    if (result.duration_ms > 100) {
      console.warn(`⚠️ Slow cultural validation calculation: ${result.duration_ms}ms for "${phrase}"`);
    }
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ Cultural validation scoring error:', error);
    
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
 * Batch score cultural validation for multiple phrases
 * POST /batch-score-cultural-validation
 * Body: { "phrases": ["phrase1", "phrase2", ...] }
 */
app.post('/batch-score-cultural-validation', async (req, res) => {
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
    
    if (phrases.length === 0 || phrases.length > 50) {
      return res.status(400).json({
        error: 'Invalid batch size',
        message: 'phrases array must contain 1-50 items',
        duration_ms: Date.now() - startTime
      });
    }
    
    // Batch score cultural validation
    const batchResult = await culturalValidationScorer.batchScoreCulturalValidation(phrases);
    
    // Add request metadata
    batchResult.request_duration_ms = Date.now() - startTime;
    
    res.json(batchResult);
    
  } catch (error) {
    console.error('❌ Batch cultural validation scoring error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get cultural validation scoring statistics
 */
app.get('/stats', async (req, res) => {
  try {
    const stats = await culturalValidationScorer.getStats();
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
 * Test cultural validation scoring with sample phrases
 * GET /test
 */
app.get('/test', async (req, res) => {
  try {
    const testPhrases = [
      // Pop-culture (expect high category + Reddit scores)
      'taylor swift',             // Celebrity name
      'star wars',                // Major entertainment franchise
      'netflix',                  // Popular streaming service
      'tiktok',                   // Social media platform
      'marvel',                   // Entertainment brand
      
      // Food category (expect high category + medium Reddit scores)
      'pizza',                    // Popular food item
      'mcdonalds',                // Major food chain
      'starbucks',                // Popular coffee chain
      'sushi',                    // Popular dish
      'food truck',               // Food culture
      
      // Sports category (expect high category + medium Reddit scores)
      'basketball',               // Major sport
      'super bowl',               // Major sports event
      'nfl',                      // Sports league
      'olympics',                 // Global sports event
      'fantasy football',         // Sports culture
      
      // High Reddit but no category (expect high Reddit, no category)
      'apple',                    // Major brand
      'google',                   // Major brand
      'amazon',                   // Major brand
      
      // Medium popularity (expect medium Reddit scores)
      'restaurant',               // Common topic
      'technology',               // Common topic
      'travel',                   // Common topic
      
      // Low popularity/obscure (expect low scores)
      'quantum computing',        // Technical/specialized
      'pharmaceutical research',  // Professional/academic
      'administrative procedure', // Corporate/bureaucratic
      'test phrase'               // Generic/unknown
    ];
    
    console.log('🧪 Running cultural validation test with sample phrases...');
    
    const batchResult = await culturalValidationScorer.batchScoreCulturalValidation(testPhrases);
    const results = batchResult.results;
    const summary = batchResult.summary;
    
    // Calculate performance metrics
    const performanceRate = results.filter(r => r.duration_ms <= 100).length / results.length * 100;
    const popularityRate = results.filter(r => ['highly_popular', 'moderately_popular'].includes(r.cultural_classification)).length / results.length * 100;
    const categoryRate = results.filter(r => r.breakdown.category_boost_points > 0).length / results.length * 100;
    const differentiationRate = (results.filter(r => r.cultural_classification === 'highly_popular').length > 0 && 
                                results.filter(r => r.cultural_classification === 'obscure').length > 0) ? 100 : 0;
    
    console.log(`📊 Test completed: ${performanceRate.toFixed(1)}% under 100ms target`);
    console.log(`📊 Popularity detection rate: ${popularityRate.toFixed(1)}% of phrases detected as popular`);
    console.log(`📊 Category detection rate: ${categoryRate.toFixed(1)}% of phrases matched categories`);
    console.log(`📊 Popular vs obscure differentiation: ${differentiationRate.toFixed(1)}% success`);
    
    // Log individual results with component breakdown
    for (const result of results) {
      const breakdown = `[C:${result.breakdown.category_boost_points}, R:${result.breakdown.reddit_validation_points}, L:+${result.breakdown.language_bonus_points}]`;
      console.log(`   📊 "${result.phrase}": ${result.total_score}/20+ points ${breakdown} - ${result.cultural_classification} (${result.duration_ms}ms)`);
    }
    
    res.json({
      test: 'cultural_validation_sample_phrases',
      results,
      summary: {
        ...summary,
        performance_rate: `${performanceRate.toFixed(1)}%`,
        performance_target_met: performanceRate >= 80,
        popularity_rate: `${popularityRate.toFixed(1)}%`,
        popularity_target_met: popularityRate >= 50,
        category_rate: `${categoryRate.toFixed(1)}%`,
        category_target_met: categoryRate >= 40,
        differentiation_rate: `${differentiationRate.toFixed(1)}%`,
        differentiation_target_met: differentiationRate >= 90
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
 * Get component breakdown for debugging
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
    
    // Get detailed component breakdown
    const result = await culturalValidationScorer.scoreCulturalValidation(phrase);
    
    // Add debug information
    const debugInfo = {
      phrase: result.phrase,
      total_score: result.total_score,
      cultural_classification: result.cultural_classification,
      detailed_breakdown: {
        category_boost: {
          points: result.breakdown.category_boost_points,
          category_matches: result.components.category_boost.category_matches,
          primary_category: result.components.category_boost.primary_category,
          match_count: result.components.category_boost.match_count
        },
        reddit_validation: {
          points: result.breakdown.reddit_validation_points,
          popularity_indicators: result.components.reddit_validation.popularity_indicators,
          simulated_metrics: result.components.reddit_validation.simulated_metrics,
          reddit_score_basis: result.components.reddit_validation.reddit_score_basis
        },
        language_bonus: {
          bonus_points: result.breakdown.language_bonus_points,
          estimated_language_count: result.components.language_bonus.estimated_language_count,
          concept_type: result.components.language_bonus.concept_type,
          global_presence: result.components.language_bonus.global_presence
        }
      },
      duration_ms: result.duration_ms,
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
 * Check category patterns for a phrase (utility endpoint)
 * POST /check-categories
 * Body: { "phrase": "example phrase" }
 */
app.post('/check-categories', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { phrase } = req.body;
    
    if (!phrase || typeof phrase !== 'string') {
      return res.status(400).json({
        error: 'phrase is required and must be a string'
      });
    }
    
    // Get just category boost information
    const categoryResult = culturalValidationScorer.scoreCategoryBoost(phrase);
    
    res.json({
      phrase,
      category_analysis: categoryResult,
      request_duration_ms: Date.now() - startTime
    });
    
  } catch (error) {
    console.error('❌ Category check error:', error);
    res.status(500).json({
      error: 'Category check failed',
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
    // Cultural validation scorer doesn't need initialization (no external dependencies)
    console.log('🔄 Cultural validation scorer ready (no initialization required)');
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Cultural validation scorer service running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔍 Score cultural validation: POST http://localhost:${PORT}/score-cultural-validation`);
      console.log(`🧪 Test cultural validation: GET http://localhost:${PORT}/test`);
      console.log(`🐛 Debug scoring: POST http://localhost:${PORT}/debug`);
      console.log(`📂 Check categories: POST http://localhost:${PORT}/check-categories`);
      console.log(`📈 Stats: http://localhost:${PORT}/stats`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down cultural validation scorer service...');
  await culturalValidationScorer.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down cultural validation scorer service...');
  await culturalValidationScorer.close();
  process.exit(0);
});

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app; 