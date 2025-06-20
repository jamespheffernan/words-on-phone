import { describe, it, expect, beforeEach } from 'vitest';
import { CategoryRequestService } from './categoryRequestService';

// Mock IndexedDB for testing
const mockIndexedDB = {
  open: () => ({
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
    result: {
      objectStoreNames: { contains: () => false },
      createObjectStore: () => ({
        createIndex: () => {}
      }),
      transaction: () => ({
        objectStore: () => ({
          put: () => ({ onsuccess: null, onerror: null }),
          get: () => ({ onsuccess: null, onerror: null }),
          getAll: () => ({ onsuccess: null, onerror: null, result: [] }),
          delete: () => ({ onsuccess: null, onerror: null }),
          index: () => ({
            getAll: () => ({ onsuccess: null, onerror: null, result: [] })
          })
        })
      })
    }
  })
};

// Mock localStorage
const mockLocalStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};

// Mock fetch for API calls
const mockFetch = async (url: string, options: any) => {
  const body = JSON.parse(options.body);
  
  // Mock successful OpenAI response
  if (body.batchSize <= 3) {
    // Sample words response
    return {
      ok: true,
      json: async () => body.phraseIds.map((id: string, index: number) => ({
        id,
        topic: body.topic,
        phrase: `Sample ${index + 1}`,
        difficulty: 'easy'
      }))
    };
  } else {
    // Full category response
    return {
      ok: true,
      json: async () => body.phraseIds.slice(0, 30).map((id: string, index: number) => ({
        id,
        topic: body.topic,
        phrase: `Phrase ${index + 1}`,
        difficulty: index % 3 === 0 ? 'easy' : index % 3 === 1 ? 'medium' : 'hard'
      }))
    };
  }
};

describe('CategoryRequestService', () => {
  let service: CategoryRequestService;

  beforeEach(() => {
    // Mock browser APIs
    Object.defineProperty(global, 'indexedDB', {
      value: mockIndexedDB,
      writable: true
    });
    
    Object.defineProperty(global, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    });
    
    Object.defineProperty(global, 'fetch', {
      value: mockFetch,
      writable: true
    });

    // Mock crypto.randomUUID
    Object.defineProperty(global, 'crypto', {
      value: {
        randomUUID: () => `uuid-${Math.random().toString(36).substr(2, 9)}`
      },
      writable: true
    });

    service = new CategoryRequestService();
  });

  it('should create an instance', () => {
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(CategoryRequestService);
  });

  it('should have methods for OpenAI integration', () => {
    expect(typeof service.canMakeRequest).toBe('function');
    expect(typeof service.requestSampleWords).toBe('function');
    expect(typeof service.generateFullCategory).toBe('function');
    expect(typeof service.getCustomPhrases).toBe('function');
    expect(typeof service.getAllCustomCategories).toBe('function');
    expect(typeof service.deleteCustomCategory).toBe('function');
  });

  it('should generate valid UUIDs', () => {
    // Access private method through type assertion for testing
    const serviceAny = service as any;
    const uuid1 = serviceAny.generateUUID();
    const uuid2 = serviceAny.generateUUID();
    
    expect(uuid1).toBeDefined();
    expect(uuid2).toBeDefined();
    expect(uuid1).not.toBe(uuid2);
    expect(typeof uuid1).toBe('string');
    expect(typeof uuid2).toBe('string');
    
    // Basic UUID format check (should have dashes)
    expect(uuid1).toMatch(/-/);
    expect(uuid2).toMatch(/-/);
  });

  it('should generate multiple UUIDs', () => {
    const serviceAny = service as any;
    const uuids = serviceAny.generateUUIDs(5);
    
    expect(uuids).toHaveLength(5);
    expect(Array.isArray(uuids)).toBe(true);
    
    // Check all UUIDs are unique
    const uniqueUuids = new Set(uuids);
    expect(uniqueUuids.size).toBe(5);
  });

  it('should handle quota checking', async () => {
    const result = await service.canMakeRequest();
    
    expect(result).toBeDefined();
    expect(typeof result.canMake).toBe('boolean');
    expect(typeof result.remainingToday).toBe('number');
    
    if (!result.canMake) {
      expect(typeof result.reason).toBe('string');
    }
  });
}); 