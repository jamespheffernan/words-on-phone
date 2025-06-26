class GameExporter {
  constructor(database) {
    this.db = database;
  }
  
  log(message) {
    console.log(`[EXPORT]: ${message}`);
  }

  /**
   * Export phrases in the exact game format
   * @param {Object} options - Export options
   * @param {string} options.category - Single category name for the export (default: "Entertainment & Pop Culture")
   * @param {boolean} options.recentOnly - Export only recent phrases
   * @param {number} options.minScore - Minimum score threshold
   * @param {number} options.maxScore - Maximum score threshold
   * @param {Array<string>} options.categories - Specific categories to include
   * @param {number} options.limit - Maximum number of phrases to export
   * @param {boolean} options.shuffle - Shuffle phrases before export
   * @returns {Object} Game format JSON object
   */
  async exportGameFormat(options = {}) {
    try {
      this.log('Starting game format export');
      
      // Build query conditions
      let whereConditions = [];
      let params = [];
      
      if (options.categories && options.categories.length > 0) {
        const placeholders = options.categories.map(() => '?').join(',');
        whereConditions.push(`category IN (${placeholders})`);
        params.push(...options.categories);
      }
      
      if (options.recentOnly) {
        whereConditions.push('recent = 1');
      }
      
      if (options.minScore !== undefined) {
        whereConditions.push('score >= ?');
        params.push(options.minScore);
      }
      
      if (options.maxScore !== undefined) {
        whereConditions.push('score <= ?');
        params.push(options.maxScore);
      }
      
      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
      let query = `SELECT phrase FROM phrases ${whereClause} ORDER BY phrase`;
      
      if (options.limit) {
        query += ` LIMIT ${options.limit}`;
      }
      
      const phrases = await this.db.db.all(query, params);
      
      if (phrases.length === 0) {
        this.log('No phrases found matching export criteria');
        return {
          category: options.category || "Entertainment & Pop Culture",
          phrases: []
        };
      }
      
      // Extract just the phrase text
      let phraseList = phrases.map(p => p.phrase);
      
      // Shuffle if requested
      if (options.shuffle) {
        phraseList = this.shuffleArray(phraseList);
      }
      
      const gameFormat = {
        category: options.category || "Entertainment & Pop Culture",
        phrases: phraseList
      };
      
      this.log(`Exported ${phraseList.length} phrases in game format`);
      
      return gameFormat;
      
    } catch (error) {
      console.error(`Game format export failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Export multiple categories as separate game format objects
   * @param {Object} options - Export options
   * @param {Array<string>} options.categories - Categories to export (if empty, exports all)
   * @param {boolean} options.recentOnly - Export only recent phrases
   * @param {number} options.minScore - Minimum score threshold
   * @param {number} options.maxScore - Maximum score threshold
   * @param {number} options.limitPerCategory - Maximum phrases per category
   * @param {boolean} options.shuffle - Shuffle phrases within each category
   * @returns {Array<Object>} Array of game format objects
   */
  async exportMultipleCategories(options = {}) {
    try {
      this.log('Starting multiple categories export');
      
      // Get categories to export
      let categoriesToExport = options.categories;
      if (!categoriesToExport || categoriesToExport.length === 0) {
        const categoryRows = await this.db.db.all('SELECT DISTINCT category FROM phrases ORDER BY category');
        categoriesToExport = categoryRows.map(row => row.category);
      }
      
      const gameFormats = [];
      
      for (const category of categoriesToExport) {
        const categoryOptions = {
          ...options,
          categories: [category],
          category: category,
          limit: options.limitPerCategory
        };
        
        const gameFormat = await this.exportGameFormat(categoryOptions);
        
        // Only include categories that have phrases
        if (gameFormat.phrases.length > 0) {
          gameFormats.push(gameFormat);
        }
      }
      
      this.log(`Exported ${gameFormats.length} categories`);
      
      return gameFormats;
      
    } catch (error) {
      console.error(`Multiple categories export failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate exported game format against schema
   * @param {Object} gameFormat - Game format object to validate
   * @returns {Object} Validation result
   */
  validateGameFormat(gameFormat) {
    const errors = [];
    const warnings = [];
    
    // Check required fields
    if (!gameFormat.category) {
      errors.push('Missing required field: category');
    }
    
    if (!gameFormat.phrases) {
      errors.push('Missing required field: phrases');
    } else if (!Array.isArray(gameFormat.phrases)) {
      errors.push('Field "phrases" must be an array');
    }
    
    // Check data quality
    if (gameFormat.category && typeof gameFormat.category !== 'string') {
      errors.push('Field "category" must be a string');
    }
    
    if (gameFormat.phrases && Array.isArray(gameFormat.phrases)) {
      // Check for empty phrases
      const emptyPhrases = gameFormat.phrases.filter(p => !p || typeof p !== 'string' || p.trim() === '');
      if (emptyPhrases.length > 0) {
        errors.push(`Found ${emptyPhrases.length} empty or invalid phrases`);
      }
      
      // Check for duplicates
      const uniquePhrases = new Set(gameFormat.phrases);
      if (uniquePhrases.size !== gameFormat.phrases.length) {
        warnings.push(`Found ${gameFormat.phrases.length - uniquePhrases.size} duplicate phrases`);
      }
      
      // Check phrase length
      const longPhrases = gameFormat.phrases.filter(p => p && p.length > 50);
      if (longPhrases.length > 0) {
        warnings.push(`Found ${longPhrases.length} phrases longer than 50 characters`);
      }
      
      // Check for very short phrases
      const shortPhrases = gameFormat.phrases.filter(p => p && p.trim().split(' ').length === 1);
      if (shortPhrases.length > 0) {
        warnings.push(`Found ${shortPhrases.length} single-word phrases`);
      }
    }
    
    const isValid = errors.length === 0;
    
    if (isValid) {
      this.log(`Game format validation passed with ${warnings.length} warnings`);
    } else {
      console.error(`Game format validation failed with ${errors.length} errors`);
    }
    
    return {
      valid: isValid,
      errors,
      warnings,
      stats: {
        totalPhrases: gameFormat.phrases ? gameFormat.phrases.length : 0,
        uniquePhrases: gameFormat.phrases ? new Set(gameFormat.phrases).size : 0,
        category: gameFormat.category || 'Unknown'
      }
    };
  }

  /**
   * Create a backup of existing phrases before export
   * @param {string} backupPath - Path for backup file
   * @returns {Object} Backup information
   */
  async createBackup(backupPath) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const finalBackupPath = backupPath || `phrases-backup-${timestamp}.json`;
      
      const allPhrases = await this.db.db.all(`
        SELECT phrase, category, recent, score, first_word, created_at 
        FROM phrases 
        ORDER BY category, phrase
      `);
      
      const backupData = {
        timestamp: new Date().toISOString(),
        totalPhrases: allPhrases.length,
        phrases: allPhrases
      };
      
      const fs = require('fs').promises;
      await fs.writeFile(finalBackupPath, JSON.stringify(backupData, null, 2));
      
      this.log(`Backup created: ${finalBackupPath} (${allPhrases.length} phrases)`);
      
      return {
        path: finalBackupPath,
        phraseCount: allPhrases.length,
        timestamp
      };
      
    } catch (error) {
      console.error(`Backup creation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get export statistics
   * @returns {Object} Export statistics
   */
  async getExportStats() {
    try {
      const stats = await this.db.db.get(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN recent = 1 THEN 1 END) as recent,
          COUNT(CASE WHEN score >= 80 THEN 1 END) as highScore,
          COUNT(CASE WHEN score >= 60 THEN 1 END) as goodScore,
          COUNT(CASE WHEN score >= 40 THEN 1 END) as okScore,
          COUNT(CASE WHEN score < 40 THEN 1 END) as lowScore,
          AVG(score) as avgScore
        FROM phrases
      `);
      
      const categories = await this.db.db.all(`
        SELECT 
          category,
          COUNT(*) as count,
          COUNT(CASE WHEN recent = 1 THEN 1 END) as recent,
          AVG(score) as avgScore
        FROM phrases 
        GROUP BY category 
        ORDER BY count DESC
      `);
      
      return {
        total: stats.total,
        recent: stats.recent,
        recentPercentage: stats.total > 0 ? Math.round((stats.recent / stats.total) * 100) : 0,
        scoreDistribution: {
          high: stats.highScore,
          good: stats.goodScore,
          ok: stats.okScore,
          low: stats.lowScore,
          average: Math.round(stats.avgScore || 0)
        },
        categories: categories.map(cat => ({
          name: cat.category,
          count: cat.count,
          recent: cat.recent,
          recentPercentage: cat.count > 0 ? Math.round((cat.recent / cat.count) * 100) : 0,
          averageScore: Math.round(cat.avgScore || 0)
        }))
      };
      
    } catch (error) {
      console.error(`Failed to get export stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Shuffle array using Fisher-Yates algorithm
   * @param {Array} array - Array to shuffle
   * @returns {Array} Shuffled array (new array, original unchanged)
   */
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

module.exports = GameExporter; 