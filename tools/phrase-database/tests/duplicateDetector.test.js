const DuplicateDetector = require('../src/duplicateDetector');
const PhraseDatabase = require('../src/database');
const path = require('path');
const fs = require('fs');

describe('DuplicateDetector', () => {
  let detector;
  let database;
  let testDbPath;

  beforeEach(async () => {
    // Create a unique test database for each test
    testDbPath = path.join(__dirname, '..', 'data', `test-duplicates-${Date.now()}.db`);
    database = new PhraseDatabase(testDbPath);
    await database.initialize();
    detector = new DuplicateDetector(database);
  });

  afterEach(async () => {
    await database.close();
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('Basic Validation', () => {
    test('should allow valid new phrase', async () => {
      const result = await detector.validatePhrase('Harry Potter', 'Movies & TV');
      
      expect(result.valid).toBe(true);
      expect(result.normalized.phrase).toBe('Harry Potter');
      expect(result.normalized.firstWord).toBe('harry');
      expect(result.message).toContain('valid and can be added');
    });

    test('should normalize phrase before validation', async () => {
      const result = await detector.validatePhrase('  harry   potter  ', 'Movies & TV');
      
      expect(result.valid).toBe(true);
      expect(result.normalized.phrase).toBe('Harry Potter');
      expect(result.normalized.firstWord).toBe('harry');
    });

    test('should handle phrase normalization errors', async () => {
      const result = await detector.validatePhrase('', 'Movies & TV');
      
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('validation-error');
      expect(result.message).toContain('Error validating phrase');
    });
  });

  describe('Exact Duplicate Detection', () => {
    test('should detect exact duplicate phrase', async () => {
      // Add initial phrase
      await database.addPhrase('Harry Potter', 'Movies & TV');
      
      // Try to add same phrase
      const result = await detector.validatePhrase('Harry Potter', 'Movies & TV');
      
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('exact-duplicate');
      expect(result.message).toContain('already exists');
      expect(result.details.existingPhrase).toBe('Harry Potter');
      expect(result.details.existingCategory).toBe('Movies & TV');
    });

    test('should detect case-insensitive duplicates', async () => {
      // Add initial phrase
      await database.addPhrase('Harry Potter', 'Movies & TV');
      
      // Try to add same phrase with different case
      const result = await detector.validatePhrase('HARRY POTTER', 'Movies & TV');
      
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('exact-duplicate');
    });

    test('should detect duplicates after normalization', async () => {
      // Add initial phrase
      await database.addPhrase('Harry Potter', 'Movies & TV');
      
      // Try to add same phrase with extra whitespace
      const result = await detector.validatePhrase('  Harry   Potter  ', 'Movies & TV');
      
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('exact-duplicate');
    });

    test('should allow same phrase in different categories', async () => {
      // Add initial phrase in one category
      await database.addPhrase('Harry Potter', 'Movies & TV');
      
      // Try to add same phrase in different category - should fail because it's an exact duplicate
      const result = await detector.validatePhrase('Harry Potter', 'Books');
      
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('exact-duplicate');
    });
  });

  describe('First Word Limit Enforcement', () => {
    test('should allow first phrase with a first word', async () => {
      const result = await detector.validatePhrase('Harry Potter', 'Movies & TV');
      
      expect(result.valid).toBe(true);
    });

    test('should allow second phrase with same first word in same category', async () => {
      // Add first phrase
      await database.addPhrase('Harry Potter', 'Movies & TV');
      
      // Add second phrase with same first word
      const result = await detector.validatePhrase('Harry and Sally', 'Movies & TV');
      
      expect(result.valid).toBe(true);
    });

    test('should reject third phrase with same first word in same category', async () => {
      // Add first two phrases
      await database.addPhrase('Harry Potter', 'Movies & TV');
      await database.addPhrase('Harry and Sally', 'Movies & TV');
      
      // Try to add third phrase with same first word
      const result = await detector.validatePhrase('Harry Met Sally', 'Movies & TV');
      
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('first-word-limit');
      expect(result.message).toContain('already has 2 phrases starting with "harry"');
      expect(result.details.firstWord).toBe('harry');
      expect(result.details.category).toBe('Movies & TV');
      expect(result.details.existingPhrases).toEqual(expect.arrayContaining(['Harry and Sally', 'Harry Potter']));
      expect(result.details.limit).toBe(2);
    });

    test('should allow same first word in different categories', async () => {
      // Fill up "Movies & TV" category with "harry" phrases
      await database.addPhrase('Harry Potter', 'Movies & TV');
      await database.addPhrase('Harry and Sally', 'Movies & TV');
      
      // Should still allow "harry" phrase in different category
      const result = await detector.validatePhrase('Harry Styles', 'Music');
      
      expect(result.valid).toBe(true);
    });

    test('should handle first word case insensitively', async () => {
      // Add phrases with different cases
      await database.addPhrase('Harry Potter', 'Movies & TV');
      await database.addPhrase('HARRY and Sally', 'Movies & TV');
      
      // Try to add third with different case
      const result = await detector.validatePhrase('harry met sally', 'Movies & TV');
      
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('first-word-limit');
    });

    test('should handle possessive first words correctly', async () => {
      // Add phrases with possessive first words
      await database.addPhrase("Schindler's List", 'Movies & TV');
      await database.addPhrase("Schindler's Story", 'Movies & TV');
      
      // Should reject third phrase (possessive should be normalized to same root)
      const result = await detector.validatePhrase("Schindler's War", 'Movies & TV');
      
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('first-word-limit');
    });
  });

  describe('Statistics and Analysis', () => {
    test('should provide empty stats for empty database', async () => {
      const stats = await detector.getStats();
      
      expect(stats.firstWordDistribution).toEqual([]);
      expect(stats.categoryStats).toEqual([]);
      expect(stats.nearDuplicateSuspicions).toEqual([]);
      expect(stats.limits.maxPhrasesPerFirstWord).toBe(2);
    });

    test('should provide first word distribution stats', async () => {
      // Add test data
      await database.addPhrase('Harry Potter', 'Movies & TV');
      await database.addPhrase('Harry and Sally', 'Movies & TV');
      await database.addPhrase('Star Wars', 'Movies & TV');
      
      const stats = await detector.getStats();
      
      expect(stats.firstWordDistribution).toHaveLength(1);
      expect(stats.firstWordDistribution[0]).toMatchObject({
        category: 'Movies & TV',
        first_word: 'harry',
        count: 2
      });
      expect(stats.firstWordDistribution[0].phrases).toContain('Harry Potter');
      expect(stats.firstWordDistribution[0].phrases).toContain('Harry and Sally');
    });

    test('should provide category stats', async () => {
      await database.addPhrase('Harry Potter', 'Movies & TV');
      await database.addPhrase('Star Wars', 'Movies & TV');
      await database.addPhrase('Basketball', 'Sports');
      
      const stats = await detector.getStats();
      
      expect(stats.categoryStats).toHaveLength(2);
      expect(stats.categoryStats[0]).toMatchObject({
        category: 'Movies & TV',
        total_phrases: 2
      });
      expect(stats.categoryStats[1]).toMatchObject({
        category: 'Sports',
        total_phrases: 1
      });
    });

    test('should detect near-duplicate suspicions', async () => {
      await database.addPhrase('Star Wars A New Hope', 'Movies & TV');
      await database.addPhrase('Star Wars A Different Story', 'Movies & TV');
      
      const stats = await detector.getStats();
      
      expect(stats.nearDuplicateSuspicions).toHaveLength(1);
      expect(stats.nearDuplicateSuspicions[0]).toMatchObject({
        category: 'Movies & TV',
        firstThreeWords: 'Star Wars A'
      });
    });
  });

  describe('Batch Validation', () => {
    test('should validate multiple phrases', async () => {
      const phrases = [
        { phrase: 'Harry Potter', category: 'Movies & TV' },
        { phrase: 'Star Wars', category: 'Movies & TV' },
        { phrase: 'Basketball', category: 'Sports' }
      ];
      
      const results = await detector.validateBatch(phrases);
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.result.valid).toBe(true);
      });
    });

    test('should handle mixed valid and invalid phrases', async () => {
      // Pre-populate with one phrase
      await database.addPhrase('Harry Potter', 'Movies & TV');
      
      const phrases = [
        { phrase: 'Star Wars', category: 'Movies & TV' },      // Valid
        { phrase: 'Harry Potter', category: 'Movies & TV' },   // Duplicate
        { phrase: 'Basketball', category: 'Sports' }           // Valid
      ];
      
      const results = await detector.validateBatch(phrases);
      
      expect(results).toHaveLength(3);
      expect(results[0].result.valid).toBe(true);
      expect(results[1].result.valid).toBe(false);
      expect(results[1].result.reason).toBe('exact-duplicate');
      expect(results[2].result.valid).toBe(true);
    });
  });

  describe('Dry Run Functionality', () => {
    test('should provide dry run analysis for valid phrase', async () => {
      const result = await detector.dryRun('Harry Potter', 'Movies & TV');
      
      expect(result.canAdd).toBe(true);
      expect(result.normalizedPhrase).toBe('Harry Potter');
      expect(result.firstWord).toBe('harry');
      expect(result.afterAdd.firstWordCount).toBe(1);
      expect(result.afterAdd.remainingSlots).toBe(1);
    });

    test('should provide dry run analysis for duplicate phrase', async () => {
      await database.addPhrase('Harry Potter', 'Movies & TV');
      
      const result = await detector.dryRun('Harry Potter', 'Movies & TV');
      
      expect(result.canAdd).toBe(false);
      expect(result.reason).toBe('exact-duplicate');
      expect(result.message).toContain('already exists');
    });

    test('should show remaining slots correctly', async () => {
      await database.addPhrase('Harry Potter', 'Movies & TV');
      
      const result = await detector.dryRun('Harry and Sally', 'Movies & TV');
      
      expect(result.canAdd).toBe(true);
      expect(result.afterAdd.firstWordCount).toBe(2);
      expect(result.afterAdd.remainingSlots).toBe(0);
    });
  });

  describe('Database Integration', () => {
    test('should work with database wrapper methods', async () => {
      const result = await detector.checkExactDuplicate('Nonexistent Phrase');
      expect(result.isDuplicate).toBe(false);
    });

    test('should handle database errors gracefully', async () => {
      // Close database to simulate error
      await database.close();
      
      const result = await detector.validatePhrase('Test Phrase', 'Movies & TV');
      
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('validation-error');
    });
  });
}); 