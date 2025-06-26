/**
 * PhraseScorer - Local heuristics scoring for party game phrases
 * Ported from phrase database builder tool for real-time phrase quality assessment
 */

export interface PhraseScore {
  phrase: string;
  category: string;
  totalScore: number;
  breakdown: {
    localHeuristics: number;
    wikidata?: number;
    reddit?: number;
    categoryBoost: number;
    error?: string;
  };
  verdict: string;
  timestamp: string;
  cached: boolean;
}

export class PhraseScorer {
  private readonly MAX_SCORE = 100;
  
  // Score weights
  private readonly WEIGHTS = {
    LOCAL_HEURISTICS: 40,    // 0-40 points
    WIKIDATA: 30,           // 0-30 points  
    REDDIT: 15,             // 0-15 points
    CATEGORY_BOOST: 15      // 0-15 points
  };
  
  // Common words that are usually well-known
  private readonly COMMON_WORDS = new Set([
    'the', 'and', 'you', 'that', 'was', 'for', 'are', 'with', 'his', 'they',
    'have', 'this', 'will', 'one', 'all', 'were', 'can', 'had', 'her', 'what',
    'said', 'there', 'each', 'which', 'she', 'how', 'their', 'time', 'way',
    'about', 'many', 'then', 'them', 'these', 'two', 'more', 'very', 'know',
    'just', 'first', 'into', 'over', 'think', 'also', 'your', 'work', 'life',
    'only', 'new', 'years', 'could', 'other', 'after', 'world', 'good', 'right',
    'people', 'where', 'those', 'come', 'state', 'system', 'some', 'because'
  ]);
  
  // Categories that get pop culture boost
  private readonly POP_CULTURE_CATEGORIES = new Set([
    'Movies & TV', 'Music', 'Video Games', 'Social Media', 'Internet Culture',
    'Sports', 'Food & Drink', 'Brands', 'Places', 'Animals'
  ]);
  
  // Recency indicators (last 5 years for broader relevance)
  private readonly RECENT_INDICATORS = [
    'tiktok', 'covid', 'zoom', 'biden', 'trump', 'ukraine', 'climate', 'ai',
    'chatgpt', 'spotify', 'netflix', 'disney+', 'squid game', 'wordle', 
    'nft', 'crypto', 'meta', 'metaverse', 'tesla', 'elon musk', 'taylor swift',
    'marvel', 'fortnite', 'instagram', 'youtube', 'twitch', 'among us'
  ];

  /**
   * Score a phrase for party game suitability (local heuristics only)
   * @param phrase - Phrase to score
   * @param category - Category context
   * @returns Score breakdown and total
   */
  async scorePhrase(phrase: string, category: string): Promise<PhraseScore> {
    try {
      const breakdown = {
        localHeuristics: await this.scoreLocalHeuristics(phrase, category),
        categoryBoost: this.scoreCategoryBoost(phrase, category)
      };

      const total = Math.min(
        breakdown.localHeuristics + breakdown.categoryBoost,
        this.WEIGHTS.LOCAL_HEURISTICS + this.WEIGHTS.CATEGORY_BOOST // Max 55 for local-only scoring
      );

      const result: PhraseScore = {
        phrase,
        category,
        totalScore: total,
        breakdown,
        verdict: this.getVerdict(total),
        timestamp: new Date().toISOString(),
        cached: false
      };

      return result;

    } catch (error) {
      console.error(`Error scoring phrase "${phrase}":`, error);
      
      // Return fallback score
      const localScore = 20; // Conservative fallback
      return {
        phrase,
        category,
        totalScore: localScore,
        breakdown: { 
          localHeuristics: localScore, 
          categoryBoost: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        verdict: this.getVerdict(localScore),
        timestamp: new Date().toISOString(),
        cached: false
      };
    }
  }

  /**
   * Score based on local heuristics (0-40 points)
   * @param phrase - Phrase to analyze
   * @param category - Category context
   * @returns Local heuristics score
   */
  private async scoreLocalHeuristics(phrase: string, category: string): Promise<number> {
    // Handle empty phrases
    if (!phrase || phrase.trim().length === 0) {
      return 0;
    }
    
    let score = 0;
    const words = phrase.toLowerCase().split(/\s+/).filter(word => word.length > 0);
    
    // Handle case where split results in no valid words
    if (words.length === 0) {
      return 0;
    }
    
    // Word simplicity (0-25 points) - increased for better scores
    const wordScores = words.map(word => {
      if (this.COMMON_WORDS.has(word)) return 6;
      if (word.length <= 4) return 5;
      if (word.length <= 6) return 4;
      if (word.length <= 8) return 3;
      return 1;
    });
    
    const avgWordScore = wordScores.reduce((a, b) => a + b, 0) / words.length;
    score += Math.min(avgWordScore * 4.5, 25); // Scale to 0-25
    
    // Phrase length bonus (0-10 points) - favor shorter phrases for party games
    if (words.length <= 2) score += 10;
    else if (words.length <= 3) score += 8;
    else if (words.length <= 4) score += 5;
    else score += 1;
    
    // Recency indicators (0-10 points)
    const recentCount = this.RECENT_INDICATORS.filter(indicator => 
      phrase.toLowerCase().includes(indicator)
    ).length;
    score += Math.min(recentCount * 5, 10);
    
    // Base quality bonus for reasonable phrases (0-5 points)
    if (words.length <= 4 && words.every(word => word.length >= 2)) {
      score += 5;
    }
    
    return Math.min(score, this.WEIGHTS.LOCAL_HEURISTICS);
  }

  /**
   * Score based on category boost (0-15 points)
   * @param phrase - Phrase to analyze
   * @param category - Category context
   * @returns Category boost score
   */
  private scoreCategoryBoost(phrase: string, category: string): number {
    let boost = 0;
    
    // Pop culture categories get bonus
    if (this.POP_CULTURE_CATEGORIES.has(category)) {
      boost += 10;
    }
    
    // Specific category bonuses
    const lowerCategory = category.toLowerCase();
    const lowerPhrase = phrase.toLowerCase();
    
    if (lowerCategory.includes('movie') || lowerCategory.includes('tv')) {
      boost += 10;
    } else if (lowerCategory.includes('food') || lowerCategory.includes('drink')) {
      boost += 10;
    } else if (lowerCategory.includes('sport')) {
      boost += 8;
    } else if (lowerCategory.includes('music')) {
      boost += 8;
    } else if (lowerCategory.includes('science') || lowerCategory.includes('technology')) {
      boost -= 5; // Penalty for technical categories
    }
    
    // Brand/platform mentions get bonus
    const brandIndicators = ['apple', 'google', 'facebook', 'instagram', 'tiktok', 'youtube'];
    if (brandIndicators.some(brand => lowerPhrase.includes(brand))) {
      boost += 5;
    }
    
    return Math.min(boost, this.WEIGHTS.CATEGORY_BOOST);
  }

  /**
   * Get verdict based on score
   * @param score - Total score
   * @returns Human-readable verdict
   */
  private getVerdict(score: number): string {
    if (score >= 45) return 'Excellent - Perfect for party games';
    if (score >= 35) return 'Good - Suitable for gameplay';
    if (score >= 25) return 'Fair - May work but could be challenging';
    if (score >= 15) return 'Poor - Likely too difficult or obscure';
    return 'Reject - Not suitable for party games';
  }

  /**
   * Batch score multiple phrases
   * @param phrases - Array of phrases to score
   * @param category - Category context
   * @returns Array of scores
   */
  async batchScore(phrases: string[], category: string): Promise<PhraseScore[]> {
    const scores = await Promise.all(
      phrases.map(phrase => this.scorePhrase(phrase, category))
    );
    
    return scores.sort((a, b) => b.totalScore - a.totalScore); // Sort by score descending
  }

  /**
   * Filter phrases by minimum score threshold
   * @param phrases - Array of phrases to filter
   * @param category - Category context
   * @param minScore - Minimum acceptable score (default: 25)
   * @returns Filtered phrases with scores
   */
  async filterByQuality(phrases: string[], category: string, minScore: number = 25): Promise<{phrase: string, score: PhraseScore}[]> {
    const scores = await this.batchScore(phrases, category);
    
    return scores
      .filter(score => score.totalScore >= minScore)
      .map(score => ({ phrase: score.phrase, score }));
  }
} 