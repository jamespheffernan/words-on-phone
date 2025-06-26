const GameExporter = require('../src/gameExporter');
const PhraseDatabase = require('../src/database');
const fs = require('fs').promises;
const path = require('path');

describe('GameExporter', () => {
  let db;
  let exporter;
  let testDbPath;

  beforeEach(async () => {
    // Create unique test database
    const timestamp = Date.now();
    testDbPath = path.join(__dirname, '..', 'data', `test-exporter-${timestamp}.db`);
    
    db = new PhraseDatabase(testDbPath);
    await db.initialize();
    exporter = new GameExporter(db);
    
    // Add test data
    await db.addCategory('Movies & TV', 'Movies and TV shows', 100);
    await db.addCategory('Music', 'Songs and artists', 100);
    await db.addCategory('Sports', 'Sports and athletes', 100);
    
    // Add test phrases with various attributes
    await db.addPhrase('Star Wars', 'Movies & TV', { recent: false, score: 85, firstWord: 'Star' });
    await db.addPhrase('The Matrix', 'Movies & TV', { recent: false, score: 80, firstWord: 'The' });
    await db.addPhrase('TikTok Viral Dance', 'Movies & TV', { recent: true, score: 70, firstWord: 'TikTok' });
    await db.addPhrase('COVID-19 Documentary', 'Movies & TV', { recent: true, score: 60, firstWord: 'COVID-19' });
    
    await db.addPhrase('Taylor Swift', 'Music', { recent: true, score: 90, firstWord: 'Taylor' });
    await db.addPhrase('The Beatles', 'Music', { recent: false, score: 95, firstWord: 'The' });
    await db.addPhrase('Spotify Wrapped', 'Music', { recent: true, score: 65, firstWord: 'Spotify' });
    
    await db.addPhrase('Super Bowl', 'Sports', { recent: false, score: 85, firstWord: 'Super' });
    await db.addPhrase('World Cup', 'Sports', { recent: false, score: 90, firstWord: 'World' });
    await db.addPhrase('NBA Finals', 'Sports', { recent: false, score: 75, firstWord: 'NBA' });
  });

  afterEach(async () => {
    if (db) {
      await db.close();
    }
    
    // Clean up test database file
    try {
      await fs.unlink(testDbPath);
    } catch (error) {
      // File might not exist, ignore error
    }
  });

  describe('exportGameFormat', () => {
    test('should export in exact game format with default category', async () => {
      const result = await exporter.exportGameFormat();
      
      expect(result).toHaveProperty('category');
      expect(result).toHaveProperty('phrases');
      expect(result.category).toBe('Entertainment & Pop Culture');
      expect(Array.isArray(result.phrases)).toBe(true);
      expect(result.phrases.length).toBe(10); // All phrases
      
      // Check that phrases are strings
      result.phrases.forEach(phrase => {
        expect(typeof phrase).toBe('string');
      });
    });

    test('should export with custom category name', async () => {
      const result = await exporter.exportGameFormat({
        category: 'Custom Category Name'
      });
      
      expect(result.category).toBe('Custom Category Name');
      expect(result.phrases.length).toBe(10);
    });

    test('should filter by specific categories', async () => {
      const result = await exporter.exportGameFormat({
        categories: ['Movies & TV', 'Music']
      });
      
      expect(result.phrases.length).toBe(7); // 4 Movies & TV + 3 Music
      
      // Verify phrases are from correct categories
      const moviePhrases = ['Star Wars', 'The Matrix', 'TikTok Viral Dance', 'COVID-19 Documentary'];
      const musicPhrases = ['Taylor Swift', 'The Beatles', 'Spotify Wrapped'];
      const expectedPhrases = [...moviePhrases, ...musicPhrases].sort();
      
      expect(result.phrases.sort()).toEqual(expectedPhrases);
    });

    test('should filter by recent phrases only', async () => {
      const result = await exporter.exportGameFormat({
        recentOnly: true
      });
      
      expect(result.phrases.length).toBe(4); // TikTok Viral Dance, COVID-19 Documentary, Taylor Swift, Spotify Wrapped
      
      const expectedRecentPhrases = ['TikTok Viral Dance', 'COVID-19 Documentary', 'Taylor Swift', 'Spotify Wrapped'];
      expect(result.phrases.sort()).toEqual(expectedRecentPhrases.sort());
    });

    test('should filter by minimum score', async () => {
      const result = await exporter.exportGameFormat({
        minScore: 80
      });
      
      // Should include: Star Wars (85), The Matrix (80), Taylor Swift (90), The Beatles (95), Super Bowl (85), World Cup (90)
      expect(result.phrases.length).toBe(6);
      
      const expectedHighScorePhrases = ['Star Wars', 'The Matrix', 'Taylor Swift', 'The Beatles', 'Super Bowl', 'World Cup'];
      expect(result.phrases.sort()).toEqual(expectedHighScorePhrases.sort());
    });

    test('should filter by score range', async () => {
      const result = await exporter.exportGameFormat({
        minScore: 70,
        maxScore: 85
      });
      
      // Should include: TikTok Viral Dance (70), Taylor Swift (90) - wait, Taylor Swift is 90, should be excluded
      // Actually: TikTok Viral Dance (70), Star Wars (85), Super Bowl (85), NBA Finals (75)
      expect(result.phrases.length).toBe(4);
      
      const expectedMidScorePhrases = ['TikTok Viral Dance', 'Star Wars', 'Super Bowl', 'NBA Finals'];
      expect(result.phrases.sort()).toEqual(expectedMidScorePhrases.sort());
    });

    test('should limit number of phrases', async () => {
      const result = await exporter.exportGameFormat({
        limit: 5
      });
      
      expect(result.phrases.length).toBe(5);
    });

    test('should shuffle phrases when requested', async () => {
      const result1 = await exporter.exportGameFormat({ shuffle: true });
      const result2 = await exporter.exportGameFormat({ shuffle: true });
      
      // Both should have same phrases but potentially different order
      expect(result1.phrases.sort()).toEqual(result2.phrases.sort());
      
      // With 10 phrases, it's very unlikely they'll be in exact same order
      // (but not impossible, so we'll just check they have same content)
      expect(result1.phrases.length).toBe(10);
      expect(result2.phrases.length).toBe(10);
    });

    test('should return empty phrases array when no matches', async () => {
      const result = await exporter.exportGameFormat({
        minScore: 200 // No phrases will have this score
      });
      
      expect(result.category).toBe('Entertainment & Pop Culture');
      expect(result.phrases).toEqual([]);
    });

    test('should combine multiple filters', async () => {
      const result = await exporter.exportGameFormat({
        categories: ['Music'],
        recentOnly: true,
        minScore: 70
      });
      
      // Should only include Taylor Swift (recent: true, score: 90, category: Music)
      // Spotify Wrapped is recent but score is 65 (below 70)
      expect(result.phrases.length).toBe(1);
      expect(result.phrases[0]).toBe('Taylor Swift');
    });
  });

  describe('exportMultipleCategories', () => {
    test('should export all categories as separate objects', async () => {
      const result = await exporter.exportMultipleCategories();
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3); // Movies & TV, Music, Sports
      
      // Check each category has correct format
      result.forEach(categoryObj => {
        expect(categoryObj).toHaveProperty('category');
        expect(categoryObj).toHaveProperty('phrases');
        expect(Array.isArray(categoryObj.phrases)).toBe(true);
        expect(categoryObj.phrases.length).toBeGreaterThan(0);
      });
      
      // Check specific categories
      const moviesCategory = result.find(cat => cat.category === 'Movies & TV');
      const musicCategory = result.find(cat => cat.category === 'Music');
      const sportsCategory = result.find(cat => cat.category === 'Sports');
      
      expect(moviesCategory.phrases.length).toBe(4);
      expect(musicCategory.phrases.length).toBe(3);
      expect(sportsCategory.phrases.length).toBe(3);
    });

    test('should export specific categories only', async () => {
      const result = await exporter.exportMultipleCategories({
        categories: ['Music', 'Sports']
      });
      
      expect(result.length).toBe(2);
      expect(result.map(cat => cat.category).sort()).toEqual(['Music', 'Sports']);
    });

    test('should limit phrases per category', async () => {
      const result = await exporter.exportMultipleCategories({
        limitPerCategory: 2
      });
      
      expect(result.length).toBe(3);
      result.forEach(categoryObj => {
        expect(categoryObj.phrases.length).toBeLessThanOrEqual(2);
      });
    });

    test('should filter by recent phrases across categories', async () => {
      const result = await exporter.exportMultipleCategories({
        recentOnly: true
      });
      
      // Should have Movies & TV (2 recent) and Music (2 recent), but not Sports (0 recent)
      expect(result.length).toBe(2);
      
      const categories = result.map(cat => cat.category).sort();
      expect(categories).toEqual(['Movies & TV', 'Music']);
    });
  });

  describe('validateGameFormat', () => {
    test('should validate correct game format', async () => {
      const gameFormat = await exporter.exportGameFormat();
      const validation = exporter.validateGameFormat(gameFormat);
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);
      expect(validation.stats.totalPhrases).toBe(10);
      expect(validation.stats.uniquePhrases).toBe(10);
      expect(validation.stats.category).toBe('Entertainment & Pop Culture');
    });

    test('should detect missing category field', () => {
      const invalidFormat = {
        phrases: ['test phrase']
      };
      
      const validation = exporter.validateGameFormat(invalidFormat);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Missing required field: category');
    });

    test('should detect missing phrases field', () => {
      const invalidFormat = {
        category: 'Test Category'
      };
      
      const validation = exporter.validateGameFormat(invalidFormat);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Missing required field: phrases');
    });

    test('should detect invalid phrases field type', () => {
      const invalidFormat = {
        category: 'Test Category',
        phrases: 'not an array'
      };
      
      const validation = exporter.validateGameFormat(invalidFormat);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Field "phrases" must be an array');
    });

    test('should detect empty phrases', () => {
      const invalidFormat = {
        category: 'Test Category',
        phrases: ['valid phrase', '', null, undefined, '   ']
      };
      
      const validation = exporter.validateGameFormat(invalidFormat);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(error => error.includes('empty or invalid phrases'))).toBe(true);
    });

    test('should warn about duplicate phrases', () => {
      const formatWithDuplicates = {
        category: 'Test Category',
        phrases: ['phrase 1', 'phrase 2', 'phrase 1', 'phrase 3']
      };
      
      const validation = exporter.validateGameFormat(formatWithDuplicates);
      
      expect(validation.valid).toBe(true); // Valid but with warnings
      expect(validation.warnings.some(warning => warning.includes('duplicate phrases'))).toBe(true);
    });

    test('should warn about long phrases', () => {
      const formatWithLongPhrases = {
        category: 'Test Category',
        phrases: ['short phrase', 'this is a very long phrase that exceeds the fifty character limit and should trigger a warning']
      };
      
      const validation = exporter.validateGameFormat(formatWithLongPhrases);
      
      expect(validation.valid).toBe(true);
      expect(validation.warnings.some(warning => warning.includes('longer than 50 characters'))).toBe(true);
    });

    test('should warn about single-word phrases', () => {
      const formatWithSingleWords = {
        category: 'Test Category',
        phrases: ['multi word phrase', 'singleword', 'another phrase']
      };
      
      const validation = exporter.validateGameFormat(formatWithSingleWords);
      
      expect(validation.valid).toBe(true);
      expect(validation.warnings.some(warning => warning.includes('single-word phrases'))).toBe(true);
    });
  });

  describe('createBackup', () => {
    test('should create backup with all phrases', async () => {
      const backup = await exporter.createBackup();
      
      expect(backup).toHaveProperty('path');
      expect(backup).toHaveProperty('phraseCount');
      expect(backup).toHaveProperty('timestamp');
      expect(backup.phraseCount).toBe(10);
      
      // Verify backup file exists and has correct content
      const backupContent = await fs.readFile(backup.path, 'utf8');
      const backupData = JSON.parse(backupContent);
      
      expect(backupData).toHaveProperty('timestamp');
      expect(backupData).toHaveProperty('totalPhrases');
      expect(backupData).toHaveProperty('phrases');
      expect(backupData.totalPhrases).toBe(10);
      expect(backupData.phrases.length).toBe(10);
      
      // Clean up backup file
      await fs.unlink(backup.path);
    });

    test('should create backup with custom path', async () => {
      const customPath = path.join(__dirname, '..', 'data', 'custom-backup.json');
      const backup = await exporter.createBackup(customPath);
      
      expect(backup.path).toBe(customPath);
      
      // Verify file exists
      const exists = await fs.access(customPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
      
      // Clean up
      await fs.unlink(customPath);
    });
  });

  describe('getExportStats', () => {
    test('should return comprehensive export statistics', async () => {
      const stats = await exporter.getExportStats();
      
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('recent');
      expect(stats).toHaveProperty('recentPercentage');
      expect(stats).toHaveProperty('scoreDistribution');
      expect(stats).toHaveProperty('categories');
      
      expect(stats.total).toBe(10);
      expect(stats.recent).toBe(4); // TikTok Viral Dance, COVID-19 Documentary, Taylor Swift, Spotify Wrapped
      expect(stats.recentPercentage).toBe(40);
      
      expect(stats.scoreDistribution).toHaveProperty('high');
      expect(stats.scoreDistribution).toHaveProperty('good');
      expect(stats.scoreDistribution).toHaveProperty('ok');
      expect(stats.scoreDistribution).toHaveProperty('low');
      expect(stats.scoreDistribution).toHaveProperty('average');
      
      expect(Array.isArray(stats.categories)).toBe(true);
      expect(stats.categories.length).toBe(3);
      
      // Check category stats
      const moviesCategory = stats.categories.find(cat => cat.name === 'Movies & TV');
      expect(moviesCategory.count).toBe(4);
      expect(moviesCategory.recent).toBe(2);
      expect(moviesCategory.recentPercentage).toBe(50);
    });
  });

  describe('shuffleArray', () => {
    test('should shuffle array without modifying original', () => {
      const original = ['a', 'b', 'c', 'd', 'e'];
      const shuffled = exporter.shuffleArray(original);
      
      expect(shuffled.length).toBe(original.length);
      expect(shuffled.sort()).toEqual(original.sort()); // Same elements
      expect(original).toEqual(['a', 'b', 'c', 'd', 'e']); // Original unchanged
    });

    test('should handle empty array', () => {
      const shuffled = exporter.shuffleArray([]);
      expect(shuffled).toEqual([]);
    });

    test('should handle single element array', () => {
      const shuffled = exporter.shuffleArray(['single']);
      expect(shuffled).toEqual(['single']);
    });
  });

  describe('integration tests', () => {
    test('should export exact format matching game requirements', async () => {
      const gameFormat = await exporter.exportGameFormat({
        categories: ['Movies & TV'],
        minScore: 70,
        category: 'Movies & Entertainment'
      });
      
      // Verify exact structure matches game format
      expect(gameFormat).toEqual({
        category: 'Movies & Entertainment',
        phrases: expect.arrayContaining([
          'Star Wars',
          'The Matrix', 
          'TikTok Viral Dance'
        ])
      });
      
      // Verify validation passes
      const validation = exporter.validateGameFormat(gameFormat);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);
    });

    test('should create production-ready export with backup', async () => {
      // Create backup
      const backup = await exporter.createBackup();
      
      // Export game format
      const gameFormat = await exporter.exportGameFormat({
        minScore: 60,
        shuffle: true,
        category: 'Entertainment & Pop Culture'
      });
      
      // Validate export
      const validation = exporter.validateGameFormat(gameFormat);
      expect(validation.valid).toBe(true);
      
      // Check stats
      const stats = await exporter.getExportStats();
      expect(stats.total).toBeGreaterThan(0);
      
      // Clean up backup
      await fs.unlink(backup.path);
    });
  });
}); 