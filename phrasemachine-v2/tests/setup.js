// Jest setup file - runs before each test file
// Configure global test environment and utilities

// Extend Jest matchers if needed
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

// Global test utilities
global.testUtils = {
  // Mock Redis for offline testing
  mockRedisClient: {
    connected: false,
    hGet: jest.fn().mockResolvedValue(null),
    hSet: jest.fn().mockResolvedValue(true),
    hExists: jest.fn().mockResolvedValue(false),
    quit: jest.fn().mockResolvedValue(true),
    connect: jest.fn().mockResolvedValue(true)
  },
  
  // Performance testing utilities
  measurePerformance: async (fn, expectedMaxMs = 300) => {
    const startTime = Date.now();
    const result = await fn();
    const duration = Date.now() - startTime;
    
    return {
      result,
      duration,
      withinThreshold: duration <= expectedMaxMs
    };
  },
  
  // Common test phrases for consistency
  testPhrases: {
    highConcreteness: ['pizza delivery', 'coffee shop', 'basketball court'],
    mediumConcreteness: ['social media', 'art gallery', 'music festival'], 
    lowConcreteness: ['abstract concept', 'emotional intelligence', 'personal growth'],
    properNouns: ['Taylor Swift', 'Apple iPhone', 'New York pizza'],
    weakHeadPatterns: ['marketing strategy', 'social media vibe', 'brand energy', 'epic fail'],
    technical: ['machine learning', 'artificial intelligence', 'quantum computing'],
    compound: ['ice cream', 'fire truck', 'rainbow bridge'],
    invalid: ['', null, undefined, 123, 'single']
  }
};

// Console suppression for cleaner test output
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(originalConsole.log),
  warn: jest.fn(originalConsole.warn),
  error: jest.fn(originalConsole.error),
  info: jest.fn(originalConsole.info)
};

// Restore console for specific tests that need it
global.restoreConsole = () => {
  global.console = originalConsole;
};

// Performance tracking
global.performanceTracker = {
  measurements: [],
  track: (name, duration) => {
    global.performanceTracker.measurements.push({ name, duration, timestamp: Date.now() });
  },
  getStats: () => {
    const measurements = global.performanceTracker.measurements;
    if (measurements.length === 0) return { count: 0 };
    
    const durations = measurements.map(m => m.duration);
    return {
      count: measurements.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      avg: durations.reduce((a, b) => a + b, 0) / durations.length,
      over300ms: durations.filter(d => d > 300).length
    };
  },
  clear: () => {
    global.performanceTracker.measurements = [];
  }
}; 