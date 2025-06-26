const PhraseScorer = require('../src/phraseScorer');
const fs = require('fs');
const path = require('path');

// Mock HTTP requests for testing
jest.mock('https');

describe('PhraseScorer', () => {
  let scorer;
  let testCacheFile;

  beforeEach(() => {
    // Create a unique test cache file for each test
    testCacheFile = path.join(__dirname, '..', 'data', `test-cache-${Date.now()}.json`);
    scorer = new PhraseScorer();
    scorer.CACHE_FILE = testCacheFile;
    scorer.scoreCache = {};
  });

  afterEach(() => {
    // Clean up test cache file
    if (fs.existsSync(testCacheFile)) {
      fs.unlinkSync(testCacheFile);
    }
  });

  describe('Local Heuristics Scoring', () => {
         test('should give high scores to simple common phrases', async () => {
       const score = await scorer.scoreLocalHeuristics('The Big Show', 'Movies & TV');
       expect(score).toBeGreaterThan(24); // Common words + short length
     });

    test('should give low scores to complex technical phrases', async () => {
      const score = await scorer.scoreLocalHeuristics('Quantum Chromodynamics Theoretical Framework', 'Science');
      expect(score).toBeLessThan(15); // Long complex words
    });

    test('should reward recent cultural references', async () => {
      const score = await scorer.scoreLocalHeuristics('TikTok Dance Challenge', 'Social Media');
      expect(score).toBeGreaterThan(20); // Contains recent indicator
    });

    test('should handle single word phrases', async () => {
      const score = await scorer.scoreLocalHeuristics('Pizza', 'Food & Drink');
      expect(score).toBeGreaterThan(15);
    });

    test('should penalize very long phrases', async () => {
      const longPhrase = 'This is a very long phrase with many words that should be penalized';
      const score = await scorer.scoreLocalHeuristics(longPhrase, 'General');
      expect(score).toBeLessThan(20);
    });
  });

  describe('Category Boost Scoring', () => {
    test('should give higher boost to pop culture categories', () => {
      const popScore = scorer.scoreCategoryBoost('Star Wars', 'Movies & TV');
      const regularScore = scorer.scoreCategoryBoost('Microscope', 'Science');
      expect(popScore).toBeGreaterThan(regularScore);
    });

    test('should recognize category-specific patterns', () => {
      const movieScore = scorer.scoreCategoryBoost('Best Picture Movie', 'Movies & TV');
      const basicScore = scorer.scoreCategoryBoost('Best Picture', 'Movies & TV');
      expect(movieScore).toBeGreaterThan(basicScore);
    });

    test('should handle music category patterns', () => {
      const songScore = scorer.scoreCategoryBoost('Famous Song Title', 'Music');
      const basicScore = scorer.scoreCategoryBoost('Famous Title', 'Music');
      expect(songScore).toBeGreaterThan(basicScore);
    });

    test('should handle food category patterns', () => {
      const foodScore = scorer.scoreCategoryBoost('Best Pizza Place', 'Food & Drink');
      const basicScore = scorer.scoreCategoryBoost('Best Place', 'Food & Drink');
      expect(foodScore).toBeGreaterThan(basicScore);
    });
  });

  describe('Verdict System', () => {
    test('should classify scores correctly', () => {
      expect(scorer.getVerdict(85)).toBe('EXCELLENT - Auto Accept');
      expect(scorer.getVerdict(70)).toBe('GOOD - Accept');
      expect(scorer.getVerdict(50)).toBe('BORDERLINE - Manual Review');
      expect(scorer.getVerdict(30)).toBe('WARNING - Likely Too Obscure');
      expect(scorer.getVerdict(10)).toBe('REJECT - Too Technical/Unknown');
    });

    test('should handle edge cases', () => {
      expect(scorer.getVerdict(80)).toBe('EXCELLENT - Auto Accept');
      expect(scorer.getVerdict(60)).toBe('GOOD - Accept');
      expect(scorer.getVerdict(40)).toBe('BORDERLINE - Manual Review');
      expect(scorer.getVerdict(20)).toBe('WARNING - Likely Too Obscure');
    });
  });

  describe('Caching System', () => {
    test('should save and load cache correctly', () => {
      const testData = { 'test:category': { totalScore: 50, cached: true } };
      scorer.scoreCache = testData;
      scorer.saveCache();

      const newScorer = new PhraseScorer();
      newScorer.CACHE_FILE = testCacheFile;
      const loadedCache = newScorer.loadCache();
      
      expect(loadedCache).toEqual(testData);
    });

    test('should handle missing cache file gracefully', () => {
      const nonExistentFile = path.join(__dirname, 'nonexistent.json');
      scorer.CACHE_FILE = nonExistentFile;
      const cache = scorer.loadCache();
      expect(cache).toEqual({});
    });

    test('should provide cache statistics', () => {
      scorer.scoreCache = {
        'phrase1:cat1': { totalScore: 80 },
        'phrase2:cat2': { totalScore: 60 }
      };
      
      const stats = scorer.getCacheStats();
      expect(stats.totalEntries).toBe(2);
      expect(stats.averageScore).toBe(70);
    });

    test('should clear cache properly', () => {
      scorer.scoreCache = { 'test:data': { score: 50 } };
      scorer.saveCache();
      
      scorer.clearCache();
      
      expect(scorer.scoreCache).toEqual({});
      expect(fs.existsSync(testCacheFile)).toBeFalsy();
    });
  });

  describe('HTTP Request Mocking', () => {
    beforeEach(() => {
      // Reset mocks
      jest.clearAllMocks();
    });

    test('should handle HTTP errors gracefully', async () => {
      const https = require('https');
      
      // Mock a failing HTTP request
      https.get = jest.fn().mockImplementation((url, options, callback) => {
        const mockRequest = {
          on: jest.fn().mockImplementation((event, handler) => {
            if (event === 'error') {
              setTimeout(() => handler(new Error('Network error')), 0);
            }
          }),
          setTimeout: jest.fn(),
          destroy: jest.fn()
        };
        return mockRequest;
      });

      const score = await scorer.scoreWikidata('Test Phrase');
      expect(score).toBe(0);
    });

    test('should handle timeout errors', async () => {
      const https = require('https');
      
      https.get = jest.fn().mockImplementation((url, options, callback) => {
        const mockRequest = {
          on: jest.fn(),
          setTimeout: jest.fn().mockImplementation((timeout, handler) => {
            setTimeout(handler, 0);
          }),
          destroy: jest.fn()
        };
        return mockRequest;
      });

      const score = await scorer.scoreReddit('Test Phrase');
      expect(score).toBe(0);
    });
  });

  describe('Full Phrase Scoring', () => {
    test('should score a phrase with all components', async () => {
      // Mock successful external API calls
      jest.spyOn(scorer, 'scoreWikidata').mockResolvedValue(20);
      jest.spyOn(scorer, 'scoreReddit').mockResolvedValue(10);

      const result = await scorer.scorePhrase('Star Wars', 'Movies & TV');
      
      expect(result).toMatchObject({
        phrase: 'Star Wars',
        category: 'Movies & TV',
        totalScore: expect.any(Number),
        breakdown: {
          localHeuristics: expect.any(Number),
          wikidata: 20,
          reddit: 10,
          categoryBoost: expect.any(Number)
        },
        verdict: expect.any(String),
        timestamp: expect.any(String),
        cached: false
      });

      expect(result.totalScore).toBeGreaterThan(0);
      expect(result.totalScore).toBeLessThanOrEqual(100);
    });

    test('should use cache on subsequent calls', async () => {
      jest.spyOn(scorer, 'scoreWikidata').mockResolvedValue(15);
      jest.spyOn(scorer, 'scoreReddit').mockResolvedValue(5);

      // First call
      const result1 = await scorer.scorePhrase('Test Movie', 'Movies & TV');
      expect(result1.cached).toBeFalsy();

      // Second call should use cache
      const result2 = await scorer.scorePhrase('Test Movie', 'Movies & TV');
      expect(result2.cached).toBeTruthy();
      expect(result2.totalScore).toBe(result1.totalScore);
    });

    test('should skip Reddit when requested', async () => {
      jest.spyOn(scorer, 'scoreWikidata').mockResolvedValue(15);
      jest.spyOn(scorer, 'scoreReddit').mockResolvedValue(10);

      const result = await scorer.scorePhrase('Test Phrase', 'General', { skipReddit: true });
      
      expect(result.breakdown.reddit).toBe(0);
      expect(scorer.scoreReddit).not.toHaveBeenCalled();
    });

    test('should handle errors gracefully with fallback', async () => {
      jest.spyOn(scorer, 'scoreWikidata').mockRejectedValue(new Error('API Error'));
      jest.spyOn(scorer, 'scoreReddit').mockRejectedValue(new Error('API Error'));

      const result = await scorer.scorePhrase('Test Phrase', 'General');
      
      expect(result.breakdown.error).toBeDefined();
      expect(result.totalScore).toBeGreaterThan(0); // Should have local heuristics score
    });
  });

  describe('Batch Scoring', () => {
    test('should process multiple phrases', async () => {
      const phrases = [
        { phrase: 'Star Wars', category: 'Movies & TV' },
        { phrase: 'Pizza', category: 'Food & Drink' },
        { phrase: 'TikTok', category: 'Social Media' }
      ];

      jest.spyOn(scorer, 'scoreWikidata').mockResolvedValue(10);
      jest.spyOn(scorer, 'scoreReddit').mockResolvedValue(5);

      const results = await scorer.batchScore(phrases, { batchSize: 2 });
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.totalScore).toBeGreaterThan(0);
        expect(result.phrase).toBeDefined();
        expect(result.category).toBeDefined();
      });
    });

    test('should handle batch errors gracefully', async () => {
      const phrases = [
        { phrase: 'Good Phrase', category: 'Movies & TV' },
        { phrase: 'Bad Phrase', category: 'Movies & TV' }
      ];

      jest.spyOn(scorer, 'scoreWikidata')
        .mockResolvedValueOnce(10)
        .mockRejectedValueOnce(new Error('API Error'));
      jest.spyOn(scorer, 'scoreReddit').mockResolvedValue(5);

      const results = await scorer.batchScore(phrases);
      
      expect(results).toHaveLength(2);
      expect(results[0].totalScore).toBeGreaterThan(0);
      expect(results[1].breakdown.error).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty phrases', async () => {
      const score = await scorer.scoreLocalHeuristics('', 'General');
      expect(score).toBe(0);
    });

    test('should handle phrases with special characters', async () => {
      const score = await scorer.scoreLocalHeuristics('Star Wars: Episode IV', 'Movies & TV');
      expect(score).toBeGreaterThan(0);
    });

    test('should handle very short phrases', async () => {
      const score = await scorer.scoreLocalHeuristics('Hi', 'General');
      expect(score).toBeGreaterThan(0);
    });

    test('should handle phrases with numbers', async () => {
      const score = await scorer.scoreLocalHeuristics('Top 10 Movies', 'Movies & TV');
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('Real-world Examples', () => {
    test('should score popular movies highly', async () => {
      jest.spyOn(scorer, 'scoreWikidata').mockResolvedValue(25);
      jest.spyOn(scorer, 'scoreReddit').mockResolvedValue(12);

      const result = await scorer.scorePhrase('The Lion King', 'Movies & TV');
      expect(result.totalScore).toBeGreaterThan(60);
      expect(result.verdict).toMatch(/GOOD|EXCELLENT/);
    });

    test('should score technical terms lowly', async () => {
      jest.spyOn(scorer, 'scoreWikidata').mockResolvedValue(5);
      jest.spyOn(scorer, 'scoreReddit').mockResolvedValue(0);

      const result = await scorer.scorePhrase('Mitochondrial DNA Sequencing', 'Science');
      expect(result.totalScore).toBeLessThan(40);
      expect(result.verdict).toMatch(/WARNING|REJECT|BORDERLINE/);
    });

    test('should score food items moderately', async () => {
      jest.spyOn(scorer, 'scoreWikidata').mockResolvedValue(10);
      jest.spyOn(scorer, 'scoreReddit').mockResolvedValue(7);

      const result = await scorer.scorePhrase('Pepperoni Pizza', 'Food & Drink');
      expect(result.totalScore).toBeGreaterThan(30);
      expect(result.totalScore).toBeLessThan(80);
    });
  });
}); 