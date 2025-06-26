const winston = require('winston');
const https = require('https');
const fs = require('fs-extra');
const path = require('path');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [COMMON-${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'phrase-database.log' })
  ]
});

class CommonPhraseDetector {
  constructor(options = {}) {
    this.config = {
      // Wikipedia API settings
      wikipediaApiUrl: 'https://en.wikipedia.org/api/rest_v1',
      wikipediaTimeout: 5000,
      enableWikipediaCheck: options.enableWikipediaCheck !== false,
      
      // Commonality thresholds
      thresholds: {
        tooCommon: options.thresholds?.tooCommon || 0.8,
        veryCommon: options.thresholds?.veryCommon || 0.6,
        moderatelyCommon: options.thresholds?.moderatelyCommon || 0.4
      },
      
      // Local common phrases dataset
      commonPhrasesFile: options.commonPhrasesFile || path.join(__dirname, '..', 'data', 'common-phrases.json'),
      enableLocalCheck: options.enableLocalCheck !== false,
      
      // Rate limiting
      requestDelay: options.requestDelay || 100, // ms between API requests
      maxRetries: options.maxRetries || 2,
      
      // Caching
      enableCache: options.enableCache !== false,
      cacheFile: path.join(__dirname, '..', 'data', 'wikipedia-cache.json'),
      maxCacheSize: options.maxCacheSize || 1000
    };
    
    // Initialize cache
    this.cache = new Map();
    this.loadCache();
    
    // Load local common phrases
    this.commonPhrases = new Set();
    this.loadCommonPhrases();
    
    // Rate limiting
    this.lastRequestTime = 0;
  }

  /**
   * Check if a phrase is too common for the game
   * @param {string} phrase - The phrase to check
   * @returns {Object} - { isTooCommon: boolean, reason: string, details: Object }
   */
  async checkCommonality(phrase) {
    try {
      logger.info(`Checking commonality for: "${phrase}"`);
      
      const normalizedPhrase = phrase.toLowerCase().trim();
      
      // Quick local checks first
      const localCheck = this.checkLocalCommonality(normalizedPhrase);
      if (localCheck.isTooCommon) {
        logger.warn(`Phrase rejected by local check: "${phrase}" - ${localCheck.reason}`);
        return localCheck;
      }
      
      // Wikipedia API check (if enabled)
      let wikipediaCheck = { isTooCommon: false, reason: '', details: {} };
      if (this.config.enableWikipediaCheck) {
        wikipediaCheck = await this.checkWikipedia(normalizedPhrase);
        if (wikipediaCheck.isTooCommon) {
          logger.warn(`Phrase rejected by Wikipedia check: "${phrase}" - ${wikipediaCheck.reason}`);
          return wikipediaCheck;
        }
      }
      
      // If we get here, phrase passed all checks
      logger.info(`Phrase passed commonality check: "${phrase}"`);
      return {
        isTooCommon: false,
        reason: 'Phrase passed all commonality checks',
        details: {
          localCheck: localCheck.details,
          wikipediaCheck: wikipediaCheck.details,
          timestamp: new Date().toISOString()
        }
      };
      
    } catch (error) {
      logger.error(`Error checking commonality for "${phrase}":`, error);
      
      // On error, be conservative and allow the phrase
      return {
        isTooCommon: false,
        reason: 'Error during commonality check - phrase allowed by default',
        details: { error: error.message }
      };
    }
  }

  /**
   * Check phrase against local common phrases database
   * @param {string} phrase - Normalized phrase to check
   * @returns {Object} - { isTooCommon: boolean, reason: string, details: Object }
   */
  checkLocalCommonality(phrase) {
    // Check exact match against common phrases
    if (this.commonPhrases.has(phrase)) {
      return {
        isTooCommon: true,
        reason: 'Exact match in common phrases database',
        details: { 
          type: 'LOCAL_EXACT_MATCH',
          phrase,
          source: 'local-database'
        }
      };
    }
    
    // Check for very common single words
    const words = phrase.split(/\s+/);
    if (words.length === 1) {
      const commonSingleWords = new Set([
        'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'car', 'eat', 'eye', 'far', 'fun', 'got', 'man', 'put', 'run', 'say', 'she', 'too', 'use'
      ]);
      
      if (commonSingleWords.has(phrase)) {
        return {
          isTooCommon: true,
          reason: 'Very common single word',
          details: {
            type: 'COMMON_SINGLE_WORD',
            phrase,
            wordCount: 1
          }
        };
      }
    }
    
    // Check for very common multi-word phrases
    const commonMultiWordPhrases = new Set([
      'in the', 'to the', 'of the', 'on the', 'for the', 'and the', 'at the', 'by the', 'from the', 'with the', 'to be', 'will be', 'have been', 'this is', 'that is', 'it is', 'there is', 'here is', 'what is', 'how are', 'you are', 'we are', 'they are', 'i am', 'he is', 'she is'
    ]);
    
    if (commonMultiWordPhrases.has(phrase)) {
      return {
        isTooCommon: true,
        reason: 'Very common multi-word phrase',
        details: {
          type: 'COMMON_PHRASE',
          phrase,
          wordCount: words.length
        }
      };
    }
    
    return {
      isTooCommon: false,
      reason: 'Passed local commonality checks',
      details: {
        type: 'LOCAL_CHECK_PASSED',
        phrase,
        wordCount: words.length
      }
    };
  }

  /**
   * Check if phrase exists as Wikipedia title or redirect
   * @param {string} phrase - Normalized phrase to check
   * @returns {Object} - { isTooCommon: boolean, reason: string, details: Object }
   */
  async checkWikipedia(phrase) {
    try {
      // Check cache first
      if (this.cache.has(phrase)) {
        const cached = this.cache.get(phrase);
        logger.info(`Wikipedia cache hit for: "${phrase}"`);
        return cached;
      }
      
      // Rate limiting
      await this.rateLimit();
      
      // Format phrase for Wikipedia API (title case, underscores)
      const wikipediaTitle = phrase
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('_');
      
      logger.info(`Checking Wikipedia for: "${wikipediaTitle}"`);
      
      const result = await this.makeWikipediaRequest(wikipediaTitle);
      
      // Cache the result
      this.cache.set(phrase, result);
      this.saveCache();
      
      return result;
      
    } catch (error) {
      logger.error(`Wikipedia API error for "${phrase}":`, error);
      
      // On API error, don't reject the phrase
      const result = {
        isTooCommon: false,
        reason: 'Wikipedia API error - phrase allowed by default',
        details: { 
          error: error.message,
          type: 'WIKIPEDIA_API_ERROR'
        }
      };
      
      return result;
    }
  }

  /**
   * Make request to Wikipedia API
   * @param {string} title - Wikipedia title to check
   * @returns {Promise<Object>} - Result object
   */
  makeWikipediaRequest(title) {
    return new Promise((resolve, reject) => {
      const url = `${this.config.wikipediaApiUrl}/page/summary/${encodeURIComponent(title)}`;
      
      const req = https.get(url, {
        timeout: this.config.wikipediaTimeout,
        headers: {
          'User-Agent': 'WordGamePhraseDatabase/1.0 (https://github.com/jamespheffernan/words-on-phone)'
        }
      }, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            if (res.statusCode === 200) {
              const response = JSON.parse(data);
              
              // Check if it's a disambiguation page or main article
              const isDisambiguation = response.type === 'disambiguation';
              const isMainArticle = response.type === 'standard';
              const hasExtract = response.extract && response.extract.length > 50;
              
              if (isMainArticle && hasExtract) {
                resolve({
                  isTooCommon: true,
                  reason: 'Phrase exists as Wikipedia article',
                  details: {
                    type: 'WIKIPEDIA_ARTICLE',
                    title: response.title,
                    extract: response.extract.substring(0, 100) + '...',
                    wikipediaUrl: response.content_urls?.desktop?.page
                  }
                });
              } else if (isDisambiguation) {
                resolve({
                  isTooCommon: true,
                  reason: 'Phrase is Wikipedia disambiguation page',
                  details: {
                    type: 'WIKIPEDIA_DISAMBIGUATION',
                    title: response.title,
                    wikipediaUrl: response.content_urls?.desktop?.page
                  }
                });
              } else {
                resolve({
                  isTooCommon: false,
                  reason: 'Wikipedia page exists but not significant',
                  details: {
                    type: 'WIKIPEDIA_MINOR',
                    title: response.title,
                    pageType: response.type
                  }
                });
              }
            } else if (res.statusCode === 404) {
              resolve({
                isTooCommon: false,
                reason: 'No Wikipedia page found',
                details: {
                  type: 'WIKIPEDIA_NOT_FOUND',
                  searchTerm: title
                }
              });
            } else {
              reject(new Error(`Wikipedia API returned status ${res.statusCode}`));
            }
          } catch (parseError) {
            reject(new Error(`Failed to parse Wikipedia response: ${parseError.message}`));
          }
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Wikipedia API request timeout'));
      });
    });
  }

  /**
   * Rate limiting for API requests
   */
  async rateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.config.requestDelay) {
      const delay = this.config.requestDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Check multiple phrases for commonality
   * @param {Array<string>} phrases - Array of phrases to check
   * @returns {Object} - { approved: Array, rejected: Array, summary: Object }
   */
  async checkBatch(phrases) {
    if (!Array.isArray(phrases)) {
      throw new Error('Phrases must be an array');
    }
    
    logger.info(`Starting batch commonality check for ${phrases.length} phrases`);
    
    const approved = [];
    const rejected = [];
    
    for (const phrase of phrases) {
      const result = await this.checkCommonality(phrase);
      
      if (result.isTooCommon) {
        rejected.push({
          phrase,
          reason: result.reason,
          details: result.details
        });
      } else {
        approved.push({
          phrase,
          details: result.details
        });
      }
    }
    
    const summary = {
      total: phrases.length,
      approved: approved.length,
      rejected: rejected.length,
      rejectionRate: phrases.length > 0 ? (rejected.length / phrases.length * 100).toFixed(1) : 0
    };
    
    logger.info(`Batch commonality check complete: ${approved.length} approved, ${rejected.length} rejected`);
    
    return { approved, rejected, summary };
  }

  /**
   * Load common phrases from local database
   */
  loadCommonPhrases() {
    try {
      if (fs.existsSync(this.config.commonPhrasesFile)) {
        const data = fs.readJsonSync(this.config.commonPhrasesFile);
        if (Array.isArray(data)) {
          data.forEach(phrase => this.commonPhrases.add(phrase.toLowerCase()));
          logger.info(`Loaded ${this.commonPhrases.size} common phrases from local database`);
        }
      } else {
        // Create default common phrases file
        const defaultCommonPhrases = [
          'the quick brown fox',
          'hello world',
          'good morning',
          'good evening',
          'thank you',
          'you are welcome',
          'how are you',
          'nice to meet you',
          'what is your name',
          'united states',
          'new york',
          'los angeles',
          'san francisco',
          'donald trump',
          'joe biden',
          'barack obama',
          'george washington',
          'abraham lincoln'
        ];
        
        fs.ensureDirSync(path.dirname(this.config.commonPhrasesFile));
        fs.writeJsonSync(this.config.commonPhrasesFile, defaultCommonPhrases, { spaces: 2 });
        
        defaultCommonPhrases.forEach(phrase => this.commonPhrases.add(phrase));
        logger.info(`Created default common phrases database with ${defaultCommonPhrases.length} entries`);
      }
    } catch (error) {
      logger.error('Error loading common phrases:', error);
    }
  }

  /**
   * Load Wikipedia cache from disk
   */
  loadCache() {
    try {
      if (this.config.enableCache && fs.existsSync(this.config.cacheFile)) {
        const data = fs.readJsonSync(this.config.cacheFile);
        Object.entries(data).forEach(([key, value]) => {
          this.cache.set(key, value);
        });
        logger.info(`Loaded ${this.cache.size} entries from Wikipedia cache`);
      }
    } catch (error) {
      logger.error('Error loading cache:', error);
    }
  }

  /**
   * Save Wikipedia cache to disk
   */
  saveCache() {
    try {
      if (!this.config.enableCache) return;
      
      // Limit cache size
      if (this.cache.size > this.config.maxCacheSize) {
        const entries = Array.from(this.cache.entries());
        const toKeep = entries.slice(-this.config.maxCacheSize);
        this.cache.clear();
        toKeep.forEach(([key, value]) => this.cache.set(key, value));
      }
      
      const cacheData = Object.fromEntries(this.cache);
      fs.ensureDirSync(path.dirname(this.config.cacheFile));
      fs.writeJsonSync(this.config.cacheFile, cacheData, { spaces: 2 });
    } catch (error) {
      logger.error('Error saving cache:', error);
    }
  }

  /**
   * Get current configuration
   * @returns {Object} - Current configuration object
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Get statistics about the common phrase detector
   * @returns {Object} - Statistics object
   */
  getStats() {
    return {
      commonPhrasesCount: this.commonPhrases.size,
      cacheSize: this.cache.size,
      wikipediaEnabled: this.config.enableWikipediaCheck,
      localCheckEnabled: this.config.enableLocalCheck,
      thresholds: this.config.thresholds
    };
  }
}

module.exports = CommonPhraseDetector; 