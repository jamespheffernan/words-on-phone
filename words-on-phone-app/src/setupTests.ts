/* eslint-disable @typescript-eslint/no-explicit-any */
import '@testing-library/jest-dom';

// Mock performance.now for testing
global.performance = global.performance || {
  now: () => Date.now(),
  mark: () => {},
  measure: () => {},
  getEntriesByName: () => [],
  getEntriesByType: () => [],
  clearMarks: () => {},
  clearMeasures: () => {},
} as any;

// Mock requestAnimationFrame for testing
global.requestAnimationFrame = global.requestAnimationFrame || ((callback: FrameRequestCallback) => {
  return setTimeout(callback, 16);
});

global.cancelAnimationFrame = global.cancelAnimationFrame || ((id: number) => {
  clearTimeout(id);
});

// Mock AudioContext for testing
global.AudioContext = global.AudioContext || class MockAudioContext {
  state = 'running' as AudioContextState;
  sampleRate = 44100;
  
  createBuffer() {
    return {
      getChannelData: () => new Float32Array(1024)
    };
  }
  
  createBufferSource() {
    return {
      buffer: null,
      connect: () => {},
      start: () => {}
    };
  }
  
  createGain() {
    return {
      gain: { value: 1 },
      connect: () => {}
    };
  }
  
  resume() {
    return Promise.resolve();
  }
  
  close() {
    return Promise.resolve();
  }
  
  get destination() {
    return {} as AudioDestinationNode;
  }
} as any;

// Enhanced IndexedDB mock for tests
class MockIDBRequest {
  result: any = undefined;
  error: any = null;
  readyState: 'pending' | 'done' = 'pending';
  private _onsuccess: ((event: any) => void) | null = null;
  private _onerror: ((event: any) => void) | null = null;
  
  constructor(result?: any, shouldFail = false) {
    this.result = result;
    
    // Simulate async behavior
    setTimeout(() => {
      this.readyState = 'done';
      if (shouldFail) {
        this.error = new Error('Mock IndexedDB error');
        if (this._onerror) {
          this._onerror({ target: this });
        }
      } else {
        if (this._onsuccess) {
          this._onsuccess({ target: this });
        }
      }
    }, 0);
  }
  
  set onsuccess(handler: ((event: any) => void) | null) {
    this._onsuccess = handler;
  }
  
  get onsuccess() {
    return this._onsuccess;
  }
  
  set onerror(handler: ((event: any) => void) | null) {
    this._onerror = handler;
  }
  
  get onerror() {
    return this._onerror;
  }
}

class MockIDBObjectStore {
  get() { return new MockIDBRequest(); }
  put() { return new MockIDBRequest(); }
  add() { return new MockIDBRequest(); }
  delete() { return new MockIDBRequest(); }
  clear() { return new MockIDBRequest(); }
  getAll() { return new MockIDBRequest([]); }
  createIndex() { return {}; }
}

class MockIDBTransaction {
  objectStore() { return new MockIDBObjectStore(); }
}

class MockIDBDatabase {
  objectStoreNames = {
    contains: () => false
  };
  transaction() { return new MockIDBTransaction(); }
  createObjectStore() { return new MockIDBObjectStore(); }
}

global.indexedDB = {
  open: () => new MockIDBRequest(new MockIDBDatabase()),
  deleteDatabase: () => new MockIDBRequest(),
  cmp: () => 0,
} as any; 