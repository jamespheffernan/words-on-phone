import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock IndexedDB
class MockIDBFactory {
  open() {
    return {
      result: {
        transaction: () => ({
          objectStore: () => ({
            getAll: () => ({ result: [] }),
            get: () => ({ result: null }),
            put: vi.fn(),
            add: vi.fn(),
          }),
        }),
        createObjectStore: vi.fn(),
      },
      transaction: () => ({
        objectStore: () => ({
          getAll: () => ({ result: [] }),
          get: () => ({ result: null }),
          put: vi.fn(),
          add: vi.fn(),
        }),
      }),
      onupgradeneeded: null,
      onsuccess: null,
      onerror: null,
    };
  }
}

// Setup global mocks for browser APIs
global.indexedDB = new MockIDBFactory() as any;
global.IDBKeyRange = {} as any;
global.IDBRequest = {} as any;
global.IDBTransaction = {} as any;
global.IDBObjectStore = {} as any;

// Mock for browser vibration API
global.navigator.vibrate = vi.fn();

// Mock local storage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as any;

// Add missing DOM properties
if (typeof window !== 'undefined') {
  window.matchMedia = window.matchMedia || function() {
    return {
      matches: false,
      addListener: vi.fn(),
      removeListener: vi.fn(),
    };
  };
}

// Silence console errors during tests
console.error = vi.fn();
console.warn = vi.fn(); 