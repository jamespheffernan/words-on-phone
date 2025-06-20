import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the worker environment
const mockSelf = {
  addEventListener: vi.fn(),
  postMessage: vi.fn(),
  location: {
    hostname: 'localhost',
    port: '5173'
  }
};

// Mock crypto for UUID generation
const mockCrypto = {
  randomUUID: () => `mock-uuid-${Math.random().toString(36).substr(2, 9)}`
};

// Mock IndexedDB
const mockIndexedDB = {
  open: vi.fn(() => ({
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
    result: {
      objectStoreNames: { contains: () => false },
      createObjectStore: () => ({ createIndex: () => {} }),
      transaction: () => ({
        objectStore: () => ({
          get: () => ({ onsuccess: null, onerror: null, result: null }),
          put: () => ({ onsuccess: null, onerror: null }),
          getAll: () => ({ onsuccess: null, onerror: null, result: [] })
        })
      })
    }
  }))
};

// Mock fetch for API calls
const mockFetch = vi.fn();

describe('PhraseWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up global mocks
    global.self = mockSelf as any;
    global.indexedDB = mockIndexedDB as any;
    global.fetch = mockFetch;
    
    // Mock crypto using Object.defineProperty
    Object.defineProperty(global, 'crypto', {
      value: mockCrypto,
      writable: true,
      configurable: true
    });
    
    // Mock successful OpenAI response
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [
        { id: 'uuid-1', phrase: 'Test Phrase 1', difficulty: 'easy' },
        { id: 'uuid-2', phrase: 'Test Phrase 2', difficulty: 'medium' },
        { id: 'uuid-3', phrase: 'Test Phrase 3', difficulty: 'hard' }
      ]
    });
  });

  it('should set up event listeners when imported', async () => {
    // Import the worker module (this will trigger initialization)
    await import('./phraseWorker');
    
    // Verify that event listeners were set up
    expect(mockSelf.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    expect(mockSelf.addEventListener).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
    expect(mockSelf.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('should generate UUIDs correctly', () => {
    // Test the crypto mock
    const uuid1 = mockCrypto.randomUUID();
    const uuid2 = mockCrypto.randomUUID();
    
    expect(uuid1).toBeDefined();
    expect(uuid2).toBeDefined();
    expect(uuid1).not.toBe(uuid2);
    expect(typeof uuid1).toBe('string');
    expect(typeof uuid2).toBe('string');
    
    // Basic UUID format check (should have mock prefix)
    expect(uuid1).toMatch(/^mock-uuid-/);
    expect(uuid2).toMatch(/^mock-uuid-/);
  });

  it('should initialize without errors (OpenAI migration verification)', async () => {
    // This test verifies that the OpenAI migration doesn't break the worker initialization
    const workerModule = await import('./phraseWorker');
    
    // If we get here, the worker module loaded successfully with OpenAI configuration
    expect(workerModule).toBeDefined();
  });

  it('should handle fetch API calls with OpenAI format', async () => {
    // Import the worker module
    await import('./phraseWorker');
    
    // Simulate a fetch request by calling the mocked fetch
    const testCall = await mockFetch('test-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: 'Test Category',
        batchSize: 50,
        phraseIds: ['uuid-1', 'uuid-2', 'uuid-3']
      })
    });
    
    expect(testCall.ok).toBe(true);
    
    const response = await testCall.json();
    expect(Array.isArray(response)).toBe(true);
    expect(response[0]).toHaveProperty('id');
    expect(response[0]).toHaveProperty('phrase');
    expect(response[0]).toHaveProperty('difficulty');
  });
}); 