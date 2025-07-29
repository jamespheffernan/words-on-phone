const LLMPromptBuilder = require('../../services/generation/llm-prompt-builder');

describe('LLMPromptBuilder', () => {
  let promptBuilder;
  
  beforeEach(() => {
    promptBuilder = new LLMPromptBuilder();
  });

  describe('Constructor and Initialization', () => {
    test('should initialize with correct quality targets', () => {
      expect(promptBuilder.QUALITY_TARGETS.EXCELLENT_MIN).toBe(80);
      expect(promptBuilder.QUALITY_TARGETS.GOOD_MIN).toBe(60);
      expect(promptBuilder.QUALITY_TARGETS.ACCEPTABLE_MIN).toBe(40);
    });

    test('should initialize scoring insights for all components', () => {
      expect(promptBuilder.SCORING_INSIGHTS).toHaveProperty('distinctiveness');
      expect(promptBuilder.SCORING_INSIGHTS).toHaveProperty('describability');
      expect(promptBuilder.SCORING_INSIGHTS).toHaveProperty('legacy');
      expect(promptBuilder.SCORING_INSIGHTS).toHaveProperty('cultural');
      
      // Check that insights have proper structure
      expect(promptBuilder.SCORING_INSIGHTS.distinctiveness).toHaveProperty('avoid');
      expect(promptBuilder.SCORING_INSIGHTS.distinctiveness).toHaveProperty('target');
      expect(promptBuilder.SCORING_INSIGHTS.describability).toHaveProperty('prefer');
      expect(promptBuilder.SCORING_INSIGHTS.describability).toHaveProperty('avoid');
    });

    test('should initialize category templates', () => {
      expect(promptBuilder.CATEGORY_TEMPLATES).toHaveProperty('pop_culture');
      expect(promptBuilder.CATEGORY_TEMPLATES).toHaveProperty('food');
      expect(promptBuilder.CATEGORY_TEMPLATES).toHaveProperty('sports');
      expect(promptBuilder.CATEGORY_TEMPLATES).toHaveProperty('general');
      
      // Check that templates contain the base prompt
      expect(promptBuilder.CATEGORY_TEMPLATES.pop_culture).toContain('CRITICAL SUCCESS CRITERIA');
      expect(promptBuilder.CATEGORY_TEMPLATES.food).toContain('FOCUS: FOOD CATEGORY');
    });

    test('should initialize batch generation parameters', () => {
      expect(promptBuilder.BATCH_GENERATION.MAX_BATCH_SIZE).toBe(50);
      expect(promptBuilder.BATCH_GENERATION.DIVERSITY_THRESHOLD).toBe(0.7);
      expect(promptBuilder.BATCH_GENERATION.DEDUPLICATION_ENABLED).toBe(true);
      expect(promptBuilder.BATCH_GENERATION.QUALITY_FILTERING).toBe(true);
    });

    test('should track generated count', () => {
      expect(promptBuilder.generatedCount).toBe(0);
    });
  });

  describe('Basic Prompt Building', () => {
    test('should build prompt with default parameters', () => {
      const result = promptBuilder.buildPrompt();
      
      expect(result).toHaveProperty('prompt');
      expect(result).toHaveProperty('metadata');
      expect(result.metadata.category).toBe('general');
      expect(result.metadata.count).toBe(10);
      expect(result.metadata.quality_target).toBe('good');
      expect(result.metadata.template_used).toBe('general');
    });

    test('should build prompt for specific category', () => {
      const result = promptBuilder.buildPrompt({
        category: 'pop_culture',
        count: 5,
        quality_target: 'excellent'
      });
      
      expect(result.metadata.category).toBe('pop_culture');
      expect(result.metadata.count).toBe(5);
      expect(result.metadata.quality_target).toBe('excellent');
      expect(result.prompt).toContain('FOCUS: POP-CULTURE CATEGORY');
      expect(result.prompt).toContain('EXCELLENT (80-100 points)');
    });

    test('should include quality target specifications', () => {
      const excellentResult = promptBuilder.buildPrompt({ quality_target: 'excellent' });
      expect(excellentResult.prompt).toContain('QUALITY TARGET: EXCELLENT');
      expect(excellentResult.prompt).toContain('Perfect scores across all components');
      
      const goodResult = promptBuilder.buildPrompt({ quality_target: 'good' });
      expect(goodResult.prompt).toContain('QUALITY TARGET: GOOD');
      expect(goodResult.prompt).toContain('Strong performance across most scoring components');
    });

    test('should add diversity constraints when previous phrases provided', () => {
      const result = promptBuilder.buildPrompt({
        previous_phrases: ['taylor swift', 'pizza delivery', 'basketball court']
      });
      
      expect(result.prompt).toContain('DIVERSITY REQUIREMENTS');
      expect(result.prompt).toContain('taylor swift, pizza delivery, basketball court');
      expect(result.metadata.diversity_context).toBe(3);
    });

    test('should add additional constraints', () => {
      const result = promptBuilder.buildPrompt({
        additional_constraints: ['Avoid proper nouns', 'Focus on concrete objects']
      });
      
      expect(result.prompt).toContain('ADDITIONAL CONSTRAINTS');
      expect(result.prompt).toContain('Avoid proper nouns');
      expect(result.prompt).toContain('Focus on concrete objects');
      expect(result.metadata.constraints_count).toBe(2);
    });

    test('should estimate token count', () => {
      const result = promptBuilder.buildPrompt();
      expect(result.metadata.estimated_tokens).toBeGreaterThan(0);
      expect(typeof result.metadata.estimated_tokens).toBe('number');
    });
  });

  describe('Batch Prompt Building', () => {
    test('should build batch prompt with default parameters', () => {
      const result = promptBuilder.buildBatchPrompt();
      
      expect(result).toHaveProperty('prompt');
      expect(result).toHaveProperty('metadata');
      expect(result.metadata.total_count).toBe(20);
      expect(result.metadata.categories).toEqual(['general']);
      expect(result.metadata.quality_distribution).toEqual({ excellent: 0.3, good: 0.7 });
    });

    test('should build batch prompt for multiple categories', () => {
      const result = promptBuilder.buildBatchPrompt({
        total_count: 30,
        categories: ['pop_culture', 'food', 'sports']
      });
      
      expect(result.metadata.total_count).toBe(30);
      expect(result.metadata.categories).toEqual(['pop_culture', 'food', 'sports']);
      expect(result.prompt).toContain('Generate 30 high-quality phrases');
      expect(result.prompt).toContain('10 phrases from POP_CULTURE category');
      expect(result.prompt).toContain('10 phrases from FOOD category');
      expect(result.prompt).toContain('10 phrases from SPORTS category');
    });

    test('should enforce batch size limits', () => {
      expect(() => {
        promptBuilder.buildBatchPrompt({ total_count: 100 });
      }).toThrow('Batch size 100 exceeds maximum of 50');
    });

    test('should calculate quality distribution correctly', () => {
      const result = promptBuilder.buildBatchPrompt({
        total_count: 10,
        quality_distribution: { excellent: 0.4, good: 0.6 }
      });
      
      expect(result.metadata.batch_parameters.excellent_target).toBe(4);
      expect(result.metadata.batch_parameters.good_target).toBe(6);
      expect(result.prompt).toContain('4 EXCELLENT phrases');
      expect(result.prompt).toContain('6 GOOD phrases');
    });

    test('should include diversity requirements', () => {
      const result = promptBuilder.buildBatchPrompt({ diversity_level: 'high' });
      
      expect(result.prompt).toContain('DIVERSITY REQUIREMENTS (high level)');
      expect(result.prompt).toContain('Cover completely different semantic domains');
      expect(result.prompt).toContain('Ensure no thematic clustering');
    });
  });

  describe('Feedback-Based Prompt Building', () => {
    test('should build feedback prompt with successful examples', () => {
      const feedbackData = {
        successful_examples: [
          { phrase: 'taylor swift', score: 85, success_factors: ['high cultural relevance', 'concrete person'] },
          { phrase: 'pizza delivery', score: 78, success_factors: ['food category', 'concrete concept'] }
        ],
        failed_examples: [],
        target_improvements: [],
        avoid_patterns: []
      };
      
      const result = promptBuilder.buildFeedbackPrompt(feedbackData);
      
      expect(result.prompt).toContain('FEEDBACK-BASED OPTIMIZATION');
      expect(result.prompt).toContain('SUCCESSFUL PATTERNS (emulate these)');
      expect(result.prompt).toContain('taylor swift');
      expect(result.prompt).toContain('85 points');
      expect(result.metadata.feedback_incorporated.successful_examples).toBe(2);
    });

    test('should build feedback prompt with failed examples', () => {
      const feedbackData = {
        successful_examples: [],
        failed_examples: [
          { phrase: 'abstract concept', score: 25, failure_reasons: ['low concreteness', 'generic phrase'] }
        ],
        target_improvements: [],
        avoid_patterns: []
      };
      
      const result = promptBuilder.buildFeedbackPrompt(feedbackData);
      
      expect(result.prompt).toContain('PATTERNS TO AVOID');
      expect(result.prompt).toContain('abstract concept');
      expect(result.prompt).toContain('25 points');
      expect(result.metadata.feedback_incorporated.failed_examples).toBe(1);
    });

    test('should include target improvements and avoid patterns', () => {
      const feedbackData = {
        successful_examples: [],
        failed_examples: [],
        target_improvements: ['Focus on concrete objects', 'Improve cultural relevance'],
        avoid_patterns: ['Abstract concepts', 'Technical jargon']
      };
      
      const result = promptBuilder.buildFeedbackPrompt(feedbackData);
      
      expect(result.prompt).toContain('TARGET IMPROVEMENTS');
      expect(result.prompt).toContain('Focus on concrete objects');
      expect(result.prompt).toContain('AVOID THESE PATTERNS');
      expect(result.prompt).toContain('Abstract concepts');
    });
  });

  describe('Phrase Generation', () => {
    test('should generate phrases with correct metadata', async () => {
      const promptResult = promptBuilder.buildPrompt({ category: 'pop_culture', count: 5 });
      const result = await promptBuilder.generatePhrases(promptResult);
      
      expect(result).toHaveProperty('phrases');
      expect(result).toHaveProperty('generation_metadata');
      expect(result).toHaveProperty('prompt_metadata');
      
      expect(result.phrases).toHaveLength(5);
      expect(result.generation_metadata.model).toBe('gpt-4');
      expect(result.generation_metadata.generation_time_ms).toBeGreaterThan(0);
      expect(result.prompt_metadata).toBe(promptResult.metadata);
    });

    test('should respect LLM options', async () => {
      const promptResult = promptBuilder.buildPrompt({ count: 3 });
      const result = await promptBuilder.generatePhrases(promptResult, {
        model: 'gpt-3.5-turbo',
        temperature: 0.5,
        max_tokens: 500
      });
      
      expect(result.generation_metadata.model).toBe('gpt-3.5-turbo');
      expect(result.generation_metadata.temperature).toBe(0.5);
      expect(result.generation_metadata.max_tokens).toBe(500);
    });

    test('should increment generated count', async () => {
      const initialCount = promptBuilder.generatedCount;
      const promptResult = promptBuilder.buildPrompt({ count: 3 });
      await promptBuilder.generatePhrases(promptResult);
      
      expect(promptBuilder.generatedCount).toBe(initialCount + 3);
    });

    test('should generate category-appropriate phrases', async () => {
      const categories = ['pop_culture', 'food', 'sports'];
      
      for (const category of categories) {
        const promptResult = promptBuilder.buildPrompt({ category, count: 3 });
        const result = await promptBuilder.generatePhrases(promptResult);
        
        expect(result.phrases).toHaveLength(3);
        // In the simulation, phrases should match the category
        const hasExpectedPhrases = result.phrases.some(phrase => {
          if (category === 'pop_culture') return ['taylor swift', 'netflix series', 'instagram story'].includes(phrase);
          if (category === 'food') return ['pizza delivery', 'coffee shop', 'sushi restaurant'].includes(phrase);
          if (category === 'sports') return ['basketball court', 'super bowl', 'tennis match'].includes(phrase);
          return true;
        });
        expect(hasExpectedPhrases).toBe(true);
      }
    });
  });

  describe('Statistics and Monitoring', () => {
    test('should provide comprehensive stats', () => {
      const stats = promptBuilder.getStats();
      
      expect(stats).toHaveProperty('service', 'llm_prompt_builder');
      expect(stats).toHaveProperty('version', '1.0.0');
      expect(stats).toHaveProperty('capabilities');
      expect(stats).toHaveProperty('optimization_features');
      expect(stats).toHaveProperty('generated_count');
      
      expect(stats.capabilities.categories).toBe(4); // pop_culture, food, sports, general
      expect(stats.capabilities.quality_targets).toBe(3); // excellent, good, acceptable
      expect(stats.capabilities.scoring_integration).toBe(4); // distinctiveness, describability, legacy, cultural
      expect(stats.capabilities.batch_max_size).toBe(50);
    });

    test('should track generation statistics', async () => {
      const initialStats = promptBuilder.getStats();
      const initialCount = initialStats.generated_count;
      
      const promptResult = promptBuilder.buildPrompt({ count: 5 });
      await promptBuilder.generatePhrases(promptResult);
      
      const finalStats = promptBuilder.getStats();
      expect(finalStats.generated_count).toBe(initialCount + 5);
    });
  });

  describe('Prompt Optimization Features', () => {
    test('should include all scoring component insights', () => {
      const result = promptBuilder.buildPrompt();
      
      // Check that prompt includes insights from all scoring components
      expect(result.prompt).toContain('DISTINCTIVENESS');
      expect(result.prompt).toContain('DESCRIBABILITY');
      expect(result.prompt).toContain('WORD SIMPLICITY & LENGTH');
      expect(result.prompt).toContain('CULTURAL RELEVANCE');
      
      // Check specific optimization guidelines
      expect(result.prompt).toContain('unique, specific descriptions');
      expect(result.prompt).toContain('concrete, tangible, visual concepts');
      expect(result.prompt).toContain('2-4 words');
      expect(result.prompt).toContain('popular culture references');
    });

    test('should provide quality examples with scoring breakdown', () => {
      const result = promptBuilder.buildPrompt();
      
      expect(result.prompt).toContain('QUALITY EXAMPLES');
      expect(result.prompt).toContain('taylor swift');
      expect(result.prompt).toContain('~73 points');
      expect(result.prompt).toContain('pizza delivery');
      expect(result.prompt).toContain('~80 points');
      
      // Should show component scoring breakdown
      expect(result.prompt).toContain('Cultural:');
      expect(result.prompt).toContain('Legacy:');
      expect(result.prompt).toContain('Desc:');
      expect(result.prompt).toContain('Dist:');
    });

    test('should optimize prompts for different quality targets', () => {
      const excellentPrompt = promptBuilder.buildPrompt({ quality_target: 'excellent' });
      const goodPrompt = promptBuilder.buildPrompt({ quality_target: 'good' });
      
      expect(excellentPrompt.prompt).toContain('perfect scores across all components');
      expect(excellentPrompt.prompt).toContain('maximum cultural relevance');
      
      expect(goodPrompt.prompt).toContain('strong performance across most');
      expect(goodPrompt.prompt).toContain('good cultural relevance');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle invalid category gracefully', () => {
      const result = promptBuilder.buildPrompt({ category: 'invalid_category' });
      
      // Should fall back to general template
      expect(result.metadata.template_used).toBe('general');
      expect(result.prompt).toContain('GENERAL HIGH-QUALITY PHRASES');
    });

    test('should handle empty or null parameters', () => {
      const result1 = promptBuilder.buildPrompt({ additional_constraints: null });
      const result2 = promptBuilder.buildPrompt({ previous_phrases: undefined });
      
      expect(result1.metadata.constraints_count).toBe(0);
      expect(result2.metadata.diversity_context).toBe(0);
    });

    test('should limit previous phrases in diversity context', () => {
      const manyPhrases = Array(20).fill().map((_, i) => `phrase ${i}`);
      const result = promptBuilder.buildPrompt({ previous_phrases: manyPhrases });
      
      // Should only include first 10 phrases
      expect(result.prompt).toContain('phrase 0');
      expect(result.prompt).toContain('phrase 9');
      expect(result.prompt).not.toContain('phrase 15');
    });
  });

  describe('Integration with Scoring System', () => {
    test('should include scoring insights for distinctiveness optimization', () => {
      const insights = promptBuilder.SCORING_INSIGHTS.distinctiveness;
      
      expect(insights.avoid).toContain('overly common phrases that appear in many contexts');
      expect(insights.avoid).toContain('generic descriptions that could apply to multiple things');
      expect(insights.target).toContain('unique, specific descriptions that clearly identify one concept');
      expect(insights.target).toContain('phrases with uncommon but recognizable word combinations');
    });

    test('should include scoring insights for describability optimization', () => {
      const insights = promptBuilder.SCORING_INSIGHTS.describability;
      
      expect(insights.prefer).toContain('concrete, tangible objects and concepts (concreteness ≥4.0)');
      expect(insights.prefer).toContain('proper nouns for people, organizations, places (PERSON/ORG/GPE)');
      expect(insights.avoid).toContain('abstract concepts with low concreteness (<3.0)');
      expect(insights.avoid).toContain('weak-head noun patterns (e.g., "type of X", "kind of Y")');
    });

    test('should include scoring insights for legacy heuristics optimization', () => {
      const insights = promptBuilder.SCORING_INSIGHTS.legacy;
      
      expect(insights.word_simplicity).toContain('use common, high-frequency words when possible');
      expect(insights.length_optimization).toContain('target 2-4 words for optimal length bonus (5 points)');
      expect(insights.length_optimization).toContain('3 words is ideal for maximum length score');
    });

    test('should include scoring insights for cultural validation optimization', () => {
      const insights = promptBuilder.SCORING_INSIGHTS.cultural;
      
      expect(insights.category_targeting).toContain('pop-culture: celebrities, entertainment, music, social media (10 points)');
      expect(insights.category_targeting).toContain('food: dishes, restaurants, food culture (10 points)');
      expect(insights.popularity_optimization).toContain('focus on trending, viral, or widely recognized cultural elements');
    });
  });
}); 