const ConcretenessProcessor = require('../describability/concreteness-processor');
const natural = require('natural');

/**
 * DescribabilityScorer - Unified scoring service for phrase describability (0-25 points)
 * Implements the complete describability scoring algorithm combining:
 * - Concreteness scoring (15/8/0 points for ≥4.0/3.0-3.9/<3.0)
 * - Proper noun detection (+5 points for PERSON/ORG/GPE)
 * - Weak-head noun pattern detection (-10 points for abstract patterns)
 */
class DescribabilityScorer {
  constructor(options = {}) {
    this.concretenessProcessor = new ConcretenessProcessor(options.concreteness);
    this.processedCount = 0;
    
    // Scoring bands according to algorithm specification
    this.SCORING = {
      CONCRETENESS_HIGH: 15,     // Concreteness ≥ 4.0 (Brysbaert norms)
      CONCRETENESS_MEDIUM: 8,    // Concreteness 3.0-3.9
      CONCRETENESS_LOW: 0,       // Concreteness < 3.0
      PROPER_NOUN_BONUS: 5,      // Contains proper noun (PERSON/ORG/GPE)
      WEAK_HEAD_PENALTY: -10     // Weak-head noun pattern penalty
    };
    
    // Weak-head noun patterns that get penalized (-10 points)
    // These are abstract, hard-to-describe head nouns
    this.WEAK_HEAD_PATTERNS = new Set([
      'strategy', 'fail', 'vibe', 'energy', 'situation', 'culture', 
      'content', 'trend', 'moment', 'feeling', 'mood', 'atmosphere',
      'experience', 'concept', 'idea', 'approach', 'method', 'technique',
      'style', 'way', 'manner', 'thing', 'stuff', 'aspect', 'element',
      'factor', 'issue', 'problem', 'solution', 'opportunity', 'challenge',
      'potential', 'possibility', 'chance', 'option', 'choice', 'decision',
      'process', 'system', 'structure', 'framework', 'model', 'pattern',
      'trend', 'movement', 'shift', 'change', 'development', 'progress',
      'growth', 'improvement', 'enhancement', 'upgrade', 'update',
      'version', 'edition', 'release', 'launch', 'debut', 'introduction'
    ]);
    
    // Simple NER patterns for proper noun detection
    // Since SpaCy is heavy, we'll use pattern-based detection for now
    this.PROPER_NOUN_PATTERNS = {
      // Person names (common patterns)
      PERSON: [
        /\b[A-Z][a-z]+ [A-Z][a-z]+\b/,  // "John Smith" pattern
        /\b(Mr|Mrs|Ms|Dr|Prof)\. [A-Z][a-z]+/,  // Title + name
        /\b[A-Z][a-z]+('s)?\b/  // Single capitalized word (possessive optional)
      ],
      // Organization names
      ORG: [
        /\b[A-Z][a-z]+ (Inc|Corp|Ltd|LLC|Co|Company|Corporation|Group|Team|Band|Club)\b/,
        /\b(Apple|Google|Microsoft|Amazon|Facebook|Netflix|Disney|McDonald's|Starbucks|Nike|Adidas|Toyota|Ford|BMW|Mercedes|Samsung|Sony|Intel|IBM|Oracle|Cisco|Adobe|Tesla|SpaceX|NASA|FBI|CIA|NBA|NFL|MLB|NHL|FIFA|Olympics|Broadway|Hollywood|Marvel|DC|Nintendo|PlayStation|Xbox|Instagram|Twitter|YouTube|LinkedIn|TikTok|Snapchat|WhatsApp|Uber|Airbnb|PayPal|eBay|Walmart|Target|Costco|Home Depot|Best Buy|GameStop|Blockbuster|RadioShack|Circuit City|Borders|Tower Records|Virgin|EMI|Warner|Universal|Columbia|Paramount|20th Century Fox|MGM|DreamWorks|Pixar|Lucasfilm|EA|Activision|Blizzard|Ubisoft|Square Enix|Capcom|Konami|Sega|Atari|Namco|Bandai)\b/i
      ],
      // Geographic/Political entities
      GPE: [
        /\b(United States|America|USA|UK|Britain|England|France|Germany|Italy|Spain|Russia|China|Japan|India|Brazil|Canada|Australia|Mexico|Argentina|Chile|Peru|Colombia|Venezuela|Egypt|Nigeria|South Africa|Kenya|Morocco|Thailand|Vietnam|Philippines|Indonesia|Malaysia|Singapore|Hong Kong|Taiwan|South Korea|North Korea|Israel|Palestine|Iran|Iraq|Afghanistan|Pakistan|Turkey|Greece|Poland|Czech Republic|Hungary|Romania|Bulgaria|Croatia|Serbia|Bosnia|Montenegro|Albania|Macedonia|Slovenia|Slovakia|Estonia|Latvia|Lithuania|Belarus|Ukraine|Moldova|Georgia|Armenia|Azerbaijan|Kazakhstan|Uzbekistan|Kyrgyzstan|Tajikistan|Turkmenistan|Mongolia|Nepal|Bhutan|Bangladesh|Sri Lanka|Maldives|Myanmar|Laos|Cambodia|Brunei|East Timor|Papua New Guinea|Samoa|Fiji|Tonga|Vanuatu|Solomon Islands|New Zealand|Iceland|Ireland|Scotland|Wales|Northern Ireland|Norway|Sweden|Finland|Denmark|Netherlands|Belgium|Luxembourg|Switzerland|Austria|Liechtenstein|Monaco|San Marino|Vatican|Andorra|Malta|Cyprus)\b/i,
        /\b(New York|Los Angeles|Chicago|Houston|Phoenix|Philadelphia|San Antonio|San Diego|Dallas|San Jose|Austin|Jacksonville|Fort Worth|Columbus|Charlotte|San Francisco|Indianapolis|Seattle|Denver|Boston|Nashville|Memphis|Portland|Oklahoma City|Las Vegas|Baltimore|Louisville|Milwaukee|Albuquerque|Tucson|Fresno|Sacramento|Mesa|Kansas City|Atlanta|Long Beach|Colorado Springs|Raleigh|Miami|Virginia Beach|Omaha|Oakland|Minneapolis|Tulsa|Arlington|Tampa|New Orleans|Wichita|Cleveland|Bakersfield|Aurora|Anaheim|Honolulu|Santa Ana|Riverside|Corpus Christi|Lexington|Stockton|Henderson|Saint Paul|St\. Louis|Cincinnati|Pittsburgh|Greensboro|Lincoln|Plano|Anchorage|Orlando|Irvine|Newark|Toledo|Durham|Chula Vista|Fort Wayne|Jersey City|St\. Petersburg|Laredo|Madison|Chandler|Buffalo|Lubbock|Scottsdale|Reno|Glendale|Gilbert|Winston-Salem|North Las Vegas|Norfolk|Chesapeake|Garland|Irving|Hialeah|Fremont|Boise|Richmond|Baton Rouge|Spokane|Des Moines|Modesto|Fayetteville|Tacoma|Oxnard|Fontana|Columbus|Montgomery|Moreno Valley|Shreveport|Aurora|Yonkers|Akron|Huntington Beach|Little Rock|Augusta|Amarillo|Glendale|Mobile|Grand Rapids|Salt Lake City|Tallahassee|Huntsville|Grand Prairie|Knoxville|Worcester|Newport News|Brownsville|Overland Park|Santa Clarita|Providence|Garden Grove|Chattanooga|Oceanside|Jackson|Fort Lauderdale|Santa Rosa|Rancho Cucamonga|Port St\. Lucie|Tempe|Ontario|Vancouver|Springfield|Lancaster|Eugene|Pembroke Pines|Salem|Cape Coral|Peoria|Sioux Falls|Springfield|Elk Grove|Rockford|Palmdale|Corona|Salinas|Pomona|Pasadena|Joliet|Paterson|Torrance|Bridgeport|Hayward|Lakewood|Hollywood|Sunnyvale|Naperville|Syracuse|Mesquite|Dayton|New Haven|Thornton|Fullerton|Roseville|Carrollton|Waco|Sterling Heights|West Valley City|Columbia|Warren|Hampton|Olathe|Orange|Waterbury|Davie|Miami Gardens|West Jordan|Boulder|Denton|Midland|High Point|Miami Beach|Temecula|Antioch|West Palm Beach|McKinney|Clearwater|Westminster|Evansville|Arvada|Allentown|Cary|Rochester|Murfreesboro|Lowell|Independence|Gresham|West Covina)\b/i,
        /\b[A-Z][a-z]+ (City|Town|Village|County|State|Province|Region|Territory|District|Area|Zone|Sector|Neighborhood|Quarter|Ward)\b/
      ]
    };
  }

  /**
   * Initialize the describability scorer (auto-detects Redis vs JSON mode)
   */
  async initialize() {
    console.log('🔄 Initializing DescribabilityScorer...');
    
    try {
      // Initialize concreteness processor (auto-detects Redis vs JSON mode)
      const concretenessConnected = await this.concretenessProcessor.initialize();
      if (!concretenessConnected) {
        console.warn('⚠️ Concreteness processor not connected - concreteness scoring disabled');
      }
      
      console.log('✅ DescribabilityScorer initialized');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to initialize DescribabilityScorer:', error.message);
      return false;
    }
  }

  /**
   * Score phrase describability using all available methods
   * Returns total describability score (0-25 points max)
   */
  async scoreDescribability(phrase) {
    const startTime = Date.now();
    const normalizedPhrase = phrase.toLowerCase().trim();
    
    console.log(`🔍 Scoring describability for: "${phrase}"`);
    
    const result = {
      phrase: normalizedPhrase,
      total_score: 0,
      components: {
        concreteness: null,
        proper_noun: null,
        weak_head: null
      },
      breakdown: {
        concreteness_points: 0,
        proper_noun_points: 0,
        weak_head_points: 0
      },
      duration_ms: 0,
      timestamp: new Date().toISOString()
    };
    
    try {
      // 1. Score concreteness (0-15 points)
      const concretenessResult = await this.scoreConcreteness(normalizedPhrase);
      result.components.concreteness = concretenessResult;
      result.breakdown.concreteness_points = concretenessResult.points;
      
      console.log(`   📊 Concreteness: ${concretenessResult.points}/15 points (${concretenessResult.band})`);
      
      // 2. Check for proper nouns (+5 points)
      const properNounResult = this.detectProperNouns(phrase); // Use original case
      result.components.proper_noun = properNounResult;
      result.breakdown.proper_noun_points = properNounResult.points;
      
      console.log(`   👤 Proper noun: ${properNounResult.points > 0 ? '+' : ''}${properNounResult.points}/5 points (${properNounResult.detected.length} found)`);
      
      // 3. Check for weak-head patterns (-10 points)
      const weakHeadResult = this.detectWeakHeadPatterns(normalizedPhrase);
      result.components.weak_head = weakHeadResult;
      result.breakdown.weak_head_points = weakHeadResult.points;
      
      console.log(`   ❌ Weak-head: ${weakHeadResult.points < 0 ? '' : '+'}${weakHeadResult.points}/0 points (${weakHeadResult.patterns_found.length} patterns)`);
      
      // 4. Calculate total score
      result.total_score = Math.max(0, 
        result.breakdown.concreteness_points + 
        result.breakdown.proper_noun_points + 
        result.breakdown.weak_head_points
      );
      
      result.duration_ms = Date.now() - startTime;
      
      console.log(`   🎯 Total describability: ${result.total_score}/25 points`);
      
      this.processedCount++;
      return result;
      
    } catch (error) {
      console.error(`❌ Error scoring describability for "${phrase}":`, error.message);
      
      result.total_score = 0;
      result.error = error.message;
      result.duration_ms = Date.now() - startTime;
      
      return result;
    }
  }

  /**
   * Score concreteness using Brysbaert norms
   */
  async scoreConcreteness(phrase) {
    try {
      const concretenessResult = await this.concretenessProcessor.scoreConcreteness(phrase);
      
      // Convert concreteness result to describability points
      let points = 0;
      let band = 'unknown';
      
      if (concretenessResult.concreteness >= 4.0) {
        points = this.SCORING.CONCRETENESS_HIGH;  // 15 points
        band = 'high';
      } else if (concretenessResult.concreteness >= 3.0) {
        points = this.SCORING.CONCRETENESS_MEDIUM; // 8 points
        band = 'medium';
      } else {
        points = this.SCORING.CONCRETENESS_LOW;    // 0 points
        band = 'low';
      }
      
      return {
        points,
        band,
        concreteness_score: concretenessResult.concreteness,
        word_scores: concretenessResult.word_scores,
        words_found: concretenessResult.words_found,
        duration_ms: concretenessResult.duration_ms
      };
    } catch (error) {
      console.warn('⚠️ Concreteness scoring failed:', error.message);
      return {
        points: 0,
        band: 'error',
        error: error.message,
        duration_ms: 0
      };
    }
  }

  /**
   * Detect proper nouns using pattern matching
   * Returns +5 points if any proper nouns found
   */
  detectProperNouns(phrase) {
    const startTime = Date.now();
    const detected = [];
    
    try {
      // Check each pattern type
      for (const [entityType, patterns] of Object.entries(this.PROPER_NOUN_PATTERNS)) {
        for (const pattern of patterns) {
          const matches = phrase.match(pattern);
          if (matches) {
            detected.push({
              type: entityType,
              text: matches[0],
              pattern: pattern.toString()
            });
          }
        }
      }
      
      // Remove duplicates
      const uniqueDetected = detected.filter((item, index, arr) => 
        arr.findIndex(other => other.text === item.text) === index
      );
      
      const points = uniqueDetected.length > 0 ? this.SCORING.PROPER_NOUN_BONUS : 0;
      
      return {
        points,
        detected: uniqueDetected,
        duration_ms: Date.now() - startTime
      };
    } catch (error) {
      console.warn('⚠️ Proper noun detection failed:', error.message);
      return {
        points: 0,
        detected: [],
        error: error.message,
        duration_ms: Date.now() - startTime
      };
    }
  }

  /**
   * Detect weak-head noun patterns
   * Returns -10 points if any weak-head patterns found
   */
  detectWeakHeadPatterns(phrase) {
    const startTime = Date.now();
    const patternsFound = [];
    
    try {
      const words = phrase.toLowerCase().split(/\s+/);
      
      // Check each word against weak-head patterns
      for (const word of words) {
        // Remove punctuation and check
        const cleanWord = word.replace(/[^\w]/g, '');
        if (this.WEAK_HEAD_PATTERNS.has(cleanWord)) {
          patternsFound.push({
            word: cleanWord,
            position: words.indexOf(word),
            original: word
          });
        }
      }
      
      // Also check for head noun patterns (last significant word)
      const lastWord = words[words.length - 1]?.replace(/[^\w]/g, '');
      if (lastWord && this.WEAK_HEAD_PATTERNS.has(lastWord) && 
          !patternsFound.some(p => p.word === lastWord)) {
        patternsFound.push({
          word: lastWord,
          position: words.length - 1,
          original: words[words.length - 1],
          is_head_noun: true
        });
      }
      
      const points = patternsFound.length > 0 ? this.SCORING.WEAK_HEAD_PENALTY : 0;
      
      return {
        points,
        patterns_found: patternsFound,
        duration_ms: Date.now() - startTime
      };
    } catch (error) {
      console.warn('⚠️ Weak-head pattern detection failed:', error.message);
      return {
        points: 0,
        patterns_found: [],
        error: error.message,
        duration_ms: Date.now() - startTime
      };
    }
  }

  /**
   * Batch score multiple phrases for describability
   */
  async batchScoreDescribability(phrases) {
    const startTime = Date.now();
    
    console.log(`🔍 Batch scoring ${phrases.length} phrases for describability...`);
    
    const results = [];
    let totalScore = 0;
    let avgDuration = 0;
    
    for (const phrase of phrases) {
      if (typeof phrase === 'string' && phrase.length >= 2 && phrase.length <= 100) {
        const result = await this.scoreDescribability(phrase);
        results.push(result);
        totalScore += result.total_score;
        avgDuration += result.duration_ms;
      } else {
        results.push({
          phrase,
          total_score: 0,
          error: 'Invalid phrase format',
          duration_ms: 0
        });
      }
    }
    
    const totalDuration = Date.now() - startTime;
    avgDuration = avgDuration / results.length;
    
    // Calculate distribution statistics
    const distribution = {
      high_describability: results.filter(r => r.total_score >= 15).length,
      medium_describability: results.filter(r => r.total_score >= 8 && r.total_score < 15).length,
      low_describability: results.filter(r => r.total_score >= 1 && r.total_score < 8).length,
      no_describability: results.filter(r => r.total_score === 0).length
    };
    
    console.log(`✅ Batch scoring complete:`);
    console.log(`   📊 Distribution: ${distribution.high_describability} high, ${distribution.medium_describability} medium, ${distribution.low_describability} low, ${distribution.no_describability} none`);
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
      const concretenessStats = await this.concretenessProcessor.getStats();
      
      return {
        service: 'describability_scorer',
        components: {
          concreteness: concretenessStats,
          proper_noun: {
            available: true,
            patterns: Object.keys(this.PROPER_NOUN_PATTERNS).length,
            entity_types: Object.keys(this.PROPER_NOUN_PATTERNS)
          },
          weak_head: {
            available: true,
            patterns_count: this.WEAK_HEAD_PATTERNS.size,
            sample_patterns: Array.from(this.WEAK_HEAD_PATTERNS).slice(0, 10)
          }
        },
        scoring_bands: this.SCORING,
        processed_count: this.processedCount,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error getting stats:', error);
      return { 
        service: 'describability_scorer',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Close processor connections
   */
  async close() {
    console.log('🔌 Closing DescribabilityScorer...');
    
    try {
      await this.concretenessProcessor.close();
      console.log('✅ DescribabilityScorer closed');
    } catch (error) {
      console.error('❌ Error closing DescribabilityScorer:', error.message);
    }
  }
}

module.exports = DescribabilityScorer; 