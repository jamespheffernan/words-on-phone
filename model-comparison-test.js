/**
 * Model Comparison Test Script
 * 
 * Tests phrase generation quality across different AI models and providers:
 * - OpenAI: GPT-4o, GPT-4o-mini  
 * - Google: Gemini-2.5-flash, Gemini-1.5-pro
 * 
 * Uses the same PhraseMachine prompt and scoring pipeline for fair comparison.
 */

const fs = require('fs');
const path = require('path');

// Helper function to generate UUIDs
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// The PhraseMachine prompt from the OpenAI function
const PHRASE_MACHINE_PROMPT = `You are PhraseMachine, an expert generator of party game phrases for "Words on Phone" - a charades-style game where players act out, draw, or describe phrases for their team to guess.

# GAME CONTEXT
- Players have 60 seconds to get their team to guess as many phrases as possible
- Phrases must be ACTABLE (can be mimed/gestured), DRAWABLE (can be sketched), or DESCRIBABLE (can be explained without saying the words)
- Good phrases are instantly recognizable when acted out or described
- Players range from teens to adults at parties, family gatherings, game nights

# QUALITY CRITERIA
✅ GOOD EXAMPLES:
- "Pizza Delivery" (easy to act out - pretend to drive, carry box, ring doorbell)
- "Taylor Swift" (widely known, easy to describe/act)
- "Brushing Teeth" (clear physical action)
- "Harry Potter" (universally recognized, easy to describe)

❌ BAD EXAMPLES:
- "Quantum Physics" (too technical, hard to act)
- "Municipal Governance" (boring, not party-friendly)
- "Existential Dread" (abstract, not fun)
- "Obscure 1970s Band" (too niche)

# CONTENT RULES

1. **Party Game Suitability**: Every phrase must pass the test "Could a teenager easily act this out at a party?"

2. **Instant Recognition**: Must be recognizable to 80%+ of people - prioritize pop culture, common activities, famous people/places

3. **Actability**: Phrases should have clear physical actions, visual elements, or be easily describable

4. **Length**: 2-4 words maximum (shorter = better for gameplay)

5. **Family-Friendly**: No profanity, politics, or adult themes

6. **Category Match**: If a topic is specified, ensure each phrase clearly belongs to that category

7. **Avoid Technical Terms**: No academic, scientific, or overly specialized language

8. **Cultural Relevance**: Prioritize current, well-known references over obscure ones

# JSON SCHEMA

**Response Object:**
- \`phrases\`: CustomTerm[] - Array with 1–100 items per call.

**Interface CustomTerm:**
- \`id\`: string - echo back the client-supplied UUID unchanged.
- \`topic?\`: string - OPTIONAL; echo verbatim if a topic/theme/category name was provided in the request.
- \`phrase\`: string - 2–4 English words, Title-case where appropriate.
- \`difficulty?\`: "easy" | "medium" | "hard" - OPTIONAL; provide the model's best guess.

# OUTPUT FORMAT

Return a JSON object with a "phrases" array containing CustomTerm objects. No markdown fences, extra keys, or commentary.

Example successful response:
\`\`\`json
{
  "phrases": [
    {"id": "uuid1", "phrase": "Pizza Delivery", "topic": "Jobs", "difficulty": "easy"},
    {"id": "uuid2", "phrase": "Taylor Swift", "topic": "Music", "difficulty": "easy"}
  ]
}
\`\`\`

# FAILURE HANDLING

If unable to satisfy the constraints, respond with:
\`{ "error": "<short reason>" }\`

# QUALITY REMINDER
Every phrase must be perfect for a party game - instantly recognizable, easily actable, and fun to guess!`;

// Test configuration
const TEST_CATEGORIES = [
  { topic: 'Movies & TV', batchSize: 10 },
  { topic: 'Music', batchSize: 10 },
  { topic: 'Food & Drink', batchSize: 10 }
];

const OPENAI_MODELS = [
  { name: 'GPT-4o', model: 'gpt-4o' },
  { name: 'GPT-4o-mini', model: 'gpt-4o-mini' }
];

const GEMINI_MODELS = [
  { name: 'Gemini-2.5-Flash', model: 'gemini-2.0-flash-exp' },
  { name: 'Gemini-1.5-Pro', model: 'gemini-1.5-pro-002' }
];

// Load PhraseScorer from the database tools
const PhraseScorer = require('./tools/phrase-database/src/phraseScorer');

class ModelComparison {
  constructor() {
    this.scorer = new PhraseScorer();
    this.results = [];
    this.functionUrls = {
      openai: process.env.OPENAI_FUNCTION_URL || 'http://localhost:8888/.netlify/functions/openai',
      gemini: process.env.GEMINI_FUNCTION_URL || 'http://localhost:8888/.netlify/functions/gemini'
    };
  }

  /**
   * Call OpenAI function with specific model
   */
  async callOpenAI(model, topic, batchSize, phraseIds) {
    const requestBody = {
      topic,
      batchSize,
      phraseIds
    };

    // For testing different models, we'll modify the request to include model preference
    // In production, you'd modify the OpenAI function to accept model parameter
    console.log(`🤖 Calling OpenAI ${model} for ${topic}...`);

    const response = await fetch(this.functionUrls.openai, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`OpenAI error: ${data.error}`);
    }

    return data;
  }

  /**
   * Call Gemini function with specific model
   */
  async callGemini(model, topic, batchSize, phraseIds) {
    // Format prompt for Gemini
    let userMessage = `Generate exactly ${batchSize} phrases.`;
    if (topic) {
      userMessage += ` Topic: "${topic}". All phrases must clearly relate to this topic.`;
    }
    userMessage += `\n\nUse these exact IDs in order:\n${phraseIds.map((id, i) => `${i + 1}. ${id}`).join('\n')}`;

    const fullPrompt = PHRASE_MACHINE_PROMPT + '\n\n' + userMessage;

    console.log(`🤖 Calling Gemini ${model} for ${topic}...`);

    // Set the model in environment variable for the Gemini function
    process.env.GEMINI_MODEL = model;

    const response = await fetch(this.functionUrls.gemini, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: fullPrompt,
        category: topic
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Gemini error: ${data.error}`);
    }

    // Parse Gemini response - it returns in different format
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      throw new Error('No content in Gemini response');
    }

    // Parse JSON from the text response
    let parsedContent;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      parsedContent = JSON.parse(jsonStr);
    } catch (error) {
      throw new Error(`Failed to parse Gemini JSON response: ${error.message}`);
    }

    return parsedContent.phrases || [];
  }

  /**
   * Score a batch of phrases
   */
  async scoreBatch(phrases, topic, modelInfo) {
    const scores = [];
    
    for (const phrase of phrases) {
      try {
        const phraseText = typeof phrase === 'string' ? phrase : phrase.phrase;
        const result = await this.scorer.scorePhrase(phraseText, topic, { skipReddit: true });
        
        scores.push({
          phrase: phraseText,
          score: result.totalScore,
          verdict: result.verdict,
          breakdown: result.breakdown
        });
        
        console.log(`  "${phraseText}": ${result.totalScore} points (${result.verdict})`);
      } catch (error) {
        console.error(`  Failed to score "${phrase}": ${error.message}`);
        scores.push({
          phrase: typeof phrase === 'string' ? phrase : phrase.phrase,
          score: 0,
          verdict: 'ERROR',
          error: error.message
        });
      }
    }

    return scores;
  }

  /**
   * Test a specific model and provider
   */
  async testModel(provider, modelConfig, testCategory) {
    const { topic, batchSize } = testCategory;
    const { name: modelName, model } = modelConfig;
    
    console.log(`\n🧪 Testing ${provider} ${modelName} - ${topic} (${batchSize} phrases)`);
    console.log('='.repeat(60));

    const phraseIds = Array(batchSize).fill(null).map(() => generateUUID());
    const startTime = Date.now();

    try {
      // Generate phrases
      let phrases;
      if (provider === 'OpenAI') {
        phrases = await this.callOpenAI(model, topic, batchSize, phraseIds);
      } else if (provider === 'Gemini') {
        phrases = await this.callGemini(model, topic, batchSize, phraseIds);
      }

      const generationTime = Date.now() - startTime;
      console.log(`📝 Generated ${phrases.length} phrases in ${generationTime}ms`);

      if (phrases.length === 0) {
        throw new Error('No phrases generated');
      }

      // Score phrases
      console.log(`📊 Scoring phrases...`);
      const scoreStartTime = Date.now();
      const scores = await this.scoreBatch(phrases, topic, { provider, model: modelName });
      const scoringTime = Date.now() - scoreStartTime;

      // Calculate metrics
      const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
      const averageScore = totalScore / scores.length;
      const highQuality = scores.filter(s => s.score >= 60).length;
      const mediumQuality = scores.filter(s => s.score >= 40 && s.score < 60).length;
      const lowQuality = scores.filter(s => s.score < 40).length;
      const highQualityPercentage = (highQuality / scores.length) * 100;

      const result = {
        provider,
        model: modelName,
        modelId: model,
        topic,
        batchSize,
        timestamp: new Date().toISOString(),
        generationTime,
        scoringTime,
        totalTime: generationTime + scoringTime,
        phrases: scores,
        metrics: {
          totalGenerated: scores.length,
          averageScore: Math.round(averageScore * 10) / 10,
          highQuality,
          mediumQuality,
          lowQuality,
          highQualityPercentage: Math.round(highQualityPercentage * 10) / 10,
          topScore: Math.max(...scores.map(s => s.score)),
          bottomScore: Math.min(...scores.map(s => s.score))
        }
      };

      console.log(`📈 Results: ${averageScore.toFixed(1)} avg, ${highQuality}/${scores.length} high quality (${highQualityPercentage.toFixed(1)}%)`);
      
      this.results.push(result);
      return result;

    } catch (error) {
      console.error(`❌ Test failed: ${error.message}`);
      
      const failureResult = {
        provider,
        model: modelName,
        modelId: model,
        topic,
        error: error.message,
        timestamp: new Date().toISOString(),
        success: false
      };
      
      this.results.push(failureResult);
      return failureResult;
    }
  }

  /**
   * Run comprehensive comparison across all models and categories
   */
  async runComparison() {
    console.log('🚀 Starting Model Comparison Test');
    console.log(`Testing ${OPENAI_MODELS.length} OpenAI models + ${GEMINI_MODELS.length} Gemini models`);
    console.log(`Across ${TEST_CATEGORIES.length} categories`);
    console.log('Using the same PhraseMachine prompt and scoring pipeline\n');

    const startTime = Date.now();

    // Test all combinations
    for (const category of TEST_CATEGORIES) {
      for (const openaiModel of OPENAI_MODELS) {
        await this.testModel('OpenAI', openaiModel, category);
        // Brief pause between tests to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      for (const geminiModel of GEMINI_MODELS) {
        await this.testModel('Gemini', geminiModel, category);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    const totalTime = Date.now() - startTime;
    
    console.log('\n🎯 COMPARISON COMPLETE');
    console.log('='.repeat(60));
    console.log(`Total test time: ${(totalTime / 1000).toFixed(1)}s`);
    
    this.analyzeResults();
    this.saveResults();
  }

  /**
   * Analyze and display comparison results
   */
  analyzeResults() {
    const successfulResults = this.results.filter(r => r.success !== false);
    
    if (successfulResults.length === 0) {
      console.log('❌ No successful results to analyze');
      return;
    }

    console.log('\n📊 ANALYSIS SUMMARY');
    console.log('='.repeat(60));

    // Overall statistics
    const totalPhrases = successfulResults.reduce((sum, r) => sum + r.batchSize, 0);
    const overallAverage = successfulResults.reduce((sum, r) => sum + r.metrics.averageScore, 0) / successfulResults.length;
    
    console.log(`Total phrases generated: ${totalPhrases}`);
    console.log(`Overall average score: ${overallAverage.toFixed(1)}`);

    // Provider comparison
    console.log('\n🏆 BY PROVIDER:');
    const providers = {};
    successfulResults.forEach(result => {
      if (!providers[result.provider]) {
        providers[result.provider] = {
          tests: 0,
          totalScore: 0,
          totalPhrases: 0,
          highQuality: 0,
          avgTime: 0
        };
      }
      
      const p = providers[result.provider];
      p.tests++;
      p.totalScore += result.metrics.averageScore;
      p.totalPhrases += result.batchSize;
      p.highQuality += result.metrics.highQuality;
      p.avgTime += result.totalTime;
    });

    Object.entries(providers).forEach(([provider, stats]) => {
      const avgScore = stats.totalScore / stats.tests;
      const highQualityPercentage = (stats.highQuality / stats.totalPhrases) * 100;
      const avgTime = stats.avgTime / stats.tests;
      
      console.log(`  ${provider}:`);
      console.log(`    Average Score: ${avgScore.toFixed(1)}`);
      console.log(`    High Quality: ${stats.highQuality}/${stats.totalPhrases} (${highQualityPercentage.toFixed(1)}%)`);
      console.log(`    Average Time: ${avgTime.toFixed(0)}ms`);
    });

    // Model comparison
    console.log('\n🤖 BY MODEL:');
    successfulResults.forEach(result => {
      const { provider, model, metrics, totalTime } = result;
      console.log(`  ${provider} ${model}:`);
      console.log(`    Score: ${metrics.averageScore} (${metrics.highQualityPercentage}% high quality)`);
      console.log(`    Range: ${metrics.bottomScore}-${metrics.topScore}`);
      console.log(`    Time: ${totalTime}ms`);
    });

    // Category performance
    console.log('\n📂 BY CATEGORY:');
    const categories = {};
    successfulResults.forEach(result => {
      if (!categories[result.topic]) {
        categories[result.topic] = [];
      }
      categories[result.topic].push(result);
    });

    Object.entries(categories).forEach(([category, results]) => {
      const avgScore = results.reduce((sum, r) => sum + r.metrics.averageScore, 0) / results.length;
      const totalHighQuality = results.reduce((sum, r) => sum + r.metrics.highQuality, 0);
      const totalPhrases = results.reduce((sum, r) => sum + r.batchSize, 0);
      const highQualityPercentage = (totalHighQuality / totalPhrases) * 100;
      
      console.log(`  ${category}:`);
      console.log(`    Average Score: ${avgScore.toFixed(1)}`);
      console.log(`    High Quality: ${totalHighQuality}/${totalPhrases} (${highQualityPercentage.toFixed(1)}%)`);
    });

    // Best performing combinations
    console.log('\n🥇 TOP PERFORMERS:');
    const sortedResults = successfulResults
      .sort((a, b) => b.metrics.averageScore - a.metrics.averageScore)
      .slice(0, 5);

    sortedResults.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.provider} ${result.model} - ${result.topic}: ${result.metrics.averageScore} avg (${result.metrics.highQualityPercentage}% high quality)`);
    });

    // Sample top-scoring phrases
    console.log('\n🌟 SAMPLE TOP-SCORING PHRASES:');
    const allPhrases = successfulResults
      .flatMap(r => r.phrases)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    allPhrases.forEach((phrase, index) => {
      console.log(`  ${index + 1}. "${phrase.phrase}" - ${phrase.score} points (${phrase.verdict})`);
    });
  }

  /**
   * Save results to JSON file
   */
  saveResults() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `model-comparison-results-${timestamp}.json`;
    
    const output = {
      testInfo: {
        timestamp: new Date().toISOString(),
        testCategories: TEST_CATEGORIES,
        openaiModels: OPENAI_MODELS,
        geminiModels: GEMINI_MODELS,
        totalTests: this.results.length
      },
      results: this.results
    };

    fs.writeFileSync(filename, JSON.stringify(output, null, 2));
    console.log(`\n💾 Results saved to: ${filename}`);
  }
}

// Run the comparison if this script is executed directly
if (require.main === module) {
  const comparison = new ModelComparison();
  
  comparison.runComparison()
    .then(() => {
      console.log('\n✅ Model comparison completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Model comparison failed:', error);
      process.exit(1);
    });
}

module.exports = { ModelComparison };