const winston = require('winston');
const PhraseNormalizer = require('./normalizer');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [DUPLICATE-${level.toUpperCase()}]: ${message}`;
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
    this.maxFirstWordLimit = 5; // Max phrases per category per first word
  }

  /**
   * Check if a phrase is a duplicate and can be added
   * @param {string} phrase - The phrase to check
   * @param {string} category - The category to check in
   * @returns {Object} - { canAdd: boolean, reason: string, details: Object }
   */
  async checkDuplicate(phrase, category) {
    try {
      // First normalize the phrase
      const normalizedResult = this.normalizer.normalize(phrase);
      
      if (!normalizedResult.isValid) {
        return {
          canAdd: false,
          reason: 'Invalid phrase',
          details: {
            type: 'INVALID_PHRASE',
            originalPhrase: phrase,
            errors: normalizedResult.errors,
            normalized: normalizedResult.normalized
          }
        };
      }

      const normalizedPhrase = normalizedResult.normalized;
      const firstWord = this.normalizer.extractFirstWord(normalizedPhrase);

      logger.info(`Checking duplicates for: "${phrase}" → "${normalizedPhrase}" (first word: "${firstWord}")`);

      // Check for exact phrase duplicate (in any category)
      const exactDuplicate = await this.db.checkDuplicate(normalizedPhrase);
      if (exactDuplicate) {
        // If it's the same phrase but in a different category, check if it's case-insensitive similar
        const existingPhrases = await this.db.all(
          'SELECT phrase, category FROM phrases WHERE phrase = ?',
          [normalizedPhrase]
        );
        
        const sameCategory = existingPhrases.some(p => p.category === category);
        
        if (sameCategory) {
          logger.warn(`Exact duplicate found: "${normalizedPhrase}" in same category`);
          return {
            canAdd: false,
            reason: 'Exact phrase duplicate',
            details: {
              type: 'EXACT_DUPLICATE',
              originalPhrase: phrase,
              normalizedPhrase,
              existingPhrase: normalizedPhrase,
              category
            }
          };
        }
        
        // If different category, it's allowed (phrases can exist in multiple categories)
      }

      // Check first-word limit
      const firstWordLimitReached = await this.db.checkFirstWordLimit(category, firstWord, this.maxFirstWordLimit);
      if (firstWordLimitReached) {
        const existingPhrases = await this.getPhrasesWithFirstWord(category, firstWord);
        logger.warn(`First-word limit reached for "${firstWord}" in category "${category}" (${existingPhrases.length}/${this.maxFirstWordLimit})`);
        
        return {
          canAdd: false,
          reason: `Too many phrases starting with "${firstWord}" in category "${category}"`,
          details: {
            type: 'FIRST_WORD_LIMIT',
            originalPhrase: phrase,
            normalizedPhrase,
            category,
            firstWord,
            currentCount: existingPhrases.length,
            maxLimit: this.maxFirstWordLimit,
            existingPhrases: existingPhrases.map(p => p.phrase)
          }
        };
      }

      // Check for case-insensitive similar phrases (phrases that normalize to the same thing but are different)
      const similarPhrases = await this.findSimilarPhrases(phrase, normalizedPhrase, category);
      if (similarPhrases.length > 0) {
        logger.warn(`Similar phrases found for "${normalizedPhrase}": ${similarPhrases.map(p => p.phrase).join(', ')}`);
        
        return {
          canAdd: false,
          reason: 'Similar phrase exists (case-insensitive match)',
          details: {
            type: 'SIMILAR_PHRASE',
            originalPhrase: phrase,
            normalizedPhrase,
            category,
            similarPhrases: similarPhrases.map(p => ({
              phrase: p.phrase,
              category: p.category,
              added: p.added
            }))
          }
        };
      }

      // Phrase can be added
      logger.info(`Phrase cleared for addition: "${normalizedPhrase}"`);
      return {
        canAdd: true,
        reason: 'No duplicates found',
        details: {
          type: 'APPROVED',
          originalPhrase: phrase,
          normalizedPhrase,
          category,
          firstWord
        }
      };

    } catch (error) {
      logger.error(`Error checking duplicates for "${phrase}":`, error);
      return {
        canAdd: false,
        reason: `Error checking duplicates: ${error.message}`,
        details: {
          type: 'ERROR',
          originalPhrase: phrase,
          error: error.message
        }
      };
    }
  }

  /**
   * Get all phrases with a specific first word in a category
   * @param {string} category - Category to search in
   * @param {string} firstWord - First word to match
   * @returns {Array} - Array of matching phrases
   */
  async getPhrasesWithFirstWord(category, firstWord) {
    try {
      const phrases = await this.db.all(
        'SELECT phrase, category, first_word, added FROM phrases WHERE category = ? AND first_word = ? ORDER BY added ASC',
        [category, firstWord]
      );
      return phrases || [];
    } catch (error) {
      logger.error(`Error getting phrases with first word "${firstWord}":`, error);
      return [];
    }
  }

  /**
   * Find phrases that are similar (case-insensitive) to the given phrase
   * @param {string} originalPhrase - Original phrase before normalization
   * @param {string} normalizedPhrase - Normalized phrase to compare
   * @param {string} category - Category to search in
   * @returns {Array} - Array of similar phrases
   */
  async findSimilarPhrases(originalPhrase, normalizedPhrase, category) {
    try {
      // Get all phrases in the category
      const allPhrases = await this.db.getPhrasesByCategory(category);
      
      // Find phrases that normalize to the same thing but have different original cases
      const similarPhrases = [];
      for (const existingPhrase of allPhrases) {
        const existingNormalized = this.normalizer.normalize(existingPhrase.phrase);
        
        if (existingNormalized.isValid && 
            existingNormalized.normalized === normalizedPhrase && 
            existingPhrase.phrase !== originalPhrase) {
          similarPhrases.push(existingPhrase);
        }
      }
      
      return similarPhrases;
    } catch (error) {
      logger.error(`Error finding similar phrases for "${originalPhrase}":`, error);
      return [];
    }
  }

  /**
   * Generate a comprehensive duplicate report for a category
   * @param {string} category - Category to analyze (optional - analyzes all if not provided)
   * @returns {Object} - Detailed duplicate analysis report
   */
  async generateDuplicateReport(category = null) {
    try {
      logger.info(`Generating duplicate report${category ? ` for category "${category}"` : ' for all categories'}`);
      
      const phrases = category ? 
        await this.db.getPhrasesByCategory(category) : 
        await this.db.getAllPhrases();

      const report = {
        category: category || 'ALL',
        totalPhrases: phrases.length,
        duplicateAnalysis: {
          exactDuplicates: [],
          firstWordGroups: {},
          potentialIssues: []
        },
        generatedAt: new Date().toISOString()
      };

      // Group phrases by first word
      const firstWordGroups = {};
      const seenPhrases = new Set();
      
      for (const phrase of phrases) {
        const firstWord = phrase.first_word;
        const phraseCategory = phrase.category;
        
        // Track exact duplicates
        const phraseKey = `${phrase.phrase.toLowerCase()}|${phraseCategory}`;
        if (seenPhrases.has(phraseKey)) {
          report.duplicateAnalysis.exactDuplicates.push({
            phrase: phrase.phrase,
            category: phraseCategory,
            duplicateCount: 'multiple'
          });
        } else {
          seenPhrases.add(phraseKey);
        }
        
        // Group by first word and category
        const groupKey = `${firstWord}|${phraseCategory}`;
        if (!firstWordGroups[groupKey]) {
          firstWordGroups[groupKey] = {
            firstWord,
            category: phraseCategory,
            phrases: [],
            count: 0
          };
        }
        
        firstWordGroups[groupKey].phrases.push({
          phrase: phrase.phrase,
          added: phrase.added,
          recent: phrase.recent
        });
        firstWordGroups[groupKey].count++;
      }

      // Analyze first word groups
      for (const [groupKey, group] of Object.entries(firstWordGroups)) {
        report.duplicateAnalysis.firstWordGroups[groupKey] = {
          ...group,
          exceedsLimit: group.count > this.maxFirstWordLimit,
          utilizationPercentage: Math.round((group.count / this.maxFirstWordLimit) * 100)
        };
        
        // Flag groups that exceed or are close to the limit
        if (group.count > this.maxFirstWordLimit) {
          report.duplicateAnalysis.potentialIssues.push({
            type: 'EXCEEDS_FIRST_WORD_LIMIT',
            message: `"${group.firstWord}" in "${group.category}" has ${group.count} phrases (limit: ${this.maxFirstWordLimit})`,
            severity: 'HIGH',
            firstWord: group.firstWord,
            category: group.category,
            count: group.count,
            limit: this.maxFirstWordLimit
          });
        } else if (group.count === this.maxFirstWordLimit) {
          report.duplicateAnalysis.potentialIssues.push({
            type: 'AT_FIRST_WORD_LIMIT',
            message: `"${group.firstWord}" in "${group.category}" is at maximum capacity (${group.count}/${this.maxFirstWordLimit})`,
            severity: 'MEDIUM',
            firstWord: group.firstWord,
            category: group.category,
            count: group.count,
            limit: this.maxFirstWordLimit
          });
        }
      }

      // Summary statistics
      const totalGroups = Object.keys(firstWordGroups).length;
      const overLimitGroups = Object.values(firstWordGroups).filter(g => g.count > this.maxFirstWordLimit).length;
      const atLimitGroups = Object.values(firstWordGroups).filter(g => g.count === this.maxFirstWordLimit).length;
      
      report.summary = {
        totalFirstWordGroups: totalGroups,
        groupsOverLimit: overLimitGroups,
        groupsAtLimit: atLimitGroups,
        exactDuplicateCount: report.duplicateAnalysis.exactDuplicates.length,
        potentialIssueCount: report.duplicateAnalysis.potentialIssues.length
      };

      logger.info(`Duplicate report complete: ${totalGroups} groups, ${overLimitGroups} over limit, ${atLimitGroups} at limit`);
      
      return report;
      
    } catch (error) {
      logger.error('Error generating duplicate report:', error);
      throw error;
    }
  }

  /**
   * Batch check multiple phrases for duplicates
   * @param {Array} phrases - Array of {phrase, category} objects
   * @returns {Array} - Array of duplicate check results
   */
  async batchCheckDuplicates(phrases) {
    if (!Array.isArray(phrases)) {
      throw new Error('Input must be an array of phrase objects');
    }

    logger.info(`Starting batch duplicate check for ${phrases.length} phrases`);
    
    const results = [];
    for (let i = 0; i < phrases.length; i++) {
      const { phrase, category } = phrases[i];
      const result = await this.checkDuplicate(phrase, category);
      results.push({
        index: i,
        phrase,
        category,
        ...result
      });
    }

    const approvedCount = results.filter(r => r.canAdd).length;
    const rejectedCount = results.length - approvedCount;
    
    logger.info(`Batch duplicate check complete: ${approvedCount} approved, ${rejectedCount} rejected`);
    
    return results;
  }

  /**
   * Get configuration for duplicate detection
   * @returns {Object} - Configuration object
   */
  getConfig() {
    return {
      maxFirstWordLimit: this.maxFirstWordLimit,
      version: '1.0.0',
      features: [
        'Exact phrase duplicate detection',
        'First-word limit enforcement',
        'Case-insensitive similar phrase detection',
        'Batch processing',
        'Comprehensive reporting'
      ]
    };
  }
}

module.exports = DuplicateDetector; 