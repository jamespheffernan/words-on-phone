// Jest global teardown - runs once after all tests
module.exports = async () => {
  const testDuration = Date.now() - global.__TEST_START_TIME__;
  
  console.log('🏁 PhraseMachine v2 Test Suite Complete');
  console.log(`⏱️ Total test duration: ${testDuration}ms`);
  
  // Log performance summary if available
  if (global.performanceTracker) {
    const stats = global.performanceTracker.getStats();
    if (stats.count > 0) {
      console.log('📊 Performance Summary:');
      console.log(`   • Total measurements: ${stats.count}`);
      console.log(`   • Average duration: ${stats.avg.toFixed(1)}ms`);
      console.log(`   • Max duration: ${stats.max}ms`);
      console.log(`   • Over 300ms threshold: ${stats.over300ms}/${stats.count}`);
    }
  }
  
  console.log('✅ Global test teardown complete');
}; 