const RecencyTracker = require('../src/recencyTracker');
const PhraseDatabase = require('../src/database');
const path = require('path');
const fs = require('fs');

describe('RecencyTracker', () => {
  let tracker;
  let database;
  let testDbPath;
  let testConfigPath;

  beforeEach(async () => {
    // Create unique test files for each test
    testDbPath = path.join(__dirname, '..', 'data', `test-recency-${Date.now()}.db`);
    testConfigPath = path.join(__dirname, '..', 'data', `test-recency-config-${Date.now()}.json`);
    
    database = new PhraseDatabase(testDbPath);
    await database.initialize();
    
    tracker = new RecencyTracker(database);
    tracker.CONFIG_FILE = testConfigPath;
    tracker.config = { ...tracker.DEFAULT_CONFIG };
  });

  afterEach(async () => {
    await database.close();
    
    // Clean up test files
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    if (fs.existsSync(testConfigPath)) {
      fs.unlinkSync(testConfigPath);
    }
  });

  describe('Configuration Management', () => {
    test('should load default configuration', () => {
      expect(tracker.config.targetPercentage).toBe(10);
      expect(tracker.config.recentYears).toBe(2);
      expect(tracker.config.categories['Movies & TV'].target).toBe(15);
    });

    test('should save and load configuration', async () => {
      const newConfig = {
        targetPercentage: 15,
        categories: {
          'Movies & TV': { target: 20, priority: 'high' }
        }
      };

      await tracker.updateConfig(newConfig);
      expect(tracker.config.targetPercentage).toBe(15);
      expect(tracker.config.categories['Movies & TV'].target).toBe(20);

      // Create new tracker to test loading
      const newTracker = new RecencyTracker(database);
      newTracker.CONFIG_FILE = testConfigPath;
      const loadedConfig = newTracker.loadConfig();
      
      expect(loadedConfig.targetPercentage).toBe(15);
      expect(loadedConfig.categories['Movies & TV'].target).toBe(20);
    });

    test('should handle missing config file gracefully', () => {
      tracker.CONFIG_FILE = '/nonexistent/path/config.json';
      const config = tracker.loadConfig();
      expect(config.targetPercentage).toBe(10); // Should use defaults
    });
  });

  describe('Recency Status', () => {
    test('should classify recency status correctly', () => {
      expect(tracker.getRecencyStatus(12, 10)).toBe('EXCESS'); // 120% of target
      expect(tracker.getRecencyStatus(9.5, 10)).toBe('GOOD');  // 95% of target
      expect(tracker.getRecencyStatus(7.5, 10)).toBe('LOW');   // 75% of target
      expect(tracker.getRecencyStatus(5, 10)).toBe('CRITICAL'); // 50% of target
    });

    test('should handle zero target gracefully', () => {
      expect(tracker.getRecencyStatus(5, 0)).toBe('EXCESS'); // Infinity ratio
    });
  });

  describe('Recency Statistics', () => {
    beforeEach(async () => {
      // Add test phrases with different recency status
      await database.addPhrase('Classic Movie', 'Movies & TV', { recent: false });
      await database.addPhrase('Recent Movie', 'Movies & TV', { recent: true });
      await database.addPhrase('TikTok Dance', 'Social Media', { recent: true });
      await database.addPhrase('Old Song', 'Music', { recent: false });
      await database.addPhrase('Taylor Swift Song', 'Music', { recent: true });
    });

    test('should calculate category statistics correctly', async () => {
      const stats = await tracker.getRecencyStats();
      
      expect(stats.categories['Movies & TV'].total).toBe(2);
      expect(stats.categories['Movies & TV'].recent).toBe(1);
      expect(stats.categories['Movies & TV'].percentage).toBe(50.0);
      expect(stats.categories['Movies & TV'].target).toBe(15);
      expect(stats.categories['Movies & TV'].status).toBe('EXCESS');
      
      expect(stats.categories['Music'].total).toBe(2);
      expect(stats.categories['Music'].recent).toBe(1);
      expect(stats.categories['Music'].percentage).toBe(50.0);
      expect(stats.categories['Music'].target).toBe(12);
      expect(stats.categories['Music'].status).toBe('EXCESS');
    });

    test('should calculate overall statistics correctly', async () => {
      const stats = await tracker.getRecencyStats();
      
      expect(stats.overall.total).toBe(5);
      expect(stats.overall.recent).toBe(3);
      expect(stats.overall.percentage).toBe(60.0);
      expect(stats.overall.target).toBe(10);
      expect(stats.overall.status).toBe('EXCESS');
    });

    test('should handle empty database', async () => {
      // Use fresh database with no phrases
      const emptyDb = new PhraseDatabase(path.join(__dirname, '..', 'data', `empty-${Date.now()}.db`));
      await emptyDb.initialize();
      
      const emptyTracker = new RecencyTracker(emptyDb);
      const stats = await emptyTracker.getRecencyStats();
      
      expect(stats.categories).toEqual({});
      expect(stats.overall.total).toBe(0);
      expect(stats.overall.recent).toBe(0);
      expect(stats.overall.percentage).toBe(0);
      
      await emptyDb.close();
    });
  });

  describe('Automatic Detection', () => {
    beforeEach(async () => {
      // Add phrases with recent indicators
      await database.addPhrase('TikTok Challenge', 'Social Media', { recent: false });
      await database.addPhrase('COVID Restrictions', 'News', { recent: false });
      await database.addPhrase('Taylor Swift Concert', 'Music', { recent: false });
      await database.addPhrase('Classic Literature', 'Books', { recent: false });
      await database.addPhrase('ChatGPT Tutorial', 'Technology', { recent: false });
    });

    test('should detect recent phrases in dry run mode', async () => {
      const result = await tracker.detectRecentPhrases(true);
      
      expect(result.detected).toBe(4); // TikTok, COVID, Taylor Swift, ChatGPT
      expect(result.totalScanned).toBe(5);
      expect(result.updates).toHaveLength(4);
      
      // Verify specific detections
      const phrases = result.updates.map(u => u.phrase);
      expect(phrases).toContain('TikTok Challenge');
      expect(phrases).toContain('COVID Restrictions');
      expect(phrases).toContain('Taylor Swift Concert');
      expect(phrases).toContain('ChatGPT Tutorial');
      expect(phrases).not.toContain('Classic Literature');
    });

    test('should actually update phrases when not in dry run', async () => {
      await tracker.detectRecentPhrases(false);
      
      // Verify phrases were updated in database
      const tikTokPhrase = await database.get('SELECT recent FROM phrases WHERE phrase = ?', ['TikTok Challenge']);
      expect(tikTokPhrase.recent).toBe(1);
      
      const classicPhrase = await database.get('SELECT recent FROM phrases WHERE phrase = ?', ['Classic Literature']);
      expect(classicPhrase.recent).toBe(0);
    });

    test('should not re-mark already recent phrases', async () => {
      // Mark one phrase as recent first
      await database.run('UPDATE phrases SET recent = 1 WHERE phrase = ?', ['TikTok Challenge']);
      
      const result = await tracker.detectRecentPhrases(true);
      expect(result.detected).toBe(3); // Should not include already recent phrase
    });

    test('should handle phrases with multiple indicators', async () => {
      await database.addPhrase('Taylor Swift TikTok', 'Music', { recent: false });
      
      const result = await tracker.detectRecentPhrases(true);
      expect(result.updates.some(u => u.phrase === 'Taylor Swift TikTok')).toBe(true);
    });
  });

  describe('Bulk Operations', () => {
    let phraseIds;

    beforeEach(async () => {
      // Add test phrases and collect their IDs
      await database.addPhrase('Phrase 1', 'General', { recent: false });
      await database.addPhrase('Phrase 2', 'General', { recent: false });
      await database.addPhrase('Phrase 3', 'General', { recent: true });
      
      const phrases = await database.all('SELECT id, phrase FROM phrases ORDER BY phrase');
      phraseIds = phrases.map(p => p.id);
    });

    test('should bulk mark phrases as recent', async () => {
      const result = await tracker.bulkMarkRecency([phraseIds[0], phraseIds[1]], true, 'Test marking');
      
      expect(result.updated).toBe(2);
      expect(result.action).toBe('recent');
      expect(result.reason).toBe('Test marking');
      
      // Verify in database
      const updatedPhrases = await database.all('SELECT recent FROM phrases WHERE id IN (?, ?)', [phraseIds[0], phraseIds[1]]);
      expect(updatedPhrases.every(p => p.recent === 1)).toBe(true);
    });

    test('should bulk mark phrases as classic', async () => {
      const result = await tracker.bulkMarkRecency([phraseIds[2]], false);
      
      expect(result.updated).toBe(1);
      expect(result.action).toBe('classic');
      
      // Verify in database
      const updatedPhrase = await database.get('SELECT recent FROM phrases WHERE id = ?', [phraseIds[2]]);
      expect(updatedPhrase.recent).toBe(0);
    });

    test('should handle empty phrase ID array', async () => {
      await expect(tracker.bulkMarkRecency([], true)).rejects.toThrow('No phrase IDs provided');
    });

    test('should handle invalid phrase IDs gracefully', async () => {
      const result = await tracker.bulkMarkRecency([99999], true);
      expect(result.updated).toBe(0);
    });
  });

  describe('Recommendations', () => {
    beforeEach(async () => {
      // Create scenario where Movies & TV needs more recent phrases (target 15%, current ~6%)
      await database.addPhrase('Old Movie 1', 'Movies & TV', { recent: false, score: 85 });
      await database.addPhrase('Old Movie 2', 'Movies & TV', { recent: false, score: 90 });
      await database.addPhrase('Old Movie 3', 'Movies & TV', { recent: false, score: 75 });
      await database.addPhrase('Old Movie 4', 'Movies & TV', { recent: false, score: 80 });
      await database.addPhrase('Old Movie 5', 'Movies & TV', { recent: false, score: 70 });
      await database.addPhrase('Old Movie 6', 'Movies & TV', { recent: false, score: 65 });
      await database.addPhrase('Old Movie 7', 'Movies & TV', { recent: false, score: 60 });
      await database.addPhrase('Old Movie 8', 'Movies & TV', { recent: false, score: 55 });
      await database.addPhrase('Old Movie 9', 'Movies & TV', { recent: false, score: 50 });
      await database.addPhrase('Old Movie 10', 'Movies & TV', { recent: false, score: 45 });
      await database.addPhrase('Old Movie 11', 'Movies & TV', { recent: false, score: 40 });
      await database.addPhrase('Old Movie 12', 'Movies & TV', { recent: false, score: 35 });
      await database.addPhrase('Old Movie 13', 'Movies & TV', { recent: false, score: 30 });
      await database.addPhrase('Old Movie 14', 'Movies & TV', { recent: false, score: 25 });
      await database.addPhrase('Old Movie 15', 'Movies & TV', { recent: false, score: 20 });
      await database.addPhrase('Recent Movie', 'Movies & TV', { recent: true, score: 95 });
      // 16 total, 1 recent = 6.25% (below 15% target)
      
      // Create scenario where Music has too many recent phrases (target 12%, current 75%)
      await database.addPhrase('Recent Song 1', 'Music', { recent: true, score: 70 });
      await database.addPhrase('Recent Song 2', 'Music', { recent: true, score: 65 });
      await database.addPhrase('Recent Song 3', 'Music', { recent: true, score: 60 });
      await database.addPhrase('Classic Song', 'Music', { recent: false, score: 85 });
      // 4 total, 3 recent = 75% (above 12% target)
    });

    test('should recommend marking high-score phrases as recent', async () => {
      const recommendations = await tracker.getRecencyRecommendations('Movies & TV');
      
      expect(recommendations.recommendations).toHaveLength(1);
      const rec = recommendations.recommendations[0];
      
      expect(rec.category).toBe('Movies & TV');
      expect(rec.action).toBe('MARK_RECENT');
      expect(rec.needed).toBeGreaterThan(0);
      expect(rec.candidates.length).toBeGreaterThan(0);
      
      // Should recommend highest scoring phrases first
      expect(rec.candidates[0].score).toBe(90);
      expect(rec.candidates[1].score).toBe(85);
    });

    test('should recommend marking low-score phrases as classic', async () => {
      const recommendations = await tracker.getRecencyRecommendations('Music');
      
      expect(recommendations.recommendations).toHaveLength(1);
      const rec = recommendations.recommendations[0];
      
      expect(rec.category).toBe('Music');
      expect(rec.action).toBe('MARK_CLASSIC');
      expect(rec.excess).toBeGreaterThan(0);
      expect(rec.candidates.length).toBeGreaterThan(0);
      
      // Should recommend lowest scoring phrases first
      expect(rec.candidates[0].score).toBe(60);
    });

    test('should provide recommendations for all categories', async () => {
      const recommendations = await tracker.getRecencyRecommendations();
      
      expect(recommendations.recommendations.length).toBeGreaterThan(0);
      expect(recommendations.stats.total).toBe(20); // 16 Movies & TV + 4 Music
    });

    test('should handle category with good balance', async () => {
      // Add phrases to create good balance (target 8%, current ~9%)
      await database.addPhrase('Balanced 1', 'Sports', { recent: false });
      await database.addPhrase('Balanced 2', 'Sports', { recent: false });
      await database.addPhrase('Balanced 3', 'Sports', { recent: false });
      await database.addPhrase('Balanced 4', 'Sports', { recent: false });
      await database.addPhrase('Balanced 5', 'Sports', { recent: false });
      await database.addPhrase('Balanced 6', 'Sports', { recent: false });
      await database.addPhrase('Balanced 7', 'Sports', { recent: false });
      await database.addPhrase('Balanced 8', 'Sports', { recent: false });
      await database.addPhrase('Balanced 9', 'Sports', { recent: false });
      await database.addPhrase('Balanced 10', 'Sports', { recent: false });
      await database.addPhrase('Balanced Recent', 'Sports', { recent: true });
      // 11 total, 1 recent = 9.1% (close to 8% target, should be GOOD status)
      
      const recommendations = await tracker.getRecencyRecommendations('Sports');
      
      // Should have no recommendations for well-balanced category
      expect(recommendations.recommendations).toHaveLength(0);
    });
  });

  describe('Phrase Queries', () => {
    beforeEach(async () => {
      await database.addPhrase('Recent 1', 'Movies & TV', { recent: true, score: 85 });
      await database.addPhrase('Recent 2', 'Movies & TV', { recent: true, score: 90 });
      await database.addPhrase('Classic 1', 'Movies & TV', { recent: false, score: 75 });
      await database.addPhrase('Classic 2', 'Music', { recent: false, score: 80 });
      await database.addPhrase('Recent 3', 'Music', { recent: true, score: 70 });
    });

    test('should get recent phrases by category', async () => {
      const result = await tracker.getPhrasesByRecency('Movies & TV', true, 10, 0);
      
      expect(result.phrases).toHaveLength(2);
      expect(result.phrases[0].phrase).toBe('Recent 2'); // Higher score first
      expect(result.phrases[1].phrase).toBe('Recent 1');
      expect(result.phrases.every(p => p.recent === 1)).toBe(true);
      expect(result.total).toBe(2);
    });

    test('should get classic phrases across all categories', async () => {
      const result = await tracker.getPhrasesByRecency(null, false, 10, 0);
      
      expect(result.phrases).toHaveLength(2);
      expect(result.phrases.every(p => p.recent === 0)).toBe(true);
      expect(result.total).toBe(2);
    });

    test('should handle pagination', async () => {
      const result = await tracker.getPhrasesByRecency(null, true, 1, 0);
      
      expect(result.phrases).toHaveLength(1);
      expect(result.hasMore).toBe(true);
      expect(result.total).toBe(3);
    });

    test('should get accurate counts', async () => {
      const recentCount = await tracker.getRecencyCount('Movies & TV', true);
      const classicCount = await tracker.getRecencyCount('Movies & TV', false);
      
      expect(recentCount).toBe(2);
      expect(classicCount).toBe(1);
    });
  });

  describe('Report Generation', () => {
    beforeEach(async () => {
      await database.addPhrase('Movie 1', 'Movies & TV', { recent: false });
      await database.addPhrase('Movie 2', 'Movies & TV', { recent: true });
      await database.addPhrase('Song 1', 'Music', { recent: true });
      await database.addPhrase('Song 2', 'Music', { recent: true });
    });

    test('should generate comprehensive report', async () => {
      const report = await tracker.generateReport();
      
      expect(report.timestamp).toBeDefined();
      expect(report.overall).toBeDefined();
      expect(report.categories).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(report.summary).toBeDefined();
      
      expect(report.summary.totalCategories).toBe(2);
      expect(report.summary.categoriesOnTarget).toBeDefined();
      expect(report.summary.categoriesNeedingAttention).toBeDefined();
      expect(report.summary.totalRecommendations).toBeDefined();
    });

    test('should include valid timestamp', async () => {
      const report = await tracker.generateReport();
      const timestamp = new Date(report.timestamp);
      
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      await database.close(); // Close database to simulate error
      
      await expect(tracker.getRecencyStats()).rejects.toThrow();
    });

    test('should handle file system errors in config', () => {
      tracker.CONFIG_FILE = '/invalid/path/config.json';
      
      expect(() => tracker.saveConfig()).toThrow();
    });

    test('should handle malformed config file', () => {
      // Create malformed config file
      fs.writeFileSync(testConfigPath, 'invalid json');
      
      const config = tracker.loadConfig();
      expect(config.targetPercentage).toBe(10); // Should fall back to defaults
    });
  });

  describe('Edge Cases', () => {
    test('should handle phrases with special characters', async () => {
      await database.addPhrase('Café & Restaurant', 'Food & Drink', { recent: false });
      await database.addPhrase('Pokémon Go', 'Gaming', { recent: false });
      
      const stats = await tracker.getRecencyStats();
      expect(stats.categories['Food & Drink']).toBeDefined();
      expect(stats.categories['Gaming']).toBeDefined();
    });

    test('should handle very long phrases', async () => {
      const longPhrase = 'A'.repeat(200);
      await database.addPhrase(longPhrase, 'General', { recent: true });
      
      const result = await tracker.getPhrasesByRecency('General', true);
      expect(result.phrases[0].phrase).toBe(longPhrase);
    });

    test('should handle zero target percentages', async () => {
      // Update the config to include Test Category with 0 target
      tracker.config = {
        ...tracker.config,
        categories: {
          ...tracker.config.categories,
          'Test Category': { target: 0, priority: 'low' }
        }
      };
      
      await database.addPhrase('Test Phrase', 'Test Category', { recent: false });
      const stats = await tracker.getRecencyStats();
      
      expect(stats.categories['Test Category'].target).toBe(0);
      expect(stats.categories['Test Category'].percentage).toBe(0);
    });

    test('should handle large numbers of phrases efficiently', async () => {
      // Add many phrases to test performance
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(database.addPhrase(`Phrase ${i}`, 'Performance', { recent: i % 3 === 0 }));
      }
      await Promise.all(promises);
      
      const startTime = Date.now();
      const stats = await tracker.getRecencyStats();
      const endTime = Date.now();
      
      expect(stats.categories['Performance'].total).toBe(100);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
}); 