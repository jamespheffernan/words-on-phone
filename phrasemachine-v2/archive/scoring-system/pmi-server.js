const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const NgramProcessor = require('./ngram-processor');

const app = express();
const PORT = process.env.PMI_PORT || 3002;

// Initialize N-gram processor
const ngramProcessor = new NgramProcessor();

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
    const stats = await ngramProcessor.getStats();
    res.json({
      status: 'healthy',
      service: 'pmi',
      redis_connected: stats.connected,
      corpus_loaded: stats.corpus && stats.corpus.total_ngrams > 0,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      service: 'pmi',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Calculate PMI for a phrase
 * POST /calculate-pmi
 * Body: { "phrase": "example phrase" }
 * Returns: { "score": 15, "pmi": 4.2, "type": "pmi_calculated", "duration_ms": 25 }
 */
app.post('/calculate-pmi', async (req, res) => {
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
    
    // Validate phrase has 2-4 words (required for PMI calculation)
    const wordCount = phrase.trim().split(/\s+/).length;
    if (wordCount < 2 || wordCount > 4) {
      return res.status(400).json({
        error: 'Invalid word count',
        message: 'phrase must contain 2-4 words for PMI calculation',
        word_count: wordCount,
        duration_ms: Date.now() - startTime
      });
    }
    
    // Calculate PMI
    const result = await ngramProcessor.calculatePMI(phrase);
    
    // Add request metadata
    result.request_duration_ms = Date.now() - startTime;
    result.timestamp = new Date().toISOString();
    
    // Log performance warning if above threshold
    if (result.duration_ms > 50) {
      console.warn(`⚠️ Slow PMI calculation: ${result.duration_ms}ms for "${phrase}"`);
    }
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ PMI calculation error:', error);
    
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
 * Batch calculate PMI for multiple phrases
 * POST /batch-calculate-pmi
 * Body: { "phrases": ["phrase1", "phrase2", ...] }
 */
app.post('/batch-calculate-pmi', async (req, res) => {
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
    
    // Calculate PMI for each phrase
    const results = [];
    for (const phrase of phrases) {
      if (typeof phrase === 'string' && phrase.length >= 2 && phrase.length <= 100) {
        const wordCount = phrase.trim().split(/\s+/).length;
        if (wordCount >= 2 && wordCount <= 4) {
          const result = await ngramProcessor.calculatePMI(phrase);
          results.push(result);
        } else {
          results.push({
            phrase,
            score: 0,
            pmi: 0,
            type: 'invalid_word_count',
            error: `Must have 2-4 words (has ${wordCount})`,
            duration_ms: 0
          });
        }
      } else {
        results.push({
          phrase,
          score: 0,
          pmi: 0,
          type: 'invalid_phrase',
          error: 'Invalid phrase format',
          duration_ms: 0
        });
      }
    }
    
    const totalDuration = Date.now() - startTime;
    const avgDuration = results.reduce((sum, r) => sum + r.duration_ms, 0) / results.length;
    const validResults = results.filter(r => r.type === 'pmi_calculated' || r.type === 'not_found');
    
    res.json({
      results,
      summary: {
        total_phrases: phrases.length,
        valid_phrases: validResults.length,
        found_phrases: results.filter(r => r.type === 'pmi_calculated').length,
        avg_duration_ms: Math.round(avgDuration),
        total_duration_ms: totalDuration,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Batch PMI calculation error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get N-gram processing statistics
 */
app.get('/stats', async (req, res) => {
  try {
    const stats = await ngramProcessor.getStats();
    res.json({
      service: 'pmi',
      ngrams: stats,
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
 * Start N-gram ingestion process
 * POST /ingest
 * Starts the Google Books N-gram processing (very long-running operation)
 */
app.post('/ingest', async (req, res) => {
  try {
    // Start ingestion in background
    setImmediate(async () => {
      console.log('🚀 Starting Google Books N-gram ingestion process...');
      try {
        await ngramProcessor.initRedis();
        await ngramProcessor.processNgramFiles();
        console.log('✅ N-gram ingestion completed successfully');
      } catch (error) {
        console.error('❌ N-gram ingestion failed:', error);
      }
    });
    
    res.json({
      message: 'Google Books N-gram ingestion started',
      status: 'processing',
      warning: 'This is a very long-running operation (several hours)',
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
 * Test PMI calculation with sample phrases
 * GET /test
 */
app.get('/test', async (req, res) => {
  try {
    const testPhrases = [
      'machine learning',
      'artificial intelligence', 
      'new york',
      'pizza delivery',
      'completely random phrase',
      'quantum computing',
      'social media',
      'climate change'
    ];
    
    console.log('🧪 Running PMI test with sample phrases...');
    
    const results = [];
    let totalDuration = 0;
    
    for (const phrase of testPhrases) {
      try {
        const result = await ngramProcessor.calculatePMI(phrase);
        results.push(result);
        totalDuration += result.duration_ms;
        
        console.log(`   📊 "${phrase}": PMI=${result.pmi}, Score=${result.score}/15 (${result.duration_ms}ms)`);
      } catch (error) {
        console.error(`   ❌ Error testing "${phrase}":`, error.message);
        results.push({
          phrase,
          score: 0,
          pmi: 0,
          type: 'error',
          error: error.message,
          duration_ms: 0
        });
      }
    }
    
    const avgDuration = totalDuration / results.length;
    const performanceRate = results.filter(r => r.duration_ms <= 50).length / results.length * 100;
    
    console.log(`📊 Test completed: ${performanceRate.toFixed(1)}% under 50ms target`);
    
    res.json({
      test: 'pmi_sample_phrases',
      results,
      summary: {
        total_phrases: testPhrases.length,
        avg_duration_ms: Math.round(avgDuration),
        performance_rate: `${performanceRate.toFixed(1)}%`,
        performance_target_met: performanceRate >= 80,
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
    console.log('🔄 Initializing N-gram processor...');
    const connected = await ngramProcessor.initRedis();
    
    if (!connected) {
      console.error('❌ Failed to connect to Redis, starting server anyway');
    }
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 PMI service running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔍 Calculate PMI: POST http://localhost:${PORT}/calculate-pmi`);
      console.log(`🧪 Test PMI: GET http://localhost:${PORT}/test`);
      console.log(`📈 Stats: http://localhost:${PORT}/stats`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down PMI service...');
  await ngramProcessor.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down PMI service...');
  await ngramProcessor.close();
  process.exit(0);
});

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app; 