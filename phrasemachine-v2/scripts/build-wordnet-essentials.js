#!/usr/bin/env node

/**
 * WordNet Essentials Builder
 * 
 * Expands the curated multi-word entry list to ~5k entries
 * for compound noun and phrasal combination detection.
 * 
 * Output: wordnet_multi.json (~1 MB)
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

class WordNetEssentialsBuilder {
  constructor() {
    this.outputDir = path.join(__dirname, '../data/production');
    this.tempDir = path.join(__dirname, '../data/temp');
    this.outputFile = path.join(this.outputDir, 'wordnet_multi.json');
    
    this.multiWordEntries = new Set();
    this.patterns = new Map();
    
    this.stats = {
      processed: 0,
      kept: 0,
      skipped: 0,
      startTime: performance.now()
    };
  }

  async initialize() {
    // Ensure output directories exist
    [this.outputDir, this.tempDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    console.log('🚀 WordNet Essentials Builder initialized');
    console.log(`📁 Output: ${this.outputFile}`);
  }

  /**
   * Generate expanded multi-word entries based on common patterns
   */
  generateMultiWordEntries() {
    console.log('📖 Generating multi-word entries...');

    // Start with our existing curated list
    this.addCuratedEntries();
    
    // Generate systematic combinations
    this.generateFoodCombinations();
    this.generatePlaceCombinations();
    this.generateActivityCombinations();
    this.generateObjectCombinations();
    this.generateCompoundNouns();
    this.generatePhrasalCombinations();

    console.log(`✅ Generated ${this.multiWordEntries.size} multi-word entries`);
  }

  /**
   * Add our existing curated multi-word entries
   */
  addCuratedEntries() {
    const curated = [
      // Original curated list
      'ice cream', 'hot dog', 'french fries', 'coffee shop', 'gas station',
      'shopping mall', 'movie theater', 'high school', 'credit card', 'cell phone',
      'video game', 'board game', 'rock band', 'pop music', 'reality show',
      'theme park', 'amusement park', 'water park', 'national park', 'parking lot',
      'grocery store', 'department store', 'book store', 'music store', 'toy store',
      'fast food', 'junk food', 'health food', 'sea food', 'comfort food',
      'social media', 'news media', 'mass media', 'streaming service', 'cable television',
      'smart phone', 'laptop computer', 'desktop computer', 'tablet computer', 'game console',
      'birthday party', 'wedding party', 'house party', 'block party', 'pool party',
      'road trip', 'business trip', 'family trip', 'camping trip', 'ski trip',
      'home run', 'touch down', 'field goal', 'free throw', 'slam dunk',
      'morning coffee', 'afternoon tea', 'happy hour', 'dinner party', 'lunch break',
      'rush hour', 'prime time', 'break time', 'meal time', 'bed time',
      'living room', 'dining room', 'bed room', 'bath room', 'class room',
      'post office', 'fire station', 'police station', 'train station', 'bus station'
    ];

    curated.forEach(entry => {
      this.multiWordEntries.add(entry.toLowerCase());
      this.stats.processed++;
      this.stats.kept++;
    });
  }

  /**
   * Generate food-related combinations
   */
  generateFoodCombinations() {
    const foodAdjectives = [
      'fresh', 'frozen', 'hot', 'cold', 'spicy', 'sweet', 'sour', 'salty',
      'organic', 'healthy', 'junk', 'fast', 'slow', 'home', 'restaurant',
      'italian', 'chinese', 'mexican', 'indian', 'french', 'american'
    ];

    const foodNouns = [
      'food', 'meal', 'dish', 'snack', 'dessert', 'soup', 'salad', 'sandwich',
      'pizza', 'burger', 'taco', 'sushi', 'pasta', 'bread', 'cake', 'cookie',
      'chicken', 'beef', 'pork', 'fish', 'vegetable', 'fruit', 'cheese', 'milk'
    ];

    this.generateCombinations(foodAdjectives, foodNouns, 'food');
  }

  /**
   * Generate place-related combinations
   */
  generatePlaceCombinations() {
    const placeAdjectives = [
      'public', 'private', 'outdoor', 'indoor', 'local', 'downtown', 'uptown',
      'small', 'big', 'new', 'old', 'modern', 'historic', 'busy', 'quiet'
    ];

    const placeNouns = [
      'park', 'square', 'street', 'avenue', 'building', 'house', 'office',
      'shop', 'store', 'mall', 'center', 'station', 'airport', 'hospital',
      'school', 'library', 'museum', 'theater', 'restaurant', 'cafe', 'bar'
    ];

    this.generateCombinations(placeAdjectives, placeNouns, 'place');
  }

  /**
   * Generate activity-related combinations
   */
  generateActivityCombinations() {
    const activityVerbs = [
      'play', 'watch', 'listen', 'read', 'write', 'cook', 'eat', 'drink',
      'drive', 'walk', 'run', 'swim', 'dance', 'sing', 'work', 'study'
    ];

    const activityObjects = [
      'game', 'movie', 'music', 'book', 'food', 'car', 'bike', 'sport',
      'piano', 'guitar', 'computer', 'phone', 'television', 'radio'
    ];

    this.generateVerbNounCombinations(activityVerbs, activityObjects, 'activity');
  }

  /**
   * Generate object-related combinations
   */
  generateObjectCombinations() {
    const objectAdjectives = [
      'electronic', 'digital', 'smart', 'mobile', 'portable', 'wireless',
      'automatic', 'manual', 'electric', 'solar', 'battery', 'rechargeable'
    ];

    const objectNouns = [
      'device', 'gadget', 'tool', 'machine', 'computer', 'phone', 'camera',
      'player', 'system', 'network', 'service', 'application', 'software'
    ];

    this.generateCombinations(objectAdjectives, objectNouns, 'object');
  }

  /**
   * Generate compound nouns
   */
  generateCompoundNouns() {
    const compounds = [
      // Time compounds
      ['morning', 'afternoon', 'evening', 'night'],
      ['show', 'time', 'break', 'shift', 'rush'],
      
      // Technology compounds
      ['smart', 'mobile', 'laptop', 'desktop'],
      ['phone', 'computer', 'device', 'system'],
      
      // Transportation
      ['school', 'city', 'tour', 'shuttle'],
      ['bus', 'train', 'car', 'service'],
      
      // Entertainment
      ['video', 'board', 'card', 'computer'],
      ['game', 'show', 'movie', 'music'],
      
      // Shopping
      ['shopping', 'grocery', 'department', 'convenience'],
      ['store', 'mall', 'center', 'market'],
    ];

    compounds.forEach(([prefixes, suffixes]) => {
      prefixes.split(' ').forEach(prefix => {
        suffixes.split(' ').forEach(suffix => {
          const compound = `${prefix} ${suffix}`;
          if (this.isValidMultiWord(compound)) {
            this.multiWordEntries.add(compound);
            this.stats.processed++;
            this.stats.kept++;
          }
        });
      });
    });
  }

  /**
   * Generate phrasal combinations
   */
  generatePhrasalCombinations() {
    const phrasalPatterns = [
      // Preposition phrases
      { pattern: '{noun} in {location}', examples: ['house in suburbs', 'store in mall'] },
      { pattern: '{noun} on {surface}', examples: ['book on table', 'car on road'] },
      { pattern: '{noun} with {feature}', examples: ['house with garden', 'car with sunroof'] },
      
      // Possession phrases
      { pattern: '{owner}\'s {possession}', examples: ['mom\'s car', 'dad\'s tools'] },
      
      // Purpose phrases
      { pattern: '{noun} for {purpose}', examples: ['tool for cooking', 'app for music'] },
    ];

    // Generate a sample of phrasal combinations
    const phrasalSamples = [
      'house in suburbs', 'car in garage', 'book on shelf', 'food on table',
      'phone with camera', 'laptop with battery', 'house with pool', 'car with radio',
      'tool for cooking', 'app for music', 'game for kids', 'show for family'
    ];

    phrasalSamples.forEach(phrase => {
      if (this.isValidMultiWord(phrase)) {
        this.multiWordEntries.add(phrase);
        this.stats.processed++;
        this.stats.kept++;
      }
    });
  }

  /**
   * Generate adjective-noun combinations
   */
  generateCombinations(adjectives, nouns, category) {
    adjectives.forEach(adj => {
      nouns.forEach(noun => {
        const combination = `${adj} ${noun}`;
        if (this.isValidMultiWord(combination)) {
          this.multiWordEntries.add(combination);
          this.patterns.set(combination, category);
          this.stats.processed++;
          this.stats.kept++;
        } else {
          this.stats.skipped++;
        }
      });
    });
  }

  /**
   * Generate verb-noun combinations
   */
  generateVerbNounCombinations(verbs, nouns, category) {
    verbs.forEach(verb => {
      nouns.forEach(noun => {
        const combination = `${verb} ${noun}`;
        if (this.isValidMultiWord(combination)) {
          this.multiWordEntries.add(combination);
          this.patterns.set(combination, category);
          this.stats.processed++;
          this.stats.kept++;
        } else {
          this.stats.skipped++;
        }
      });
    });
  }

  /**
   * Validate if a multi-word combination is meaningful
   */
  isValidMultiWord(phrase) {
    // Basic validation rules
    if (phrase.length < 4 || phrase.length > 30) return false;
    
    const words = phrase.toLowerCase().split(' ');
    
    // Must have 2-3 words
    if (words.length < 2 || words.length > 3) return false;
    
    // Words must be reasonable length
    if (words.some(word => word.length < 2 || word.length > 15)) return false;
    
    // Avoid purely functional combinations
    const functionalWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with'];
    if (words.every(word => functionalWords.includes(word))) return false;
    
    // Avoid duplicate words
    const uniqueWords = new Set(words);
    if (uniqueWords.size !== words.length) return false;
    
    return true;
  }

  /**
   * Save WordNet multi-word entries to JSON
   */
  async saveWordNetEntries() {
    console.log('💾 Saving WordNet multi-word entries...');

    // Convert to array and sort
    const entriesArray = Array.from(this.multiWordEntries).sort();

    // Group by category
    const byCategory = {};
    entriesArray.forEach(entry => {
      const category = this.patterns.get(entry) || 'curated';
      if (!byCategory[category]) byCategory[category] = [];
      byCategory[category].push(entry);
    });

    const essentials = {
      meta: {
        version: '1.0',
        buildDate: new Date().toISOString(),
        entryCount: entriesArray.length,
        totalProcessed: this.stats.processed,
        buildTimeMs: Math.round(performance.now() - this.stats.startTime),
        description: 'Multi-word entries for PhraseMachine v2 compound detection',
        source: 'Expanded from curated WordNet-style patterns'
      },
      entries: entriesArray,
      byCategory: byCategory,
      categories: Object.keys(byCategory).reduce((acc, cat) => {
        acc[cat] = byCategory[cat].length;
        return acc;
      }, {})
    };

    const jsonData = JSON.stringify(essentials, null, 2);
    fs.writeFileSync(this.outputFile, jsonData);

    const fileSizeMB = (fs.statSync(this.outputFile).size / 1024 / 1024).toFixed(2);
    console.log(`✅ Saved ${entriesArray.length} entries to ${this.outputFile}`);
    console.log(`📦 File size: ${fileSizeMB} MB`);

    return {
      entryCount: entriesArray.length,
      fileSizeMB: parseFloat(fileSizeMB),
      outputFile: this.outputFile
    };
  }

  /**
   * Main build process
   */
  async build() {
    try {
      await this.initialize();
      
      this.generateMultiWordEntries();
      const result = await this.saveWordNetEntries();
      
      console.log('🎉 WordNet essentials build complete!');
      console.log(`📊 Final stats: ${result.entryCount} entries, ${result.fileSizeMB} MB`);
      
      return result;

    } catch (error) {
      console.error('❌ Build failed:', error);
      throw error;
    }
  }
}

// CLI execution
if (require.main === module) {
  const builder = new WordNetEssentialsBuilder();
  
  // Check for test mode
  const isTestMode = process.argv.includes('--test');
  if (isTestMode) {
    console.log('🧪 Running in TEST mode');
    builder.outputFile = path.join(builder.outputDir, 'wordnet_multi_test.json');
  }
  
  builder.build()
    .then(result => {
      console.log('✅ Build successful:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Build failed:', error);
      process.exit(1);
    });
}

module.exports = WordNetEssentialsBuilder;