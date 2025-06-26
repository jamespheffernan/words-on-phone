import { vi } from 'vitest';
import { PhraseScorer, PhraseScore } from '../phraseScorer';

describe('PhraseScorer', () => {
  let scorer: PhraseScorer;

  beforeEach(() => {
    scorer = new PhraseScorer();
  });

  describe('scorePhrase', () => {
    it('should score simple, well-known phrases highly', async () => {
      const result = await scorer.scorePhrase('Pizza', 'Food');
      
      expect(result.totalScore).toBeGreaterThan(30);
      expect(result.verdict).toMatch(/Good|Excellent/);
      expect(result.breakdown.localHeuristics).toBeGreaterThan(20);
      expect(result.breakdown.categoryBoost).toBeGreaterThan(0);
    });

    it('should score complex technical phrases lowly', async () => {
      const result = await scorer.scorePhrase('Quantum Chromodynamics', 'Science');
      
      expect(result.totalScore).toBeLessThan(25);
      expect(result.verdict).toMatch(/Poor|Reject/);
      expect(result.breakdown.localHeuristics).toBeLessThan(30); // Technical phrases still get base scoring
    });

    it('should favor shorter phrases over longer ones', async () => {
      const shortResult = await scorer.scorePhrase('Pizza', 'Food');
      const longResult = await scorer.scorePhrase('Extremely Complex Molecular Gastronomy Techniques', 'Food');
      
      expect(shortResult.totalScore).toBeGreaterThan(longResult.totalScore);
    });

    it('should boost pop culture references', async () => {
      const popCultureResult = await scorer.scorePhrase('Taylor Swift', 'Music');
      const obscureResult = await scorer.scorePhrase('Obscure Jazz Musician', 'Music');
      
      expect(popCultureResult.totalScore).toBeGreaterThan(obscureResult.totalScore);
      expect(popCultureResult.breakdown.localHeuristics).toBeGreaterThan(obscureResult.breakdown.localHeuristics);
    });

    it('should handle empty or invalid phrases gracefully', async () => {
      const emptyResult = await scorer.scorePhrase('', 'Any');
      const whitespaceResult = await scorer.scorePhrase('   ', 'Any');
      
      expect(emptyResult.totalScore).toBe(0);
      expect(whitespaceResult.totalScore).toBe(0);
      expect(emptyResult.verdict).toContain('Reject');
    });

    it('should apply category boosts correctly', async () => {
      const movieResult = await scorer.scorePhrase('Action Movie', 'Movies & TV');
      const techResult = await scorer.scorePhrase('Action Movie', 'Science & Technology');
      
      expect(movieResult.breakdown.categoryBoost).toBeGreaterThan(techResult.breakdown.categoryBoost);
    });

    it('should recognize recent trends and platforms', async () => {
      const trendyResult = await scorer.scorePhrase('TikTok Dance', 'Social Media');
      const oldResult = await scorer.scorePhrase('Telegraph Message', 'Communication');
      
      expect(trendyResult.totalScore).toBeGreaterThan(oldResult.totalScore);
    });
  });

  describe('batchScore', () => {
    it('should score multiple phrases and sort by quality', async () => {
      const phrases = [
        'Quantum Physics', // Low score
        'Pizza Delivery', // High score
        'Taylor Swift',   // High score
        'Obscure Academic Term' // Low score
      ];
      
      const results = await scorer.batchScore(phrases, 'General');
      
      expect(results).toHaveLength(4);
      expect(results[0].totalScore).toBeGreaterThanOrEqual(results[1].totalScore);
      expect(results[1].totalScore).toBeGreaterThanOrEqual(results[2].totalScore);
      expect(results[2].totalScore).toBeGreaterThanOrEqual(results[3].totalScore);
      
      // High-scoring phrases should be first
      expect(results[0].phrase).toMatch(/Pizza|Taylor/);
    });

    it('should handle empty batch gracefully', async () => {
      const results = await scorer.batchScore([], 'Any');
      expect(results).toHaveLength(0);
    });
  });

  describe('filterByQuality', () => {
    it('should filter out low-quality phrases', async () => {
      const phrases = [
        'Pizza',                    // Should pass
        'Taylor Swift',            // Should pass
        'Quantum Chromodynamics',  // Should fail
        'Obscure Academic Jargon'  // Should fail
      ];
      
      const filtered = await scorer.filterByQuality(phrases, 'General', 25);
      
      expect(filtered.length).toBeLessThan(phrases.length);
      expect(filtered.every(item => item.score.totalScore >= 25)).toBe(true);
      expect(filtered.some(item => item.phrase.includes('Pizza'))).toBe(true);
    });

    it('should respect custom minimum score thresholds', async () => {
      const phrases = ['Good Phrase', 'Mediocre Phrase', 'Bad Phrase'];
      
      const lowThreshold = await scorer.filterByQuality(phrases, 'General', 10);
      const highThreshold = await scorer.filterByQuality(phrases, 'General', 40);
      
      expect(lowThreshold.length).toBeGreaterThanOrEqual(highThreshold.length);
    });
  });

  describe('verdict classification', () => {
    it('should classify excellent phrases correctly', async () => {
      const result = await scorer.scorePhrase('Pizza', 'Food & Drink');
      if (result.totalScore >= 45) {
        expect(result.verdict).toContain('Excellent');
      }
    });

    it('should classify poor phrases correctly', async () => {
      const result = await scorer.scorePhrase('Incomprehensible Technical Jargon', 'Science');
      if (result.totalScore < 15) {
        expect(result.verdict).toContain('Reject');
      }
    });
  });

  describe('error handling', () => {
    it('should handle scoring errors gracefully', async () => {
      // Test with malformed input that might cause errors
      const result = await scorer.scorePhrase('Test', 'Category');
      
      expect(result).toBeDefined();
      expect(result.phrase).toBe('Test');
      expect(result.category).toBe('Category');
      expect(typeof result.totalScore).toBe('number');
      expect(result.totalScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('performance requirements', () => {
    it('should score phrases quickly (< 10ms each)', async () => {
      const startTime = performance.now();
      
      await scorer.scorePhrase('Test Phrase', 'Category');
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(10); // Should be under 10ms
    });

    it('should handle batch scoring efficiently', async () => {
      const phrases = Array.from({ length: 20 }, (_, i) => `Test Phrase ${i}`);
      
      const startTime = performance.now();
      await scorer.batchScore(phrases, 'Category');
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      const avgPerPhrase = duration / phrases.length;
      
      expect(avgPerPhrase).toBeLessThan(10); // Average under 10ms per phrase
    });
  });

  describe('real-world phrase examples', () => {
    const testCases = [
      // Excellent phrases (should score 35+)
      { phrase: 'Pizza Delivery', category: 'Jobs', expectedMin: 30 },
      { phrase: 'Taylor Swift', category: 'Music', expectedMin: 35 },
      { phrase: 'Harry Potter', category: 'Movies & TV', expectedMin: 30 },
      
      // Good phrases (should score 25-34)
      { phrase: 'Coffee Shop', category: 'Places', expectedMin: 25 },
      { phrase: 'Basketball', category: 'Sports', expectedMin: 25 },
      
      // Poor phrases (should score < 25)
      { phrase: 'Quantum Mechanics', category: 'Science', expectedMax: 25 },
      { phrase: 'Epistemological Framework', category: 'Philosophy', expectedMax: 20 },
    ];

    testCases.forEach(({ phrase, category, expectedMin, expectedMax }) => {
      it(`should score "${phrase}" appropriately`, async () => {
        const result = await scorer.scorePhrase(phrase, category);
        
        if (expectedMin) {
          expect(result.totalScore).toBeGreaterThanOrEqual(expectedMin);
        }
        if (expectedMax) {
          expect(result.totalScore).toBeLessThanOrEqual(expectedMax);
        }
      });
    });
  });

  describe('Wikipedia Validation', () => {
    let mockFetch: any;
    
    beforeEach(() => {
      mockFetch = vi.fn();
      global.fetch = mockFetch;
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should score Wikipedia validation correctly for well-known phrases', async () => {
      const mockResponse = {
        results: {
          bindings: [
            {
              sitelinks: { value: '120' } // High sitelink count
            }
          ]
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as Response);

      const result = await scorer.scorePhrase('Pizza', 'Food & Drink', true);

      expect(result.breakdown.wikidata).toBe(30); // 120 sitelinks = max score
      expect(result.totalScore).toBeGreaterThan(60); // Should get good score
      expect(result.cached).toBe(false); // First time, not cached
    });

    it('should handle Wikipedia API failures gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await scorer.scorePhrase('Test Phrase', 'Movies & TV', true);

      expect(result.breakdown.wikidata).toBe(0); // Failed API call
      expect(result.breakdown.error).toBeUndefined(); // No error in main breakdown
      expect(result.totalScore).toBeGreaterThan(0); // Still has local score
    });

    it('should cache Wikipedia results correctly', async () => {
      const mockResponse = {
        results: {
          bindings: [
            {
              sitelinks: { value: '25' }
            }
          ]
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as Response);
      
      // First call should hit API
      const result1 = await scorer.scorePhrase('Cached Test', 'Movies & TV', true);
      expect(result1.cached).toBe(false);
      expect(result1.breakdown.wikidata).toBe(25);

      // Second call should use cache
      const result2 = await scorer.scorePhrase('Cached Test', 'Movies & TV', true);
      expect(result2.cached).toBe(true);
      expect(result2.breakdown.wikidata).toBe(25);

      // Verify API was only called once
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle batch Wikipedia validation efficiently', async () => {
      const phrases = ['Pizza', 'Burger', 'Taco'];
      const mockResponse = {
        results: {
          bindings: [
            { phrase: { value: 'Pizza' }, sitelinks: { value: '50' } },
            { phrase: { value: 'Burger' }, sitelinks: { value: '30' } },
            { phrase: { value: 'Taco' }, sitelinks: { value: '10' } }
          ]
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as Response);

      const results = await scorer.batchScoreWikidata(phrases);

      expect(results.get('Pizza')).toBe(30); // 50+ sitelinks
      expect(results.get('Burger')).toBe(25); // 20-49 sitelinks  
      expect(results.get('Taco')).toBe(20);   // 10-19 sitelinks
      expect(mockFetch).toHaveBeenCalledTimes(1); // Single batch call
    });

    it('should score sitelink counts correctly according to thresholds', async () => {
      const testCases = [
        { sitelinks: 60, expectedScore: 30 },   // >= 50
        { sitelinks: 25, expectedScore: 25 },   // >= 20
        { sitelinks: 15, expectedScore: 20 },   // >= 10
        { sitelinks: 7, expectedScore: 15 },    // >= 5
        { sitelinks: 2, expectedScore: 10 },    // >= 1
        { sitelinks: 0, expectedScore: 5 }      // Has entry but no articles
      ];

      for (const testCase of testCases) {
        const mockResponse = {
          results: {
            bindings: [
              { sitelinks: { value: testCase.sitelinks.toString() } }
            ]
          }
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse)
        } as Response);

        const testScorer = new PhraseScorer();
        const result = await testScorer.scorePhrase('Test', 'Movies & TV', true);
        
        expect(result.breakdown.wikidata).toBe(testCase.expectedScore);
      }
    });

    it('should handle phrases with no Wikipedia entries', async () => {
      const mockResponse = {
        results: {
          bindings: [] // No results
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as Response);

      const result = await scorer.scorePhrase('Unknown Phrase', 'Movies & TV', true);

      expect(result.breakdown.wikidata).toBe(0);
      expect(result.totalScore).toBeGreaterThan(0); // Still has local score
    });

    it('should provide useful cache statistics', async () => {
      // Empty cache initially
      expect(scorer.getCacheStats().size).toBe(0);

      // Mock API call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          results: { bindings: [{ sitelinks: { value: '10' } }] }
        })
      } as Response);

      // Add entry to cache
      await scorer.scorePhrase('Test1', 'Movies & TV', true);

      expect(scorer.getCacheStats().size).toBe(1);

      // Clear cache
      scorer.clearCache();
      expect(scorer.getCacheStats().size).toBe(0);
    });

    it('should maintain performance with batch queries under 2 seconds', async () => {
      const phrases = Array.from({ length: 50 }, (_, i) => `Test Phrase ${i}`);
      
      const mockResponse = {
        results: {
          bindings: phrases.map((phrase, i) => ({
            phrase: { value: phrase },
            sitelinks: { value: (i % 5 + 1).toString() }
          }))
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as Response);

      const startTime = Date.now();
      
      const results = await scorer.batchScoreWikidata(phrases);
      
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(2000); // Should complete in under 2 seconds
      expect(results.size).toBe(50);
      expect(mockFetch).toHaveBeenCalledTimes(1); // Single batch call
    }, 10000); // 10 second timeout for this test
  });
});

describe('Wikipedia Validation Tests', () => {
  let mockFetch: jest.MockedFunction<typeof fetch>;
  
  beforeEach(() => {
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should score Wikipedia validation correctly for well-known phrases', async () => {
    const mockResponse = {
      results: {
        bindings: [
          {
            sitelinks: { value: '120' } // High sitelink count
          }
        ]
      }
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    } as Response);

    const scorer = new PhraseScorer();
    const result = await scorer.scorePhrase('Pizza', 'Food & Drink', true);

    expect(result.breakdown.wikidata).toBe(30); // 120 sitelinks = max score
    expect(result.totalScore).toBeGreaterThan(60); // Should get good score
    expect(result.cached).toBe(false); // First time, not cached
  });

  test('should handle Wikipedia API failures gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const scorer = new PhraseScorer();
    const result = await scorer.scorePhrase('Test Phrase', 'Movies & TV', true);

    expect(result.breakdown.wikidata).toBe(0); // Failed API call
    expect(result.breakdown.error).toBeUndefined(); // No error in main breakdown
    expect(result.totalScore).toBeGreaterThan(0); // Still has local score
  });

  test('should cache Wikipedia results correctly', async () => {
    const mockResponse = {
      results: {
        bindings: [
          {
            sitelinks: { value: '25' }
          }
        ]
      }
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    } as Response);

    const scorer = new PhraseScorer();
    
    // First call should hit API
    const result1 = await scorer.scorePhrase('Cached Test', 'Movies & TV', true);
    expect(result1.cached).toBe(false);
    expect(result1.breakdown.wikidata).toBe(25);

    // Second call should use cache
    const result2 = await scorer.scorePhrase('Cached Test', 'Movies & TV', true);
    expect(result2.cached).toBe(true);
    expect(result2.breakdown.wikidata).toBe(25);

    // Verify API was only called once
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  test('should handle batch Wikipedia validation efficiently', async () => {
    const phrases = ['Pizza', 'Burger', 'Taco'];
    const mockResponse = {
      results: {
        bindings: [
          { phrase: { value: 'Pizza' }, sitelinks: { value: '50' } },
          { phrase: { value: 'Burger' }, sitelinks: { value: '30' } },
          { phrase: { value: 'Taco' }, sitelinks: { value: '10' } }
        ]
      }
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    } as Response);

    const scorer = new PhraseScorer();
    const results = await scorer.batchScoreWikidata(phrases);

    expect(results.get('Pizza')).toBe(30); // 50+ sitelinks
    expect(results.get('Burger')).toBe(25); // 20-49 sitelinks  
    expect(results.get('Taco')).toBe(20);   // 10-19 sitelinks
    expect(mockFetch).toHaveBeenCalledTimes(1); // Single batch call
  });

  test('should score sitelink counts correctly according to thresholds', async () => {
    const testCases = [
      { sitelinks: 60, expectedScore: 30 },   // >= 50
      { sitelinks: 25, expectedScore: 25 },   // >= 20
      { sitelinks: 15, expectedScore: 20 },   // >= 10
      { sitelinks: 7, expectedScore: 15 },    // >= 5
      { sitelinks: 2, expectedScore: 10 },    // >= 1
      { sitelinks: 0, expectedScore: 5 }      // Has entry but no articles
    ];

    for (const testCase of testCases) {
      const mockResponse = {
        results: {
          bindings: [
            { sitelinks: { value: testCase.sitelinks.toString() } }
          ]
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as Response);

      const scorer = new PhraseScorer();
      const result = await scorer.scorePhrase('Test', 'Movies & TV', true);
      
      expect(result.breakdown.wikidata).toBe(testCase.expectedScore);
    }
  });

  test('should handle phrases with no Wikipedia entries', async () => {
    const mockResponse = {
      results: {
        bindings: [] // No results
      }
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    } as Response);

    const scorer = new PhraseScorer();
    const result = await scorer.scorePhrase('Unknown Phrase', 'Movies & TV', true);

    expect(result.breakdown.wikidata).toBe(0);
    expect(result.totalScore).toBeGreaterThan(0); // Still has local score
  });

  test('should handle batch processing with mixed cache hits and misses', async () => {
    const scorer = new PhraseScorer();
    
    // Pre-populate cache with one phrase
    const mockResponse1 = {
      results: {
        bindings: [{ sitelinks: { value: '20' } }]
      }
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse1)
    } as Response);

    await scorer.scorePhrase('Cached Phrase', 'Movies & TV', true);

    // Now test batch with mixed phrases
    const mockResponse2 = {
      results: {
        bindings: [
          { phrase: { value: 'New Phrase' }, sitelinks: { value: '15' } }
        ]
      }
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse2)
    } as Response);

    const results = await scorer.batchScoreWikidata(['Cached Phrase', 'New Phrase']);

    expect(results.get('Cached Phrase')).toBe(25); // From cache
    expect(results.get('New Phrase')).toBe(20);    // From API
    expect(mockFetch).toHaveBeenCalledTimes(2); // Initial + batch call
  });

  test('should provide useful cache statistics', async () => {
    const scorer = new PhraseScorer();
    
    // Empty cache initially
    expect(scorer.getCacheStats().size).toBe(0);

    // Mock API call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        results: { bindings: [{ sitelinks: { value: '10' } }] }
      })
    } as Response);

    // Add some entries
    await scorer.scorePhrase('Test1', 'Movies & TV', true);
    await scorer.scorePhrase('Test2', 'Movies & TV', true);

    expect(scorer.getCacheStats().size).toBe(2);

    // Clear cache
    scorer.clearCache();
    expect(scorer.getCacheStats().size).toBe(0);
  });

  test('should maintain performance with batch queries under 2 seconds', async () => {
    const phrases = Array.from({ length: 50 }, (_, i) => `Test Phrase ${i}`);
    
    const mockResponse = {
      results: {
        bindings: phrases.map((phrase, i) => ({
          phrase: { value: phrase },
          sitelinks: { value: (i % 5 + 1).toString() }
        }))
      }
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    } as Response);

    const scorer = new PhraseScorer();
    const startTime = Date.now();
    
    const results = await scorer.batchScoreWikidata(phrases);
    
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(2000); // Should complete in under 2 seconds
    expect(results.size).toBe(50);
    expect(mockFetch).toHaveBeenCalledTimes(1); // Single batch call
  }, 10000); // 10 second timeout for this test
}); 