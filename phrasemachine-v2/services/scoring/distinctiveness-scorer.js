const WikidataProcessor = require('../distinctiveness/wikidata-processor');
const NgramProcessor = require('../distinctiveness/ngram-processor');
const natural = require('natural');

/**
 * DistinctivenessScorer - Unified scoring service combining Wikidata, PMI, and WordNet scoring into a single service.
 * Implements the complete distinctiveness scoring algorithm (0-25 points)
 */
class DistinctivenessScorer {
  constructor(options = {}) {
    this.wikidataProcessor = new WikidataProcessor(options.wikidata);
    this.ngramProcessor = new NgramProcessor(options.ngram);
    this.wordNet = natural.WordNet;
    this.processedCount = 0;
    
    // Scoring bands according to algorithm specification
    this.SCORING = {
      EXACT_WIKIDATA_MATCH: 25,      // Exact Wikidata/Wikipedia title match
      WIKIPEDIA_REDIRECT: 20,        // Wikipedia redirect/alias
      PMI_HIGH: 15,                  // PMI ≥ 4 (Google Books 2-4-gram)
      WORDNET_MULTIWORD: 10,         // Multi-word entry in WordNet/M-Webster
      NO_MATCH: 0                    // Otherwise
    };
  }

  /**
   * Initialize all processors
   */
  async initialize() {
    console.log('🔄 Initializing DistinctivenessScorer...');
    
    try {
      // Initialize Wikidata processor
      const wikidataConnected = await this.wikidataProcessor.initRedis();
      if (!wikidataConnected) {
        console.warn('⚠️ Wikidata processor not connected - Wikidata scoring disabled');
      }
      
      // Initialize N-gram processor
      const ngramConnected = await this.ngramProcessor.initRedis();
      if (!ngramConnected) {
        console.warn('⚠️ N-gram processor not connected - PMI scoring disabled');
      }
      
      console.log('✅ DistinctivenessScorer initialized');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to initialize DistinctivenessScorer:', error.message);
      return false;
    }
  }

  /**
   * Score phrase distinctiveness using all available methods
   * Returns highest applicable score (25/20/15/10/0 points)
   */
  async scoreDistinctiveness(phrase) {
    const startTime = Date.now();
    const normalizedPhrase = phrase.toLowerCase().trim();
    
    console.log(`🔍 Scoring distinctiveness for: "${phrase}"`);
    
    const result = {
      phrase: normalizedPhrase,
      score: 0,
      scoring_method: 'no_match',
      components: {
        wikidata: null,
        pmi: null, 
        wordnet: null
      },
      duration_ms: 0,
      timestamp: new Date().toISOString()
    };
    
    try {
      // 1. Check for exact Wikidata/Wikipedia title match (25 points)
      const wikidataResult = await this.checkWikidataMatch(normalizedPhrase);
      result.components.wikidata = wikidataResult;
      
      if (wikidataResult.score === this.SCORING.EXACT_WIKIDATA_MATCH) {
        result.score = this.SCORING.EXACT_WIKIDATA_MATCH;
        result.scoring_method = 'exact_wikidata_match';
        result.duration_ms = Date.now() - startTime;
        
        console.log(`   ✅ Exact Wikidata match: ${result.score}/25 points`);
        return result;
      }
      
      // 2. Check for Wikipedia redirect/alias (20 points)
      if (wikidataResult.score === this.SCORING.WIKIPEDIA_REDIRECT) {
        result.score = this.SCORING.WIKIPEDIA_REDIRECT;
        result.scoring_method = 'wikipedia_redirect';
        result.duration_ms = Date.now() - startTime;
        
        console.log(`   ✅ Wikipedia redirect/alias: ${result.score}/25 points`);
        return result;
      }
      
      // 3. Check PMI from Google Books (15 points for PMI ≥ 4)
      const pmiResult = await this.checkPMIScore(normalizedPhrase);
      result.components.pmi = pmiResult;
      
      if (pmiResult.score >= this.SCORING.PMI_HIGH) {
        result.score = this.SCORING.PMI_HIGH;
        result.scoring_method = 'pmi_high';
        result.duration_ms = Date.now() - startTime;
        
        console.log(`   ✅ High PMI (${pmiResult.pmi}): ${result.score}/25 points`);
        return result;
      }
      
      // 4. Check WordNet multi-word entry (10 points)
      const wordnetResult = await this.checkWordNetMultiword(normalizedPhrase);
      result.components.wordnet = wordnetResult;
      
      if (wordnetResult.score === this.SCORING.WORDNET_MULTIWORD) {
        result.score = this.SCORING.WORDNET_MULTIWORD;
        result.scoring_method = 'wordnet_multiword';
        result.duration_ms = Date.now() - startTime;
        
        console.log(`   ✅ WordNet multi-word: ${result.score}/25 points`);
        return result;
      }
      
      // 5. No distinctiveness match found (0 points)
      result.score = this.SCORING.NO_MATCH;
      result.scoring_method = 'no_match';
      result.duration_ms = Date.now() - startTime;
      
      console.log(`   ❌ No distinctiveness match: ${result.score}/25 points`);
      return result;
      
    } catch (error) {
      console.error(`❌ Error scoring "${phrase}":`, error.message);
      
      result.score = 0;
      result.scoring_method = 'error';
      result.error = error.message;
      result.duration_ms = Date.now() - startTime;
      
      return result;
    }
  }

  /**
   * Check Wikidata for exact matches and redirects/aliases
   */
  async checkWikidataMatch(phrase) {
    try {
      const wikidataResult = await this.wikidataProcessor.checkDistinctiveness(phrase);
      
      if (wikidataResult.type === 'exact_match') {
        return {
          score: this.SCORING.EXACT_WIKIDATA_MATCH,
          type: 'exact_match',
          entity_id: wikidataResult.entity_id,
          sitelinks: wikidataResult.sitelinks,
          duration_ms: wikidataResult.duration_ms
        };
      } else if (wikidataResult.type === 'alias_match') {
        return {
          score: this.SCORING.WIKIPEDIA_REDIRECT,
          type: 'alias_match',
          entity_id: wikidataResult.entity_id,
          alias: wikidataResult.alias,
          duration_ms: wikidataResult.duration_ms
        };
      } else {
        return {
          score: 0,
          type: 'not_found',
          duration_ms: wikidataResult.duration_ms
        };
      }
    } catch (error) {
      console.warn('⚠️ Wikidata check failed:', error.message);
      return {
        score: 0,
        type: 'error',
        error: error.message,
        duration_ms: 0
      };
    }
  }

  /**
   * Check PMI score from Google Books N-grams
   */
  async checkPMIScore(phrase) {
    try {
      const pmiResult = await this.ngramProcessor.calculatePMI(phrase);
      
      // PMI ≥ 4 gets 15 points according to algorithm
      if (pmiResult.pmi >= 4.0) {
        return {
          score: this.SCORING.PMI_HIGH,
          pmi: pmiResult.pmi,
          type: 'pmi_calculated',
          phrase_count: pmiResult.phrase_count,
          duration_ms: pmiResult.duration_ms
        };
      } else {
        return {
          score: 0,
          pmi: pmiResult.pmi,
          type: pmiResult.type,
          phrase_count: pmiResult.phrase_count || 0,
          duration_ms: pmiResult.duration_ms
        };
      }
    } catch (error) {
      console.warn('⚠️ PMI check failed:', error.message);
      return {
        score: 0,
        pmi: 0,
        type: 'error',
        error: error.message,
        duration_ms: 0
      };
    }
  }

  /**
   * Check WordNet for multi-word entries
   */
  async checkWordNetMultiword(phrase) {
    const startTime = Date.now();
    
    try {
      // Only check phrases with 2-4 words
      const words = phrase.split(' ');
      if (words.length < 2 || words.length > 4) {
        return {
          score: 0,
          type: 'invalid_word_count',
          word_count: words.length,
          duration_ms: Date.now() - startTime
        };
      }
      
      // Check if phrase exists as a multi-word entry in WordNet
      const lookupPromise = new Promise((resolve, reject) => {
        const joinedPhrase = words.join('_'); // WordNet uses underscores
        
        this.wordNet.lookup(joinedPhrase, (results) => {
          if (results && results.length > 0) {
            // Found multi-word entry
            resolve({
              score: this.SCORING.WORDNET_MULTIWORD,
              type: 'multiword_entry_found',
              synsets: results.length,
              definitions: results.slice(0, 2).map(r => r.def), // First 2 definitions
              duration_ms: Date.now() - startTime
            });
          } else {
            // Not found as multi-word entry
            resolve({
              score: 0,
              type: 'multiword_entry_not_found',
              lookup_phrase: joinedPhrase,
              duration_ms: Date.now() - startTime
            });
          }
        });
        
        // Timeout after 1 second
        setTimeout(() => {
          reject(new Error('WordNet lookup timeout'));
        }, 1000);
      });
      
      return await lookupPromise;
      
    } catch (error) {
      console.warn('⚠️ WordNet check failed:', error.message);
      return {
        score: 0,
        type: 'error',
        error: error.message,
        duration_ms: Date.now() - startTime
      };
    }
  }

  /**
   * Batch score multiple phrases for distinctiveness
   */
  async batchScoreDistinctiveness(phrases) {
    const startTime = Date.now();
    
    console.log(`🔍 Batch scoring ${phrases.length} phrases for distinctiveness...`);
    
    const results = [];
    let totalScore = 0;
    let avgDuration = 0;
    
    for (const phrase of phrases) {
      if (typeof phrase === 'string' && phrase.length >= 2 && phrase.length <= 100) {
        const result = await this.scoreDistinctiveness(phrase);
        results.push(result);
        totalScore += result.score;
        avgDuration += result.duration_ms;
      } else {
        results.push({
          phrase,
          score: 0,
          scoring_method: 'invalid_phrase',
          error: 'Invalid phrase format',
          duration_ms: 0
        });
      }
    }
    
    const totalDuration = Date.now() - startTime;
    avgDuration = avgDuration / results.length;
    
    // Calculate distribution statistics
    const distribution = {
      exact_wikidata: results.filter(r => r.score === 25).length,
      wikipedia_redirect: results.filter(r => r.score === 20).length,
      pmi_high: results.filter(r => r.score === 15).length,
      wordnet_multiword: results.filter(r => r.score === 10).length,
      no_match: results.filter(r => r.score === 0).length
    };
    
    console.log(`✅ Batch scoring complete:`);
    console.log(`   📊 Distribution: ${distribution.exact_wikidata} exact, ${distribution.wikipedia_redirect} redirect, ${distribution.pmi_high} PMI, ${distribution.wordnet_multiword} WordNet, ${distribution.no_match} none`);
    console.log(`   ⏱️ Average duration: ${avgDuration.toFixed(1)}ms per phrase`);
    
    return {
      results,
      summary: {
        total_phrases: phrases.length,
        avg_score: Math.round((totalScore / phrases.length) * 100) / 100,
        avg_duration_ms: Math.round(avgDuration),
        total_duration_ms: totalDuration,
        distribution,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Get scoring statistics
   */
  async getStats() {
    try {
      const wikidataStats = await this.wikidataProcessor.getStats();
      const ngramStats = await this.ngramProcessor.getStats();
      
      return {
        service: 'distinctiveness_scorer',
        components: {
          wikidata: wikidataStats,
          ngram: ngramStats,
          wordnet: {
            available: true,
            description: 'Natural WordNet integration for multi-word entries'
          }
        },
        scoring_bands: this.SCORING,
        processed_count: this.processedCount,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error getting stats:', error);
      return { 
        service: 'distinctiveness_scorer',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Close all processor connections
   */
  async close() {
    console.log('🔌 Closing DistinctivenessScorer...');
    
    try {
      await this.wikidataProcessor.close();
      await this.ngramProcessor.close();
      console.log('✅ DistinctivenessScorer closed');
    } catch (error) {
      console.error('❌ Error closing DistinctivenessScorer:', error.message);
    }
  }
}

module.exports = DistinctivenessScorer; 