const fs = require('fs');
const path = require('path');
const https = require('https');
const { createReadStream, createWriteStream } = require('fs');
const { createBrotliDecompress } = require('zlib');
const readline = require('readline');
const redis = require('redis');
const DatasetLoader = require('../shared/dataset-loader');

/**
 * WikidataProcessor - Downloads and processes Wikidata dump for phrase distinctiveness
 */
class WikidataProcessor {
  constructor(options = {}) {
    this.redisClient = null;
    this.dataDir = options.dataDir || path.join(__dirname, '../../data/wikidata');
    this.dumpUrl = options.dumpUrl || 'https://dumps.wikimedia.org/wikidatawiki/entities/latest-all.json.bz2';
    this.maxEntries = options.maxEntries || 50000000; // Target 50M+ entries
    this.batchSize = options.batchSize || 10000; // Redis batch size
    this.processedCount = 0;
    this.skippedCount = 0;
    
    // Dataset loader for JSON fallback mode
    this.datasetLoader = new DatasetLoader(options);
    this.mode = null; // 'redis' or 'json'
    
    // Ensure data directory exists
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /**
   * Initialize Redis connection
   */
  async initRedis() {
    try {
      this.redisClient = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });
      
      await this.redisClient.connect();
      console.log('✅ WikidataProcessor connected to Redis');
      
      // Test Redis performance
      const start = Date.now();
      await this.redisClient.set('test:wikidata:performance', 'test');
      const exists = await this.redisClient.exists('test:wikidata:performance');
      const duration = Date.now() - start;
      
      console.log(`🔍 Redis performance test: ${duration}ms (target: <50ms)`);
      
      if (duration > 50) {
        console.warn('⚠️ Redis performance above target threshold');
      }
      
      this.mode = 'redis';
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error.message);
      return false;
    }
  }

  /**
   * Initialize JSON dataset mode (fallback for serverless)
   */
  async initJSON() {
    try {
      console.log('🔄 Initializing WikidataProcessor in JSON mode...');
      
      const success = await this.datasetLoader.initialize();
      if (!success) {
        throw new Error('Failed to initialize DatasetLoader');
      }
      
      // Verify we have Wikidata data
      const wikidataEntities = this.datasetLoader.getWikidataEntities();
      const entityCount = Object.keys(wikidataEntities).length;
      
      if (entityCount === 0) {
        throw new Error('No Wikidata entities found in JSON datasets');
      }
      
      console.log(`✅ WikidataProcessor JSON mode ready: ${entityCount} entities loaded`);
      this.mode = 'json';
      return true;
      
    } catch (error) {
      console.error('❌ Failed to initialize WikidataProcessor JSON mode:', error.message);
      return false;
    }
  }

  /**
   * Initialize processor in optimal mode (Redis first, JSON fallback)
   */
  async initialize() {
    console.log('🔄 Initializing WikidataProcessor (auto-detecting mode)...');
    
    // Try Redis first
    const redisSuccess = await this.initRedis();
    if (redisSuccess) {
      return true;
    }
    
    // Fallback to JSON mode
    console.log('🔄 Redis unavailable, falling back to JSON mode...');
    return await this.initJSON();
  }

  /**
   * Download Wikidata dump if not exists
   */
  async downloadDump() {
    const dumpPath = path.join(this.dataDir, 'latest-all.json.bz2');
    
    if (fs.existsSync(dumpPath)) {
      console.log('📁 Wikidata dump already exists, skipping download');
      return dumpPath;
    }
    
    console.log('📥 Downloading Wikidata dump (this may take several hours)...');
    console.log(`🔗 URL: ${this.dumpUrl}`);
    
    return new Promise((resolve, reject) => {
      const file = createWriteStream(dumpPath);
      let downloadedBytes = 0;
      
      https.get(this.dumpUrl, (response) => {
        const totalBytes = parseInt(response.headers['content-length'], 10);
        
        response.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          const progress = ((downloadedBytes / totalBytes) * 100).toFixed(1);
          process.stdout.write(`\r📥 Downloaded: ${progress}% (${(downloadedBytes / 1024 / 1024).toFixed(1)} MB)`);
        });
        
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          console.log('\n✅ Wikidata dump downloaded successfully');
          resolve(dumpPath);
        });
        
        file.on('error', (error) => {
          fs.unlink(dumpPath, () => {}); // Delete partial file
          reject(error);
        });
      }).on('error', reject);
    });
  }

  /**
   * Process Wikidata dump and load into Redis
   */
  async processDump() {
    const dumpPath = await this.downloadDump();
    console.log('🔄 Processing Wikidata dump...');
    
    // Create read stream with bzip2 decompression
    const fileStream = createReadStream(dumpPath);
    const decompressStream = createBrotliDecompress();
    const rl = readline.createInterface({
      input: fileStream.pipe(decompressStream),
      crlfDelay: Infinity
    });
    
    let batch = [];
    let lineCount = 0;
    const startTime = Date.now();
    
    for await (const line of rl) {
      lineCount++;
      
      // Skip first and last lines (array brackets)
      if (lineCount === 1 || line.trim() === ']') {
        continue;
      }
      
      try {
        // Remove trailing comma and parse JSON
        const cleanLine = line.replace(/,$/, '');
        if (!cleanLine.trim()) continue;
        
        const entity = JSON.parse(cleanLine);
        const processed = this.extractEntityData(entity);
        
        if (processed) {
          batch.push(processed);
          
          // Process batch when full
          if (batch.length >= this.batchSize) {
            await this.processBatch(batch);
            batch = [];
            
            // Progress reporting
            if (this.processedCount % 100000 === 0) {
              const elapsed = (Date.now() - startTime) / 1000;
              const rate = this.processedCount / elapsed;
              console.log(`📊 Processed: ${this.processedCount.toLocaleString()} entities (${rate.toFixed(0)}/sec)`);
            }
          }
        }
        
        // Stop if we've reached max entries
        if (this.processedCount >= this.maxEntries) {
          console.log(`🎯 Reached target of ${this.maxEntries.toLocaleString()} entries`);
          break;
        }
        
      } catch (error) {
        this.skippedCount++;
        if (this.skippedCount % 10000 === 0) {
          console.log(`⚠️ Skipped ${this.skippedCount} invalid entries`);
        }
      }
    }
    
    // Process remaining batch
    if (batch.length > 0) {
      await this.processBatch(batch);
    }
    
    const totalTime = (Date.now() - startTime) / 1000;
    console.log(`✅ Processing complete:`);
    console.log(`   📊 Processed: ${this.processedCount.toLocaleString()} entities`);
    console.log(`   ⚠️ Skipped: ${this.skippedCount.toLocaleString()} invalid entries`);
    console.log(`   ⏱️ Duration: ${(totalTime / 60).toFixed(1)} minutes`);
    console.log(`   🚀 Rate: ${(this.processedCount / totalTime).toFixed(0)} entities/sec`);
  }

  /**
   * Extract relevant data from Wikidata entity
   */
  extractEntityData(entity) {
    if (!entity.labels || !entity.labels.en) {
      return null; // Skip entities without English labels
    }
    
    const data = {
      id: entity.id,
      label: entity.labels.en.value.toLowerCase(),
      aliases: [],
      type: 'wikidata_exact'
    };
    
    // Extract English aliases
    if (entity.aliases && entity.aliases.en) {
      data.aliases = entity.aliases.en
        .map(alias => alias.value.toLowerCase())
        .filter(alias => alias.length >= 2 && alias.length <= 50); // Reasonable phrase length
    }
    
    // Add sitelinks count for popularity scoring
    if (entity.sitelinks) {
      data.sitelinks = Object.keys(entity.sitelinks).length;
    }
    
    return data;
  }

  /**
   * Process batch of entities into Redis
   */
  async processBatch(batch) {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized');
    }
    
    const pipeline = this.redisClient.multi();
    
    for (const entity of batch) {
      // Store main label
      pipeline.hSet(`wikidata:${entity.label}`, {
        id: entity.id,
        type: entity.type,
        sitelinks: entity.sitelinks || 0,
        timestamp: Date.now()
      });
      
      // Store aliases
      for (const alias of entity.aliases) {
        if (alias !== entity.label) { // Don't duplicate main label
          pipeline.hSet(`wikidata:${alias}`, {
            id: entity.id,
            type: 'wikidata_alias',
            main_label: entity.label,
            sitelinks: entity.sitelinks || 0,
            timestamp: Date.now()
          });
        }
      }
    }
    
    await pipeline.exec();
    this.processedCount += batch.length;
  }

  /**
   * Check if phrase exists in Wikidata
   * Returns distinctiveness score (0-25 points)
   */
  async checkDistinctiveness(phrase) {
    if (!this.mode) {
      throw new Error('WikidataProcessor not initialized - call initialize() first');
    }
    
    const startTime = Date.now();
    const normalizedPhrase = phrase.toLowerCase().trim();
    
    if (this.mode === 'redis') {
      return await this.checkDistinctivenessRedis(normalizedPhrase, startTime);
    } else {
      return await this.checkDistinctivenessJSON(normalizedPhrase, startTime);
    }
  }

  /**
   * Check distinctiveness using Redis mode
   */
  async checkDistinctivenessRedis(normalizedPhrase, startTime) {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized');
    }
    
    // Check exact match first (25 points)
    const exactMatch = await this.redisClient.hGetAll(`wikidata:${normalizedPhrase}`);
    if (Object.keys(exactMatch).length > 0) {
      const duration = Date.now() - startTime;
      return {
        score: 25,
        type: 'wikidata_exact',
        id: exactMatch.id,
        sitelinks: parseInt(exactMatch.sitelinks) || 0,
        duration_ms: duration
      };
    }
    
    // Check for alias match (20 points)
    const words = normalizedPhrase.split(' ');
    for (const word of words) {
      const aliasMatch = await this.redisClient.hGetAll(`wikidata:${word}`);
      if (Object.keys(aliasMatch).length > 0 && aliasMatch.type === 'wikidata_alias') {
        const duration = Date.now() - startTime;
        return {
          score: 20,
          type: 'wikidata_alias',
          id: aliasMatch.id,
          main_label: aliasMatch.main_label,
          sitelinks: parseInt(aliasMatch.sitelinks) || 0,
          duration_ms: duration
        };
      }
    }
    
    const duration = Date.now() - startTime;
    return {
      score: 0,
      type: 'not_found',
      duration_ms: duration
    };
  }

  /**
   * Check distinctiveness using JSON mode
   */
  async checkDistinctivenessJSON(normalizedPhrase, startTime) {
    // Check exact match first (25 points)
    const exactExists = this.datasetLoader.checkWikidataEntity(normalizedPhrase);
    if (exactExists) {
      const duration = Date.now() - startTime;
      return {
        score: 25,
        type: 'wikidata_exact',
        id: `json_${normalizedPhrase}`, // Simplified ID for JSON mode
        sitelinks: 1, // Simplified sitelink count
        duration_ms: duration
      };
    }
    
    // Check for partial word matches (20 points)
    const words = normalizedPhrase.split(' ');
    for (const word of words) {
      if (word.length >= 3) { // Only check meaningful words
        const wordExists = this.datasetLoader.checkWikidataEntity(word);
        if (wordExists) {
          const duration = Date.now() - startTime;
          return {
            score: 20,
            type: 'wikidata_partial',
            id: `json_${word}`,
            main_label: word,
            sitelinks: 1,
            duration_ms: duration
          };
        }
      }
    }
    
    const duration = Date.now() - startTime;
    return {
      score: 0,
      type: 'not_found',
      duration_ms: duration
    };
  }

  /**
   * Get processing statistics
   */
  async getStats() {
    if (this.mode === 'redis') {
      return await this.getStatsRedis();
    } else if (this.mode === 'json') {
      return this.getStatsJSON();
    } else {
      return { connected: false, mode: 'not_initialized' };
    }
  }

  /**
   * Get Redis mode statistics
   */
  async getStatsRedis() {
    if (!this.redisClient) {
      return { connected: false };
    }
    
    const info = await this.redisClient.info('keyspace');
    const dbInfo = info.match(/db0:keys=(\d+)/);
    const keyCount = dbInfo ? parseInt(dbInfo[1]) : 0;
    
    return {
      connected: true,
      mode: 'redis',
      total_keys: keyCount,
      processed_entities: this.processedCount,
      skipped_entities: this.skippedCount,
      target_entries: this.maxEntries,
      progress_percent: ((this.processedCount / this.maxEntries) * 100).toFixed(1)
    };
  }

  /**
   * Get JSON mode statistics
   */
  getStatsJSON() {
    if (!this.datasetLoader) {
      return { connected: false, mode: 'json', error: 'DatasetLoader not initialized' };
    }
    
    const loaderStats = this.datasetLoader.getStats();
    return {
      connected: true,
      mode: 'json',
      total_entities: loaderStats.datasetSizes.wikidata,
      load_time_ms: loaderStats.loadTime,
      avg_lookup_time_ms: loaderStats.avgLookupTime,
      total_lookups: loaderStats.lookupCount,
      environment: loaderStats.environment
    };
  }

  /**
   * Close Redis connection
   */
  async close() {
    if (this.redisClient) {
      await this.redisClient.quit();
      console.log('🔌 Disconnected from Redis');
    }
  }
}

module.exports = WikidataProcessor; 