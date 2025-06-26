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
   * @returns {Promise<string[]>} Array of generated phrases
   */
  async generatePhrases(category, count = 15, service = 'gemini') {
    if (count > 15) {
      throw new Error('Maximum 15 phrases per request due to timeout limits');
    }

    const endpoint = service === 'gemini' ? '/gemini' : '/openai';
    const payload = {
      prompt: this.createCategoryPrompt(category, count),
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
   * @returns {Promise<{phrases: string[], service: string}>} Generated phrases and service used
   */
  async generatePhrasesWithFallback(category, count = 15) {
    // Try Gemini first (primary service)
    try {
      const phrases = await this.generatePhrases(category, count, 'gemini');
      return { phrases, service: 'gemini' };
    } catch (geminiError) {
      if (this.debug) {
        console.warn('🔄 Gemini failed, falling back to OpenAI');
      }

      // Fallback to OpenAI
      try {
        const phrases = await this.generatePhrases(category, count, 'openai');
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
   * @returns {string} Formatted prompt
   */
  createCategoryPrompt(category, count) {
    return `Generate ${count} short, fun phrases perfect for a party guessing game like Heads Up or Charades.

CATEGORY: ${category}

REQUIREMENTS:
- 2-4 words maximum
- Instantly recognizable to most people
- Perfect for acting out, describing, or guessing
- Fun and engaging for party games
- No offensive, political, or controversial content

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
}

module.exports = APIClient; 