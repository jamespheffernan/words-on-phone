const winston = require('winston');
const fs = require('fs');
const path = require('path');

// Configure logger for recency tracker
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [RECENCY-${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'phrase-database.log' })
  ]
});

class RecencyTracker {
  constructor(database) {
    this.db = database;
    this.CONFIG_FILE = path.join(__dirname, '..', 'data', 'recency-config.json');
    
    // Default configuration
    this.DEFAULT_CONFIG = {
      targetPercentage: 10,
      recentYears: 2,
      categories: {
        'Movies & TV': { target: 15, priority: 'high' },
        'Music': { target: 12, priority: 'high' },
        'Sports': { target: 8, priority: 'medium' },
        'Technology': { target: 20, priority: 'high' },
        'Social Media': { target: 25, priority: 'high' },
        'General': { target: 10, priority: 'medium' }
      }
    };
    
    // Load configuration
    this.config = this.loadConfig();
    
    // Recent indicators for automatic detection
    this.recentIndicators = [
      'tiktok', 'instagram', 'snapchat', 'discord', 'zoom', 'covid', 'pandemic',
      'nft', 'crypto', 'bitcoin', 'ai', 'chatgpt', 'taylor swift', 'barbie',
      'oppenheimer', 'wednesday', 'stranger things', 'ukraine', 'elon musk',
      'twitter', 'tesla', 'spacex', 'fortnite', 'among us', 'wordle', 'netflix'
    ];
  }

  loadConfig() {
    try {
      if (fs.existsSync(this.CONFIG_FILE)) {
        const config = JSON.parse(fs.readFileSync(this.CONFIG_FILE, 'utf8'));
        return { ...this.DEFAULT_CONFIG, ...config };
      }
    } catch (error) {
      logger.warn(`Failed to load recency config: ${error.message}`);
    }
    return { ...this.DEFAULT_CONFIG };
  }

  saveConfig() {
    try {
      const dir = path.dirname(this.CONFIG_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.CONFIG_FILE, JSON.stringify(this.config, null, 2));
      logger.info('Recency configuration saved');
    } catch (error) {
      logger.error(`Failed to save recency config: ${error.message}`);
      throw error;
    }
  }

  // Get current recency statistics
  async getRecencyStats() {
    try {
      const totalQuery = `
        SELECT 
          category,
          COUNT(*) as total_phrases,
          SUM(CASE WHEN recent = 1 THEN 1 ELSE 0 END) as recent_phrases
        FROM phrases 
        GROUP BY category
      `;
      
      const rows = await this.db.all(totalQuery);
      const stats = {};
      let overallTotal = 0;
      let overallRecent = 0;

      for (const row of rows) {
        const category = row.category;
        const total = row.total_phrases;
        const recent = row.recent_phrases;
        const percentage = total > 0 ? (recent / total) * 100 : 0;
        const target = this.config.categories[category]?.hasOwnProperty('target') 
          ? this.config.categories[category].target 
          : this.config.targetPercentage;
        
        stats[category] = {
          total,
          recent,
          percentage: Math.round(percentage * 10) / 10,
          target,
          status: this.getRecencyStatus(percentage, target),
          needed: Math.max(0, Math.ceil((target / 100) * total) - recent),
          excess: Math.max(0, recent - Math.ceil((target / 100) * total))
        };

        overallTotal += total;
        overallRecent += recent;
      }

      const overallPercentage = overallTotal > 0 ? (overallRecent / overallTotal) * 100 : 0;
      
      return {
        categories: stats,
        overall: {
          total: overallTotal,
          recent: overallRecent,
          percentage: Math.round(overallPercentage * 10) / 10,
          target: this.config.targetPercentage,
          status: this.getRecencyStatus(overallPercentage, this.config.targetPercentage)
        }
      };
    } catch (error) {
      logger.error(`Failed to get recency stats: ${error.message}`);
      throw error;
    }
  }

  getRecencyStatus(percentage, target) {
    const ratio = percentage / target;
    if (ratio >= 1.2) return 'EXCESS';
    if (ratio >= 0.9) return 'GOOD';
    if (ratio >= 0.7) return 'LOW';
    return 'CRITICAL';
  }

  // Automatically detect recent phrases based on content
  async detectRecentPhrases(dryRun = false) {
    try {
      const allPhrases = await this.db.all('SELECT id, phrase, category, recent FROM phrases');
      const updates = [];
      
      for (const row of allPhrases) {
        const phrase = row.phrase.toLowerCase();
        let isRecent = false;
        let reason = '';

        // Check against recent indicators
        for (const indicator of this.recentIndicators) {
          if (phrase.includes(indicator.toLowerCase())) {
            isRecent = true;
            reason = `Contains recent indicator: "${indicator}"`;
            break;
          }
        }

        // Only update if not already marked as recent
        if (isRecent && row.recent !== 1) {
          updates.push({
            id: row.id,
            phrase: row.phrase,
            category: row.category,
            reason
          });
        }
      }

      if (!dryRun && updates.length > 0) {
        await this.db.beginTransaction();
        try {
          for (const update of updates) {
            await this.db.run('UPDATE phrases SET recent = 1 WHERE id = ?', [update.id]);
          }
          await this.db.commit();
          logger.info(`Auto-detected and marked ${updates.length} phrases as recent`);
        } catch (error) {
          await this.db.rollback();
          throw error;
        }
      }

      return {
        detected: updates.length,
        updates: updates.slice(0, 10), // Return first 10 for preview
        totalScanned: allPhrases.length
      };
    } catch (error) {
      logger.error(`Failed to detect recent phrases: ${error.message}`);
      throw error;
    }
  }

  // Bulk mark phrases as recent or classic
  async bulkMarkRecency(phraseIds, isRecent, reason = '') {
    if (!Array.isArray(phraseIds) || phraseIds.length === 0) {
      throw new Error('No phrase IDs provided');
    }

    try {
      await this.db.beginTransaction();
      
      const placeholders = phraseIds.map(() => '?').join(',');
      const recencyValue = isRecent ? 1 : 0;
      
      const result = await this.db.run(
        `UPDATE phrases SET recent = ? WHERE id IN (${placeholders})`,
        [recencyValue, ...phraseIds]
      );

      await this.db.commit();
      
      const action = isRecent ? 'recent' : 'classic';
      logger.info(`Bulk marked ${result.changes} phrases as ${action}${reason ? ` (${reason})` : ''}`);
      
      return {
        updated: result.changes,
        action,
        reason
      };
    } catch (error) {
      await this.db.rollback();
      logger.error(`Failed to bulk mark recency: ${error.message}`);
      throw error;
    }
  }

  // Get phrases that need recency adjustment
  async getRecencyRecommendations(category = null) {
    try {
      const stats = await this.getRecencyStats();
      const recommendations = [];

      const categoriesToCheck = category ? [category] : Object.keys(stats.categories);

      for (const cat of categoriesToCheck) {
        const catStats = stats.categories[cat];
        if (!catStats) continue;

        if (catStats.status === 'LOW' || catStats.status === 'CRITICAL') {
          // Need more recent phrases
          const candidates = await this.db.all(`
            SELECT id, phrase, score 
            FROM phrases 
            WHERE category = ? AND recent = 0 
            ORDER BY score DESC, RANDOM()
            LIMIT ?
          `, [cat, Math.min(catStats.needed * 2, 20)]);

          recommendations.push({
            category: cat,
            action: 'MARK_RECENT',
            needed: catStats.needed,
            candidates: candidates.map(p => ({
              id: p.id,
              phrase: p.phrase,
              score: p.score,
              reason: 'High score candidate for recent marking'
            }))
          });
        } else if (catStats.status === 'EXCESS') {
          // Too many recent phrases
          const candidates = await this.db.all(`
            SELECT id, phrase, score 
            FROM phrases 
            WHERE category = ? AND recent = 1 
            ORDER BY score ASC, RANDOM()
            LIMIT ?
          `, [cat, Math.min(catStats.excess, 10)]);

          recommendations.push({
            category: cat,
            action: 'MARK_CLASSIC',
            excess: catStats.excess,
            candidates: candidates.map(p => ({
              id: p.id,
              phrase: p.phrase,
              score: p.score,
              reason: 'Lower score candidate for classic marking'
            }))
          });
        }
      }

      return {
        recommendations,
        stats: category ? stats.categories[category] : stats.overall
      };
    } catch (error) {
      logger.error(`Failed to get recency recommendations: ${error.message}`);
      throw error;
    }
  }

  // Generate recency report
  async generateReport() {
    try {
      const stats = await this.getRecencyStats();
      const recommendations = await this.getRecencyRecommendations();
      
      const report = {
        timestamp: new Date().toISOString(),
        overall: stats.overall,
        categories: stats.categories,
        recommendations: recommendations.recommendations,
        summary: {
          totalCategories: Object.keys(stats.categories).length,
          categoriesOnTarget: Object.values(stats.categories).filter(c => c.status === 'GOOD').length,
          categoriesNeedingAttention: Object.values(stats.categories).filter(c => c.status === 'LOW' || c.status === 'CRITICAL').length,
          totalRecommendations: recommendations.recommendations.length
        }
      };

      return report;
    } catch (error) {
      logger.error(`Failed to generate recency report: ${error.message}`);
      throw error;
    }
  }

  // Update configuration
  async updateConfig(newConfig) {
    try {
      this.config = { ...this.config, ...newConfig };
      this.saveConfig();
      logger.info('Recency configuration updated');
      return this.config;
    } catch (error) {
      logger.error(`Failed to update recency config: ${error.message}`);
      throw error;
    }
  }

  // Get phrases by recency status
  async getPhrasesByRecency(category = null, isRecent = true, limit = 50, offset = 0) {
    try {
      let query = 'SELECT id, phrase, category, recent, score FROM phrases WHERE recent = ?';
      const params = [isRecent ? 1 : 0];

      if (category) {
        query += ' AND category = ?';
        params.push(category);
      }

      query += ' ORDER BY score DESC, phrase ASC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const phrases = await this.db.all(query, params);
      
      return {
        phrases,
        hasMore: phrases.length === limit,
        total: await this.getRecencyCount(category, isRecent)
      };
    } catch (error) {
      logger.error(`Failed to get phrases by recency: ${error.message}`);
      throw error;
    }
  }

  async getRecencyCount(category = null, isRecent = true) {
    try {
      let query = 'SELECT COUNT(*) as count FROM phrases WHERE recent = ?';
      const params = [isRecent ? 1 : 0];

      if (category) {
        query += ' AND category = ?';
        params.push(category);
      }

      const result = await this.db.get(query, params);
      return result.count;
    } catch (error) {
      logger.error(`Failed to get recency count: ${error.message}`);
      throw error;
    }
  }
}

module.exports = RecencyTracker; 