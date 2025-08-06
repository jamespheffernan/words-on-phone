/**
 * LegacyHeuristicsScorer - Legacy scoring components from original PhraseMachine (0-30 points)
 * Implements backward-compatible word simplicity and length bonus calculations
 * 
 * Components:
 * - Word Simplicity (0-25 points): Based on word frequency and complexity
 * - Length Bonus (0-5 points): Optimal phrase length scoring
 */
class LegacyHeuristicsScorer {
  constructor(options = {}) {
    this.processedCount = 0;
    
    // Scoring bands according to legacy algorithm specification
    this.SCORING = {
      WORD_SIMPLICITY_MAX: 25,    // Maximum points for word simplicity
      LENGTH_BONUS_MAX: 5,        // Maximum points for length bonus
      TOTAL_MAX: 30               // Maximum total legacy score
    };
    
    // Common word frequency lists (simplified version of original system) 
    // Higher frequency = more points (easier to describe/recognize)
    this.WORD_FREQUENCY_TIERS = {
      // Tier 1: Most common words (5 points each)
      tier1: new Set([
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
        'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
        'will', 'would', 'could', 'should', 'can', 'may', 'might', 'must',
        'this', 'that', 'these', 'those', 'here', 'there', 'where', 'when', 'why', 'how',
        'what', 'who', 'which', 'all', 'any', 'some', 'many', 'much', 'more', 'most',
        'one', 'two', 'three', 'first', 'last', 'next', 'new', 'old', 'good', 'bad',
        'big', 'small', 'long', 'short', 'high', 'low', 'hot', 'cold', 'fast', 'slow'
      ]),
      
      // Tier 2: Common words (4 points each)
      tier2: new Set([
        'time', 'year', 'day', 'week', 'month', 'hour', 'minute', 'second',
        'home', 'house', 'room', 'door', 'window', 'wall', 'floor', 'table', 'chair',
        'car', 'bus', 'train', 'plane', 'bike', 'road', 'street', 'city', 'town',
        'food', 'water', 'coffee', 'tea', 'bread', 'meat', 'fish', 'milk', 'egg',
        'person', 'man', 'woman', 'child', 'baby', 'family', 'friend', 'dog', 'cat',
        'work', 'job', 'money', 'buy', 'sell', 'pay', 'cost', 'price', 'store', 'shop',
        'book', 'read', 'write', 'learn', 'teach', 'school', 'student', 'teacher',
        'love', 'like', 'want', 'need', 'think', 'know', 'feel', 'see', 'hear', 'say'
      ]),
      
      // Tier 3: Moderately common words (3 points each)
      tier3: new Set([
        'computer', 'phone', 'internet', 'website', 'email', 'music', 'movie', 'game',
        'restaurant', 'hotel', 'hospital', 'bank', 'office', 'building', 'park', 'beach',
        'pizza', 'burger', 'sandwich', 'salad', 'soup', 'cake', 'ice', 'cream', 'chocolate',
        'basketball', 'football', 'baseball', 'soccer', 'tennis', 'golf', 'swimming', 'running',
        'doctor', 'nurse', 'police', 'teacher', 'lawyer', 'engineer', 'manager', 'driver',
        'happy', 'sad', 'angry', 'tired', 'busy', 'free', 'easy', 'hard', 'simple', 'difficult',
        'beautiful', 'ugly', 'clean', 'dirty', 'safe', 'dangerous', 'healthy', 'sick'
      ]),
      
      // Tier 4: Less common but recognizable words (2 points each) 
      tier4: new Set([
        'delivery', 'service', 'customer', 'business', 'company', 'product', 'market',
        'technology', 'system', 'network', 'software', 'hardware', 'database', 'server',
        'analysis', 'research', 'development', 'project', 'process', 'method', 'solution',
        'community', 'society', 'culture', 'tradition', 'history', 'politics', 'government',
        'education', 'university', 'college', 'degree', 'certificate', 'training', 'skill',
        'entertainment', 'festival', 'concert', 'theater', 'museum', 'gallery', 'exhibition'
      ])
    };
    
    // Length scoring parameters
    this.LENGTH_SCORING = {
      OPTIMAL_MIN: 2,     // Minimum optimal word count
      OPTIMAL_MAX: 4,     // Maximum optimal word count  
      PENALTY_THRESHOLD: 5 // Words beyond this get penalized
    };
  }

  /**
   * Score word simplicity based on word frequency and complexity
   * Returns 0-25 points based on how common/simple the words are
   */
  scoreWordSimplicity(phrase) {
    const startTime = Date.now();
    const words = phrase.toLowerCase().trim().split(/\s+/);
    
    let totalScore = 0;
    const wordScores = {};
    
    try {
      for (const word of words) {
        // Clean word (remove punctuation)
        const cleanWord = word.replace(/[^\w]/g, '');
        if (!cleanWord) continue;
        
        let wordScore = 0;
        
        // Check frequency tiers (higher tier = more points)
        if (this.WORD_FREQUENCY_TIERS.tier1.has(cleanWord)) {
          wordScore = 5;
        } else if (this.WORD_FREQUENCY_TIERS.tier2.has(cleanWord)) {
          wordScore = 4;
        } else if (this.WORD_FREQUENCY_TIERS.tier3.has(cleanWord)) {
          wordScore = 3;
        } else if (this.WORD_FREQUENCY_TIERS.tier4.has(cleanWord)) {
          wordScore = 2;
        } else {
          // Unknown words get base score based on length/complexity
          if (cleanWord.length <= 4) {
            wordScore = 1; // Short unknown words
          } else if (cleanWord.length <= 7) {
            wordScore = 0.5; // Medium unknown words
          } else {
            wordScore = 0; // Long unknown words (complex)
          }
        }
        
        wordScores[cleanWord] = wordScore;
        totalScore += wordScore;
      }
      
      // Normalize to 0-25 scale
      const maxPossibleScore = words.length * 5; // If all words were tier1
      let normalizedScore = 0;
      
      if (maxPossibleScore > 0) {
        normalizedScore = Math.min(25, (totalScore / maxPossibleScore) * 25);
      }
      
      return {
        points: Math.round(normalizedScore * 100) / 100, // Round to 2 decimal places
        word_scores: wordScores,
        total_raw_score: totalScore,
        max_possible_score: maxPossibleScore,
        word_count: words.length,
        duration_ms: Date.now() - startTime
      };
      
    } catch (error) {
      console.warn('⚠️ Word simplicity scoring failed:', error.message);
      return {
        points: 0,
        word_scores: {},
        error: error.message,
        duration_ms: Date.now() - startTime
      };
    }
  }

  /**
   * Score length bonus based on optimal phrase length
   * Returns 0-5 points based on phrase length optimization
   */
  scoreLengthBonus(phrase) {
    const startTime = Date.now();
    const words = phrase.toLowerCase().trim().split(/\s+/);
    const wordCount = words.length;
    
    try {
      let points = 0;
      let reason = '';
      
      if (wordCount >= this.LENGTH_SCORING.OPTIMAL_MIN && 
          wordCount <= this.LENGTH_SCORING.OPTIMAL_MAX) {
        // Optimal length range (2-4 words)
        if (wordCount === 3) {
          points = 5; // Perfect length
          reason = 'optimal_3_words';
        } else if (wordCount === 2 || wordCount === 4) {
          points = 4; // Very good length
          reason = wordCount === 2 ? 'optimal_2_words' : 'optimal_4_words';
        }
      } else if (wordCount === 1) {
        // Single word phrases are suboptimal
        points = 1;
        reason = 'single_word_penalty';
      } else if (wordCount >= this.LENGTH_SCORING.PENALTY_THRESHOLD) {
        // Too long phrases get penalized
        const penalty = Math.min(3, wordCount - this.LENGTH_SCORING.PENALTY_THRESHOLD);
        points = Math.max(0, 2 - penalty);
        reason = 'length_penalty';
      } else {
        // Edge cases
        points = 2;
        reason = 'neutral_length';
      }
      
      return {
        points,
        reason,
        word_count: wordCount,
        optimal_range: `${this.LENGTH_SCORING.OPTIMAL_MIN}-${this.LENGTH_SCORING.OPTIMAL_MAX}`,
        duration_ms: Date.now() - startTime
      };
      
    } catch (error) {
      console.warn('⚠️ Length bonus scoring failed:', error.message);
      return {
        points: 0,
        reason: 'error',
        error: error.message,
        duration_ms: Date.now() - startTime
      };
    }
  }

  /**
   * Score overall legacy heuristics combining word simplicity and length bonus
   * Returns total legacy score (0-30 points)
   */
  async scoreLegacyHeuristics(phrase) {
    const startTime = Date.now();
    const normalizedPhrase = phrase.toLowerCase().trim();
    
    console.log(`🔍 Scoring legacy heuristics for: "${phrase}"`);
    
    const result = {
      phrase: normalizedPhrase,
      total_score: 0,
      components: {
        word_simplicity: null,
        length_bonus: null
      },
      breakdown: {
        word_simplicity_points: 0,
        length_bonus_points: 0
      },
      duration_ms: 0,
      timestamp: new Date().toISOString()
    };
    
    try {
      // 1. Score word simplicity (0-25 points)
      const simplicityResult = this.scoreWordSimplicity(normalizedPhrase);
      result.components.word_simplicity = simplicityResult;
      result.breakdown.word_simplicity_points = simplicityResult.points;
      
      console.log(`   📝 Word simplicity: ${simplicityResult.points}/25 points`);
      
      // 2. Score length bonus (0-5 points)
      const lengthResult = this.scoreLengthBonus(normalizedPhrase);
      result.components.length_bonus = lengthResult;
      result.breakdown.length_bonus_points = lengthResult.points;
      
      console.log(`   📏 Length bonus: ${lengthResult.points}/5 points (${lengthResult.reason})`);
      
      // 3. Calculate total score
      result.total_score = Math.min(
        this.SCORING.TOTAL_MAX,
        result.breakdown.word_simplicity_points + result.breakdown.length_bonus_points
      );
      
      result.duration_ms = Date.now() - startTime;
      
      console.log(`   🎯 Total legacy score: ${result.total_score}/30 points`);
      
      this.processedCount++;
      return result;
      
    } catch (error) {
      console.error(`❌ Error scoring legacy heuristics for "${phrase}":`, error.message);
      
      result.total_score = 0;
      result.error = error.message;
      result.duration_ms = Date.now() - startTime;
      
      return result;
    }
  }

  /**
   * Batch score multiple phrases for legacy heuristics
   */
  async batchScoreLegacyHeuristics(phrases) {
    const startTime = Date.now();
    
    console.log(`🔍 Batch scoring ${phrases.length} phrases for legacy heuristics...`);
    
    const results = [];
    let totalScore = 0;
    let avgDuration = 0;
    
    for (const phrase of phrases) {
      if (typeof phrase === 'string' && phrase.length >= 1 && phrase.length <= 100) {
        const result = await this.scoreLegacyHeuristics(phrase);
        results.push(result);
        totalScore += result.total_score;
        avgDuration += result.duration_ms;
      } else {
        results.push({
          phrase,
          total_score: 0,
          error: 'Invalid phrase format',
          duration_ms: 0
        });
      }
    }
    
    const totalDuration = Date.now() - startTime;
    avgDuration = avgDuration / results.length;
    
    // Calculate distribution statistics
    const distribution = {
      high_legacy: results.filter(r => r.total_score >= 20).length,
      medium_legacy: results.filter(r => r.total_score >= 10 && r.total_score < 20).length,
      low_legacy: results.filter(r => r.total_score >= 1 && r.total_score < 10).length,
      no_legacy: results.filter(r => r.total_score === 0).length
    };
    
    console.log(`✅ Batch scoring complete:`);
    console.log(`   📊 Distribution: ${distribution.high_legacy} high, ${distribution.medium_legacy} medium, ${distribution.low_legacy} low, ${distribution.no_legacy} none`);
    console.log(`   ⏱️ Average duration: ${avgDuration.toFixed(1)}ms per phrase`);
    
    return {
      results,
      summary: {
        total_phrases: phrases.length,
        avg_score: Math.round((totalScore / phrases.length) * 100) / 100,
        avg_duration_ms: Math.round(avgDuration),
        total_duration_ms: totalDuration,
        distribution,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Get scoring statistics
   */
  async getStats() {
    try {
      return {
        service: 'legacy_heuristics_scorer',
        components: {
          word_simplicity: {
            available: true,
            max_points: this.SCORING.WORD_SIMPLICITY_MAX,
            frequency_tiers: Object.keys(this.WORD_FREQUENCY_TIERS).length,
            total_words: Object.values(this.WORD_FREQUENCY_TIERS)
              .reduce((total, tier) => total + tier.size, 0)
          },
          length_bonus: {
            available: true,
            max_points: this.SCORING.LENGTH_BONUS_MAX,
            optimal_range: `${this.LENGTH_SCORING.OPTIMAL_MIN}-${this.LENGTH_SCORING.OPTIMAL_MAX}`,
            penalty_threshold: this.LENGTH_SCORING.PENALTY_THRESHOLD
          }
        },
        scoring_bands: this.SCORING,
        processed_count: this.processedCount,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error getting stats:', error);
      return { 
        service: 'legacy_heuristics_scorer',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Close connections (no-op for legacy scorer, but maintains interface)
   */
  async close() {
    console.log('🔌 Closing LegacyHeuristicsScorer...');
    console.log('✅ LegacyHeuristicsScorer closed');
  }
}

module.exports = LegacyHeuristicsScorer; 