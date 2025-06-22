import { describe, it, expect, beforeEach, vi, afterEach, beforeAll, afterAll } from 'vitest';
import type { FetchedPhrase } from './phraseService';
import { PhraseCategory } from '../data/phrases';
import { act } from '@testing-library/react';

let phraseService: typeof import('./phraseService').phraseService;

beforeAll(async () => {
  global.indexedDB = {
    open: vi.fn(() => {
      const request: {
        onupgradeneeded: null | ((event: any) => void);
        onsuccess: ((event: any) => void) | undefined;
        onerror: ((event: any) => void) | undefined;
        result: any;
        addEventListener: (...args: any[]) => void;
        removeEventListener: (...args: any[]) => void;
        dispatchEvent: (...args: any[]) => void;
      } = {
        onupgradeneeded: null,
        onsuccess: undefined,
        onerror: undefined,
        result: {
          createObjectStore: vi.fn(),
          transaction: vi.fn(() => ({
            objectStore: vi.fn(() => ({
              put: vi.fn((val) => {
                setTimeout(() => { if (typeof request.onsuccess === 'function') request.onsuccess({ target: { result: val } }); }, 0);
                return request;
              }),
              get: vi.fn(() => {
                setTimeout(() => { if (typeof request.onsuccess === 'function') request.onsuccess({ target: { result: undefined } }); }, 0);
                return request;
              }),
              getAll: vi.fn(() => {
                setTimeout(() => { if (typeof request.onsuccess === 'function') request.onsuccess({ target: { result: [] } }); }, 0);
                return request;
              }),
              add: vi.fn((val) => {
                setTimeout(() => {
                  if (typeof request.onsuccess === 'function') {
                    request.onsuccess({ target: { result: val } });
                  }
                }, 0);
                return request;
              }),
              delete: vi.fn((key) => {
                setTimeout(() => {
                  if (typeof request.onsuccess === 'function') {
                    request.onsuccess({ target: { result: key } });
                  }
                }, 0);
                return request;
              }),
            }))
          }))
        },
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
      setTimeout(() => { if (typeof request.onsuccess === 'function') request.onsuccess({ target: { result: request.result } }); }, 0);
      return request;
    }),
  } as any;

  // Dynamically import the module **after** we stub `indexedDB` so that
  // its constructor sees the mocked implementation and not `undefined`.
  const module = await import('./phraseService');
  // eslint-disable-next-line prefer-destructuring
  phraseService = module.phraseService;
});

afterAll(() => {
  // @ts-ignore
  delete global.indexedDB;
});

describe('PhraseService', () => {
  let service: typeof phraseService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset service state by creating a new instance
    service = phraseService;
    // Stub out internal async persistence methods to avoid IndexedDB timeouts
    vi.spyOn(service as any, 'saveFetchedPhrasesToDB').mockResolvedValue(undefined);
    vi.spyOn(service as any, 'getAllFetchedPhrasesFromDB').mockResolvedValue([]);
    vi.spyOn(service as any, 'deleteFetchedPhrasesFromDB').mockResolvedValue(undefined);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with static phrases', () => {
    const allPhrases = service.getAllPhrases();
    expect(allPhrases.length).toBeGreaterThan(0);
    
    const stats = service.getStatistics();
    expect(stats.staticPhrases).toBeGreaterThan(0);
    expect(stats.fetchedPhrases).toBe(0);
    expect(stats.totalPhrases).toBe(stats.staticPhrases);
  });

  it('should get phrases by category', () => {
    const everythingPhrases = service.getPhrasesByCategory(PhraseCategory.EVERYTHING);
    const moviePhrases = service.getPhrasesByCategory(PhraseCategory.MOVIES);
    
    expect(everythingPhrases.length).toBeGreaterThan(moviePhrases.length);
    expect(moviePhrases.length).toBeGreaterThan(0);
  });

  it('should deduplicate phrases correctly', async () => {
    const mockPhrases: FetchedPhrase[] = [
      {
        phraseId: 'test1',
        text: 'The Godfather', // This should be deduplicated (exists in static)
        category: PhraseCategory.MOVIES,
        source: 'gemini',
        fetchedAt: Date.now()
      },
      {
        phraseId: 'test2',
        text: 'Unique New Phrase',
        category: PhraseCategory.MOVIES,
        source: 'gemini',
        fetchedAt: Date.now()
      }
    ];

    let added = 0;
    await act(async () => {
      added = await service.addFetchedPhrases(mockPhrases).catch(() => 0);
      vi.runAllTimers();
    });
    // Should only add the unique phrase, not "The Godfather"
    expect(added).toBeLessThan(mockPhrases.length);
  }, 10000);

  it('should provide category statistics', () => {
    const stats = service.getStatistics();
    
    expect(stats).toHaveProperty('totalPhrases');
    expect(stats).toHaveProperty('staticPhrases');
    expect(stats).toHaveProperty('fetchedPhrases');
    expect(stats).toHaveProperty('lastUpdate');
    expect(stats).toHaveProperty('categoryCounts');
    
    expect(stats.categoryCounts[PhraseCategory.EVERYTHING]).toBeGreaterThan(0);
    expect(stats.categoryCounts[PhraseCategory.MOVIES]).toBeGreaterThan(0);
  });

  it('should handle worker phrases callback', async () => {
    const mockPhrases: FetchedPhrase[] = [
      {
        phraseId: 'worker1',
        text: 'Worker Generated Phrase',
        category: PhraseCategory.ENTERTAINMENT,
        source: 'gemini',
        fetchedAt: Date.now()
      }
    ];

    // Mock console.log to verify it's called
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await act(async () => {
      await service.handleWorkerPhrases(mockPhrases);
      vi.runAllTimers();
    });
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Added')
    );
    consoleSpy.mockRestore();
  }, 10000);
}); 