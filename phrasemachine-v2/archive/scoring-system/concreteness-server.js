const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const ConcretenessProcessor = require('./concreteness-processor');

const app = express();
const PORT = process.env.CONCRETENESS_PORT || 3003;

// Initialize concreteness processor
const concretenessProcessor = new ConcretenessProcessor();

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
    const stats = await concretenessProcessor.getStats();
    res.json({
      status: 'healthy',
      service: 'concreteness',
      redis_connected: stats.connected,
      corpus_loaded: stats.concreteness && stats.concreteness.total_words > 0,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      service: 'concreteness',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Score concreteness for a phrase
 * POST /score-concreteness
 * Body: { "phrase": "example phrase" }
 * Returns: { "score": 15, "concreteness": 4.2, "type": "concreteness_calculated", "duration_ms": 25 }
 */
app.post('/score-concreteness', async (req, res) => {
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
    
    // Score concreteness
    const result = await concretenessProcessor.scoreConcreteness(phrase);
    
    // Add request metadata
    result.request_duration_ms = Date.now() - startTime;
    result.timestamp = new Date().toISOString();
    
    // Log performance warning if above threshold
    if (result.duration_ms > 50) {
      console.warn(`⚠️ Slow concreteness calculation: ${result.duration_ms}ms for "${phrase}"`);
    }
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ Concreteness scoring error:', error);
    
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
 * Batch score concreteness for multiple phrases
 * POST /batch-score-concreteness
 * Body: { "phrases": ["phrase1", "phrase2", ...] }
 */
app.post('/batch-score-concreteness', async (req, res) => {
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
    
    if (phrases.length === 0 || phrases.length > 100) {
      return res.status(400).json({
        error: 'Invalid batch size',
        message: 'phrases array must contain 1-100 items',
        duration_ms: Date.now() - startTime
      });
    }
    
    // Score concreteness for each phrase
    const results = [];
    for (const phrase of phrases) {
      if (typeof phrase === 'string' && phrase.length >= 2 && phrase.length <= 100) {
        const result = await concretenessProcessor.scoreConcreteness(phrase);
        results.push(result);
      } else {
        results.push({
          phrase,
          score: 0,
          concreteness: 0,
          type: 'invalid_phrase',
          error: 'Invalid phrase format',
          duration_ms: 0
        });
      }
    }
    
    const totalDuration = Date.now() - startTime;
    const avgDuration = results.reduce((sum, r) => sum + r.duration_ms, 0) / results.length;
    const validResults = results.filter(r => r.type === 'concreteness_calculated' || r.type === 'words_not_found');
    
    res.json({
      results,
      summary: {
        total_phrases: phrases.length,
        valid_phrases: validResults.length,
        scored_phrases: results.filter(r => r.type === 'concreteness_calculated').length,
        avg_duration_ms: Math.round(avgDuration),
        total_duration_ms: totalDuration,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Batch concreteness scoring error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get concreteness processing statistics
 */
app.get('/stats', async (req, res) => {
  try {
    const stats = await concretenessProcessor.getStats();
    res.json({
      service: 'concreteness',
      concreteness: stats,
      timestamp: new Date().toISOString()
    });
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
 * Start concreteness data ingestion process
 * POST /ingest
 * Starts the Brysbaert concreteness norms processing
 */
app.post('/ingest', async (req, res) => {
  try {
    // Start ingestion in background
    setImmediate(async () => {
      console.log('🚀 Starting Brysbaert concreteness norms ingestion process...');
      try {
        await concretenessProcessor.initRedis();
        await concretenessProcessor.processConcretenessCsv();
        console.log('✅ Concreteness ingestion completed successfully');
      } catch (error) {
        console.error('❌ Concreteness ingestion failed:', error);
      }
    });
    
    res.json({
      message: 'Brysbaert concreteness norms ingestion started',
      status: 'processing',
      note: 'Processing 40k English words with concreteness ratings',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Ingestion start error:', error);
    res.status(500).json({
      error: 'Failed to start ingestion',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Test concreteness scoring with sample phrases
 * GET /test
 */
app.get('/test', async (req, res) => {
  try {
    const testPhrases = [
      'coffee cup',
      'machine learning',
      'artificial intelligence',
      'ice cream',
      'basketball court',
      'pizza delivery',
      'social media',
      'quantum computing',
      'climate change',
      'abstract concept'
    ];
    
    console.log('🧪 Running concreteness test with sample phrases...');
    
    const results = [];
    let totalDuration = 0;
    
    for (const phrase of testPhrases) {
      try {
        const result = await concretenessProcessor.scoreConcreteness(phrase);
        results.push(result);
        totalDuration += result.duration_ms;
        
        console.log(`   📊 "${phrase}": Concreteness=${result.concreteness}, Score=${result.score}/15 (${result.duration_ms}ms)`);
        console.log(`      Coverage: ${result.coverage || 0}% (${result.found_count || 0}/${result.word_count || 0} words)`);
      } catch (error) {
        console.error(`   ❌ Error testing "${phrase}":`, error.message);
        results.push({
          phrase,
          score: 0,
          concreteness: 0,
          type: 'error',
          error: error.message,
          duration_ms: 0
        });
      }
    }
    
    const avgDuration = totalDuration / results.length;
    const performanceRate = results.filter(r => r.duration_ms <= 50).length / results.length * 100;
    const coverage = results.reduce((sum, r) => sum + (r.coverage || 0), 0) / results.length;
    
    console.log(`📊 Test completed: ${performanceRate.toFixed(1)}% under 50ms target`);
    console.log(`📊 Average coverage: ${coverage.toFixed(1)}% of words found`);
    
    res.json({
      test: 'concreteness_sample_phrases',
      results,
      summary: {
        total_phrases: testPhrases.length,
        avg_duration_ms: Math.round(avgDuration),
        avg_coverage_percent: Math.round(coverage),
        performance_rate: `${performanceRate.toFixed(1)}%`,
        performance_target_met: performanceRate >= 80,
        coverage_target_met: coverage >= 90,
        timestamp: new Date().toISOString()
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
    // Initialize Redis connection
    console.log('🔄 Initializing concreteness processor...');
    const connected = await concretenessProcessor.initRedis();
    
    if (!connected) {
      console.error('❌ Failed to connect to Redis, starting server anyway');
    }
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Concreteness service running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔍 Score concreteness: POST http://localhost:${PORT}/score-concreteness`);
      console.log(`🧪 Test concreteness: GET http://localhost:${PORT}/test`);
      console.log(`📈 Stats: http://localhost:${PORT}/stats`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down concreteness service...');
  await concretenessProcessor.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down concreteness service...');
  await concretenessProcessor.close();
  process.exit(0);
});

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app; 