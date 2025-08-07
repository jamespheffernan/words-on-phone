const fs = require('fs');
const path = require('path');

/**
 * WordNetProcessor - Multi-word entry detection for distinctiveness scoring
 * 
 * Provides 10-point bonuses for phrases found as multi-word entries in dictionaries
 * Uses a curated list of common multi-word entries + pattern-based detection
 */
class WordNetProcessor {
  constructor(options = {}) {
    this.processedCount = 0;
    
    // Load multi-word entries database
    this.multiWordEntries = new Set([
      // Common compound nouns
      'ice cream', 'hot dog', 'french fries', 'coffee shop', 'gas station',
      'basketball court', 'swimming pool', 'parking lot', 'shopping mall',
      'post office', 'fire department', 'police station', 'high school',
      
      // Technology/Business terms
      'machine learning', 'artificial intelligence', 'social media',
      'cloud computing', 'data science', 'mobile phone', 'credit card',
      'online shopping', 'video game', 'search engine',
      
      // Food/Cooking
      'pizza delivery', 'fast food', 'baking soda', 'olive oil',
      'ice water', 'apple pie', 'chicken soup', 'beef stew',
      
      // Sports/Activities  
      'rock climbing', 'mountain biking', 'ice skating', 'snow skiing',
      'water skiing', 'horse racing', 'car racing', 'ball game',
      
      // Places/Geography
      'new york', 'los angeles', 'san francisco', 'las vegas',
      'grand canyon', 'mount everest', 'niagara falls',
      
      // Entertainment/Media
      'rock music', 'pop music', 'movie theater', 'tv show',
      'music video', 'news reporter', 'talk show',
      
      // Common phrases
      'air conditioning', 'washing machine', 'vacuum cleaner',
      'alarm clock', 'ceiling fan', 'front door', 'back yard',
      'living room', 'dining room', 'master bedroom'
    ]);
    
    // Compound word patterns (word1 + word2 combinations that are typically valid)
    this.compoundPatterns = [
      // noun + noun compounds
      /^(coffee|tea|ice|hot|cold)\s+(cup|shop|cream|water|dog)$/i,
      /^(basketball|football|baseball|tennis|golf)\s+(court|field|ball|player|game)$/i,
      /^(fire|police|post|gas)\s+(station|department|office|truck)$/i,
      /^(shopping|parking|swimming|living|dining)\s+(mall|lot|pool|room)$/i,
      /^(high|middle|elementary)\s+school$/i,
      /^(movie|music|video)\s+(theater|store|game)$/i,
      
      // adjective + noun compounds
      /^(social|digital|mobile|online)\s+(media|marketing|phone|shopping)$/i,
      /^(machine|deep|artificial)\s+(learning|intelligence)$/i,
      /^(fast|junk|health|organic)\s+food$/i,
      /^(rock|pop|classical|country)\s+music$/i
    ];
  }

  /**
   * Check if a phrase exists as a multi-word entry
   */
  async checkMultiWordEntry(phrase) {
    const startTime = Date.now();
    const normalizedPhrase = phrase.toLowerCase().trim();
    
    try {
      // Only check phrases with 2-4 words
      const words = normalizedPhrase.split(' ');
      if (words.length < 2 || words.length > 4) {
        return {
          score: 0,
          type: 'invalid_word_count',
          word_count: words.length,
          duration_ms: Date.now() - startTime
        };
      }
      
      // 1. Check direct lookup in curated list
      if (this.multiWordEntries.has(normalizedPhrase)) {
        return {
          score: 10,
          type: 'multiword_entry_found',
          method: 'direct_lookup',
          phrase: normalizedPhrase,
          duration_ms: Date.now() - startTime
        };
      }
      
      // 2. Check compound word patterns
      for (const pattern of this.compoundPatterns) {
        if (pattern.test(normalizedPhrase)) {
          return {
            score: 10,
            type: 'multiword_entry_found', 
            method: 'pattern_match',
            pattern: pattern.toString(),
            phrase: normalizedPhrase,
            duration_ms: Date.now() - startTime
          };
        }
      }
      
      // 3. Check for common compound structures
      const compoundResult = this.checkCompoundStructure(words);
      if (compoundResult.score > 0) {
        compoundResult.duration_ms = Date.now() - startTime;
        return compoundResult;
      }
      
      // Not found as multi-word entry
      return {
        score: 0,
        type: 'multiword_entry_not_found',
        phrase: normalizedPhrase,
        duration_ms: Date.now() - startTime
      };
      
    } catch (error) {
      console.warn('⚠️ WordNet check failed:', error.message);
      return {
        score: 0,
        type: 'error',
        error: error.message,
        duration_ms: Date.now() - startTime
      };
    }
  }

  /**
   * Check for common compound word structures
   */
  checkCompoundStructure(words) {
    if (words.length !== 2) {
      return { score: 0, type: 'not_compound' };
    }
    
    const [word1, word2] = words;
    
    // Common compound patterns that are likely to be dictionary entries
    const compoundIndicators = [
      // noun + noun (very common pattern)
      word1.match(/^(air|car|fire|ice|post|gas|oil|water|sun|moon|star)$/) && 
      word2.match(/^(port|port|truck|cream|office|station|well|light|shine|light)$/),
      
      // geographic compounds
      word1.match(/^(new|san|los|las)$/) && word2.match(/^(york|francisco|angeles|vegas)$/),
      
      // technology compounds  
      word1.match(/^(smart|mobile|cell)$/) && word2.match(/^(phone|device)$/),
      
      // food compounds
      word1.match(/^(ice|hot|french|apple|chicken|beef)$/) && 
      word2.match(/^(cream|dog|fries|pie|soup|stew)$/)
    ];
    
    if (compoundIndicators.some(Boolean)) {
      return {
        score: 10,
        type: 'multiword_entry_found',
        method: 'compound_structure',
        phrase: words.join(' ')
      };
    }
    
    return { score: 0, type: 'not_compound' };
  }

  /**
   * Add a new multi-word entry to the database
   */
  addMultiWordEntry(phrase) {
    const normalized = phrase.toLowerCase().trim();
    this.multiWordEntries.add(normalized);
    return true;
  }

  /**
   * Get processing statistics
   */
  async getStats() {
    return {
      service: 'wordnet_processor',
      multi_word_entries_count: this.multiWordEntries.size,
      compound_patterns_count: this.compoundPatterns.length,
      processed_count: this.processedCount,
      description: 'Multi-word entry detection using curated lists and pattern matching',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Health check
   */
  async checkHealth() {
    return {
      status: 'healthy',
      multi_word_entries_loaded: this.multiWordEntries.size > 0,
      patterns_loaded: this.compoundPatterns.length > 0,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = WordNetProcessor;