import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CategoryRequestService } from './categoryRequestService';
import { generatePhraseId, generatePhraseIds, isValidCustomTerm, customTermToCustomCategoryPhrase } from '../types/openai';

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

// Mock fetch
const mockFetch = vi.fn();
Object.defineProperty(globalThis, 'fetch', {
  value: mockFetch
});

describe('CategoryRequestService', () => {
  let service: CategoryRequestService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockIndexedDB.open.mockReturnValue(mockIDBOpenDBRequest);
    service = new CategoryRequestService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize properly', () => {
    expect(service).toBeDefined();
  });

  it('should check quota availability', async () => {
    const quotaCheck = await service.canMakeRequest();
    expect(quotaCheck).toHaveProperty('canMake');
    expect(quotaCheck).toHaveProperty('remainingToday');
    expect(typeof quotaCheck.canMake).toBe('boolean');
    expect(typeof quotaCheck.remainingToday).toBe('number');
  });

  it('should generate valid UUIDs using centralized utility', () => {
    const uuid1 = generatePhraseId();
    const uuid2 = generatePhraseId();
    
    expect(uuid1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(uuid2).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(uuid1).not.toBe(uuid2);
  });

  it('should generate multiple UUIDs using centralized utility', () => {
    const uuids = generatePhraseIds(5);
    
    expect(uuids).toHaveLength(5);
    expect(new Set(uuids).size).toBe(5); // All unique
    
    uuids.forEach(uuid => {
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });

  it('should validate CustomTerm objects correctly', () => {
    const validTerm = {
      id: generatePhraseId(),
      phrase: 'Test Phrase',
      topic: 'Movies',
      difficulty: 'medium' as const
    };

    const invalidTerm = {
      id: generatePhraseId(),
      // Missing phrase field
      topic: 'Movies'
    };

    expect(isValidCustomTerm(validTerm)).toBe(true);
    expect(isValidCustomTerm(invalidTerm)).toBe(false);
  });

  it('should convert CustomTerm to CustomCategoryPhrase correctly', () => {
    const customTerm = {
      id: generatePhraseId(),
      phrase: 'Test Movie',
      topic: 'Movies',
      difficulty: 'easy' as const
    };

    const result = customTermToCustomCategoryPhrase(customTerm, 'My Movies');
    
    expect(result.phraseId).toBe(customTerm.id);
    expect(result.text).toBe('Test Movie');
    expect(result.customCategory).toBe('My Movies');
    expect(result.source).toBe('openai');
    expect(result.difficulty).toBe('easy');
    expect(typeof result.fetchedAt).toBe('number');
  });

  describe('Cross-batch deduplication', () => {
    it('should deduplicate phrases across batches (case insensitive)', () => {
      const phrases = [
        {
          phraseId: generatePhraseId(),
          text: 'Test Phrase',
          customCategory: 'Test',
          category: 'Everything' as any,
          source: 'openai' as const,
          fetchedAt: Date.now()
        },
        {
          phraseId: generatePhraseId(),
          text: 'test phrase', // Duplicate (different case)
          customCategory: 'Test',
          category: 'Everything' as any,
          source: 'openai' as const,
          fetchedAt: Date.now()
        },
        {
          phraseId: generatePhraseId(),
          text: 'Another Phrase',
          customCategory: 'Test',
          category: 'Everything' as any,
          source: 'openai' as const,
          fetchedAt: Date.now()
        },
        {
          phraseId: generatePhraseId(),
          text: 'ANOTHER PHRASE', // Duplicate (different case)
          customCategory: 'Test',
          category: 'Everything' as any,
          source: 'openai' as const,
          fetchedAt: Date.now()
        }
      ];

      // Access the private method using bracket notation for testing
      const deduplicatedPhrases = (service as any).deduplicateAcrossBatches(phrases);
      
      expect(deduplicatedPhrases).toHaveLength(2);
      expect(deduplicatedPhrases[0].text).toBe('Test Phrase');
      expect(deduplicatedPhrases[1].text).toBe('Another Phrase');
    });

    it('should handle empty phrase arrays', () => {
      const deduplicatedPhrases = (service as any).deduplicateAcrossBatches([]);
      expect(deduplicatedPhrases).toHaveLength(0);
    });

    it('should preserve original phrases when no duplicates exist', () => {
      const phrases = [
        {
          phraseId: generatePhraseId(),
          text: 'Unique Phrase One',
          customCategory: 'Test',
          category: 'Everything' as any,
          source: 'openai' as const,
          fetchedAt: Date.now()
        },
        {
          phraseId: generatePhraseId(),
          text: 'Unique Phrase Two',
          customCategory: 'Test',
          category: 'Everything' as any,
          source: 'openai' as const,
          fetchedAt: Date.now()
        }
      ];

      const deduplicatedPhrases = (service as any).deduplicateAcrossBatches(phrases);
      
      expect(deduplicatedPhrases).toHaveLength(2);
      expect(deduplicatedPhrases).toEqual(phrases);
    });

    it('should handle phrases with special characters and whitespace', () => {
      const phrases = [
        {
          phraseId: generatePhraseId(),
          text: '  Test Phrase!  ',
          customCategory: 'Test',
          category: 'Everything' as any,
          source: 'openai' as const,
          fetchedAt: Date.now()
        },
        {
          phraseId: generatePhraseId(),
          text: 'test phrase!', // Should be considered different due to whitespace normalization
          customCategory: 'Test',
          category: 'Everything' as any,
          source: 'openai' as const,
          fetchedAt: Date.now()
        }
      ];

      const deduplicatedPhrases = (service as any).deduplicateAcrossBatches(phrases);
      
      // Both should be kept since the normalization only converts to lowercase, doesn't trim
      expect(deduplicatedPhrases).toHaveLength(2);
    });
  });
}); 