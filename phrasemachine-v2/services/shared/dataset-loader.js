const fs = require('fs');
const path = require('path');
const redis = require('redis');

/**
 * DatasetLoader - Central dataset loading and environment detection
 * 
 * Features:
 * - Detects environment (local Redis vs serverless JSON mode)
 * - Loads combined production datasets from JSON bundle
 * - Provides unified lookup interface for all processors
 * - Handles memory management and caching
 */
class DatasetLoader {
  constructor(options = {}) {
    this.dataDir = options.dataDir || path.join(__dirname, '../../data/production');
    this.redisUrl = options.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';
    
    // Dataset cache
    this.datasets = {
      wikidata: null,
      ngrams: null,
      concreteness: null,
      wordnet: null,
      combined: null
    };
    
    // Environment detection
    this.environment = {
      isServerless: false,
      isNetlify: false,
      redisAvailable: false,
      mode: null // 'redis' or 'json'
    };
    
    // Performance tracking
    this.stats = {
      loadTime: 0,
      lookupCount: 0,
      avgLookupTime: 0
    };
  }

  /**
   * Detect the current environment and determine optimal loading mode
   */
  async detectEnvironment() {
    console.log('🔍 Detecting environment for dataset loading...');
    
    // Check for serverless environment indicators
    this.environment.isNetlify = !!(process.env.NETLIFY || process.env.LAMBDA_TASK_ROOT);
    this.environment.isServerless = !!(
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.VERCEL ||
      process.env.NETLIFY ||
      process.env.FUNCTIONS_EMULATOR
    );
    
    // Test Redis availability (with timeout)
    this.environment.redisAvailable = await this.testRedisConnection();
    
    // Determine optimal mode
    if (this.environment.redisAvailable && !this.environment.isServerless) {
      this.environment.mode = 'redis';
      console.log('✅ Environment: Local development with Redis');
    } else {
      this.environment.mode = 'json';
      console.log(`✅ Environment: ${this.environment.isServerless ? 'Serverless' : 'Local'} - using JSON datasets`);
    }
    
    return this.environment;
  }

  /**
   * Test Redis connection with timeout
   */
  async testRedisConnection(timeoutMs = 1000) {
    try {
      const client = redis.createClient({ url: this.redisUrl });
      
      // Set up timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Redis connection timeout')), timeoutMs);
      });
      
      // Race connection vs timeout
      await Promise.race([
        client.connect(),
        timeoutPromise
      ]);
      
      // Quick ping test
      await client.ping();
      await client.disconnect();
      
      return true;
    } catch (error) {
      console.log(`ℹ️ Redis not available: ${error.message}`);
      return false;
    }
  }

  /**
   * Initialize the dataset loader
   */
  async initialize() {
    const startTime = Date.now();
    console.log('🔄 Initializing DatasetLoader...');
    
    try {
      // Detect environment
      await this.detectEnvironment();
      
      // Load datasets if in JSON mode
      if (this.environment.mode === 'json') {
        await this.loadCombinedDatasets();
      }
      
      this.stats.loadTime = Date.now() - startTime;
      console.log(`✅ DatasetLoader initialized in ${this.stats.loadTime}ms (${this.environment.mode} mode)`);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize DatasetLoader:', error.message);
      return false;
    }
  }

  /**
   * Load combined datasets from JSON file
   */
  async loadCombinedDatasets() {
    const combinedPath = path.join(this.dataDir, 'combined_datasets.json');
    
    if (!fs.existsSync(combinedPath)) {
      throw new Error(`Combined datasets not found at ${combinedPath}`);
    }
    
    console.log('📦 Loading combined production datasets...');
    const rawData = fs.readFileSync(combinedPath, 'utf8');
    this.datasets.combined = JSON.parse(rawData);
    
    // Extract individual datasets for faster access
    this.datasets.wikidata = this.datasets.combined.wikidata || {};
    this.datasets.ngrams = this.datasets.combined.ngrams || {};
    this.datasets.concreteness = this.datasets.combined.concreteness || {};
    this.datasets.wordnet = this.datasets.combined.wordnet || {};
    
    console.log(`📊 Loaded datasets: ${Object.keys(this.datasets.wikidata).length} Wikidata entities, ${Object.keys(this.datasets.ngrams).length} N-grams, ${Object.keys(this.datasets.concreteness).length} concreteness entries`);
  }

  /**
   * Get Wikidata entities (for WikidataProcessor)
   */
  getWikidataEntities() {
    if (this.environment.mode !== 'json') {
      throw new Error('Wikidata entities only available in JSON mode');
    }
    return this.datasets.wikidata;
  }

  /**
   * Check if entity exists in Wikidata
   */
  checkWikidataEntity(phrase) {
    const startTime = Date.now();
    
    if (this.environment.mode !== 'json') {
      throw new Error('Wikidata lookup only available in JSON mode');
    }
    
    const normalizedPhrase = phrase.toLowerCase().trim();
    const exists = this.datasets.wikidata.hasOwnProperty(normalizedPhrase);
    
    this.updateLookupStats(Date.now() - startTime);
    return exists;
  }

  /**
   * Get N-grams data (for NgramProcessor)
   */
  getNgrams() {
    if (this.environment.mode !== 'json') {
      throw new Error('N-grams only available in JSON mode');
    }
    return this.datasets.ngrams;
  }

  /**
   * Get PMI score for N-gram
   */
  getNgramPMI(phrase) {
    const startTime = Date.now();
    
    if (this.environment.mode !== 'json') {
      throw new Error('N-gram lookup only available in JSON mode');
    }
    
    const normalizedPhrase = phrase.toLowerCase().trim();
    const ngramData = this.datasets.ngrams[normalizedPhrase];
    
    this.updateLookupStats(Date.now() - startTime);
    return ngramData ? ngramData.pmi : null;
  }

  /**
   * Get concreteness data (for ConcretenessProcessor)
   */
  getConcreteness() {
    if (this.environment.mode !== 'json') {
      throw new Error('Concreteness data only available in JSON mode');
    }
    return this.datasets.concreteness;
  }

  /**
   * Get concreteness score for word
   */
  getConcretenesScore(word) {
    const startTime = Date.now();
    
    if (this.environment.mode !== 'json') {
      throw new Error('Concreteness lookup only available in JSON mode');
    }
    
    const normalizedWord = word.toLowerCase().trim();
    const score = this.datasets.concreteness[normalizedWord];
    
    this.updateLookupStats(Date.now() - startTime);
    return score || null;
  }

  /**
   * Get WordNet multi-word entries
   */
  getWordNetEntries() {
    if (this.environment.mode !== 'json') {
      throw new Error('WordNet data only available in JSON mode');
    }
    return this.datasets.wordnet;
  }

  /**
   * Update lookup performance statistics
   */
  updateLookupStats(duration) {
    this.stats.lookupCount++;
    this.stats.avgLookupTime = (
      (this.stats.avgLookupTime * (this.stats.lookupCount - 1)) + duration
    ) / this.stats.lookupCount;
  }

  /**
   * Get current mode (redis or json)
   */
  getMode() {
    return this.environment.mode;
  }

  /**
   * Get performance statistics
   */
  getStats() {
    return {
      ...this.stats,
      environment: this.environment,
      datasetSizes: {
        wikidata: this.datasets.wikidata ? Object.keys(this.datasets.wikidata).length : 0,
        ngrams: this.datasets.ngrams ? Object.keys(this.datasets.ngrams).length : 0,
        concreteness: this.datasets.concreteness ? Object.keys(this.datasets.concreteness).length : 0,
        wordnet: this.datasets.wordnet ? Object.keys(this.datasets.wordnet).length : 0
      }
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    const health = {
      status: 'healthy',
      mode: this.environment.mode,
      environment: this.environment,
      datasets_loaded: this.environment.mode === 'json' ? !!this.datasets.combined : null,
      performance: {
        load_time_ms: this.stats.loadTime,
        avg_lookup_time_ms: this.stats.avgLookupTime,
        total_lookups: this.stats.lookupCount
      }
    };

    // Test a quick lookup if in JSON mode
    if (this.environment.mode === 'json' && this.datasets.combined) {
      try {
        const testStart = Date.now();
        this.checkWikidataEntity('test');
        health.performance.test_lookup_ms = Date.now() - testStart;
      } catch (error) {
        health.status = 'degraded';
        health.error = error.message;
      }
    }

    return health;
  }
}

module.exports = DatasetLoader;