import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock crypto for UUID generation
Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'test-uuid-' + Math.random().toString(36).substr(2, 9))
  }
});

// Mock IndexedDB
const mockIndexedDB = {
  open: vi.fn(),
  deleteDatabase: vi.fn(),
};

Object.defineProperty(globalThis, 'indexedDB', {
  value: mockIndexedDB
});

// Mock fetch
const mockFetch = vi.fn();
Object.defineProperty(globalThis, 'fetch', {
  value: mockFetch
});

// Mock self for worker context
const mockSelf = {
  addEventListener: vi.fn(),
  postMessage: vi.fn(),
  location: {
    hostname: 'localhost',
    port: '5173'
  }
};

Object.defineProperty(globalThis, 'self', {
  value: mockSelf
});

describe('PhraseWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should set up event listeners when imported', async () => {
    // Import the worker to trigger initialization
    // @ts-ignore - Worker is now a JavaScript file
    await import('./phraseWorker');
    
    // Check that event listeners were set up
    expect(mockSelf.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    expect(mockSelf.addEventListener).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
    expect(mockSelf.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('should handle START message', async () => {
    // @ts-ignore - Worker is now a JavaScript file
    await import('./phraseWorker');
    
    // Get the message handler
    const messageHandler = mockSelf.addEventListener.mock.calls
      .find(call => call[0] === 'message')?.[1];
    
    expect(messageHandler).toBeDefined();
    
    // Simulate START message
    const mockEvent = {
      data: { type: 'START' }
    };
    
    // This should not throw
    expect(() => messageHandler(mockEvent)).not.toThrow();
  });

  it('should handle STATUS message', async () => {
    // @ts-ignore - Worker is now a JavaScript file
    await import('./phraseWorker');
    
    // Get the message handler
    const messageHandler = mockSelf.addEventListener.mock.calls
      .find(call => call[0] === 'message')?.[1];
    
    expect(messageHandler).toBeDefined();
    
    // Simulate STATUS message
    const mockEvent = {
      data: { type: 'STATUS' }
    };
    
    // This should not throw
    expect(() => messageHandler(mockEvent)).not.toThrow();
  });

  it('should handle unknown message types gracefully', async () => {
    // @ts-ignore - Worker is now a JavaScript file
    await import('./phraseWorker');
    
    // Get the message handler
    const messageHandler = mockSelf.addEventListener.mock.calls
      .find(call => call[0] === 'message')?.[1];
    
    expect(messageHandler).toBeDefined();
    
    // Simulate unknown message
    const mockEvent = {
      data: { type: 'UNKNOWN_TYPE' }
    };
    
    // This should not throw
    expect(() => messageHandler(mockEvent)).not.toThrow();
  });
}); 