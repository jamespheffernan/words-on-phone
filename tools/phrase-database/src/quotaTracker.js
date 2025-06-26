const winston = require('winston');
const fs = require('fs');
const path = require('path');

// Configure logger for quota tracker
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [QUOTA-${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'phrase-database.log' })
  ]
});

class QuotaTracker {
  constructor(database) {
    this.db = database;
    this.CONFIG_FILE = path.join(__dirname, '..', 'data', 'quotas.json');
    this.DEFAULT_QUOTAS = {
      'Movies & TV': 1000,
      'Music': 800,
      'Sports': 600,
      'Food & Drink': 500,
      'Places': 400,
      'Animals': 300,
      'Video Games': 400,
      'Books': 300,
      'Science': 200,
      'Technology': 200,
      'History': 200,
      'Art': 200,
      'Social Media': 300,
      'Internet Culture': 300,
      'Brands': 300,
      'General': 500
    };
    
    this.quotaConfig = this.loadQuotaConfig();
    this.WARNING_THRESHOLD = 0.8; // 80%
    this.CRITICAL_THRESHOLD = 1.0; // 100%
  }

  /**
   * Load quota configuration from file or use defaults
   * @returns {Object} - Quota configuration
   */
  loadQuotaConfig() {
    try {
      if (fs.existsSync(this.CONFIG_FILE)) {
        const data = fs.readFileSync(this.CONFIG_FILE, 'utf8');
        const config = JSON.parse(data);
        logger.info(`Loaded quota configuration from ${this.CONFIG_FILE}`);
        return { ...this.DEFAULT_QUOTAS, ...config };
      }
    } catch (error) {
      logger.warn(`Failed to load quota config: ${error.message}`);
    }
    
    logger.info('Using default quota configuration');
    return { ...this.DEFAULT_QUOTAS };
  }

  /**
   * Save quota configuration to file
   */
  saveQuotaConfig() {
    try {
      const dir = path.dirname(this.CONFIG_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(this.CONFIG_FILE, JSON.stringify(this.quotaConfig, null, 2));
      logger.info(`Quota configuration saved to ${this.CONFIG_FILE}`);
    } catch (error) {
      logger.error(`Failed to save quota config: ${error.message}`);
    }
  }

  /**
   * Get current phrase counts for all categories
   * @returns {Object} - Category counts
   */
  async getCurrentCounts() {
    try {
      const query = `
        SELECT category, COUNT(*) as count
        FROM phrases
        GROUP BY category
        ORDER BY category
      `;
      
      const rows = await this.db.all(query);
      const counts = {};
      
      rows.forEach(row => {
        counts[row.category] = row.count;
      });
      
      return counts;
    } catch (error) {
      logger.error(`Error getting current counts: ${error.message}`);
      return {};
    }
  }

  /**
   * Get quota status for a specific category
   * @param {string} category - Category name
   * @returns {Object} - Quota status
   */
  async getCategoryStatus(category) {
    const counts = await this.getCurrentCounts();
    const current = counts[category] || 0;
    const limit = this.quotaConfig.hasOwnProperty(category) ? this.quotaConfig[category] : this.DEFAULT_QUOTAS['General'];
    const percentage = limit > 0 ? (current / limit) : 0;
    
    let status = 'OK';
    let color = 'green';
    
    if (percentage >= this.CRITICAL_THRESHOLD) {
      status = 'FULL';
      color = 'red';
    } else if (percentage >= this.WARNING_THRESHOLD) {
      status = 'WARNING';
      color = 'yellow';
    }
    
    return {
      category,
      current,
      limit,
      available: Math.max(0, limit - current),
      percentage: Math.round(percentage * 100),
      status,
      color,
      canAdd: current < limit
    };
  }

  /**
   * Get comprehensive quota status for all categories
   * @returns {Object} - Complete status report
   */
  async getFullStatus() {
    const counts = await this.getCurrentCounts();
    const categories = new Set([
      ...Object.keys(this.quotaConfig),
      ...Object.keys(counts)
    ]);
    
    const categoryStatus = {};
    const summary = {
      totalPhrases: 0,
      totalQuota: 0,
      categoriesAtCapacity: 0,
      categoriesWarning: 0,
      categoriesOk: 0
    };
    
    for (const category of categories) {
      const status = await this.getCategoryStatus(category);
      categoryStatus[category] = status;
      
      summary.totalPhrases += status.current;
      summary.totalQuota += status.limit;
      
      if (status.status === 'FULL') {
        summary.categoriesAtCapacity++;
      } else if (status.status === 'WARNING') {
        summary.categoriesWarning++;
      } else {
        summary.categoriesOk++;
      }
    }
    
    summary.overallPercentage = summary.totalQuota > 0 ? 
      Math.round((summary.totalPhrases / summary.totalQuota) * 100) : 0;
    
    return {
      summary,
      categories: categoryStatus,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Check if a phrase can be added to a category
   * @param {string} category - Category to check
   * @returns {Object} - Validation result
   */
  async canAddPhrase(category) {
    const status = await this.getCategoryStatus(category);
    
    if (!status.canAdd) {
      logger.warn(`Quota exceeded for category "${category}": ${status.current}/${status.limit}`);
      return {
        canAdd: false,
        reason: 'quota_exceeded',
        message: `Category "${category}" is at capacity (${status.current}/${status.limit})`,
        status
      };
    }
    
    if (status.status === 'WARNING') {
      logger.info(`Quota warning for category "${category}": ${status.percentage}% full`);
      return {
        canAdd: true,
        warning: true,
        reason: 'quota_warning',
        message: `Category "${category}" is ${status.percentage}% full (${status.current}/${status.limit})`,
        status
      };
    }
    
    return {
      canAdd: true,
      warning: false,
      message: `Category "${category}" has ${status.available} slots available`,
      status
    };
  }

  /**
   * Set quota limit for a category
   * @param {string} category - Category name
   * @param {number} limit - New limit
   * @returns {Object} - Update result
   */
  async setQuota(category, limit) {
    if (typeof limit !== 'number' || limit < 0) {
      throw new Error('Quota limit must be a non-negative number');
    }
    
    const oldLimit = this.quotaConfig[category] || 0;
    this.quotaConfig[category] = limit;
    this.saveQuotaConfig();
    
    const status = await this.getCategoryStatus(category);
    
    logger.info(`Updated quota for "${category}": ${oldLimit} → ${limit}`);
    
    return {
      category,
      oldLimit,
      newLimit: limit,
      status,
      message: `Quota for "${category}" updated to ${limit}`
    };
  }

  /**
   * Get categories that need attention (warnings or full)
   * @returns {Array} - Categories needing attention
   */
  async getCategoriesNeedingAttention() {
    const fullStatus = await this.getFullStatus();
    const needsAttention = [];
    
    Object.entries(fullStatus.categories).forEach(([category, status]) => {
      if (status.status === 'FULL' || status.status === 'WARNING') {
        needsAttention.push({
          category,
          status: status.status,
          current: status.current,
          limit: status.limit,
          percentage: status.percentage,
          priority: status.status === 'FULL' ? 'HIGH' : 'MEDIUM'
        });
      }
    });
    
    // Sort by priority (FULL first) then by percentage
    needsAttention.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority === 'HIGH' ? -1 : 1;
      }
      return b.percentage - a.percentage;
    });
    
    return needsAttention;
  }

  /**
   * Generate recommendations for quota adjustments
   * @returns {Array} - Recommendations
   */
  async getQuotaRecommendations() {
    const fullStatus = await this.getFullStatus();
    const recommendations = [];
    
    Object.entries(fullStatus.categories).forEach(([category, status]) => {
      if (status.status === 'FULL') {
        const suggestedIncrease = Math.ceil(status.limit * 0.2); // 20% increase
        recommendations.push({
          category,
          type: 'INCREASE',
          priority: 'HIGH',
          current: status.limit,
          suggested: status.limit + suggestedIncrease,
          reason: `Category is at capacity (${status.current}/${status.limit})`,
          impact: `Would provide ${suggestedIncrease} additional slots`
        });
      } else if (status.current === 0 && status.limit > 100) {
        recommendations.push({
          category,
          type: 'DECREASE',
          priority: 'LOW',
          current: status.limit,
          suggested: Math.max(100, Math.ceil(status.limit * 0.5)),
          reason: 'Category has no phrases and high limit',
          impact: 'Could reallocate capacity to active categories'
        });
      } else if (status.percentage < 10 && status.limit > 200) {
        recommendations.push({
          category,
          type: 'REVIEW',
          priority: 'LOW',
          current: status.limit,
          suggested: Math.max(status.current + 50, Math.ceil(status.limit * 0.7)),
          reason: `Low utilization (${status.percentage}% used)`,
          impact: 'Consider redistributing quota to active categories'
        });
      }
    });
    
    return recommendations.sort((a, b) => {
      const priorityOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Bulk update quotas from configuration object
   * @param {Object} quotas - New quota configuration
   * @returns {Object} - Update results
   */
  async bulkUpdateQuotas(quotas) {
    if (typeof quotas !== 'object' || quotas === null) {
      throw new Error('Quotas must be a valid object');
    }
    
    const results = [];
    const errors = [];
    
    for (const [category, limit] of Object.entries(quotas)) {
      try {
        if (typeof limit !== 'number' || limit < 0) {
          throw new Error(`Invalid limit for "${category}": must be a non-negative number`);
        }
        
        const result = await this.setQuota(category, limit);
        results.push(result);
      } catch (error) {
        errors.push({
          category,
          error: error.message
        });
      }
    }
    
    return {
      updated: results,
      errors,
      success: errors.length === 0
    };
  }

  /**
   * Export quota configuration
   * @returns {Object} - Current quota configuration
   */
  exportQuotas() {
    return {
      quotas: { ...this.quotaConfig },
      metadata: {
        exported: new Date().toISOString(),
        warningThreshold: this.WARNING_THRESHOLD,
        criticalThreshold: this.CRITICAL_THRESHOLD,
        configFile: this.CONFIG_FILE
      }
    };
  }

  /**
   * Import quota configuration
   * @param {Object} config - Configuration to import
   * @returns {Object} - Import result
   */
  async importQuotas(config) {
    if (!config.quotas || typeof config.quotas !== 'object') {
      throw new Error('Invalid configuration: missing quotas object');
    }
    
    const backup = { ...this.quotaConfig };
    
    try {
      const result = await this.bulkUpdateQuotas(config.quotas);
      
      if (!result.success) {
        // Restore backup on partial failure
        this.quotaConfig = backup;
        this.saveQuotaConfig();
        throw new Error(`Import failed: ${result.errors.map(e => e.error).join(', ')}`);
      }
      
      logger.info('Quota configuration imported successfully');
      return {
        success: true,
        imported: Object.keys(config.quotas).length,
        message: 'Quota configuration imported successfully'
      };
      
    } catch (error) {
      this.quotaConfig = backup;
      this.saveQuotaConfig();
      throw error;
    }
  }

  /**
   * Reset quotas to defaults
   * @returns {Object} - Reset result
   */
  async resetToDefaults() {
    const backup = { ...this.quotaConfig };
    this.quotaConfig = { ...this.DEFAULT_QUOTAS };
    this.saveQuotaConfig();
    
    logger.info('Quota configuration reset to defaults');
    
    return {
      success: true,
      backup,
      current: this.quotaConfig,
      message: 'Quota configuration reset to defaults'
    };
  }
}

module.exports = QuotaTracker; 