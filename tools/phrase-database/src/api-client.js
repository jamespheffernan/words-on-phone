/**
 * API Client for Production Netlify Functions
 * 
 * Integrates with the production phrase generation APIs:
 * - Primary: Gemini 2.5 Flash via /.netlify/functions/gemini
 * - Fallback: OpenAI via /.netlify/functions/openai
 */

const https = require('https');

class APIClient {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'https://words-on-phone.netlify.app';
    this.timeout = options.timeout || 30000; // 30 second timeout
    this.retries = options.retries || 2;
    this.debug = options.debug || false;
  }

  /**
   * Generate phrases using the production API
   * @param {string} category - The category to generate phrases for
   * @param {number} count - Number of phrases to generate (max 15 due to timeout)
   * @param {string} service - 'gemini' or 'openai'
   * @param {Array} existingPhrases - Existing phrases to avoid duplicates
   * @returns {Promise<string[]>} Array of generated phrases
   */
  async generatePhrases(category, count = 15, service = 'gemini', existingPhrases = []) {
    if (count > 15) {
      throw new Error('Maximum 15 phrases per request due to timeout limits');
    }

    const endpoint = service === 'gemini' ? '/gemini' : '/openai';
    const payload = {
      prompt: this.createCategoryPrompt(category, count, existingPhrases),
      category: category,
      phraseCount: count
    };

    try {
      if (this.debug) {
        console.log(`🔄 Generating ${count} phrases for "${category}" via ${service.toUpperCase()}`);
      }

      const response = await this.makeRequest(endpoint, payload);
      const phrases = this.parsePhrasesFromResponse(response, service);
      
      if (this.debug) {
        console.log(`✅ Generated ${phrases.length} phrases successfully`);
      }

      return phrases;
    } catch (error) {
      if (this.debug) {
        console.error(`❌ Failed to generate phrases via ${service}:`, error.message);
      }
      throw error;
    }
  }

  /**
   * Generate phrases with automatic fallback
   * @param {string} category - The category to generate phrases for
   * @param {number} count - Number of phrases to generate
   * @param {Array} existingPhrases - Existing phrases to avoid duplicates
   * @param {string} preferredService - Preferred AI service
   * @returns {Promise<{phrases: string[], service: string}>} Generated phrases and service used
   */
  async generatePhrasesWithFallback(category, count = 15, existingPhrases = [], preferredService = 'gemini') {
    // Try Gemini first (primary service)
    try {
      const phrases = await this.generatePhrases(category, count, 'gemini', existingPhrases);
      return { phrases, service: 'gemini' };
    } catch (geminiError) {
      if (this.debug) {
        console.warn('🔄 Gemini failed, falling back to OpenAI');
      }

      // Fallback to OpenAI
      try {
        const phrases = await this.generatePhrases(category, count, 'openai', existingPhrases);
        return { phrases, service: 'openai' };
      } catch (openaiError) {
        throw new Error(`Both services failed - Gemini: ${geminiError.message}, OpenAI: ${openaiError.message}`);
      }
    }
  }

  /**
   * Create optimized prompt for specific category
   * @param {string} category - The category name
   * @param {number} count - Number of phrases requested
   * @param {Array} existingPhrases - Existing phrases to avoid duplicates
   * @returns {string} Formatted prompt
   */
  createCategoryPrompt(category, count, existingPhrases = []) {
    // Create sample of existing phrases to avoid
    const sampleExisting = existingPhrases.length > 0 
      ? existingPhrases.slice(0, 15).map(p => `"${p.phrase}"`).join(', ')
      : '';
    
    const avoidText = sampleExisting 
      ? `\n\nIMPORTANT: Avoid these existing phrases and create NEW, UNIQUE ones: ${sampleExisting}${existingPhrases.length > 15 ? '... and others' : ''}`
      : '';

    return `Generate ${count} short, fun phrases perfect for a party guessing game like Heads Up or Charades.

CATEGORY: ${category}

REQUIREMENTS:
- 2-4 words maximum  
- Instantly recognizable to most people
- Perfect for acting out, describing, or guessing
- Fun and engaging for party games
- No offensive, political, or controversial content
- Be creative and diverse - avoid obvious/common choices${avoidText}

EXAMPLES OF EXCELLENT PHRASES:
${this.getCategoryExamples(category)}

Return ONLY a JSON array of phrases: ["phrase1", "phrase2", ...]`;
  }

  /**
   * Get category-specific examples for better AI generation
   * @param {string} category - The category name
   * @returns {string} Example phrases for the category
   */
  getCategoryExamples(category) {
    const examples = {
      'Movies & TV': '- "Star Wars"\n- "Breaking Bad"\n- "Marvel Movie"\n- "Disney Princess"',
      'Music & Artists': '- "Taylor Swift"\n- "Rock Concert"\n- "Piano Solo"\n- "Pop Song"',
      'Sports & Athletes': '- "Basketball Game"\n- "Soccer Ball"\n- "Olympic Games"\n- "Home Run"',
      'Food & Drink': '- "Pizza Slice"\n- "Coffee Shop"\n- "Ice Cream"\n- "Taco Tuesday"',
      'Places & Travel': '- "Paris France"\n- "Beach Vacation"\n- "Mountain Hiking"\n- "City Tour"',
      'Famous People': '- "Albert Einstein"\n- "Oprah Winfrey"\n- "Steve Jobs"\n- "Michael Jordan"',
      'Technology & Science': '- "Smartphone App"\n- "Solar Panel"\n- "WiFi Password"\n- "Robot Vacuum"',
      'History & Events': '- "Moon Landing"\n- "World War"\n- "Ancient Egypt"\n- "Renaissance Art"',
      'Nature & Animals': '- "Golden Retriever"\n- "Tropical Fish"\n- "Mountain Lion"\n- "Ocean Wave"',
      'Entertainment & Pop Culture': '- "TikTok Dance"\n- "Viral Meme"\n- "Celebrity Gossip"\n- "Award Show"',
      'Everything': '- "Birthday Party"\n- "Road Trip"\n- "Science Project"\n- "Family Dinner"',
      'Everything+': '- "Quantum Physics"\n- "Ancient Mythology"\n- "Abstract Art"\n- "Philosophy Book"'
    };

    return examples[category] || '- "Example One"\n- "Example Two"\n- "Example Three"\n- "Example Four"';
  }

  /**
   * Parse phrases from API response based on service type
   * @param {Object} response - API response
   * @param {string} service - Service type ('gemini' or 'openai')
   * @returns {string[]} Parsed phrases
   */
  parsePhrasesFromResponse(response, service) {
    try {
      let content;
      
      if (service === 'gemini') {
        // Gemini response format: { candidates: [{ content: { parts: [{ text: "..." }] } }] }
        content = response.candidates?.[0]?.content?.parts?.[0]?.text;
      } else {
        // OpenAI response format: { choices: [{ message: { content: "..." } }] }
        content = response.choices?.[0]?.message?.content;
      }

      if (!content) {
        throw new Error('No content found in response');
      }

      // Extract JSON array from response (handle cases where AI adds explanation text)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      const phrases = JSON.parse(jsonMatch[0]);
      
      if (!Array.isArray(phrases)) {
        throw new Error('Response is not an array');
      }

      return phrases.filter(phrase => phrase && typeof phrase === 'string' && phrase.trim().length > 0);
    } catch (error) {
      throw new Error(`Failed to parse response: ${error.message}`);
    }
  }

  /**
   * Make HTTP request to Netlify function
   * @param {string} endpoint - API endpoint
   * @param {Object} payload - Request payload
   * @returns {Promise<Object>} Response data
   */
  async makeRequest(endpoint, payload) {
    return new Promise((resolve, reject) => {
      const url = `${this.baseUrl}/.netlify/functions${endpoint}`;
      const data = JSON.stringify(payload);
      
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        },
        timeout: this.timeout
      };

      if (this.debug) {
        console.log(`📡 POST ${url}`);
        console.log(`📝 Payload:`, payload);
      }

      const req = https.request(url, options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            if (res.statusCode !== 200) {
              reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
              return;
            }

            const parsedData = JSON.parse(responseData);
            resolve(parsedData);
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Request failed: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.write(data);
      req.end();
    });
  }

  /**
   * Test API connectivity
   * @returns {Promise<Object>} Test results
   */
  async testConnectivity() {
    const results = {
      gemini: { available: false, error: null },
      openai: { available: false, error: null }
    };

    // Test Gemini
    try {
      await this.generatePhrases('Movies & TV', 3, 'gemini');
      results.gemini.available = true;
    } catch (error) {
      results.gemini.error = error.message;
    }

    // Test OpenAI
    try {
      await this.generatePhrases('Movies & TV', 3, 'openai');
      results.openai.available = true;
    } catch (error) {
      results.openai.error = error.message;
    }

    return results;
  }

  /**
   * Generate category-specific prompts for AI services
   * @param {string} category - Category name
   * @param {number} count - Number of phrases requested
   * @param {Array} existingPhrases - Array of existing phrases to avoid duplicates
   * @returns {object} Prompt configuration
   */
  generateCategoryPrompt(category, count, existingPhrases = []) {
    // Create a unique subset to avoid repetition in prompts
    const sampleExisting = existingPhrases.slice(0, 10).map(p => `"${p.phrase}"`).join(', ');
    const avoidText = existingPhrases.length > 0 
      ? `\n\nIMPORTANT: Avoid these existing phrases: ${sampleExisting}${existingPhrases.length > 10 ? '... and others' : ''}`
      : '';
    
    const basePrompts = {
      "Movies & TV": {
        system: `You are an expert entertainment curator creating charades phrases for a party game. Generate ${count} diverse movie titles, TV shows, and streaming content that are excellent for acting out in charades.

REQUIREMENTS:
- Mix of classic and modern content (1970s-2024)
- Include movies, TV series, documentaries, animated shows
- Range from obvious crowd-pleasers to interesting challenges
- 2-4 words each, clear and recognizable
- Avoid obscure, inappropriate, or overly niche content
- Focus on titles people can ACT OUT physically
- Include variety: action, comedy, drama, sci-fi, animation, reality TV

Return ONLY a numbered list of ${count} phrases, one per line.
Example format:
1. Back to the Future
2. Breaking Bad`,
        
        user: `Generate ${count} charades-friendly movie and TV titles. Focus on variety across genres, decades, and difficulty levels.${avoidText}`
      },

      "Music & Artists": {
        system: `You are a music expert creating charades phrases for a party game. Generate ${count} diverse song titles, artist names, and music-related phrases that are excellent for acting out.

REQUIREMENTS:
- Mix of classic hits and modern popular songs
- Include artist names, song titles, album names, music genres
- Range from easy crowd-pleasers to fun challenges  
- 2-4 words each, widely recognizable
- Avoid obscure, inappropriate, or overly niche content
- Focus on terms people can ACT OUT or MIME
- Include variety: pop, rock, hip-hop, country, R&B, electronic

Return ONLY a numbered list of ${count} phrases, one per line.`,
        
        user: `Generate ${count} charades-friendly music titles and artists. Focus on variety across genres, eras, and difficulty levels.${avoidText}`
      },

      "Sports & Athletes": {
        system: `You are a sports expert creating charades phrases for a party game. Generate ${count} diverse sports terms, athlete names, and sporting activities that are excellent for acting out.

REQUIREMENTS:
- Mix of popular sports, famous athletes, sporting terms
- Include team names, individual sports, Olympic events, sports equipment
- Range from obvious actions to interesting challenges
- 2-4 words each, widely recognizable
- Avoid overly niche or inappropriate content
- Focus on terms people can ACT OUT physically
- Include variety: major league sports, Olympics, recreational activities

Return ONLY a numbered list of ${count} phrases, one per line.`,
        
        user: `Generate ${count} charades-friendly sports terms and athletes. Focus on variety across sports types and difficulty levels.${avoidText}`
      },

      "Food & Drink": {
        system: `You are a culinary expert creating charades phrases for a party game. Generate ${count} diverse food items, drinks, and cooking-related terms that are excellent for acting out.

REQUIREMENTS:
- Mix of common foods, exotic dishes, cooking techniques, beverages
- Include specific dishes, cooking methods, restaurant types, kitchen tools
- Range from simple foods to interesting culinary challenges
- 2-4 words each, recognizable to most people
- Avoid overly obscure or inappropriate content
- Focus on terms people can ACT OUT or MIME eating/cooking
- Include variety: international cuisine, desserts, drinks, cooking styles

Return ONLY a numbered list of ${count} phrases, one per line.`,
        
        user: `Generate ${count} charades-friendly food and drink terms. Focus on variety across cuisines, meal types, and difficulty levels.${avoidText}`
      }
    };

    return basePrompts[category] || basePrompts["Movies & TV"];
  }
}

module.exports = APIClient; 