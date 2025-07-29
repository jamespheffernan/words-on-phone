const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const DistinctivenessScorer = require('./distinctiveness-scorer');

const app = express();
const PORT = process.env.DISTINCTIVENESS_SCORER_PORT || 3004;

// Initialize distinctiveness scorer
const distinctivenessScorer = new DistinctivenessScorer();

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
    const stats = await distinctivenessScorer.getStats();
    res.json({
      status: 'healthy',
      service: 'distinctiveness_scorer',
      components_connected: {
        wikidata: stats.components.wikidata.connected || false,
        ngram: stats.components.ngram.connected || false,
        wordnet: stats.components.wordnet.available || false
      },
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      service: 'distinctiveness_scorer',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Score distinctiveness for a phrase
 * POST /score-distinctiveness
 * Body: { "phrase": "example phrase" }
 * Returns: { "score": 25, "scoring_method": "exact_wikidata_match", "components": {...}, "duration_ms": 45 }
 */
app.post('/score-distinctiveness', async (req, res) => {
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
    
    // Validate phrase has 2-4 words (distinctiveness requires multi-word phrases)
    const wordCount = phrase.trim().split(/\s+/).length;
    if (wordCount < 2 || wordCount > 4) {
      return res.status(400).json({
        error: 'Invalid word count',
        message: 'phrase must contain 2-4 words for distinctiveness scoring',
        word_count: wordCount,
        duration_ms: Date.now() - startTime
      });
    }
    
    // Score distinctiveness
    const result = await distinctivenessScorer.scoreDistinctiveness(phrase);
    
    // Add request metadata
    result.request_duration_ms = Date.now() - startTime;
    
    // Log performance warning if above threshold
    if (result.duration_ms > 300) {
      console.warn(`⚠️ Slow distinctiveness calculation: ${result.duration_ms}ms for "${phrase}"`);
    }
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ Distinctiveness scoring error:', error);
    
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
 * Batch score distinctiveness for multiple phrases
 * POST /batch-score-distinctiveness
 * Body: { "phrases": ["phrase1", "phrase2", ...] }
 */
app.post('/batch-score-distinctiveness', async (req, res) => {
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
    
    // Batch score distinctiveness
    const batchResult = await distinctivenessScorer.batchScoreDistinctiveness(phrases);
    
    // Add request metadata
    batchResult.request_duration_ms = Date.now() - startTime;
    
    res.json(batchResult);
    
  } catch (error) {
    console.error('❌ Batch distinctiveness scoring error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get distinctiveness scoring statistics
 */
app.get('/stats', async (req, res) => {
  try {
    const stats = await distinctivenessScorer.getStats();
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
 * Test distinctiveness scoring with sample phrases
 * GET /test
 */
app.get('/test', async (req, res) => {
  try {
    const testPhrases = [
      'machine learning',      // Expect PMI high (15 points)
      'artificial intelligence', // Expect PMI high (15 points)  
      'new york',             // Expect exact Wikidata match (25 points)
      'pizza delivery',       // Expect some distinctiveness
      'quantum computing',    // Expect PMI high (15 points)
      'coffee shop',          // Expect WordNet multiword (10 points)
      'social media',         // Expect PMI high (15 points)
      'ice cream',            // Expect WordNet multiword (10 points)
      'climate change',       // Expect some distinctiveness
      'random phrase test'    // Expect no match (0 points)
    ];
    
    console.log('🧪 Running distinctiveness test with sample phrases...');
    
    const batchResult = await distinctivenessScorer.batchScoreDistinctiveness(testPhrases);
    const results = batchResult.results;
    const summary = batchResult.summary;
    
    // Calculate performance metrics
    const performanceRate = results.filter(r => r.duration_ms <= 300).length / results.length * 100;
    const distinctivenessRate = results.filter(r => r.score > 0).length / results.length * 100;
    
    console.log(`📊 Test completed: ${performanceRate.toFixed(1)}% under 300ms target`);
    console.log(`📊 Distinctiveness rate: ${distinctivenessRate.toFixed(1)}% of phrases have distinctiveness`);
    
    // Log individual results
    for (const result of results) {
      console.log(`   📊 "${result.phrase}": ${result.score}/25 points (${result.scoring_method}) - ${result.duration_ms}ms`);
    }
    
    res.json({
      test: 'distinctiveness_sample_phrases',
      results,
      summary: {
        ...summary,
        performance_rate: `${performanceRate.toFixed(1)}%`,
        performance_target_met: performanceRate >= 80,
        distinctiveness_rate: `${distinctivenessRate.toFixed(1)}%`,
        distinctiveness_target_met: distinctivenessRate >= 60
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
    // Initialize distinctiveness scorer
    console.log('🔄 Initializing distinctiveness scorer...');
    const initialized = await distinctivenessScorer.initialize();
    
    if (!initialized) {
      console.error('❌ Failed to initialize distinctiveness scorer, starting server anyway');
    }
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Distinctiveness scorer service running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔍 Score distinctiveness: POST http://localhost:${PORT}/score-distinctiveness`);
      console.log(`🧪 Test distinctiveness: GET http://localhost:${PORT}/test`);
      console.log(`📈 Stats: http://localhost:${PORT}/stats`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down distinctiveness scorer service...');
  await distinctivenessScorer.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down distinctiveness scorer service...');
  await distinctivenessScorer.close();
  process.exit(0);
});

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app; 