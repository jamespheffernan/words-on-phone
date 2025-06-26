const winston = require('winston');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Configure logger for phrase scorer
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [SCORE-${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'phrase-database.log' })
  ]
});

class PhraseScorer {
  constructor() {
    this.MAX_SCORE = 100;
    this.CACHE_DIR = path.join(__dirname, '..', 'data');
    this.CACHE_FILE = path.join(this.CACHE_DIR, 'phrase-scores.json');
    this.scoreCache = this.loadCache();
    
    // Score weights
    this.WEIGHTS = {
      LOCAL_HEURISTICS: 40,    // 0-40 points
      WIKIDATA: 30,           // 0-30 points  
      REDDIT: 15,             // 0-15 points
      CATEGORY_BOOST: 15      // 0-15 points
    };
    
    // Common words that are usually well-known
    this.COMMON_WORDS = new Set([
      'the', 'and', 'you', 'that', 'was', 'for', 'are', 'with', 'his', 'they',
      'have', 'this', 'will', 'one', 'all', 'were', 'can', 'had', 'her', 'what',
      'said', 'there', 'each', 'which', 'she', 'how', 'their', 'time', 'way',
      'about', 'many', 'then', 'them', 'these', 'two', 'more', 'very', 'know',
      'just', 'first', 'into', 'over', 'think', 'also', 'your', 'work', 'life',
      'only', 'new', 'years', 'could', 'other', 'after', 'world', 'good', 'right',
      'people', 'where', 'those', 'come', 'state', 'system', 'some', 'because'
    ]);
    
    // Categories that get pop culture boost
    this.POP_CULTURE_CATEGORIES = new Set([
      'Movies & TV', 'Music', 'Video Games', 'Social Media', 'Internet Culture',
      'Sports', 'Food & Drink', 'Brands', 'Places', 'Animals'
    ]);
    
    // Recency indicators (last 2 years)
    this.RECENT_INDICATORS = [
      'tiktok', 'covid', 'zoom', 'biden', 'trump', 'ukraine', 'climate', 'ai',
      'chatgpt', 'spotify', 'netflix', 'disney+', 'squid game', 'wordle', 
      'nft', 'crypto', 'meta', 'metaverse', 'tesla', 'elon musk'
    ];
  }

  /**
   * Score a phrase for accessibility and recognizability
   * @param {string} phrase - Phrase to score
   * @param {string} category - Category context
   * @param {Object} options - Scoring options
   * @returns {Object} - Score breakdown and total
   */
  async scorePhrase(phrase, category, options = {}) {
    const cacheKey = `${phrase.toLowerCase()}:${category}`;
    
    // Check cache first
    if (this.scoreCache[cacheKey] && !options.forceRefresh) {
      logger.info(`Cache hit for phrase: "${phrase}"`);
      return this.scoreCache[cacheKey];
    }

    logger.info(`Scoring phrase: "${phrase}" in category "${category}"`);

    try {
      const breakdown = {
        localHeuristics: await this.scoreLocalHeuristics(phrase, category),
        wikidata: await this.scoreWikidata(phrase),
        reddit: options.skipReddit ? 0 : await this.scoreReddit(phrase),
        categoryBoost: this.scoreCategoryBoost(phrase, category)
      };

      const total = Math.min(
        breakdown.localHeuristics + 
        breakdown.wikidata + 
        breakdown.reddit + 
        breakdown.categoryBoost,
        this.MAX_SCORE
      );

      const result = {
        phrase,
        category,
        totalScore: total,
        breakdown,
        verdict: this.getVerdict(total),
        timestamp: new Date().toISOString(),
        cached: false
      };

      // Cache the result
      this.scoreCache[cacheKey] = { ...result, cached: true };
      this.saveCache();

      logger.info(`Scored "${phrase}": ${total}/100 (${result.verdict})`);
      return result;

    } catch (error) {
      logger.error(`Error scoring phrase "${phrase}": ${error.message}`);
      
      // Return fallback score based on local heuristics only
      const localScore = await this.scoreLocalHeuristics(phrase, category);
      return {
        phrase,
        category,
        totalScore: localScore,
        breakdown: { 
          localHeuristics: localScore, 
          wikidata: 0, 
          reddit: 0, 
          categoryBoost: 0,
          error: error.message 
        },
        verdict: this.getVerdict(localScore),
        timestamp: new Date().toISOString(),
        cached: false
      };
    }
  }

  /**
   * Score based on local heuristics (0-40 points)
   * @param {string} phrase - Phrase to analyze
   * @param {string} category - Category context
   * @returns {number} - Local heuristics score
   */
  async scoreLocalHeuristics(phrase, category) {
    // Handle empty phrases
    if (!phrase || phrase.trim().length === 0) {
      return 0;
    }
    
    let score = 0;
    const words = phrase.toLowerCase().split(/\s+/).filter(word => word.length > 0);
    
    // Handle case where split results in no valid words
    if (words.length === 0) {
      return 0;
    }
    
    // Word simplicity (0-20 points)
    const wordScores = words.map(word => {
      if (this.COMMON_WORDS.has(word)) return 5;
      if (word.length <= 4) return 4;
      if (word.length <= 6) return 3;
      if (word.length <= 8) return 2;
      return 1;
    });
    
    const avgWordScore = wordScores.reduce((a, b) => a + b, 0) / words.length;
    score += Math.min(avgWordScore * 4, 20); // Scale to 0-20
    
    // Phrase length bonus (0-10 points)
    if (words.length <= 2) score += 10;
    else if (words.length <= 3) score += 7;
    else if (words.length <= 4) score += 4;
    else score += 1;
    
    // Recency indicators (0-10 points)
    const recentCount = this.RECENT_INDICATORS.filter(indicator => 
      phrase.toLowerCase().includes(indicator)
    ).length;
    score += Math.min(recentCount * 5, 10);
    
    return Math.min(score, this.WEIGHTS.LOCAL_HEURISTICS);
  }

  /**
   * Score based on Wikidata presence (0-30 points)
   * @param {string} phrase - Phrase to check
   * @returns {number} - Wikidata score
   */
  async scoreWikidata(phrase) {
    try {
      const query = `
        SELECT ?item ?itemLabel ?sitelinks WHERE {
          ?item rdfs:label "${phrase}"@en .
          ?item wikibase:sitelinks ?sitelinks .
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
        }
        LIMIT 1
      `;
      
      const result = await this.querySparql(query);
      
      if (result.results.bindings.length === 0) {
        return 0;
      }
      
      const binding = result.results.bindings[0];
      const sitelinks = parseInt(binding.sitelinks?.value || '0');
      
      // Score based on number of Wikipedia language versions
      if (sitelinks >= 50) return 30;
      if (sitelinks >= 20) return 25;
      if (sitelinks >= 10) return 20;
      if (sitelinks >= 5) return 15;
      if (sitelinks >= 1) return 10;
      
      return 5; // Has Wikidata entry but no Wikipedia articles
      
    } catch (error) {
      logger.warn(`Wikidata query failed for "${phrase}": ${error.message}`);
      return 0;
    }
  }

  /**
   * Score based on Reddit cultural relevance (0-15 points)
   * @param {string} phrase - Phrase to check
   * @returns {number} - Reddit score
   */
  async scoreReddit(phrase) {
    try {
      // Simple Reddit search to gauge cultural relevance
      const searchUrl = `https://www.reddit.com/search.json?q="${encodeURIComponent(phrase)}"&sort=relevance&limit=5`;
      
      const data = await this.httpRequest(searchUrl);
      const posts = data.data?.children || [];
      
      if (posts.length === 0) return 0;
      
      // Score based on upvotes and number of results
      const totalUpvotes = posts.reduce((sum, post) => 
        sum + (post.data?.ups || 0), 0
      );
      
      if (totalUpvotes >= 10000) return 15;
      if (totalUpvotes >= 5000) return 12;
      if (totalUpvotes >= 1000) return 10;
      if (totalUpvotes >= 100) return 7;
      if (totalUpvotes >= 10) return 5;
      
      return 2; // Found but low engagement
      
    } catch (error) {
      logger.warn(`Reddit query failed for "${phrase}": ${error.message}`);
      return 0;
    }
  }

  /**
   * Score based on category relevance (0-15 points)
   * @param {string} phrase - Phrase to analyze
   * @param {string} category - Category context
   * @returns {number} - Category boost score
   */
  scoreCategoryBoost(phrase, category) {
    let score = 0;
    
    // Pop culture categories get higher scores
    if (this.POP_CULTURE_CATEGORIES.has(category)) {
      score += 10;
    } else {
      score += 5; // Base score for any categorization
    }
    
    // Category-specific patterns
    const lowerPhrase = phrase.toLowerCase();
    
    switch (category) {
      case 'Movies & TV':
        if (lowerPhrase.includes('movie') || lowerPhrase.includes('film') || 
            lowerPhrase.includes('show') || lowerPhrase.includes('series')) {
          score += 5;
        }
        break;
      case 'Music':
        if (lowerPhrase.includes('song') || lowerPhrase.includes('album') || 
            lowerPhrase.includes('band') || lowerPhrase.includes('singer')) {
          score += 5;
        }
        break;
      case 'Food & Drink':
        if (lowerPhrase.includes('pizza') || lowerPhrase.includes('coffee') || 
            lowerPhrase.includes('burger') || lowerPhrase.includes('taco')) {
          score += 5;
        }
        break;
    }
    
    return Math.min(score, this.WEIGHTS.CATEGORY_BOOST);
  }

  /**
   * Get verdict based on total score
   * @param {number} score - Total score
   * @returns {string} - Human-readable verdict
   */
  getVerdict(score) {
    if (score >= 80) return 'EXCELLENT - Auto Accept';
    if (score >= 60) return 'GOOD - Accept';
    if (score >= 40) return 'BORDERLINE - Manual Review';
    if (score >= 20) return 'WARNING - Likely Too Obscure';
    return 'REJECT - Too Technical/Unknown';
  }

  /**
   * Query Wikidata SPARQL endpoint
   * @param {string} query - SPARQL query
   * @returns {Object} - Query results
   */
  async querySparql(query) {
    const endpoint = 'https://query.wikidata.org/sparql';
    const url = `${endpoint}?query=${encodeURIComponent(query)}&format=json`;
    
    return await this.httpRequest(url);
  }

  /**
   * Make HTTP request with proper headers
   * @param {string} url - URL to request
   * @returns {Object} - Parsed JSON response
   */
  async httpRequest(url) {
    return new Promise((resolve, reject) => {
      const request = https.get(url, {
        headers: {
          'User-Agent': 'WordsOnPhone-PhraseValidator/1.0 (https://github.com/jamespheffernan/words-on-phone)'
        }
      }, (response) => {
        let data = '';
        
        response.on('data', (chunk) => {
          data += chunk;
        });
        
        response.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } catch (error) {
            reject(new Error(`Failed to parse JSON: ${error.message}`));
          }
        });
      });
      
      request.on('error', (error) => {
        reject(error);
      });
      
      request.setTimeout(10000, () => {
        request.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  /**
   * Load score cache from disk
   * @returns {Object} - Cached scores
   */
  loadCache() {
    try {
      if (fs.existsSync(this.CACHE_FILE)) {
        const data = fs.readFileSync(this.CACHE_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      logger.warn(`Failed to load cache: ${error.message}`);
    }
    return {};
  }

  /**
   * Save score cache to disk
   */
  saveCache() {
    try {
      if (!fs.existsSync(this.CACHE_DIR)) {
        fs.mkdirSync(this.CACHE_DIR, { recursive: true });
      }
      fs.writeFileSync(this.CACHE_FILE, JSON.stringify(this.scoreCache, null, 2));
    } catch (error) {
      logger.warn(`Failed to save cache: ${error.message}`);
    }
  }

  /**
   * Batch score multiple phrases efficiently
   * @param {Array} phrases - Array of {phrase, category} objects
   * @param {Object} options - Batch options
   * @returns {Array} - Array of score results
   */
  async batchScore(phrases, options = {}) {
    const results = [];
    const batchSize = options.batchSize || 10;
    
    logger.info(`Starting batch scoring of ${phrases.length} phrases`);
    
    for (let i = 0; i < phrases.length; i += batchSize) {
      const batch = phrases.slice(i, i + batchSize);
      
      const batchPromises = batch.map(item => 
        this.scorePhrase(item.phrase, item.category, options)
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          logger.error(`Failed to score phrase "${batch[index].phrase}": ${result.reason}`);
          results.push({
            phrase: batch[index].phrase,
            category: batch[index].category,
            totalScore: 0,
            breakdown: { error: result.reason.message },
            verdict: 'ERROR',
            timestamp: new Date().toISOString()
          });
        }
      });
      
      logger.info(`Completed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(phrases.length / batchSize)}`);
      
      // Rate limiting: small delay between batches
      if (i + batchSize < phrases.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    logger.info(`Batch scoring complete: ${results.length} phrases processed`);
    return results;
  }

  /**
   * Get cache statistics
   * @returns {Object} - Cache stats
   */
  getCacheStats() {
    const entries = Object.keys(this.scoreCache).length;
    const avgScore = entries > 0 ? 
      Object.values(this.scoreCache)
        .reduce((sum, score) => sum + score.totalScore, 0) / entries : 0;
    
    let fileSize = 0;
    try {
      if (entries > 0 && fs.existsSync(this.CACHE_FILE)) {
        fileSize = fs.statSync(this.CACHE_FILE).size;
      }
    } catch (error) {
      // Ignore stat errors
    }
    
    return {
      totalEntries: entries,
      averageScore: Math.round(avgScore * 10) / 10,
      cacheFile: this.CACHE_FILE,
      size: fileSize
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.scoreCache = {};
    try {
      if (fs.existsSync(this.CACHE_FILE)) {
        fs.unlinkSync(this.CACHE_FILE);
      }
      logger.info('Cache cleared successfully');
    } catch (error) {
      logger.error(`Failed to clear cache: ${error.message}`);
    }
  }
}

module.exports = PhraseScorer; 