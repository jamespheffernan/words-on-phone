/**
 * LLMPromptBuilder - Enhanced prompt engineering for optimized phrase generation
 * Incorporates insights from all scoring components to generate high-quality prompts
 * 
 * Features:
 * - Scoring-optimized prompt templates targeting 60+ points (good/excellent quality)
 * - Category-specific generation for pop-culture, food, sports
 * - Batch generation with diversity controls and deduplication
 * - Quality feedback integration for iterative improvement
 */
class LLMPromptBuilder {
  constructor(options = {}) {
    this.generatedCount = 0;
    
    // Quality optimization targets based on DecisionEngine scoring
    this.QUALITY_TARGETS = {
      EXCELLENT_MIN: 80,      // Target excellent phrases (80-100 points)
      GOOD_MIN: 60,           // Target good phrases (60-79 points)
      ACCEPTABLE_MIN: 40      // Minimum acceptable threshold
    };
    
    // Scoring component insights for prompt optimization
    this.SCORING_INSIGHTS = {
      // Distinctiveness optimization (25% weight, 0-25 points)
      distinctiveness: {
        avoid: [
          'overly common phrases that appear in many contexts',
          'generic descriptions that could apply to multiple things',
          'phrases with high PMI correlation indicating common collocations',
          'exact matches with Wikipedia article titles or popular search terms'
        ],
        target: [
          'unique, specific descriptions that clearly identify one concept',
          'phrases with uncommon but recognizable word combinations',
          'specific details that distinguish from similar concepts',
          'creative but accurate descriptive approaches'
        ]
      },
      
      // Describability optimization (30% weight, 0-25 points) 
      describability: {
        prefer: [
          'concrete, tangible objects and concepts (concreteness ≥4.0)',
          'visual, physical things people can easily picture',
          'proper nouns for people, organizations, places (PERSON/ORG/GPE)',
          'specific named entities with clear visual associations'
        ],
        avoid: [
          'abstract concepts with low concreteness (<3.0)',
          'weak-head noun patterns (e.g., "type of X", "kind of Y")',
          'overly theoretical or philosophical concepts',
          'complex technical terms without clear physical referents'
        ]
      },
      
      // Legacy heuristics optimization (25% weight, 0-30 points)
      legacy: {
        word_simplicity: [
          'use common, high-frequency words when possible',
          'prefer tier 1-2 vocabulary (most/very common words)',
          'avoid unnecessarily complex or technical terminology',
          'balance simplicity with specificity and accuracy'
        ],
        length_optimization: [
          'target 2-4 words for optimal length bonus (5 points)',
          '3 words is ideal for maximum length score',
          'avoid single words (length penalty) and overly long phrases (5+ words)',
          'ensure each word contributes meaningfully to identification'
        ]
      },
      
      // Cultural validation optimization (20% weight, 0-20+ points)
      cultural: {
        category_targeting: [
          'pop-culture: celebrities, entertainment, music, social media (10 points)',
          'food: dishes, restaurants, food culture (10 points)', 
          'sports: sports types, leagues, sports culture (10 points)',
          'target exact matches with cultural reference lists when appropriate'
        ],
        popularity_optimization: [
          'prioritize concepts with high Reddit/social media popularity',
          'focus on trending, viral, or widely recognized cultural elements',
          'include major brands, celebrities, and popular culture references',
          'balance popularity with distinctiveness to avoid over-saturation'
        ]
      }
    };
    
    // Base prompt template optimized for scoring system
    this.BASE_PROMPT_TEMPLATE = `You are an expert at creating phrases for a party game where players describe things in 60 seconds for others to guess.

CRITICAL SUCCESS CRITERIA - Generate phrases that score 60+ points (good/excellent quality):

DISTINCTIVENESS (25% weight, target 15+ points):
- Create unique, specific descriptions that clearly identify ONE concept
- Avoid overly common phrases or generic descriptions
- Use uncommon but recognizable word combinations
- Ensure phrases are specific enough to distinguish from similar concepts

DESCRIBABILITY (30% weight, target 15+ points): 
- Focus on concrete, tangible, visual concepts (physical objects, people, places)
- Include proper nouns when appropriate (celebrities, brands, locations)
- Avoid abstract concepts, theoretical ideas, or "type of X" patterns
- Choose things people can easily picture and describe

WORD SIMPLICITY & LENGTH (25% weight, target 20+ points):
- Use common, everyday vocabulary that players know well
- Target exactly 2-4 words (3 is optimal for maximum points)
- Avoid technical jargon or overly complex terms
- Every word should contribute meaningfully to identification

CULTURAL RELEVANCE (20% weight, target 12+ points):
- Include popular culture references (celebrities, entertainment, music, social media)
- Add food-related concepts (dishes, restaurants, food culture)
- Include sports references (sports types, leagues, sports culture)
- Focus on widely recognized, trending, or viral cultural elements

QUALITY EXAMPLES (target scoring):
✅ "taylor swift" - Celebrity (Cultural: 10), Simple words (Legacy: 25), Concrete person (Desc: 20), Specific (Dist: 18) = ~73 points
✅ "pizza delivery" - Food culture (Cultural: 15), Simple/optimal length (Legacy: 28), Very concrete (Desc: 22), Specific service (Dist: 15) = ~80 points  
✅ "coffee shop" - Food place (Cultural: 12), Simple/optimal (Legacy: 26), Concrete place (Desc: 20), Specific business (Dist: 16) = ~74 points

Generate phrases that will score in the GOOD (60-79) to EXCELLENT (80-100) range.`;

    // Category-specific prompt templates
    this.CATEGORY_TEMPLATES = {
      pop_culture: `${this.BASE_PROMPT_TEMPLATE}

FOCUS: POP-CULTURE CATEGORY (Target +10 cultural points)
Generate phrases about:
- Celebrities, actors, musicians, social media personalities
- Movies, TV shows, streaming content, entertainment franchises  
- Social media platforms, viral trends, internet culture
- Music artists, albums, concerts, music festivals
- Entertainment industry, awards shows, popular media

Examples: "netflix series", "instagram story", "grammy awards", "marvel movie", "tiktok dance"`,

      food: `${this.BASE_PROMPT_TEMPLATE}

FOCUS: FOOD CATEGORY (Target +10 cultural points)
Generate phrases about:
- Popular dishes, cuisines, food items, beverages
- Restaurants, food chains, dining experiences
- Food culture, cooking shows, food trends
- Kitchen equipment, cooking methods, food preparation
- Food delivery, dining out, food experiences

Examples: "sushi restaurant", "food truck", "ice cream", "cooking show", "pizza slice"`,

      sports: `${this.BASE_PROMPT_TEMPLATE}

FOCUS: SPORTS CATEGORY (Target +10 cultural points)  
Generate phrases about:
- Major sports, athletic activities, recreational games
- Sports leagues, teams, sporting events, tournaments
- Sports equipment, venues, training activities
- Athletes, coaches, sports personalities
- Sports culture, fan activities, sports media

Examples: "basketball court", "super bowl", "tennis match", "sports bar", "olympic games"`,

      general: `${this.BASE_PROMPT_TEMPLATE}

FOCUS: GENERAL HIGH-QUALITY PHRASES
Generate diverse, high-scoring phrases across all categories:
- Prioritize concrete, visual, recognizable concepts
- Balance cultural relevance with distinctiveness  
- Ensure optimal word count and vocabulary simplicity
- Target concepts that are easy to describe but specific enough to identify

Examples: "movie theater", "grocery store", "cell phone", "birthday party", "school bus"`
    };
    
    // Batch generation parameters
    this.BATCH_GENERATION = {
      MAX_BATCH_SIZE: 50,           // Maximum phrases per generation request
      DIVERSITY_THRESHOLD: 0.7,     // Minimum uniqueness score for inclusion
      DEDUPLICATION_ENABLED: true,  // Remove similar/duplicate phrases
      QUALITY_FILTERING: true       // Pre-filter for likely high-scoring phrases
    };
  }

  /**
   * Build optimized prompt for phrase generation
   */
  buildPrompt(options = {}) {
    const {
      category = 'general',
      count = 10,
      quality_target = 'good',
      additional_constraints = [],
      previous_phrases = []
    } = options;
    
    // Get base template for category
    let prompt = this.CATEGORY_TEMPLATES[category] || this.CATEGORY_TEMPLATES.general;
    
    // Add quality target specifications
    if (quality_target === 'excellent') {
      prompt += `\n\nQUALITY TARGET: EXCELLENT (80-100 points)
- Aim for perfect scores across all components
- Maximum cultural relevance with exact category matches
- Optimal distinctiveness with unique but recognizable concepts
- Perfect describability with highly concrete, visual concepts
- Ideal word simplicity and 3-word length for maximum legacy points`;
    } else if (quality_target === 'good') {
      prompt += `\n\nQUALITY TARGET: GOOD (60-79 points)
- Strong performance across most scoring components
- Good cultural relevance with category alignment
- Clear distinctiveness with specific concepts
- High describability with concrete, tangible subjects
- Simple vocabulary with optimal 2-4 word length`;
    }
    
    // Add diversity constraints if previous phrases provided
    if (previous_phrases.length > 0) {
      prompt += `\n\nDIVERSITY REQUIREMENTS:
- Generate phrases that are clearly different from these existing phrases: ${previous_phrases.slice(0, 10).join(', ')}
- Avoid similar concepts, word patterns, or thematic overlap
- Ensure semantic diversity across different domains and concepts`;
    }
    
    // Add any additional constraints
    if (additional_constraints.length > 0) {
      prompt += `\n\nADDITIONAL CONSTRAINTS:
${additional_constraints.map(constraint => `- ${constraint}`).join('\n')}`;
    }
    
    // Add generation instructions
    prompt += `\n\nGENERATION TASK:
Generate exactly ${count} phrases that meet all criteria above.
Format: Return only the phrases, one per line, no numbering or additional text.
Quality: Each phrase should target ${quality_target} quality (${this.QUALITY_TARGETS[quality_target.toUpperCase() + '_MIN'] || 60}+ points).
Diversity: Ensure all phrases are semantically distinct and cover different concepts.`;
    
    return {
      prompt,
      metadata: {
        category,
        count,
        quality_target,
        template_used: category,
        constraints_count: additional_constraints.length,
        diversity_context: previous_phrases.length,
        estimated_tokens: Math.ceil(prompt.length / 4) // Rough token estimate
      }
    };
  }

  /**
   * Build batch generation prompt for multiple diverse phrases
   */
  buildBatchPrompt(options = {}) {
    const {
      total_count = 20,
      categories = ['general'],
      quality_distribution = { excellent: 0.3, good: 0.7 },
      diversity_level = 'high'
    } = options;
    
    if (total_count > this.BATCH_GENERATION.MAX_BATCH_SIZE) {
      throw new Error(`Batch size ${total_count} exceeds maximum of ${this.BATCH_GENERATION.MAX_BATCH_SIZE}`);
    }
    
    // Calculate distribution across categories and quality levels
    const phrasesPerCategory = Math.ceil(total_count / categories.length);
    const excellentCount = Math.floor(total_count * quality_distribution.excellent);
    const goodCount = total_count - excellentCount;
    
    let prompt = `${this.BASE_PROMPT_TEMPLATE}

BATCH GENERATION TASK:
Generate ${total_count} high-quality phrases with maximum diversity.

DISTRIBUTION REQUIREMENTS:
- ${excellentCount} EXCELLENT phrases (80-100 points): Perfect across all scoring dimensions
- ${goodCount} GOOD phrases (60-79 points): Strong performance across most dimensions

CATEGORY DISTRIBUTION:
${categories.map(cat => `- ${phrasesPerCategory} phrases from ${cat.toUpperCase()} category`).join('\n')}

DIVERSITY REQUIREMENTS (${diversity_level} level):
- Cover completely different semantic domains and concepts
- Vary word patterns, structures, and linguistic approaches  
- Include mix of proper nouns, common nouns, compound concepts
- Balance abstract and concrete concepts within describability constraints
- Ensure no thematic clustering or repetitive patterns

QUALITY OPTIMIZATION:
- Distinctiveness: Each phrase should be uniquely identifiable and non-generic
- Describability: Prioritize concrete, visual, tangible concepts
- Legacy: Use simple vocabulary with optimal 2-4 word length (3 words ideal)
- Cultural: Include mix of pop-culture, food, sports, and trending references

OUTPUT FORMAT:
Return exactly ${total_count} phrases, one per line.
No numbering, categories, or additional text.
Each phrase should be ready for immediate game use.`;
    
    return {
      prompt,
      metadata: {
        total_count,
        categories,
        quality_distribution,
        diversity_level,
        estimated_tokens: Math.ceil(prompt.length / 4),
        batch_parameters: {
          phrases_per_category: phrasesPerCategory,
          excellent_target: excellentCount,
          good_target: goodCount
        }
      }
    };
  }

  /**
   * Build feedback-optimized prompt based on previous generation results
   */
  buildFeedbackPrompt(feedback_data, options = {}) {
    const {
      target_improvements = [],
      avoid_patterns = [],
      successful_examples = [],
      failed_examples = []
    } = feedback_data;
    
    const {
      count = 10,
      category = 'general'
    } = options;
    
    let prompt = this.CATEGORY_TEMPLATES[category];
    
    // Add feedback-based optimization
    prompt += `\n\nFEEDBACK-BASED OPTIMIZATION:`;
    
    if (successful_examples.length > 0) {
      prompt += `\n\nSUCCESSFUL PATTERNS (emulate these):
${successful_examples.map(ex => `✅ "${ex.phrase}" (${ex.score} points) - ${ex.success_factors?.join(', ') || 'high quality'}`).join('\n')}`;
    }
    
    if (failed_examples.length > 0) {
      prompt += `\n\nPATTERNS TO AVOID (these scored poorly):
${failed_examples.map(ex => `❌ "${ex.phrase}" (${ex.score} points) - Issues: ${ex.failure_reasons?.join(', ') || 'low quality'}`).join('\n')}`;
    }
    
    if (target_improvements.length > 0) {
      prompt += `\n\nTARGET IMPROVEMENTS:
${target_improvements.map(improvement => `- ${improvement}`).join('\n')}`;
    }
    
    if (avoid_patterns.length > 0) {
      prompt += `\n\nAVOID THESE PATTERNS:
${avoid_patterns.map(pattern => `- ${pattern}`).join('\n')}`;
    }
    
    prompt += `\n\nGENERATION TASK:
Generate ${count} phrases incorporating the feedback above.
Focus on patterns that succeeded and avoid patterns that failed.
Target score: 70+ points (good to excellent quality).`;
    
    return {
      prompt,
      metadata: {
        count,
        category,
        feedback_incorporated: {
          successful_examples: successful_examples.length,
          failed_examples: failed_examples.length,
          target_improvements: target_improvements.length,
          avoid_patterns: avoid_patterns.length
        },
        estimated_tokens: Math.ceil(prompt.length / 4)
      }
    };
  }

  /**
   * Generate phrases using OpenAI GPT with optimized prompts
   */
  async generatePhrases(prompt_result, llm_options = {}) {
    const {
      model = 'gpt-4',
      temperature = 0.7,
      max_tokens = 1000,
      top_p = 0.9
    } = llm_options;
    
    console.log(`🤖 Generating phrases with ${model}...`);
    console.log(`📝 Prompt tokens: ~${prompt_result.metadata.estimated_tokens}`);
    
    // In a real implementation, this would call the OpenAI API
    // For now, we'll simulate the generation process
    const simulatedResponse = await this.simulateGeneration(prompt_result);
    
    this.generatedCount += simulatedResponse.phrases.length;
    
    return {
      phrases: simulatedResponse.phrases,
      generation_metadata: {
        model,
        temperature,
        max_tokens,
        prompt_tokens: prompt_result.metadata.estimated_tokens,
        completion_tokens: simulatedResponse.completion_tokens,
        total_tokens: prompt_result.metadata.estimated_tokens + simulatedResponse.completion_tokens,
        generation_time_ms: simulatedResponse.generation_time_ms
      },
      prompt_metadata: prompt_result.metadata
    };
  }

  /**
   * Simulate phrase generation for testing (replace with actual OpenAI API call)
   */
  async simulateGeneration(prompt_result) {
    const startTime = Date.now();
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    
    const { category, count } = prompt_result.metadata;
    
    // Generate sample phrases based on category and scoring optimization
    const samplePhrases = {
      pop_culture: [
        'taylor swift', 'netflix series', 'instagram story', 'tiktok dance', 'marvel movie',
        'grammy awards', 'youtube channel', 'spotify playlist', 'disney movie', 'reality show'
      ],
      food: [
        'pizza delivery', 'coffee shop', 'sushi restaurant', 'ice cream', 'food truck',
        'cooking show', 'burger king', 'pasta dish', 'taco bell', 'chocolate cake'
      ],
      sports: [
        'basketball court', 'super bowl', 'tennis match', 'sports bar', 'olympic games',
        'football stadium', 'baseball bat', 'soccer field', 'golf course', 'swimming pool'
      ],
      general: [
        'movie theater', 'grocery store', 'cell phone', 'birthday party', 'school bus',
        'parking lot', 'gas station', 'bank account', 'post office', 'fire truck'
      ]
    };
    
    const categoryPhrases = samplePhrases[category] || samplePhrases.general;
    const selectedPhrases = [];
    
    // Select diverse phrases up to the requested count
    for (let i = 0; i < Math.min(count, categoryPhrases.length); i++) {
      selectedPhrases.push(categoryPhrases[i]);
    }
    
    // If we need more phrases, add variations
    while (selectedPhrases.length < count) {
      const randomPhrase = categoryPhrases[Math.floor(Math.random() * categoryPhrases.length)];
      if (!selectedPhrases.includes(randomPhrase)) {
        selectedPhrases.push(randomPhrase);
      } else {
        // Create a variation
        selectedPhrases.push(`${randomPhrase} variation`);
      }
    }
    
    return {
      phrases: selectedPhrases.slice(0, count),
      completion_tokens: count * 8, // Estimate tokens per phrase
      generation_time_ms: Date.now() - startTime
    };
  }

  /**
   * Get prompt builder statistics
   */
  getStats() {
    return {
      service: 'llm_prompt_builder',
      version: '1.0.0',
      capabilities: {
        categories: Object.keys(this.CATEGORY_TEMPLATES).length,
        quality_targets: Object.keys(this.QUALITY_TARGETS).length,
        scoring_integration: Object.keys(this.SCORING_INSIGHTS).length,
        batch_max_size: this.BATCH_GENERATION.MAX_BATCH_SIZE
      },
      optimization_features: {
        distinctiveness: this.SCORING_INSIGHTS.distinctiveness.target.length,
        describability: this.SCORING_INSIGHTS.describability.prefer.length,
        legacy_heuristics: this.SCORING_INSIGHTS.legacy.word_simplicity.length,
        cultural_validation: this.SCORING_INSIGHTS.cultural.category_targeting.length
      },
      generated_count: this.generatedCount,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = LLMPromptBuilder; 