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