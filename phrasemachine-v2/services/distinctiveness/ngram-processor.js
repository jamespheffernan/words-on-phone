const fs = require('fs');
const path = require('path');
const https = require('https');
const { createReadStream, createWriteStream } = require('fs');
const { createGunzip } = require('zlib');
const readline = require('readline');
const redis = require('redis');

/**
 * NgramProcessor - Downloads and processes Google Books N-gram data for PMI calculations
 */
class NgramProcessor {
  constructor(options = {}) {
    this.redisClient = null;
    this.dataDir = options.dataDir || path.join(__dirname, '../../data/ngrams');
    this.ngramBaseUrl = options.ngramBaseUrl || 'http://storage.googleapis.com/books/ngrams/books';
    this.language = options.language || 'eng';
    this.version = options.version || '2019';
    this.ngramTypes = options.ngramTypes || ['2gram', '3gram', '4gram']; // For 2-4 word phrases
    this.minYear = options.minYear || 2000; // Focus on recent usage
    this.minCount = options.minCount || 40; // Filter low-frequency n-grams
    this.processedCount = 0;
    this.totalNgrams = 0;
    
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
      console.log('✅ Connected to Redis for N-gram storage');
      
      // Test Redis performance
      const start = Date.now();
      await this.redisClient.set('test:ngram:performance', 'test');
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
   * Download N-gram files for specified types
   */
  async downloadNgramFiles() {
    console.log('📥 Downloading Google Books N-gram files...');
    console.log(`📊 Configuration:`);
    console.log(`   🌍 Language: ${this.language}`);
    console.log(`   📅 Version: ${this.version}`);
    console.log(`   📝 N-gram types: ${this.ngramTypes.join(', ')}`);
    console.log(`   📈 Min year: ${this.minYear}`);
    console.log(`   🔢 Min count: ${this.minCount}`);
    
    const downloadedFiles = [];
    
    for (const ngramType of this.ngramTypes) {
      console.log(`\n📁 Processing ${ngramType} files...`);
      
      // Google Books N-grams are split into multiple files (e.g., 2gram-a, 2gram-b, etc.)
      const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
      
      for (let i = 0; i < Math.min(letters.length, 5); i++) { // Limit to first 5 letters for demo
        const letter = letters[i];
        const filename = `googlebooks-${this.language}-all-${ngramType}-${this.version}0101-${letter}.gz`;
        const url = `${this.ngramBaseUrl}/${filename}`;
        const localPath = path.join(this.dataDir, filename);
        
        try {
          if (fs.existsSync(localPath)) {
            console.log(`📁 ${filename} already exists, skipping download`);
            downloadedFiles.push(localPath);
            continue;
          }
          
          console.log(`📥 Downloading ${filename}...`);
          await this.downloadFile(url, localPath);
          downloadedFiles.push(localPath);
          
        } catch (error) {
          console.warn(`⚠️ Failed to download ${filename}: ${error.message}`);
          // Continue with other files
        }
      }
    }
    
    console.log(`✅ Downloaded ${downloadedFiles.length} N-gram files`);
    return downloadedFiles;
  }

  /**
   * Download a single file with progress tracking
   */
  async downloadFile(url, localPath) {
    return new Promise((resolve, reject) => {
      const file = createWriteStream(localPath);
      let downloadedBytes = 0;
      
      https.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode} for ${url}`));
          return;
        }
        
        const totalBytes = parseInt(response.headers['content-length'], 10);
        
        response.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          if (totalBytes) {
            const progress = ((downloadedBytes / totalBytes) * 100).toFixed(1);
            process.stdout.write(`\r   📊 Progress: ${progress}% (${(downloadedBytes / 1024 / 1024).toFixed(1)} MB)`);
          }
        });
        
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          console.log('\n   ✅ Download complete');
          resolve(localPath);
        });
        
        file.on('error', (error) => {
          fs.unlink(localPath, () => {}); // Delete partial file
          reject(error);
        });
      }).on('error', reject);
    });
  }

  /**
   * Process N-gram files and calculate frequency data
   */
  async processNgramFiles() {
    const files = await this.downloadNgramFiles();
    console.log('\n🔄 Processing N-gram files for PMI calculation...');
    
    const startTime = Date.now();
    let totalProcessed = 0;
    
    for (const filePath of files) {
      console.log(`\n📁 Processing ${path.basename(filePath)}...`);
      
      try {
        const processed = await this.processNgramFile(filePath);
        totalProcessed += processed;
        
        console.log(`   ✅ Processed ${processed.toLocaleString()} n-grams`);
        
      } catch (error) {
        console.error(`❌ Error processing ${path.basename(filePath)}:`, error.message);
      }
    }
    
    const totalTime = (Date.now() - startTime) / 1000;
    console.log(`\n✅ N-gram processing complete:`);
    console.log(`   📊 Total processed: ${totalProcessed.toLocaleString()} n-grams`);
    console.log(`   ⏱️ Duration: ${(totalTime / 60).toFixed(1)} minutes`);
    console.log(`   🚀 Rate: ${(totalProcessed / totalTime).toFixed(0)} n-grams/sec`);
    
    // Calculate corpus totals for PMI
    await this.calculateCorpusTotals();
  }

  /**
   * Process a single N-gram file
   */
  async processNgramFile(filePath) {
    const fileStream = createReadStream(filePath);
    const gunzipStream = createGunzip();
    const rl = readline.createInterface({
      input: fileStream.pipe(gunzipStream),
      crlfDelay: Infinity
    });
    
    let processed = 0;
    const batch = [];
    const batchSize = 5000;
    
    for await (const line of rl) {
      try {
        const ngramData = this.parseNgramLine(line);
        
        if (ngramData && this.shouldIncludeNgram(ngramData)) {
          batch.push(ngramData);
          
          if (batch.length >= batchSize) {
            await this.processBatch(batch);
            processed += batch.length;
            batch.length = 0; // Clear batch
            
            // Progress reporting
            if (processed % 50000 === 0) {
              console.log(`     📊 Processed: ${processed.toLocaleString()} n-grams`);
            }
          }
        }
        
      } catch (error) {
        // Skip malformed lines
        continue;
      }
    }
    
    // Process remaining batch
    if (batch.length > 0) {
      await this.processBatch(batch);
      processed += batch.length;
    }
    
    return processed;
  }

  /**
   * Parse a single N-gram line
   * Format: ngram TAB year TAB match_count TAB volume_count
   */
  parseNgramLine(line) {
    const parts = line.split('\t');
    if (parts.length < 3) return null;
    
    const ngram = parts[0].toLowerCase().trim();
    const year = parseInt(parts[1]);
    const matchCount = parseInt(parts[2]);
    const volumeCount = parts[3] ? parseInt(parts[3]) : 1;
    
    if (isNaN(year) || isNaN(matchCount)) return null;
    
    return {
      ngram,
      year,
      matchCount,
      volumeCount
    };
  }

  /**
   * Determine if N-gram should be included
   */
  shouldIncludeNgram(ngramData) {
    // Filter by year and frequency
    if (ngramData.year < this.minYear) return false;
    if (ngramData.matchCount < this.minCount) return false;
    
    // Filter out n-grams with special characters, numbers, etc.
    const ngram = ngramData.ngram;
    if (!/^[a-z\s]+$/.test(ngram)) return false;
    
    // Filter reasonable phrase length (2-50 characters)
    if (ngram.length < 2 || ngram.length > 50) return false;
    
    // Filter n-grams with appropriate word count for phrases
    const wordCount = ngram.split(' ').length;
    if (wordCount < 2 || wordCount > 4) return false;
    
    return true;
  }

  /**
   * Process batch of N-grams into Redis
   */
  async processBatch(batch) {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized');
    }
    
    const pipeline = this.redisClient.multi();
    
    for (const ngram of batch) {
      const key = `ngram:${ngram.ngram}`;
      
      // Store aggregated frequency data
      pipeline.hIncrBy(key, 'total_count', ngram.matchCount);
      pipeline.hIncrBy(key, 'total_volumes', ngram.volumeCount);
      pipeline.hIncrBy(key, 'year_count', 1);
      pipeline.hSet(key, 'last_seen', ngram.year);
      
      // Update corpus totals
      pipeline.incrBy('corpus:total_ngrams', ngram.matchCount);
      pipeline.incrBy('corpus:total_volumes', ngram.volumeCount);
      
      // Track individual words for PMI calculation
      const words = ngram.ngram.split(' ');
      for (const word of words) {
        pipeline.hIncrBy(`word:${word}`, 'total_count', ngram.matchCount);
        pipeline.hIncrBy(`word:${word}`, 'total_volumes', ngram.volumeCount);
      }
    }
    
    await pipeline.exec();
    this.processedCount += batch.length;
  }

  /**
   * Calculate corpus totals needed for PMI
   */
  async calculateCorpusTotals() {
    console.log('📊 Calculating corpus totals for PMI...');
    
    const totalNgrams = await this.redisClient.get('corpus:total_ngrams') || 0;
    const totalVolumes = await this.redisClient.get('corpus:total_volumes') || 0;
    
    // Store final corpus statistics
    await this.redisClient.hSet('corpus:stats', {
      total_ngrams: totalNgrams,
      total_volumes: totalVolumes,
      processed_timestamp: Date.now(),
      version: this.version,
      language: this.language
    });
    
    console.log(`✅ Corpus totals calculated:`);
    console.log(`   📊 Total N-grams: ${parseInt(totalNgrams).toLocaleString()}`);
    console.log(`   📚 Total volumes: ${parseInt(totalVolumes).toLocaleString()}`);
  }

  /**
   * Calculate PMI (Pointwise Mutual Information) for a phrase
   * PMI(x,y) = log(P(x,y) / (P(x) * P(y)))
   * Returns score from 0-15 points based on PMI value
   */
  async calculatePMI(phrase) {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized');
    }
    
    const startTime = Date.now();
    const normalizedPhrase = phrase.toLowerCase().trim();
    
    // Get phrase frequency
    const ngramData = await this.redisClient.hGetAll(`ngram:${normalizedPhrase}`);
    if (!ngramData.total_count) {
      return {
        score: 0,
        pmi: 0,
        type: 'not_found',
        phrase: normalizedPhrase,
        duration_ms: Date.now() - startTime
      };
    }
    
    const phraseCount = parseInt(ngramData.total_count);
    
    // Get individual word frequencies
    const words = normalizedPhrase.split(' ');
    const wordCounts = [];
    
    for (const word of words) {
      const wordData = await this.redisClient.hGetAll(`word:${word}`);
      const wordCount = wordData.total_count ? parseInt(wordData.total_count) : 1;
      wordCounts.push(wordCount);
    }
    
    // Get corpus total
    const corpusStats = await this.redisClient.hGetAll('corpus:stats');
    const totalNgrams = parseInt(corpusStats.total_ngrams) || 1;
    
    // Calculate PMI
    const phraseProb = phraseCount / totalNgrams;
    const wordProbs = wordCounts.map(count => count / totalNgrams);
    const independentProb = wordProbs.reduce((prod, prob) => prod * prob, 1);
    
    const pmi = Math.log2(phraseProb / independentProb);
    
    // Convert PMI to score (0-15 points)
    // PMI >= 4: 15 points, PMI 2-4: 10 points, PMI 0-2: 5 points, PMI < 0: 0 points
    let score = 0;
    if (pmi >= 4) {
      score = 15;
    } else if (pmi >= 2) {
      score = 10;
    } else if (pmi >= 0) {
      score = 5;
    }
    
    const duration = Date.now() - startTime;
    
    return {
      score,
      pmi: Math.round(pmi * 100) / 100, // Round to 2 decimal places
      type: 'pmi_calculated',
      phrase: normalizedPhrase,
      phrase_count: phraseCount,
      word_counts: wordCounts,
      total_corpus: totalNgrams,
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
    
    try {
      const corpusStats = await this.redisClient.hGetAll('corpus:stats');
      const info = await this.redisClient.info('keyspace');
      const dbInfo = info.match(/db0:keys=(\d+)/);
      const totalKeys = dbInfo ? parseInt(dbInfo[1]) : 0;
      
      return {
        connected: true,
        corpus: {
          total_ngrams: parseInt(corpusStats.total_ngrams) || 0,
          total_volumes: parseInt(corpusStats.total_volumes) || 0,
          version: corpusStats.version || this.version,
          language: corpusStats.language || this.language,
          last_processed: corpusStats.processed_timestamp ? 
            new Date(parseInt(corpusStats.processed_timestamp)).toISOString() : null
        },
        redis: {
          total_keys: totalKeys,
          processed_count: this.processedCount
        }
      };
    } catch (error) {
      console.error('❌ Error getting stats:', error);
      return { connected: false, error: error.message };
    }
  }

  /**
   * Close Redis connection
   */
  async close() {
    if (this.redisClient) {
      await this.redisClient.quit();
      console.log('🔌 Disconnected from Redis (N-gram processor)');
    }
  }
}

module.exports = NgramProcessor; 