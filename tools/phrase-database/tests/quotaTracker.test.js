const QuotaTracker = require('../src/quotaTracker');
const PhraseDatabase = require('../src/database');
const path = require('path');
const fs = require('fs');

describe('QuotaTracker', () => {
  let tracker;
  let database;
  let testDbPath;
  let testConfigPath;

  beforeEach(async () => {
    // Create unique test files for each test
    testDbPath = path.join(__dirname, '..', 'data', `test-quota-${Date.now()}.db`);
    testConfigPath = path.join(__dirname, '..', 'data', `test-quota-config-${Date.now()}.json`);
    
    database = new PhraseDatabase(testDbPath);
    await database.initialize();
    
    tracker = new QuotaTracker(database);
    tracker.CONFIG_FILE = testConfigPath;
    tracker.quotaConfig = { ...tracker.DEFAULT_QUOTAS };
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
    test('should load default quotas when no config file exists', () => {
      const config = tracker.loadQuotaConfig();
      expect(config).toEqual(tracker.DEFAULT_QUOTAS);
      expect(config['Movies & TV']).toBe(1000);
      expect(config['Music']).toBe(800);
    });

    test('should save and load quota configuration', () => {
      const customQuotas = { 'Movies & TV': 1500, 'Music': 900 };
      tracker.quotaConfig = customQuotas;
      tracker.saveQuotaConfig();

      const newTracker = new QuotaTracker(database);
      newTracker.CONFIG_FILE = testConfigPath;
      const loadedConfig = newTracker.loadQuotaConfig();
      
      expect(loadedConfig['Movies & TV']).toBe(1500);
      expect(loadedConfig['Music']).toBe(900);
    });

    test('should handle corrupted config file gracefully', () => {
      fs.writeFileSync(testConfigPath, 'invalid json');
      
      const config = tracker.loadQuotaConfig();
      expect(config).toEqual(tracker.DEFAULT_QUOTAS);
    });

    test('should merge custom config with defaults', () => {
      const partialConfig = { 'Movies & TV': 2000 };
      fs.writeFileSync(testConfigPath, JSON.stringify(partialConfig));
      
      const config = tracker.loadQuotaConfig();
      expect(config['Movies & TV']).toBe(2000);
      expect(config['Music']).toBe(800); // Default value
    });
  });

  describe('Current Counts', () => {
    test('should get current counts from database', async () => {
      await database.addPhrase('Star Wars', 'Movies & TV');
      await database.addPhrase('The Beatles', 'Music');
      await database.addPhrase('Pizza', 'Food & Drink');
      await database.addPhrase('Inception', 'Movies & TV');

      const counts = await tracker.getCurrentCounts();
      
      expect(counts['Movies & TV']).toBe(2);
      expect(counts['Music']).toBe(1);
      expect(counts['Food & Drink']).toBe(1);
      expect(counts['Sports']).toBeUndefined(); // No phrases in this category
    });

    test('should handle empty database', async () => {
      const counts = await tracker.getCurrentCounts();
      expect(counts).toEqual({});
    });
  });

  describe('Category Status', () => {
    test('should calculate status correctly for empty category', async () => {
      const status = await tracker.getCategoryStatus('Movies & TV');
      
      expect(status).toMatchObject({
        category: 'Movies & TV',
        current: 0,
        limit: 1000,
        available: 1000,
        percentage: 0,
        status: 'OK',
        color: 'green',
        canAdd: true
      });
    });

    test('should calculate status for partially filled category', async () => {
      // Add phrases to get to 80% (800 phrases for Movies & TV limit of 1000)
      for (let i = 0; i < 800; i++) {
        await database.addPhrase(`Movie ${i}`, 'Movies & TV');
      }

      const status = await tracker.getCategoryStatus('Movies & TV');
      
      expect(status).toMatchObject({
        category: 'Movies & TV',
        current: 800,
        limit: 1000,
        available: 200,
        percentage: 80,
        status: 'WARNING',
        color: 'yellow',
        canAdd: true
      });
    });

    test('should calculate status for full category', async () => {
      tracker.quotaConfig['Test Category'] = 5;
      
      for (let i = 0; i < 5; i++) {
        await database.addPhrase(`Test ${i}`, 'Test Category');
      }

      const status = await tracker.getCategoryStatus('Test Category');
      
      expect(status).toMatchObject({
        category: 'Test Category',
        current: 5,
        limit: 5,
        available: 0,
        percentage: 100,
        status: 'FULL',
        color: 'red',
        canAdd: false
      });
    });

    test('should use default quota for unknown categories', async () => {
      const status = await tracker.getCategoryStatus('Unknown Category');
      
      expect(status.limit).toBe(tracker.DEFAULT_QUOTAS['General']);
    });
  });

  describe('Full Status Report', () => {
    test('should generate comprehensive status report', async () => {
      await database.addPhrase('Star Wars', 'Movies & TV');
      await database.addPhrase('The Beatles', 'Music');
      
      const fullStatus = await tracker.getFullStatus();
      
      expect(fullStatus).toHaveProperty('summary');
      expect(fullStatus).toHaveProperty('categories');
      expect(fullStatus).toHaveProperty('timestamp');
      
      expect(fullStatus.summary.totalPhrases).toBe(2);
      expect(fullStatus.summary.categoriesOk).toBeGreaterThan(0);
      
      expect(fullStatus.categories['Movies & TV']).toMatchObject({
        current: 1,
        limit: 1000,
        status: 'OK'
      });
    });

    test('should calculate summary statistics correctly', async () => {
      // Create a category at warning level
      tracker.quotaConfig['Test Warning'] = 10;
      for (let i = 0; i < 8; i++) {
        await database.addPhrase(`Warning ${i}`, 'Test Warning');
      }
      
      // Create a category at capacity
      tracker.quotaConfig['Test Full'] = 3;
      for (let i = 0; i < 3; i++) {
        await database.addPhrase(`Full ${i}`, 'Test Full');
      }

      const fullStatus = await tracker.getFullStatus();
      
      expect(fullStatus.summary.categoriesWarning).toBeGreaterThanOrEqual(1);
      expect(fullStatus.summary.categoriesAtCapacity).toBeGreaterThanOrEqual(1);
      expect(fullStatus.summary.totalPhrases).toBe(11);
    });
  });

  describe('Quota Validation', () => {
    test('should allow adding to category with available capacity', async () => {
      const result = await tracker.canAddPhrase('Movies & TV');
      
      expect(result.canAdd).toBe(true);
      expect(result.warning).toBe(false);
      expect(result.message).toContain('available');
    });

    test('should warn when category is near capacity', async () => {
      tracker.quotaConfig['Test Category'] = 10;
      
      // Fill to 80%
      for (let i = 0; i < 8; i++) {
        await database.addPhrase(`Test ${i}`, 'Test Category');
      }

      const result = await tracker.canAddPhrase('Test Category');
      
      expect(result.canAdd).toBe(true);
      expect(result.warning).toBe(true);
      expect(result.reason).toBe('quota_warning');
      expect(result.message).toContain('80% full');
    });

    test('should reject when category is at capacity', async () => {
      tracker.quotaConfig['Test Category'] = 5;
      
      // Fill to 100%
      for (let i = 0; i < 5; i++) {
        await database.addPhrase(`Test ${i}`, 'Test Category');
      }

      const result = await tracker.canAddPhrase('Test Category');
      
      expect(result.canAdd).toBe(false);
      expect(result.reason).toBe('quota_exceeded');
      expect(result.message).toContain('at capacity');
    });
  });

  describe('Quota Management', () => {
    test('should set quota for category', async () => {
      const result = await tracker.setQuota('Movies & TV', 1500);
      
      expect(result).toMatchObject({
        category: 'Movies & TV',
        oldLimit: 1000,
        newLimit: 1500,
        message: expect.stringContaining('updated to 1500')
      });
      
      expect(tracker.quotaConfig['Movies & TV']).toBe(1500);
    });

    test('should reject invalid quota values', async () => {
      await expect(tracker.setQuota('Movies & TV', -100)).rejects.toThrow('non-negative number');
      await expect(tracker.setQuota('Movies & TV', 'invalid')).rejects.toThrow('non-negative number');
    });

    test('should bulk update quotas', async () => {
      const newQuotas = {
        'Movies & TV': 1200,
        'Music': 900,
        'Sports': 700
      };

      const result = await tracker.bulkUpdateQuotas(newQuotas);
      
      expect(result.success).toBe(true);
      expect(result.updated).toHaveLength(3);
      expect(result.errors).toHaveLength(0);
      
      expect(tracker.quotaConfig['Movies & TV']).toBe(1200);
      expect(tracker.quotaConfig['Music']).toBe(900);
      expect(tracker.quotaConfig['Sports']).toBe(700);
    });

    test('should handle bulk update errors', async () => {
      const invalidQuotas = {
        'Movies & TV': 1200,
        'Music': -100, // Invalid
        'Sports': 'invalid' // Invalid
      };

      const result = await tracker.bulkUpdateQuotas(invalidQuotas);
      
      expect(result.success).toBe(false);
      expect(result.updated).toHaveLength(1); // Only Movies & TV should succeed
      expect(result.errors).toHaveLength(2);
    });
  });

  describe('Attention and Recommendations', () => {
    test('should identify categories needing attention', async () => {
      // Create warning category
      tracker.quotaConfig['Warning Cat'] = 10;
      for (let i = 0; i < 8; i++) {
        await database.addPhrase(`Warning ${i}`, 'Warning Cat');
      }
      
      // Create full category
      tracker.quotaConfig['Full Cat'] = 3;
      for (let i = 0; i < 3; i++) {
        await database.addPhrase(`Full ${i}`, 'Full Cat');
      }

      const attention = await tracker.getCategoriesNeedingAttention();
      
      expect(attention.length).toBeGreaterThanOrEqual(2);
      
      // Full categories should come first (HIGH priority)
      const fullCategory = attention.find(cat => cat.status === 'FULL');
      const warningCategory = attention.find(cat => cat.status === 'WARNING');
      
      expect(fullCategory).toBeDefined();
      expect(fullCategory.priority).toBe('HIGH');
      expect(warningCategory).toBeDefined();
      expect(warningCategory.priority).toBe('MEDIUM');
    });

    test('should generate quota recommendations', async () => {
      // Create full category that needs increase
      tracker.quotaConfig['Need Increase'] = 5;
      for (let i = 0; i < 5; i++) {
        await database.addPhrase(`Full ${i}`, 'Need Increase');
      }
      
      // Create unused category that could be decreased
      tracker.quotaConfig['Unused High'] = 500;

      const recommendations = await tracker.getQuotaRecommendations();
      
      const increaseRec = recommendations.find(r => r.type === 'INCREASE');
      const decreaseRec = recommendations.find(r => r.type === 'DECREASE');
      
      expect(increaseRec).toBeDefined();
      expect(increaseRec.priority).toBe('HIGH');
      expect(increaseRec.suggested).toBeGreaterThan(increaseRec.current);
      
      expect(decreaseRec).toBeDefined();
      expect(decreaseRec.priority).toBe('LOW');
      expect(decreaseRec.suggested).toBeLessThan(decreaseRec.current);
    });
  });

  describe('Import/Export', () => {
    test('should export quota configuration', () => {
      tracker.quotaConfig['Custom'] = 123;
      
      const exported = tracker.exportQuotas();
      
      expect(exported).toHaveProperty('quotas');
      expect(exported).toHaveProperty('metadata');
      expect(exported.quotas['Custom']).toBe(123);
      expect(exported.metadata.exported).toBeDefined();
    });

    test('should import quota configuration', async () => {
      const config = {
        quotas: {
          'Movies & TV': 1500,
          'Music': 1200,
          'New Category': 300
        }
      };

      const result = await tracker.importQuotas(config);
      
      expect(result.success).toBe(true);
      expect(result.imported).toBe(3);
      expect(tracker.quotaConfig['Movies & TV']).toBe(1500);
      expect(tracker.quotaConfig['New Category']).toBe(300);
    });

    test('should reject invalid import configuration', async () => {
      const invalidConfig = { invalid: true };
      
      await expect(tracker.importQuotas(invalidConfig)).rejects.toThrow('missing quotas object');
    });

    test('should rollback on import failure', async () => {
      const originalQuotas = { ...tracker.quotaConfig };
      
      const invalidConfig = {
        quotas: {
          'Movies & TV': 1500,
          'Music': -100 // Invalid
        }
      };

      await expect(tracker.importQuotas(invalidConfig)).rejects.toThrow();
      expect(tracker.quotaConfig).toEqual(originalQuotas);
    });

    test('should reset to defaults', async () => {
      tracker.quotaConfig['Custom'] = 999;
      
      const result = await tracker.resetToDefaults();
      
      expect(result.success).toBe(true);
      expect(tracker.quotaConfig).toEqual(tracker.DEFAULT_QUOTAS);
      expect(tracker.quotaConfig['Custom']).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    test('should handle database errors gracefully', async () => {
      await database.close(); // Close database to trigger errors
      
      const counts = await tracker.getCurrentCounts();
      expect(counts).toEqual({});
      
      const status = await tracker.getCategoryStatus('Movies & TV');
      expect(status.current).toBe(0); // Should default to 0 when database fails
    });

    test('should handle zero quota limits', async () => {
      tracker.quotaConfig['Zero Limit'] = 0;
      
      const status = await tracker.getCategoryStatus('Zero Limit');
      
      expect(status.limit).toBe(0);
      expect(status.percentage).toBe(0);
      expect(status.canAdd).toBe(false);
    });

    test('should handle categories with spaces and special characters', async () => {
      const category = 'Movies & TV (2023)';
      await database.addPhrase('Test Movie', category);
      
      const status = await tracker.getCategoryStatus(category);
      expect(status.current).toBe(1);
    });

    test('should handle very large quota values', async () => {
      const largeQuota = 1000000;
      
      const result = await tracker.setQuota('Large Category', largeQuota);
      expect(result.newLimit).toBe(largeQuota);
      
      const status = await tracker.getCategoryStatus('Large Category');
      expect(status.limit).toBe(largeQuota);
    });
  });

  describe('Performance', () => {
    test('should handle multiple categories efficiently', async () => {
      // Add phrases to multiple categories
      const categories = ['Movies & TV', 'Music', 'Sports', 'Food & Drink', 'Books'];
      
      for (const category of categories) {
        for (let i = 0; i < 10; i++) {
          await database.addPhrase(`${category} Item ${i}`, category);
        }
      }

      const startTime = Date.now();
      const fullStatus = await tracker.getFullStatus();
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
      expect(Object.keys(fullStatus.categories)).toContain('Movies & TV');
      expect(fullStatus.summary.totalPhrases).toBe(50);
    });
  });
}); 