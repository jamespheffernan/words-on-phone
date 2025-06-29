/**
 * Quality Pipeline for Phrase Generation
 * 
 * Integrates phrase scoring, filtering, and quality control
 * Uses the existing PhraseScorer from the main app
 */

const path = require('path');

// Import PhraseScorer from the main app (we'll need to reference it correctly)
// For now, we'll create a simplified version based on the existing scoring logic

class QualityPipeline {
  constructor(options = {}) {
    this.qualityThresholds = {
      autoAccept: options.autoAccept || 60,
      manualReview: options.manualReview || 40,
      autoReject: options.autoReject || 40
    };
    this.debug = options.debug || false;
  }

  /**
   * Process a batch of phrases through the quality pipeline
   * @param {string[]} phrases - Raw phrases from AI
   * @param {string} category - Category for context
   * @param {string} service - AI service used ('openai' or 'gemini')
   * @param {string} modelId - Model ID used for generation
   * @returns {Promise<Object>} Processing results
   */
  async processBatch(phrases, category, service = 'openai', modelId = null) {
    if (this.debug) {
      console.log(`🔄 Processing ${phrases.length} phrases for "${category}"...`);
    }

    const results = {
      input: {
        count: phrases.length,
        category,
        service,
        modelId
      },
      processed: [],
      summary: {
        autoAccepted: 0,
        needsReview: 0,
        autoRejected: 0,
        averageScore: 0,
        processingTime: 0
      }
    };

    const startTime = Date.now();

    for (const phrase of phrases) {
      try {
        const processed = await this.processSinglePhrase(phrase, category, service, modelId);
        results.processed.push(processed);

        // Update summary counts
        if (processed.decision === 'accept') {
          results.summary.autoAccepted++;
        } else if (processed.decision === 'review') {
          results.summary.needsReview++;
        } else {
          results.summary.autoRejected++;
        }
      } catch (error) {
        if (this.debug) {
          console.warn(`⚠️  Failed to process phrase "${phrase}":`, error.message);
        }
        
        results.processed.push({
          phrase: phrase,
          score: 0,
          decision: 'reject',
          reason: `Processing error: ${error.message}`,
          category,
          sourceProvider: service,
          modelId
        });
        results.summary.autoRejected++;
      }
    }

    // Calculate average score
    const validScores = results.processed
      .map(p => p.score)
      .filter(score => score > 0);
    
    results.summary.averageScore = validScores.length > 0 
      ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
      : 0;

    results.summary.processingTime = Date.now() - startTime;

    if (this.debug) {
      console.log(`✅ Processed batch: ${results.summary.autoAccepted} accepted, ${results.summary.needsReview} review, ${results.summary.autoRejected} rejected`);
      console.log(`📊 Average score: ${results.summary.averageScore}/100`);
    }

    return results;
  }

  /**
   * Process a single phrase through quality scoring
   * @param {string} phrase - The phrase to score
   * @param {string} category - Category context
   * @param {string} service - AI service used
   * @param {string} modelId - Model ID used
   * @returns {Promise<Object>} Processed phrase with score and decision
   */
  async processSinglePhrase(phrase, category, service = 'openai', modelId = null) {
    // For now, use a simplified scoring algorithm
    // In production, this would use the full PhraseScorer from the main app
    const score = await this.scorePhrase(phrase, category);
    
    const processed = {
      phrase: phrase.trim(),
      score,
      category,
      decision: this.makeDecision(score),
      reason: this.getDecisionReason(score),
      sourceProvider: service,
      modelId,
      timestamp: new Date().toISOString()
    };

    return processed;
  }

  /**
   * Simplified phrase scoring (placeholder for full PhraseScorer integration)
   * @param {string} phrase - Phrase to score
   * @param {string} category - Category context
   * @returns {Promise<number>} Score 0-100
   */
  async scorePhrase(phrase, category) {
    // This is a simplified scoring algorithm
    // In the full implementation, we'd use the PhraseScorer from the main app
    
    let score = 50; // Base score
    
    // Length scoring (optimal 2-4 words, 8-20 characters)
    const wordCount = phrase.split(' ').length;
    const charCount = phrase.length;
    
    if (wordCount >= 2 && wordCount <= 4 && charCount >= 8 && charCount <= 20) {
      score += 20;
    } else if (wordCount === 1 || wordCount > 6) {
      score -= 15;
    }
    
    // Complexity scoring (avoid too many syllables)
    const syllableCount = this.estimateSyllables(phrase);
    if (syllableCount <= 6) {
      score += 10;
    } else {
      score -= 10;
    }
    
    // Category relevance (basic keyword matching)
    if (this.hasRelevantKeywords(phrase, category)) {
      score += 15;
    }
    
    // Common phrase detection (avoid overly generic phrases)
    if (this.isCommonPhrase(phrase)) {
      score -= 20;
    }
    
    // Inappropriate content detection
    if (this.hasInappropriateContent(phrase)) {
      score -= 50;
    }
    
    // Pop culture bonus for entertainment categories
    if (this.isEntertainmentCategory(category) && this.hasPopCultureRelevance(phrase)) {
      score += 10;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Make accept/review/reject decision based on score
   * @param {number} score - Quality score 0-100
   * @returns {string} Decision: 'accept', 'review', or 'reject'
   */
  makeDecision(score) {
    if (score >= this.qualityThresholds.autoAccept) {
      return 'accept';
    } else if (score >= this.qualityThresholds.manualReview) {
      return 'review';
    } else {
      return 'reject';
    }
  }

  /**
   * Get human-readable reason for decision
   * @param {number} score - Quality score
   * @returns {string} Decision reason
   */
  getDecisionReason(score) {
    if (score >= 80) {
      return 'Excellent quality - clearly recognizable and perfect for parties';
    } else if (score >= 60) {
      return 'Good quality - solid gameplay phrase';
    } else if (score >= 40) {
      return 'Borderline quality - manual review recommended';
    } else if (score >= 20) {
      return 'Poor quality - likely too obscure for party games';
    } else {
      return 'Very poor quality - inappropriate or too technical';
    }
  }

  // Helper methods for scoring
  
  estimateSyllables(phrase) {
    // Simplified syllable estimation
    return phrase.toLowerCase().replace(/[^a-z]/g, '').match(/[aeiouy]+/g)?.length || 1;
  }
  
  hasRelevantKeywords(phrase, category) {
    const keywords = {
      'Movies & TV': ['movie', 'film', 'show', 'series', 'actor', 'director', 'netflix', 'disney'],
      'Music & Artists': ['song', 'album', 'band', 'singer', 'music', 'concert', 'guitar', 'piano'],
      'Sports & Athletes': ['game', 'team', 'player', 'sport', 'ball', 'olympic', 'champion', 'coach'],
      'Food & Drink': ['food', 'eat', 'drink', 'restaurant', 'cooking', 'recipe', 'kitchen', 'meal'],
      'Places & Travel': ['city', 'country', 'travel', 'vacation', 'beach', 'mountain', 'hotel', 'airport'],
      'Famous People': ['president', 'author', 'scientist', 'artist', 'celebrity', 'leader', 'inventor'],
      'Technology & Science': ['computer', 'phone', 'app', 'internet', 'science', 'tech', 'digital'],
      'History & Events': ['war', 'battle', 'ancient', 'revolution', 'empire', 'historical', 'century'],
      'Nature & Animals': ['animal', 'bird', 'dog', 'cat', 'wild', 'forest', 'ocean', 'nature']
    };
    
    const categoryKeywords = keywords[category] || [];
    const phraseLower = phrase.toLowerCase();
    
    return categoryKeywords.some(keyword => phraseLower.includes(keyword));
  }
  
  isCommonPhrase(phrase) {
    const commonPhrases = [
      'the thing', 'something', 'that thing', 'you know', 'whatever',
      'some guy', 'that person', 'this place', 'over there'
    ];
    
    return commonPhrases.some(common => phrase.toLowerCase().includes(common));
  }
  
  hasInappropriateContent(phrase) {
    const inappropriate = [
      'war', 'kill', 'death', 'murder', 'violence', 'hate', 'racist',
      'sexual', 'drug', 'alcohol', 'politics', 'religion'
    ];
    
    const phraseLower = phrase.toLowerCase();
    return inappropriate.some(word => phraseLower.includes(word));
  }
  
  isEntertainmentCategory(category) {
    return ['Movies & TV', 'Music & Artists', 'Entertainment & Pop Culture'].includes(category);
  }
  
  hasPopCultureRelevance(phrase) {
    const popTerms = [
      'viral', 'meme', 'trending', 'tiktok', 'instagram', 'youtube',
      'celebrity', 'famous', 'popular', 'hit', 'star', 'icon'
    ];
    
    const phraseLower = phrase.toLowerCase();
    return popTerms.some(term => phraseLower.includes(term));
  }

  /**
   * Get statistics for a batch processing result
   * @param {Object} result - Result from processBatch
   * @returns {Object} Statistical summary
   */
  getBatchStatistics(result) {
    const total = result.input.count;
    const { autoAccepted, needsReview, autoRejected, averageScore } = result.summary;
    
    return {
      totalProcessed: total,
      acceptanceRate: Math.round((autoAccepted / total) * 100),
      reviewRate: Math.round((needsReview / total) * 100),
      rejectionRate: Math.round((autoRejected / total) * 100),
      averageScore,
      qualityGrade: this.getQualityGrade(averageScore),
      recommendation: this.getBatchRecommendation(result)
    };
  }
  
  getQualityGrade(averageScore) {
    if (averageScore >= 80) return 'A';
    if (averageScore >= 70) return 'B';
    if (averageScore >= 60) return 'C';
    if (averageScore >= 50) return 'D';
    return 'F';
  }
  
  getBatchRecommendation(result) {
    const { autoAccepted, needsReview, autoRejected } = result.summary;
    const total = result.input.count;
    const acceptanceRate = (autoAccepted / total) * 100;
    
    if (acceptanceRate >= 70) {
      return 'Excellent batch - proceed with confidence';
    } else if (acceptanceRate >= 50) {
      return 'Good batch - review questionable phrases and accept';
    } else if (acceptanceRate >= 30) {
      return 'Mixed batch - careful review needed before accepting';
    } else {
      return 'Poor batch - consider regenerating with different prompts';
    }
  }
}

module.exports = QualityPipeline; 