const LLMGenerator = require('../../services/generation/llm-generator');

// Mock the dependencies
jest.mock('../../services/generation/llm-prompt-builder');
jest.mock('../../services/scoring/decision-engine');

const LLMPromptBuilder = require('../../services/generation/llm-prompt-builder');
const DecisionEngine = require('../../services/scoring/decision-engine');

describe('LLMGenerator', () => {
  let generator;
  let mockPromptBuilder, mockDecisionEngine;
  
  beforeEach(() => {
    // Setup mocks for LLMPromptBuilder
    mockPromptBuilder = {
      buildPrompt: jest.fn().mockReturnValue({
        prompt: 'Mock prompt',
        metadata: {
          category: 'general',
          count: 10,
          quality_target: 'good',
          estimated_tokens: 500
        }
      }),
      buildBatchPrompt: jest.fn().mockReturnValue({
        prompt: 'Mock batch prompt',
        metadata: {
          total_count: 20,
          categories: ['general'],
          estimated_tokens: 600
        }
      }),
      buildFeedbackPrompt: jest.fn().mockReturnValue({
        prompt: 'Mock feedback prompt',
        metadata: {
          count: 10,
          category: 'general',
          estimated_tokens: 550
        }
      }),
      generatePhrases: jest.fn().mockResolvedValue({
        phrases: ['taylor swift', 'pizza delivery', 'basketball court', 'coffee shop', 'netflix show'],
        generation_metadata: {
          model: 'gpt-4',
          generation_time_ms: 1200,
          total_tokens: 800
        }
      }),
      getStats: jest.fn().mockReturnValue({
        service: 'llm_prompt_builder',
        generated_count: 0
      })
    };
    
    // Setup mocks for DecisionEngine
    mockDecisionEngine = {
      initialize: jest.fn().mockResolvedValue({
        distinctiveness: true,
        describability: true,
        legacy: true,
        cultural: true
      }),
      batchScorePhrase: jest.fn().mockResolvedValue({
        results: [
          { phrase: 'taylor swift', final_score: 85, quality_classification: 'excellent', component_scores: { distinctiveness: 18, describability: 20, legacy_heuristics: 25, cultural_validation: 15 } },
          { phrase: 'pizza delivery', final_score: 78, quality_classification: 'good', component_scores: { distinctiveness: 15, describability: 22, legacy_heuristics: 28, cultural_validation: 12 } },
          { phrase: 'basketball court', final_score: 72, quality_classification: 'good', component_scores: { distinctiveness: 16, describability: 20, legacy_heuristics: 26, cultural_validation: 10 } },
          { phrase: 'coffee shop', final_score: 68, quality_classification: 'good', component_scores: { distinctiveness: 14, describability: 18, legacy_heuristics: 24, cultural_validation: 12 } },
          { phrase: 'netflix show', final_score: 75, quality_classification: 'good', component_scores: { distinctiveness: 17, describability: 16, legacy_heuristics: 22, cultural_validation: 18 } }
        ],
        summary: {
          avg_final_score: 75.6,
          quality_distribution: { excellent: 1, good: 4, acceptable: 0, poor: 0, unacceptable: 0 },
          decision_distribution: { auto_accept: 1, likely_accept: 4, conditional_accept: 0, likely_reject: 0, auto_reject: 0 }
        }
      }),
      getStats: jest.fn().mockResolvedValue({
        service: 'decision_engine',
        processed_count: 0
      }),
      close: jest.fn().mockResolvedValue()
    };
    
    // Configure mocks
    LLMPromptBuilder.mockImplementation(() => mockPromptBuilder);
    DecisionEngine.mockImplementation(() => mockDecisionEngine);
    
    generator = new LLMGenerator();
  });
  
  afterEach(async () => {
    if (generator) {
      await generator.close();
    }
    jest.clearAllMocks();
  });

  describe('Constructor and Initialization', () => {
    test('should initialize with correct quality parameters', () => {
      expect(generator.QUALITY_PARAMS.TARGET_SCORE_MIN).toBe(60);
      expect(generator.QUALITY_PARAMS.EXCELLENT_SCORE_MIN).toBe(80);
      expect(generator.QUALITY_PARAMS.MAX_GENERATION_ATTEMPTS).toBe(3);
      expect(generator.QUALITY_PARAMS.QUALITY_IMPROVEMENT_ITERATIONS).toBe(2);
      expect(generator.QUALITY_PARAMS.BATCH_QUALITY_THRESHOLD).toBe(0.7);
    });

    test('should initialize with correct performance parameters', () => {
      expect(generator.PERFORMANCE.GENERATION_TIMEOUT_MS).toBe(30000);
      expect(generator.PERFORMANCE.SCORING_TIMEOUT_MS).toBe(10000);
      expect(generator.PERFORMANCE.MAX_CONCURRENT_GENERATIONS).toBe(3);
    });

    test('should initialize generation history structure', () => {
      expect(generator.generationHistory).toHaveProperty('successful_phrases');
      expect(generator.generationHistory).toHaveProperty('failed_phrases');
      expect(generator.generationHistory).toHaveProperty('category_performance');
      expect(generator.generationHistory).toHaveProperty('quality_trends');
      
      expect(Array.isArray(generator.generationHistory.successful_phrases)).toBe(true);
      expect(typeof generator.generationHistory.category_performance).toBe('object');
    });

    test('should track generation count', () => {
      expect(generator.generationCount).toBe(0);
    });
  });

  describe('Component Initialization', () => {
    test('should initialize decision engine successfully', async () => {
      const result = await generator.initialize();
      
      expect(mockDecisionEngine.initialize).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    test('should handle partial initialization gracefully', async () => {
      mockDecisionEngine.initialize.mockResolvedValue({
        distinctiveness: false,
        describability: true,
        legacy: true,
        cultural: true
      });
      
      const result = await generator.initialize();
      
      expect(result).toBe(true); // Should still be true with 3/4 components
    });

    test('should handle initialization failure', async () => {
      mockDecisionEngine.initialize.mockResolvedValue({
        distinctiveness: false,
        describability: false,
        legacy: true,
        cultural: true
      });
      
      const result = await generator.initialize();
      
      expect(result).toBe(false); // Should be false with only 2/4 components
    });
  });

  describe('Quality Phrase Generation', () => {
    test('should generate quality phrases with standard prompt', async () => {
      const result = await generator.generateQualityPhrases({
        count: 5,
        category: 'pop_culture',
        quality_target: 'good'
      });
      
      expect(result).toHaveProperty('generated_phrases');
      expect(result).toHaveProperty('scored_phrases');
      expect(result).toHaveProperty('quality_metrics');
      expect(result).toHaveProperty('performance');
      expect(result).toHaveProperty('metadata');
      
      expect(result.generated_phrases).toHaveLength(5);
      expect(result.scored_phrases).toHaveLength(5);
      expect(result.metadata.category).toBe('pop_culture');
      expect(result.metadata.quality_target).toBe('good');
      
      expect(mockPromptBuilder.buildPrompt).toHaveBeenCalledWith({
        category: 'pop_culture',
        count: 5,
        quality_target: 'good',
        additional_constraints: [],
        previous_phrases: []
      });
    });

    test('should use feedback prompt when history exists', async () => {
      // Setup generation history
      generator.generationHistory.category_performance.pop_culture = {
        successful_phrases: [{ phrase: 'taylor swift', score: 85 }],
        failed_phrases: [{ phrase: 'abstract concept', score: 25 }],
        avg_scores: [70]
      };
      
      const result = await generator.generateQualityPhrases({
        count: 5,
        category: 'pop_culture',
        use_feedback: true
      });
      
      expect(mockPromptBuilder.buildFeedbackPrompt).toHaveBeenCalled();
      expect(result.metadata.feedback_used).toBe(true);
    });

    test('should attempt multiple generations for quality targets', async () => {
      // Mock lower quality first attempt
      mockDecisionEngine.batchScorePhrase
        .mockResolvedValueOnce({
          results: [
            { phrase: 'low quality 1', final_score: 45 },
            { phrase: 'low quality 2', final_score: 50 }
          ],
          summary: { quality_distribution: {}, decision_distribution: {} }
        })
        .mockResolvedValueOnce({
          results: [
            { phrase: 'high quality 1', final_score: 75 },
            { phrase: 'high quality 2', final_score: 80 }
          ],
          summary: { quality_distribution: {}, decision_distribution: {} }
        });
      
      const result = await generator.generateQualityPhrases({
        count: 2,
        quality_target: 'good',
        max_attempts: 2
      });
      
      expect(result.generation_attempts).toBe(2);
      expect(mockPromptBuilder.generatePhrases).toHaveBeenCalledTimes(2);
      expect(mockDecisionEngine.batchScorePhrase).toHaveBeenCalledTimes(2);
    });

    test('should increment generation count', async () => {
      const initialCount = generator.generationCount;
      
      await generator.generateQualityPhrases({ count: 5 });
      
      expect(generator.generationCount).toBe(initialCount + 5);
    });

    test('should update generation history', async () => {
      await generator.generateQualityPhrases({
        count: 5,
        category: 'pop_culture'
      });
      
      expect(generator.generationHistory.category_performance.pop_culture).toBeDefined();
      expect(generator.generationHistory.category_performance.pop_culture.successful_phrases.length).toBeGreaterThan(0);
    });
  });

  describe('Diverse Batch Generation', () => {
    test('should generate diverse batch across categories', async () => {
      const result = await generator.generateDiverseBatch({
        total_count: 15,
        categories: ['pop_culture', 'food', 'sports']
      });
      
      expect(result).toHaveProperty('all_phrases');
      expect(result).toHaveProperty('by_category');
      expect(result).toHaveProperty('overall_quality');
      expect(result).toHaveProperty('performance');
      
      expect(result.by_category).toHaveProperty('pop_culture');
      expect(result.by_category).toHaveProperty('food');
      expect(result.by_category).toHaveProperty('sports');
      
      expect(result.all_phrases.length).toBeLessThanOrEqual(15);
      expect(result.overall_quality).toHaveProperty('avg_score');
      expect(result.overall_quality).toHaveProperty('diversity_score');
    });

    test('should respect total count limits', async () => {
      const result = await generator.generateDiverseBatch({
        total_count: 12,
        categories: ['pop_culture', 'food']
      });
      
      expect(result.all_phrases.length).toBeLessThanOrEqual(12);
    });

    test('should track category performance', async () => {
      const result = await generator.generateDiverseBatch({
        total_count: 9,
        categories: ['pop_culture', 'food', 'sports']
      });
      
      expect(result.performance.category_durations).toHaveProperty('pop_culture');
      expect(result.performance.category_durations).toHaveProperty('food');
      expect(result.performance.category_durations).toHaveProperty('sports');
    });
  });

  describe('Feedback-Based Generation', () => {
    test('should perform iterative improvement', async () => {
      const result = await generator.generateWithFeedbackLoop({
        initial_count: 10,
        target_quality: 75,
        max_iterations: 2,
        category: 'general'
      });
      
      expect(result).toHaveProperty('final_result');
      expect(result).toHaveProperty('iterations');
      expect(result).toHaveProperty('improvement_achieved');
      expect(result).toHaveProperty('quality_improvement');
      
      expect(result.iterations.length).toBeGreaterThan(0);
      expect(result.iterations.length).toBeLessThanOrEqual(2);
    });

    test('should stop early when target achieved', async () => {
      // Mock high quality on first iteration
      mockDecisionEngine.batchScorePhrase.mockResolvedValue({
        results: Array(10).fill().map((_, i) => ({
          phrase: `high quality ${i}`,
          final_score: 80 + Math.random() * 10
        })),
        summary: { quality_distribution: {}, decision_distribution: {} }
      });
      
      const result = await generator.generateWithFeedbackLoop({
        target_quality: 75,
        max_iterations: 3
      });
      
      expect(result.improvement_achieved).toBe(true);
      expect(result.iterations.length).toBe(1); // Should stop after first iteration
    });
  });

  describe('Quality Analysis', () => {
    test('should analyze generation quality correctly', () => {
      const mockScoringResult = {
        results: [
          { final_score: 85 },
          { final_score: 72 },
          { final_score: 68 },
          { final_score: 45 },
          { final_score: 91 }
        ],
        summary: {
          quality_distribution: { excellent: 2, good: 2, acceptable: 1 },
          decision_distribution: { auto_accept: 2, likely_accept: 2, conditional_accept: 1 }
        }
      };
      
      const analysis = generator.analyzeGenerationQuality(mockScoringResult, 'good');
      
      expect(analysis.avg_score).toBeCloseTo(72.2);
      expect(analysis.min_score).toBe(45);
      expect(analysis.max_score).toBe(91);
      expect(analysis.target_score).toBe(60);
      expect(analysis.acceptance_rate).toBe(80); // 4 out of 5 above 60
    });

    test('should determine target achievement', () => {
      const highQualityResult = {
        results: Array(10).fill().map(() => ({ final_score: 75 })),
        summary: { quality_distribution: {}, decision_distribution: {} }
      };
      
      const analysis = generator.analyzeGenerationQuality(highQualityResult, 'good');
      
      expect(analysis.target_achieved).toBe(true); // 100% acceptance rate > 70% threshold
    });
  });

  describe('Feedback Data Building', () => {
    test('should build feedback data from history', () => {
      generator.generationHistory.category_performance.pop_culture = {
        successful_phrases: [
          { phrase: 'taylor swift', score: 85, success_factors: ['high cultural', 'concrete'] },
          { phrase: 'pizza delivery', score: 78, success_factors: ['food category'] }
        ],
        failed_phrases: [
          { phrase: 'abstract concept', score: 25, failure_reasons: ['low concreteness'] }
        ]
      };
      
      const feedbackData = generator.buildFeedbackData('pop_culture');
      
      expect(feedbackData.successful_examples).toHaveLength(2);
      expect(feedbackData.failed_examples).toHaveLength(1);
      expect(feedbackData.target_improvements.length).toBeGreaterThan(0);
      expect(feedbackData.avoid_patterns.length).toBeGreaterThan(0);
    });

    test('should return empty feedback for categories without history', () => {
      const feedbackData = generator.buildFeedbackData('nonexistent_category');
      
      expect(feedbackData.successful_examples).toHaveLength(0);
      expect(feedbackData.failed_examples).toHaveLength(0);
    });
  });

  describe('Success and Failure Factor Extraction', () => {
    test('should extract success factors correctly', () => {
      const highScorePhrase = {
        component_scores: {
          cultural_validation: 15,  // >= 10
          describability: 20,       // >= 15
          legacy_heuristics: 25,    // >= 20
          distinctiveness: 18       // >= 15
        }
      };
      
      const factors = generator.extractSuccessFactors(highScorePhrase);
      
      expect(factors).toContain('high cultural relevance');
      expect(factors).toContain('concrete/visual concept');
      expect(factors).toContain('optimal word simplicity/length');
      expect(factors).toContain('unique/specific description');
    });

    test('should extract failure reasons correctly', () => {
      const lowScorePhrase = {
        component_scores: {
          cultural_validation: 2,   // <= 5
          describability: 8,        // <= 10
          legacy_heuristics: 12,    // <= 15
          distinctiveness: 5        // <= 10
        }
      };
      
      const reasons = generator.extractFailureReasons(lowScorePhrase);
      
      expect(reasons).toContain('low cultural relevance');
      expect(reasons).toContain('abstract/hard to describe');
      expect(reasons).toContain('complex words or poor length');
      expect(reasons).toContain('generic or common phrase');
    });
  });

  describe('Generation History Management', () => {
    test('should update generation history correctly', () => {
      const mockResult = {
        scored_phrases: [
          { phrase: 'taylor swift', final_score: 85, component_scores: { cultural_validation: 15, describability: 20, legacy_heuristics: 25, distinctiveness: 18 } },
          { phrase: 'abstract concept', final_score: 25, component_scores: { cultural_validation: 2, describability: 8, legacy_heuristics: 12, distinctiveness: 5 } }
        ],
        quality_metrics: { avg_score: 55 }
      };
      
      generator.updateGenerationHistory('pop_culture', mockResult);
      
      const categoryData = generator.generationHistory.category_performance.pop_culture;
      expect(categoryData.successful_phrases).toHaveLength(1);
      expect(categoryData.failed_phrases).toHaveLength(1);
      expect(categoryData.avg_scores).toContain(55);
    });

    test('should limit history size', () => {
      const mockResult = {
        scored_phrases: Array(30).fill().map((_, i) => ({
          phrase: `phrase ${i}`,
          final_score: 85,
          component_scores: { cultural_validation: 15, describability: 20, legacy_heuristics: 25, distinctiveness: 18 }
        })),
        quality_metrics: { avg_score: 85 }
      };
      
      generator.updateGenerationHistory('pop_culture', mockResult);
      
      const categoryData = generator.generationHistory.category_performance.pop_culture;
      expect(categoryData.successful_phrases.length).toBe(20); // Limited to 20
    });

    test('should check for generation history existence', () => {
      expect(generator.hasGenerationHistory('nonexistent')).toBe(false);
      
      generator.generationHistory.category_performance.pop_culture = {
        successful_phrases: [{ phrase: 'test', score: 70 }]
      };
      
      expect(generator.hasGenerationHistory('pop_culture')).toBe(true);
    });
  });

  describe('Diversity Optimization', () => {
    test('should optimize phrase diversity', () => {
      const phrases = [
        { phrase: 'taylor swift', final_score: 85 },
        { phrase: 'swift river', final_score: 60 },    // Word overlap
        { phrase: 'pizza delivery', final_score: 78 },
        { phrase: 'pizza shop', final_score: 65 },     // Word overlap
        { phrase: 'basketball court', final_score: 72 },
        { phrase: 'tennis court', final_score: 68 }    // Word overlap
      ];
      
      const diversePhrases = generator.optimizeDiversity(phrases, 3);
      
      expect(diversePhrases.length).toBe(3);
      // Should prioritize higher scores and avoid word overlap
      expect(diversePhrases[0].phrase).toBe('taylor swift'); // Highest score
    });

    test('should preserve quality order in diversity optimization', () => {
      const phrases = [
        { phrase: 'low score', final_score: 40 },
        { phrase: 'high score', final_score: 90 },
        { phrase: 'medium score', final_score: 65 }
      ];
      
      const diversePhrases = generator.optimizeDiversity(phrases, 3);
      
      expect(diversePhrases[0].final_score).toBeGreaterThanOrEqual(diversePhrases[1].final_score);
      expect(diversePhrases[1].final_score).toBeGreaterThanOrEqual(diversePhrases[2].final_score);
    });
  });

  describe('Overall Quality Calculation', () => {
    test('should calculate overall quality metrics', () => {
      const phrases = [
        { phrase: 'excellent phrase', final_score: 85, quality_classification: 'excellent' },
        { phrase: 'good phrase', final_score: 70, quality_classification: 'good' },
        { phrase: 'acceptable phrase', final_score: 50, quality_classification: 'acceptable' }
      ];
      
      const quality = generator.calculateOverallQuality(phrases);
      
      expect(quality.avg_score).toBeCloseTo(68.33);
      expect(quality.quality_distribution.excellent).toBe(1);
      expect(quality.quality_distribution.good).toBe(1);
      expect(quality.quality_distribution.acceptable).toBe(1);
      expect(quality.acceptance_rate).toBe(100); // All phrases acceptable or better
    });

    test('should calculate diversity score based on unique words', () => {
      const phrases = [
        { phrase: 'taylor swift', final_score: 85 },
        { phrase: 'pizza delivery', final_score: 78 },
        { phrase: 'basketball court', final_score: 72 }
      ];
      
      const quality = generator.calculateOverallQuality(phrases);
      
      expect(quality.diversity_score).toBeGreaterThan(0);
      expect(quality.diversity_score).toBeLessThanOrEqual(100);
    });

    test('should handle empty phrase arrays', () => {
      const quality = generator.calculateOverallQuality([]);
      
      expect(quality.avg_score).toBe(0);
      expect(quality.acceptance_rate).toBe(0);
      expect(quality.diversity_score).toBe(0);
    });
  });

  describe('Statistics and Monitoring', () => {
    test('should provide comprehensive stats', async () => {
      const stats = await generator.getStats();
      
      expect(stats).toHaveProperty('service', 'llm_generator');
      expect(stats).toHaveProperty('version', '1.0.0');
      expect(stats).toHaveProperty('components');
      expect(stats).toHaveProperty('generation_stats');
      expect(stats).toHaveProperty('history_summary');
      
      expect(stats.components).toHaveProperty('prompt_builder');
      expect(stats.components).toHaveProperty('decision_engine');
      
      expect(mockPromptBuilder.getStats).toHaveBeenCalled();
      expect(mockDecisionEngine.getStats).toHaveBeenCalled();
    });

    test('should track generation statistics', async () => {
      await generator.generateQualityPhrases({ count: 5 });
      
      const stats = await generator.getStats();
      expect(stats.generation_stats.total_generated).toBe(5);
    });
  });

  describe('Error Handling', () => {
    test('should handle prompt builder errors gracefully', async () => {
      mockPromptBuilder.generatePhrases.mockRejectedValue(new Error('Generation failed'));
      
      const result = await generator.generateQualityPhrases({ count: 5 });
      
      expect(result.error).toBeDefined();
      expect(result.generated_phrases).toHaveLength(0);
    });

    test('should handle decision engine errors gracefully', async () => {
      mockDecisionEngine.batchScorePhrase.mockRejectedValue(new Error('Scoring failed'));
      
      const result = await generator.generateQualityPhrases({ count: 5 });
      
      expect(result.error).toBeDefined();
    });

    test('should handle stats errors gracefully', async () => {
      mockPromptBuilder.getStats.mockImplementation(() => {
        throw new Error('Stats unavailable');
      });
      
      const stats = await generator.getStats();
      expect(stats.error).toBeDefined();
    });
  });

  describe('Performance Requirements', () => {
    test('should complete generation within reasonable time', async () => {
      const startTime = Date.now();
      await generator.generateQualityPhrases({ count: 5 });
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(5000); // 5 second test environment limit
    });

    test('should handle batch generation efficiently', async () => {
      const startTime = Date.now();
      await generator.generateDiverseBatch({ total_count: 12 });
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(10000); // 10 second test environment limit
    });
  });

  describe('Cleanup', () => {
    test('should close decision engine properly', async () => {
      await generator.close();
      expect(mockDecisionEngine.close).toHaveBeenCalled();
    });
  });
}); 