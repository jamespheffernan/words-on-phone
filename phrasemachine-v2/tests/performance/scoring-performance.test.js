const DistinctivenessScorer = require('../../services/scoring/distinctiveness-scorer');
const DescribabilityScorer = require('../../services/scoring/describability-scorer');

describe('Performance Benchmarks', () => {
  let distinctivenessScorer;
  let describabilityScorer;
  
  beforeAll(async () => {
    distinctivenessScorer = new DistinctivenessScorer();
    describabilityScorer = new DescribabilityScorer();
    
    // Mock the concreteness processor for consistent performance testing
    describabilityScorer.concretenessProcessor.scoreConcreteness = jest.fn().mockResolvedValue({
      overall_concreteness: 3.5,
      word_scores: { test: 3.5 },
      words_found: 1,
      duration_ms: 25
    });
  });
  
  afterAll(async () => {
    if (distinctivenessScorer) await distinctivenessScorer.close();
    if (describabilityScorer) await describabilityScorer.close();
  });

  describe('Performance - Distinctiveness Scoring', () => {
    test('should score single phrases under 300ms', async () => {
      const testPhrases = global.testUtils.testPhrases.technical;
      const results = [];
      
      for (const phrase of testPhrases) {
        const measurement = await global.testUtils.measurePerformance(
          () => distinctivenessScorer.scoreDistinctiveness(phrase),
          300
        );
        
        results.push({
          phrase,
          duration: measurement.duration,
          withinThreshold: measurement.withinThreshold
        });
        
        global.performanceTracker.track(`distinctiveness-${phrase}`, measurement.duration);
        
        expect(measurement.withinThreshold).toBe(true);
        expect(measurement.duration).toBeLessThan(300);
      }
      
      console.log('📊 Distinctiveness Performance Results:');
      results.forEach(r => {
        const status = r.withinThreshold ? '✅' : '❌';
        console.log(`   ${status} "${r.phrase}": ${r.duration}ms`);
      });
    });

    test('should handle batch processing efficiently', async () => {
      const phrases = [
        'machine learning', 'artificial intelligence', 'quantum computing',
        'social media', 'coffee shop', 'pizza delivery'
      ];
      
      const measurement = await global.testUtils.measurePerformance(
        () => distinctivenessScorer.batchScoreDistinctiveness(phrases),
        1800 // 300ms * 6 phrases
      );
      
      global.performanceTracker.track('distinctiveness-batch', measurement.duration);
      
      expect(measurement.withinThreshold).toBe(true);
      expect(measurement.result.summary.avg_duration_ms).toBeLessThan(300);
      
      console.log(`📊 Batch Distinctiveness: ${measurement.duration}ms total, ${measurement.result.summary.avg_duration_ms}ms avg`);
    });

    test('should maintain performance under load', async () => {
      const phrases = Array(20).fill('test phrase');
      const concurrentPromises = [];
      
      const startTime = Date.now();
      
      // Run 5 concurrent batch requests
      for (let i = 0; i < 5; i++) {
        concurrentPromises.push(
          distinctivenessScorer.batchScoreDistinctiveness(phrases.slice(i * 4, (i + 1) * 4))
        );
      }
      
      const results = await Promise.all(concurrentPromises);
      const totalDuration = Date.now() - startTime;
      
      global.performanceTracker.track('distinctiveness-concurrent', totalDuration);
      
      // Should complete all concurrent requests in reasonable time
      expect(totalDuration).toBeLessThan(2000);
      
      // Each batch should maintain individual performance
      results.forEach(result => {
        expect(result.summary.avg_duration_ms).toBeLessThan(300);
      });
      
      console.log(`📊 Concurrent Distinctiveness: ${totalDuration}ms for 5 concurrent batches`);
    });
  });

  describe('Performance - Describability Scoring', () => {
    test('should score single phrases under 300ms', async () => {
      const testPhrases = [
        ...global.testUtils.testPhrases.highConcreteness,
        ...global.testUtils.testPhrases.properNouns,
        ...global.testUtils.testPhrases.weakHeadPatterns
      ];
      const results = [];
      
      for (const phrase of testPhrases) {
        const measurement = await global.testUtils.measurePerformance(
          () => describabilityScorer.scoreDescribability(phrase),
          300
        );
        
        results.push({
          phrase,
          duration: measurement.duration,
          withinThreshold: measurement.withinThreshold
        });
        
        global.performanceTracker.track(`describability-${phrase}`, measurement.duration);
        
        expect(measurement.withinThreshold).toBe(true);
        expect(measurement.duration).toBeLessThan(300);
      }
      
      console.log('📊 Describability Performance Results:');
      results.forEach(r => {
        const status = r.withinThreshold ? '✅' : '❌';
        console.log(`   ${status} "${r.phrase}": ${r.duration}ms`);
      });
    });

    test('should handle batch processing efficiently', async () => {
      const phrases = [
        'Taylor Swift', 'pizza delivery', 'marketing strategy',
        'coffee shop', 'brand energy', 'social media'
      ];
      
      const measurement = await global.testUtils.measurePerformance(
        () => describabilityScorer.batchScoreDescribability(phrases),
        1800 // 300ms * 6 phrases
      );
      
      global.performanceTracker.track('describability-batch', measurement.duration);
      
      expect(measurement.withinThreshold).toBe(true);
      expect(measurement.result.summary.avg_duration_ms).toBeLessThan(300);
      
      console.log(`📊 Batch Describability: ${measurement.duration}ms total, ${measurement.result.summary.avg_duration_ms}ms avg`);
    });

    test('should maintain performance under load', async () => {
      const phrases = Array(20).fill('test phrase');
      const concurrentPromises = [];
      
      const startTime = Date.now();
      
      // Run 5 concurrent batch requests
      for (let i = 0; i < 5; i++) {
        concurrentPromises.push(
          describabilityScorer.batchScoreDescribability(phrases.slice(i * 4, (i + 1) * 4))
        );
      }
      
      const results = await Promise.all(concurrentPromises);
      const totalDuration = Date.now() - startTime;
      
      global.performanceTracker.track('describability-concurrent', totalDuration);
      
      // Should complete all concurrent requests in reasonable time
      expect(totalDuration).toBeLessThan(2000);
      
      // Each batch should maintain individual performance
      results.forEach(result => {
        expect(result.summary.avg_duration_ms).toBeLessThan(300);
      });
      
      console.log(`📊 Concurrent Describability: ${totalDuration}ms for 5 concurrent batches`);
    });
  });

  describe('Performance - Combined Scoring Pipeline', () => {
    test('should score phrases with both systems under 600ms total', async () => {
      const testPhrases = ['machine learning', 'Taylor Swift', 'marketing strategy'];
      const results = [];
      
      for (const phrase of testPhrases) {
        const measurement = await global.testUtils.measurePerformance(
          async () => {
            const [distinctiveness, describability] = await Promise.all([
              distinctivenessScorer.scoreDistinctiveness(phrase),
              describabilityScorer.scoreDescribability(phrase)
            ]);
            return { distinctiveness, describability };
          },
          600 // 300ms * 2 systems
        );
        
        results.push({
          phrase,
          duration: measurement.duration,
          withinThreshold: measurement.withinThreshold,
          distinctivenessScore: measurement.result.distinctiveness.score,
          describabilityScore: measurement.result.describability.total_score
        });
        
        global.performanceTracker.track(`combined-${phrase}`, measurement.duration);
        
        expect(measurement.withinThreshold).toBe(true);
        expect(measurement.duration).toBeLessThan(600);
      }
      
      console.log('📊 Combined Scoring Performance Results:');
      results.forEach(r => {
        const status = r.withinThreshold ? '✅' : '❌';
        console.log(`   ${status} "${r.phrase}": ${r.duration}ms (D:${r.distinctivenessScore}, Desc:${r.describabilityScore})`);
      });
    });

    test('should handle realistic workload efficiently', async () => {
      // Simulate realistic mixed workload
      const workload = [
        // High-frequency technical terms
        ...Array(5).fill('machine learning'),
        // Celebrity names with proper nouns
        ...Array(3).fill('Taylor Swift'),
        // Abstract concepts with penalties
        ...Array(2).fill('marketing strategy'),
        // Common concrete phrases
        ...Array(10).fill('coffee shop')
      ];
      
      const startTime = Date.now();
      
      // Process workload in parallel batches
      const batchSize = 5;
      const batches = [];
      for (let i = 0; i < workload.length; i += batchSize) {
        batches.push(workload.slice(i, i + batchSize));
      }
      
      const batchPromises = batches.map(async (batch) => {
        const results = [];
        for (const phrase of batch) {
          const [distinctiveness, describability] = await Promise.all([
            distinctivenessScorer.scoreDistinctiveness(phrase),
            describabilityScorer.scoreDescribability(phrase)
          ]);
          results.push({ phrase, distinctiveness, describability });
        }
        return results;
      });
      
      const batchResults = await Promise.all(batchPromises);
      const totalDuration = Date.now() - startTime;
      
      global.performanceTracker.track('realistic-workload', totalDuration);
      
      // Should handle 20 phrases in reasonable time
      expect(totalDuration).toBeLessThan(8000); // 400ms per phrase on average with batching
      
      const totalPhrases = batchResults.flat().length;
      const avgDuration = totalDuration / totalPhrases;
      
      expect(avgDuration).toBeLessThan(600); // 600ms per phrase for combined scoring
      
      console.log(`📊 Realistic Workload: ${totalDuration}ms for ${totalPhrases} phrases (${avgDuration.toFixed(1)}ms avg)`);
    });
  });

  describe('Performance - Memory and Resource Usage', () => {
    test('should not leak memory during extended operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform extended operations
      for (let i = 0; i < 100; i++) {
        await distinctivenessScorer.scoreDistinctiveness('test phrase');
        await describabilityScorer.scoreDescribability('test phrase');
      }
      
      // Force garbage collection if possible
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseKB = memoryIncrease / 1024;
      
      // Memory increase should be reasonable (less than 10MB for 200 operations)
      expect(memoryIncreaseKB).toBeLessThan(10240); // 10MB in KB
      
      console.log(`📊 Memory Usage: +${memoryIncreaseKB.toFixed(1)}KB after 200 operations`);
      
      global.performanceTracker.track('memory-test', memoryIncreaseKB);
    }, 60000); // Extended timeout for memory test
  });
}); 