import { PhraseScorer, PhraseScore } from '../phraseScorer';

describe('PhraseScorer', () => {
  let scorer: PhraseScorer;

  beforeEach(() => {
    scorer = new PhraseScorer();
  });

  describe('scorePhrase', () => {
    it('should score simple, well-known phrases highly', async () => {
      const result = await scorer.scorePhrase('Pizza', 'Food');
      
      expect(result.totalScore).toBeGreaterThan(30);
      expect(result.verdict).toMatch(/Good|Excellent/);
      expect(result.breakdown.localHeuristics).toBeGreaterThan(20);
      expect(result.breakdown.categoryBoost).toBeGreaterThan(0);
    });

    it('should score complex technical phrases lowly', async () => {
      const result = await scorer.scorePhrase('Quantum Chromodynamics', 'Science');
      
      expect(result.totalScore).toBeLessThan(25);
      expect(result.verdict).toMatch(/Poor|Reject/);
      expect(result.breakdown.localHeuristics).toBeLessThan(30); // Technical phrases still get base scoring
    });

    it('should favor shorter phrases over longer ones', async () => {
      const shortResult = await scorer.scorePhrase('Pizza', 'Food');
      const longResult = await scorer.scorePhrase('Extremely Complex Molecular Gastronomy Techniques', 'Food');
      
      expect(shortResult.totalScore).toBeGreaterThan(longResult.totalScore);
    });

    it('should boost pop culture references', async () => {
      const popCultureResult = await scorer.scorePhrase('Taylor Swift', 'Music');
      const obscureResult = await scorer.scorePhrase('Obscure Jazz Musician', 'Music');
      
      expect(popCultureResult.totalScore).toBeGreaterThan(obscureResult.totalScore);
      expect(popCultureResult.breakdown.localHeuristics).toBeGreaterThan(obscureResult.breakdown.localHeuristics);
    });

    it('should handle empty or invalid phrases gracefully', async () => {
      const emptyResult = await scorer.scorePhrase('', 'Any');
      const whitespaceResult = await scorer.scorePhrase('   ', 'Any');
      
      expect(emptyResult.totalScore).toBe(0);
      expect(whitespaceResult.totalScore).toBe(0);
      expect(emptyResult.verdict).toContain('Reject');
    });

    it('should apply category boosts correctly', async () => {
      const movieResult = await scorer.scorePhrase('Action Movie', 'Movies & TV');
      const techResult = await scorer.scorePhrase('Action Movie', 'Science & Technology');
      
      expect(movieResult.breakdown.categoryBoost).toBeGreaterThan(techResult.breakdown.categoryBoost);
    });

    it('should recognize recent trends and platforms', async () => {
      const trendyResult = await scorer.scorePhrase('TikTok Dance', 'Social Media');
      const oldResult = await scorer.scorePhrase('Telegraph Message', 'Communication');
      
      expect(trendyResult.totalScore).toBeGreaterThan(oldResult.totalScore);
    });
  });

  describe('batchScore', () => {
    it('should score multiple phrases and sort by quality', async () => {
      const phrases = [
        'Quantum Physics', // Low score
        'Pizza Delivery', // High score
        'Taylor Swift',   // High score
        'Obscure Academic Term' // Low score
      ];
      
      const results = await scorer.batchScore(phrases, 'General');
      
      expect(results).toHaveLength(4);
      expect(results[0].totalScore).toBeGreaterThanOrEqual(results[1].totalScore);
      expect(results[1].totalScore).toBeGreaterThanOrEqual(results[2].totalScore);
      expect(results[2].totalScore).toBeGreaterThanOrEqual(results[3].totalScore);
      
      // High-scoring phrases should be first
      expect(results[0].phrase).toMatch(/Pizza|Taylor/);
    });

    it('should handle empty batch gracefully', async () => {
      const results = await scorer.batchScore([], 'Any');
      expect(results).toHaveLength(0);
    });
  });

  describe('filterByQuality', () => {
    it('should filter out low-quality phrases', async () => {
      const phrases = [
        'Pizza',                    // Should pass
        'Taylor Swift',            // Should pass
        'Quantum Chromodynamics',  // Should fail
        'Obscure Academic Jargon'  // Should fail
      ];
      
      const filtered = await scorer.filterByQuality(phrases, 'General', 25);
      
      expect(filtered.length).toBeLessThan(phrases.length);
      expect(filtered.every(item => item.score.totalScore >= 25)).toBe(true);
      expect(filtered.some(item => item.phrase.includes('Pizza'))).toBe(true);
    });

    it('should respect custom minimum score thresholds', async () => {
      const phrases = ['Good Phrase', 'Mediocre Phrase', 'Bad Phrase'];
      
      const lowThreshold = await scorer.filterByQuality(phrases, 'General', 10);
      const highThreshold = await scorer.filterByQuality(phrases, 'General', 40);
      
      expect(lowThreshold.length).toBeGreaterThanOrEqual(highThreshold.length);
    });
  });

  describe('verdict classification', () => {
    it('should classify excellent phrases correctly', async () => {
      const result = await scorer.scorePhrase('Pizza', 'Food & Drink');
      if (result.totalScore >= 45) {
        expect(result.verdict).toContain('Excellent');
      }
    });

    it('should classify poor phrases correctly', async () => {
      const result = await scorer.scorePhrase('Incomprehensible Technical Jargon', 'Science');
      if (result.totalScore < 15) {
        expect(result.verdict).toContain('Reject');
      }
    });
  });

  describe('error handling', () => {
    it('should handle scoring errors gracefully', async () => {
      // Test with malformed input that might cause errors
      const result = await scorer.scorePhrase('Test', 'Category');
      
      expect(result).toBeDefined();
      expect(result.phrase).toBe('Test');
      expect(result.category).toBe('Category');
      expect(typeof result.totalScore).toBe('number');
      expect(result.totalScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('performance requirements', () => {
    it('should score phrases quickly (< 10ms each)', async () => {
      const startTime = performance.now();
      
      await scorer.scorePhrase('Test Phrase', 'Category');
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(10); // Should be under 10ms
    });

    it('should handle batch scoring efficiently', async () => {
      const phrases = Array.from({ length: 20 }, (_, i) => `Test Phrase ${i}`);
      
      const startTime = performance.now();
      await scorer.batchScore(phrases, 'Category');
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      const avgPerPhrase = duration / phrases.length;
      
      expect(avgPerPhrase).toBeLessThan(10); // Average under 10ms per phrase
    });
  });

  describe('real-world phrase examples', () => {
    const testCases = [
      // Excellent phrases (should score 35+)
      { phrase: 'Pizza Delivery', category: 'Jobs', expectedMin: 30 },
      { phrase: 'Taylor Swift', category: 'Music', expectedMin: 35 },
      { phrase: 'Harry Potter', category: 'Movies & TV', expectedMin: 30 },
      
      // Good phrases (should score 25-34)
      { phrase: 'Coffee Shop', category: 'Places', expectedMin: 25 },
      { phrase: 'Basketball', category: 'Sports', expectedMin: 25 },
      
      // Poor phrases (should score < 25)
      { phrase: 'Quantum Mechanics', category: 'Science', expectedMax: 25 },
      { phrase: 'Epistemological Framework', category: 'Philosophy', expectedMax: 20 },
    ];

    testCases.forEach(({ phrase, category, expectedMin, expectedMax }) => {
      it(`should score "${phrase}" appropriately`, async () => {
        const result = await scorer.scorePhrase(phrase, category);
        
        if (expectedMin) {
          expect(result.totalScore).toBeGreaterThanOrEqual(expectedMin);
        }
        if (expectedMax) {
          expect(result.totalScore).toBeLessThanOrEqual(expectedMax);
        }
      });
    });
  });
}); 