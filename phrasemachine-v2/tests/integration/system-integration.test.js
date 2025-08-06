const fetch = require('node-fetch');

// Test configuration
const SERVICES = {
  main_api: { port: 3000, name: 'Main API' },
  distinctiveness: { port: 3004, name: 'Distinctiveness Scorer' },
  describability: { port: 3005, name: 'Describability Scorer' },
  legacy: { port: 3006, name: 'Legacy Heuristics Scorer' },
  cultural: { port: 3007, name: 'Cultural Validation Scorer' },
  decision_engine: { port: 3008, name: 'Decision Engine' },
  llm_generator: { port: 3009, name: 'LLM Generator' }
};

const TEST_PHRASES = [
  'taylor swift',      // High scoring pop-culture phrase
  'pizza delivery',    // High scoring food phrase  
  'basketball court',  // High scoring sports phrase
  'abstract concept',  // Lower scoring abstract phrase
  'coffee shop'        // Good general phrase
];

const TEST_TIMEOUT = 30000; // 30 seconds

describe('PhraseMachine v2 System Integration Tests', () => {
  // Helper function to make service requests
  async function callService(serviceName, endpoint, options = {}) {
    const service = SERVICES[serviceName];
    const url = `http://localhost:${service.port}${endpoint}`;
    
    const requestOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      timeout: TEST_TIMEOUT
    };
    
    if (options.body) {
      requestOptions.body = JSON.stringify(options.body);
    }
    
    const response = await fetch(url, requestOptions);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`${service.name} error: ${data.message || response.statusText}`);
    }
    
    return data;
  }

  // Helper function to wait for services to be ready
  async function waitForServicesReady(maxAttempts = 30, delayMs = 2000) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`🔍 Health check attempt ${attempt}/${maxAttempts}...`);
        
        const healthChecks = await Promise.allSettled(
          Object.entries(SERVICES).map(async ([serviceName, service]) => {
            const response = await fetch(`http://localhost:${service.port}/health`, { timeout: 5000 });
            return { serviceName, status: response.ok ? 'healthy' : 'unhealthy' };
          })
        );
        
        const healthyServices = healthChecks.filter(check => 
          check.status === 'fulfilled' && check.value.status === 'healthy'
        ).length;
        
        console.log(`   📊 ${healthyServices}/${Object.keys(SERVICES).length} services healthy`);
        
        if (healthyServices >= Object.keys(SERVICES).length * 0.8) { // 80% healthy threshold
          console.log('✅ Services ready for testing');
          return true;
        }
        
        if (attempt < maxAttempts) {
          console.log(`   ⏳ Waiting ${delayMs}ms before next attempt...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
        
      } catch (error) {
        console.log(`   ❌ Health check failed: ${error.message}`);
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }
    
    throw new Error('Services not ready after maximum attempts');
  }

  beforeAll(async () => {
    console.log('🚀 Starting PhraseMachine v2 System Integration Tests');
    console.log('⏳ Waiting for all services to be ready...');
    
    await waitForServicesReady();
  }, 60000); // 1 minute timeout for setup

  describe('Service Health and Availability', () => {
    test.each(Object.entries(SERVICES))(
      'should have %s service healthy and responding',
      async (serviceName, service) => {
        const health = await callService(serviceName, '/health');
        
        expect(health).toHaveProperty('status');
        expect(['healthy', 'degraded']).toContain(health.status);
        expect(health).toHaveProperty('timestamp');
      }
    );

    test('should have main API reporting system health', async () => {
      const systemHealth = await callService('main_api', '/health');
      
      expect(systemHealth).toHaveProperty('system_status');
      expect(systemHealth).toHaveProperty('services');
      expect(systemHealth).toHaveProperty('metrics');
      expect(systemHealth.services).toBeInstanceOf(Object);
      expect(Object.keys(systemHealth.services).length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Individual Service Functionality', () => {
    test('should score phrases with distinctiveness service', async () => {
      const result = await callService('distinctiveness', '/batch-score-distinctiveness', {
        method: 'POST',
        body: { phrases: TEST_PHRASES }
      });
      
      expect(result).toHaveProperty('results');
      expect(result.results).toHaveLength(TEST_PHRASES.length);
      expect(result.results[0]).toHaveProperty('phrase');
      expect(result.results[0]).toHaveProperty('distinctiveness_score');
      expect(result.results[0].distinctiveness_score).toBeGreaterThanOrEqual(0);
      expect(result.results[0].distinctiveness_score).toBeLessThanOrEqual(25);
    });

    test('should score phrases with describability service', async () => {
      const result = await callService('describability', '/batch-score-describability', {
        method: 'POST',
        body: { phrases: TEST_PHRASES }
      });
      
      expect(result).toHaveProperty('results');
      expect(result.results).toHaveLength(TEST_PHRASES.length);
      expect(result.results[0]).toHaveProperty('phrase');
      expect(result.results[0]).toHaveProperty('describability_score');
      expect(result.results[0].describability_score).toBeGreaterThanOrEqual(0);
      expect(result.results[0].describability_score).toBeLessThanOrEqual(25);
    });

    test('should score phrases with legacy heuristics service', async () => {
      const result = await callService('legacy', '/batch-score-legacy-heuristics', {
        method: 'POST',
        body: { phrases: TEST_PHRASES }
      });
      
      expect(result).toHaveProperty('results');
      expect(result.results).toHaveLength(TEST_PHRASES.length);
      expect(result.results[0]).toHaveProperty('phrase');
      expect(result.results[0]).toHaveProperty('legacy_score');
      expect(result.results[0].legacy_score).toBeGreaterThanOrEqual(0);
      expect(result.results[0].legacy_score).toBeLessThanOrEqual(30);
    });

    test('should score phrases with cultural validation service', async () => {
      const result = await callService('cultural', '/batch-score-cultural-validation', {
        method: 'POST',
        body: { phrases: TEST_PHRASES }
      });
      
      expect(result).toHaveProperty('results');
      expect(result.results).toHaveLength(TEST_PHRASES.length);
      expect(result.results[0]).toHaveProperty('phrase');
      expect(result.results[0]).toHaveProperty('cultural_score');
      expect(result.results[0].cultural_score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Decision Engine Integration', () => {
    test('should provide unified scoring through decision engine', async () => {
      const result = await callService('decision_engine', '/batch-score-phrases', {
        method: 'POST',
        body: { phrases: TEST_PHRASES }
      });
      
      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('summary');
      expect(result.results).toHaveLength(TEST_PHRASES.length);
      
      // Check unified scoring structure
      const firstResult = result.results[0];
      expect(firstResult).toHaveProperty('phrase');
      expect(firstResult).toHaveProperty('final_score');
      expect(firstResult).toHaveProperty('quality_classification');
      expect(firstResult).toHaveProperty('decision_recommendation');
      expect(firstResult).toHaveProperty('component_scores');
      
      // Validate score ranges
      expect(firstResult.final_score).toBeGreaterThanOrEqual(0);
      expect(firstResult.final_score).toBeLessThanOrEqual(100);
      
      // Validate quality classifications
      expect(['excellent', 'good', 'acceptable', 'poor', 'unacceptable'])
        .toContain(firstResult.quality_classification);
      
      // Validate decision recommendations
      expect(['auto_accept', 'likely_accept', 'conditional_accept', 'likely_reject', 'auto_reject'])
        .toContain(firstResult.decision_recommendation);
    });

    test('should show quality score differences between phrase types', async () => {
      const culturalPhrases = ['taylor swift', 'netflix series'];
      const abstractPhrases = ['abstract concept', 'theoretical framework'];
      
      const culturalResult = await callService('decision_engine', '/batch-score-phrases', {
        method: 'POST',
        body: { phrases: culturalPhrases }
      });
      
      const abstractResult = await callService('decision_engine', '/batch-score-phrases', {
        method: 'POST',
        body: { phrases: abstractPhrases }
      });
      
      const culturalAvg = culturalResult.summary.avg_final_score;
      const abstractAvg = abstractResult.summary.avg_final_score;
      
      // Cultural phrases should generally score higher than abstract ones
      expect(culturalAvg).toBeGreaterThan(abstractAvg);
      expect(culturalAvg).toBeGreaterThan(50); // Should be decent quality
    });
  });

  describe('LLM Generator Integration', () => {
    test('should generate phrases with quality optimization', async () => {
      const result = await callService('llm_generator', '/generate-phrases', {
        method: 'POST',
        body: {
          count: 5,
          category: 'pop_culture',
          quality_target: 'good',
          use_feedback: false
        }
      });
      
      expect(result).toHaveProperty('generated_phrases');
      expect(result).toHaveProperty('scored_phrases');
      expect(result).toHaveProperty('quality_metrics');
      expect(result).toHaveProperty('performance');
      
      expect(result.generated_phrases).toHaveLength(5);
      expect(result.scored_phrases).toHaveLength(5);
      expect(result.quality_metrics.avg_score).toBeGreaterThan(0);
      
      // Check that phrases are related to pop culture
      const samplePhrase = result.generated_phrases[0];
      expect(typeof samplePhrase).toBe('string');
      expect(samplePhrase.length).toBeGreaterThan(0);
    });

    test('should generate diverse batch across categories', async () => {
      const result = await callService('llm_generator', '/generate-diverse-batch', {
        method: 'POST',
        body: {
          total_count: 12,
          categories: ['pop_culture', 'food', 'sports'],
          quality_distribution: { excellent: 0.3, good: 0.7 }
        }
      });
      
      expect(result).toHaveProperty('batch_result');
      expect(result.batch_result).toHaveProperty('all_phrases');
      expect(result.batch_result).toHaveProperty('by_category');
      expect(result.batch_result).toHaveProperty('overall_quality');
      
      expect(result.batch_result.all_phrases.length).toBeLessThanOrEqual(12);
      expect(result.batch_result.by_category).toHaveProperty('pop_culture');
      expect(result.batch_result.by_category).toHaveProperty('food');
      expect(result.batch_result.by_category).toHaveProperty('sports');
    });
  });

  describe('Main API Complete Workflow', () => {
    test('should handle complete evaluation and generation workflow', async () => {
      const result = await callService('main_api', '/evaluate-and-generate', {
        method: 'POST',
        body: {
          requirements: {
            category: 'general',
            count: 5,
            quality_target: 'good'
          },
          scoring_options: {
            detailed_analysis: true
          }
        }
      });
      
      expect(result).toHaveProperty('generation_result');
      expect(result).toHaveProperty('detailed_scoring');
      expect(result).toHaveProperty('system_performance');
      expect(result).toHaveProperty('metadata');
      
      // Check generation result
      expect(result.generation_result.generated_phrases).toHaveLength(5);
      expect(result.generation_result.scored_phrases).toHaveLength(5);
      
      // Check detailed scoring
      expect(result.detailed_scoring).toHaveProperty('distinctiveness');
      expect(result.detailed_scoring).toHaveProperty('describability');
      expect(result.detailed_scoring).toHaveProperty('legacy_heuristics');
      expect(result.detailed_scoring).toHaveProperty('cultural_validation');
      
      // Check performance metrics
      expect(result.system_performance.total_duration_ms).toBeGreaterThan(0);
      expect(result.system_performance.total_duration_ms).toBeLessThan(60000); // Under 1 minute
    });

    test('should score phrases with unified API', async () => {
      const result = await callService('main_api', '/score-phrases', {
        method: 'POST',
        body: {
          phrases: TEST_PHRASES,
          detailed: true
        }
      });
      
      expect(result).toHaveProperty('unified_scoring');
      expect(result).toHaveProperty('component_breakdown');
      expect(result).toHaveProperty('performance');
      
      // Check unified scoring
      expect(result.unified_scoring.results).toHaveLength(TEST_PHRASES.length);
      
      // Check component breakdown
      expect(result.component_breakdown.distinctiveness.results).toHaveLength(TEST_PHRASES.length);
      expect(result.component_breakdown.describability.results).toHaveLength(TEST_PHRASES.length);
      expect(result.component_breakdown.legacy_heuristics.results).toHaveLength(TEST_PHRASES.length);
      expect(result.component_breakdown.cultural_validation.results).toHaveLength(TEST_PHRASES.length);
    });

    test('should provide system capabilities information', async () => {
      const result = await callService('main_api', '/capabilities');
      
      expect(result).toHaveProperty('phrasemachine_version', '2.0.0');
      expect(result).toHaveProperty('system_capabilities');
      expect(result).toHaveProperty('service_capabilities');
      
      // Check system capabilities
      expect(result.system_capabilities).toHaveProperty('phrase_generation');
      expect(result.system_capabilities).toHaveProperty('phrase_scoring');
      expect(result.system_capabilities).toHaveProperty('performance_targets');
      
      // Check phrase generation capabilities
      expect(result.system_capabilities.phrase_generation.supported_categories)
        .toContain('pop_culture');
      expect(result.system_capabilities.phrase_generation.quality_targets)
        .toContain('good');
    });

    test('should provide comprehensive system statistics', async () => {
      const result = await callService('main_api', '/stats');
      
      expect(result).toHaveProperty('phrasemachine_version', '2.0.0');
      expect(result).toHaveProperty('system_metrics');
      expect(result).toHaveProperty('service_stats');
      expect(result).toHaveProperty('system_health');
      
      // Check system metrics
      expect(result.system_metrics.uptime_ms).toBeGreaterThan(0);
      expect(result.system_metrics.total_requests).toBeGreaterThanOrEqual(0);
      expect(result.system_metrics.success_rate).toMatch(/^\d+\.?\d*%$/);
      
      // Check service stats
      expect(result.service_stats).toHaveProperty('decision_engine');
      expect(result.service_stats).toHaveProperty('llm_generator');
    });
  });

  describe('System Performance and Reliability', () => {
    test('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 5;
      const requests = Array(concurrentRequests).fill().map(() =>
        callService('main_api', '/score-phrases', {
          method: 'POST',
          body: { phrases: ['test phrase'] }
        })
      );
      
      const startTime = Date.now();
      const results = await Promise.all(requests);
      const duration = Date.now() - startTime;
      
      // All requests should succeed
      expect(results).toHaveLength(concurrentRequests);
      results.forEach(result => {
        expect(result).toHaveProperty('unified_scoring');
      });
      
      // Should handle concurrent requests reasonably fast
      expect(duration).toBeLessThan(30000); // Under 30 seconds for 5 concurrent requests
    });

    test('should run comprehensive system test successfully', async () => {
      const result = await callService('main_api', '/test');
      
      expect(result).toHaveProperty('overall_result');
      expect(result).toHaveProperty('phases');
      expect(result.overall_result).toHaveProperty('status');
      expect(result.overall_result.status).toBe('passed');
      
      // Check individual test phases
      expect(result.phases).toHaveProperty('health_check');
      expect(result.phases).toHaveProperty('scoring_test');
      expect(result.phases).toHaveProperty('generation_test');
      expect(result.phases).toHaveProperty('workflow_test');
      
      // All phases should pass
      Object.values(result.phases).forEach(phase => {
        expect(phase.status).toBe('passed');
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle invalid phrase scoring gracefully', async () => {
      await expect(
        callService('main_api', '/score-phrases', {
          method: 'POST',
          body: { phrases: [] }
        })
      ).rejects.toThrow();
    });

    test('should handle too many phrases gracefully', async () => {
      const tooManyPhrases = Array(100).fill('test phrase');
      
      await expect(
        callService('main_api', '/score-phrases', {
          method: 'POST',
          body: { phrases: tooManyPhrases }
        })
      ).rejects.toThrow();
    });

    test('should handle invalid generation parameters gracefully', async () => {
      await expect(
        callService('main_api', '/evaluate-and-generate', {
          method: 'POST',
          body: {
            requirements: {
              count: 0,
              category: 'invalid_category'
            }
          }
        })
      ).rejects.toThrow();
    });
  });
}, TEST_TIMEOUT); 