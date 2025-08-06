const DistinctivenessScorer = require('../../services/scoring/distinctiveness-scorer');
const DescribabilityScorer = require('../../services/scoring/describability-scorer');

describe('Integration Tests - Scoring Pipeline', () => {
  let distinctivenessScorer;
  let describabilityScorer;
  
  beforeAll(async () => {
    distinctivenessScorer = new DistinctivenessScorer();
    describabilityScorer = new DescribabilityScorer();
    
    // Mock concreteness processor for consistent integration testing
    describabilityScorer.concretenessProcessor.scoreConcreteness = jest.fn().mockImplementation(async (phrase) => {
      // Simulate realistic concreteness scores based on phrase content
      const concreteWords = ['pizza', 'coffee', 'shop', 'delivery', 'court', 'basketball'];
      const abstractWords = ['strategy', 'concept', 'intelligence', 'growth', 'vibe', 'energy'];
      
      const words = phrase.toLowerCase().split(' ');
      let totalConcreteness = 0;
      let wordCount = 0;
      
      words.forEach(word => {
        if (concreteWords.includes(word)) {
          totalConcreteness += 4.5; // High concreteness
          wordCount++;
        } else if (abstractWords.includes(word)) {
          totalConcreteness += 2.0; // Low concreteness
          wordCount++;
        } else {
          totalConcreteness += 3.2; // Medium concreteness
          wordCount++;
        }
      });
      
      const avgConcreteness = wordCount > 0 ? totalConcreteness / wordCount : 3.0;
      
      return {
        overall_concreteness: avgConcreteness,
        word_scores: {},
        words_found: wordCount,
        duration_ms: 30
      };
    });
  });
  
  afterAll(async () => {
    if (distinctivenessScorer) await distinctivenessScorer.close();
    if (describabilityScorer) await describabilityScorer.close();
  });

  describe('Integration - Cross-Component Phrase Analysis', () => {
    test('should provide complementary scoring for technical terms', async () => {
      const phrases = ['machine learning', 'artificial intelligence', 'quantum computing'];
      const results = [];
      
      for (const phrase of phrases) {
        const distinctiveness = await distinctivenessScorer.scoreDistinctiveness(phrase);
        const describability = await describabilityScorer.scoreDescribability(phrase);
        
        results.push({
          phrase,
          distinctiveness: distinctiveness.score,
          describability: describability.total_score,
          total: distinctiveness.score + describability.total_score,
          distinctivenessMethod: distinctiveness.scoring_method,
          describabilityBreakdown: describability.breakdown
        });
        
        // Technical terms should score well on distinctiveness
        expect(distinctiveness.score).toBeGreaterThan(0);
        
        // Should provide meaningful scoring breakdown
        expect(distinctiveness.components).toHaveProperty('wikidata');
        expect(distinctiveness.components).toHaveProperty('pmi');
        expect(distinctiveness.components).toHaveProperty('wordnet');
        
        expect(describability.components).toHaveProperty('concreteness');
        expect(describability.components).toHaveProperty('proper_noun');
        expect(describability.components).toHaveProperty('weak_head');
      }
      
      console.log('📊 Technical Terms Analysis:');
      results.forEach(r => {
        console.log(`   "${r.phrase}": D:${r.distinctiveness}/25, Desc:${r.describability}/25, Total:${r.total}/50`);
        console.log(`      Method: ${r.distinctivenessMethod}, Breakdown: [C:${r.describabilityBreakdown.concreteness_points}, P:${r.describabilityBreakdown.proper_noun_points}, W:${r.describabilityBreakdown.weak_head_points}]`);
      });
      
      // All should have reasonable total scores
      results.forEach(r => {
        expect(r.total).toBeGreaterThan(0);
        expect(r.total).toBeLessThanOrEqual(50);
      });
    });

    test('should handle celebrity names with proper scoring', async () => {
      const celebrityPhrases = ['Taylor Swift', 'Elon Musk', 'Albert Einstein'];
      const results = [];
      
      for (const phrase of celebrityPhrases) {
        const distinctiveness = await distinctivenessScorer.scoreDistinctiveness(phrase);
        const describability = await describabilityScorer.scoreDescribability(phrase);
        
        results.push({
          phrase,
          distinctiveness: distinctiveness.score,
          describability: describability.total_score,
          hasProperNoun: describability.breakdown.proper_noun_points > 0,
          properNounDetected: describability.components.proper_noun.detected
        });
        
        // Celebrity names should be detected as proper nouns
        expect(describability.breakdown.proper_noun_points).toBe(5);
        expect(describability.components.proper_noun.detected.length).toBeGreaterThan(0);
        
        // Should score well overall (concrete + proper noun bonus)
        expect(describability.total_score).toBeGreaterThan(15);
      }
      
      console.log('📊 Celebrity Names Analysis:');
      results.forEach(r => {
        console.log(`   "${r.phrase}": D:${r.distinctiveness}/25, Desc:${r.describability}/25, ProperNoun:${r.hasProperNoun}`);
        console.log(`      Detected: ${r.properNounDetected.map(p => p.text).join(', ')}`);
      });
    });

    test('should penalize abstract concepts appropriately', async () => {
      const abstractPhrases = ['marketing strategy', 'brand energy', 'social media vibe', 'business culture'];
      const results = [];
      
      for (const phrase of abstractPhrases) {
        const distinctiveness = await distinctivenessScorer.scoreDistinctiveness(phrase);
        const describability = await describabilityScorer.scoreDescribability(phrase);
        
        results.push({
          phrase,
          distinctiveness: distinctiveness.score,
          describability: describability.total_score,
          weakHeadPenalty: describability.breakdown.weak_head_points,
          weakHeadPatterns: describability.components.weak_head.patterns_found,
          concretenessBand: describability.components.concreteness.band
        });
        
        // Should detect weak-head patterns
        expect(describability.breakdown.weak_head_points).toBe(-10);
        expect(describability.components.weak_head.patterns_found.length).toBeGreaterThan(0);
        
        // Total describability should be reduced due to penalty
        expect(describability.total_score).toBeLessThanOrEqual(15); // Reduced by penalty
      }
      
      console.log('📊 Abstract Concepts Analysis:');
      results.forEach(r => {
        console.log(`   "${r.phrase}": D:${r.distinctiveness}/25, Desc:${r.describability}/25, Penalty:${r.weakHeadPenalty}`);
        console.log(`      Patterns: ${r.weakHeadPatterns.map(p => p.word).join(', ')}, Concreteness: ${r.concretenessBand}`);
      });
    });

    test('should handle concrete everyday phrases well', async () => {
      const concretePhrases = ['pizza delivery', 'coffee shop', 'basketball court', 'fire truck'];
      const results = [];
      
      for (const phrase of concretePhrases) {
        const distinctiveness = await distinctivenessScorer.scoreDistinctiveness(phrase);
        const describability = await describabilityScorer.scoreDescribability(phrase);
        
        results.push({
          phrase,
          distinctiveness: distinctiveness.score,
          describability: describability.total_score,
          total: distinctiveness.score + describability.total_score,
          concretenessBand: describability.components.concreteness.band,
          concretenessPoints: describability.breakdown.concreteness_points
        });
        
        // Should score high on concreteness
        expect(describability.components.concreteness.band).toBe('high');
        expect(describability.breakdown.concreteness_points).toBe(15);
        
        // Should not have weak-head penalties
        expect(describability.breakdown.weak_head_points).toBe(0);
        
        // Should have good total describability
        expect(describability.total_score).toBeGreaterThanOrEqual(15);
      }
      
      console.log('📊 Concrete Phrases Analysis:');
      results.forEach(r => {
        console.log(`   "${r.phrase}": D:${r.distinctiveness}/25, Desc:${r.describability}/25, Total:${r.total}/50`);
        console.log(`      Concreteness: ${r.concretenessBand} (${r.concretenessPoints} pts)`);
      });
    });
  });

  describe('Integration - Scoring Consistency and Reliability', () => {
    test('should provide consistent scores across multiple runs', async () => {
      const testPhrase = 'machine learning';
      const runs = 5;
      const distinctivenessScores = [];
      const describabilityScores = [];
      
      for (let i = 0; i < runs; i++) {
        const distinctiveness = await distinctivenessScorer.scoreDistinctiveness(testPhrase);
        const describability = await describabilityScorer.scoreDescribability(testPhrase);
        
        distinctivenessScores.push(distinctiveness.score);
        describabilityScores.push(describability.total_score);
      }
      
      // All scores should be identical (deterministic)
      const distinctivenessUnique = [...new Set(distinctivenessScores)];
      const describabilityUnique = [...new Set(describabilityScores)];
      
      expect(distinctivenessUnique).toHaveLength(1);
      expect(describabilityUnique).toHaveLength(1);
      
      console.log(`📊 Consistency Test: "${testPhrase}" scored D:${distinctivenessUnique[0]}, Desc:${describabilityUnique[0]} across ${runs} runs`);
    });

    test('should handle edge cases gracefully', async () => {
      const edgeCases = [
        'a b',                    // Minimal phrase
        'very long complex phrase', // Longer phrase
        'TEST UPPERCASE',         // Case variations
        'phrase-with-hyphens',    // Special characters
        'mixed123numbers',        // Mixed content
      ];
      
      const results = [];
      
      for (const phrase of edgeCases) {
        try {
          const distinctiveness = await distinctivenessScorer.scoreDistinctiveness(phrase);
          const describability = await describabilityScorer.scoreDescribability(phrase);
          
          results.push({
            phrase,
            distinctiveness: distinctiveness.score,
            describability: describability.total_score,
            success: true,
            error: null
          });
          
          // Should return valid scores
          expect(distinctiveness.score).toBeGreaterThanOrEqual(0);
          expect(distinctiveness.score).toBeLessThanOrEqual(25);
          expect(describability.total_score).toBeGreaterThanOrEqual(0);
          expect(describability.total_score).toBeLessThanOrEqual(25);
          
        } catch (error) {
          results.push({
            phrase,
            distinctiveness: 0,
            describability: 0,
            success: false,
            error: error.message
          });
        }
      }
      
      console.log('📊 Edge Cases Analysis:');
      results.forEach(r => {
        const status = r.success ? '✅' : '❌';
        console.log(`   ${status} "${r.phrase}": D:${r.distinctiveness}, Desc:${r.describability}`);
        if (!r.success) console.log(`      Error: ${r.error}`);
      });
      
      // Most edge cases should be handled successfully
      const successRate = results.filter(r => r.success).length / results.length;
      expect(successRate).toBeGreaterThan(0.8); // 80% success rate minimum
    });
  });

  describe('Integration - Full Pipeline Simulation', () => {
    test('should simulate realistic phrase generation pipeline', async () => {
      // Simulate a batch of phrases that might come from LLM generation
      const generatedPhrases = [
        // High-quality phrases (should score well)
        'coffee shop', 'Taylor Swift', 'basketball court', 'pizza delivery',
        // Medium-quality phrases
        'social media', 'art gallery', 'machine learning', 'ice cream',
        // Low-quality phrases (should be filtered out)
        'marketing strategy', 'brand energy', 'abstract concept', 'random vibe'
      ];
      
      const pipelineResults = [];
      
      for (const phrase of generatedPhrases) {
        const startTime = Date.now();
        
        const [distinctiveness, describability] = await Promise.all([
          distinctivenessScorer.scoreDistinctiveness(phrase),
          describabilityScorer.scoreDescribability(phrase)
        ]);
        
        const totalScore = distinctiveness.score + describability.total_score;
        const processingTime = Date.now() - startTime;
        
        pipelineResults.push({
          phrase,
          distinctivenessScore: distinctiveness.score,
          describabilityScore: describability.total_score,
          totalScore,
          processingTime,
          quality: totalScore >= 30 ? 'high' : totalScore >= 15 ? 'medium' : 'low',
          decision: totalScore >= 30 ? 'auto-accept' : totalScore >= 15 ? 'manual-review' : 'reject'
        });
        
        // Performance requirement
        expect(processingTime).toBeLessThan(600); // 300ms per scorer
      }
      
      // Analyze pipeline results
      const highQuality = pipelineResults.filter(r => r.quality === 'high');
      const mediumQuality = pipelineResults.filter(r => r.quality === 'medium');
      const lowQuality = pipelineResults.filter(r => r.quality === 'low');
      
      const autoAccept = pipelineResults.filter(r => r.decision === 'auto-accept');
      const manualReview = pipelineResults.filter(r => r.decision === 'manual-review');
      const reject = pipelineResults.filter(r => r.decision === 'reject');
      
      console.log('📊 Pipeline Simulation Results:');
      console.log(`   📈 Quality Distribution: ${highQuality.length} high, ${mediumQuality.length} medium, ${lowQuality.length} low`);
      console.log(`   🎯 Decision Distribution: ${autoAccept.length} auto-accept, ${manualReview.length} manual-review, ${reject.length} reject`);
      
      // Detailed results
      pipelineResults.forEach(r => {
        const status = r.quality === 'high' ? '🟢' : r.quality === 'medium' ? '🟡' : '🔴';
        console.log(`   ${status} "${r.phrase}": ${r.totalScore}/50 (D:${r.distinctivenessScore}, Desc:${r.describabilityScore}) - ${r.decision} - ${r.processingTime}ms`);
      });
      
      // Pipeline quality expectations
      expect(highQuality.length).toBeGreaterThan(0); // Should identify some high-quality phrases
      expect(lowQuality.length).toBeGreaterThan(0);  // Should identify some low-quality phrases
      expect(reject.length).toBeGreaterThan(0);       // Should reject some phrases
      
      // Performance expectations
      const avgProcessingTime = pipelineResults.reduce((sum, r) => sum + r.processingTime, 0) / pipelineResults.length;
      expect(avgProcessingTime).toBeLessThan(600);
      
      console.log(`   ⏱️ Average processing time: ${avgProcessingTime.toFixed(1)}ms per phrase`);
    });

    test('should demonstrate scoring algorithm decision boundaries', async () => {
      const boundaryTestCases = [
        // Test phrases designed to hit specific score boundaries
        { phrase: 'coffee shop', expectedCategory: 'high', reason: 'High concreteness concrete phrase' },
        { phrase: 'Taylor Swift concert', expectedCategory: 'high', reason: 'High concreteness + proper noun' },
        { phrase: 'machine learning', expectedCategory: 'medium', reason: 'Technical term with some distinctiveness' },
        { phrase: 'social media vibe', expectedCategory: 'low', reason: 'Medium concreteness with weak-head penalty' },
        { phrase: 'abstract strategy', expectedCategory: 'low', reason: 'Low concreteness with weak-head penalty' }
      ];
      
      const boundaryResults = [];
      
      for (const testCase of boundaryTestCases) {
        const distinctiveness = await distinctivenessScorer.scoreDistinctiveness(testCase.phrase);
        const describability = await describabilityScorer.scoreDescribability(testCase.phrase);
        
        const totalScore = distinctiveness.score + describability.total_score;
        const actualCategory = totalScore >= 30 ? 'high' : totalScore >= 15 ? 'medium' : 'low';
        
        boundaryResults.push({
          phrase: testCase.phrase,
          expectedCategory: testCase.expectedCategory,
          actualCategory,
          totalScore,
          reason: testCase.reason,
          matches: actualCategory === testCase.expectedCategory
        });
        
        console.log(`📊 Boundary Test: "${testCase.phrase}"`);
        console.log(`   Expected: ${testCase.expectedCategory}, Actual: ${actualCategory}, Score: ${totalScore}/50`);
        console.log(`   Reason: ${testCase.reason}`);
        console.log(`   Components: D:${distinctiveness.score}/25, Desc:${describability.total_score}/25`);
      }
      
      // Most boundary tests should match expectations
      const accuracy = boundaryResults.filter(r => r.matches).length / boundaryResults.length;
      expect(accuracy).toBeGreaterThan(0.6); // 60% accuracy on boundary cases
      
      console.log(`📊 Boundary Test Accuracy: ${(accuracy * 100).toFixed(1)}%`);
    });
  });
}); 