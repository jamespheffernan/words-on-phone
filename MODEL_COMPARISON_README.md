# AI Model Comparison for Phrase Generation

This tool provides a comprehensive comparison of different AI models for generating high-quality party game phrases using your existing PhraseMachine prompt and scoring pipeline.

## What It Tests

### Models Compared
- **OpenAI Models:**
  - GPT-4o (latest flagship model)
  - GPT-4o-mini (cost-effective alternative)

- **Google Gemini Models:**
  - Gemini-2.0-Flash (fast, latest generation)
  - Gemini-1.5-Pro (high-quality, detailed reasoning)

### Test Categories
- Movies & TV (8 phrases per model)
- Music (8 phrases per model)  
- Food & Drink (8 phrases per model)

**Total: 24 phrases generated per model × 4 models = 96 phrases**

### Evaluation Criteria
Each phrase is scored using your existing quality pipeline with multiple factors:

1. **Local Heuristics (0-40 points)**
   - Word simplicity and common usage
   - Optimal phrase length (2-4 words)
   - Recency indicators for cultural relevance

2. **Wikidata Presence (0-30 points)**
   - Wikipedia article existence across languages
   - Indicates global recognition

3. **Category Relevance (0-15 points)**
   - How well the phrase fits the requested category
   - Pop culture bonus for entertainment categories

4. **Reddit Cultural Validation (0-15 points)**
   - Social media presence and engagement
   - Real-world cultural relevance

**Total Score: 0-100 points**
- 80+ = EXCELLENT (Auto Accept)
- 60-79 = GOOD (Accept)
- 40-59 = BORDERLINE (Manual Review)
- 20-39 = WARNING (Likely Too Obscure)
- <20 = REJECT (Too Technical/Unknown)

## Setup Instructions

### 1. Install Dependencies
```bash
# Install main app dependencies
cd words-on-phone-app && npm install

# Install phrase database tools
cd ../tools/phrase-database && npm install

# Return to workspace root
cd ../../
```

### 2. Configure API Keys
You need API keys for the providers you want to test:

#### OpenAI API Key
1. Visit [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Create a new secret key
3. Set environment variable:
```bash
export OPENAI_API_KEY="your-openai-api-key-here"
```

#### Google Gemini API Key
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Set environment variable:
```bash
export GEMINI_API_KEY="your-gemini-api-key-here"
```

#### Setting Keys Permanently
Add to your `~/.bashrc`, `~/.zshrc`, or equivalent:
```bash
export OPENAI_API_KEY="your-openai-api-key-here"
export GEMINI_API_KEY="your-gemini-api-key-here"
```

### 3. Run the Comparison
```bash
# Run full comparison (requires both API keys)
node direct-model-comparison.js

# Or run with only one provider
OPENAI_API_KEY="your-key" node direct-model-comparison.js  # OpenAI only
GEMINI_API_KEY="your-key" node direct-model-comparison.js  # Gemini only
```

## Expected Output

### During Execution
```
🚀 Starting Direct Model Comparison Test
Testing 2 OpenAI models + 2 Gemini models
Across 3 categories (24 total phrases per model)
Using the same PhraseMachine prompt and scoring pipeline

🧪 Testing OpenAI GPT-4o - Movies & TV (8 phrases)
============================================================
🤖 Calling OpenAI gpt-4o for Movies & TV...
📝 Generated 8 phrases in 2340ms
📊 Scoring phrases...
  "Star Wars": 85 points (EXCELLENT - Auto Accept)
  "Netflix": 78 points (GOOD - Accept)
  "The Office": 82 points (EXCELLENT - Auto Accept)
  ...
📈 Results: 74.2 avg, 6/8 high quality (75.0%)
```

### Final Analysis
The tool provides comprehensive analysis:

1. **Provider Comparison** - Overall performance by company
2. **Model Breakdown** - Detailed results per model
3. **Category Analysis** - How each category performs across models
4. **Top Performers** - Best model/category combinations
5. **Sample Phrases** - Highest-scoring generated phrases

### Sample Analysis Output
```
📊 ANALYSIS SUMMARY
============================================================
Total phrases generated: 96
Overall average score: 71.4

🏆 BY PROVIDER:
  OpenAI:
    Average Score: 73.2
    High Quality: 34/48 (70.8%)
    Average Time: 3240ms
  Gemini:
    Average Score: 69.6
    High Quality: 31/48 (64.6%)
    Average Time: 2890ms

🥇 TOP PERFORMERS:
  1. OpenAI GPT-4o - Music: 76.8 avg (87.5% high quality)
  2. Gemini Gemini-2.0-Flash - Movies & TV: 75.1 avg (75.0% high quality)
  3. OpenAI GPT-4o-mini - Food & Drink: 74.3 avg (75.0% high quality)
```

## Understanding the Results

### What Makes a Good Score?
- **High scores (70+)**: Phrases like "Taylor Swift", "Pizza Delivery", "Star Wars"
- **Medium scores (40-69)**: Recognizable but may be region-specific or slightly technical
- **Low scores (<40)**: Too obscure, technical, or poorly formatted

### Provider Differences
- **OpenAI models** typically excel at:
  - Following JSON format precisely
  - Understanding pop culture references
  - Generating consistently party-game appropriate phrases

- **Gemini models** typically excel at:
  - Creative and diverse phrase selection
  - Cultural relevance across different regions
  - Speed of generation

### Category Performance
- **Movies & TV**: Usually highest scoring (pop culture familiarity)
- **Music**: Good for modern references, challenging for classical
- **Food & Drink**: Varies by model's cultural training data

## Cost Estimation

### OpenAI Pricing (approximate)
- GPT-4o: ~$0.15 per test run (24 phrases)
- GPT-4o-mini: ~$0.02 per test run (24 phrases)

### Gemini Pricing (approximate)  
- Both models: ~$0.01 per test run (24 phrases)

**Total cost for full comparison: ~$0.36**

## Using Results for Production

### Model Selection Criteria
1. **Average Score**: Higher is better, target 65+ average
2. **High Quality %**: Target 60%+ phrases scoring 60+
3. **Consistency**: Lower variance in scores is better
4. **Speed**: Important for real-time generation
5. **Cost**: Balance quality vs. operational costs

### Implementation Steps
1. Review the generated `direct-model-comparison-results-*.json` file
2. Identify the best performing model for your use case
3. Update your production configuration to use the winning model
4. Consider A/B testing with top 2 models for ongoing optimization

## Troubleshooting

### Common Issues

**"API key not configured"**
- Ensure environment variables are set correctly
- Check for typos in variable names (OPENAI_API_KEY, GEMINI_API_KEY)

**"Request timeout"**
- Models may be slower than expected
- Increase timeout in httpRequest function if needed

**"Failed to parse JSON response"**
- Some models may return malformed JSON occasionally
- Check the raw response in error messages for debugging

**Low scores across all models**
- Review the scoring criteria to ensure it matches your expectations
- Consider adjusting weights in PhraseScorer if needed

### Getting Help
1. Check the generated results JSON file for detailed breakdown
2. Review individual phrase scores to understand patterns
3. Examine the scoring breakdown to see which factors are affecting results

## Advanced Usage

### Custom Test Configuration
Modify the test configuration in `direct-model-comparison.js`:

```javascript
// Add more categories
const TEST_CATEGORIES = [
  { topic: 'Movies & TV', batchSize: 8 },
  { topic: 'Music', batchSize: 8 },
  { topic: 'Food & Drink', batchSize: 8 },
  { topic: 'Sports', batchSize: 8 },  // Add custom categories
  { topic: 'Technology', batchSize: 8 }
];

// Test different models
const OPENAI_MODELS = [
  { name: 'GPT-4o', model: 'gpt-4o' },
  { name: 'GPT-3.5-Turbo', model: 'gpt-3.5-turbo' }  // Add other models
];
```

### Batch Size Considerations
- Smaller batches (5-10): More API calls, better error isolation
- Larger batches (15-25): Fewer API calls, risk of timeout
- Current setting (8): Good balance of speed and reliability

## Files Generated

1. **`direct-model-comparison-results-[timestamp].json`**: Complete test results with all data
2. **`phrase-database.log`**: Detailed logging from the scoring pipeline
3. **`tools/phrase-database/data/phrase-scores.json`**: Cached scores for future runs

Keep these files for analysis and future reference!