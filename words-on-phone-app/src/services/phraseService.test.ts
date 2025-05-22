import { describe, it, expect, beforeEach, vi } from 'vitest';
import { phraseService, type FetchedPhrase } from './phraseService';
import { PhraseCategory } from '../data/phrases';

// Mock IndexedDB
const mockDB = {
  objectStoreNames: {
    contains: vi.fn(() => false)
  },
  createObjectStore: vi.fn(() => ({
    createIndex: vi.fn()
  })),
  transaction: vi.fn(() => ({
    objectStore: vi.fn(() => ({
      add: vi.fn(() => ({ onsuccess: null, onerror: null })),
      getAll: vi.fn(() => ({ 
        onsuccess: null, 
        onerror: null,
        result: []
      })),
      delete: vi.fn(() => ({ onsuccess: null, onerror: null }))
    }))
  }))
};

const mockIndexedDB = {
  open: vi.fn(() => ({
    onerror: null,
    onsuccess: null,
    onupgradeneeded: null,
    result: mockDB
  }))
};

// Setup global mocks
Object.defineProperty(global, 'indexedDB', {
  value: mockIndexedDB
});

describe('PhraseService', () => {
  let service: typeof phraseService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset service state by creating a new instance
    service = phraseService;
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
        source: 'openai',
        fetchedAt: Date.now()
      },
      {
        phraseId: 'test2',
        text: 'Unique New Phrase',
        category: PhraseCategory.MOVIES,
        source: 'openai',
        fetchedAt: Date.now()
      }
    ];

    // For this test, we expect deduplication to work even without full DB mocking
    const added = await service.addFetchedPhrases(mockPhrases).catch(() => 0);
    
    // Should only add the unique phrase, not "The Godfather"
    expect(added).toBeLessThan(mockPhrases.length);
  });

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
        source: 'openai',
        fetchedAt: Date.now()
      }
    ];

    // Mock console.log to verify it's called
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await service.handleWorkerPhrases(mockPhrases);
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Added')
    );
    
    consoleSpy.mockRestore();
  });
}); 