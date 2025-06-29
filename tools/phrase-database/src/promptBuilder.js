const winston = require('winston');

// Configure logger for prompt builder
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [PROMPT-${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'phrase-database.log' })
  ]
});

class PromptBuilder {
  constructor(database) {
    this.db = database;
    this.MAX_DONT_USE_PHRASES = 50;
    this.RARITY_SEEDS_PER_CATEGORY = 8;
  }

  /**
   * Build enhanced prompt with duplicate avoidance and rarity seeds
   * @param {string} category - Target category
   * @param {number} batchSize - Number of phrases to generate
   * @param {Object} options - Additional options
   * @returns {Promise<string>} - Enhanced prompt string
   */
  async buildEnhancedPrompt(category, batchSize = 15, options = {}) {
    try {
      logger.info(`Building enhanced prompt for category "${category}" with ${batchSize} phrases`);
      
      // Get base prompt structure
      const basePrompt = this.getBasePrompt(category, batchSize);
      
      // Get most common/recent phrases to avoid
      const dontUseList = await this.getDontUseList(category);
      
      // Get rarity seeds for saturated categories
      const raritySeeds = await this.getRaritySeeds(category);
      
      // Build enhanced prompt sections
      const sections = [
        basePrompt,
        this.buildDontUseSection(dontUseList),
        this.buildRaritySeedSection(category, raritySeeds),
        this.buildQualityGuidance(),
        this.buildOutputFormat()
      ].filter(section => section.length > 0);
      
      const enhancedPrompt = sections.join('\n\n');
      
      logger.info(`Enhanced prompt built: ${enhancedPrompt.length} characters, ${dontUseList.length} avoid phrases, ${raritySeeds.length} rarity seeds`);
      
      return enhancedPrompt;
      
    } catch (error) {
      logger.error(`Error building enhanced prompt: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get base prompt structure for the category
   * @param {string} category - Target category
   * @param {number} batchSize - Number of phrases to generate
   * @returns {string} - Base prompt
   */
  getBasePrompt(category, batchSize) {
    const categoryPrompts = {
      'Movies & TV': `Generate ${batchSize} diverse movie titles, TV shows, characters, or entertainment phrases that are well-known and suitable for charades/acting games.`,
      'Music & Artists': `Generate ${batchSize} diverse music-related phrases including song titles, artist names, bands, albums, or music genres that are recognizable.`,
      'Famous People': `Generate ${batchSize} diverse famous people from various fields (actors, musicians, politicians, historical figures, athletes, etc.) who are widely recognized.`,
      'Sports & Athletes': `Generate ${batchSize} diverse sports-related phrases including sports names, famous athletes, teams, equipment, or sporting events.`,
      'Places & Travel': `Generate ${batchSize} diverse geographical locations, landmarks, cities, countries, tourist destinations, or travel-related phrases.`,
      'Food & Drink': `Generate ${batchSize} diverse food items, dishes, beverages, cooking methods, or culinary terms that are commonly known.`,
      'Nature & Animals': `Generate ${batchSize} diverse animals, plants, natural phenomena, or nature-related phrases that are easily recognizable.`,
      'Technology & Science': `Generate ${batchSize} diverse technology, science, or innovation-related phrases that are mainstream and widely understood.`,
      'History & Events': `Generate ${batchSize} diverse historical events, periods, figures, or culturally significant moments that are well-known.`,
      'Entertainment & Pop Culture': `Generate ${batchSize} diverse pop culture references, trends, memes, games, or entertainment phenomena that are widely recognized.`,
      'Everything': `Generate ${batchSize} diverse phrases from any category that would work well in charades - mix of people, places, things, and concepts.`,
      'Everything+': `Generate ${batchSize} diverse and creative phrases from any category, including some more challenging or unique options for advanced players.`,
      
      // Phase 1 Category Expansion - Task 5e
      'Occupations & Jobs': `Generate ${batchSize} diverse job titles, professions, workplace activities, or career-related phrases that are easily recognizable and perfect for acting out in charades.`,
      'Brands & Companies': `Generate ${batchSize} diverse brand names, company names, products, services, or business-related phrases that are well-known and suitable for charades/acting games.`,
      'Holidays & Celebrations': `Generate ${batchSize} diverse holidays, festivals, celebrations, special occasions, or party-related phrases that are widely recognized and fun to act out.`,
      'Emotions & Feelings': `Generate ${batchSize} diverse emotions, feelings, moods, expressions, or emotional states that can be clearly expressed through facial expressions and body language in charades.`,
      'Actions & Verbs': `Generate ${batchSize} diverse actions, activities, verbs, or physical movements that are common, recognizable, and perfect for acting out in charades games.`
    };

    return categoryPrompts[category] || `Generate ${batchSize} diverse phrases for the "${category}" category that are suitable for charades/acting games.`;
  }

  /**
   * Get list of phrases to avoid (most common/recent duplicates)
   * @param {string} category - Target category
   * @returns {Promise<Array>} - List of phrases to avoid
   */
  async getDontUseList(category) {
    try {
      // Get most common first words in this category (likely to generate duplicates)
      const commonPhrasesQuery = `
        SELECT phrase, COUNT(*) as duplicate_attempts
        FROM (
          SELECT phrase FROM phrases WHERE category = ?
          UNION ALL
          SELECT phrase FROM phrases WHERE category = ? AND added > datetime('now', '-7 days')
        )
        GROUP BY LOWER(phrase)
        ORDER BY duplicate_attempts DESC, LENGTH(phrase) ASC
        LIMIT ?
      `;
      
      const commonPhrases = await this.db.all(commonPhrasesQuery, [category, category, this.MAX_DONT_USE_PHRASES]);
      
      // Also get phrases with common first words
      const commonFirstWordsQuery = `
        SELECT first_word, GROUP_CONCAT(phrase, ', ') as example_phrases
        FROM phrases 
        WHERE category = ?
        GROUP BY LOWER(first_word)
        HAVING COUNT(*) >= 2
        ORDER BY COUNT(*) DESC
        LIMIT 10
      `;
      
      const commonFirstWords = await this.db.all(commonFirstWordsQuery, [category]);
      
      // Combine results
      const dontUseList = commonPhrases.map(row => row.phrase);
      
      // Add some first-word examples
      for (const { first_word, example_phrases } of commonFirstWords.slice(0, 5)) {
        const examples = example_phrases.split(', ').slice(0, 2);
        dontUseList.push(...examples);
      }
      
      // Remove duplicates and limit
      const uniqueDontUse = [...new Set(dontUseList)].slice(0, this.MAX_DONT_USE_PHRASES);
      
      logger.debug(`Built don't-use list for "${category}": ${uniqueDontUse.length} phrases`);
      
      return uniqueDontUse;
      
    } catch (error) {
      logger.error(`Error getting don't-use list: ${error.message}`);
      return [];
    }
  }

  /**
   * Get rarity seeds for saturated categories
   * @param {string} category - Target category
   * @returns {Promise<Array>} - List of rarity seed topics
   */
  async getRaritySeeds(category) {
    try {
      // Check if category is saturated (high phrase count)
      const countQuery = `SELECT COUNT(*) as phrase_count FROM phrases WHERE category = ?`;
      const { phrase_count } = await this.db.get(countQuery, [category]);
      
      if (phrase_count < 40) {
        // Not saturated enough to need rarity seeds
        return [];
      }
      
      // Category-specific rarity seeds to encourage novelty
      const raritySeeds = {
        'Movies & TV': [
          'foreign language films', 'documentary titles', 'animated series', 'cult classics',
          'film noir movies', 'indie films', 'TV miniseries', 'streaming originals'
        ],
        'Music & Artists': [
          'world music artists', 'classical composers', 'jazz musicians', 'folk singers',
          'electronic music producers', 'country artists', 'R&B vocalists', 'indie bands'
        ],
        'Famous People': [
          'Nobel Prize winners', 'inventors and innovators', 'social activists', 'explorers',
          'philosophers', 'architects', 'fashion designers', 'chefs and restaurateurs'
        ],
        'Sports & Athletes': [
          'Olympic sports', 'winter sports', 'Paralympic athletes', 'extreme sports',
          'martial arts', 'motorsports', 'water sports', 'track and field events'
        ],
        'Places & Travel': [
          'UNESCO World Heritage sites', 'national parks', 'small islands', 'mountain ranges',
          'desert locations', 'ancient ruins', 'pilgrimage sites', 'remote destinations'
        ],
        'Food & Drink': [
          'regional specialties', 'fermented foods', 'street food', 'traditional desserts',
          'artisanal beverages', 'ancient grains', 'exotic fruits', 'cooking techniques'
        ],
        'Nature & Animals': [
          'endangered species', 'deep sea creatures', 'nocturnal animals', 'plant families',
          'geological formations', 'weather phenomena', 'ecosystems', 'conservation terms'
        ],
        'Technology & Science': [
          'emerging technologies', 'scientific instruments', 'space exploration', 'biotechnology',
          'renewable energy', 'materials science', 'quantum physics', 'medical devices'
        ],
        'History & Events': [
          'ancient civilizations', 'lesser-known battles', 'cultural movements', 'trade routes',
          'historical artifacts', 'peace treaties', 'exploration expeditions', 'social reforms'
        ],
        'Entertainment & Pop Culture': [
          'viral phenomena', 'gaming culture', 'social media trends', 'comedy formats',
          'art movements', 'fashion trends', 'dance styles', 'internet culture'
        ]
      };
      
      const seeds = raritySeeds[category] || [];
      const selectedSeeds = seeds.slice(0, this.RARITY_SEEDS_PER_CATEGORY);
      
      logger.debug(`Generated ${selectedSeeds.length} rarity seeds for saturated category "${category}"`);
      
      return selectedSeeds;
      
    } catch (error) {
      logger.error(`Error getting rarity seeds: ${error.message}`);
      return [];
    }
  }

  /**
   * Build the "don't use" section of the prompt
   * @param {Array} dontUseList - List of phrases to avoid
   * @returns {string} - Don't use section
   */
  buildDontUseSection(dontUseList) {
    if (dontUseList.length === 0) {
      return '';
    }
    
    const phrasesToAvoid = dontUseList.slice(0, 20).join('", "'); // Limit to avoid overly long prompts
    
    return `IMPORTANT: Avoid using any of these existing phrases: "${phrasesToAvoid}". Generate completely different phrases that don't duplicate or closely resemble these examples.`;
  }

  /**
   * Build the rarity seed section of the prompt
   * @param {string} category - Target category
   * @param {Array} raritySeeds - List of rarity seed topics
   * @returns {string} - Rarity seed section
   */
  buildRaritySeedSection(category, raritySeeds) {
    if (raritySeeds.length === 0) {
      return '';
    }
    
    const seedTopics = raritySeeds.join(', ');
    
    return `For more unique results, consider including phrases related to these less-common topics: ${seedTopics}. This will help generate more diverse and interesting phrases.`;
  }

  /**
   * Build quality guidance section
   * @returns {string} - Quality guidance
   */
  buildQualityGuidance() {
    return `Focus on phrases that are:
- Recognizable to most people (not too obscure)
- Fun and engaging for charades/acting games
- Varied in length and complexity
- Culturally relevant and appropriate
- Distinct from each other (avoid similar phrases)`;
  }

  /**
   * Build output format section
   * @returns {string} - Output format instructions
   */
  buildOutputFormat() {
    return `Return ONLY a JSON array of objects with this exact format:
[
  {"id": 1, "phrase": "Example Phrase", "topic": "brief topic", "difficulty": "easy|medium|hard"}
]

Each phrase should be 2-6 words, appropriate for all audiences, and engaging for charades.`;
  }

  /**
   * Get statistics about prompt enhancement effectiveness
   * @param {string} category - Category to analyze
   * @returns {Promise<Object>} - Enhancement statistics
   */
  async getEnhancementStats(category) {
    try {
      const stats = {
        category: category,
        totalPhrases: 0,
        duplicatePatterns: {},
        saturationLevel: 'low',
        recommendedEnhancements: []
      };
      
      // Get total phrases
      const countQuery = `SELECT COUNT(*) as phrase_count FROM phrases WHERE category = ?`;
      const { phrase_count } = await this.db.get(countQuery, [category]);
      stats.totalPhrases = phrase_count;
      
      // Determine saturation level
      if (phrase_count > 60) {
        stats.saturationLevel = 'high';
        stats.recommendedEnhancements.push('rarity-seeds', 'dont-use-list', 'temperature-tuning');
      } else if (phrase_count > 30) {
        stats.saturationLevel = 'medium';
        stats.recommendedEnhancements.push('dont-use-list', 'temperature-tuning');
      } else {
        stats.saturationLevel = 'low';
        stats.recommendedEnhancements.push('basic-prompt');
      }
      
      // Get duplicate patterns
      const duplicateQuery = `
        SELECT first_word, COUNT(*) as count
        FROM phrases 
        WHERE category = ?
        GROUP BY LOWER(first_word)
        HAVING count > 1
        ORDER BY count DESC
        LIMIT 10
      `;
      
      const duplicatePatterns = await this.db.all(duplicateQuery, [category]);
      stats.duplicatePatterns = duplicatePatterns.reduce((acc, row) => {
        acc[row.first_word] = row.count;
        return acc;
      }, {});
      
      return stats;
      
    } catch (error) {
      logger.error(`Error getting enhancement stats: ${error.message}`);
      throw error;
    }
  }
}

module.exports = PromptBuilder; 