const DecisionEngine = require('../../services/scoring/decision-engine');

// Mock all component scorers to avoid external dependencies
jest.mock('../../services/scoring/distinctiveness-scorer');
jest.mock('../../services/scoring/describability-scorer');
jest.mock('../../services/scoring/legacy-heuristics-scorer');
jest.mock('../../services/scoring/cultural-validation-scorer');

const DistinctivenessScorer = require('../../services/scoring/distinctiveness-scorer');
const DescribabilityScorer = require('../../services/scoring/describability-scorer');
const LegacyHeuristicsScorer = require('../../services/scoring/legacy-heuristics-scorer');
const CulturalValidationScorer = require('../../services/scoring/cultural-validation-scorer');

describe('DecisionEngine', () => {
  let engine;
  let mockDistinctiveness, mockDescribability, mockLegacy, mockCultural;
  
  beforeEach(() => {
    // Setup mocks for all component scorers
    mockDistinctiveness = {
      initialize: jest.fn().mockResolvedValue(true),
      scoreDistinctiveness: jest.fn().mockResolvedValue({ score: 20, duration_ms: 50 }),
      getStats: jest.fn().mockResolvedValue({ service: 'distinctiveness_scorer', processed_count: 0 }),
      close: jest.fn().mockResolvedValue()
    };
    
    mockDescribability = {
      initialize: jest.fn().mockResolvedValue(true),
      scoreDescribability: jest.fn().mockResolvedValue({ total_score: 15, duration_ms: 40 }),
      getStats: jest.fn().mockResolvedValue({ service: 'describability_scorer', processed_count: 0 }),
      close: jest.fn().mockResolvedValue()
    };
    
    mockLegacy = {
      scoreLegacyHeuristics: jest.fn().mockResolvedValue({ total_score: 24, duration_ms: 30 }),
      getStats: jest.fn().mockResolvedValue({ service: 'legacy_heuristics_scorer', processed_count: 0 }),
      close: jest.fn().mockResolvedValue()
    };
    
    mockCultural = {
      scoreCulturalValidation: jest.fn().mockResolvedValue({ total_score: 18, duration_ms: 35 }),
      getStats: jest.fn().mockResolvedValue({ service: 'cultural_validation_scorer', processed_count: 0 }),
      close: jest.fn().mockResolvedValue()
    };
    
    // Configure mocks
    DistinctivenessScorer.mockImplementation(() => mockDistinctiveness);
    DescribabilityScorer.mockImplementation(() => mockDescribability);
    LegacyHeuristicsScorer.mockImplementation(() => mockLegacy);
    CulturalValidationScorer.mockImplementation(() => mockCultural);
    
    engine = new DecisionEngine();
  });
  
  afterEach(async () => {
    if (engine) {
      await engine.close();
    }
    jest.clearAllMocks();
  });

  describe('Constructor and Initialization', () => {
    test('should initialize with correct algorithm configuration', () => {
      expect(engine.WEIGHTS.DISTINCTIVENESS).toBe(0.25);
      expect(engine.WEIGHTS.DESCRIBABILITY).toBe(0.30);
      expect(engine.WEIGHTS.LEGACY_HEURISTICS).toBe(0.25);
      expect(engine.WEIGHTS.CULTURAL_VALIDATION).toBe(0.20);
    });

    test('should initialize with correct decision thresholds', () => {
      expect(engine.THRESHOLDS.EXCELLENT).toBe(80);
      expect(engine.THRESHOLDS.GOOD).toBe(60);
      expect(engine.THRESHOLDS.ACCEPTABLE).toBe(40);
      expect(engine.THRESHOLDS.POOR).toBe(20);
      expect(engine.THRESHOLDS.UNACCEPTABLE).toBe(0);
    });

    test('should initialize quality classifications', () => {
      expect(engine.QUALITY_CLASSIFICATIONS).toHaveProperty('excellent');
      expect(engine.QUALITY_CLASSIFICATIONS).toHaveProperty('good');
      expect(engine.QUALITY_CLASSIFICATIONS).toHaveProperty('acceptable');
      expect(engine.QUALITY_CLASSIFICATIONS).toHaveProperty('poor');
      expect(engine.QUALITY_CLASSIFICATIONS).toHaveProperty('unacceptable');
      
      expect(engine.QUALITY_CLASSIFICATIONS.excellent.recommendation).toBe('auto_accept');
      expect(engine.QUALITY_CLASSIFICATIONS.good.recommendation).toBe('likely_accept');
      expect(engine.QUALITY_CLASSIFICATIONS.acceptable.recommendation).toBe('conditional_accept');
      expect(engine.QUALITY_CLASSIFICATIONS.poor.recommendation).toBe('likely_reject');
      expect(engine.QUALITY_CLASSIFICATIONS.unacceptable.recommendation).toBe('auto_reject');
    });

    test('should initialize performance targets', () => {
      expect(engine.PERFORMANCE.TARGET_LATENCY_MS).toBe(800);
      expect(engine.PERFORMANCE.MAX_LATENCY_MS).toBe(1500);
      expect(engine.PERFORMANCE.BATCH_SIZE_LIMIT).toBe(20);
    });

    test('should initialize all component scorers', () => {
      expect(engine.distinctivenessScorer).toBeDefined();
      expect(engine.describabilityScorer).toBeDefined();
      expect(engine.legacyHeuristicsScorer).toBeDefined();
      expect(engine.culturalValidationScorer).toBeDefined();
    });

    test('should track processed count', () => {
      expect(engine.processedCount).toBe(0);
    });
  });

  describe('Component Initialization', () => {
    test('should initialize all components successfully', async () => {
      const initResults = await engine.initialize();
      
      expect(mockDistinctiveness.initialize).toHaveBeenCalled();
      expect(mockDescribability.initialize).toHaveBeenCalled();
      expect(initResults.distinctiveness).toBe(true);
      expect(initResults.describability).toBe(true);
      expect(initResults.legacy).toBe(true);
      expect(initResults.cultural).toBe(true);
    });

    test('should handle partial initialization failures gracefully', async () => {
      mockDistinctiveness.initialize.mockResolvedValue(false);
      
      const initResults = await engine.initialize();
      
      expect(initResults.distinctiveness).toBe(false);
      expect(initResults.describability).toBe(true);
      expect(initResults.legacy).toBe(true);
      expect(initResults.cultural).toBe(true);
    });
  });

  describe('Weighted Scoring Algorithm', () => {
    test('should calculate weighted scores correctly', () => {
      const componentScores = {
        distinctiveness: 20,    // 20/25 = 80% * 100 * 0.25 = 20.0
        describability: 15,     // 15/25 = 60% * 100 * 0.30 = 18.0
        legacy_heuristics: 24,  // 24/30 = 80% * 100 * 0.25 = 20.0
        cultural_validation: 18 // 18/20 = 90% * 100 * 0.20 = 18.0
      };
      
      const result = engine.calculateWeightedScore(componentScores);
      
      expect(result.final_score).toBe(76); // 20 + 18 + 20 + 18 = 76
      expect(result.component_contributions.distinctiveness).toBe(20);
      expect(result.component_contributions.describability).toBe(18);
      expect(result.component_contributions.legacy_heuristics).toBe(20);
      expect(result.component_contributions.cultural_validation).toBe(18);
      expect(result.raw_scores).toEqual(componentScores);
    });

    test('should handle perfect scores correctly', () => {
      const componentScores = {
        distinctiveness: 25,
        describability: 25,
        legacy_heuristics: 30,
        cultural_validation: 20
      };
      
      const result = engine.calculateWeightedScore(componentScores);
      
      expect(result.final_score).toBe(100); // Perfect score
    });

    test('should handle zero scores correctly', () => {
      const componentScores = {
        distinctiveness: 0,
        describability: 0,
        legacy_heuristics: 0,
        cultural_validation: 0
      };
      
      const result = engine.calculateWeightedScore(componentScores);
      
      expect(result.final_score).toBe(0);
    });

    test('should handle cultural validation bonus correctly', () => {
      const componentScores = {
        distinctiveness: 0,
        describability: 0,
        legacy_heuristics: 0,
        cultural_validation: 25 // 25% bonus over normal max
      };
      
      const result = engine.calculateWeightedScore(componentScores);
      
      // 25/20 = 1.25 (capped at 1.25) * 100 * 0.20 = 25
      expect(result.component_contributions.cultural_validation).toBe(25);
    });

    test('should round final scores to 2 decimal places', () => {
      const componentScores = {
        distinctiveness: 11, // Creates decimal result
        describability: 11,
        legacy_heuristics: 11,
        cultural_validation: 11
      };
      
      const result = engine.calculateWeightedScore(componentScores);
      
      expect(Number.isInteger(result.final_score * 100)).toBe(true); // 2 decimal places
    });
  });

  describe('Quality Classification', () => {
    test('should classify excellent quality correctly', () => {
      expect(engine.classifyQuality(85)).toBe('excellent');
      expect(engine.classifyQuality(80)).toBe('excellent');
      expect(engine.classifyQuality(100)).toBe('excellent');
    });

    test('should classify good quality correctly', () => {
      expect(engine.classifyQuality(70)).toBe('good');
      expect(engine.classifyQuality(60)).toBe('good');
      expect(engine.classifyQuality(79)).toBe('good');
    });

    test('should classify acceptable quality correctly', () => {
      expect(engine.classifyQuality(50)).toBe('acceptable');
      expect(engine.classifyQuality(40)).toBe('acceptable');
      expect(engine.classifyQuality(59)).toBe('acceptable');
    });

    test('should classify poor quality correctly', () => {
      expect(engine.classifyQuality(30)).toBe('poor');
      expect(engine.classifyQuality(20)).toBe('poor');
      expect(engine.classifyQuality(39)).toBe('poor');
    });

    test('should classify unacceptable quality correctly', () => {
      expect(engine.classifyQuality(10)).toBe('unacceptable');
      expect(engine.classifyQuality(0)).toBe('unacceptable');
      expect(engine.classifyQuality(19)).toBe('unacceptable');
    });
  });

  describe('Decision Making', () => {
    test('should make correct acceptance decisions', () => {
      const excellentDecision = engine.makeDecision('excellent');
      expect(excellentDecision.accept).toBe(true);
      expect(excellentDecision.confidence).toBe('high');
      expect(excellentDecision.recommendation).toBe('auto_accept');

      const goodDecision = engine.makeDecision('good');
      expect(goodDecision.accept).toBe(true);
      expect(goodDecision.confidence).toBe('medium');
      expect(goodDecision.recommendation).toBe('likely_accept');

      const acceptableDecision = engine.makeDecision('acceptable');
      expect(acceptableDecision.accept).toBe(true);
      expect(acceptableDecision.confidence).toBe('low');
      expect(acceptableDecision.recommendation).toBe('conditional_accept');
    });

    test('should make correct rejection decisions', () => {
      const poorDecision = engine.makeDecision('poor');
      expect(poorDecision.accept).toBe(false);
      expect(poorDecision.confidence).toBe('reject');
      expect(poorDecision.recommendation).toBe('likely_reject');

      const unacceptableDecision = engine.makeDecision('unacceptable');
      expect(unacceptableDecision.accept).toBe(false);
      expect(unacceptableDecision.confidence).toBe('reject');
      expect(unacceptableDecision.recommendation).toBe('auto_reject');
    });

    test('should include reasoning in decisions', () => {
      const decision = engine.makeDecision('excellent');
      expect(decision.reasoning).toBeDefined();
      expect(typeof decision.reasoning).toBe('string');
    });
  });

  describe('Phrase Scoring Integration', () => {
    test('should score phrase with all components', async () => {
      const result = await engine.scorePhrase('test phrase');
      
      expect(result).toHaveProperty('phrase', 'test phrase');
      expect(result).toHaveProperty('final_score');
      expect(result).toHaveProperty('quality_classification');
      expect(result).toHaveProperty('decision');
      expect(result).toHaveProperty('component_scores');
      expect(result).toHaveProperty('component_details');
      expect(result).toHaveProperty('weighted_analysis');
      expect(result).toHaveProperty('performance');
      
      // Verify all component scorers were called
      expect(mockDistinctiveness.scoreDistinctiveness).toHaveBeenCalledWith('test phrase');
      expect(mockDescribability.scoreDescribability).toHaveBeenCalledWith('test phrase');
      expect(mockLegacy.scoreLegacyHeuristics).toHaveBeenCalledWith('test phrase');
      expect(mockCultural.scoreCulturalValidation).toHaveBeenCalledWith('test phrase');
    });

    test('should calculate correct final score from mocked components', async () => {
      // With mock values: D:20, Des:15, L:24, C:18 → Final: 76
      const result = await engine.scorePhrase('test phrase');
      
      expect(result.component_scores.distinctiveness).toBe(20);
      expect(result.component_scores.describability).toBe(15);
      expect(result.component_scores.legacy_heuristics).toBe(24);
      expect(result.component_scores.cultural_validation).toBe(18);
      expect(result.final_score).toBe(76);
      expect(result.quality_classification).toBe('good');
      expect(result.decision.accept).toBe(true);
    });

    test('should track performance metrics', async () => {
      const result = await engine.scorePhrase('test phrase');
      
      expect(result.performance.total_duration_ms).toBeGreaterThan(0);
      expect(result.performance.component_durations).toHaveProperty('distinctiveness');
      expect(result.performance.component_durations).toHaveProperty('describability');
      expect(result.performance.component_durations).toHaveProperty('legacy_heuristics');
      expect(result.performance.component_durations).toHaveProperty('cultural_validation');
      expect(result.performance.within_target).toBeDefined();
    });

    test('should increment processed count', async () => {
      expect(engine.processedCount).toBe(0);
      await engine.scorePhrase('test phrase');
      expect(engine.processedCount).toBe(1);
    });

    test('should handle component scoring errors gracefully', async () => {
      mockDistinctiveness.scoreDistinctiveness.mockRejectedValue(new Error('Redis connection failed'));
      
      const result = await engine.scorePhrase('test phrase');
      
      expect(result.component_scores.distinctiveness).toBe(0);
      expect(result.final_score).toBeLessThan(76); // Should be lower due to missing distinctiveness
    });
  });

  describe('Batch Processing', () => {
    test('should process multiple phrases', async () => {
      const phrases = ['phrase1', 'phrase2', 'phrase3'];
      const result = await engine.batchScorePhrase(phrases);
      
      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('summary');
      expect(result.results).toHaveLength(3);
      
      expect(result.summary).toHaveProperty('total_phrases', 3);
      expect(result.summary).toHaveProperty('avg_final_score');
      expect(result.summary).toHaveProperty('quality_distribution');
      expect(result.summary).toHaveProperty('decision_distribution');
      expect(result.summary).toHaveProperty('acceptance_rate');
      expect(result.summary).toHaveProperty('performance_rate');
    });

    test('should enforce batch size limit', async () => {
      const phrases = Array(25).fill('test phrase'); // Exceeds limit of 20
      
      await expect(engine.batchScorePhrase(phrases)).rejects.toThrow('Batch size 25 exceeds limit of 20');
    });

    test('should handle invalid phrases in batch', async () => {
      const phrases = ['valid phrase', '', null, 123, 'x']; // Various invalid inputs
      const result = await engine.batchScorePhrase(phrases);
      
      expect(result.results).toHaveLength(5);
      expect(result.results[0].final_score).toBe(76); // Valid phrase gets normal score
      expect(result.results[1].error).toBeDefined(); // Empty string
      expect(result.results[2].error).toBeDefined(); // null
      expect(result.results[3].error).toBeDefined(); // number
      expect(result.results[4].error).toBeDefined(); // Too short
    });

    test('should calculate quality and decision distributions', async () => {
      // Mock different scores for different phrases
      mockDistinctiveness.scoreDistinctiveness
        .mockResolvedValueOnce({ score: 25, duration_ms: 50 }) // High score phrase
        .mockResolvedValueOnce({ score: 0, duration_ms: 50 });  // Low score phrase
      
      mockDescribability.scoreDescribability
        .mockResolvedValueOnce({ total_score: 25, duration_ms: 40 })
        .mockResolvedValueOnce({ total_score: 0, duration_ms: 40 });
      
      const phrases = ['excellent phrase', 'poor phrase'];
      const result = await engine.batchScorePhrase(phrases);
      
      expect(result.summary.quality_distribution).toHaveProperty('excellent');
      expect(result.summary.quality_distribution).toHaveProperty('unacceptable');
      expect(result.summary.decision_distribution).toHaveProperty('auto_accept');
      expect(result.summary.decision_distribution).toHaveProperty('auto_reject');
    });
  });

  describe('Performance Requirements', () => {
    test('should meet target latency for single phrase', async () => {
      const startTime = Date.now();
      const result = await engine.scorePhrase('test phrase');
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // Should be well under 800ms target in test environment
      expect(result.performance.total_duration_ms).toBeDefined();
    });

    test('should handle batch processing efficiently', async () => {
      const phrases = Array(10).fill('test phrase');
      const startTime = Date.now();
      const result = await engine.batchScorePhrase(phrases);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(5000); // Reasonable batch processing time
      expect(result.summary.avg_duration_ms).toBeDefined();
    });
  });

  describe('Statistics and Monitoring', () => {
    test('should provide comprehensive stats', async () => {
      const stats = await engine.getStats();
      
      expect(stats).toHaveProperty('service', 'decision_engine');
      expect(stats).toHaveProperty('version', '1.0.0');
      expect(stats).toHaveProperty('components');
      expect(stats).toHaveProperty('algorithm');
      expect(stats).toHaveProperty('performance');
      expect(stats).toHaveProperty('processed_count');
      
      expect(stats.components).toHaveProperty('distinctiveness');
      expect(stats.components).toHaveProperty('describability');
      expect(stats.components).toHaveProperty('legacy_heuristics');
      expect(stats.components).toHaveProperty('cultural_validation');
      
      expect(stats.algorithm).toHaveProperty('weights');
      expect(stats.algorithm).toHaveProperty('thresholds');
      expect(stats.algorithm).toHaveProperty('quality_classifications');
    });

    test('should track component statistics', async () => {
      await engine.scorePhrase('test phrase');
      
      const stats = await engine.getStats();
      expect(stats.processed_count).toBe(1);
    });

    test('should handle component stats errors gracefully', async () => {
      mockDistinctiveness.getStats.mockRejectedValue(new Error('Stats unavailable'));
      
      const stats = await engine.getStats();
      expect(stats.components.distinctiveness.error).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle empty phrases gracefully', async () => {
      const result = await engine.scorePhrase('');
      expect(result.final_score).toBe(0);
      expect(result.quality_classification).toBe('unacceptable');
      expect(result.decision.accept).toBe(false);
    });

    test('should handle component initialization failures', async () => {
      mockDistinctiveness.initialize.mockRejectedValue(new Error('Init failed'));
      
      const initResults = await engine.initialize();
      expect(initResults.distinctiveness).toBe(false);
    });

    test('should handle scoring errors and continue processing', async () => {
      mockDistinctiveness.scoreDistinctiveness.mockRejectedValue(new Error('Scoring failed'));
      
      const result = await engine.scorePhrase('test phrase');
      expect(result.component_scores.distinctiveness).toBe(0);
      expect(result.final_score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Integration Scenarios', () => {
    test('should demonstrate excellent phrase scoring', async () => {
      // Mock high scores across all components
      mockDistinctiveness.scoreDistinctiveness.mockResolvedValue({ score: 25, duration_ms: 50 });
      mockDescribability.scoreDescribability.mockResolvedValue({ total_score: 25, duration_ms: 40 });
      mockLegacy.scoreLegacyHeuristics.mockResolvedValue({ total_score: 30, duration_ms: 30 });
      mockCultural.scoreCulturalValidation.mockResolvedValue({ total_score: 20, duration_ms: 35 });
      
      const result = await engine.scorePhrase('perfect phrase');
      
      expect(result.final_score).toBe(100);
      expect(result.quality_classification).toBe('excellent');
      expect(result.decision.recommendation).toBe('auto_accept');
      expect(result.decision.confidence).toBe('high');
    });

    test('should demonstrate poor phrase scoring', async () => {
      // Mock low scores across all components
      mockDistinctiveness.scoreDistinctiveness.mockResolvedValue({ score: 2, duration_ms: 50 });
      mockDescribability.scoreDescribability.mockResolvedValue({ total_score: 3, duration_ms: 40 });
      mockLegacy.scoreLegacyHeuristics.mockResolvedValue({ total_score: 1, duration_ms: 30 });
      mockCultural.scoreCulturalValidation.mockResolvedValue({ total_score: 0, duration_ms: 35 });
      
      const result = await engine.scorePhrase('terrible phrase');
      
      expect(result.final_score).toBeLessThan(20);
      expect(result.quality_classification).toBe('unacceptable');
      expect(result.decision.recommendation).toBe('auto_reject');
      expect(result.decision.confidence).toBe('reject');
    });

    test('should demonstrate balanced acceptable phrase scoring', async () => {
      // Mock medium scores across components
      mockDistinctiveness.scoreDistinctiveness.mockResolvedValue({ score: 12, duration_ms: 50 });
      mockDescribability.scoreDescribability.mockResolvedValue({ total_score: 13, duration_ms: 40 });
      mockLegacy.scoreLegacyHeuristics.mockResolvedValue({ total_score: 15, duration_ms: 30 });
      mockCultural.scoreCulturalValidation.mockResolvedValue({ total_score: 8, duration_ms: 35 });
      
      const result = await engine.scorePhrase('medium phrase');
      
      expect(result.final_score).toBeGreaterThan(40);
      expect(result.final_score).toBeLessThan(60);
      expect(result.quality_classification).toBe('acceptable');
      expect(result.decision.recommendation).toBe('conditional_accept');
      expect(result.decision.confidence).toBe('low');
    });
  });

  describe('Cleanup', () => {
    test('should close all component connections', async () => {
      await engine.close();
      
      expect(mockDistinctiveness.close).toHaveBeenCalled();
      expect(mockDescribability.close).toHaveBeenCalled();
      expect(mockLegacy.close).toHaveBeenCalled();
      expect(mockCultural.close).toHaveBeenCalled();
    });

    test('should handle close errors gracefully', async () => {
      mockDistinctiveness.close.mockRejectedValue(new Error('Close failed'));
      
      // Should not throw despite component close failure
      await expect(engine.close()).resolves.toBeUndefined();
    });
  });
}); 