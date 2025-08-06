#!/usr/bin/env node

/**
 * Test JSON Mode Performance
 * 
 * This script tests the new JSON fallback mode to ensure:
 * 1. All processors can initialize in JSON mode
 * 2. Performance meets targets (<10ms per phrase scoring)
 * 3. Scoring results are reasonable
 */

const DecisionEngine = require('./services/scoring/decision-engine');

async function testJSONModePerformance() {
  console.log('🧪 Testing JSON Mode Performance');
  console.log('=====================================\n');

  // Test phrases covering different scoring components
  const testPhrases = [
    'ice cream',           // Should hit N-gram data
    'taylor swift',        // Should hit Wikidata data  
    'pizza delivery',      // Should hit concreteness data
    'video game',          // Should hit multiple components
    'hot dog',            // Should hit N-gram data
    'barack obama',       // Should hit Wikidata data
    'chocolate cake',     // Should hit concreteness + n-gram
    'random phrase xyz',  // Should mostly miss (low score)
    'football stadium',   // Should hit multiple components
    'coffee shop'         // Should hit concreteness + n-gram
  ];

  try {
    // Force JSON mode by ensuring Redis is not available
    process.env.REDIS_URL = 'redis://invalid-host:6379';
    
    console.log('🔄 Initializing DecisionEngine in JSON mode...');
    const decisionEngine = new DecisionEngine();
    
    const initStart = Date.now();
    const initResults = await decisionEngine.initialize();
    const initDuration = Date.now() - initStart;
    
    console.log(`✅ Initialization completed in ${initDuration}ms`);
    console.log('📊 Component status:', initResults);
    
    // Verify at least some components initialized
    const readyComponents = Object.values(initResults).filter(Boolean).length;
    if (readyComponents < 2) {
      throw new Error(`Only ${readyComponents} components ready - expected at least 2`);
    }
    
    console.log('\n🏃 Running performance tests...\n');
    
    const results = [];
    let totalDuration = 0;
    
    for (const phrase of testPhrases) {
      console.log(`🎯 Testing: "${phrase}"`);
      
      const startTime = Date.now();
      const result = await decisionEngine.scorePhrase(phrase);
      const duration = Date.now() - startTime;
      
      totalDuration += duration;
      results.push({
        phrase,
        score: result.final_score,
        duration,
        components: result.component_scores
      });
      
      console.log(`   📈 Score: ${result.final_score}/100 (${duration}ms)`);
      console.log(`   🔍 Components: D:${result.component_scores.distinctiveness} C:${result.component_scores.describability} L:${result.component_scores.legacy_heuristics} V:${result.component_scores.cultural_validation}`);
      
      // Performance check
      if (duration > 10) {
        console.warn(`   ⚠️ Performance warning: ${duration}ms > 10ms target`);
      } else {
        console.log(`   ✅ Performance: ${duration}ms < 10ms target`);
      }
      
      console.log('');
    }
    
    // Overall performance analysis
    const avgDuration = totalDuration / testPhrases.length;
    const maxDuration = Math.max(...results.map(r => r.duration));
    const minDuration = Math.min(...results.map(r => r.duration));
    
    console.log('📊 Performance Summary');
    console.log('======================');
    console.log(`🕐 Average duration: ${avgDuration.toFixed(1)}ms`);
    console.log(`⚡ Fastest: ${minDuration}ms`);
    console.log(`🐌 Slowest: ${maxDuration}ms`);
    console.log(`🎯 Target: <10ms per phrase`);
    
    // Performance validation
    const passedPerformance = results.filter(r => r.duration <= 10).length;
    const performanceRate = (passedPerformance / results.length) * 100;
    
    console.log(`✅ Performance pass rate: ${passedPerformance}/${results.length} (${performanceRate.toFixed(1)}%)`);
    
    // Score validation (ensure we're getting reasonable scores)
    const nonZeroScores = results.filter(r => r.score > 0).length;
    const scoreRate = (nonZeroScores / results.length) * 100;
    
    console.log(`📈 Non-zero score rate: ${nonZeroScores}/${results.length} (${scoreRate.toFixed(1)}%)`);
    
    // Final validation
    console.log('\n🎉 JSON Mode Performance Test Results');
    console.log('====================================');
    
    if (avgDuration <= 10) {
      console.log('✅ PASS: Average performance meets target (<10ms)');
    } else {
      console.log('❌ FAIL: Average performance exceeds target (>10ms)');
    }
    
    if (performanceRate >= 80) {
      console.log('✅ PASS: 80%+ of phrases meet performance target');
    } else {
      console.log('❌ FAIL: <80% of phrases meet performance target');
    }
    
    if (scoreRate >= 60) {
      console.log('✅ PASS: 60%+ of phrases receive non-zero scores');
    } else {
      console.log('❌ FAIL: <60% of phrases receive non-zero scores');
    }
    
    if (readyComponents >= 2) {
      console.log('✅ PASS: At least 2 scoring components initialized');
    } else {
      console.log('❌ FAIL: <2 scoring components initialized');
    }
    
    // Overall result
    const allTestsPassed = (
      avgDuration <= 10 &&
      performanceRate >= 80 &&
      scoreRate >= 60 &&
      readyComponents >= 2
    );
    
    if (allTestsPassed) {
      console.log('\n🎉 ALL TESTS PASSED - JSON mode is ready for production!');
      process.exit(0);
    } else {
      console.log('\n❌ SOME TESTS FAILED - JSON mode needs optimization');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testJSONModePerformance();
}

module.exports = testJSONModePerformance;