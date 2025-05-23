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
  state = 'running';
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
    return {};
  }
} as any;

// Mock IndexedDB for tests
class MockIDBRequest {
  result: any;
  error: any;
  onsuccess: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  
  constructor(result?: any) {
    this.result = result;
    setTimeout(() => {
      if (this.onsuccess) {
        this.onsuccess({ target: this });
      }
    }, 0);
  }
}

class MockIDBObjectStore {
  get() { return new MockIDBRequest(); }
  put() { return new MockIDBRequest(); }
  delete() { return new MockIDBRequest(); }
  clear() { return new MockIDBRequest(); }
  getAll() { return new MockIDBRequest([]); }
}

class MockIDBTransaction {
  objectStore() { return new MockIDBObjectStore(); }
}

class MockIDBDatabase {
  transaction() { return new MockIDBTransaction(); }
}

global.indexedDB = {
  open: () => new MockIDBRequest(new MockIDBDatabase()),
  deleteDatabase: () => new MockIDBRequest(),
  cmp: () => 0,
} as any; 