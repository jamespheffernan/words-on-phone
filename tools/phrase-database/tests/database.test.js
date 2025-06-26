const PhraseDatabase = require('../src/database');
const fs = require('fs-extra');
const path = require('path');

// Test database path
const TEST_DB_PATH = path.join(__dirname, '..', 'data', 'test-phrases.db');

describe('PhraseDatabase', () => {
  let db;

  beforeEach(async () => {
    // Remove test database if it exists
    if (await fs.pathExists(TEST_DB_PATH)) {
      await fs.remove(TEST_DB_PATH);
    }
    
    // Create new database instance with test database path
    db = new PhraseDatabase(TEST_DB_PATH);
  });

  afterEach(async () => {
    if (db) {
      await db.close();
    }
    // Clean up test database
    if (await fs.pathExists(TEST_DB_PATH)) {
      await fs.remove(TEST_DB_PATH);
    }
  });

  describe('Database Initialization', () => {
    test('should initialize database with correct schema', async () => {
      await db.initialize();
      
      // Check that database file was created
      expect(await fs.pathExists(TEST_DB_PATH)).toBe(true);
      
      // Verify tables exist by querying them
      const phrases = await db.getAllPhrases();
      expect(Array.isArray(phrases)).toBe(true);
      expect(phrases.length).toBe(0);
    });

    test('should create indexes for performance', async () => {
      await db.initialize();
      
      // Test that we can query by indexed fields without error
      const stats = await db.getStats();
      expect(stats.total).toBe(0);
      expect(stats.recent).toBe(0);
    });
  });

  describe('Phrase Operations', () => {
    beforeEach(async () => {
      await db.initialize();
    });

    test('should add phrase with correct first word extraction', async () => {
      const result = await db.addPhrase('Harry Potter', 'Movies & TV');
      
      expect(result.changes).toBe(1);
      
      const phrases = await db.getAllPhrases();
      expect(phrases.length).toBe(1);
      expect(phrases[0].phrase).toBe('Harry Potter');
      expect(phrases[0].category).toBe('Movies & TV');
      expect(phrases[0].first_word).toBe('harry');
    });

    test('should detect duplicate phrases', async () => {
      await db.addPhrase('Harry Potter', 'Movies & TV');
      
      const isDuplicate = await db.checkDuplicate('Harry Potter');
      expect(isDuplicate).toBe(true);
      
      const isNotDuplicate = await db.checkDuplicate('Lord of the Rings');
      expect(isNotDuplicate).toBe(false);
    });

    test('should enforce first word limit per category', async () => {
      await db.addPhrase('Harry Potter', 'Movies & TV');
      await db.addPhrase('Harry and Sally', 'Movies & TV');
      
          const limitReached = await db.checkFirstWordLimit('Movies & TV', 'harry', 2);
    expect(limitReached).toBe(true);
    
    const limitNotReached = await db.checkFirstWordLimit('Movies & TV', 'lord', 5);
      expect(limitNotReached).toBe(false);
    });

    test('should get phrases by category', async () => {
      await db.addPhrase('Harry Potter', 'Movies & TV');
      await db.addPhrase('Titanic', 'Movies & TV');
      await db.addPhrase('Basketball', 'Sports');
      
      const moviePhrases = await db.getPhrasesByCategory('Movies & TV');
      expect(moviePhrases.length).toBe(2);
      expect(moviePhrases.map(p => p.phrase)).toContain('Harry Potter');
      expect(moviePhrases.map(p => p.phrase)).toContain('Titanic');
      
      const sportsPhrases = await db.getPhrasesByCategory('Sports');
      expect(sportsPhrases.length).toBe(1);
      expect(sportsPhrases[0].phrase).toBe('Basketball');
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      await db.initialize();
    });

    test('should calculate correct statistics', async () => {
      await db.addPhrase('Harry Potter', 'Movies & TV', null, false);
      await db.addPhrase('Titanic', 'Movies & TV', null, true);
      await db.addPhrase('Basketball', 'Sports', null, true);
      
      const stats = await db.getStats();
      
      expect(stats.total).toBe(3);
      expect(stats.recent).toBe(2);
      expect(parseFloat(stats.recentPercentage)).toBe(66.7);
      expect(stats.categories.length).toBe(2);
      
      // Check category counts
      const moviesCategory = stats.categories.find(c => c.category === 'Movies & TV');
      const sportsCategory = stats.categories.find(c => c.category === 'Sports');
      
      expect(moviesCategory.count).toBe(2);
      expect(sportsCategory.count).toBe(1);
    });
  });

  describe('Export Functionality', () => {
    beforeEach(async () => {
      await db.initialize();
    });

    test('should export in game format', async () => {
      await db.addPhrase('Harry Potter', 'Movies & TV');
      await db.addPhrase('Titanic', 'Movies & TV');
      await db.addPhrase('Basketball', 'Sports');
      
      const gameFormat = await db.exportToGameFormat();
      
      expect(gameFormat['Movies & TV']).toEqual(['Harry Potter', 'Titanic']);
      expect(gameFormat['Sports']).toEqual(['Basketball']);
    });
  });

  describe('Category Management', () => {
    beforeEach(async () => {
      await db.initialize();
    });

    test('should add and retrieve categories', async () => {
      await db.addCategory('Test Category', 'Test description', 50);
      
      const categories = await db.getCategories();
      const testCategory = categories.find(c => c.name === 'Test Category');
      
      expect(testCategory).toBeDefined();
      expect(testCategory.description).toBe('Test description');
      expect(testCategory.quota).toBe(50);
    });
  });
}); 