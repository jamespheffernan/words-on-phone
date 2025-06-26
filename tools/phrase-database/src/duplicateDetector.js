const winston = require('winston');
const PhraseNormalizer = require('./normalizer');

// Configure logger for duplicate detector
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [DUP-${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'phrase-database.log' })
  ]
});

class DuplicateDetector {
  constructor(database) {
    this.db = database;
    this.normalizer = new PhraseNormalizer();
    this.MAX_PHRASES_PER_FIRST_WORD = 2;
  }

  /**
   * Check if a phrase can be added to the database
   * @param {string} phrase - Raw phrase input
   * @param {string} category - Category to add phrase to
   * @returns {Object} - Validation result
   */
  async validatePhrase(phrase, category) {
    try {
      // Step 1: Normalize the phrase
      const normalized = this.normalizer.process(phrase);
      
      // Step 2: Check for exact phrase duplicate
      const exactDuplicate = await this.checkExactDuplicate(normalized.phrase);
      if (exactDuplicate.isDuplicate) {
        logger.warn(`Exact duplicate detected: "${normalized.phrase}"`);
        return {
          valid: false,
          reason: 'exact-duplicate',
          message: `Phrase "${normalized.phrase}" already exists in the database`,
          details: {
            existingPhrase: exactDuplicate.existingPhrase,
            existingCategory: exactDuplicate.existingCategory
          }
        };
      }

      // Step 3: Check first word limit for this category
      const firstWordLimit = await this.checkFirstWordLimit(normalized.firstWord, category);
      if (firstWordLimit.limitExceeded) {
        logger.warn(`First word limit exceeded: "${normalized.firstWord}" in category "${category}"`);
        return {
          valid: false,
          reason: 'first-word-limit',
          message: `Category "${category}" already has ${this.MAX_PHRASES_PER_FIRST_WORD} phrases starting with "${normalized.firstWord}"`,
          details: {
            firstWord: normalized.firstWord,
            category: category,
            existingPhrases: firstWordLimit.existingPhrases,
            limit: this.MAX_PHRASES_PER_FIRST_WORD
          }
        };
      }

      // Step 4: All checks passed
      logger.info(`Phrase validation passed: "${normalized.phrase}" for category "${category}"`);
      return {
        valid: true,
        normalized: normalized,
        message: `Phrase "${normalized.phrase}" is valid and can be added to category "${category}"`
      };

    } catch (error) {
      logger.error(`Error validating phrase "${phrase}": ${error.message}`);
      return {
        valid: false,
        reason: 'validation-error',
        message: `Error validating phrase: ${error.message}`,
        error: error
      };
    }
  }

  /**
   * Check if exact phrase already exists in database
   * @param {string} normalizedPhrase - Normalized phrase to check
   * @returns {Object} - Duplicate check result
   */
  async checkExactDuplicate(normalizedPhrase) {
    try {
      const query = `
        SELECT phrase, category 
        FROM phrases 
        WHERE LOWER(phrase) = LOWER(?)
        LIMIT 1
      `;
      
      const result = await this.db.get(query, [normalizedPhrase]);
      
      if (result) {
        return {
          isDuplicate: true,
          existingPhrase: result.phrase,
          existingCategory: result.category
        };
      }
      
      return { isDuplicate: false };
    } catch (error) {
      logger.error(`Error checking exact duplicate: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if category already has max phrases for this first word
   * @param {string} firstWord - First word to check
   * @param {string} category - Category to check in
   * @returns {Object} - First word limit check result
   */
  async checkFirstWordLimit(firstWord, category) {
    try {
      const query = `
        SELECT phrase, first_word 
        FROM phrases 
        WHERE LOWER(first_word) = LOWER(?) AND category = ?
        ORDER BY added DESC
      `;
      
      const results = await this.db.all(query, [firstWord, category]);
      
      if (results.length >= this.MAX_PHRASES_PER_FIRST_WORD) {
        return {
          limitExceeded: true,
          existingPhrases: results.map(r => r.phrase),
          count: results.length
        };
      }
      
      return { 
        limitExceeded: false,
        count: results.length 
      };
    } catch (error) {
      logger.error(`Error checking first word limit: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get duplicate detection statistics
   * @returns {Object} - Statistics about duplicates and limits
   */
  async getStats() {
    try {
      // Get first word distribution per category
      const firstWordQuery = `
        SELECT 
          category, 
          first_word, 
          COUNT(*) as count,
          GROUP_CONCAT(phrase, ' | ') as phrases
        FROM phrases 
        GROUP BY category, LOWER(first_word)
        HAVING count >= 2
        ORDER BY category, count DESC
      `;
      
      const firstWordStats = await this.db.all(firstWordQuery);
      
      // Get total phrase count per category
      const categoryQuery = `
        SELECT category, COUNT(*) as total_phrases
        FROM phrases
        GROUP BY category
        ORDER BY total_phrases DESC
      `;
      
      const categoryStats = await this.db.all(categoryQuery);
      
      // Find potential near-duplicates (phrases with 3+ words)
      const nearDuplicateQuery = `
        SELECT phrase, category
        FROM phrases
        WHERE LENGTH(phrase) - LENGTH(REPLACE(phrase, ' ', '')) >= 2
      `;
      
      const nearDuplicates = await this.db.all(nearDuplicateQuery);
      
      // Group by first few words (done in JavaScript for simplicity)
      const nearDuplicateGroups = {};
      nearDuplicates.forEach(row => {
        const words = row.phrase.split(' ');
        if (words.length >= 3) {
          const firstThreeWords = words.slice(0, 3).join(' ');
          const key = `${row.category}:${firstThreeWords}`;
          if (!nearDuplicateGroups[key]) {
            nearDuplicateGroups[key] = [];
          }
          nearDuplicateGroups[key].push(row.phrase);
        }
      });
      
      // Filter to only groups with multiple phrases
      const suspiciousGroups = Object.entries(nearDuplicateGroups)
        .filter(([key, phrases]) => phrases.length > 1)
        .map(([key, phrases]) => {
          const [category, firstThreeWords] = key.split(':');
          return { category, firstThreeWords, phrases };
        });

      return {
        firstWordDistribution: firstWordStats,
        categoryStats: categoryStats,
        nearDuplicateSuspicions: suspiciousGroups,
        limits: {
          maxPhrasesPerFirstWord: this.MAX_PHRASES_PER_FIRST_WORD
        }
      };
    } catch (error) {
      logger.error(`Error getting duplicate detection stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Batch validate multiple phrases
   * @param {Array} phrases - Array of {phrase, category} objects
   * @returns {Array} - Array of validation results
   */
  async validateBatch(phrases) {
    const results = [];
    
    for (const item of phrases) {
      const result = await this.validatePhrase(item.phrase, item.category);
      results.push({
        input: item,
        result: result
      });
    }
    
    return results;
  }

  /**
   * Check what would happen if we tried to add this phrase (dry run)
   * @param {string} phrase - Phrase to test
   * @param {string} category - Category to test
   * @returns {Object} - Detailed analysis
   */
  async dryRun(phrase, category) {
    const validation = await this.validatePhrase(phrase, category);
    
    if (validation.valid) {
      // Also check what the state would be after adding
      const normalized = validation.normalized;
      const currentFirstWordCount = await this.checkFirstWordLimit(normalized.firstWord, category);
      
      return {
        canAdd: true,
        normalizedPhrase: normalized.phrase,
        firstWord: normalized.firstWord,
        transformations: normalized.transformations,
        afterAdd: {
          firstWordCount: currentFirstWordCount.count + 1,
          remainingSlots: this.MAX_PHRASES_PER_FIRST_WORD - currentFirstWordCount.count - 1
        }
      };
    }
    
    return {
      canAdd: false,
      reason: validation.reason,
      message: validation.message,
      details: validation.details
    };
  }
}

module.exports = DuplicateDetector; 