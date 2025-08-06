const DistinctivenessScorer = require('./distinctiveness-scorer');
const DescribabilityScorer = require('./describability-scorer');
const LegacyHeuristicsScorer = require('./legacy-heuristics-scorer');
const CulturalValidationScorer = require('./cultural-validation-scorer');

// Database integration
const { getDatabase } = require('../../database/connection');
const Phrase = require('../../database/models/phrase');
const PhraseScore = require('../../database/models/phrase-score');

/**
 * DecisionEngine - Unified scoring orchestrator for PhraseMachine v2
 * 
 * Features:
 * - Orchestrates all 4 scoring components (Distinctiveness, Describability, Legacy Heuristics, Cultural Validation)
 * - Implements weighted scoring algorithm (0-100 points)
 * - Provides quality classification and decision recommendations  
 * - Supports parallel component execution for performance
 * - Handles batch scoring and statistics
 * - Integrates with PostgreSQL for score persistence and analytics
 */
class DecisionEngine {
  constructor(options = {}) {
    this.processedCount = 0;
    
    // Initialize all scoring components
    this.distinctivenessScorer = new DistinctivenessScorer(options.distinctiveness);
    this.describabilityScorer = new DescribabilityScorer(options.describability);
    this.legacyHeuristicsScorer = new LegacyHeuristicsScorer(options.legacy);
    this.culturalValidationScorer = new CulturalValidationScorer(options.cultural);
    
    // Weighted scoring algorithm configuration
    this.WEIGHTS = {
      DISTINCTIVENESS: 0.25,      // 25% weight (0-25 pts * 0.25 = 0-6.25 contribution)
      DESCRIBABILITY: 0.30,       // 30% weight (0-25 pts * 0.30 = 0-7.5 contribution)  
      LEGACY_HEURISTICS: 0.25,    // 25% weight (0-30 pts * 0.25 = 0-7.5 contribution)
      CULTURAL_VALIDATION: 0.20   // 20% weight (0-20+ pts * 0.20 = 0-5+ contribution)
    };
    
    // Decision thresholds for phrase quality classification
    this.THRESHOLDS = {
      EXCELLENT: 80,        // 80-100 points: Exceptional phrases, auto-accept
      GOOD: 60,            // 60-79 points: Good phrases, likely accept  
      ACCEPTABLE: 40,      // 40-59 points: Acceptable phrases, conditional accept
      POOR: 20,            // 20-39 points: Poor phrases, likely reject
      UNACCEPTABLE: 0      // 0-19 points: Unacceptable phrases, auto-reject
    };
    
    // Quality classifications with recommendations
    this.QUALITY_CLASSIFICATIONS = {
      excellent: {
        score_range: '80-100',
        recommendation: 'auto_accept',
        description: 'Exceptional phrases with high distinctiveness, describability, and cultural relevance',
        use_cases: ['Primary game content', 'Featured phrases', 'High-quality gameplay']
      },
      good: {
        score_range: '60-79', 
        recommendation: 'likely_accept',
        description: 'Good phrases suitable for most gameplay scenarios',
        use_cases: ['Standard game content', 'Regular gameplay', 'General phrase pool']
      },
      acceptable: {
        score_range: '40-59',
        recommendation: 'conditional_accept', 
        description: 'Acceptable phrases that may need context or difficulty adjustment',
        use_cases: ['Filler content', 'Easy mode', 'Backup phrases']
      },
      poor: {
        score_range: '20-39',
        recommendation: 'likely_reject',
        description: 'Poor phrases with significant quality issues',
        use_cases: ['Manual review required', 'Potential rejection', 'Quality improvement needed']
      },
      unacceptable: {
        score_range: '0-19',
        recommendation: 'auto_reject',
        description: 'Unacceptable phrases unsuitable for gameplay',
        use_cases: ['Automatic rejection', 'Quality filter removal', 'System exclusion']
      }
    };
    
    // Performance targets
    this.PERFORMANCE = {
      TARGET_LATENCY_MS: 800,     // Target: <800ms for full scoring pipeline
      MAX_LATENCY_MS: 1500,       // Maximum: <1.5s before timeout warning
      BATCH_SIZE_LIMIT: 20        // Maximum phrases per batch request
    };
  }

  /**
   * Initialize all scoring components
   */
  async initialize() {
    console.log('🔄 Initializing DecisionEngine with all scoring components...');
    
    const initResults = {
      distinctiveness: false,
      describability: false,  
      legacy: true,        // Legacy scorer has no external dependencies
      cultural: true       // Cultural scorer has no external dependencies
    };
    
    try {
      // Initialize distinctiveness scorer (requires Redis for Wikidata/N-grams)
      console.log('   🔗 Initializing distinctiveness scorer...');
      initResults.distinctiveness = await this.distinctivenessScorer.initialize();
      
      // Initialize describability scorer (requires Redis for concreteness)
      console.log('   📖 Initializing describability scorer...');
      initResults.describability = await this.describabilityScorer.initialize();
      
      // Legacy and cultural scorers don't need initialization
      console.log('   📝 Legacy heuristics scorer ready (no initialization required)');
      console.log('   🎭 Cultural validation scorer ready (no initialization required)');
      
      const componentsReady = Object.values(initResults).filter(Boolean).length;
      const totalComponents = Object.keys(initResults).length;
      
      console.log(`✅ DecisionEngine initialized: ${componentsReady}/${totalComponents} components ready`);
      
      if (componentsReady < totalComponents) {
        console.warn('⚠️ Some scoring components not fully initialized - scores may be limited');
      }
      
      return initResults;
      
    } catch (error) {
      console.error('❌ Failed to initialize DecisionEngine:', error.message);
      return initResults;
    }
  }

  /**
   * Calculate weighted final score from component scores
   */
  calculateWeightedScore(componentScores) {
    const {
      distinctiveness = 0,
      describability = 0, 
      legacy_heuristics = 0,
      cultural_validation = 0
    } = componentScores;
    
    // Normalize scores to 0-100 scale using weights
    const normalizedScores = {
      distinctiveness: (distinctiveness / 25) * 100 * this.WEIGHTS.DISTINCTIVENESS,
      describability: (describability / 25) * 100 * this.WEIGHTS.DESCRIBABILITY,
      legacy_heuristics: (legacy_heuristics / 30) * 100 * this.WEIGHTS.LEGACY_HEURISTICS,
      cultural_validation: Math.min(cultural_validation / 20, 1.25) * 100 * this.WEIGHTS.CULTURAL_VALIDATION // Allow 25% bonus
    };
    
    // Calculate final weighted score
    const finalScore = Object.values(normalizedScores).reduce((sum, score) => sum + score, 0);
    
    return {
      final_score: Math.round(finalScore * 100) / 100, // Round to 2 decimal places
      component_contributions: normalizedScores,
      raw_scores: componentScores
    };
  }

  /**
   * Classify phrase quality based on final score
   */
  classifyQuality(finalScore) {
    if (finalScore >= this.THRESHOLDS.EXCELLENT) {
      return 'excellent';
    } else if (finalScore >= this.THRESHOLDS.GOOD) {
      return 'good';
    } else if (finalScore >= this.THRESHOLDS.ACCEPTABLE) {
      return 'acceptable';
    } else if (finalScore >= this.THRESHOLDS.POOR) {
      return 'poor';
    } else {
      return 'unacceptable';
    }
  }

  /**
   * Make acceptance decision based on quality classification
   */
  makeDecision(qualityClassification) {
    const classification = this.QUALITY_CLASSIFICATIONS[qualityClassification];
    
    return {
      accept: ['auto_accept', 'likely_accept', 'conditional_accept'].includes(classification.recommendation),
      confidence: classification.recommendation === 'auto_accept' ? 'high' :
                 classification.recommendation === 'likely_accept' ? 'medium' :
                 classification.recommendation === 'conditional_accept' ? 'low' : 'reject',
      recommendation: classification.recommendation,
      reasoning: classification.description
    };
  }

  /**
   * Persist phrase and score to database
   */
  async persistScore(phrase, scoringResult, options = {}) {
    const { 
      source = 'llm_generated', 
      generation_session_id = null,
      scorer_instance = 'decision-engine-v2'
    } = options;
    
    try {
      // Find or create phrase in database
      let phraseRecord = await Phrase.findByNormalizedPhrase(phrase);
      
      if (!phraseRecord) {
        // Create new phrase
        phraseRecord = new Phrase({
          phrase: phrase,
          category: 'general', // Default category, can be overridden by options
          source: source,
          generation_session_id: generation_session_id
        });
        await phraseRecord.save();
        console.log(`   💾 Created new phrase record: ${phraseRecord.id}`);
      } else {
        console.log(`   💾 Found existing phrase record: ${phraseRecord.id}`);
      }

      // Create score record
      const scoreRecord = new PhraseScore({
        phrase_id: phraseRecord.id,
        distinctiveness_score: scoringResult.component_scores.distinctiveness,
        describability_score: scoringResult.component_scores.describability,
        legacy_heuristics_score: scoringResult.component_scores.legacy_heuristics,
        cultural_validation_score: scoringResult.component_scores.cultural_validation,
        final_score: scoringResult.final_score,
        quality_classification: scoringResult.quality_classification,
        decision_recommendation: scoringResult.decision.recommendation,
        scoring_duration_ms: scoringResult.performance.total_duration_ms,
        scorer_instance: scorer_instance,
        distinctiveness_details: scoringResult.component_details.distinctiveness,
        describability_details: scoringResult.component_details.describability,
        legacy_heuristics_details: scoringResult.component_details.legacy_heuristics,
        cultural_validation_details: scoringResult.component_details.cultural_validation
      });
      
      await scoreRecord.save();
      console.log(`   💾 Saved score record: ${scoreRecord.id} (${scoreRecord.final_score}/100)`);
      
      return {
        phrase_id: phraseRecord.id,
        score_id: scoreRecord.id,
        phrase_record: phraseRecord,
        score_record: scoreRecord
      };
      
    } catch (error) {
      console.error(`❌ Failed to persist score for "${phrase}":`, error.message);
      // Don't throw - persistence failure shouldn't break scoring
      return null;
    }
  }

  /**
   * Score a single phrase with decision engine (with optional database persistence)
   */
  async scorePhrase(phrase) {
    const startTime = Date.now();
    const normalizedPhrase = phrase.toLowerCase().trim();
    
    console.log(`🎯 Decision Engine scoring: "${phrase}"`);
    
    const result = {
      phrase: normalizedPhrase,
      final_score: 0,
      quality_classification: 'unacceptable',
      decision: null,
      component_scores: {},
      component_details: {},
      weighted_analysis: null,
      performance: {
        total_duration_ms: 0,
        component_durations: {},
        within_target: false
      },
      timestamp: new Date().toISOString()
    };
    
    try {
      // Score with all components in parallel for maximum performance
      console.log('   🔀 Running parallel scoring across all components...');
      
      const componentPromises = [
        this.distinctivenessScorer.scoreDistinctiveness(phrase).catch(err => ({ score: 0, error: err.message })),
        this.describabilityScorer.scoreDescribability(phrase).catch(err => ({ total_score: 0, error: err.message })),
        this.legacyHeuristicsScorer.scoreLegacyHeuristics(phrase).catch(err => ({ total_score: 0, error: err.message })),
        this.culturalValidationScorer.scoreCulturalValidation(phrase).catch(err => ({ total_score: 0, error: err.message }))
      ];
      
      const [distinctivenessResult, describabilityResult, legacyResult, culturalResult] = await Promise.all(componentPromises);
      
      // Extract scores and track component performance
      result.component_scores = {
        distinctiveness: distinctivenessResult.score || 0,
        describability: describabilityResult.total_score || 0,
        legacy_heuristics: legacyResult.total_score || 0,
        cultural_validation: culturalResult.total_score || 0
      };
      
      result.component_details = {
        distinctiveness: distinctivenessResult,
        describability: describabilityResult,
        legacy_heuristics: legacyResult,
        cultural_validation: culturalResult
      };
      
      result.performance.component_durations = {
        distinctiveness: distinctivenessResult.duration_ms || 0,
        describability: describabilityResult.duration_ms || 0,
        legacy_heuristics: legacyResult.duration_ms || 0,
        cultural_validation: culturalResult.duration_ms || 0
      };
      
      console.log(`   🎯 Component scores: D:${result.component_scores.distinctiveness}, Desc:${result.component_scores.describability}, L:${result.component_scores.legacy_heuristics}, C:${result.component_scores.cultural_validation}`);
      
      // Calculate weighted final score
      result.weighted_analysis = this.calculateWeightedScore(result.component_scores);
      result.final_score = result.weighted_analysis.final_score;
      
      // Classify quality and make decision
      result.quality_classification = this.classifyQuality(result.final_score);
      result.decision = this.makeDecision(result.quality_classification);
      
      // Performance analysis
      result.performance.total_duration_ms = Date.now() - startTime;
      result.performance.within_target = result.performance.total_duration_ms <= this.PERFORMANCE.TARGET_LATENCY_MS;
      
      console.log(`   ✅ Final score: ${result.final_score}/100 (${result.quality_classification}) - ${result.decision.recommendation}`);
      console.log(`   ⏱️ Performance: ${result.performance.total_duration_ms}ms (target: ${this.PERFORMANCE.TARGET_LATENCY_MS}ms)`);
      
      // Log performance warning if needed
      if (result.performance.total_duration_ms > this.PERFORMANCE.MAX_LATENCY_MS) {
        console.warn(`⚠️ Slow decision engine scoring: ${result.performance.total_duration_ms}ms for "${phrase}"`);
      }
      
      this.processedCount++;
      
      // Persist score to database (optional - doesn't affect scoring result)
      try {
        const persistenceResult = await this.persistScore(phrase, result);
        if (persistenceResult) {
          result.database = {
            phrase_id: persistenceResult.phrase_id,
            score_id: persistenceResult.score_id,
            persisted: true
          };
        }
      } catch (persistError) {
        console.warn(`⚠️ Database persistence failed for "${phrase}": ${persistError.message}`);
        result.database = { persisted: false, error: persistError.message };
      }
      
      return result;
      
    } catch (error) {
      console.error(`❌ Error in decision engine scoring for "${phrase}":`, error.message);
      
      result.final_score = 0;
      result.quality_classification = 'unacceptable';
      result.decision = this.makeDecision('unacceptable');
      result.error = error.message;
      result.performance.total_duration_ms = Date.now() - startTime;
      
      return result;
    }
  }

  /**
   * Batch score multiple phrases with decision engine
   */
  async batchScorePhrase(phrases) {
    const startTime = Date.now();
    
    if (phrases.length > this.PERFORMANCE.BATCH_SIZE_LIMIT) {
      throw new Error(`Batch size ${phrases.length} exceeds limit of ${this.PERFORMANCE.BATCH_SIZE_LIMIT}`);
    }
    
    console.log(`🎯 Decision Engine batch scoring ${phrases.length} phrases...`);
    
    const results = [];
    let totalFinalScore = 0;
    let avgDuration = 0;
    
    for (const phrase of phrases) {
      if (typeof phrase === 'string' && phrase.length >= 2 && phrase.length <= 100) {
        const result = await this.scorePhrase(phrase);
        results.push(result);
        totalFinalScore += result.final_score;
        avgDuration += result.performance.total_duration_ms;
      } else {
        results.push({
          phrase,
          final_score: 0,
          quality_classification: 'unacceptable',
          decision: this.makeDecision('unacceptable'),
          error: 'Invalid phrase format',
          performance: { total_duration_ms: 0 }
        });
      }
    }
    
    const totalDuration = Date.now() - startTime;
    avgDuration = avgDuration / results.length;
    
    // Calculate comprehensive statistics
    const qualityDistribution = {
      excellent: results.filter(r => r.quality_classification === 'excellent').length,
      good: results.filter(r => r.quality_classification === 'good').length,
      acceptable: results.filter(r => r.quality_classification === 'acceptable').length,
      poor: results.filter(r => r.quality_classification === 'poor').length,
      unacceptable: results.filter(r => r.quality_classification === 'unacceptable').length
    };
    
    const decisionDistribution = {
      auto_accept: results.filter(r => r.decision?.recommendation === 'auto_accept').length,
      likely_accept: results.filter(r => r.decision?.recommendation === 'likely_accept').length,
      conditional_accept: results.filter(r => r.decision?.recommendation === 'conditional_accept').length,
      likely_reject: results.filter(r => r.decision?.recommendation === 'likely_reject').length,
      auto_reject: results.filter(r => r.decision?.recommendation === 'auto_reject').length
    };
    
    const acceptanceRate = Math.round(((decisionDistribution.auto_accept + decisionDistribution.likely_accept + decisionDistribution.conditional_accept) / phrases.length) * 100);
    const performanceRate = Math.round((results.filter(r => r.performance.within_target).length / results.length) * 100);
    
    console.log(`✅ Batch scoring complete:`);
    console.log(`   📊 Quality: ${qualityDistribution.excellent} excellent, ${qualityDistribution.good} good, ${qualityDistribution.acceptable} acceptable`);
    console.log(`   🎯 Decisions: ${acceptanceRate}% acceptance rate, ${performanceRate}% within performance target`);
    console.log(`   ⏱️ Performance: ${avgDuration.toFixed(1)}ms avg, ${totalDuration}ms total`);
    
    return {
      results,
      summary: {
        total_phrases: phrases.length,
        avg_final_score: Math.round((totalFinalScore / phrases.length) * 100) / 100,
        avg_duration_ms: Math.round(avgDuration),
        total_duration_ms: totalDuration,
        quality_distribution: qualityDistribution,
        decision_distribution: decisionDistribution,
        acceptance_rate: acceptanceRate,
        performance_rate: performanceRate,
        within_performance_target: performanceRate >= 80,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Get decision engine statistics
   */
  async getStats() {
    try {
      // Get stats from all component scorers
      const componentStats = await Promise.all([
        this.distinctivenessScorer.getStats().catch(() => ({ service: 'distinctiveness_scorer', error: 'unavailable' })),
        this.describabilityScorer.getStats().catch(() => ({ service: 'describability_scorer', error: 'unavailable' })),
        this.legacyHeuristicsScorer.getStats().catch(() => ({ service: 'legacy_heuristics_scorer', error: 'unavailable' })),
        this.culturalValidationScorer.getStats().catch(() => ({ service: 'cultural_validation_scorer', error: 'unavailable' }))
      ]);
      
      return {
        service: 'decision_engine',
        version: '1.0.0',
        components: {
          distinctiveness: componentStats[0],
          describability: componentStats[1],
          legacy_heuristics: componentStats[2],
          cultural_validation: componentStats[3]
        },
        algorithm: {
          weights: this.WEIGHTS,
          thresholds: this.THRESHOLDS,
          quality_classifications: Object.keys(this.QUALITY_CLASSIFICATIONS).length
        },
        performance: {
          target_latency_ms: this.PERFORMANCE.TARGET_LATENCY_MS,
          max_latency_ms: this.PERFORMANCE.MAX_LATENCY_MS,
          batch_size_limit: this.PERFORMANCE.BATCH_SIZE_LIMIT
        },
        processed_count: this.processedCount,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error getting decision engine stats:', error);
      return { 
        service: 'decision_engine',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Close all scoring component connections
   */
  async close() {
    console.log('🔌 Closing DecisionEngine and all scoring components...');
    
    try {
      await Promise.all([
        this.distinctivenessScorer.close(),
        this.describabilityScorer.close(),
        this.legacyHeuristicsScorer.close(),
        this.culturalValidationScorer.close()
      ]);
      
      console.log('✅ DecisionEngine closed successfully');
    } catch (error) {
      console.error('❌ Error closing DecisionEngine:', error.message);
    }
  }
}

module.exports = DecisionEngine; 