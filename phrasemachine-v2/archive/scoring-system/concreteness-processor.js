const fs = require('fs');
const path = require('path');
const https = require('https');
const { createReadStream, createWriteStream } = require('fs');
const csv = require('csv-parser');
const redis = require('redis');
const natural = require('natural');
const DatasetLoader = require('../shared/dataset-loader');

/**
 * ConcretenessProcessor - Downloads and processes Brysbaert concreteness norms for describability scoring
 */
class ConcretenessProcessor {
  constructor(options = {}) {
    this.redisClient = null;
    this.dataDir = options.dataDir || path.join(__dirname, '../../data/concreteness');
    this.concretenessCsvUrl = options.concretenessCsvUrl || 
      'https://static-content.springer.com/esm/art%3A10.3758%2Fs13428-013-0403-5/MediaObjects/13428_2013_403_MOESM1_ESM.csv';
    this.processedCount = 0;
    
    // Initialize lemmatizer for word normalization
    this.stemmer = natural.PorterStemmer;
    this.lemmatizer = new natural.WordTokenizer();
    
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
      console.log('✅ ConcretenessProcessor connected to Redis');
      
      // Test Redis performance
      const start = Date.now();
      await this.redisClient.set('test:concreteness:performance', 'test');
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
      console.log('🔄 Initializing ConcretenessProcessor in JSON mode...');
      
      const success = await this.datasetLoader.initialize();
      if (!success) {
        throw new Error('Failed to initialize DatasetLoader');
      }
      
      // Verify we have concreteness data
      const concretenesData = this.datasetLoader.getConcreteness();
      const wordCount = Object.keys(concretenesData).length;
      
      if (wordCount === 0) {
        throw new Error('No concreteness data found in JSON datasets');
      }
      
      console.log(`✅ ConcretenessProcessor JSON mode ready: ${wordCount} words loaded`);
      this.mode = 'json';
      return true;
      
    } catch (error) {
      console.error('❌ Failed to initialize ConcretenessProcessor JSON mode:', error.message);
      return false;
    }
  }

  /**
   * Initialize processor in optimal mode (Redis first, JSON fallback)
   */
  async initialize() {
    console.log('🔄 Initializing ConcretenessProcessor (auto-detecting mode)...');
    
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
   * Download Brysbaert concreteness norms CSV
   */
  async downloadConcretenessCsv() {
    const localPath = path.join(this.dataDir, 'brysbaert-concreteness-norms.csv');
    
    if (fs.existsSync(localPath)) {
      console.log('📁 Brysbaert concreteness norms already exist, using cached file');
      return localPath;
    }
    
    console.log('📥 Downloading Brysbaert concreteness norms...');
    console.log(`📊 Source: Brysbaert et al. (2014) - 40k English words`);
    console.log(`🔗 URL: ${this.concretenessCsvUrl}`);
    
    return new Promise((resolve, reject) => {
      const file = createWriteStream(localPath);
      let downloadedBytes = 0;
      
      https.get(this.concretenessCsvUrl, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode} for concreteness CSV`));
          return;
        }
        
        const totalBytes = parseInt(response.headers['content-length'], 10);
        
        response.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          if (totalBytes) {
            const progress = ((downloadedBytes / totalBytes) * 100).toFixed(1);
            process.stdout.write(`\r   📊 Progress: ${progress}% (${(downloadedBytes / 1024).toFixed(1)} KB)`);
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
   * Process concreteness CSV and load into Redis
   */
  async processConcretenessCsv() {
    try {
      const csvPath = await this.downloadConcretenessCsv();
      console.log('\n🔄 Processing Brysbaert concreteness norms...');
      
      const startTime = Date.now();
      let processed = 0;
      const batch = [];
      const batchSize = 1000;
      
      return new Promise((resolve, reject) => {
        const stream = createReadStream(csvPath)
          .pipe(csv({
            headers: ['word', 'bigram', 'conc_mean', 'conc_sd', 'unknown', 'total', 'percent_known', 'subtlex_frequency', 'dom_pos']
          }))
          .on('data', async (row) => {
            try {
              // Parse concreteness data
              const concretenesData = this.parseConcretenesRow(row);
              
              if (concretenesData && this.shouldIncludeWord(concretenesData)) {
                batch.push(concretenesData);
                
                if (batch.length >= batchSize) {
                  stream.pause(); // Pause while processing batch
                  await this.processConcretenesBatch(batch);
                  processed += batch.length;
                  batch.length = 0; // Clear batch
                  
                  // Progress reporting
                  if (processed % 5000 === 0) {
                    console.log(`     📊 Processed: ${processed.toLocaleString()} words`);
                  }
                  
                  stream.resume(); // Resume processing
                }
              }
              
            } catch (error) {
              console.warn(`⚠️ Error processing row: ${error.message}`);
              // Continue processing other rows
            }
          })
          .on('end', async () => {
            try {
              // Process remaining batch
              if (batch.length > 0) {
                await this.processConcretenesBatch(batch);
                processed += batch.length;
              }
              
              const totalTime = (Date.now() - startTime) / 1000;
              console.log(`\n✅ Concreteness processing complete:`);
              console.log(`   📊 Total processed: ${processed.toLocaleString()} words`);
              console.log(`   ⏱️ Duration: ${totalTime.toFixed(1)} seconds`);
              console.log(`   🚀 Rate: ${(processed / totalTime).toFixed(0)} words/sec`);
              
              // Store processing metadata
              await this.storeConcretenessMetadata(processed);
              
              resolve(processed);
            } catch (error) {
              reject(error);
            }
          })
          .on('error', reject);
      });
      
    } catch (error) {
      console.error('❌ Failed to process concreteness CSV:', error.message);
      throw error;
    }
  }

  /**
   * Parse a single concreteness CSV row
   */
  parseConcretenesRow(row) {
    try {
      const word = row.word ? row.word.toLowerCase().trim() : null;
      const concMean = parseFloat(row.conc_mean);
      const concSd = parseFloat(row.conc_sd);
      const percentKnown = parseFloat(row.percent_known);
      const subtlexFreq = parseFloat(row.subtlex_frequency) || 0;
      const domPos = row.dom_pos ? row.dom_pos.trim() : '';
      
      if (!word || isNaN(concMean) || isNaN(concSd)) {
        return null;
      }
      
      return {
        word,
        concreteness: Math.round(concMean * 100) / 100, // Round to 2 decimal places
        concreteness_sd: Math.round(concSd * 100) / 100,
        percent_known: Math.round(percentKnown * 100) / 100,
        subtlex_frequency: subtlexFreq,
        dominant_pos: domPos
      };
      
    } catch (error) {
      return null;
    }
  }

  /**
   * Determine if word should be included in the database
   */
  shouldIncludeWord(wordData) {
    // Filter minimum data quality requirements
    if (wordData.percent_known < 50) return false; // At least 50% of people know the word
    if (wordData.concreteness < 1.0 || wordData.concreteness > 5.0) return false; // Valid concreteness range
    
    // Filter basic word format
    const word = wordData.word;
    if (!/^[a-z]+$/.test(word)) return false; // Only lowercase letters
    if (word.length < 2 || word.length > 25) return false; // Reasonable word length
    
    return true;
  }

  /**
   * Process batch of concreteness data into Redis
   */
  async processConcretenesBatch(batch) {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized');
    }
    
    const pipeline = this.redisClient.multi();
    
    for (const wordData of batch) {
      const key = `concreteness:${wordData.word}`;
      
      // Store word concreteness data
      pipeline.hSet(key, {
        concreteness: wordData.concreteness.toString(),
        concreteness_sd: wordData.concreteness_sd.toString(),
        percent_known: wordData.percent_known.toString(),
        subtlex_frequency: wordData.subtlex_frequency.toString(),
        dominant_pos: wordData.dominant_pos
      });
      
      // Create stemmed version for better lookup
      const stemmed = this.stemmer.stem(wordData.word);
      if (stemmed !== wordData.word) {
        pipeline.hSet(`concreteness_stem:${stemmed}`, {
          original_word: wordData.word,
          concreteness: wordData.concreteness.toString(),
          type: 'stemmed'
        });
      }
      
      // Track concreteness distribution for statistics
      const concretenessBand = this.getConcretenesBand(wordData.concreteness);
      pipeline.incrBy(`concreteness_stats:${concretenessBand}`, 1);
    }
    
    await pipeline.exec();
    this.processedCount += batch.length;
  }

  /**
   * Get concreteness scoring band for statistics
   */
  getConcretenesBand(concreteness) {
    if (concreteness >= 4.0) return 'high'; // 15 points
    if (concreteness >= 3.0) return 'medium'; // 8 points
    return 'low'; // 0 points
  }

  /**
   * Store concreteness processing metadata
   */
  async storeConcretenessMetadata(totalProcessed) {
    const metadata = {
      total_words: totalProcessed,
      processed_timestamp: Date.now(),
      source: 'Brysbaert et al. (2014)',
      description: '40k English word concreteness ratings',
      version: '1.0'
    };
    
    await this.redisClient.hSet('concreteness_meta', metadata);
    
    // Get distribution statistics
    const highConcrete = await this.redisClient.get('concreteness_stats:high') || 0;
    const mediumConcrete = await this.redisClient.get('concreteness_stats:medium') || 0;
    const lowConcrete = await this.redisClient.get('concreteness_stats:low') || 0;
    
    console.log(`📊 Concreteness Distribution:`);
    console.log(`   🔥 High (≥4.0): ${parseInt(highConcrete).toLocaleString()} words (15 points)`);
    console.log(`   🔸 Medium (3.0-3.9): ${parseInt(mediumConcrete).toLocaleString()} words (8 points)`);
    console.log(`   🔹 Low (<3.0): ${parseInt(lowConcrete).toLocaleString()} words (0 points)`);
  }

  /**
   * Score concreteness for a phrase (average of individual words)
   * Returns 0-15 points based on phrase concreteness
   */
  async scoreConcreteness(phrase) {
    if (!this.mode) {
      throw new Error('ConcretenessProcessor not initialized - call initialize() first');
    }
    
    const startTime = Date.now();
    const normalizedPhrase = phrase.toLowerCase().trim();
    
    if (this.mode === 'redis') {
      return await this.scoreConcretenesRedis(normalizedPhrase, startTime);
    } else {
      return await this.scoreConcretenesJSON(normalizedPhrase, startTime);
    }
  }

  /**
   * Score concreteness using Redis mode
   */
  async scoreConcretenesRedis(normalizedPhrase, startTime) {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized');
    }
    
    // Tokenize phrase into words
    const words = this.lemmatizer.tokenize(normalizedPhrase) || [];
    const validWords = words.filter(word => /^[a-z]+$/.test(word) && word.length >= 2);
    
    if (validWords.length === 0) {
      return {
        score: 0,
        concreteness: 0,
        type: 'no_valid_words',
        phrase: normalizedPhrase,
        duration_ms: Date.now() - startTime
      };
    }
    
    // Look up concreteness for each word
    const wordScores = [];
    const wordDetails = [];
    
    for (const word of validWords) {
      const directLookup = await this.redisClient.hGetAll(`concreteness:${word}`);
      
      if (directLookup.concreteness) {
        const concreteness = parseFloat(directLookup.concreteness);
        wordScores.push(concreteness);
        wordDetails.push({
          word,
          concreteness,
          lookup_type: 'direct',
          percent_known: parseFloat(directLookup.percent_known) || 0
        });
      } else {
        // Try stemmed lookup
        const stemmed = this.stemmer.stem(word);
        const stemLookup = await this.redisClient.hGetAll(`concreteness_stem:${stemmed}`);
        
        if (stemLookup.concreteness) {
          const concreteness = parseFloat(stemLookup.concreteness);
          wordScores.push(concreteness);
          wordDetails.push({
            word,
            concreteness,
            lookup_type: 'stemmed',
            original_word: stemLookup.original_word,
            stem: stemmed
          });
        } else {
          // Word not found - use neutral score for missing words
          wordDetails.push({
            word,
            concreteness: null,
            lookup_type: 'not_found'
          });
        }
      }
    }
    
    if (wordScores.length === 0) {
      return {
        score: 0,
        concreteness: 0,  
        type: 'words_not_found',
        phrase: normalizedPhrase,
        word_count: validWords.length,
        found_count: 0,
        word_details: wordDetails,
        duration_ms: Date.now() - startTime
      };
    }
    
    // Calculate average concreteness
    const avgConcreteness = wordScores.reduce((sum, score) => sum + score, 0) / wordScores.length;
    const roundedConcreteness = Math.round(avgConcreteness * 100) / 100;
    
    // Convert to score points (per algorithm spec)
    let score = 0;
    if (roundedConcreteness >= 4.0) {
      score = 15; // High concreteness
    } else if (roundedConcreteness >= 3.0) {
      score = 8;  // Medium concreteness
    } else {
      score = 0;  // Low concreteness
    }
    
    const duration = Date.now() - startTime;
    
    return {
      score,
      concreteness: roundedConcreteness,
      type: 'concreteness_calculated',
      phrase: normalizedPhrase,
      word_count: validWords.length,
      found_count: wordScores.length,
      coverage: Math.round((wordScores.length / validWords.length) * 100),
      word_details: wordDetails,
      duration_ms: duration
    };
  }

  /**
   * Score concreteness using JSON mode
   */
  async scoreConcretenesJSON(normalizedPhrase, startTime) {
    // Tokenize phrase into words
    const words = this.lemmatizer.tokenize(normalizedPhrase) || [];
    const validWords = words.filter(word => /^[a-z]+$/.test(word) && word.length >= 2);
    
    if (validWords.length === 0) {
      return {
        score: 0,
        concreteness: 0,
        type: 'no_valid_words',
        phrase: normalizedPhrase,
        duration_ms: Date.now() - startTime
      };
    }
    
    // Look up concreteness for each word from JSON data
    const wordScores = [];
    const wordDetails = [];
    
    for (const word of validWords) {
      const concreteness = this.datasetLoader.getConcretenesScore(word);
      
      if (concreteness !== null) {
        wordScores.push(concreteness);
        wordDetails.push({
          word,
          concreteness,
          lookup_type: 'direct'
        });
      } else {
        // Try stemmed lookup
        const stemmed = this.stemmer.stem(word);
        const stemmedConcreteness = this.datasetLoader.getConcretenesScore(stemmed);
        
        if (stemmedConcreteness !== null) {
          wordScores.push(stemmedConcreteness);
          wordDetails.push({
            word,
            concreteness: stemmedConcreteness,
            lookup_type: 'stemmed',
            stem: stemmed
          });
        } else {
          // Word not found
          wordDetails.push({
            word,
            concreteness: null,
            lookup_type: 'not_found'
          });
        }
      }
    }
    
    if (wordScores.length === 0) {
      return {
        score: 0,
        concreteness: 0,  
        type: 'words_not_found',
        phrase: normalizedPhrase,
        word_count: validWords.length,
        found_count: 0,
        word_details: wordDetails,
        duration_ms: Date.now() - startTime
      };
    }
    
    // Calculate average concreteness
    const avgConcreteness = wordScores.reduce((sum, score) => sum + score, 0) / wordScores.length;
    const roundedConcreteness = Math.round(avgConcreteness * 100) / 100;
    
    // Convert to score points (per algorithm spec)
    let score = 0;
    if (roundedConcreteness >= 4.0) {
      score = 15; // High concreteness
    } else if (roundedConcreteness >= 3.0) {
      score = 8;  // Medium concreteness
    } else {
      score = 0;  // Low concreteness
    }
    
    const duration = Date.now() - startTime;
    
    return {
      score,
      concreteness: roundedConcreteness,
      type: 'concreteness_calculated',
      phrase: normalizedPhrase,
      word_count: validWords.length,
      found_count: wordScores.length,
      coverage: Math.round((wordScores.length / validWords.length) * 100),
      word_details: wordDetails,
      duration_ms: duration
    };
  }

  /**
   * Get concreteness processing statistics
   */
  async getStats() {
    if (!this.redisClient) {
      return { connected: false };
    }
    
    try {
      const metadata = await this.redisClient.hGetAll('concreteness_meta');
      const info = await this.redisClient.info('keyspace');
      const dbInfo = info.match(/db0:keys=(\d+)/);
      const totalKeys = dbInfo ? parseInt(dbInfo[1]) : 0;
      
      // Get distribution stats
      const highConcrete = await this.redisClient.get('concreteness_stats:high') || 0;
      const mediumConcrete = await this.redisClient.get('concreteness_stats:medium') || 0;
      const lowConcrete = await this.redisClient.get('concreteness_stats:low') || 0;
      
      return {
        connected: true,
        concreteness: {
          total_words: parseInt(metadata.total_words) || 0,
          source: metadata.source || 'Unknown',
          description: metadata.description || '',
          version: metadata.version || '1.0',
          last_processed: metadata.processed_timestamp ? 
            new Date(parseInt(metadata.processed_timestamp)).toISOString() : null,
          distribution: {
            high: parseInt(highConcrete),
            medium: parseInt(mediumConcrete), 
            low: parseInt(lowConcrete)
          }
        },
        redis: {
          total_keys: totalKeys,
          processed_count: this.processedCount
        }
      };
    } catch (error) {
      console.error('❌ Error getting concreteness stats:', error);
      return { connected: false, error: error.message };
    }
  }

  /**
   * Close Redis connection
   */
  async close() {
    if (this.redisClient) {
      await this.redisClient.quit();
      console.log('🔌 Disconnected from Redis (concreteness processor)');
    }
  }
}

module.exports = ConcretenessProcessor; 