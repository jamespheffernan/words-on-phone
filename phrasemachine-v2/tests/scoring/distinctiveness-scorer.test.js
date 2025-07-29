const DistinctivenessScorer = require('../../services/scoring/distinctiveness-scorer');

describe('DistinctivenessScorer', () => {
  let scorer;
  
  beforeEach(() => {
    scorer = new DistinctivenessScorer();
  });
  
  afterEach(async () => {
    if (scorer) {
      await scorer.close();
    }
  });

  describe('Constructor and Initialization', () => {
    test('should initialize with correct scoring bands', () => {
      expect(scorer.SCORING.EXACT_WIKIDATA_MATCH).toBe(25);
      expect(scorer.SCORING.WIKIPEDIA_REDIRECT).toBe(20);
      expect(scorer.SCORING.PMI_HIGH).toBe(15);
      expect(scorer.SCORING.WORDNET_MULTIWORD).toBe(10);
      expect(scorer.SCORING.NO_MATCH).toBe(0);
    });

    test('should initialize processors', () => {
      expect(scorer.wikidataProcessor).toBeDefined();
      expect(scorer.ngramProcessor).toBeDefined();
      expect(scorer.wordNet).toBeDefined();
    });

    test('should track processed count', () => {
      expect(scorer.processedCount).toBe(0);
    });
  });

  describe('Phrase Validation', () => {
    test('should accept valid 2-word phrases', async () => {
      const result = await scorer.scoreDistinctiveness('test phrase');
      expect(result.phrase).toBe('test phrase');
      expect(typeof result.score).toBe('number');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(25);
    });

    test('should accept valid 3-word phrases', async () => {
      const result = await scorer.scoreDistinctiveness('test phrase here');
      expect(result.phrase).toBe('test phrase here');
      expect(typeof result.score).toBe('number');
    });

    test('should accept valid 4-word phrases', async () => {
      const result = await scorer.scoreDistinctiveness('test phrase here now');
      expect(result.phrase).toBe('test phrase here now');
      expect(typeof result.score).toBe('number');
    });

    test('should handle phrase normalization', async () => {
      const result = await scorer.scoreDistinctiveness('  TEST PHRASE  ');
      expect(result.phrase).toBe('test phrase');
    });
  });

  describe('Scoring Components', () => {
    test('should return structured result object', async () => {
      const result = await scorer.scoreDistinctiveness('machine learning');
      
      // Check main structure
      expect(result).toHaveProperty('phrase');
      expect(result).toHaveProperty('score'); 
      expect(result).toHaveProperty('scoring_method');
      expect(result).toHaveProperty('components');
      expect(result).toHaveProperty('duration_ms');
      expect(result).toHaveProperty('timestamp');
      
      // Check components structure
      expect(result.components).toHaveProperty('wikidata');
      expect(result.components).toHaveProperty('pmi');
      expect(result.components).toHaveProperty('wordnet');
      
      // Check score is valid
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(25);
      expect([0, 10, 15, 20, 25]).toContain(result.score);
    });

    test('should track duration', async () => {
      const result = await scorer.scoreDistinctiveness('test phrase');
      expect(result.duration_ms).toBeGreaterThan(0);
      expect(result.duration_ms).toBeLessThan(5000); // Should be under 5 seconds
    });

    test('should increment processed count', async () => {
      const initialCount = scorer.processedCount;
      await scorer.scoreDistinctiveness('test phrase');
      expect(scorer.processedCount).toBe(initialCount + 1);
    });
  });

  describe('WordNet Multi-word Detection', () => {
    test('should detect valid word count phrases', async () => {
      const result = await scorer.checkWordNetMultiword('coffee shop');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('duration_ms');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(10);
    });

    test('should reject single word phrases', async () => {
      const result = await scorer.checkWordNetMultiword('coffee');
      expect(result.score).toBe(0);
      expect(result.type).toBe('invalid_word_count');
      expect(result.word_count).toBe(1);
    });

    test('should reject phrases with too many words', async () => {
      const result = await scorer.checkWordNetMultiword('very long phrase with many words');
      expect(result.score).toBe(0);
      expect(result.type).toBe('invalid_word_count');
      expect(result.word_count).toBe(6);
    });

    test('should handle timeout gracefully', async () => {
      // Mock WordNet to simulate timeout
      const originalLookup = scorer.wordNet.lookup;
      scorer.wordNet.lookup = jest.fn((phrase, callback) => {
        // Don't call callback to simulate timeout
      });

      const result = await scorer.checkWordNetMultiword('test phrase');
      expect(result.score).toBe(0);
      expect(result.type).toBe('error');
      expect(result.error).toContain('timeout');
      
      // Restore original method
      scorer.wordNet.lookup = originalLookup;
    });
  });

  describe('Batch Processing', () => {
    test('should process multiple phrases', async () => {
      const phrases = ['machine learning', 'artificial intelligence', 'test phrase'];
      const result = await scorer.batchScoreDistinctiveness(phrases);
      
      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('summary');
      expect(result.results).toHaveLength(3);
      
      // Check each result
      result.results.forEach(r => {
        expect(r).toHaveProperty('phrase');
        expect(r).toHaveProperty('score');
        expect(r.score).toBeGreaterThanOrEqual(0);
        expect(r.score).toBeLessThanOrEqual(25);
      });
      
      // Check summary
      expect(result.summary).toHaveProperty('total_phrases', 3);
      expect(result.summary).toHaveProperty('avg_score');
      expect(result.summary).toHaveProperty('avg_duration_ms');
      expect(result.summary).toHaveProperty('distribution');
    });

    test('should handle invalid phrases in batch', async () => {
      const phrases = ['valid phrase', 'single', '', null, 123];
      const result = await scorer.batchScoreDistinctiveness(phrases);
      
      expect(result.results).toHaveLength(5);
      expect(result.results[0].score).toBeGreaterThanOrEqual(0); // valid phrase
      expect(result.results[1].score).toBe(0); // single word - should be processed but score low
      expect(result.results[2].error).toBeDefined(); // empty string
      expect(result.results[3].error).toBeDefined(); // null
      expect(result.results[4].error).toBeDefined(); // number
    });

    test('should calculate distribution correctly', async () => {
      const phrases = ['machine learning', 'test phrase'];
      const result = await scorer.batchScoreDistinctiveness(phrases);
      
      const dist = result.summary.distribution;
      expect(dist).toHaveProperty('exact_wikidata');
      expect(dist).toHaveProperty('wikipedia_redirect'); 
      expect(dist).toHaveProperty('pmi_high');
      expect(dist).toHaveProperty('wordnet_multiword');
      expect(dist).toHaveProperty('no_match');
      
      // Total should equal number of phrases
      const total = dist.exact_wikidata + dist.wikipedia_redirect + 
                   dist.pmi_high + dist.wordnet_multiword + dist.no_match;
      expect(total).toBe(2);
    });
  });

  describe('Error Handling', () => {
    test('should handle processor errors gracefully', async () => {
      // Mock processor to throw error
      scorer.wikidataProcessor.checkDistinctiveness = jest.fn(() => {
        throw new Error('Test error');
      });
      
      const result = await scorer.scoreDistinctiveness('test phrase');
      expect(result.score).toBe(0);
      expect(result.scoring_method).toBe('error');
      expect(result.error).toBe('Test error');
    });

    test('should handle empty or invalid input', async () => {
      const result = await scorer.scoreDistinctiveness('');
      expect(result.score).toBe(0);
      expect(result.error).toBeDefined();
    });
  });

  describe('Performance Requirements', () => {
    test('should complete scoring under 300ms for simple phrases', async () => {
      const startTime = Date.now();
      const result = await scorer.scoreDistinctiveness('test phrase');
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(300);
      expect(result.duration_ms).toBeLessThan(300);
    });

    test('should handle batch processing efficiently', async () => {
      const phrases = Array(10).fill('test phrase');
      const startTime = Date.now();
      const result = await scorer.batchScoreDistinctiveness(phrases);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(3000); // 300ms * 10 phrases
      expect(result.summary.avg_duration_ms).toBeLessThan(300);
    });
  });

  describe('Statistics and Monitoring', () => {
    test('should provide comprehensive stats', async () => {
      const stats = await scorer.getStats();
      
      expect(stats).toHaveProperty('service', 'distinctiveness_scorer');
      expect(stats).toHaveProperty('components');
      expect(stats).toHaveProperty('scoring_bands');
      expect(stats).toHaveProperty('processed_count');
      expect(stats).toHaveProperty('timestamp');
      
      expect(stats.components).toHaveProperty('wikidata');
      expect(stats.components).toHaveProperty('ngram');
      expect(stats.components).toHaveProperty('wordnet');
      
      expect(stats.scoring_bands).toEqual(scorer.SCORING);
    });

    test('should handle stats errors gracefully', async () => {
      // Mock processor to throw error
      scorer.wikidataProcessor.getStats = jest.fn(() => {
        throw new Error('Stats error');
      });
      
      const stats = await scorer.getStats();
      expect(stats).toHaveProperty('service', 'distinctiveness_scorer');
      expect(stats).toHaveProperty('error', 'Stats error');
    });
  });

  describe('Integration Tests', () => {
    test('should integrate all components for realistic phrases', async () => {
      const testCases = [
        {
          phrase: 'machine learning',
          expectedMinScore: 10, // Should get some points
          description: 'Technical term with high PMI'
        },
        {
          phrase: 'coffee shop', 
          expectedMinScore: 5, // WordNet multiword entry
          description: 'Common compound noun'
        },
        {
          phrase: 'random nonexistent phrase',
          expectedMaxScore: 5, // Should score very low
          description: 'Non-standard phrase'
        }
      ];
      
      for (const testCase of testCases) {
        const result = await scorer.scoreDistinctiveness(testCase.phrase);
        expect(result.score).toBeGreaterThanOrEqual(0);
        if (testCase.expectedMinScore) {
          expect(result.score).toBeGreaterThanOrEqual(testCase.expectedMinScore);
        }
        if (testCase.expectedMaxScore) {
          expect(result.score).toBeLessThanOrEqual(testCase.expectedMaxScore);
        }
      }
    });
  });

  describe('Cleanup', () => {
    test('should close connections properly', async () => {
      const closeSpy = jest.spyOn(scorer.wikidataProcessor, 'close');
      await scorer.close();
      expect(closeSpy).toHaveBeenCalled();
    });
  });
}); 