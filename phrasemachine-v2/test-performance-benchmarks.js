#!/usr/bin/env node

const DecisionEngine = require('./services/scoring/decision-engine');
const { performance } = require('perf_hooks');

/**
 * PhraseMachine v2 Performance & Accuracy Benchmark Suite
 * 
 * Validates all acceptance KPIs:
 * - <300ms average scoring latency per phrase
 * - >80% of auto-accepted phrases rated "easy to describe"
 * - <5% false-positive rate for "non-thing" phrases
 * - <20% manual-review queue
 */

class PerformanceBenchmarks {
  constructor() {
    this.engine = new DecisionEngine();
    this.results = {
      performance: {
        individual_scores: [],
        batch_scores: [],
        system_health: {}
      },
      accuracy: {
        high_quality_phrases: [],
        low_quality_phrases: [],
        edge_cases: []
      },
      classification_distribution: {
        excellent: 0,
        good: 0, 
        acceptable: 0,
        poor: 0,
        unacceptable: 0
      }
    };
  }

  async initialize() {
    console.log('🚀 Initializing PhraseMachine v2 Performance Benchmarks...');
    const startTime = performance.now();
    
    const initResults = await this.engine.initialize();
    const initDuration = performance.now() - startTime;
    
    console.log(`✅ Decision Engine initialized in ${initDuration.toFixed(1)}ms`);
    console.log('📊 Component status:', initResults);
    
    return initResults;
  }

  // Test Case 1: Individual Scoring Performance (<300ms target)
  async testIndividualScoringPerformance() {
    console.log('\n🎯 Test 1: Individual Scoring Performance (<300ms target)');
    console.log('================================================================');
    
    const testPhrases = [
      // High-quality phrases (should score well)
      'ice cream', 'coffee shop', 'taylor swift', 'basketball court', 'hot dog',
      'swimming pool', 'french fries', 'video game', 'post office', 'new york',
      
      // Medium-quality phrases  
      'machine learning', 'social media', 'credit card', 'search engine', 'online shopping',
      
      // Low-quality phrases
      'completely random', 'abstract concept', 'weird situation', 'strange energy', 'random vibe',
      
      // Edge cases
      'a', 'the quick brown fox jumps', 'supercalifragilisticexpialidocious thing'
    ];
    
    let totalDuration = 0;
    let successCount = 0;
    
    for (const phrase of testPhrases) {
      try {
        const startTime = performance.now();
        const result = await this.engine.scorePhrase(phrase);
        const duration = performance.now() - startTime;
        
        totalDuration += duration;
        successCount++;
        
        this.results.performance.individual_scores.push({
          phrase,
          duration_ms: duration,
          final_score: result.final_score,
          classification: result.quality_classification
        });
        
        // Track classification distribution
        if (this.results.classification_distribution[result.quality_classification] !== undefined) {
          this.results.classification_distribution[result.quality_classification]++;
        }
        
        const status = duration <= 300 ? '✅' : '❌';
        console.log(`${status} "${phrase}" → ${result.final_score.toFixed(1)}/100 (${result.quality_classification}) in ${duration.toFixed(1)}ms`);
        
      } catch (error) {
        console.error(`❌ Error scoring "${phrase}":`, error.message);
      }
    }
    
    const avgDuration = totalDuration / successCount;
    const maxDuration = Math.max(...this.results.performance.individual_scores.map(r => r.duration_ms));
    const within300ms = this.results.performance.individual_scores.filter(r => r.duration_ms <= 300).length;
    const performance300Rate = (within300ms / successCount) * 100;
    
    console.log('\n📊 Individual Performance Results:');
    console.log(`   📝 Phrases tested: ${successCount}/${testPhrases.length}`);
    console.log(`   ⏱️ Average duration: ${avgDuration.toFixed(1)}ms (target: <300ms)`);
    console.log(`   📈 Max duration: ${maxDuration.toFixed(1)}ms`);
    console.log(`   🎯 Within 300ms target: ${within300ms}/${successCount} (${performance300Rate.toFixed(1)}%)`);
    console.log(`   ${avgDuration <= 300 ? '✅' : '❌'} Performance target: ${avgDuration <= 300 ? 'MET' : 'FAILED'}`);
    
    return {
      avg_duration_ms: avgDuration,
      max_duration_ms: maxDuration,
      success_rate: performance300Rate,
      target_met: avgDuration <= 300
    };
  }

  // Test Case 2: Batch Processing Performance
  async testBatchProcessingPerformance() {
    console.log('\n🎯 Test 2: Batch Processing Performance');
    console.log('====================================');
    
    const batchSizes = [10, 25, 50, 100];
    const testPhrase = 'coffee shop'; // Known good phrase
    
    for (const batchSize of batchSizes) {
      console.log(`\n📦 Testing batch size: ${batchSize} phrases`);
      
      const phrases = Array(batchSize).fill(testPhrase);
      const startTime = performance.now();
      
      let successCount = 0;
      for (const phrase of phrases) {
        try {
          await this.engine.scorePhrase(phrase);
          successCount++;
        } catch (error) {
          console.error(`❌ Error in batch:`, error.message);
        }
      }
      
      const totalDuration = performance.now() - startTime;
      const avgPerPhrase = totalDuration / successCount;
      
      this.results.performance.batch_scores.push({
        batch_size: batchSize,
        total_duration_ms: totalDuration,
        avg_per_phrase_ms: avgPerPhrase,
        success_count: successCount
      });
      
      console.log(`   ⏱️ Total time: ${totalDuration.toFixed(1)}ms`);
      console.log(`   📊 Per phrase: ${avgPerPhrase.toFixed(1)}ms`);
      console.log(`   ✅ Success rate: ${successCount}/${batchSize} (${((successCount/batchSize)*100).toFixed(1)}%)`);
      console.log(`   ${avgPerPhrase <= 300 ? '✅' : '❌'} Performance: ${avgPerPhrase <= 300 ? 'GOOD' : 'SLOW'}`);
    }
  }

  // Test Case 3: Quality Classification Accuracy
  async testQualityClassificationAccuracy() {
    console.log('\n🎯 Test 3: Quality Classification Accuracy');
    console.log('========================================');
    
    // Known high-quality phrases (should score 55+ for acceptable or higher)
    const highQualityPhrases = [
      'taylor swift', 'ice cream', 'coffee shop', 'basketball court', 'swimming pool',
      'french fries', 'hot dog', 'video game', 'post office', 'new york',
      'apple pie', 'pizza delivery', 'rock music', 'movie theater', 'gas station'
    ];
    
    // Known low-quality phrases (should score <55 for poor/unacceptable)  
    const lowQualityPhrases = [
      'completely random', 'abstract concept', 'weird situation', 'strange energy',
      'random vibe', 'conceptual framework', 'theoretical approach', 'strategic initiative',
      'operational excellence', 'innovative solution', 'disruptive paradigm', 'synergistic leverage'
    ];
    
    // Test high-quality phrases
    console.log('\n📈 Testing High-Quality Phrases (expect ≥55 scores):');
    let highQualityCorrect = 0;
    let autoAccepted = 0;
    
    for (const phrase of highQualityPhrases) {
      try {
        const result = await this.engine.scorePhrase(phrase);
        const isCorrect = result.final_score >= 55;
        const isAutoAccepted = ['excellent', 'good', 'acceptable'].includes(result.quality_classification);
        
        if (isCorrect) highQualityCorrect++;
        if (isAutoAccepted) autoAccepted++;
        
        this.results.accuracy.high_quality_phrases.push({
          phrase,
          final_score: result.final_score,
          classification: result.quality_classification,
          correctly_classified: isCorrect,
          auto_accepted: isAutoAccepted
        });
        
        const status = isCorrect ? '✅' : '❌';
        console.log(`${status} "${phrase}" → ${result.final_score.toFixed(1)}/100 (${result.quality_classification})`);
        
      } catch (error) {
        console.error(`❌ Error testing "${phrase}":`, error.message);
      }
    }
    
    // Test low-quality phrases
    console.log('\n📉 Testing Low-Quality Phrases (expect <55 scores):');
    let lowQualityCorrect = 0;
    let falsePositives = 0;
    
    for (const phrase of lowQualityPhrases) {
      try {
        const result = await this.engine.scorePhrase(phrase);
        const isCorrect = result.final_score < 55;
        const isFalsePositive = result.final_score >= 75; // Auto-accept threshold
        
        if (isCorrect) lowQualityCorrect++;
        if (isFalsePositive) falsePositives++;
        
        this.results.accuracy.low_quality_phrases.push({
          phrase,
          final_score: result.final_score,
          classification: result.quality_classification,
          correctly_classified: isCorrect,
          false_positive: isFalsePositive
        });
        
        const status = isCorrect ? '✅' : '❌';
        console.log(`${status} "${phrase}" → ${result.final_score.toFixed(1)}/100 (${result.quality_classification})`);
        
      } catch (error) {
        console.error(`❌ Error testing "${phrase}":`, error.message);
      }
    }
    
    // Calculate accuracy metrics
    const highQualityAccuracy = (highQualityCorrect / highQualityPhrases.length) * 100;
    const lowQualityAccuracy = (lowQualityCorrect / lowQualityPhrases.length) * 100;
    const autoAcceptRate = (autoAccepted / highQualityPhrases.length) * 100;
    const falsePositiveRate = (falsePositives / lowQualityPhrases.length) * 100;
    
    console.log('\n📊 Quality Classification Results:');
    console.log(`   📈 High-quality accuracy: ${highQualityCorrect}/${highQualityPhrases.length} (${highQualityAccuracy.toFixed(1)}%)`);
    console.log(`   📉 Low-quality accuracy: ${lowQualityCorrect}/${lowQualityPhrases.length} (${lowQualityAccuracy.toFixed(1)}%)`);
    console.log(`   ✅ Auto-accept rate: ${autoAccepted}/${highQualityPhrases.length} (${autoAcceptRate.toFixed(1)}%) - Target: >80%`);
    console.log(`   ❌ False-positive rate: ${falsePositives}/${lowQualityPhrases.length} (${falsePositiveRate.toFixed(1)}%) - Target: <5%`);
    console.log(`   ${autoAcceptRate >= 80 ? '✅' : '❌'} Auto-accept target: ${autoAcceptRate >= 80 ? 'MET' : 'FAILED'}`);
    console.log(`   ${falsePositiveRate <= 5 ? '✅' : '❌'} False-positive target: ${falsePositiveRate <= 5 ? 'MET' : 'FAILED'}`);
    
    return {
      high_quality_accuracy: highQualityAccuracy,
      low_quality_accuracy: lowQualityAccuracy,
      auto_accept_rate: autoAcceptRate,
      false_positive_rate: falsePositiveRate,
      auto_accept_target_met: autoAcceptRate >= 80,
      false_positive_target_met: falsePositiveRate <= 5
    };
  }

  // Test Case 4: Manual Review Queue Size
  async testManualReviewQueueSize() {
    console.log('\n🎯 Test 4: Manual Review Queue Size (<20% target)');
    console.log('==============================================');
    
    // Large diverse phrase set  
    const allTestPhrases = [
      // Auto-accept candidates (75+)
      'taylor swift', 'ice cream', 'coffee shop', 'basketball court', 'hot dog',
      
      // Likely accept candidates (55-74)
      'machine learning', 'social media', 'credit card', 'video game', 'post office',
      'french fries', 'swimming pool', 'apple pie', 'rock music', 'gas station',
      
      // Manual review candidates (55-74)
      'artificial intelligence', 'online shopping', 'search engine', 'mobile phone',
      'fast food', 'pop music', 'movie theater', 'high school', 'fire station',
      
      // Auto-reject candidates (<55)
      'completely random', 'abstract concept', 'weird situation', 'strange energy',
      'random vibe', 'conceptual framework', 'theoretical approach', 'strategic initiative',
      'operational excellence', 'innovative solution', 'disruptive paradigm'
    ];
    
    let autoAccept = 0; // ≥75
    let manualReview = 0; // 55-74  
    let autoReject = 0; // <55
    
    console.log('\n📊 Scoring phrase distribution...');
    
    for (const phrase of allTestPhrases) {
      try {
        const result = await this.engine.scorePhrase(phrase);
        
        if (result.final_score >= 75) {
          autoAccept++;
          console.log(`✅ AUTO-ACCEPT: "${phrase}" → ${result.final_score.toFixed(1)}/100`);
        } else if (result.final_score >= 55) {
          manualReview++;
          console.log(`⚠️ MANUAL REVIEW: "${phrase}" → ${result.final_score.toFixed(1)}/100`);
        } else {
          autoReject++;
          console.log(`❌ AUTO-REJECT: "${phrase}" → ${result.final_score.toFixed(1)}/100`);
        }
        
      } catch (error) {
        console.error(`❌ Error scoring "${phrase}":`, error.message);
      }
    }
    
    const totalProcessed = autoAccept + manualReview + autoReject;
    const manualReviewRate = (manualReview / totalProcessed) * 100;
    
    console.log('\n📊 Distribution Results:');
    console.log(`   ✅ Auto-accept (≥75): ${autoAccept}/${totalProcessed} (${((autoAccept/totalProcessed)*100).toFixed(1)}%)`);
    console.log(`   ⚠️ Manual review (55-74): ${manualReview}/${totalProcessed} (${manualReviewRate.toFixed(1)}%)`);
    console.log(`   ❌ Auto-reject (<55): ${autoReject}/${totalProcessed} (${((autoReject/totalProcessed)*100).toFixed(1)}%)`);
    console.log(`   ${manualReviewRate <= 20 ? '✅' : '❌'} Manual review target: ${manualReviewRate <= 20 ? 'MET' : 'FAILED'} (target: <20%)`);
    
    return {
      auto_accept_count: autoAccept,
      manual_review_count: manualReview,
      auto_reject_count: autoReject,
      manual_review_rate: manualReviewRate,
      target_met: manualReviewRate <= 20
    };
  }

  // Test Case 5: System Health & Resource Usage
  async testSystemHealth() {
    console.log('\n🎯 Test 5: System Health & Resource Usage');
    console.log('======================================');
    
    // Memory usage before
    const memBefore = process.memoryUsage();
    console.log('📊 Memory usage before tests:');
    console.log(`   RSS: ${(memBefore.rss / 1024 / 1024).toFixed(1)} MB`);
    console.log(`   Heap Used: ${(memBefore.heapUsed / 1024 / 1024).toFixed(1)} MB`);
    
    // Component health checks
    const healthResults = {};
    
    try {
      // Test individual component health
      const distinctivenessStats = await this.engine.distinctivenessScorer.getStats();
      const describabilityStats = await this.engine.describabilityScorer.getStats();
      
      healthResults.distinctiveness = distinctivenessStats;
      healthResults.describability = describabilityStats;
      
      console.log('\n🏥 Component Health:');
      console.log(`   🔍 Distinctiveness: ${distinctivenessStats.service} (${distinctivenessStats.processed_count} processed)`);
      console.log(`   📖 Describability: ${describabilityStats.service} (${describabilityStats.processed_count} processed)`);
      
    } catch (error) {
      console.error('❌ Error checking component health:', error.message);
    }
    
    // Memory usage after
    const memAfter = process.memoryUsage();
    const memDelta = {
      rss: memAfter.rss - memBefore.rss,
      heapUsed: memAfter.heapUsed - memBefore.heapUsed
    };
    
    console.log('\n📊 Memory usage after tests:');
    console.log(`   RSS: ${(memAfter.rss / 1024 / 1024).toFixed(1)} MB (Δ ${(memDelta.rss / 1024 / 1024).toFixed(1)} MB)`);
    console.log(`   Heap Used: ${(memAfter.heapUsed / 1024 / 1024).toFixed(1)} MB (Δ ${(memDelta.heapUsed / 1024 / 1024).toFixed(1)} MB)`);
    
    this.results.performance.system_health = {
      memory_before: memBefore,
      memory_after: memAfter,
      memory_delta: memDelta,
      component_health: healthResults
    };
    
    return healthResults;
  }

  // Final Results Summary
  async generateFinalReport() {
    console.log('\n\n🎯 PHRASEMACHINE V2 BENCHMARK RESULTS');
    console.log('======================================');
    
    // Summary of all tests
    console.log('\n📊 ACCEPTANCE CRITERIA VALIDATION:');
    console.log('');
    
    // Calculate overall metrics from individual test results
    const avgLatency = this.results.performance.individual_scores.reduce((sum, r) => sum + r.duration_ms, 0) / this.results.performance.individual_scores.length;
    
    console.log('1. 🏃 PERFORMANCE (<300ms average latency)');
    console.log(`   Average latency: ${avgLatency.toFixed(1)}ms`);
    console.log(`   Status: ${avgLatency <= 300 ? '✅ MET' : '❌ FAILED'}`);
    console.log('');
    
    console.log('2. 🎯 AUTO-ACCEPT RATE (>80% for high-quality phrases)');
    const autoAcceptCount = this.results.accuracy.high_quality_phrases.filter(p => p.auto_accepted).length;
    const autoAcceptRate = (autoAcceptCount / this.results.accuracy.high_quality_phrases.length) * 100;
    console.log(`   Auto-accept rate: ${autoAcceptRate.toFixed(1)}% (${autoAcceptCount}/${this.results.accuracy.high_quality_phrases.length})`);
    console.log(`   Status: ${autoAcceptRate >= 80 ? '✅ MET' : '❌ FAILED'}`);
    console.log('');
    
    console.log('3. 🚫 FALSE-POSITIVE RATE (<5% for low-quality phrases)');
    const falsePositiveCount = this.results.accuracy.low_quality_phrases.filter(p => p.false_positive).length;
    const falsePositiveRate = (falsePositiveCount / this.results.accuracy.low_quality_phrases.length) * 100;
    console.log(`   False-positive rate: ${falsePositiveRate.toFixed(1)}% (${falsePositiveCount}/${this.results.accuracy.low_quality_phrases.length})`);
    console.log(`   Status: ${falsePositiveRate <= 5 ? '✅ MET' : '❌ FAILED'}`);
    console.log('');
    
    console.log('4. ⚠️ MANUAL REVIEW QUEUE (<20% of phrases)');
    const manualReviewCount = Object.values(this.results.classification_distribution).reduce((sum, count, idx) => {
      // Assuming acceptable = manual review (55-74 range)
      return idx === 2 ? sum + count : sum; // Index 2 = 'acceptable' 
    }, 0);
    const totalClassified = Object.values(this.results.classification_distribution).reduce((sum, count) => sum + count, 0);
    const manualReviewRate = totalClassified > 0 ? (manualReviewCount / totalClassified) * 100 : 0;
    console.log(`   Manual review rate: ${manualReviewRate.toFixed(1)}% (${manualReviewCount}/${totalClassified})`);
    console.log(`   Status: ${manualReviewRate <= 20 ? '✅ MET' : '❌ FAILED'}`);
    console.log('');
    
    // Overall system status
    const allTargetsMet = avgLatency <= 300 && autoAcceptRate >= 80 && falsePositiveRate <= 5 && manualReviewRate <= 20;
    
    console.log('🎯 OVERALL SYSTEM STATUS:');
    console.log(`   ${allTargetsMet ? '🎉 ALL TARGETS MET' : '⚠️ SOME TARGETS NOT MET'}`);
    console.log(`   Ready for production: ${allTargetsMet ? 'YES ✅' : 'NEEDS OPTIMIZATION ⚠️'}`);
    
    return {
      all_targets_met: allTargetsMet,
      performance_target_met: avgLatency <= 300,
      auto_accept_target_met: autoAcceptRate >= 80,
      false_positive_target_met: falsePositiveRate <= 5,
      manual_review_target_met: manualReviewRate <= 20,
      summary: {
        avg_latency_ms: avgLatency,
        auto_accept_rate: autoAcceptRate,
        false_positive_rate: falsePositiveRate,
        manual_review_rate: manualReviewRate
      }
    };
  }

  // Run all benchmarks
  async runAllBenchmarks() {
    try {
      await this.initialize();
      
      await this.testIndividualScoringPerformance();
      await this.testBatchProcessingPerformance();
      await this.testQualityClassificationAccuracy();
      await this.testManualReviewQueueSize();
      await this.testSystemHealth();
      
      const finalReport = await this.generateFinalReport();
      
      return finalReport;
      
    } catch (error) {
      console.error('❌ Benchmark suite failed:', error);
      throw error;
    }
  }
}

// Run benchmarks if called directly
async function main() {
  const benchmarks = new PerformanceBenchmarks();
  
  try {
    const results = await benchmarks.runAllBenchmarks();
    
    if (results.all_targets_met) {
      console.log('\n🎉 All acceptance criteria met - PhraseMachine v2 ready for production!');
      process.exit(0);
    } else {
      console.log('\n⚠️ Some acceptance criteria not met - optimization needed');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Benchmark execution failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = PerformanceBenchmarks;