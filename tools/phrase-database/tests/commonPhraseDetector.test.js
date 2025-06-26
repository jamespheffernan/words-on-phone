const CommonPhraseDetector = require('../src/commonPhraseDetector');
const fs = require('fs-extra');
const path = require('path');

// Mock https module for Wikipedia API testing
const https = require('https');
jest.mock('https');

describe('CommonPhraseDetector', () => {
  let detector;
  const testDataDir = path.join(__dirname, '../data/test');
  const testCommonPhrasesFile = path.join(testDataDir, 'test-common-phrases.json');
  const testCacheFile = path.join(testDataDir, 'test-wikipedia-cache.json');

  beforeEach(async () => {
    // Clean up test files
    if (fs.existsSync(testDataDir)) {
      fs.removeSync(testDataDir);
    }
    
    // Create detector with test configuration
    detector = new CommonPhraseDetector({
      commonPhrasesFile: testCommonPhrasesFile,
      cacheFile: testCacheFile,
      enableWikipediaCheck: true,
      requestDelay: 10, // Fast for testing
      wikipediaTimeout: 1000
    });
    
    // Clear mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(testDataDir)) {
      fs.removeSync(testDataDir);
    }
  });

  describe('Local Commonality Checks', () => {
    test('should reject phrases in common phrases database', async () => {
      // Create test common phrases file
      fs.ensureDirSync(testDataDir);
      fs.writeJsonSync(testCommonPhrasesFile, ['harry potter', 'star wars', 'the matrix']);
      
      // Recreate detector to pick up new file
      detector = new CommonPhraseDetector({
        commonPhrasesFile: testCommonPhrasesFile,
        enableWikipediaCheck: false
      });
      
      const result = await detector.checkCommonality('Harry Potter');
      
      expect(result.isTooCommon).toBe(true);
      expect(result.reason).toBe('Exact match in common phrases database');
      expect(result.details.type).toBe('LOCAL_EXACT_MATCH');
      expect(result.details.phrase).toBe('harry potter');
    });

    test('should reject very common single words', async () => {
      const result = await detector.checkCommonality('the');
      
      expect(result.isTooCommon).toBe(true);
      expect(result.reason).toBe('Very common single word');
      expect(result.details.type).toBe('COMMON_SINGLE_WORD');
      expect(result.details.wordCount).toBe(1);
    });

    test('should reject very common multi-word phrases', async () => {
      const result = await detector.checkCommonality('in the');
      
      expect(result.isTooCommon).toBe(true);
      expect(result.reason).toBe('Very common multi-word phrase');
      expect(result.details.type).toBe('COMMON_PHRASE');
      expect(result.details.wordCount).toBe(2);
    });

    test('should allow uncommon phrases', async () => {
      const result = await detector.checkCommonality('Quantum Entanglement Theory');
      
      expect(result.isTooCommon).toBe(false);
      expect(result.reason).toBe('Phrase passed all commonality checks');
      expect(result.details.localCheck.type).toBe('LOCAL_CHECK_PASSED');
    });

    test('should handle case insensitive matching', async () => {
      const testCases = ['THE', 'The', 'tHe', 'IN THE', 'To Be'];
      
      for (const phrase of testCases) {
        const result = await detector.checkCommonality(phrase);
        expect(result.isTooCommon).toBe(true);
      }
    });
  });

  describe('Wikipedia API Integration', () => {
    test('should reject phrases that exist as Wikipedia articles', async () => {
      // Mock successful Wikipedia response
      const mockResponse = {
        statusCode: 200,
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            callback(JSON.stringify({
              type: 'standard',
              title: 'Harry Potter',
              extract: 'Harry Potter is a series of seven fantasy novels written by British author J. K. Rowling...',
              content_urls: {
                desktop: { page: 'https://en.wikipedia.org/wiki/Harry_Potter' }
              }
            }));
          } else if (event === 'end') {
            callback();
          }
        })
      };

      const mockRequest = {
        on: jest.fn(),
        destroy: jest.fn()
      };

      https.get.mockImplementation((url, options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });

      const result = await detector.checkCommonality('Harry Potter');
      
      expect(result.isTooCommon).toBe(true);
      expect(result.reason).toBe('Phrase exists as Wikipedia article');
      expect(result.details.type).toBe('WIKIPEDIA_ARTICLE');
      expect(result.details.title).toBe('Harry Potter');
    });

    test('should reject disambiguation pages', async () => {
      const mockResponse = {
        statusCode: 200,
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            callback(JSON.stringify({
              type: 'disambiguation',
              title: 'Mercury',
              content_urls: {
                desktop: { page: 'https://en.wikipedia.org/wiki/Mercury' }
              }
            }));
          } else if (event === 'end') {
            callback();
          }
        })
      };

      const mockRequest = {
        on: jest.fn(),
        destroy: jest.fn()
      };

      https.get.mockImplementation((url, options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });

      const result = await detector.checkCommonality('Mercury');
      
      expect(result.isTooCommon).toBe(true);
      expect(result.reason).toBe('Phrase is Wikipedia disambiguation page');
      expect(result.details.type).toBe('WIKIPEDIA_DISAMBIGUATION');
    });

    test('should allow phrases not found on Wikipedia', async () => {
      const mockResponse = {
        statusCode: 404,
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            callback('');
          } else if (event === 'end') {
            callback();
          }
        })
      };

      const mockRequest = {
        on: jest.fn(),
        destroy: jest.fn()
      };

      https.get.mockImplementation((url, options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });

      const result = await detector.checkCommonality('Unlikely Phrase That Does Not Exist');
      
      expect(result.isTooCommon).toBe(false);
      expect(result.details.wikipediaCheck.type).toBe('WIKIPEDIA_NOT_FOUND');
    });

    test('should handle Wikipedia API errors gracefully', async () => {
      const mockRequest = {
        on: jest.fn((event, callback) => {
          if (event === 'error') {
            setImmediate(() => callback(new Error('Network error')));
          }
        }),
        destroy: jest.fn()
      };

      https.get.mockImplementation(() => {
        setImmediate(() => {
          const errorCallback = mockRequest.on.mock.calls.find(call => call[0] === 'error');
          if (errorCallback) {
            errorCallback[1](new Error('Network error'));
          }
        });
        return mockRequest;
      });

      const result = await detector.checkCommonality('Test Network Error Phrase');
      
      expect(result.isTooCommon).toBe(false);
      expect(result.reason).toBe('Wikipedia API error - phrase allowed by default');
      expect(result.details.type).toBe('WIKIPEDIA_API_ERROR');
    });

    test('should handle Wikipedia API timeout', async () => {
      const mockRequest = {
        on: jest.fn((event, callback) => {
          if (event === 'timeout') {
            setImmediate(callback);
          }
        }),
        destroy: jest.fn()
      };

      https.get.mockImplementation(() => {
        setImmediate(() => {
          const timeoutCallback = mockRequest.on.mock.calls.find(call => call[0] === 'timeout');
          if (timeoutCallback) {
            timeoutCallback[1]();
          }
        });
        return mockRequest;
      });

      const result = await detector.checkCommonality('Test Timeout Phrase');
      
      expect(result.isTooCommon).toBe(false);
      expect(result.details.type).toBe('WIKIPEDIA_API_ERROR');
    });
  });

  describe('Caching System', () => {
    test('should cache Wikipedia API results', async () => {
      // Mock first request
      const mockResponse = {
        statusCode: 404,
        on: jest.fn((event, callback) => {
          if (event === 'data') callback('');
          else if (event === 'end') callback();
        })
      };

      const mockRequest = { on: jest.fn(), destroy: jest.fn() };
      https.get.mockImplementation((url, options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });

      // First call should hit API
      await detector.checkCommonality('test phrase');
      expect(https.get).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await detector.checkCommonality('test phrase');
      expect(https.get).toHaveBeenCalledTimes(1); // Still only 1 call
    });

    test('should persist cache to disk', async () => {
      // Create detector with test cache file that will be used
      const localDetector = new CommonPhraseDetector({
        cacheFile: testCacheFile,
        enableWikipediaCheck: true
      });

      // Mock Wikipedia response
      const mockResponse = {
        statusCode: 404,
        on: jest.fn((event, callback) => {
          if (event === 'data') callback('');
          else if (event === 'end') callback();
        })
      };

      const mockRequest = { on: jest.fn(), destroy: jest.fn() };
      https.get.mockImplementation((url, options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });

      await localDetector.checkCommonality('test cache phrase');
      
      // Check that cache file was created
      expect(fs.existsSync(testCacheFile)).toBe(true);
      
      const cacheData = fs.readJsonSync(testCacheFile);
      expect(cacheData['test cache phrase']).toBeDefined();
    });

    test('should load cache from disk on initialization', async () => {
      // Create cache file
      fs.ensureDirSync(testDataDir);
      fs.writeJsonSync(testCacheFile, {
        'cached phrase from disk': {
          isTooCommon: true,
          reason: 'Cached result',
          details: { type: 'CACHED' }
        }
      });

      // Create new detector that should load the cache
      const newDetector = new CommonPhraseDetector({
        cacheFile: testCacheFile,
        enableWikipediaCheck: true
      });

      const result = await newDetector.checkCommonality('cached phrase from disk');
      
      expect(result.reason).toBe('Cached result');
      expect(result.details.type).toBe('CACHED');
      expect(https.get).not.toHaveBeenCalled();
    });
  });

  describe('Batch Processing', () => {
    test('should process multiple phrases correctly', async () => {
      // Disable Wikipedia for simpler testing
      detector = new CommonPhraseDetector({
        enableWikipediaCheck: false,
        commonPhrasesFile: testCommonPhrasesFile
      });

      const phrases = [
        'Quantum Computing',  // Should pass
        'the',               // Should be rejected (common word)
        'Unique Game Phrase', // Should pass
        'in the'             // Should be rejected (common phrase)
      ];

      const result = await detector.checkBatch(phrases);

      expect(result.summary.total).toBe(4);
      expect(result.summary.approved).toBe(2);
      expect(result.summary.rejected).toBe(2);
      expect(result.summary.rejectionRate).toBe('50.0');

      // Check approved phrases
      const approvedPhrases = result.approved.map(a => a.phrase);
      expect(approvedPhrases).toContain('Quantum Computing');
      expect(approvedPhrases).toContain('Unique Game Phrase');

      // Check rejected phrases
      const rejectedPhrases = result.rejected.map(r => r.phrase);
      expect(rejectedPhrases).toContain('the');
      expect(rejectedPhrases).toContain('in the');
    });

    test('should handle empty batch', async () => {
      const result = await detector.checkBatch([]);
      
      expect(result.summary.total).toBe(0);
      expect(result.summary.approved).toBe(0);
      expect(result.summary.rejected).toBe(0);
      expect(result.approved).toHaveLength(0);
      expect(result.rejected).toHaveLength(0);
    });

    test('should throw error for invalid input', async () => {
      await expect(detector.checkBatch('not an array')).rejects.toThrow('Phrases must be an array');
      await expect(detector.checkBatch(null)).rejects.toThrow('Phrases must be an array');
      await expect(detector.checkBatch(undefined)).rejects.toThrow('Phrases must be an array');
    });
  });

  describe('Configuration and Statistics', () => {
    test('should return current configuration', () => {
      const config = detector.getConfig();
      
      expect(config).toHaveProperty('wikipediaApiUrl');
      expect(config).toHaveProperty('thresholds');
      expect(config).toHaveProperty('enableWikipediaCheck');
      expect(config).toHaveProperty('enableLocalCheck');
      expect(config.thresholds).toHaveProperty('tooCommon');
      expect(config.thresholds).toHaveProperty('veryCommon');
      expect(config.thresholds).toHaveProperty('moderatelyCommon');
    });

    test('should return statistics', () => {
      const stats = detector.getStats();
      
      expect(stats).toHaveProperty('commonPhrasesCount');
      expect(stats).toHaveProperty('cacheSize');
      expect(stats).toHaveProperty('wikipediaEnabled');
      expect(stats).toHaveProperty('localCheckEnabled');
      expect(stats).toHaveProperty('thresholds');
      
      expect(typeof stats.commonPhrasesCount).toBe('number');
      expect(typeof stats.cacheSize).toBe('number');
      expect(typeof stats.wikipediaEnabled).toBe('boolean');
      expect(typeof stats.localCheckEnabled).toBe('boolean');
    });

    test('should create default common phrases file if none exists', () => {
      // The detector should have created default common phrases
      expect(fs.existsSync(testCommonPhrasesFile)).toBe(true);
      
      const commonPhrases = fs.readJsonSync(testCommonPhrasesFile);
      expect(Array.isArray(commonPhrases)).toBe(true);
      expect(commonPhrases.length).toBeGreaterThan(0);
      expect(commonPhrases).toContain('hello world');
      expect(commonPhrases).toContain('united states');
    });

    test('should allow custom configuration', () => {
      const customDetector = new CommonPhraseDetector({
        enableWikipediaCheck: false,
        enableLocalCheck: true,
        thresholds: {
          tooCommon: 0.9,
          veryCommon: 0.7,
          moderatelyCommon: 0.5
        },
        requestDelay: 200,
        maxCacheSize: 500
      });

      const config = customDetector.getConfig();
      
      expect(config.enableWikipediaCheck).toBe(false);
      expect(config.enableLocalCheck).toBe(true);
      expect(config.thresholds.tooCommon).toBe(0.9);
      expect(config.thresholds.veryCommon).toBe(0.7);
      expect(config.thresholds.moderatelyCommon).toBe(0.5);
      expect(config.requestDelay).toBe(200);
      expect(config.maxCacheSize).toBe(500);
    });
  });

  describe('Error Handling', () => {
    test('should handle corrupted common phrases file', () => {
      // Create corrupted file
      fs.ensureDirSync(testDataDir);
      fs.writeFileSync(testCommonPhrasesFile, 'invalid json content');

      // Should not crash, just log error and continue
      expect(() => {
        new CommonPhraseDetector({
          commonPhrasesFile: testCommonPhrasesFile,
          enableWikipediaCheck: false
        });
      }).not.toThrow();
    });

    test('should handle corrupted cache file', () => {
      // Create corrupted cache file
      fs.ensureDirSync(testDataDir);
      fs.writeFileSync(testCacheFile, 'invalid json content');

      // Should not crash, just log error and continue
      expect(() => {
        new CommonPhraseDetector({
          cacheFile: testCacheFile,
          enableWikipediaCheck: false
        });
      }).not.toThrow();
    });

    test('should handle phrases with special characters', async () => {
      const specialPhrases = [
        'Café Français',
        'Señor José',
        'München Germany',
        'Title with "quotes"',
        'Symbol & Company'
      ];

      for (const phrase of specialPhrases) {
        const result = await detector.checkCommonality(phrase);
        expect(result).toHaveProperty('isTooCommon');
        expect(result).toHaveProperty('reason');
        expect(result).toHaveProperty('details');
      }
    });

    test('should handle very long phrases', async () => {
      const longPhrase = 'This is a very long phrase that contains many words and should be handled gracefully by the common phrase detector';
      
      const result = await detector.checkCommonality(longPhrase);
      
      expect(result).toHaveProperty('isTooCommon');
      expect(result).toHaveProperty('reason');
      expect(result).toHaveProperty('details');
    });

    test('should handle empty and whitespace phrases', async () => {
      const edgeCases = ['', '   ', '\t\n', '  \t  \n  '];

      for (const phrase of edgeCases) {
        const result = await detector.checkCommonality(phrase);
        expect(result).toHaveProperty('isTooCommon');
        expect(result).toHaveProperty('reason');
      }
    });
  });

  describe('Rate Limiting', () => {
    test('should respect rate limiting between requests', async () => {
      const detector = new CommonPhraseDetector({
        requestDelay: 100,
        enableWikipediaCheck: true
      });

      // Mock Wikipedia responses
      const mockResponse = {
        statusCode: 404,
        on: jest.fn((event, callback) => {
          if (event === 'data') callback('');
          else if (event === 'end') callback();
        })
      };

      const mockRequest = { on: jest.fn(), destroy: jest.fn() };
      https.get.mockImplementation((url, options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });

      const startTime = Date.now();
      
      // Make two requests that should be rate limited
      await detector.checkCommonality('phrase 1');
      await detector.checkCommonality('phrase 2');
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should take at least the request delay time
      expect(duration).toBeGreaterThanOrEqual(100);
    });
  });
}); 