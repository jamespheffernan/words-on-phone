const LLMPromptBuilder = require('./llm-prompt-builder');
const DecisionEngine = require('../scoring/decision-engine');

/**
 * LLMGenerator - Complete phrase generation and quality optimization service
 * Combines enhanced prompt engineering with decision engine evaluation
 * 
 * Features:
 * - Quality-optimized phrase generation targeting 60+ points
 * - Iterative improvement based on scoring feedback
 * - Category-specific generation with cultural relevance optimization
 * - Batch generation with diversity controls and quality filtering
 * - Real-time scoring integration for immediate quality assessment
 */
class LLMGenerator {
  constructor(options = {}) {
    this.promptBuilder = new LLMPromptBuilder(options.prompt);
    this.decisionEngine = new DecisionEngine(options.decision);
    this.generationCount = 0;
    
    // Generation quality parameters
    this.QUALITY_PARAMS = {
      TARGET_SCORE_MIN: 60,           // Minimum acceptable score (good quality)
      EXCELLENT_SCORE_MIN: 80,        // Target for excellent quality
      MAX_GENERATION_ATTEMPTS: 3,     // Maximum attempts to achieve target quality
      QUALITY_IMPROVEMENT_ITERATIONS: 2, // Feedback-based improvement cycles
      BATCH_QUALITY_THRESHOLD: 0.7    // Minimum proportion of phrases meeting quality target
    };
    
    // Performance monitoring
    this.PERFORMANCE = {
      GENERATION_TIMEOUT_MS: 30000,   // Maximum time for generation request
      SCORING_TIMEOUT_MS: 10000,      // Maximum time for scoring batch
      MAX_CONCURRENT_GENERATIONS: 3   // Limit concurrent generation requests
    };
    
    // Generation history for feedback optimization
    this.generationHistory = {
      successful_phrases: [],         // High-scoring phrases for pattern analysis
      failed_phrases: [],             // Low-scoring phrases for avoidance patterns
      category_performance: {},       // Performance tracking by category
      quality_trends: []              // Quality improvement over time
    };
  }

  /**
   * Initialize the LLM generator with all dependencies
   */
  async initialize() {
    console.log('🔄 Initializing LLMGenerator...');
    
    try {
      // Initialize decision engine for scoring
      const initResults = await this.decisionEngine.initialize();
      
      const componentsReady = Object.values(initResults).filter(Boolean).length;
      const totalComponents = Object.keys(initResults).length;
      
      console.log(`✅ LLMGenerator initialized: ${componentsReady}/${totalComponents} scoring components ready`);
      
      if (componentsReady >= 2) {
        console.log('🚀 LLMGenerator ready for production use');
        return true;
      } else {
        console.warn('⚠️ LLMGenerator in degraded mode - limited scoring components available');
        return false;
      }
      
    } catch (error) {
      console.error('❌ Failed to initialize LLMGenerator:', error.message);
      return false;
    }
  }

  /**
   * Generate high-quality phrases with scoring optimization
   */
  async generateQualityPhrases(options = {}) {
    const startTime = Date.now();
    const {
      count = 10,
      category = 'general',
      quality_target = 'good',
      max_attempts = this.QUALITY_PARAMS.MAX_GENERATION_ATTEMPTS,
      use_feedback = true
    } = options;
    
    console.log(`🎯 Generating ${count} ${quality_target} quality phrases (${category} category)...`);
    
    const result = {
      generated_phrases: [],
      scored_phrases: [],
      generation_attempts: 0,
      quality_metrics: {
        avg_score: 0,
        quality_distribution: {},
        acceptance_rate: 0,
        target_achieved: false
      },
      performance: {
        total_duration_ms: 0,
        generation_time_ms: 0,
        scoring_time_ms: 0
      },
      metadata: {
        category,
        quality_target,
        count,
        feedback_used: use_feedback
      }
    };
    
    try {
      // Build feedback-optimized prompt if history exists
      let promptResult;
      if (use_feedback && this.hasGenerationHistory(category)) {
        console.log('📈 Using feedback optimization from generation history...');
        const feedbackData = this.buildFeedbackData(category);
        promptResult = this.promptBuilder.buildFeedbackPrompt(feedbackData, { count, category });
      } else {
        console.log('📝 Using standard optimized prompt...');
        promptResult = this.promptBuilder.buildPrompt({
          category,
          count,
          quality_target,
          additional_constraints: [],
          previous_phrases: []
        });
      }
      
      // Generate phrases with quality optimization loop
      let bestGeneration = null;
      let attemptCount = 0;
      
      while (attemptCount < max_attempts && (!bestGeneration || !bestGeneration.target_achieved)) {
        attemptCount++;
        console.log(`   🔄 Generation attempt ${attemptCount}/${max_attempts}...`);
        
        // Generate phrases
        const generationStart = Date.now();
        const generationResult = await this.promptBuilder.generatePhrases(promptResult);
        const generationTime = Date.now() - generationStart;
        
        console.log(`   📝 Generated ${generationResult.phrases.length} phrases in ${generationTime}ms`);
        
        // Score all generated phrases
        const scoringStart = Date.now();
        const scoringResult = await this.decisionEngine.batchScorePhrase(generationResult.phrases);
        const scoringTime = Date.now() - scoringStart;
        
        console.log(`   📊 Scored ${scoringResult.results.length} phrases in ${scoringTime}ms`);
        
        // Analyze quality metrics
        const qualityAnalysis = this.analyzeGenerationQuality(scoringResult, quality_target);
        
        console.log(`   🎯 Quality: ${qualityAnalysis.avg_score.toFixed(1)}/100 avg, ${qualityAnalysis.acceptance_rate}% accepted`);
        
        // Store this attempt
        const attemptResult = {
          generation_result: generationResult,
          scoring_result: scoringResult,
          quality_analysis: qualityAnalysis,
          generation_time_ms: generationTime,
          scoring_time_ms: scoringTime,
          target_achieved: qualityAnalysis.target_achieved
        };
        
        // Keep the best result so far
        if (!bestGeneration || qualityAnalysis.avg_score > bestGeneration.quality_analysis.avg_score) {
          bestGeneration = attemptResult;
        }
        
        // Stop if we achieved the target
        if (qualityAnalysis.target_achieved) {
          console.log(`   ✅ Quality target achieved in attempt ${attemptCount}`);
          break;
        }
      }
      
      // Use the best generation result
      if (bestGeneration) {
        result.generated_phrases = bestGeneration.generation_result.phrases;
        result.scored_phrases = bestGeneration.scoring_result.results;
        result.quality_metrics = bestGeneration.quality_analysis;
        result.performance.generation_time_ms = bestGeneration.generation_time_ms;
        result.performance.scoring_time_ms = bestGeneration.scoring_time_ms;
      }
      
      result.generation_attempts = attemptCount;
      result.performance.total_duration_ms = Date.now() - startTime;
      
      // Update generation history for future feedback
      this.updateGenerationHistory(category, result);
      
      console.log(`✅ Generation complete: ${result.quality_metrics.avg_score.toFixed(1)}/100 avg score, ${result.quality_metrics.acceptance_rate}% acceptance rate`);
      
      this.generationCount += result.generated_phrases.length;
      return result;
      
    } catch (error) {
      console.error(`❌ Error in quality phrase generation:`, error.message);
      
      result.error = error.message;
      result.performance.total_duration_ms = Date.now() - startTime;
      
      return result;
    }
  }

  /**
   * Generate diverse batch of high-quality phrases across categories
   */
  async generateDiverseBatch(options = {}) {
    const startTime = Date.now();
    const {
      total_count = 20,
      categories = ['pop_culture', 'food', 'sports', 'general'],
      quality_distribution = { excellent: 0.3, good: 0.7 },
      diversity_level = 'high'
    } = options;
    
    console.log(`🌟 Generating diverse batch: ${total_count} phrases across ${categories.length} categories...`);
    
    const result = {
      all_phrases: [],
      by_category: {},
      overall_quality: {
        avg_score: 0,
        quality_distribution: {},
        acceptance_rate: 0,
        diversity_score: 0
      },
      performance: {
        total_duration_ms: 0,
        category_durations: {}
      },
      metadata: {
        total_count,
        categories,
        quality_distribution,
        diversity_level
      }
    };
    
    try {
      // Calculate phrases per category
      const phrasesPerCategory = Math.ceil(total_count / categories.length);
      
      // Generate phrases for each category
      for (const category of categories) {
        const categoryStart = Date.now();
        console.log(`   🎯 Generating ${phrasesPerCategory} ${category} phrases...`);
        
        const categoryResult = await this.generateQualityPhrases({
          count: phrasesPerCategory,
          category,
          quality_target: 'good',
          use_feedback: true
        });
        
        result.by_category[category] = categoryResult;
        result.all_phrases.push(...categoryResult.scored_phrases);
        
        const categoryDuration = Date.now() - categoryStart;
        result.performance.category_durations[category] = categoryDuration;
        
        console.log(`   ✅ ${category}: ${categoryResult.quality_metrics.avg_score.toFixed(1)}/100 avg (${categoryDuration}ms)`);
      }
      
      // Trim to exact count and optimize diversity
      if (result.all_phrases.length > total_count) {
        result.all_phrases = this.optimizeDiversity(result.all_phrases, total_count);
      }
      
      // Calculate overall quality metrics
      result.overall_quality = this.calculateOverallQuality(result.all_phrases);
      result.performance.total_duration_ms = Date.now() - startTime;
      
      console.log(`✅ Diverse batch complete: ${result.all_phrases.length} phrases, ${result.overall_quality.avg_score.toFixed(1)}/100 avg score`);
      
      return result;
      
    } catch (error) {
      console.error(`❌ Error in diverse batch generation:`, error.message);
      
      result.error = error.message;
      result.performance.total_duration_ms = Date.now() - startTime;
      
      return result;
    }
  }

  /**
   * Generate phrases with iterative quality improvement
   */
  async generateWithFeedbackLoop(options = {}) {
    const {
      initial_count = 20,
      target_quality = 70,
      max_iterations = this.QUALITY_PARAMS.QUALITY_IMPROVEMENT_ITERATIONS,
      category = 'general'
    } = options;
    
    console.log(`🔄 Starting feedback-based generation: target ${target_quality}+ points over ${max_iterations} iterations...`);
    
    const iterations = [];
    let currentIteration = 0;
    let bestResult = null;
    
    while (currentIteration < max_iterations) {
      currentIteration++;
      console.log(`\n🔄 Iteration ${currentIteration}/${max_iterations}:`);
      
      // Generate phrases
      const iterationResult = await this.generateQualityPhrases({
        count: initial_count,
        category,
        quality_target: target_quality >= 80 ? 'excellent' : 'good',
        use_feedback: currentIteration > 1 // Use feedback after first iteration
      });
      
      iterations.push(iterationResult);
      
      // Track best result
      if (!bestResult || iterationResult.quality_metrics.avg_score > bestResult.quality_metrics.avg_score) {
        bestResult = iterationResult;
      }
      
      console.log(`   📊 Iteration ${currentIteration}: ${iterationResult.quality_metrics.avg_score.toFixed(1)}/100 avg score`);
      
      // Check if target achieved
      if (iterationResult.quality_metrics.avg_score >= target_quality) {
        console.log(`   ✅ Target quality achieved in iteration ${currentIteration}!`);
        break;
      }
      
      // Update feedback for next iteration
      this.updateGenerationHistory(category, iterationResult);
    }
    
    return {
      final_result: bestResult,
      iterations,
      improvement_achieved: bestResult.quality_metrics.avg_score >= target_quality,
      quality_improvement: iterations.length > 1 ? 
        bestResult.quality_metrics.avg_score - iterations[0].quality_metrics.avg_score : 0
    };
  }

  /**
   * Analyze generation quality against targets
   */
  analyzeGenerationQuality(scoringResult, quality_target) {
    const targetScore = quality_target === 'excellent' ? 
      this.QUALITY_PARAMS.EXCELLENT_SCORE_MIN : 
      this.QUALITY_PARAMS.TARGET_SCORE_MIN;
    
    const scores = scoringResult.results.map(r => r.final_score);
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    const acceptedCount = scoringResult.results.filter(r => r.final_score >= targetScore).length;
    const acceptanceRate = Math.round((acceptedCount / scoringResult.results.length) * 100);
    
    return {
      avg_score: avgScore,
      min_score: Math.min(...scores),
      max_score: Math.max(...scores),
      target_score: targetScore,
      acceptance_rate: acceptanceRate,
      target_achieved: acceptanceRate >= this.QUALITY_PARAMS.BATCH_QUALITY_THRESHOLD * 100,
      quality_distribution: scoringResult.summary.quality_distribution,
      decision_distribution: scoringResult.summary.decision_distribution
    };
  }

  /**
   * Build feedback data from generation history
   */
  buildFeedbackData(category) {
    const categoryHistory = this.generationHistory.category_performance[category];
    if (!categoryHistory) {
      return { target_improvements: [], avoid_patterns: [], successful_examples: [], failed_examples: [] };
    }
    
    return {
      target_improvements: [
        'Focus on high-scoring patterns from successful examples',
        'Increase cultural relevance for category-specific bonus points',
        'Optimize for concrete, visual concepts for describability',
        'Use simple vocabulary with optimal 2-4 word length'
      ],
      avoid_patterns: [
        'Abstract or theoretical concepts with low concreteness',
        'Generic phrases that could apply to multiple concepts',
        'Overly complex or technical vocabulary',
        'Single words or excessively long phrases'
      ],
      successful_examples: categoryHistory.successful_phrases.slice(0, 5),
      failed_examples: categoryHistory.failed_phrases.slice(0, 5)
    };
  }

  /**
   * Update generation history for feedback optimization
   */
  updateGenerationHistory(category, generationResult) {
    if (!this.generationHistory.category_performance[category]) {
      this.generationHistory.category_performance[category] = {
        successful_phrases: [],
        failed_phrases: [],
        avg_scores: []
      };
    }
    
    const categoryData = this.generationHistory.category_performance[category];
    
    // Add successful and failed phrases
    for (const phrase of generationResult.scored_phrases) {
      if (phrase.final_score >= this.QUALITY_PARAMS.TARGET_SCORE_MIN) {
        categoryData.successful_phrases.push({
          phrase: phrase.phrase,
          score: phrase.final_score,
          success_factors: this.extractSuccessFactors(phrase)
        });
      } else {
        categoryData.failed_phrases.push({
          phrase: phrase.phrase,
          score: phrase.final_score,
          failure_reasons: this.extractFailureReasons(phrase)
        });
      }
    }
    
    // Limit history size
    categoryData.successful_phrases = categoryData.successful_phrases.slice(-20);
    categoryData.failed_phrases = categoryData.failed_phrases.slice(-20);
    
    // Track quality trends
    categoryData.avg_scores.push(generationResult.quality_metrics.avg_score);
    categoryData.avg_scores = categoryData.avg_scores.slice(-10);
  }

  /**
   * Extract success factors from high-scoring phrases
   */
  extractSuccessFactors(phrase) {
    const factors = [];
    
    if (phrase.component_scores.cultural_validation >= 10) {
      factors.push('high cultural relevance');
    }
    if (phrase.component_scores.describability >= 15) {
      factors.push('concrete/visual concept');
    }
    if (phrase.component_scores.legacy_heuristics >= 20) {
      factors.push('optimal word simplicity/length');
    }
    if (phrase.component_scores.distinctiveness >= 15) {
      factors.push('unique/specific description');
    }
    
    return factors;
  }

  /**
   * Extract failure reasons from low-scoring phrases
   */
  extractFailureReasons(phrase) {
    const reasons = [];
    
    if (phrase.component_scores.cultural_validation <= 5) {
      reasons.push('low cultural relevance');
    }
    if (phrase.component_scores.describability <= 10) {
      reasons.push('abstract/hard to describe');
    }
    if (phrase.component_scores.legacy_heuristics <= 15) {
      reasons.push('complex words or poor length');
    }
    if (phrase.component_scores.distinctiveness <= 10) {
      reasons.push('generic or common phrase');
    }
    
    return reasons;
  }

  /**
   * Check if generation history exists for category
   */
  hasGenerationHistory(category) {
    return this.generationHistory.category_performance[category] &&
           this.generationHistory.category_performance[category].successful_phrases.length > 0;
  }

  /**
   * Optimize phrase diversity by removing similar concepts
   */
  optimizeDiversity(phrases, targetCount) {
    // Simple diversity optimization - in production would use semantic similarity
    const uniquePhrases = [];
    const usedWords = new Set();
    
    // Sort by score (highest first)
    const sortedPhrases = phrases.sort((a, b) => b.final_score - a.final_score);
    
    for (const phrase of sortedPhrases) {
      const words = phrase.phrase.toLowerCase().split(/\s+/);
      const hasOverlap = words.some(word => usedWords.has(word));
      
      if (!hasOverlap || uniquePhrases.length < targetCount * 0.8) {
        uniquePhrases.push(phrase);
        words.forEach(word => usedWords.add(word));
        
        if (uniquePhrases.length >= targetCount) {
          break;
        }
      }
    }
    
    return uniquePhrases;
  }

  /**
   * Calculate overall quality metrics for phrase collection
   */
  calculateOverallQuality(phrases) {
    if (phrases.length === 0) {
      return { avg_score: 0, quality_distribution: {}, acceptance_rate: 0, diversity_score: 0 };
    }
    
    const scores = phrases.map(p => p.final_score);
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    const qualityDistribution = {
      excellent: phrases.filter(p => p.quality_classification === 'excellent').length,
      good: phrases.filter(p => p.quality_classification === 'good').length,
      acceptable: phrases.filter(p => p.quality_classification === 'acceptable').length,
      poor: phrases.filter(p => p.quality_classification === 'poor').length,
      unacceptable: phrases.filter(p => p.quality_classification === 'unacceptable').length
    };
    
    const acceptedCount = qualityDistribution.excellent + qualityDistribution.good + qualityDistribution.acceptable;
    const acceptanceRate = Math.round((acceptedCount / phrases.length) * 100);
    
    // Simple diversity score based on unique word usage
    const allWords = phrases.flatMap(p => p.phrase.toLowerCase().split(/\s+/));
    const uniqueWords = new Set(allWords);
    const diversityScore = Math.round((uniqueWords.size / allWords.length) * 100);
    
    return {
      avg_score: avgScore,
      quality_distribution: qualityDistribution,
      acceptance_rate: acceptanceRate,
      diversity_score: diversityScore
    };
  }

  /**
   * Get generator statistics and performance metrics
   */
  async getStats() {
    try {
      const promptStats = this.promptBuilder.getStats();
      const decisionStats = await this.decisionEngine.getStats();
      
      return {
        service: 'llm_generator',
        version: '1.0.0',
        components: {
          prompt_builder: promptStats,
          decision_engine: decisionStats
        },
        generation_stats: {
          total_generated: this.generationCount,
          categories_with_history: Object.keys(this.generationHistory.category_performance).length,
          quality_parameters: this.QUALITY_PARAMS,
          performance_limits: this.PERFORMANCE
        },
        history_summary: {
          total_successful: Object.values(this.generationHistory.category_performance)
            .reduce((sum, cat) => sum + cat.successful_phrases.length, 0),
          total_failed: Object.values(this.generationHistory.category_performance)
            .reduce((sum, cat) => sum + cat.failed_phrases.length, 0)
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error getting generator stats:', error);
      return { 
        service: 'llm_generator',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Close all connections and cleanup
   */
  async close() {
    console.log('🔌 Closing LLMGenerator...');
    await this.decisionEngine.close();
    console.log('✅ LLMGenerator closed');
  }
}

module.exports = LLMGenerator; 