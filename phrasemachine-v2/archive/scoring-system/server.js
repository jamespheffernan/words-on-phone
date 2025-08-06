const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const WikidataProcessor = require('./wikidata-processor');

const app = express();
const PORT = process.env.DISTINCTIVENESS_PORT || 3001;

// Initialize Wikidata processor
const wikidataProcessor = new WikidataProcessor();

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
    const stats = await wikidataProcessor.getStats();
    res.json({
      status: 'healthy',
      service: 'distinctiveness',
      redis_connected: stats.connected,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      service: 'distinctiveness',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Check distinctiveness of a phrase
 * POST /check-distinctiveness
 * Body: { "phrase": "example phrase" }
 * Returns: { "score": 25, "type": "wikidata_exact", "duration_ms": 15 }
 */
app.post('/check-distinctiveness', async (req, res) => {
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
    
    // Check distinctiveness
    const result = await wikidataProcessor.checkDistinctiveness(phrase);
    
    // Add request metadata
    result.request_duration_ms = Date.now() - startTime;
    result.phrase = phrase;
    result.timestamp = new Date().toISOString();
    
    // Log performance warning if above threshold
    if (result.duration_ms > 50) {
      console.warn(`⚠️ Slow distinctiveness check: ${result.duration_ms}ms for "${phrase}"`);
    }
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ Distinctiveness check error:', error);
    
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
 * Batch check distinctiveness of multiple phrases
 * POST /batch-check-distinctiveness
 * Body: { "phrases": ["phrase1", "phrase2", ...] }
 */
app.post('/batch-check-distinctiveness', async (req, res) => {
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
    
    // Check each phrase
    const results = [];
    for (const phrase of phrases) {
      if (typeof phrase === 'string' && phrase.length >= 2 && phrase.length <= 100) {
        const result = await wikidataProcessor.checkDistinctiveness(phrase);
        result.phrase = phrase;
        results.push(result);
      } else {
        results.push({
          phrase,
          score: 0,
          type: 'invalid_phrase',
          error: 'Invalid phrase format',
          duration_ms: 0
        });
      }
    }
    
    const totalDuration = Date.now() - startTime;
    const avgDuration = results.reduce((sum, r) => sum + r.duration_ms, 0) / results.length;
    
    res.json({
      results,
      summary: {
        total_phrases: phrases.length,
        valid_phrases: results.filter(r => r.type !== 'invalid_phrase').length,
        avg_duration_ms: Math.round(avgDuration),
        total_duration_ms: totalDuration,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Batch distinctiveness check error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get processing statistics
 */
app.get('/stats', async (req, res) => {
  try {
    const stats = await wikidataProcessor.getStats();
    res.json({
      service: 'distinctiveness',
      wikidata: stats,
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
 * Start data ingestion process
 * POST /ingest
 * Starts the Wikidata dump processing (long-running operation)
 */
app.post('/ingest', async (req, res) => {
  try {
    // Start ingestion in background
    setImmediate(async () => {
      console.log('🚀 Starting Wikidata ingestion process...');
      try {
        await wikidataProcessor.initRedis();
        await wikidataProcessor.processDump();
        console.log('✅ Wikidata ingestion completed successfully');
      } catch (error) {
        console.error('❌ Wikidata ingestion failed:', error);
      }
    });
    
    res.json({
      message: 'Wikidata ingestion started',
      status: 'processing',
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
    console.log('🔄 Initializing Wikidata processor...');
    const connected = await wikidataProcessor.initRedis();
    
    if (!connected) {
      console.error('❌ Failed to connect to Redis, starting server anyway');
    }
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Distinctiveness service running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔍 Check distinctiveness: POST http://localhost:${PORT}/check-distinctiveness`);
      console.log(`📈 Stats: http://localhost:${PORT}/stats`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down distinctiveness service...');
  await wikidataProcessor.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down distinctiveness service...');
  await wikidataProcessor.close();
  process.exit(0);
});

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app; 