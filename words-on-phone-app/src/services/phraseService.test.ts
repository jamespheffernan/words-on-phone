import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { phraseService } from './phraseService';
import { PhraseCategory } from '../data/phrases';
import { FetchedPhrase } from '../types/openai';

// Mock IndexedDB
const mockIndexedDB = {
  open: vi.fn(),
  deleteDatabase: vi.fn(),
};

const mockIDBOpenDBRequest = {
  result: {
    objectStoreNames: {
      contains: vi.fn().mockReturnValue(false),
    },
    createObjectStore: vi.fn().mockReturnValue({
      createIndex: vi.fn(),
    }),
    transaction: vi.fn().mockReturnValue({
      objectStore: vi.fn().mockReturnValue({
        get: vi.fn().mockReturnValue({ onsuccess: vi.fn(), onerror: vi.fn() }),
        getAll: vi.fn().mockReturnValue({ 
          onsuccess: vi.fn(),
          onerror: vi.fn(),
          result: []
        }),
        add: vi.fn().mockReturnValue({ onsuccess: vi.fn(), onerror: vi.fn() }),
        put: vi.fn().mockReturnValue({ onsuccess: vi.fn(), onerror: vi.fn() }),
        delete: vi.fn().mockReturnValue({ onsuccess: vi.fn(), onerror: vi.fn() }),
      }),
    }),
  },
  onsuccess: null as any,
  onerror: null as any,
  onupgradeneeded: null as any,
};

Object.defineProperty(globalThis, 'indexedDB', {
  value: mockIndexedDB
});

describe('PhraseService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIndexedDB.open.mockReturnValue(mockIDBOpenDBRequest);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with static phrases', () => {
    const allPhrases = phraseService.getAllPhrases();
    expect(allPhrases.length).toBeGreaterThan(0);
  });

  it('should return phrases by category', () => {
    const moviePhrases = phraseService.getPhrasesByCategory(PhraseCategory.MOVIES);
    expect(moviePhrases.length).toBeGreaterThan(0);
    expect(moviePhrases).toContain('The Godfather');
  });

  it('should handle adding fetched phrases', async () => {
    const mockPhrases: FetchedPhrase[] = [
      {
        phraseId: 'test-1',
        text: 'Test Phrase 1',
        category: PhraseCategory.MOVIES,
        source: 'openai',
        fetchedAt: Date.now(),
      },
      {
        phraseId: 'test-2',
        text: 'Test Phrase 2',
        category: PhraseCategory.MUSIC,
        source: 'openai',
        fetchedAt: Date.now(),
      }
    ];

    // Mock successful database operations
    mockIDBOpenDBRequest.onsuccess = () => {};
    
    const count = await phraseService.addFetchedPhrases(mockPhrases);
    expect(count).toBe(2);
  });

  it('should deduplicate phrases', async () => {
    const duplicatePhrases: FetchedPhrase[] = [
      {
        phraseId: 'test-3',
        text: 'The Godfather', // This should be deduplicated
        category: PhraseCategory.MOVIES,
        source: 'openai',
        fetchedAt: Date.now(),
      }
    ];

    const count = await phraseService.addFetchedPhrases(duplicatePhrases);
    expect(count).toBe(0); // Should be deduplicated
  });

  it('should return statistics', () => {
    const stats = phraseService.getStatistics();
    expect(stats).toHaveProperty('totalPhrases');
    expect(stats).toHaveProperty('staticPhrases');
    expect(stats).toHaveProperty('fetchedPhrases');
    expect(stats).toHaveProperty('customPhrases');
    expect(stats).toHaveProperty('lastUpdate');
    expect(stats).toHaveProperty('categoryCounts');
    expect(stats.totalPhrases).toBeGreaterThan(0);
  });
}); 