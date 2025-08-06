const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const DescribabilityScorer = require('./describability-scorer');

const app = express();
const PORT = process.env.DESCRIBABILITY_SCORER_PORT || 3005;

// Initialize describability scorer
const describabilityScorer = new DescribabilityScorer();

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
    const stats = await describabilityScorer.getStats();
    res.json({
      status: 'healthy',
      service: 'describability_scorer',
      components_connected: {
        concreteness: stats.components.concreteness.connected || false,
        proper_noun: stats.components.proper_noun.available || false,
        weak_head: stats.components.weak_head.available || false
      },
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      service: 'describability_scorer',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Score describability for a phrase
 * POST /score-describability
 * Body: { "phrase": "example phrase" }
 * Returns: { "total_score": 15, "components": {...}, "breakdown": {...}, "duration_ms": 45 }
 */
app.post('/score-describability', async (req, res) => {
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
    
    // Score describability
    const result = await describabilityScorer.scoreDescribability(phrase);
    
    // Add request metadata
    result.request_duration_ms = Date.now() - startTime;
    
    // Log performance warning if above threshold
    if (result.duration_ms > 300) {
      console.warn(`⚠️ Slow describability calculation: ${result.duration_ms}ms for "${phrase}"`);
    }
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ Describability scoring error:', error);
    
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
 * Batch score describability for multiple phrases
 * POST /batch-score-describability
 * Body: { "phrases": ["phrase1", "phrase2", ...] }
 */
app.post('/batch-score-describability', async (req, res) => {
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
    
    // Batch score describability
    const batchResult = await describabilityScorer.batchScoreDescribability(phrases);
    
    // Add request metadata
    batchResult.request_duration_ms = Date.now() - startTime;
    
    res.json(batchResult);
    
  } catch (error) {
    console.error('❌ Batch describability scoring error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get describability scoring statistics
 */
app.get('/stats', async (req, res) => {
  try {
    const stats = await describabilityScorer.getStats();
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
 * Test describability scoring with sample phrases
 * GET /test
 */
app.get('/test', async (req, res) => {
  try {
    const testPhrases = [
      // High concreteness + proper nouns (expect high scores 15-20 points)
      'Taylor Swift',             // High concreteness + proper noun 
      'pizza delivery',           // High concreteness, concrete nouns
      'basketball court',         // High concreteness, concrete nouns
      'coffee shop',              // High concreteness, concrete nouns
      
      // Medium concreteness (expect medium scores 8-13 points)
      'social media',             // Medium concreteness
      'art gallery',              // Medium concreteness
      'music festival',           // Medium concreteness
      
      // Low concreteness (expect low scores 0-5 points)
      'abstract concept',         // Low concreteness
      'emotional intelligence',   // Low concreteness
      'personal growth',          // Low concreteness
      
      // Weak-head patterns (expect penalty -10 points)
      'marketing strategy',       // Weak-head pattern: "strategy"
      'social media vibe',        // Weak-head pattern: "vibe"
      'business culture',         // Weak-head pattern: "culture"
      'brand energy',             // Weak-head pattern: "energy"
      'epic fail',                // Weak-head pattern: "fail"
      
      // Mixed examples
      'New York pizza',           // High concreteness + proper noun (GPE)
      'Apple iPhone',             // High concreteness + proper noun (ORG)
      'quantum moment'            // Low concreteness + weak-head pattern
    ];
    
    console.log('🧪 Running describability test with sample phrases...');
    
    const batchResult = await describabilityScorer.batchScoreDescribability(testPhrases);
    const results = batchResult.results;
    const summary = batchResult.summary;
    
    // Calculate performance metrics
    const performanceRate = results.filter(r => r.duration_ms <= 300).length / results.length * 100;
    const describabilityRate = results.filter(r => r.total_score > 0).length / results.length * 100;
    const highQualityRate = results.filter(r => r.total_score >= 15).length / results.length * 100;
    
    console.log(`📊 Test completed: ${performanceRate.toFixed(1)}% under 300ms target`);
    console.log(`📊 Describability rate: ${describabilityRate.toFixed(1)}% of phrases have describability`);
    console.log(`📊 High quality rate: ${highQualityRate.toFixed(1)}% of phrases highly describable`);
    
    // Log individual results with component breakdown
    for (const result of results) {
      const breakdown = `[C:${result.breakdown.concreteness_points}, P:${result.breakdown.proper_noun_points}, W:${result.breakdown.weak_head_points}]`;
      console.log(`   📊 "${result.phrase}": ${result.total_score}/25 points ${breakdown} - ${result.duration_ms}ms`);
    }
    
    res.json({
      test: 'describability_sample_phrases',
      results,
      summary: {
        ...summary,
        performance_rate: `${performanceRate.toFixed(1)}%`,
        performance_target_met: performanceRate >= 80,
        describability_rate: `${describabilityRate.toFixed(1)}%`,
        describability_target_met: describabilityRate >= 70,
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
    const result = await describabilityScorer.scoreDescribability(phrase);
    
    // Add debug information
    const debugInfo = {
      phrase: result.phrase,
      total_score: result.total_score,
      detailed_breakdown: {
        concreteness: {
          points: result.breakdown.concreteness_points,
          band: result.components.concreteness.band,
          score: result.components.concreteness.concreteness_score,
          word_scores: result.components.concreteness.word_scores
        },
        proper_noun: {
          points: result.breakdown.proper_noun_points,
          detected: result.components.proper_noun.detected
        },
        weak_head: {
          points: result.breakdown.weak_head_points,
          patterns_found: result.components.weak_head.patterns_found
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
    // Initialize describability scorer
    console.log('🔄 Initializing describability scorer...');
    const initialized = await describabilityScorer.initialize();
    
    if (!initialized) {
      console.error('❌ Failed to initialize describability scorer, starting server anyway');
    }
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Describability scorer service running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔍 Score describability: POST http://localhost:${PORT}/score-describability`);
      console.log(`🧪 Test describability: GET http://localhost:${PORT}/test`);
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
  console.log('\n🛑 Shutting down describability scorer service...');
  await describabilityScorer.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down describability scorer service...');
  await describabilityScorer.close();
  process.exit(0);
});

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app; 