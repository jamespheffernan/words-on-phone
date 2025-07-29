const fs = require('fs');
const path = require('path');
const https = require('https');
const { createReadStream, createWriteStream } = require('fs');
const { createBrotliDecompress } = require('zlib');
const readline = require('readline');
const redis = require('redis');

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
      console.log('✅ Connected to Redis');
      
      // Test Redis performance
      const start = Date.now();
      await this.redisClient.set('test:wikidata:performance', 'test');
      const exists = await this.redisClient.exists('test:wikidata:performance');
      const duration = Date.now() - start;
      
      console.log(`🔍 Redis performance test: ${duration}ms (target: <50ms)`);
      
      if (duration > 50) {
        console.warn('⚠️ Redis performance above target threshold');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error.message);
      return false;
    }
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
    if (!this.redisClient) {
      throw new Error('Redis client not initialized');
    }
    
    const startTime = Date.now();
    const normalizedPhrase = phrase.toLowerCase().trim();
    
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
   * Get processing statistics
   */
  async getStats() {
    if (!this.redisClient) {
      return { connected: false };
    }
    
    const info = await this.redisClient.info('keyspace');
    const dbInfo = info.match(/db0:keys=(\d+)/);
    const keyCount = dbInfo ? parseInt(dbInfo[1]) : 0;
    
    return {
      connected: true,
      total_keys: keyCount,
      processed_entities: this.processedCount,
      skipped_entities: this.skippedCount,
      target_entries: this.maxEntries,
      progress_percent: ((this.processedCount / this.maxEntries) * 100).toFixed(1)
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