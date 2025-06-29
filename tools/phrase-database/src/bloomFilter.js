const { BloomFilter } = require('bloomfilter');
const winston = require('winston');

// Configure logger for bloom filter
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [BLOOM-${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'phrase-database.log' })
  ]
});

class CategoryBloomFilter {
  constructor(database) {
    this.db = database;
    this.categoryFilters = new Map();
    this.BITS_PER_ELEMENT = 10; // 10 bits per element for ~1% false positive rate
    this.HASH_FUNCTIONS = 3;
  }

  /**
   * Canonicalize a phrase into tokens for Bloom filter storage
   * @param {string} phrase - Raw phrase to canonicalize
   * @returns {string} - Canonicalized token string
   */
  canonicalize(phrase) {
    return phrase
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ')    // Normalize whitespace
      .trim();
  }

  /**
   * Initialize Bloom filters for all categories with existing phrases
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      logger.info('Initializing category-scoped Bloom filters...');
      
      // Get all categories and their phrase counts
      const categoryQuery = `
        SELECT category, COUNT(*) as phrase_count
        FROM phrases
        GROUP BY category
        ORDER BY phrase_count DESC
      `;
      
      const categories = await this.db.all(categoryQuery);
      
      for (const { category, phrase_count } of categories) {
        await this.buildCategoryFilter(category, phrase_count);
      }
      
      logger.info(`Bloom filters initialized for ${categories.length} categories`);
      
    } catch (error) {
      logger.error(`Error initializing Bloom filters: ${error.message}`);
      throw error;
    }
  }

  /**
   * Build Bloom filter for a specific category
   * @param {string} category - Category name
   * @param {number} expectedElements - Expected number of elements (for sizing)
   * @returns {Promise<void>}
   */
  async buildCategoryFilter(category, expectedElements = null) {
    try {
      // Get all phrases for this category
      const phrasesQuery = `
        SELECT phrase
        FROM phrases
        WHERE category = ?
        ORDER BY added DESC
      `;
      
      const phrases = await this.db.all(phrasesQuery, [category]);
      const actualCount = phrases.length;
      
      if (actualCount === 0) {
        logger.warn(`No phrases found for category "${category}", skipping Bloom filter`);
        return;
      }

      // Size the filter based on actual phrase count with some growth room
      const filterSize = Math.max(actualCount * 2, 100); // At least 100, double current size
      const bits = filterSize * this.BITS_PER_ELEMENT;
      
      // Create new Bloom filter
      const filter = new BloomFilter(bits, this.HASH_FUNCTIONS);
      
      // Add all existing phrases to the filter
      let addedCount = 0;
      for (const { phrase } of phrases) {
        const canonicalized = this.canonicalize(phrase);
        filter.add(canonicalized);
        addedCount++;
      }
      
      // Store the filter
      this.categoryFilters.set(category, filter);
      
      logger.info(`Built Bloom filter for "${category}": ${addedCount} phrases, ${bits} bits, ${this.HASH_FUNCTIONS} hash functions`);
      
    } catch (error) {
      logger.error(`Error building Bloom filter for category "${category}": ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if a phrase candidate likely exists in the category (pre-filter)
   * @param {string} phrase - Phrase candidate to check
   * @param {string} category - Category to check against
   * @returns {boolean} - True if phrase MIGHT exist (possible false positive), false if definitely doesn't exist
   */
  mightExist(phrase, category) {
    const filter = this.categoryFilters.get(category);
    
    if (!filter) {
      // No filter for this category, assume it might exist (safe default)
      logger.warn(`No Bloom filter found for category "${category}", assuming phrase might exist`);
      return true;
    }
    
    const canonicalized = this.canonicalize(phrase);
    const result = filter.test(canonicalized);
    
    if (result) {
      logger.debug(`Bloom filter HIT for "${phrase}" in category "${category}" (might be duplicate)`);
    } else {
      logger.debug(`Bloom filter MISS for "${phrase}" in category "${category}" (definitely new)`);
    }
    
    return result;
  }

  /**
   * Add a new phrase to the appropriate category filter
   * @param {string} phrase - New phrase to add
   * @param {string} category - Category to add to
   * @returns {void}
   */
  addPhrase(phrase, category) {
    const filter = this.categoryFilters.get(category);
    
    if (!filter) {
      logger.warn(`No Bloom filter found for category "${category}", cannot add phrase "${phrase}"`);
      return;
    }
    
    const canonicalized = this.canonicalize(phrase);
    filter.add(canonicalized);
    
    logger.debug(`Added "${phrase}" to Bloom filter for category "${category}"`);
  }

  /**
   * Get statistics about all category filters
   * @returns {Object} - Filter statistics
   */
  getStats() {
    const stats = {
      totalCategories: this.categoryFilters.size,
      categories: {}
    };
    
    for (const [category, filter] of this.categoryFilters.entries()) {
      stats.categories[category] = {
        bits: filter.bits.length * 32, // Assuming 32-bit integers
        hashFunctions: filter.k,
        estimatedElements: Math.round(filter.bits.length * 32 / this.BITS_PER_ELEMENT)
      };
    }
    
    return stats;
  }

  /**
   * Filter a batch of phrase candidates, returning only those not in Bloom filters
   * @param {Array} candidates - Array of {phrase, category} objects
   * @returns {Array} - Filtered candidates that are likely new
   */
  filterCandidates(candidates) {
    const filtered = [];
    let bloomHits = 0;
    let bloomMisses = 0;
    
    for (const candidate of candidates) {
      if (!this.mightExist(candidate.phrase, candidate.category)) {
        filtered.push(candidate);
        bloomMisses++;
      } else {
        bloomHits++;
      }
    }
    
    logger.info(`Bloom filter results: ${bloomMisses} likely new, ${bloomHits} possible duplicates (${candidates.length} total candidates)`);
    
    return {
      filtered: filtered,
      stats: {
        totalCandidates: candidates.length,
        likelyNew: bloomMisses,
        possibleDuplicates: bloomHits,
        filterEfficiency: bloomHits / candidates.length
      }
    };
  }

  /**
   * Rebuild a category filter when it gets too full or outdated
   * @param {string} category - Category to rebuild
   * @returns {Promise<void>}
   */
  async rebuildCategoryFilter(category) {
    logger.info(`Rebuilding Bloom filter for category "${category}"`);
    
    // Remove old filter
    this.categoryFilters.delete(category);
    
    // Build new filter
    await this.buildCategoryFilter(category);
    
    logger.info(`Rebuilt Bloom filter for category "${category}"`);
  }
}

module.exports = CategoryBloomFilter; 