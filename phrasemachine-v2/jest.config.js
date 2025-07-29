module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js'
  ],
  
  // Coverage configuration
  collectCoverage: false, // Enable only when running coverage command
  collectCoverageFrom: [
    'services/**/*.js',
    '!services/**/node_modules/**',
    '!**/test-*.js',
    '!**/mock-*.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },
  
  // Setup and teardown
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Test timeout (increased for integration tests)
  testTimeout: 30000,
  
  // Module paths
  roots: ['<rootDir>'],
  moduleDirectories: ['node_modules', '<rootDir>'],
  
  // Performance and parallelism
  maxWorkers: '50%',
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  
  // Verbose output for debugging
  verbose: true,
  
  // Transform configuration (if needed for ES modules)
  transform: {},
  
  // Global test setup
  globalSetup: '<rootDir>/tests/globalSetup.js',
  globalTeardown: '<rootDir>/tests/globalTeardown.js'
}; 