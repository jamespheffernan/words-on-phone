const CulturalValidationScorer = require('../../services/scoring/cultural-validation-scorer');

describe('CulturalValidationScorer', () => {
  let scorer;
  
  beforeEach(() => {
    scorer = new CulturalValidationScorer();
  });
  
  afterEach(async () => {
    if (scorer) {
      await scorer.close();
    }
  });

  describe('Constructor and Initialization', () => {
    test('should initialize with correct scoring bands', () => {
      expect(scorer.SCORING.CATEGORY_BOOST_MAX).toBe(10);
      expect(scorer.SCORING.REDDIT_VALIDATION_MAX).toBe(10);
      expect(scorer.SCORING.TOTAL_MAX).toBe(20);
    });

    test('should initialize category patterns', () => {
      expect(scorer.CATEGORY_PATTERNS).toHaveProperty('pop_culture');
      expect(scorer.CATEGORY_PATTERNS).toHaveProperty('food');
      expect(scorer.CATEGORY_PATTERNS).toHaveProperty('sports');
      
      // Check structure of category patterns
      expect(scorer.CATEGORY_PATTERNS.pop_culture).toHaveProperty('celebrities');
      expect(scorer.CATEGORY_PATTERNS.food).toHaveProperty('dishes');
      expect(scorer.CATEGORY_PATTERNS.sports).toHaveProperty('sports_types');
      
      // Check data is loaded
      expect(scorer.CATEGORY_PATTERNS.pop_culture.celebrities.size).toBeGreaterThan(10);
      expect(scorer.CATEGORY_PATTERNS.food.dishes.size).toBeGreaterThan(10);
      expect(scorer.CATEGORY_PATTERNS.sports.sports_types.size).toBeGreaterThan(10);
    });

    test('should initialize Reddit patterns', () => {
      expect(scorer.REDDIT_PATTERNS).toHaveProperty('high_popularity');
      expect(scorer.REDDIT_PATTERNS).toHaveProperty('medium_popularity');
      expect(scorer.REDDIT_PATTERNS).toHaveProperty('low_popularity');
      
      // Check data is loaded
      expect(scorer.REDDIT_PATTERNS.high_popularity.size).toBeGreaterThan(5);
      expect(scorer.REDDIT_PATTERNS.medium_popularity.size).toBeGreaterThan(5);
      expect(scorer.REDDIT_PATTERNS.low_popularity.size).toBeGreaterThan(5);
    });

    test('should initialize language bonus thresholds', () => {
      expect(scorer.LANGUAGE_BONUS).toHaveProperty('GLOBAL_CONCEPTS');
      expect(scorer.LANGUAGE_BONUS).toHaveProperty('MAJOR_CONCEPTS');
      expect(scorer.LANGUAGE_BONUS).toHaveProperty('REGIONAL_CONCEPTS');
      expect(scorer.LANGUAGE_BONUS).toHaveProperty('LOCAL_CONCEPTS');
      
      expect(scorer.LANGUAGE_BONUS.GLOBAL_CONCEPTS).toBe(50);
      expect(scorer.LANGUAGE_BONUS.MAJOR_CONCEPTS).toBe(20);
    });

    test('should track processed count', () => {
      expect(scorer.processedCount).toBe(0);
    });
  });

  describe('Category Boost Scoring', () => {
    test('should detect exact pop-culture celebrity matches', () => {
      const result = scorer.scoreCategoryBoost('taylor swift');
      expect(result.points).toBe(10);
      expect(result.primary_category).toBe('pop_culture');
      expect(result.category_matches).toHaveLength(1);
      expect(result.category_matches[0].match_type).toBe('exact_phrase');
    });

    test('should detect exact food matches', () => {
      const result = scorer.scoreCategoryBoost('pizza');
      expect(result.points).toBe(10);
      expect(result.primary_category).toBe('food');
      expect(result.category_matches[0].match_type).toBe('exact_phrase');
    });

    test('should detect exact sports matches', () => {
      const result = scorer.scoreCategoryBoost('basketball');
      expect(result.points).toBe(10);
      expect(result.primary_category).toBe('sports');
      expect(result.category_matches[0].match_type).toBe('exact_phrase');
    });

    test('should detect partial matches with lower scores', () => {
      const result = scorer.scoreCategoryBoost('restaurant');
      expect(result.points).toBeGreaterThan(0);
      expect(result.points).toBeLessThanOrEqual(10);
      expect(result.primary_category).toBe('food');
    });

    test('should return zero for non-matching phrases', () => {
      const result = scorer.scoreCategoryBoost('quantum computing');
      expect(result.points).toBe(0);
      expect(result.primary_category).toBeNull();
      expect(result.category_matches).toHaveLength(0);
    });

    test('should handle case insensitive matching', () => {
      const result = scorer.scoreCategoryBoost('PIZZA');
      expect(result.points).toBe(10);
      expect(result.primary_category).toBe('food');
    });

    test('should track duration', () => {
      const result = scorer.scoreCategoryBoost('test phrase');
      expect(result.duration_ms).toBeGreaterThan(0);
      expect(result.duration_ms).toBeLessThan(50);
    });
  });

  describe('Reddit Validation Scoring', () => {
    test('should score high popularity indicators highly', () => {
      const result = scorer.scoreRedditValidation('pizza'); // High popularity word
      expect(result.points).toBe(10);
      expect(result.popularity_indicators).toHaveLength(1);
      expect(result.popularity_indicators[0].level).toBe('high');
    });

    test('should score medium popularity indicators moderately', () => {
      const result = scorer.scoreRedditValidation('restaurant'); // Medium popularity word
      expect(result.points).toBe(7);
      expect(result.popularity_indicators).toHaveLength(1);
      expect(result.popularity_indicators[0].level).toBe('medium');
    });

    test('should score low popularity indicators lowly', () => {
      const result = scorer.scoreRedditValidation('business'); // Low popularity word
      expect(result.points).toBe(3);
      expect(result.popularity_indicators).toHaveLength(1);
      expect(result.popularity_indicators[0].level).toBe('low');
    });

    test('should return zero for unrecognized phrases', () => {
      const result = scorer.scoreRedditValidation('quantum computing');
      expect(result.points).toBe(0);
      expect(result.popularity_indicators).toHaveLength(0);
    });

    test('should simulate engagement metrics', () => {
      const result = scorer.scoreRedditValidation('netflix');
      expect(result.simulated_metrics).toHaveProperty('upvotes');
      expect(result.simulated_metrics).toHaveProperty('comments');
      expect(result.simulated_metrics).toHaveProperty('engagement_ratio');
      expect(result.simulated_metrics.upvotes).toBeGreaterThan(0);
      expect(result.simulated_metrics.comments).toBeGreaterThan(0);
    });

    test('should handle multi-word phrases correctly', () => {
      const result = scorer.scoreRedditValidation('apple music');
      expect(result.points).toBe(10); // Should get high score from 'apple'
      expect(result.popularity_indicators.length).toBeGreaterThan(0);
    });

    test('should track duration', () => {
      const result = scorer.scoreRedditValidation('test phrase');
      expect(result.duration_ms).toBeGreaterThan(0);
      expect(result.duration_ms).toBeLessThan(50);
    });
  });

  describe('Language Bonus Scoring', () => {
    test('should assign global concept bonus for high popularity terms', () => {
      const result = scorer.scoreLanguageBonus('apple');
      expect(result.bonus_points).toBeGreaterThanOrEqual(3);
      expect(result.concept_type).toMatch(/global|major/);
      expect(result.estimated_language_count).toBeGreaterThan(20);
    });

    test('should assign lower bonus for medium popularity terms', () => {
      const result = scorer.scoreLanguageBonus('restaurant');
      expect(result.bonus_points).toBeGreaterThanOrEqual(1);
      expect(result.concept_type).toMatch(/major|regional/);
    });

    test('should assign no bonus for unknown terms', () => {
      const result = scorer.scoreLanguageBonus('unknown phrase');
      expect(result.bonus_points).toBe(0);
      expect(result.concept_type).toBe('local');
      expect(result.estimated_language_count).toBe(1);
    });

    test('should calculate global presence correctly', () => {
      const result = scorer.scoreLanguageBonus('google');
      expect(result.global_presence).toBe(result.estimated_language_count >= 50);
    });

    test('should track duration', () => {
      const result = scorer.scoreLanguageBonus('test phrase');
      expect(result.duration_ms).toBeGreaterThan(0);
      expect(result.duration_ms).toBeLessThan(50);
    });
  });

  describe('Overall Cultural Validation Scoring', () => {
    test('should combine all components correctly for highly popular phrases', async () => {
      const result = await scorer.scoreCulturalValidation('pizza');
      
      expect(result).toHaveProperty('phrase', 'pizza');
      expect(result).toHaveProperty('total_score');
      expect(result).toHaveProperty('components');
      expect(result).toHaveProperty('breakdown');
      expect(result).toHaveProperty('cultural_classification');
      expect(result).toHaveProperty('duration_ms');
      
      // Should have high category boost and Reddit validation
      expect(result.breakdown.category_boost_points).toBe(10);
      expect(result.breakdown.reddit_validation_points).toBe(10);
      expect(result.breakdown.language_bonus_points).toBeGreaterThan(0);
      
      // Total should be sum of components
      const expectedTotal = result.breakdown.category_boost_points + 
                           result.breakdown.reddit_validation_points + 
                           result.breakdown.language_bonus_points;
      expect(result.total_score).toBe(expectedTotal);
      
      // Should be classified as highly popular
      expect(result.cultural_classification).toBe('highly_popular');
    });

    test('should classify moderately popular phrases correctly', async () => {
      const result = await scorer.scoreCulturalValidation('super bowl');
      expect(result.total_score).toBeGreaterThan(5);
      expect(result.total_score).toBeLessThan(15);
      expect(result.cultural_classification).toBe('moderately_popular');
    });

    test('should classify obscure phrases correctly', async () => {
      const result = await scorer.scoreCulturalValidation('quantum computing');
      expect(result.total_score).toBeLessThan(5);
      expect(result.cultural_classification).toBe('obscure');
    });

    test('should respect maximum score limits', async () => {
      const result = await scorer.scoreCulturalValidation('netflix');
      expect(result.total_score).toBeLessThanOrEqual(25); // 20 base + 5 bonus max
    });

    test('should increment processed count', async () => {
      const initialCount = scorer.processedCount;
      await scorer.scoreCulturalValidation('test phrase');
      expect(scorer.processedCount).toBe(initialCount + 1);
    });

    test('should track duration', async () => {
      const result = await scorer.scoreCulturalValidation('test phrase');
      expect(result.duration_ms).toBeGreaterThan(0);
      expect(result.duration_ms).toBeLessThan(100);
    });
  });

  describe('Batch Processing', () => {
    test('should process multiple phrases', async () => {
      const phrases = ['pizza', 'taylor swift', 'quantum computing'];
      const result = await scorer.batchScoreCulturalValidation(phrases);
      
      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('summary');
      expect(result.results).toHaveLength(3);
      
      result.results.forEach(r => {
        expect(r).toHaveProperty('phrase');
        expect(r).toHaveProperty('total_score');
        expect(r).toHaveProperty('cultural_classification');
        expect(r.total_score).toBeGreaterThanOrEqual(0);
        expect(r.total_score).toBeLessThanOrEqual(25);
      });
      
      expect(result.summary).toHaveProperty('total_phrases', 3);
      expect(result.summary).toHaveProperty('avg_score');
      expect(result.summary).toHaveProperty('distribution');
      expect(result.summary).toHaveProperty('popular_rate');
    });

    test('should handle invalid phrases in batch', async () => {
      const phrases = ['valid phrase', '', null, 123];
      const result = await scorer.batchScoreCulturalValidation(phrases);
      
      expect(result.results).toHaveLength(4);
      expect(result.results[0].total_score).toBeGreaterThanOrEqual(0); // valid phrase
      expect(result.results[1].error).toBeDefined(); // empty string
      expect(result.results[2].error).toBeDefined(); // null
      expect(result.results[3].error).toBeDefined(); // number
    });

    test('should calculate distribution correctly', async () => {
      const phrases = ['netflix', 'super bowl', 'quantum computing'];
      const result = await scorer.batchScoreCulturalValidation(phrases);
      
      const dist = result.summary.distribution;
      expect(dist).toHaveProperty('highly_popular');
      expect(dist).toHaveProperty('moderately_popular');
      expect(dist).toHaveProperty('somewhat_popular');
      expect(dist).toHaveProperty('obscure');
      expect(dist).toHaveProperty('invalid');
      
      const total = dist.highly_popular + dist.moderately_popular + 
                   dist.somewhat_popular + dist.obscure + dist.invalid;
      expect(total).toBe(3);
    });

    test('should calculate popular rate correctly', async () => {
      const phrases = ['netflix', 'pizza']; // Both should be highly popular
      const result = await scorer.batchScoreCulturalValidation(phrases);
      
      expect(result.summary.popular_rate).toBe(100); // 2/2 * 100 = 100%
    });
  });

  describe('Performance Requirements', () => {
    test('should complete scoring under 100ms for simple phrases', async () => {
      const startTime = Date.now();
      const result = await scorer.scoreCulturalValidation('test phrase');
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(100);
      expect(result.duration_ms).toBeLessThan(100);
    });

    test('should handle batch processing efficiently', async () => {
      const phrases = Array(10).fill('test phrase');
      const startTime = Date.now();
      const result = await scorer.batchScoreCulturalValidation(phrases);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // 100ms * 10 phrases
      expect(result.summary.avg_duration_ms).toBeLessThan(100);
    });
  });

  describe('Cultural Differentiation (Core Success Criteria)', () => {
    test('should successfully differentiate popular vs obscure phrases', async () => {
      const popularPhrases = ['taylor swift', 'pizza', 'netflix', 'basketball'];
      const obscurePhrases = ['quantum computing', 'pharmaceutical research', 'administrative procedure'];
      
      const popularResults = await scorer.batchScoreCulturalValidation(popularPhrases);
      const obscureResults = await scorer.batchScoreCulturalValidation(obscurePhrases);
      
      // Popular phrases should have higher average scores
      expect(popularResults.summary.avg_score).toBeGreaterThan(obscureResults.summary.avg_score);
      
      // Popular phrases should have higher popular rate
      expect(popularResults.summary.popular_rate).toBeGreaterThan(obscureResults.summary.popular_rate);
      
      // Should have clear classification differences
      const popularClassifications = popularResults.results.map(r => r.cultural_classification);
      const obscureClassifications = obscureResults.results.map(r => r.cultural_classification);
      
      expect(popularClassifications.filter(c => ['highly_popular', 'moderately_popular'].includes(c)).length)
        .toBeGreaterThan(obscureClassifications.filter(c => ['highly_popular', 'moderately_popular'].includes(c)).length);
    });

    test('should detect category-specific boosts correctly', async () => {
      const categoryPhrases = [
        { phrase: 'taylor swift', expectedCategory: 'pop_culture' },
        { phrase: 'pizza', expectedCategory: 'food' },
        { phrase: 'basketball', expectedCategory: 'sports' }
      ];
      
      for (const testCase of categoryPhrases) {
        const result = await scorer.scoreCulturalValidation(testCase.phrase);
        expect(result.breakdown.category_boost_points).toBe(10);
        expect(result.components.category_boost.primary_category).toBe(testCase.expectedCategory);
      }
    });

    test('should demonstrate Reddit validation differentiation', async () => {
      const highRedditPhrases = ['pizza', 'netflix', 'apple'];
      const lowRedditPhrases = ['quantum computing', 'test phrase'];
      
      for (const phrase of highRedditPhrases) {
        const result = await scorer.scoreCulturalValidation(phrase);
        expect(result.breakdown.reddit_validation_points).toBeGreaterThan(5);
      }
      
      for (const phrase of lowRedditPhrases) {
        const result = await scorer.scoreCulturalValidation(phrase);
        expect(result.breakdown.reddit_validation_points).toBeLessThanOrEqual(3);
      }
    });
  });

  describe('Statistics and Monitoring', () => {
    test('should provide comprehensive stats', async () => {
      const stats = await scorer.getStats();
      
      expect(stats).toHaveProperty('service', 'cultural_validation_scorer');
      expect(stats).toHaveProperty('components');
      expect(stats).toHaveProperty('scoring_bands');
      expect(stats).toHaveProperty('processed_count');
      
      expect(stats.components).toHaveProperty('category_boost');
      expect(stats.components).toHaveProperty('reddit_validation');
      expect(stats.components).toHaveProperty('language_bonus');
      
      expect(stats.components.category_boost.available).toBe(true);
      expect(stats.components.reddit_validation.available).toBe(true);
      expect(stats.components.language_bonus.available).toBe(true);
      
      expect(stats.components.category_boost.categories).toBe(3);
      expect(stats.components.category_boost.total_phrases).toBeGreaterThan(100);
    });

    test('should track processing statistics', async () => {
      const initialStats = await scorer.getStats();
      const initialCount = initialStats.processed_count;
      
      await scorer.scoreCulturalValidation('test phrase');
      
      const finalStats = await scorer.getStats();
      expect(finalStats.processed_count).toBe(initialCount + 1);
    });
  });

  describe('Error Handling', () => {
    test('should handle empty phrases gracefully', async () => {
      const result = await scorer.scoreCulturalValidation('');
      expect(result.total_score).toBe(0);
      expect(result.cultural_classification).toBe('error');
    });

    test('should handle special characters', async () => {
      const result = await scorer.scoreCulturalValidation('test@#$%');
      expect(result.total_score).toBeGreaterThanOrEqual(0);
      expect(result.cultural_classification).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    test('should score realistic cultural validation scenarios', async () => {
      const testCases = [
        {
          phrase: 'taylor swift',
          expectedMin: 8, // Pop-culture category + some bonus
          description: 'Celebrity with pop-culture category'
        },
        {
          phrase: 'pizza delivery',
          expectedMin: 15, // Food category + high Reddit + some bonus
          description: 'Popular food concept with cultural relevance'
        },
        {
          phrase: 'quantum computing',
          expectedMax: 5, // Technical term, low cultural relevance
          description: 'Technical/academic concept'
        }
      ];
      
      for (const testCase of testCases) {
        const result = await scorer.scoreCulturalValidation(testCase.phrase);
        
        if (testCase.expectedMin) {
          expect(result.total_score).toBeGreaterThanOrEqual(testCase.expectedMin);
        }
        if (testCase.expectedMax) {
          expect(result.total_score).toBeLessThanOrEqual(testCase.expectedMax);
        }
      }
    });
  });

  describe('Cleanup', () => {
    test('should close connections properly', async () => {
      // Cultural scorer has no external connections, but should complete without error
      await expect(scorer.close()).resolves.toBeUndefined();
    });
  });
}); 