const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [NORMALIZER-${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'phrase-database.log' })
  ]
});

class PhraseNormalizer {
  constructor() {
    this.maxWords = 6;
    this.minLength = 2;
    this.maxLength = 100;
  }

  /**
   * Main normalization function - applies all normalization steps
   * @param {string} phrase - The phrase to normalize
   * @returns {Object} - { normalized: string, isValid: boolean, errors: string[] }
   */
  normalize(phrase) {
    const errors = [];
    
    try {
      // Step 1: Basic validation
      if (!phrase || typeof phrase !== 'string') {
        errors.push('Phrase must be a non-empty string');
        return { normalized: '', isValid: false, errors };
      }

      // Step 2: Strip non-ASCII characters
      let normalized = this.stripNonAscii(phrase);
      logger.debug(`After ASCII filtering: "${normalized}"`);

      // Step 3: Normalize whitespace
      normalized = this.normalizeWhitespace(normalized);
      logger.debug(`After whitespace normalization: "${normalized}"`);

      // Step 4: Length validation
      if (normalized.length < this.minLength) {
        errors.push(`Phrase too short (minimum ${this.minLength} characters)`);
      }
      if (normalized.length > this.maxLength) {
        errors.push(`Phrase too long (maximum ${this.maxLength} characters)`);
      }

      // Step 5: Word count validation
      const wordCount = this.countWords(normalized);
      if (wordCount > this.maxWords) {
        errors.push(`Too many words (maximum ${this.maxWords} words, found ${wordCount})`);
      }
      if (wordCount === 0) {
        errors.push('Phrase contains no valid words');
      }

      // Step 6: Convert to Title Case
      normalized = this.toTitleCase(normalized);
      logger.debug(`After Title Case conversion: "${normalized}"`);

      // Step 7: Final validation - check for whitespace-only after normalization
      if (errors.length === 0 && this.containsOnlyWhitespace(normalized)) {
        errors.push('Phrase contains only whitespace');
      }

      // Also check for phrases that become empty after ASCII filtering
      if (errors.length === 0 && normalized.trim().length === 0) {
        errors.push('Phrase contains only whitespace');
      }

      const isValid = errors.length === 0;
      
      if (isValid) {
        logger.info(`Successfully normalized: "${phrase}" → "${normalized}"`);
      } else {
        logger.warn(`Normalization failed for "${phrase}": ${errors.join(', ')}`);
      }

      return {
        normalized: isValid ? normalized : phrase,
        isValid,
        errors,
        originalLength: phrase.length,
        normalizedLength: normalized.length,
        wordCount: this.countWords(normalized)
      };

    } catch (error) {
      logger.error(`Normalization error for "${phrase}":`, error);
      errors.push(`Normalization error: ${error.message}`);
      return { normalized: phrase, isValid: false, errors };
    }
  }

  /**
   * Remove non-ASCII characters while preserving common punctuation
   * @param {string} text - Input text
   * @returns {string} - ASCII-only text
   */
  stripNonAscii(text) {
    // Keep ASCII characters (32-126) plus common whitespace
    // Allow: letters, numbers, spaces, basic punctuation
    return text.replace(/[^\x20-\x7E]/g, '').trim();
  }

  /**
   * Normalize whitespace - collapse multiple spaces, remove leading/trailing
   * @param {string} text - Input text
   * @returns {string} - Normalized text
   */
  normalizeWhitespace(text) {
    return text
      .trim()                           // Remove leading/trailing whitespace
      .replace(/[\t\n\r]+/g, ' ')      // Convert tabs, newlines to spaces
      .replace(/\s+/g, ' ')            // Collapse multiple whitespace to single space
      .replace(/\s+([.!?,:;])/g, '$1') // Remove space before punctuation
      .replace(/([.!?])\s*([.!?])/g, '$1'); // Remove duplicate punctuation
  }

  /**
   * Convert text to Title Case
   * @param {string} text - Input text
   * @returns {string} - Title Case text
   */
  toTitleCase(text) {
    // Articles, conjunctions, and prepositions to keep lowercase (unless first/last word)
    const lowercaseWords = new Set([
      'a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'so', 'yet',
      'at', 'by', 'in', 'of', 'on', 'to', 'up', 'as', 'is', 'if', 'be', 'from'
    ]);

    return text
      .toLowerCase()
      .split(' ')
      .map((word, index, array) => {
        // Always capitalize first and last word
        if (index === 0 || index === array.length - 1) {
          return this.capitalizeWord(word);
        }
        
        // Keep articles/prepositions lowercase unless they're important
        const cleanWord = word.replace(/[^\w]/g, '').toLowerCase();
        if (lowercaseWords.has(cleanWord) && word.length < 4) {
          return word.toLowerCase();
        }
        
        return this.capitalizeWord(word);
      })
      .join(' ');
  }

  /**
   * Capitalize the first letter of a word
   * @param {string} word - Input word
   * @returns {string} - Capitalized word
   */
  capitalizeWord(word) {
    if (!word) return word;
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }

  /**
   * Count words in text
   * @param {string} text - Input text
   * @returns {number} - Word count
   */
  countWords(text) {
    if (!text || typeof text !== 'string') return 0;
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    return words.length;
  }

  /**
   * Check if text contains only whitespace
   * @param {string} text - Input text
   * @returns {boolean} - True if only whitespace
   */
  containsOnlyWhitespace(text) {
    return !text || /^\s*$/.test(text);
  }

  /**
   * Extract the first word from a phrase (for duplicate checking)
   * @param {string} phrase - Input phrase
   * @returns {string} - First word in lowercase
   */
  extractFirstWord(phrase) {
    if (!phrase || typeof phrase !== 'string') return '';
    
    const words = phrase.trim().split(/\s+/);
    if (words.length === 0) return '';
    
    // Remove punctuation and convert to lowercase
    const firstWord = words[0].replace(/[^\w]/g, '').toLowerCase();
    return firstWord;
  }

  /**
   * Batch normalize multiple phrases
   * @param {string[]} phrases - Array of phrases to normalize
   * @returns {Object[]} - Array of normalization results
   */
  normalizeBatch(phrases) {
    if (!Array.isArray(phrases)) {
      throw new Error('Input must be an array of phrases');
    }

    logger.info(`Starting batch normalization of ${phrases.length} phrases`);
    
    const results = phrases.map((phrase, index) => {
      const result = this.normalize(phrase);
      return {
        index,
        original: phrase,
        ...result
      };
    });

    const validCount = results.filter(r => r.isValid).length;
    const invalidCount = results.length - validCount;
    
    logger.info(`Batch normalization complete: ${validCount} valid, ${invalidCount} invalid`);
    
    return results;
  }

  /**
   * Get normalization statistics
   * @returns {Object} - Normalization configuration and stats
   */
  getConfig() {
    return {
      maxWords: this.maxWords,
      minLength: this.minLength,
      maxLength: this.maxLength,
      version: '1.0.0'
    };
  }
}

module.exports = PhraseNormalizer; 