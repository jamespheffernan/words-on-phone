// Jest global setup - runs once before all tests
module.exports = async () => {
  console.log('🚀 Starting PhraseMachine v2 Test Suite');
  console.log('⚙️ Setting up global test environment...');
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.REDIS_HOST = 'localhost';
  process.env.REDIS_PORT = '6379';
  process.env.LOG_LEVEL = 'error'; // Reduce logging during tests
  
  // Global test start time
  global.__TEST_START_TIME__ = Date.now();
  
  console.log('✅ Global test setup complete');
}; 