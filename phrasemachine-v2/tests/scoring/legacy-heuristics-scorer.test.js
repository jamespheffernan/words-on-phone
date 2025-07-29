const LegacyHeuristicsScorer = require('../../services/scoring/legacy-heuristics-scorer');

describe('LegacyHeuristicsScorer', () => {
  let scorer;
  
  beforeEach(() => {
    scorer = new LegacyHeuristicsScorer();
  });
  
  afterEach(async () => {
    if (scorer) {
      await scorer.close();
    }
  });

  describe('Constructor and Initialization', () => {
    test('should initialize with correct scoring bands', () => {
      expect(scorer.SCORING.WORD_SIMPLICITY_MAX).toBe(25);
      expect(scorer.SCORING.LENGTH_BONUS_MAX).toBe(5);
      expect(scorer.SCORING.TOTAL_MAX).toBe(30);
    });

    test('should initialize word frequency tiers', () => {
      expect(scorer.WORD_FREQUENCY_TIERS).toHaveProperty('tier1');
      expect(scorer.WORD_FREQUENCY_TIERS).toHaveProperty('tier2');
      expect(scorer.WORD_FREQUENCY_TIERS).toHaveProperty('tier3');
      expect(scorer.WORD_FREQUENCY_TIERS).toHaveProperty('tier4');
      
      expect(scorer.WORD_FREQUENCY_TIERS.tier1).toBeInstanceOf(Set);
      expect(scorer.WORD_FREQUENCY_TIERS.tier1.size).toBeGreaterThan(50);
    });

    test('should initialize length scoring parameters', () => {
      expect(scorer.LENGTH_SCORING.OPTIMAL_MIN).toBe(2);
      expect(scorer.LENGTH_SCORING.OPTIMAL_MAX).toBe(4);
      expect(scorer.LENGTH_SCORING.PENALTY_THRESHOLD).toBe(5);
    });

    test('should track processed count', () => {
      expect(scorer.processedCount).toBe(0);
    });
  });

  describe('Word Simplicity Scoring', () => {
    test('should score common words highly', () => {
      const result = scorer.scoreWordSimplicity('the good');
      expect(result.points).toBeGreaterThan(15); // Both tier1 words
      expect(result.word_scores).toHaveProperty('the');
      expect(result.word_scores).toHaveProperty('good');
      expect(result.word_scores.the).toBe(5); // Tier 1
      expect(result.word_scores.good).toBe(5); // Tier 1
    });

    test('should score tier 2 words appropriately', () => {
      const result = scorer.scoreWordSimplicity('coffee shop');
      expect(result.points).toBeGreaterThan(10);
      expect(result.word_scores.coffee).toBe(4); // Tier 2
      expect(result.word_scores.shop).toBe(4); // Tier 2
    });

    test('should score tier 3 words appropriately', () => {
      const result = scorer.scoreWordSimplicity('computer game');
      expect(result.points).toBeGreaterThan(5);
      expect(result.word_scores.computer).toBe(3); // Tier 3
      expect(result.word_scores.game).toBe(3); // Tier 3
    });

    test('should score tier 4 words appropriately', () => {
      const result = scorer.scoreWordSimplicity('delivery service');
      expect(result.points).toBeGreaterThan(0);
      expect(result.word_scores.delivery).toBe(2); // Tier 4
      expect(result.word_scores.service).toBe(2); // Tier 4
    });

    test('should score unknown words based on length', () => {
      const result = scorer.scoreWordSimplicity('xyz qwerty extraordinarily');
      expect(result.word_scores.xyz).toBe(1); // Short unknown
      expect(result.word_scores.qwerty).toBe(0.5); // Medium unknown
      expect(result.word_scores.extraordinarily).toBe(0); // Long unknown
    });

    test('should normalize scores to 0-25 range', () => {
      const result = scorer.scoreWordSimplicity('the good big new');
      expect(result.points).toBe(25); // Perfect score
      expect(result.points).toBeLessThanOrEqual(25);
    });

    test('should handle punctuation correctly', () => {
      const result = scorer.scoreWordSimplicity('coffee, shop!');
      expect(result.word_scores).toHaveProperty('coffee');
      expect(result.word_scores).toHaveProperty('shop');
      expect(result.word_scores.coffee).toBe(4);
      expect(result.word_scores.shop).toBe(4);
    });

    test('should handle empty or invalid input', () => {
      const result = scorer.scoreWordSimplicity('');
      expect(result.points).toBe(0);
    });

    test('should track duration', () => {
      const result = scorer.scoreWordSimplicity('test phrase');
      expect(result.duration_ms).toBeGreaterThan(0);
      expect(result.duration_ms).toBeLessThan(50);
    });
  });

  describe('Length Bonus Scoring', () => {
    test('should give perfect score for 3 words', () => {
      const result = scorer.scoreLengthBonus('coffee shop now');
      expect(result.points).toBe(5);
      expect(result.reason).toBe('optimal_3_words');
      expect(result.word_count).toBe(3);
    });

    test('should give high score for 2 words', () => {
      const result = scorer.scoreLengthBonus('coffee shop');
      expect(result.points).toBe(4);
      expect(result.reason).toBe('optimal_2_words');
      expect(result.word_count).toBe(2);
    });

    test('should give high score for 4 words', () => {
      const result = scorer.scoreLengthBonus('the big coffee shop');
      expect(result.points).toBe(4);
      expect(result.reason).toBe('optimal_4_words');
      expect(result.word_count).toBe(4);
    });

    test('should penalize single words', () => {
      const result = scorer.scoreLengthBonus('coffee');
      expect(result.points).toBe(1);
      expect(result.reason).toBe('single_word_penalty');
      expect(result.word_count).toBe(1);
    });

    test('should penalize very long phrases', () => {
      const result = scorer.scoreLengthBonus('this is a very long phrase with many words');
      expect(result.points).toBeLessThan(2);
      expect(result.reason).toBe('length_penalty');
      expect(result.word_count).toBe(9);
    });

    test('should handle edge cases', () => {
      const result = scorer.scoreLengthBonus('five word phrase here now');
      expect(result.points).toBe(1); // 5 words = threshold, penalty applied
      expect(result.word_count).toBe(5);
    });

    test('should track duration', () => {
      const result = scorer.scoreLengthBonus('test phrase');
      expect(result.duration_ms).toBeGreaterThan(0);
      expect(result.duration_ms).toBeLessThan(50);
    });
  });

  describe('Overall Legacy Heuristics Scoring', () => {
    test('should combine word simplicity and length bonus correctly', async () => {
      const result = await scorer.scoreLegacyHeuristics('coffee shop');
      
      expect(result).toHaveProperty('phrase', 'coffee shop');
      expect(result).toHaveProperty('total_score');
      expect(result).toHaveProperty('components');
      expect(result).toHaveProperty('breakdown');
      expect(result).toHaveProperty('duration_ms');
      
      // Should combine both components
      expect(result.breakdown.word_simplicity_points).toBeGreaterThan(15);
      expect(result.breakdown.length_bonus_points).toBe(4); // 2 words = optimal
      expect(result.total_score).toBe(
        result.breakdown.word_simplicity_points + result.breakdown.length_bonus_points
      );
    });

    test('should respect maximum total score', async () => {
      const result = await scorer.scoreLegacyHeuristics('the good big');
      expect(result.total_score).toBeLessThanOrEqual(30);
    });

    test('should increment processed count', async () => {
      const initialCount = scorer.processedCount;
      await scorer.scoreLegacyHeuristics('test phrase');
      expect(scorer.processedCount).toBe(initialCount + 1);
    });

    test('should track duration', async () => {
      const result = await scorer.scoreLegacyHeuristics('test phrase');
      expect(result.duration_ms).toBeGreaterThan(0);
      expect(result.duration_ms).toBeLessThan(50);
    });

    test('should handle various phrase types correctly', async () => {
      const testCases = [
        { phrase: 'the good', expectedMin: 20 }, // Very common words
        { phrase: 'coffee shop', expectedMin: 15 }, // Common words
        { phrase: 'quantum computing', expectedMax: 10 }, // Complex words
        { phrase: 'test', expectedMax: 10 }, // Single word penalty
      ];

      for (const testCase of testCases) {
        const result = await scorer.scoreLegacyHeuristics(testCase.phrase);
        
        if (testCase.expectedMin) {
          expect(result.total_score).toBeGreaterThanOrEqual(testCase.expectedMin);
        }
        if (testCase.expectedMax) {
          expect(result.total_score).toBeLessThanOrEqual(testCase.expectedMax);
        }
      }
    });
  });

  describe('Batch Processing', () => {
    test('should process multiple phrases', async () => {
      const phrases = ['coffee shop', 'good food', 'test'];
      const result = await scorer.batchScoreLegacyHeuristics(phrases);
      
      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('summary');
      expect(result.results).toHaveLength(3);
      
      result.results.forEach(r => {
        expect(r).toHaveProperty('phrase');
        expect(r).toHaveProperty('total_score');
        expect(r.total_score).toBeGreaterThanOrEqual(0);
        expect(r.total_score).toBeLessThanOrEqual(30);
      });
      
      expect(result.summary).toHaveProperty('total_phrases', 3);
      expect(result.summary).toHaveProperty('avg_score');
      expect(result.summary).toHaveProperty('distribution');
    });

    test('should handle invalid phrases in batch', async () => {
      const phrases = ['valid phrase', '', null, 123];
      const result = await scorer.batchScoreLegacyHeuristics(phrases);
      
      expect(result.results).toHaveLength(4);
      expect(result.results[0].total_score).toBeGreaterThan(0); // valid phrase
      expect(result.results[1].error).toBeDefined(); // empty string
      expect(result.results[2].error).toBeDefined(); // null
      expect(result.results[3].error).toBeDefined(); // number
    });

    test('should calculate distribution correctly', async () => {
      const phrases = ['the good big', 'coffee shop', 'test'];
      const result = await scorer.batchScoreLegacyHeuristics(phrases);
      
      const dist = result.summary.distribution;
      expect(dist).toHaveProperty('high_legacy');
      expect(dist).toHaveProperty('medium_legacy');
      expect(dist).toHaveProperty('low_legacy');
      expect(dist).toHaveProperty('no_legacy');
      
      const total = dist.high_legacy + dist.medium_legacy + dist.low_legacy + dist.no_legacy;
      expect(total).toBe(3);
    });
  });

  describe('Performance Requirements', () => {
    test('should complete scoring under 50ms for simple phrases', async () => {
      const startTime = Date.now();
      const result = await scorer.scoreLegacyHeuristics('test phrase');
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(50);
      expect(result.duration_ms).toBeLessThan(50);
    });

    test('should handle batch processing efficiently', async () => {
      const phrases = Array(10).fill('test phrase');
      const startTime = Date.now();
      const result = await scorer.batchScoreLegacyHeuristics(phrases);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(500); // 50ms * 10 phrases
      expect(result.summary.avg_duration_ms).toBeLessThan(50);
    });
  });

  describe('Statistics and Monitoring', () => {
    test('should provide comprehensive stats', async () => {
      const stats = await scorer.getStats();
      
      expect(stats).toHaveProperty('service', 'legacy_heuristics_scorer');
      expect(stats).toHaveProperty('components');
      expect(stats).toHaveProperty('scoring_bands');
      expect(stats).toHaveProperty('processed_count');
      
      expect(stats.components).toHaveProperty('word_simplicity');
      expect(stats.components).toHaveProperty('length_bonus');
      
      expect(stats.components.word_simplicity.available).toBe(true);
      expect(stats.components.length_bonus.available).toBe(true);
      expect(stats.components.word_simplicity.total_words).toBeGreaterThan(200);
    });

    test('should track processing statistics', async () => {
      const initialStats = await scorer.getStats();
      const initialCount = initialStats.processed_count;
      
      await scorer.scoreLegacyHeuristics('test phrase');
      
      const finalStats = await scorer.getStats();
      expect(finalStats.processed_count).toBe(initialCount + 1);
    });
  });

  describe('Error Handling', () => {
    test('should handle empty phrases gracefully', async () => {
      const result = await scorer.scoreLegacyHeuristics('');
      expect(result.total_score).toBe(0);
    });

    test('should handle special characters', async () => {
      const result = await scorer.scoreLegacyHeuristics('test@#$%');
      expect(result.total_score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Integration with Word Tiers', () => {
    test('should differentiate between tier levels', () => {
      const tier1Result = scorer.scoreWordSimplicity('the good');
      const tier2Result = scorer.scoreWordSimplicity('coffee shop');
      const tier3Result = scorer.scoreWordSimplicity('computer game');
      
      expect(tier1Result.points).toBeGreaterThan(tier2Result.points);
      expect(tier2Result.points).toBeGreaterThan(tier3Result.points);
    });

    test('should handle mixed tier phrases', () => {
      const result = scorer.scoreWordSimplicity('the computer'); // tier1 + tier3
      expect(result.word_scores.the).toBe(5);
      expect(result.word_scores.computer).toBe(3);
      expect(result.points).toBeGreaterThan(10);
    });
  });

  describe('Cleanup', () => {
    test('should close connections properly', async () => {
      // Legacy scorer has no external connections, but should complete without error
      await expect(scorer.close()).resolves.toBeUndefined();
    });
  });
}); 