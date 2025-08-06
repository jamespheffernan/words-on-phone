/**
 * CulturalValidationScorer - Cultural validation and category boost scoring (0-20 points)
 * Implements cultural popularity detection to differentiate popular vs obscure phrases
 * 
 * Components:
 * - Category-specific scoring (+10 points): Pop-culture, food, sports category detection
 * - Reddit validation system (+10 points): Simulated popularity scoring based on upvote patterns
 * - Language-count bonus: Wikidata multilingual presence scoring
 */
class CulturalValidationScorer {
  constructor(options = {}) {
    this.processedCount = 0;
    
    // Scoring bands according to cultural validation algorithm specification
    this.SCORING = {
      CATEGORY_BOOST_MAX: 10,       // Maximum points for category boost
      REDDIT_VALIDATION_MAX: 10,    // Maximum points for Reddit validation
      TOTAL_MAX: 20                 // Maximum total cultural validation score
    };
    
    // Pop-culture categories and their associated phrases/patterns
    this.CATEGORY_PATTERNS = {
      // Pop-culture category (+10 points)
      pop_culture: {
        // Celebrity names and entertainment figures
        celebrities: new Set([
          'taylor swift', 'harry styles', 'billie eilish', 'drake', 'beyonce', 'kanye west',
          'kim kardashian', 'brad pitt', 'leonardo dicaprio', 'jennifer lawrence', 'tom cruise',
          'robert downey', 'scarlett johansson', 'chris evans', 'ryan reynolds', 'dwayne johnson',
          'will smith', 'johnny depp', 'angelina jolie', 'meryl streep', 'denzel washington'
        ]),
        // TV shows and movies
        entertainment: new Set([
          'star wars', 'marvel', 'game of thrones', 'breaking bad', 'friends', 'the office',
          'stranger things', 'netflix', 'disney', 'pixar', 'batman', 'spider man', 'harry potter',
          'lord of rings', 'avengers', 'star trek', 'the simpsons', 'south park', 'family guy',
          'saturday night live', 'late night', 'talk show', 'reality tv', 'american idol'
        ]),
        // Music and artists
        music: new Set([
          'spotify', 'apple music', 'youtube music', 'soundcloud', 'bandcamp', 'vinyl record',
          'concert', 'music festival', 'coachella', 'lollapalooza', 'grammy awards', 'billboard',
          'rock band', 'pop music', 'hip hop', 'country music', 'jazz music', 'electronic music'
        ]),
        // Social media and internet culture
        social_media: new Set([
          'instagram', 'tiktok', 'twitter', 'facebook', 'snapchat', 'youtube', 'twitch',
          'reddit', 'linkedin', 'pinterest', 'viral video', 'meme', 'hashtag', 'influencer',
          'social media', 'live stream', 'podcast', 'youtube channel', 'instagram story'
        ])
      },
      
      // Food category (+10 points)
      food: {
        // Popular food items and dishes
        dishes: new Set([
          'pizza', 'hamburger', 'sushi', 'tacos', 'pasta', 'ramen', 'burrito', 'sandwich',
          'hot dog', 'fried chicken', 'ice cream', 'chocolate', 'cookies', 'cake', 'pie',
          'french fries', 'onion rings', 'chicken nuggets', 'mac and cheese', 'grilled cheese'
        ]),
        // Restaurants and food chains
        restaurants: new Set([
          'mcdonalds', 'burger king', 'kfc', 'taco bell', 'subway', 'pizza hut', 'dominos',
          'starbucks', 'dunkin donuts', 'chipotle', 'panera bread', 'olive garden', 'applebees',
          'chilis', 'outback steakhouse', 'red lobster', 'texas roadhouse', 'ihop', 'dennys'
        ]),
        // Food culture and trends
        food_culture: new Set([
          'food truck', 'fast food', 'fine dining', 'food delivery', 'takeout', 'drive thru',
          'food blog', 'cooking show', 'recipe', 'meal prep', 'food photo', 'foodie',
          'restaurant review', 'michelin star', 'chef', 'cooking', 'baking', 'grilling'
        ])
      },
      
      // Sports category (+10 points)
      sports: {
        // Major sports
        sports_types: new Set([
          'football', 'basketball', 'baseball', 'soccer', 'tennis', 'golf', 'hockey',
          'swimming', 'track and field', 'volleyball', 'wrestling', 'boxing', 'martial arts',
          'cycling', 'running', 'marathon', 'triathlon', 'skiing', 'snowboarding', 'surfing'
        ]),
        // Sports leagues and events
        leagues: new Set([
          'nfl', 'nba', 'mlb', 'nhl', 'mls', 'fifa', 'olympics', 'world cup', 'super bowl',
          'march madness', 'world series', 'stanley cup', 'masters tournament', 'wimbledon',
          'us open', 'champions league', 'premier league', 'espn', 'sports center'
        ]),
        // Sports culture and activities
        sports_culture: new Set([
          'sports bar', 'fantasy football', 'sports betting', 'tailgating', 'sports fan',
          'team jersey', 'sports memorabilia', 'coaching', 'sports training', 'fitness',
          'gym', 'workout', 'exercise', 'sports medicine', 'athletic performance'
        ])
      }
    };
    
    // Reddit popularity simulation patterns
    // In production, this would call Reddit API, but for testing we simulate
    this.REDDIT_PATTERNS = {
      // High popularity indicators (10 points)
      high_popularity: new Set([
        // Viral/trending topics
        'tiktok', 'viral', 'meme', 'trending', 'popular', 'famous', 'celebrity',
        // Major brands/products
        'apple', 'google', 'amazon', 'netflix', 'disney', 'starbucks', 'mcdonalds',
        // Common cultural references
        'pizza', 'coffee', 'dog', 'cat', 'music', 'movie', 'game', 'phone', 'car'
      ]),
      // Medium popularity indicators (7 points)
      medium_popularity: new Set([
        'restaurant', 'hotel', 'travel', 'shopping', 'fashion', 'technology', 'sports',
        'fitness', 'cooking', 'photography', 'art', 'book', 'education', 'health'
      ]),
      // Low popularity indicators (3 points)
      low_popularity: new Set([
        'business', 'finance', 'insurance', 'legal', 'medical', 'academic', 'research',
        'professional', 'technical', 'industrial', 'corporate', 'administrative'
      ])
    };
    
    // Wikidata language count bonus patterns
    // In production, this would query actual Wikidata language counts
    this.LANGUAGE_BONUS = {
      GLOBAL_CONCEPTS: 50,    // 50+ languages (global concepts)
      MAJOR_CONCEPTS: 20,     // 20-49 languages (major concepts)
      REGIONAL_CONCEPTS: 5,   // 5-19 languages (regional concepts)
      LOCAL_CONCEPTS: 1       // 1-4 languages (local concepts)
    };
  }

  /**
   * Detect and score category-specific boosts
   * Returns 0-10 points based on pop-culture/food/sports category detection
   */
  scoreCategoryBoost(phrase) {
    const startTime = Date.now();
    const normalizedPhrase = phrase.toLowerCase().trim();
    
    try {
      const categoryMatches = [];
      let maxPoints = 0;
      
      // Check each category for matches
      for (const [categoryName, categoryData] of Object.entries(this.CATEGORY_PATTERNS)) {
        for (const [subcategoryName, phrases] of Object.entries(categoryData)) {
          // Check for exact phrase matches
          if (phrases.has(normalizedPhrase)) {
            categoryMatches.push({
              category: categoryName,
              subcategory: subcategoryName,
              match_type: 'exact_phrase',
              matched_text: normalizedPhrase,
              points: 10
            });
            maxPoints = Math.max(maxPoints, 10);
            continue;
          }
          
          // Check for partial matches (phrase contains category term)
          for (const categoryPhrase of phrases) {
            if (normalizedPhrase.includes(categoryPhrase) || categoryPhrase.includes(normalizedPhrase)) {
              categoryMatches.push({
                category: categoryName,
                subcategory: subcategoryName,
                match_type: 'partial_match',
                matched_text: categoryPhrase,
                points: 8
              });
              maxPoints = Math.max(maxPoints, 8);
            }
          }
        }
      }
      
      // Remove duplicate matches and keep highest scoring
      const uniqueMatches = categoryMatches.filter((match, index, arr) => 
        arr.findIndex(other => other.matched_text === match.matched_text) === index
      );
      
      return {
        points: maxPoints,
        category_matches: uniqueMatches,
        primary_category: uniqueMatches.length > 0 ? uniqueMatches[0].category : null,
        match_count: uniqueMatches.length,
        duration_ms: Date.now() - startTime
      };
      
    } catch (error) {
      console.warn('⚠️ Category boost scoring failed:', error.message);
      return {
        points: 0,
        category_matches: [],
        error: error.message,
        duration_ms: Date.now() - startTime
      };
    }
  }

  /**
   * Simulate Reddit popularity validation
   * Returns 0-10 points based on simulated upvote patterns and popularity indicators
   */
  scoreRedditValidation(phrase) {
    const startTime = Date.now();
    const normalizedPhrase = phrase.toLowerCase().trim();
    
    try {
      const words = normalizedPhrase.split(/\s+/);
      let popularityScore = 0;
      const popularityIndicators = [];
      
      // Check for high popularity indicators
      for (const word of words) {
        if (this.REDDIT_PATTERNS.high_popularity.has(word)) {
          popularityScore = Math.max(popularityScore, 10);
          popularityIndicators.push({
            word,
            level: 'high',
            points: 10,
            reason: 'viral/trending topic or major brand'
          });
        } else if (this.REDDIT_PATTERNS.medium_popularity.has(word)) {
          popularityScore = Math.max(popularityScore, 7);
          popularityIndicators.push({
            word,
            level: 'medium', 
            points: 7,
            reason: 'common interest topic'
          });
        } else if (this.REDDIT_PATTERNS.low_popularity.has(word)) {
          popularityScore = Math.max(popularityScore, 3);
          popularityIndicators.push({
            word,
            level: 'low',
            points: 3,
            reason: 'specialized/professional topic'
          });
        }
      }
      
      // Simulate additional popularity factors
      const wordCount = words.length;
      let simulatedUpvotes = 0;
      let simulatedComments = 0;
      
      if (popularityScore >= 8) {
        // High popularity phrases get more engagement
        simulatedUpvotes = Math.floor(Math.random() * 5000) + 1000;
        simulatedComments = Math.floor(Math.random() * 500) + 100;
      } else if (popularityScore >= 5) {
        // Medium popularity phrases get moderate engagement
        simulatedUpvotes = Math.floor(Math.random() * 1000) + 100;
        simulatedComments = Math.floor(Math.random() * 100) + 20;
      } else {
        // Low popularity phrases get minimal engagement
        simulatedUpvotes = Math.floor(Math.random() * 100) + 10;
        simulatedComments = Math.floor(Math.random() * 20) + 2;
      }
      
      return {
        points: popularityScore,
        popularity_indicators: popularityIndicators,
        simulated_metrics: {
          upvotes: simulatedUpvotes,
          comments: simulatedComments,
          engagement_ratio: Math.round((simulatedComments / simulatedUpvotes) * 100) / 100
        },
        reddit_score_basis: popularityIndicators.length > 0 ? 'pattern_match' : 'baseline',
        duration_ms: Date.now() - startTime
      };
      
    } catch (error) {
      console.warn('⚠️ Reddit validation scoring failed:', error.message);
      return {
        points: 0,
        popularity_indicators: [],
        error: error.message,
        duration_ms: Date.now() - startTime
      };
    }
  }

  /**
   * Calculate language count bonus from simulated Wikidata presence
   * Returns bonus points based on multilingual concept presence
   */
  scoreLanguageBonus(phrase) {
    const startTime = Date.now();
    const normalizedPhrase = phrase.toLowerCase().trim();
    
    try {
      // Simulate Wikidata language count based on phrase characteristics
      // In production, this would query actual Wikidata for language sitelinks
      
      let estimatedLanguageCount = 1; // Default to 1 language
      let conceptType = 'local';
      let bonusPoints = 0;
      
      const words = normalizedPhrase.split(/\s+/);
      
      // Estimate language count based on phrase patterns
      for (const word of words) {
        if (this.REDDIT_PATTERNS.high_popularity.has(word)) {
          // Highly popular terms likely have global presence
          estimatedLanguageCount = Math.max(estimatedLanguageCount, 
            Math.floor(Math.random() * 30) + 50); // 50-80 languages
          conceptType = 'global';
        } else if (this.REDDIT_PATTERNS.medium_popularity.has(word)) {
          // Medium popularity terms have regional presence
          estimatedLanguageCount = Math.max(estimatedLanguageCount,
            Math.floor(Math.random() * 25) + 20); // 20-45 languages
          conceptType = 'major';
        } else if (this.REDDIT_PATTERNS.low_popularity.has(word)) {
          // Low popularity terms have limited presence
          estimatedLanguageCount = Math.max(estimatedLanguageCount,
            Math.floor(Math.random() * 10) + 5); // 5-15 languages
          conceptType = 'regional';
        }
      }
      
      // Calculate bonus points based on language count
      if (estimatedLanguageCount >= this.LANGUAGE_BONUS.GLOBAL_CONCEPTS) {
        bonusPoints = 5; // Global concept bonus
        conceptType = 'global';
      } else if (estimatedLanguageCount >= this.LANGUAGE_BONUS.MAJOR_CONCEPTS) {
        bonusPoints = 3; // Major concept bonus
        conceptType = 'major';
      } else if (estimatedLanguageCount >= this.LANGUAGE_BONUS.REGIONAL_CONCEPTS) {
        bonusPoints = 1; // Regional concept bonus
        conceptType = 'regional';
      } else {
        bonusPoints = 0; // Local concept (no bonus)
        conceptType = 'local';
      }
      
      return {
        bonus_points: bonusPoints,
        estimated_language_count: estimatedLanguageCount,
        concept_type: conceptType,
        global_presence: estimatedLanguageCount >= this.LANGUAGE_BONUS.GLOBAL_CONCEPTS,
        duration_ms: Date.now() - startTime
      };
      
    } catch (error) {
      console.warn('⚠️ Language bonus scoring failed:', error.message);
      return {
        bonus_points: 0,
        estimated_language_count: 1,
        concept_type: 'local',
        error: error.message,
        duration_ms: Date.now() - startTime
      };
    }
  }

  /**
   * Score overall cultural validation combining all components
   * Returns total cultural validation score (0-20 points)
   */
  async scoreCulturalValidation(phrase) {
    const startTime = Date.now();
    const normalizedPhrase = phrase.toLowerCase().trim();
    
    console.log(`🔍 Scoring cultural validation for: "${phrase}"`);
    
    const result = {
      phrase: normalizedPhrase,
      total_score: 0,
      components: {
        category_boost: null,
        reddit_validation: null,
        language_bonus: null
      },
      breakdown: {
        category_boost_points: 0,
        reddit_validation_points: 0,
        language_bonus_points: 0
      },
      cultural_classification: 'unknown',
      duration_ms: 0,
      timestamp: new Date().toISOString()
    };
    
    try {
      // 1. Score category boost (0-10 points)
      const categoryResult = this.scoreCategoryBoost(normalizedPhrase);
      result.components.category_boost = categoryResult;
      result.breakdown.category_boost_points = categoryResult.points;
      
      console.log(`   📂 Category boost: ${categoryResult.points}/10 points (${categoryResult.primary_category || 'none'})`);
      
      // 2. Score Reddit validation (0-10 points)
      const redditResult = this.scoreRedditValidation(normalizedPhrase);
      result.components.reddit_validation = redditResult;
      result.breakdown.reddit_validation_points = redditResult.points;
      
      console.log(`   🔥 Reddit validation: ${redditResult.points}/10 points (${redditResult.popularity_indicators.length} indicators)`);
      
      // 3. Score language bonus (bonus points)
      const languageResult = this.scoreLanguageBonus(normalizedPhrase);
      result.components.language_bonus = languageResult;
      result.breakdown.language_bonus_points = languageResult.bonus_points;
      
      console.log(`   🌍 Language bonus: +${languageResult.bonus_points} points (${languageResult.concept_type})`);
      
      // 4. Calculate total score (capped at maximum)
      const baseScore = result.breakdown.category_boost_points + result.breakdown.reddit_validation_points;
      result.total_score = Math.min(
        this.SCORING.TOTAL_MAX + 5, // Allow up to 5 bonus points from language
        baseScore + result.breakdown.language_bonus_points
      );
      
      // 5. Classify cultural significance
      if (result.total_score >= 15) {
        result.cultural_classification = 'highly_popular';
      } else if (result.total_score >= 10) {
        result.cultural_classification = 'moderately_popular';
      } else if (result.total_score >= 5) {
        result.cultural_classification = 'somewhat_popular';
      } else {
        result.cultural_classification = 'obscure';
      }
      
      result.duration_ms = Date.now() - startTime;
      
      console.log(`   🎯 Total cultural score: ${result.total_score}/20+ points (${result.cultural_classification})`);
      
      this.processedCount++;
      return result;
      
    } catch (error) {
      console.error(`❌ Error scoring cultural validation for "${phrase}":`, error.message);
      
      result.total_score = 0;
      result.cultural_classification = 'error';
      result.error = error.message;
      result.duration_ms = Date.now() - startTime;
      
      return result;
    }
  }

  /**
   * Batch score multiple phrases for cultural validation
   */
  async batchScoreCulturalValidation(phrases) {
    const startTime = Date.now();
    
    console.log(`🔍 Batch scoring ${phrases.length} phrases for cultural validation...`);
    
    const results = [];
    let totalScore = 0;
    let avgDuration = 0;
    
    for (const phrase of phrases) {
      if (typeof phrase === 'string' && phrase.length >= 2 && phrase.length <= 100) {
        const result = await this.scoreCulturalValidation(phrase);
        results.push(result);
        totalScore += result.total_score;
        avgDuration += result.duration_ms;
      } else {
        results.push({
          phrase,
          total_score: 0,
          cultural_classification: 'invalid',
          error: 'Invalid phrase format',
          duration_ms: 0
        });
      }
    }
    
    const totalDuration = Date.now() - startTime;
    avgDuration = avgDuration / results.length;
    
    // Calculate distribution statistics
    const distribution = {
      highly_popular: results.filter(r => r.cultural_classification === 'highly_popular').length,
      moderately_popular: results.filter(r => r.cultural_classification === 'moderately_popular').length,
      somewhat_popular: results.filter(r => r.cultural_classification === 'somewhat_popular').length,
      obscure: results.filter(r => r.cultural_classification === 'obscure').length,
      invalid: results.filter(r => r.cultural_classification === 'invalid' || r.cultural_classification === 'error').length
    };
    
    console.log(`✅ Batch scoring complete:`);
    console.log(`   📊 Distribution: ${distribution.highly_popular} highly popular, ${distribution.moderately_popular} moderate, ${distribution.somewhat_popular} somewhat, ${distribution.obscure} obscure`);
    console.log(`   ⏱️ Average duration: ${avgDuration.toFixed(1)}ms per phrase`);
    
    return {
      results,
      summary: {
        total_phrases: phrases.length,
        avg_score: Math.round((totalScore / phrases.length) * 100) / 100,
        avg_duration_ms: Math.round(avgDuration),
        total_duration_ms: totalDuration,
        distribution,
        popular_rate: Math.round(((distribution.highly_popular + distribution.moderately_popular) / phrases.length) * 100),
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Get scoring statistics
   */
  async getStats() {
    try {
      // Calculate category pattern counts
      const categoryStats = {};
      let totalCategoryPhrases = 0;
      
      for (const [categoryName, categoryData] of Object.entries(this.CATEGORY_PATTERNS)) {
        let categoryCount = 0;
        for (const [subcategoryName, phrases] of Object.entries(categoryData)) {
          categoryCount += phrases.size;
        }
        categoryStats[categoryName] = {
          subcategories: Object.keys(categoryData).length,
          total_phrases: categoryCount
        };
        totalCategoryPhrases += categoryCount;
      }
      
      return {
        service: 'cultural_validation_scorer',
        components: {
          category_boost: {
            available: true,
            max_points: this.SCORING.CATEGORY_BOOST_MAX,
            categories: Object.keys(this.CATEGORY_PATTERNS).length,
            category_details: categoryStats,
            total_phrases: totalCategoryPhrases
          },
          reddit_validation: {
            available: true,
            max_points: this.SCORING.REDDIT_VALIDATION_MAX,
            popularity_levels: Object.keys(this.REDDIT_PATTERNS).length,
            pattern_counts: Object.fromEntries(
              Object.entries(this.REDDIT_PATTERNS).map(([level, patterns]) => [level, patterns.size])
            )
          },
          language_bonus: {
            available: true,
            bonus_tiers: Object.keys(this.LANGUAGE_BONUS).length,
            bonus_thresholds: this.LANGUAGE_BONUS
          }
        },
        scoring_bands: this.SCORING,
        processed_count: this.processedCount,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error getting stats:', error);
      return { 
        service: 'cultural_validation_scorer',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Close connections (no-op for cultural scorer, but maintains interface)
   */
  async close() {
    console.log('🔌 Closing CulturalValidationScorer...');
    console.log('✅ CulturalValidationScorer closed');
  }
}

module.exports = CulturalValidationScorer; 