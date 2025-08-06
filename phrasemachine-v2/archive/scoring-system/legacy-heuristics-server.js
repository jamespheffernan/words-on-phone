const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const LegacyHeuristicsScorer = require('./legacy-heuristics-scorer');

const app = express();
const PORT = process.env.LEGACY_HEURISTICS_PORT || 3006;

// Initialize legacy heuristics scorer
const legacyHeuristicsScorer = new LegacyHeuristicsScorer();

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
    const stats = await legacyHeuristicsScorer.getStats();
    res.json({
      status: 'healthy',
      service: 'legacy_heuristics_scorer',
      components_available: {
        word_simplicity: stats.components.word_simplicity.available || false,
        length_bonus: stats.components.length_bonus.available || false
      },
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      service: 'legacy_heuristics_scorer',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Score legacy heuristics for a phrase
 * POST /score-legacy-heuristics
 * Body: { "phrase": "example phrase" }
 * Returns: { "total_score": 25, "components": {...}, "breakdown": {...}, "duration_ms": 5 }
 */
app.post('/score-legacy-heuristics', async (req, res) => {
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
    
    if (phrase.length < 1 || phrase.length > 100) {
      return res.status(400).json({
        error: 'Invalid phrase length',
        message: 'phrase must be between 1 and 100 characters',
        duration_ms: Date.now() - startTime
      });
    }
    
    // Score legacy heuristics
    const result = await legacyHeuristicsScorer.scoreLegacyHeuristics(phrase);
    
    // Add request metadata
    result.request_duration_ms = Date.now() - startTime;
    
    // Log performance warning if above threshold
    if (result.duration_ms > 50) {
      console.warn(`⚠️ Slow legacy heuristics calculation: ${result.duration_ms}ms for "${phrase}"`);
    }
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ Legacy heuristics scoring error:', error);
    
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
 * Batch score legacy heuristics for multiple phrases
 * POST /batch-score-legacy-heuristics
 * Body: { "phrases": ["phrase1", "phrase2", ...] }
 */
app.post('/batch-score-legacy-heuristics', async (req, res) => {
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
    
    // Batch score legacy heuristics
    const batchResult = await legacyHeuristicsScorer.batchScoreLegacyHeuristics(phrases);
    
    // Add request metadata
    batchResult.request_duration_ms = Date.now() - startTime;
    
    res.json(batchResult);
    
  } catch (error) {
    console.error('❌ Batch legacy heuristics scoring error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get legacy heuristics scoring statistics
 */
app.get('/stats', async (req, res) => {
  try {
    const stats = await legacyHeuristicsScorer.getStats();
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
 * Test legacy heuristics scoring with sample phrases
 * GET /test
 */
app.get('/test', async (req, res) => {
  try {
    const testPhrases = [
      // Simple common words (expect high scores)
      'coffee shop',              // Common words, optimal length
      'good food',                // Very common words, optimal length
      'big dog',                  // Simple words, optimal length
      
      // Medium complexity (expect medium scores)
      'pizza delivery',           // Mix of common/tier words
      'music festival',           // Mix of common/tier words
      'computer game',            // Mix of common/tier words
      
      // Complex/uncommon words (expect lower scores)
      'quantum computing',        // Complex technical terms
      'philosophical discussion', // Complex academic terms
      'pharmaceutical research',  // Complex professional terms
      
      // Length variations
      'test',                     // Single word (length penalty)
      'the big red car',          // Optimal 4 words
      'this is a very long phrase with many words', // Too long (length penalty)
      
      // Mixed examples
      'basketball court',         // Sports + common word
      'ice cream',                // Common compound
      'social media'              // Modern common terms
    ];
    
    console.log('🧪 Running legacy heuristics test with sample phrases...');
    
    const batchResult = await legacyHeuristicsScorer.batchScoreLegacyHeuristics(testPhrases);
    const results = batchResult.results;
    const summary = batchResult.summary;
    
    // Calculate performance metrics
    const performanceRate = results.filter(r => r.duration_ms <= 50).length / results.length * 100;
    const simplicityRate = results.filter(r => r.total_score >= 15).length / results.length * 100;
    const highQualityRate = results.filter(r => r.total_score >= 20).length / results.length * 100;
    
    console.log(`📊 Test completed: ${performanceRate.toFixed(1)}% under 50ms target`);
    console.log(`📊 Simplicity rate: ${simplicityRate.toFixed(1)}% of phrases score ≥15 points`);
    console.log(`📊 High quality rate: ${highQualityRate.toFixed(1)}% of phrases score ≥20 points`);
    
    // Log individual results with component breakdown
    for (const result of results) {
      const breakdown = `[W:${result.breakdown.word_simplicity_points.toFixed(1)}, L:${result.breakdown.length_bonus_points}]`;
      console.log(`   📊 "${result.phrase}": ${result.total_score.toFixed(1)}/30 points ${breakdown} - ${result.duration_ms}ms`);
    }
    
    res.json({
      test: 'legacy_heuristics_sample_phrases',
      results,
      summary: {
        ...summary,
        performance_rate: `${performanceRate.toFixed(1)}%`,
        performance_target_met: performanceRate >= 90,
        simplicity_rate: `${simplicityRate.toFixed(1)}%`,
        simplicity_target_met: simplicityRate >= 60,
        high_quality_rate: `${highQualityRate.toFixed(1)}%`,
        high_quality_target_met: highQualityRate >= 30
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
    const result = await legacyHeuristicsScorer.scoreLegacyHeuristics(phrase);
    
    // Add debug information
    const debugInfo = {
      phrase: result.phrase,
      total_score: result.total_score,
      detailed_breakdown: {
        word_simplicity: {
          points: result.breakdown.word_simplicity_points,
          word_scores: result.components.word_simplicity.word_scores,
          total_raw_score: result.components.word_simplicity.total_raw_score,
          max_possible_score: result.components.word_simplicity.max_possible_score,
          word_count: result.components.word_simplicity.word_count
        },
        length_bonus: {
          points: result.breakdown.length_bonus_points,
          reason: result.components.length_bonus.reason,
          word_count: result.components.length_bonus.word_count,
          optimal_range: result.components.length_bonus.optimal_range
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
    // Legacy heuristics scorer doesn't need initialization (no external dependencies)
    console.log('🔄 Legacy heuristics scorer ready (no initialization required)');
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Legacy heuristics scorer service running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔍 Score legacy heuristics: POST http://localhost:${PORT}/score-legacy-heuristics`);
      console.log(`🧪 Test legacy heuristics: GET http://localhost:${PORT}/test`);
      console.log(`🐛 Debug scoring: POST http://localhost:${PORT}/debug`);
      console.log(`📈 Stats: http://localhost:${PORT}/stats`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down legacy heuristics scorer service...');
  await legacyHeuristicsScorer.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down legacy heuristics scorer service...');
  await legacyHeuristicsScorer.close();
  process.exit(0);
});

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app; 