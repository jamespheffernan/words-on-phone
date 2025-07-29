const DescribabilityScorer = require('../../services/scoring/describability-scorer');

describe('DescribabilityScorer', () => {
  let scorer;
  
  beforeEach(() => {
    scorer = new DescribabilityScorer();
  });
  
  afterEach(async () => {
    if (scorer) {
      await scorer.close();
    }
  });

  describe('Constructor and Initialization', () => {
    test('should initialize with correct scoring bands', () => {
      expect(scorer.SCORING.CONCRETENESS_HIGH).toBe(15);
      expect(scorer.SCORING.CONCRETENESS_MEDIUM).toBe(8);
      expect(scorer.SCORING.CONCRETENESS_LOW).toBe(0);
      expect(scorer.SCORING.PROPER_NOUN_BONUS).toBe(5);
      expect(scorer.SCORING.WEAK_HEAD_PENALTY).toBe(-10);
    });

    test('should initialize weak-head patterns', () => {
      expect(scorer.WEAK_HEAD_PATTERNS).toBeInstanceOf(Set);
      expect(scorer.WEAK_HEAD_PATTERNS.size).toBeGreaterThan(50);
      expect(scorer.WEAK_HEAD_PATTERNS.has('strategy')).toBe(true);
      expect(scorer.WEAK_HEAD_PATTERNS.has('vibe')).toBe(true);
      expect(scorer.WEAK_HEAD_PATTERNS.has('energy')).toBe(true);
    });

    test('should initialize proper noun patterns', () => {
      expect(scorer.PROPER_NOUN_PATTERNS).toHaveProperty('PERSON');
      expect(scorer.PROPER_NOUN_PATTERNS).toHaveProperty('ORG');
      expect(scorer.PROPER_NOUN_PATTERNS).toHaveProperty('GPE');
      expect(Array.isArray(scorer.PROPER_NOUN_PATTERNS.PERSON)).toBe(true);
    });

    test('should initialize concreteness processor', () => {
      expect(scorer.concretenessProcessor).toBeDefined();
    });

    test('should track processed count', () => {
      expect(scorer.processedCount).toBe(0);
    });
  });

  describe('Proper Noun Detection', () => {
    test('should detect person names', () => {
      const result = scorer.detectProperNouns('Taylor Swift');
      expect(result.points).toBe(5);
      expect(result.detected).toHaveLength(1);
      expect(result.detected[0].type).toBe('PERSON');
      expect(result.detected[0].text).toBe('Taylor Swift');
    });

    test('should detect organization names', () => {
      const result = scorer.detectProperNouns('Apple iPhone');
      expect(result.points).toBe(5);
      expect(result.detected).toHaveLength(1);
      expect(result.detected[0].type).toBe('ORG');
      expect(result.detected[0].text).toBe('Apple');
    });

    test('should detect geographic entities', () => {
      const result = scorer.detectProperNouns('New York pizza');
      expect(result.points).toBe(5);
      expect(result.detected).toHaveLength(1);
      expect(result.detected[0].type).toBe('GPE');
      expect(result.detected[0].text).toBe('New York');
    });

    test('should not detect proper nouns in common phrases', () => {
      const result = scorer.detectProperNouns('coffee shop');
      expect(result.points).toBe(0);
      expect(result.detected).toHaveLength(0);
    });

    test('should remove duplicate detections', () => {
      const result = scorer.detectProperNouns('Apple Apple iPhone');
      expect(result.points).toBe(5);
      expect(result.detected).toHaveLength(1); // Should deduplicate "Apple"
    });

    test('should handle detection errors gracefully', () => {
      // Test with a phrase that might cause regex issues
      const result = scorer.detectProperNouns('test [special] characters');
      expect(result.points).toBeGreaterThanOrEqual(0);
      expect(result.detected).toBeDefined();
    });
  });

  describe('Weak-Head Pattern Detection', () => {
    test('should detect strategy pattern', () => {
      const result = scorer.detectWeakHeadPatterns('marketing strategy');
      expect(result.points).toBe(-10);
      expect(result.patterns_found).toHaveLength(1);
      expect(result.patterns_found[0].word).toBe('strategy');
    });

    test('should detect vibe pattern', () => {
      const result = scorer.detectWeakHeadPatterns('social media vibe');
      expect(result.points).toBe(-10);
      expect(result.patterns_found).toHaveLength(1);
      expect(result.patterns_found[0].word).toBe('vibe');
    });

    test('should detect energy pattern', () => {
      const result = scorer.detectWeakHeadPatterns('brand energy');
      expect(result.points).toBe(-10);
      expect(result.patterns_found).toHaveLength(1);
      expect(result.patterns_found[0].word).toBe('energy');
    });

    test('should detect fail pattern', () => {
      const result = scorer.detectWeakHeadPatterns('epic fail');
      expect(result.points).toBe(-10);
      expect(result.patterns_found).toHaveLength(1);
      expect(result.patterns_found[0].word).toBe('fail');
    });

    test('should not detect patterns in normal phrases', () => {
      const result = scorer.detectWeakHeadPatterns('coffee shop');
      expect(result.points).toBe(0);
      expect(result.patterns_found).toHaveLength(0);
    });

    test('should handle multiple patterns in one phrase', () => {
      const result = scorer.detectWeakHeadPatterns('strategy and energy');
      expect(result.points).toBe(-10); // Still -10, not -20
      expect(result.patterns_found.length).toBeGreaterThanOrEqual(1);
    });

    test('should handle punctuation in patterns', () => {
      const result = scorer.detectWeakHeadPatterns('marketing strategy!');
      expect(result.points).toBe(-10);
      expect(result.patterns_found).toHaveLength(1);
    });

    test('should identify head noun patterns', () => {
      const result = scorer.detectWeakHeadPatterns('business culture');
      expect(result.points).toBe(-10);
      expect(result.patterns_found).toHaveLength(1);
      expect(result.patterns_found[0].word).toBe('culture');
    });
  });

  describe('Concreteness Scoring', () => {
    test('should handle concreteness processor results', async () => {
      // Mock concreteness processor
      scorer.concretenessProcessor.scoreConcreteness = jest.fn().mockResolvedValue({
        overall_concreteness: 4.5,
        word_scores: { test: 4.5 },
        words_found: 1,
        duration_ms: 50
      });

      const result = await scorer.scoreConcreteness('test phrase');
      expect(result.points).toBe(15); // High concreteness
      expect(result.band).toBe('high');
      expect(result.concreteness_score).toBe(4.5);
    });

    test('should handle medium concreteness', async () => {
      scorer.concretenessProcessor.scoreConcreteness = jest.fn().mockResolvedValue({
        overall_concreteness: 3.5,
        word_scores: { test: 3.5 },
        words_found: 1,
        duration_ms: 50
      });

      const result = await scorer.scoreConcreteness('test phrase');
      expect(result.points).toBe(8); // Medium concreteness
      expect(result.band).toBe('medium');
    });

    test('should handle low concreteness', async () => {
      scorer.concretenessProcessor.scoreConcreteness = jest.fn().mockResolvedValue({
        overall_concreteness: 2.5,
        word_scores: { test: 2.5 },
        words_found: 1,
        duration_ms: 50
      });

      const result = await scorer.scoreConcreteness('test phrase');
      expect(result.points).toBe(0); // Low concreteness
      expect(result.band).toBe('low');
    });

    test('should handle concreteness errors gracefully', async () => {
      scorer.concretenessProcessor.scoreConcreteness = jest.fn().mockRejectedValue(
        new Error('Concreteness error')
      );

      const result = await scorer.scoreConcreteness('test phrase');
      expect(result.points).toBe(0);
      expect(result.band).toBe('error');
      expect(result.error).toBe('Concreteness error');
    });
  });

  describe('Overall Describability Scoring', () => {
    test('should combine all components correctly', async () => {
      // Mock concreteness for high score
      scorer.concretenessProcessor.scoreConcreteness = jest.fn().mockResolvedValue({
        overall_concreteness: 4.5,
        word_scores: { coffee: 4.5, shop: 4.2 },
        words_found: 2,
        duration_ms: 50
      });

      const result = await scorer.scoreDescribability('coffee shop');
      
      expect(result).toHaveProperty('phrase', 'coffee shop');
      expect(result).toHaveProperty('total_score');
      expect(result).toHaveProperty('components');
      expect(result).toHaveProperty('breakdown');
      expect(result).toHaveProperty('duration_ms');
      
      // Should have high concreteness points
      expect(result.breakdown.concreteness_points).toBe(15);
      // No proper nouns detected
      expect(result.breakdown.proper_noun_points).toBe(0);
      // No weak-head patterns
      expect(result.breakdown.weak_head_points).toBe(0);
      // Total should be 15
      expect(result.total_score).toBe(15);
    });

    test('should handle proper noun bonus correctly', async () => {
      scorer.concretenessProcessor.scoreConcreteness = jest.fn().mockResolvedValue({
        overall_concreteness: 4.0,
        word_scores: {},
        words_found: 0,
        duration_ms: 50
      });

      const result = await scorer.scoreDescribability('Taylor Swift');
      
      expect(result.breakdown.concreteness_points).toBe(15);
      expect(result.breakdown.proper_noun_points).toBe(5);
      expect(result.breakdown.weak_head_points).toBe(0);
      expect(result.total_score).toBe(20); // 15 + 5
    });

    test('should handle weak-head penalty correctly', async () => {
      scorer.concretenessProcessor.scoreConcreteness = jest.fn().mockResolvedValue({
        overall_concreteness: 4.0,
        word_scores: {},
        words_found: 0,
        duration_ms: 50
      });

      const result = await scorer.scoreDescribability('marketing strategy');
      
      expect(result.breakdown.concreteness_points).toBe(15);
      expect(result.breakdown.proper_noun_points).toBe(0);
      expect(result.breakdown.weak_head_points).toBe(-10);
      expect(result.total_score).toBe(5); // 15 + 0 - 10
    });

    test('should clamp negative scores to 0', async () => {
      scorer.concretenessProcessor.scoreConcreteness = jest.fn().mockResolvedValue({
        overall_concreteness: 2.0, // Low concreteness = 0 points
        word_scores: {},
        words_found: 0,
        duration_ms: 50
      });

      const result = await scorer.scoreDescribability('abstract strategy');
      
      expect(result.breakdown.concreteness_points).toBe(0);
      expect(result.breakdown.proper_noun_points).toBe(0);
      expect(result.breakdown.weak_head_points).toBe(-10);
      expect(result.total_score).toBe(0); // Math.max(0, 0 + 0 - 10) = 0
    });

    test('should increment processed count', async () => {
      scorer.concretenessProcessor.scoreConcreteness = jest.fn().mockResolvedValue({
        overall_concreteness: 3.0,
        word_scores: {},
        words_found: 0,
        duration_ms: 50
      });

      const initialCount = scorer.processedCount;
      await scorer.scoreDescribability('test phrase');
      expect(scorer.processedCount).toBe(initialCount + 1);
    });

    test('should track duration', async () => {
      scorer.concretenessProcessor.scoreConcreteness = jest.fn().mockResolvedValue({
        overall_concreteness: 3.0,
        word_scores: {},
        words_found: 0,
        duration_ms: 50
      });

      const result = await scorer.scoreDescribability('test phrase');
      expect(result.duration_ms).toBeGreaterThan(0);
      expect(result.duration_ms).toBeLessThan(5000);
    });
  });

  describe('Batch Processing', () => {
    test('should process multiple phrases', async () => {
      scorer.concretenessProcessor.scoreConcreteness = jest.fn().mockResolvedValue({
        overall_concreteness: 3.5,
        word_scores: {},
        words_found: 0,
        duration_ms: 50
      });

      const phrases = ['coffee shop', 'Taylor Swift', 'marketing strategy'];
      const result = await scorer.batchScoreDescribability(phrases);
      
      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('summary');
      expect(result.results).toHaveLength(3);
      
      result.results.forEach(r => {
        expect(r).toHaveProperty('phrase');
        expect(r).toHaveProperty('total_score');
        expect(r.total_score).toBeGreaterThanOrEqual(0);
        expect(r.total_score).toBeLessThanOrEqual(25);
      });
      
      expect(result.summary).toHaveProperty('total_phrases', 3);
      expect(result.summary).toHaveProperty('avg_score');
      expect(result.summary).toHaveProperty('distribution');
    });

    test('should handle invalid phrases in batch', async () => {
      const phrases = ['valid phrase', '', null, 123];
      const result = await scorer.batchScoreDescribability(phrases);
      
      expect(result.results).toHaveLength(4);
      expect(result.results[1].error).toBeDefined(); // empty string
      expect(result.results[2].error).toBeDefined(); // null
      expect(result.results[3].error).toBeDefined(); // number
    });

    test('should calculate distribution correctly', async () => {
      scorer.concretenessProcessor.scoreConcreteness = jest.fn().mockResolvedValue({
        overall_concreteness: 4.0,
        word_scores: {},
        words_found: 0,
        duration_ms: 50
      });

      const phrases = ['coffee shop', 'test phrase'];
      const result = await scorer.batchScoreDescribability(phrases);
      
      const dist = result.summary.distribution;
      expect(dist).toHaveProperty('high_describability');
      expect(dist).toHaveProperty('medium_describability');
      expect(dist).toHaveProperty('low_describability');
      expect(dist).toHaveProperty('no_describability');
      
      const total = dist.high_describability + dist.medium_describability + 
                   dist.low_describability + dist.no_describability;
      expect(total).toBe(2);
    });
  });

  describe('Error Handling', () => {
    test('should handle scoring errors gracefully', async () => {
      scorer.concretenessProcessor.scoreConcreteness = jest.fn().mockRejectedValue(
        new Error('Test error')
      );

      const result = await scorer.scoreDescribability('test phrase');
      expect(result.total_score).toBe(0);
      expect(result.error).toBe('Test error');
    });
  });

  describe('Performance Requirements', () => {
    test('should complete scoring under 300ms for simple phrases', async () => {
      scorer.concretenessProcessor.scoreConcreteness = jest.fn().mockResolvedValue({
        overall_concreteness: 3.0,
        word_scores: {},
        words_found: 0,
        duration_ms: 50
      });

      const startTime = Date.now();
      const result = await scorer.scoreDescribability('test phrase');
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(300);
      expect(result.duration_ms).toBeLessThan(300);
    });

    test('should handle batch processing efficiently', async () => {
      scorer.concretenessProcessor.scoreConcreteness = jest.fn().mockResolvedValue({
        overall_concreteness: 3.0,
        word_scores: {},
        words_found: 0,
        duration_ms: 50
      });

      const phrases = Array(10).fill('test phrase');
      const startTime = Date.now();
      const result = await scorer.batchScoreDescribability(phrases);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(3000);
      expect(result.summary.avg_duration_ms).toBeLessThan(300);
    });
  });

  describe('Statistics and Monitoring', () => {
    test('should provide comprehensive stats', async () => {
      // Mock concreteness processor stats
      scorer.concretenessProcessor.getStats = jest.fn().mockResolvedValue({
        service: 'concreteness_processor',
        connected: true
      });

      const stats = await scorer.getStats();
      
      expect(stats).toHaveProperty('service', 'describability_scorer');
      expect(stats).toHaveProperty('components');
      expect(stats).toHaveProperty('scoring_bands');
      expect(stats).toHaveProperty('processed_count');
      
      expect(stats.components).toHaveProperty('concreteness');
      expect(stats.components).toHaveProperty('proper_noun');
      expect(stats.components).toHaveProperty('weak_head');
      
      expect(stats.components.proper_noun.available).toBe(true);
      expect(stats.components.weak_head.available).toBe(true);
      expect(stats.components.weak_head.patterns_count).toBeGreaterThan(50);
    });

    test('should handle stats errors gracefully', async () => {
      scorer.concretenessProcessor.getStats = jest.fn().mockRejectedValue(
        new Error('Stats error')
      );

      const stats = await scorer.getStats();
      expect(stats).toHaveProperty('service', 'describability_scorer');
      expect(stats).toHaveProperty('error', 'Stats error');
    });
  });

  describe('Integration Tests', () => {
    test('should score realistic phrases appropriately', async () => {
      const testCases = [
        {
          phrase: 'Taylor Swift',
          mockConcreteness: 4.5,
          expectedMin: 18, // High concreteness (15) + proper noun (5) - penalties (0)
          description: 'Celebrity name with high concreteness'
        },
        {
          phrase: 'pizza delivery', 
          mockConcreteness: 4.2,
          expectedMin: 13, // High concreteness (15) + no bonus - penalties (0)
          description: 'Concrete concept'
        },
        {
          phrase: 'marketing strategy',
          mockConcreteness: 3.0,
          expectedMax: 8, // Medium concreteness (8) - weak head penalty (10) = 0 (clamped)
          description: 'Abstract concept with penalty'
        }
      ];
      
      for (const testCase of testCases) {
        scorer.concretenessProcessor.scoreConcreteness = jest.fn().mockResolvedValue({
          overall_concreteness: testCase.mockConcreteness,
          word_scores: {},
          words_found: 0,
          duration_ms: 50
        });

        const result = await scorer.scoreDescribability(testCase.phrase);
        
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
      const closeSpy = jest.spyOn(scorer.concretenessProcessor, 'close');
      await scorer.close();
      expect(closeSpy).toHaveBeenCalled();
    });
  });
}); 