#!/usr/bin/env node

/**
 * N-gram Essentials Builder
 * 
 * Extracts and processes game-relevant 2-4-grams for PMI calculations.
 * Focuses on entertainment, sports, food, and party-game vocabulary.
 * 
 * Output: ngrams_game.json (~10 MB)
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

class NgramEssentialsBuilder {
  constructor() {
    this.outputDir = path.join(__dirname, '../data/production');
    this.tempDir = path.join(__dirname, '../data/temp');
    this.outputFile = path.join(this.outputDir, 'ngrams_game.json');
    
    // Game-relevant categories and their terms
    this.gameCategories = {
      entertainment: [
        'game of thrones', 'breaking bad', 'star wars', 'harry potter',
        'the office', 'friends', 'the simpsons', 'stranger things',
        'marvel movie', 'disney movie', 'netflix series', 'youtube video',
        'video game', 'board game', 'card game', 'mobile game'
      ],
      food: [
        'ice cream', 'hot dog', 'french fries', 'pizza slice', 'chicken wings',
        'cheese burger', 'chocolate cake', 'coffee shop', 'fast food',
        'italian restaurant', 'mexican food', 'chinese takeout', 'sushi roll'
      ],
      sports: [
        'football game', 'basketball court', 'soccer field', 'tennis match',
        'baseball stadium', 'hockey rink', 'golf course', 'swimming pool',
        'olympic games', 'world cup', 'super bowl', 'home run'
      ],
      places: [
        'new york', 'los angeles', 'coffee shop', 'shopping mall',
        'movie theater', 'gas station', 'grocery store', 'theme park',
        'central park', 'times square', 'golden gate', 'statue liberty'
      ],
      brands: [
        'coca cola', 'microsoft office', 'apple iphone', 'google search',
        'facebook profile', 'amazon prime', 'netflix account', 'starbucks coffee',
        'mcdonalds fries', 'burger king', 'disney world', 'lego blocks'
      ],
      activities: [
        'road trip', 'birthday party', 'family dinner', 'movie night',
        'beach vacation', 'camping trip', 'shopping spree', 'house party',
        'date night', 'game night', 'dance party', 'cook dinner'
      ]
    };

    this.ngrams = new Map();
    this.wordCounts = new Map();
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

    console.log('🚀 N-gram Essentials Builder initialized');
    console.log(`📁 Output: ${this.outputFile}`);
  }

  /**
   * Generate synthetic n-grams from curated game vocabulary
   */
  generateGameNgrams() {
    console.log('🎮 Generating game-relevant n-grams...');

    // Add all curated phrases
    Object.entries(this.gameCategories).forEach(([category, phrases]) => {
      phrases.forEach(phrase => {
        this.processPhrase(phrase, category);
      });
    });

    // Generate common collocations
    this.generateCommonCollocations();
    
    // Generate compound nouns
    this.generateCompoundNouns();

    console.log(`✅ Generated ${this.ngrams.size} n-grams from curated vocabulary`);
  }

  /**
   * Process a phrase and its component words
   */
  processPhrase(phrase, category) {
    const words = phrase.toLowerCase().split(/\s+/);
    this.stats.processed++;

    // Count individual words
    words.forEach(word => {
      if (word.length >= 2) {
        const count = this.wordCounts.get(word) || 0;
        this.wordCounts.set(word, count + 1);
      }
    });

    // Generate n-grams (2-4 words)
    for (let n = 2; n <= Math.min(4, words.length); n++) {
      for (let i = 0; i <= words.length - n; i++) {
        const ngram = words.slice(i, i + n).join(' ');
        
        if (this.shouldKeepNgram(ngram, words.slice(i, i + n))) {
          const existing = this.ngrams.get(ngram) || {
            phrase: ngram,
            count: 0,
            categories: new Set(),
            length: n,
            pmi: 0
          };
          
          existing.count += 1;
          existing.categories.add(category);
          this.ngrams.set(ngram, existing);
          this.stats.kept++;
        } else {
          this.stats.skipped++;
        }
      }
    }
  }

  /**
   * Generate common collocations
   */
  generateCommonCollocations() {
    const collocations = [
      // Adjective + Noun patterns
      'hot dog', 'ice cream', 'cold drink', 'fast food', 'big screen',
      'smart phone', 'social media', 'high school', 'real estate',
      'credit card', 'movie star', 'rock band', 'pop music',
      
      // Verb + Noun patterns  
      'play game', 'watch movie', 'eat pizza', 'drink coffee',
      'drive car', 'ride bike', 'take photo', 'send message',
      'make dinner', 'call friend', 'buy ticket', 'wear clothes',
      
      // Compound nouns
      'birthday cake', 'wedding dress', 'christmas tree', 'summer vacation',
      'school bus', 'fire truck', 'police car', 'airplane ticket',
      'hotel room', 'parking lot', 'swimming pool', 'shopping cart'
    ];

    collocations.forEach(phrase => {
      this.processPhrase(phrase, 'common');
    });
  }

  /**
   * Generate compound nouns from common combinations
   */
  generateCompoundNouns() {
    const prefixes = ['ice', 'hot', 'cold', 'big', 'small', 'new', 'old', 'fast'];
    const nouns = ['cream', 'dog', 'drink', 'car', 'house', 'book', 'game', 'food'];
    
    const combinations = [];
    
    prefixes.forEach(prefix => {
      nouns.forEach(noun => {
        const compound = `${prefix} ${noun}`;
        if (this.isValidCompound(compound)) {
          combinations.push(compound);
        }
      });
    });

    combinations.forEach(phrase => {
      this.processPhrase(phrase, 'compound');
    });
  }

  /**
   * Check if compound is valid/meaningful
   */
  isValidCompound(compound) {
    const validCompounds = [
      'ice cream', 'hot dog', 'cold drink', 'big house', 'small car',
      'new book', 'old car', 'fast food', 'big game', 'hot drink'
    ];
    
    return validCompounds.includes(compound);
  }

  /**
   * Quality filter for n-grams
   */
  shouldKeepNgram(ngram, words) {
    // Must be reasonable length
    if (ngram.length < 4 || ngram.length > 50) return false;
    
    // Must contain real words
    if (words.some(word => word.length < 2 || /^\d+$/.test(word))) return false;
    
    // Avoid purely functional phrases
    const functionalWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'];
    if (words.every(word => functionalWords.includes(word))) return false;
    
    // Avoid patterns with too many repeated words
    const uniqueWords = new Set(words);
    if (uniqueWords.size < words.length * 0.7) return false;
    
    return true;
  }

  /**
   * Calculate PMI (Pointwise Mutual Information) scores
   */
  calculatePMI() {
    console.log('🔢 Calculating PMI scores...');
    
    const totalNgrams = Array.from(this.ngrams.values()).reduce((sum, ng) => sum + ng.count, 0);
    
    this.ngrams.forEach((ngramData, ngram) => {
      const words = ngram.split(' ');
      
      if (words.length === 2) {
        // PMI for 2-grams: log2(P(x,y) / (P(x) * P(y)))
        const [word1, word2] = words;
        const count1 = this.wordCounts.get(word1) || 1;
        const count2 = this.wordCounts.get(word2) || 1;
        
        const probXY = ngramData.count / totalNgrams;
        const probX = count1 / totalNgrams;
        const probY = count2 / totalNgrams;
        
        const pmi = Math.log2(probXY / (probX * probY));
        ngramData.pmi = Math.max(0, pmi); // Clip negative PMI to 0
        
      } else if (words.length > 2) {
        // For longer phrases, use simplified scoring based on word frequency
        const avgWordFreq = words.reduce((sum, word) => {
          return sum + (this.wordCounts.get(word) || 1);
        }, 0) / words.length;
        
        // Higher frequency words get lower PMI (they're less distinctive)
        ngramData.pmi = Math.max(0, 5 - Math.log2(avgWordFreq));
      }
    });

    console.log('✅ PMI calculation complete');
  }

  /**
   * Save processed n-grams to JSON
   */
  async saveNgrams() {
    console.log('💾 Saving n-gram essentials...');

    // Convert to final format
    const ngramArray = Array.from(this.ngrams.values()).map(ngram => ({
      phrase: ngram.phrase,
      count: ngram.count,
      pmi: parseFloat(ngram.pmi.toFixed(3)),
      length: ngram.length,
      categories: Array.from(ngram.categories)
    }));

    // Sort by PMI score (highest first)
    ngramArray.sort((a, b) => b.pmi - a.pmi);

    const essentials = {
      meta: {
        version: '1.0',
        buildDate: new Date().toISOString(),
        ngramCount: ngramArray.length,
        totalProcessed: this.stats.processed,
        buildTimeMs: Math.round(performance.now() - this.stats.startTime),
        description: 'Game-relevant n-grams with PMI scores for PhraseMachine v2'
      },
      ngrams: ngramArray,
      wordCounts: Object.fromEntries(this.wordCounts)
    };

    const jsonData = JSON.stringify(essentials, null, 2);
    fs.writeFileSync(this.outputFile, jsonData);

    const fileSizeMB = (fs.statSync(this.outputFile).size / 1024 / 1024).toFixed(2);
    console.log(`✅ Saved ${ngramArray.length} n-grams to ${this.outputFile}`);
    console.log(`📦 File size: ${fileSizeMB} MB`);

    return {
      ngramCount: ngramArray.length,
      fileSizeMB: parseFloat(fileSizeMB),
      outputFile: this.outputFile
    };
  }

  /**
   * Log current progress
   */
  logProgress() {
    const elapsed = Math.round((performance.now() - this.stats.startTime) / 1000);
    const rate = Math.round(this.stats.processed / elapsed);
    
    console.log(`📊 Progress: ${this.stats.processed} processed, ${this.stats.kept} kept, ${this.stats.skipped} skipped (${rate}/s)`);
  }

  /**
   * Main build process
   */
  async build() {
    try {
      await this.initialize();
      
      this.generateGameNgrams();
      this.calculatePMI();
      const result = await this.saveNgrams();
      
      console.log('🎉 N-gram essentials build complete!');
      console.log(`📊 Final stats: ${result.ngramCount} n-grams, ${result.fileSizeMB} MB`);
      
      return result;

    } catch (error) {
      console.error('❌ Build failed:', error);
      throw error;
    }
  }
}

// CLI execution
if (require.main === module) {
  const builder = new NgramEssentialsBuilder();
  
  // Check for test mode
  const isTestMode = process.argv.includes('--test');
  if (isTestMode) {
    console.log('🧪 Running in TEST mode');
    builder.outputFile = path.join(builder.outputDir, 'ngrams_game_test.json');
    
    // Limit categories for test
    builder.gameCategories = {
      entertainment: builder.gameCategories.entertainment.slice(0, 5),
      food: builder.gameCategories.food.slice(0, 5)
    };
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

module.exports = NgramEssentialsBuilder;