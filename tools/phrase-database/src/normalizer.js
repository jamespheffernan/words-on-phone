const winston = require('winston');

// Configure logger for normalizer
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [NORM-${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'phrase-database.log' })
  ]
});

class PhraseNormalizer {
  constructor() {
    this.MAX_WORDS = 6;
    this.MIN_WORDS = 1;
  }

  /**
   * Process a phrase through the complete normalization pipeline
   * @param {string} phrase - Raw phrase input
   * @returns {Object} - Normalized phrase data
   */
  process(phrase) {
    if (!phrase || typeof phrase !== 'string') {
      throw new Error('Phrase must be a non-empty string');
    }

    // Step 1: Basic cleanup
    const cleaned = this.basicCleanup(phrase);
    
    // Step 2: Convert to Title Case
    const titleCased = this.toTitleCase(cleaned);
    
    // Step 3: Normalize to ASCII
    const asciiNormalized = this.normalizeToAscii(titleCased);
    
    // Step 4: Final whitespace cleanup
    const final = this.finalCleanup(asciiNormalized);
    
    // Step 5: Validate word count
    const wordCount = this.getWordCount(final);
    if (!this.isValidWordCount(wordCount)) {
      throw new Error(`Phrase must have ${this.MIN_WORDS}-${this.MAX_WORDS} words, got ${wordCount}`);
    }
    
    // Step 6: Extract first word
    const firstWord = this.extractFirstWord(final);
    
    const result = {
      original: phrase,
      phrase: final,
      firstWord: firstWord,
      wordCount: wordCount,
      transformations: this.getTransformations(phrase, final)
    };

    logger.info(`Normalized "${phrase}" → "${final}" (${wordCount} words, first: "${firstWord}")`);
    return result;
  }

  /**
   * Basic cleanup: trim and normalize whitespace
   */
  basicCleanup(phrase) {
    return phrase
      .trim()
      .replace(/\s+/g, ' ') // Multiple spaces to single space
      .replace(/\u00A0/g, ' '); // Non-breaking spaces to regular spaces
  }

  /**
   * Convert to Title Case with smart handling
   */
  toTitleCase(phrase) {
    // Articles, conjunctions, and prepositions to keep lowercase (unless first/last word)
    const lowercaseWords = new Set([
      'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'if', 'in', 
      'nor', 'of', 'on', 'or', 'so', 'the', 'to', 'up', 'yet'
    ]);

    const originalWords = phrase.split(' ');
    const words = phrase.toLowerCase().split(' ');
    
    return words.map((word, index) => {
      const isFirstOrLast = index === 0 || index === words.length - 1;
      
      // Handle acronyms (all caps words in original)
      if (/^[A-Z]{2,}$/.test(originalWords[index])) {
        return originalWords[index]; // Keep original acronym
      }
      
      // Handle hyphenated words - capitalize both parts
      if (word.includes('-')) {
        return word.split('-').map(part => 
          part.charAt(0).toUpperCase() + part.slice(1)
        ).join('-');
      }
      
      const shouldCapitalize = isFirstOrLast || !lowercaseWords.has(word);
      
      if (shouldCapitalize) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word;
    }).join(' ');
  }

  /**
   * Normalize to ASCII characters only
   */
  normalizeToAscii(phrase) {
    return phrase
      // Common Unicode to ASCII mappings
      .replace(/[\u2018\u2019]/g, "'")  // Smart single quotes to straight quotes
      .replace(/[\u201C\u201D]/g, '"')  // Smart double quotes to straight quotes
      .replace(/[–—]/g, '-')  // En/em dashes to hyphens
      .replace(/[…]/g, '...')  // Ellipsis
      // Remove accents and diacritics
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      // Remove any remaining non-ASCII characters
      .replace(/[^\x00-\x7F]/g, '');
  }

  /**
   * Final cleanup after ASCII normalization
   */
  finalCleanup(phrase) {
    return phrase
      .trim()
      .replace(/\s+/g, ' ')
      // Remove multiple punctuation
      .replace(/[.]{2,}/g, '...')
      .replace(/[!]{2,}/g, '!')
      .replace(/[?]{2,}/g, '?');
  }

  /**
   * Get word count
   */
  getWordCount(phrase) {
    if (!phrase.trim()) return 0;
    return phrase.trim().split(/\s+/).length;
  }

  /**
   * Validate word count is within limits
   */
  isValidWordCount(count) {
    return count >= this.MIN_WORDS && count <= this.MAX_WORDS;
  }

  /**
   * Extract first word for duplicate checking
   */
  extractFirstWord(phrase) {
    const words = phrase.trim().split(/\s+/);
    if (words.length === 0) return '';
    
    // Remove possessive endings for consistency
    let firstWord = words[0].toLowerCase();
    if (firstWord.endsWith("'s")) {
      firstWord = firstWord.slice(0, -2);
    }
    
    return firstWord;
  }

  /**
   * Track what transformations were applied
   */
  getTransformations(original, final) {
    const transformations = [];
    
    if (original !== original.trim()) {
      transformations.push('trimmed');
    }
    
    if (original.replace(/\s+/g, ' ') !== original) {
      transformations.push('whitespace-normalized');
    }
    
    if (original !== final) {
      transformations.push('case-adjusted');
    }
    
    if (original.normalize('NFD').replace(/[\u0300-\u036f]/g, '') !== original) {
      transformations.push('diacritics-removed');
    }
    
    if (/[^\x00-\x7F]/.test(original)) {
      transformations.push('non-ascii-cleaned');
    }
    
    return transformations;
  }

  /**
   * Validate a phrase without processing it
   */
  validate(phrase) {
    try {
      this.process(phrase);
      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }
}

module.exports = PhraseNormalizer; 