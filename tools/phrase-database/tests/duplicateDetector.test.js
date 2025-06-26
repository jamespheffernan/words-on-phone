const DuplicateDetector = require('../src/duplicateDetector');
const PhraseDatabase = require('../src/database');
const fs = require('fs');
const path = require('path');

describe('DuplicateDetector', () => {
  let db;
  let detector;
  const testDbPath = path.join(__dirname, '../data/test-duplicates.db');

  beforeEach(async () => {
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    // Create fresh database for each test
    db = new PhraseDatabase(testDbPath);
    await db.initialize();
    
    // Add test categories
    await db.addCategory('Movies & TV', 'Test category for movies', 100);
    await db.addCategory('Sports', 'Test category for sports', 100);
    
    detector = new DuplicateDetector(db);
  });

  afterEach(async () => {
    if (db) {
      await db.close();
    }
    
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('Basic Duplicate Detection', () => {
    test('should allow adding a new phrase', async () => {
      const result = await detector.checkDuplicate('Harry Potter', 'Movies & TV');
      
      expect(result.canAdd).toBe(true);
      expect(result.reason).toBe('No duplicates found');
      expect(result.details.type).toBe('APPROVED');
      expect(result.details.normalizedPhrase).toBe('Harry Potter');
      expect(result.details.firstWord).toBe('harry');
    });

    test('should reject exact phrase duplicates', async () => {
      // Add a phrase first
      await db.addPhrase('Harry Potter', 'Movies & TV');
      
      // Try to add the same phrase again
      const result = await detector.checkDuplicate('Harry Potter', 'Movies & TV');
      
      expect(result.canAdd).toBe(false);
      expect(result.reason).toBe('Exact phrase duplicate');
      expect(result.details.type).toBe('EXACT_DUPLICATE');
      expect(result.details.normalizedPhrase).toBe('Harry Potter');
    });

    test('should reject invalid phrases', async () => {
      const result = await detector.checkDuplicate('a', 'Movies & TV'); // Too short
      
      expect(result.canAdd).toBe(false);
      expect(result.reason).toBe('Invalid phrase');
      expect(result.details.type).toBe('INVALID_PHRASE');
      expect(result.details.errors).toContain('Phrase too short (minimum 2 characters)');
    });

    test('should handle phrases with different categories', async () => {
      // Add phrase to Movies & TV
      await db.addPhrase('Basketball', 'Movies & TV');
      
      // Should allow same phrase in different category
      const result = await detector.checkDuplicate('Basketball', 'Sports');
      
      expect(result.canAdd).toBe(true);
      expect(result.reason).toBe('No duplicates found');
    });
  });

  describe('First Word Limit Detection', () => {
    test('should allow phrases up to the first-word limit', async () => {
      // Add 4 phrases starting with "Harry" (limit is 5)
      await db.addPhrase('Harry Potter', 'Movies & TV');
      await db.addPhrase('Harry and Sally', 'Movies & TV');
      await db.addPhrase('Harry Met Sally', 'Movies & TV');
      await db.addPhrase('Harry the Dog', 'Movies & TV');
      
      // Should allow one more
      const result = await detector.checkDuplicate('Harry Styles', 'Movies & TV');
      
      expect(result.canAdd).toBe(true);
      expect(result.reason).toBe('No duplicates found');
    });

    test('should reject phrases when first-word limit reached', async () => {
      // Add 5 phrases starting with "Harry" (reaches limit)
      await db.addPhrase('Harry Potter', 'Movies & TV');
      await db.addPhrase('Harry and Sally', 'Movies & TV');
      await db.addPhrase('Harry Met Sally', 'Movies & TV');
      await db.addPhrase('Harry the Dog', 'Movies & TV');
      await db.addPhrase('Harry Styles', 'Movies & TV');
      
      // Should reject the 6th phrase
      const result = await detector.checkDuplicate('Harry Wilson', 'Movies & TV');
      
      expect(result.canAdd).toBe(false);
      expect(result.reason).toContain('Too many phrases starting with "harry"');
      expect(result.details.type).toBe('FIRST_WORD_LIMIT');
      expect(result.details.firstWord).toBe('harry');
      expect(result.details.currentCount).toBe(5);
      expect(result.details.maxLimit).toBe(5);
      expect(result.details.existingPhrases).toHaveLength(5);
    });

    test('should handle first-word limits per category separately', async () => {
      // Fill up "Sports" category with "Basketball" phrases
      await db.addPhrase('Basketball Game', 'Sports');
      await db.addPhrase('Basketball Team', 'Sports');
      await db.addPhrase('Basketball Player', 'Sports');
      await db.addPhrase('Basketball Court', 'Sports');
      await db.addPhrase('Basketball Season', 'Sports');
      
      // Should still allow "Basketball" phrase in Movies & TV
      const result = await detector.checkDuplicate('Basketball Movie', 'Movies & TV');
      
      expect(result.canAdd).toBe(true);
      expect(result.reason).toBe('No duplicates found');
    });

    test('should extract first word correctly for limit checking', async () => {
      // Test punctuation and case handling
      await db.addPhrase('Dr. Strange', 'Movies & TV');
      await db.addPhrase('Dr. Who', 'Movies & TV');
      await db.addPhrase('Dr. House', 'Movies & TV');
      await db.addPhrase('Dr. Pepper', 'Movies & TV');
      await db.addPhrase('Dr. Jekyll', 'Movies & TV');
      
      // Should reject because "dr" first word limit reached (5 limit)
      const result = await detector.checkDuplicate('Dr. Watson', 'Movies & TV');
      
      expect(result.canAdd).toBe(false);
      expect(result.details.firstWord).toBe('dr');
      expect(result.details.type).toBe('FIRST_WORD_LIMIT');
    });
  });

  describe('Case-Insensitive Duplicate Detection', () => {
    test('should detect case-insensitive similar phrases', async () => {
      await db.addPhrase('Harry Potter', 'Movies & TV');
      
      // Should reject different case versions as exact duplicates (after normalization)
      const result = await detector.checkDuplicate('HARRY POTTER', 'Movies & TV');
      
      expect(result.canAdd).toBe(false);
      expect(result.reason).toBe('Exact phrase duplicate');
      expect(result.details.type).toBe('EXACT_DUPLICATE');
      expect(result.details.normalizedPhrase).toBe('Harry Potter');
    });

    test('should detect mixed case variations', async () => {
      await db.addPhrase('Star Wars', 'Movies & TV');
      
      const variations = [
        'star wars',
        'STAR WARS',
        'Star wars',
        'sTaR wArS'
      ];
      
      for (const variation of variations) {
        const result = await detector.checkDuplicate(variation, 'Movies & TV');
        expect(result.canAdd).toBe(false);
        expect(result.details.type).toBe('EXACT_DUPLICATE');
      }
    });

    test('should allow similar phrases in different categories', async () => {
      await db.addPhrase('Basketball', 'Sports');
      
      // Should allow normalized version in different category
      const result = await detector.checkDuplicate('basketball', 'Movies & TV');
      
      expect(result.canAdd).toBe(true);
    });
  });

  describe('Phrase Retrieval Functions', () => {
    test('should get phrases with specific first word', async () => {
      await db.addPhrase('Harry Potter', 'Movies & TV');
      await db.addPhrase('Harry and Sally', 'Movies & TV');
      await db.addPhrase('Lord of the Rings', 'Movies & TV');
      
      const harryPhrases = await detector.getPhrasesWithFirstWord('Movies & TV', 'harry');
      
      expect(harryPhrases).toHaveLength(2);
      expect(harryPhrases.map(p => p.phrase)).toContain('Harry Potter');
      expect(harryPhrases.map(p => p.phrase)).toContain('Harry and Sally');
    });

    test('should find similar phrases correctly', async () => {
      await db.addPhrase('Harry Potter', 'Movies & TV');
      await db.addPhrase('Lord of the Rings', 'Movies & TV');
      
      const similar = await detector.findSimilarPhrases('HARRY POTTER', 'Harry Potter', 'Movies & TV');
      
      expect(similar).toHaveLength(1);
      expect(similar[0].phrase).toBe('Harry Potter');
    });

    test('should handle empty results gracefully', async () => {
      const harryPhrases = await detector.getPhrasesWithFirstWord('Movies & TV', 'harry');
      const similar = await detector.findSimilarPhrases('NonExistent', 'NonExistent', 'Movies & TV');
      
      expect(harryPhrases).toHaveLength(0);
      expect(similar).toHaveLength(0);
    });
  });

  describe('Batch Duplicate Checking', () => {
    test('should process multiple phrases correctly', async () => {
      const phrases = [
        { phrase: 'Harry Potter', category: 'Movies & TV' },
        { phrase: 'Lord of the Rings', category: 'Movies & TV' },
        { phrase: 'Basketball', category: 'Sports' },
        { phrase: 'a', category: 'Movies & TV' }, // Invalid - too short
        { phrase: 'Valid Phrase', category: 'Movies & TV' }
      ];

      const results = await detector.batchCheckDuplicates(phrases);
      
      expect(results).toHaveLength(5);
      expect(results[0].canAdd).toBe(true); // Harry Potter
      expect(results[1].canAdd).toBe(true); // Lord of the Rings
      expect(results[2].canAdd).toBe(true); // Basketball
      expect(results[3].canAdd).toBe(false); // Invalid phrase
      expect(results[4].canAdd).toBe(true); // Valid Phrase
      
      expect(results[3].details.type).toBe('INVALID_PHRASE');
    });

    test('should handle duplicates in batch processing', async () => {
      // Add a phrase first
      await db.addPhrase('Existing Phrase', 'Movies & TV');
      
      const phrases = [
        { phrase: 'New Phrase', category: 'Movies & TV' },
        { phrase: 'Existing Phrase', category: 'Movies & TV' } // Duplicate
      ];

      const results = await detector.batchCheckDuplicates(phrases);
      
      expect(results[0].canAdd).toBe(true);
      expect(results[1].canAdd).toBe(false);
      expect(results[1].details.type).toBe('EXACT_DUPLICATE');
    });

    test('should throw error for invalid input', async () => {
      await expect(detector.batchCheckDuplicates('not an array')).rejects.toThrow();
    });
  });

  describe('Duplicate Report Generation', () => {
    beforeEach(async () => {
      // Set up test data for reporting
      await db.addPhrase('Harry Potter', 'Movies & TV');
      await db.addPhrase('Harry and Sally', 'Movies & TV');
      await db.addPhrase('Harry Met Sally', 'Movies & TV');
      await db.addPhrase('Lord of the Rings', 'Movies & TV');
      await db.addPhrase('Basketball Game', 'Sports');
      await db.addPhrase('Basketball Team', 'Sports');
    });

    test('should generate comprehensive duplicate report for all categories', async () => {
      const report = await detector.generateDuplicateReport();
      
      expect(report.category).toBe('ALL');
      expect(report.totalPhrases).toBe(6);
      expect(report.duplicateAnalysis).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.generatedAt).toBeDefined();
      
      // Check first word groups
      const groups = report.duplicateAnalysis.firstWordGroups;
      expect(groups['harry|Movies & TV']).toBeDefined();
      expect(groups['harry|Movies & TV'].count).toBe(3);
      expect(groups['lord|Movies & TV']).toBeDefined();
      expect(groups['lord|Movies & TV'].count).toBe(1);
      expect(groups['basketball|Sports']).toBeDefined();
      expect(groups['basketball|Sports'].count).toBe(2);
    });

    test('should generate report for specific category', async () => {
      const report = await detector.generateDuplicateReport('Movies & TV');
      
      expect(report.category).toBe('Movies & TV');
      expect(report.totalPhrases).toBe(4);
      
      const groups = report.duplicateAnalysis.firstWordGroups;
      expect(groups['basketball|Sports']).toBeUndefined(); // Should not include Sports phrases
      expect(groups['harry|Movies & TV']).toBeDefined();
    });

    test('should identify potential issues in reports', async () => {
      // Add more phrases to reach the limit
      await db.addPhrase('Harry the Dog', 'Movies & TV');
      await db.addPhrase('Harry Wilson', 'Movies & TV'); // This makes 5 total
      
      const report = await detector.generateDuplicateReport('Movies & TV');
      
      expect(report.duplicateAnalysis.potentialIssues).toHaveLength(1);
      expect(report.duplicateAnalysis.potentialIssues[0].type).toBe('AT_FIRST_WORD_LIMIT');
      expect(report.duplicateAnalysis.potentialIssues[0].severity).toBe('MEDIUM');
    });

    test('should identify groups exceeding limits', async () => {
      // Add phrases to exceed the limit
      await db.addPhrase('Harry the Dog', 'Movies & TV');
      await db.addPhrase('Harry Wilson', 'Movies & TV');
      await db.addPhrase('Harry Smith', 'Movies & TV'); // This makes 6 total, exceeding limit of 5
      
      const report = await detector.generateDuplicateReport('Movies & TV');
      
      const issues = report.duplicateAnalysis.potentialIssues;
      const exceedsLimit = issues.find(issue => issue.type === 'EXCEEDS_FIRST_WORD_LIMIT');
      
      expect(exceedsLimit).toBeDefined();
      expect(exceedsLimit.severity).toBe('HIGH');
      expect(exceedsLimit.count).toBe(6);
      expect(exceedsLimit.limit).toBe(5);
    });

    test('should calculate utilization percentages correctly', async () => {
      const report = await detector.generateDuplicateReport();
      
      const harryGroup = report.duplicateAnalysis.firstWordGroups['harry|Movies & TV'];
      expect(harryGroup.utilizationPercentage).toBe(60); // 3/5 = 60%
      
      const basketballGroup = report.duplicateAnalysis.firstWordGroups['basketball|Sports'];
      expect(basketballGroup.utilizationPercentage).toBe(40); // 2/5 = 40%
    });
  });

  describe('Configuration', () => {
    test('should return correct configuration', async () => {
      const config = detector.getConfig();
      
      expect(config.maxFirstWordLimit).toBe(5);
      expect(config.version).toBe('1.0.0');
      expect(config.features).toContain('Exact phrase duplicate detection');
      expect(config.features).toContain('First-word limit enforcement');
      expect(config.features).toContain('Case-insensitive similar phrase detection');
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      // Close the database to cause errors
      await db.close();
      
      const result = await detector.checkDuplicate('Test Phrase', 'Movies & TV');
      
      expect(result.canAdd).toBe(false);
      expect(result.reason).toContain('Error checking duplicates');
      expect(result.details.type).toBe('ERROR');
    });

    test('should handle missing categories gracefully', async () => {
      const result = await detector.checkDuplicate('Test Phrase', 'NonExistent Category');
      
      // Should not crash, but may fail for other reasons
      expect(result).toBeDefined();
      expect(result.canAdd).toBeDefined();
    });
  });
}); 