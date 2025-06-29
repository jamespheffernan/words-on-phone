const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs-extra');
const winston = require('winston');

// Database configuration
const DB_PATH = path.join(__dirname, '..', 'data', 'phrases.db');
const SCHEMA_VERSION = 2; // Updated for provider attribution

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [DB-${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: path.join(__dirname, '..', 'phrase-database.log') })
  ]
});

class PhraseDatabase {
  constructor(dbPath = null) {
    this.db = null;
    this.dbPath = dbPath || DB_PATH;
  }

  async initialize() {
    try {
      // Ensure data directory exists
      await fs.ensureDir(path.dirname(this.dbPath));
      
      // Connect to database
      this.db = new sqlite3.Database(this.dbPath);
      
      // Enable foreign keys
      await this.run('PRAGMA foreign_keys = ON');
      
      // Create tables if they don't exist
      await this.createTables();
      
      // Run migrations if needed
      await this.runMigrations();
      
      // Set up indexes
      await this.createIndexes();
      
      logger.info(`Database initialized at ${this.dbPath}`);
      return true;
    } catch (error) {
      logger.error('Failed to initialize database:', error);
      throw error;
    }
  }

  async createTables() {
    const tables = [
      // Main phrases table
      `CREATE TABLE IF NOT EXISTS phrases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phrase TEXT UNIQUE NOT NULL,
        category TEXT NOT NULL,
        first_word TEXT NOT NULL,
        recent BOOLEAN DEFAULT FALSE,
        score INTEGER DEFAULT 0,
        source_provider TEXT,
        model_id TEXT,
        added TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Categories metadata table
      `CREATE TABLE IF NOT EXISTS categories (
        name TEXT PRIMARY KEY,
        description TEXT,
        quota INTEGER DEFAULT 100,
        created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Schema version tracking
      `CREATE TABLE IF NOT EXISTS schema_info (
        version INTEGER PRIMARY KEY,
        updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const tableSQL of tables) {
      await this.run(tableSQL);
    }

    // Set schema version
    await this.run(
      'INSERT OR REPLACE INTO schema_info (version) VALUES (?)',
      [SCHEMA_VERSION]
    );

    logger.info('Database tables created successfully');
  }

  async runMigrations() {
    // Get current schema version
    let currentVersion = 0;
    try {
      const result = await this.get('SELECT version FROM schema_info ORDER BY version DESC LIMIT 1');
      currentVersion = result ? result.version : 0;
    } catch (error) {
      // schema_info table doesn't exist yet, assume version 0
      currentVersion = 0;
    }

    logger.info(`Current schema version: ${currentVersion}, target: ${SCHEMA_VERSION}`);

    // Run migrations sequentially
    if (currentVersion < 2) {
      await this.migrateToVersion2();
    }

    // Update schema version
    await this.run(
      'INSERT OR REPLACE INTO schema_info (version) VALUES (?)',
      [SCHEMA_VERSION]
    );
  }

  async migrateToVersion2() {
    logger.info('Migrating to schema version 2: Adding provider attribution columns');
    
    try {
      // Add new columns to existing phrases table
      await this.run('ALTER TABLE phrases ADD COLUMN source_provider TEXT');
      await this.run('ALTER TABLE phrases ADD COLUMN model_id TEXT');
      
      logger.info('Schema migration to version 2 completed successfully');
    } catch (error) {
      // Columns might already exist, check if they do
      const tableInfo = await this.all('PRAGMA table_info(phrases)');
      const hasSourceProvider = tableInfo.some(col => col.name === 'source_provider');
      const hasModelId = tableInfo.some(col => col.name === 'model_id');
      
      if (hasSourceProvider && hasModelId) {
        logger.info('Provider attribution columns already exist, skipping migration');
      } else {
        logger.error('Failed to add provider attribution columns:', error);
        throw error;
      }
    }
  }

  async createIndexes() {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_category ON phrases(category)',
      'CREATE INDEX IF NOT EXISTS idx_first_word_category ON phrases(first_word, category)',
      'CREATE INDEX IF NOT EXISTS idx_recent ON phrases(recent)',
      'CREATE INDEX IF NOT EXISTS idx_added ON phrases(added)'
    ];

    for (const indexSQL of indexes) {
      await this.run(indexSQL);
    }

    logger.info('Database indexes created successfully');
  }

  // Promisify sqlite3 methods
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          logger.error(`SQL Error: ${err.message}`);
          logger.error(`SQL: ${sql}`);
          reject(err);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          logger.error(`SQL Error: ${err.message}`);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          logger.error(`SQL Error: ${err.message}`);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Transaction methods
  async beginTransaction() {
    return this.run('BEGIN TRANSACTION');
  }

  async commit() {
    return this.run('COMMIT');
  }

  async rollback() {
    return this.run('ROLLBACK');
  }

  // Database operations
  async addPhrase(phrase, category, options = {}) {
    // Handle both old signature and new options object
    let firstWord, recent, score, sourceProvider, modelId;
    
    if (typeof options === 'string' || options === null) {
      // Old signature: addPhrase(phrase, category, firstWord, recent)
      firstWord = options;
      recent = arguments[3] || false;
      score = 0;
      sourceProvider = null;
      modelId = null;
    } else {
      // New signature: addPhrase(phrase, category, options)
      firstWord = options.firstWord;
      recent = options.recent || false;
      score = options.score || 0;
      sourceProvider = options.sourceProvider || null;
      modelId = options.modelId || null;
    }
    
    const extractedFirstWord = firstWord || this.extractFirstWord(phrase);
    
    const result = await this.run(
      `INSERT INTO phrases (phrase, category, first_word, recent, score, source_provider, model_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [phrase, category, extractedFirstWord, recent, score, sourceProvider, modelId]
    );

    const providerInfo = sourceProvider ? ` (${sourceProvider}${modelId ? `/${modelId}` : ''})` : '';
    logger.info(`Added phrase: "${phrase}" to category "${category}"${providerInfo}`);
    return result;
  }

  async getPhrasesByCategory(category) {
    return await this.all(
      'SELECT * FROM phrases WHERE category = ? ORDER BY added DESC',
      [category]
    );
  }

  async getAllPhrases() {
    return await this.all('SELECT * FROM phrases ORDER BY category, added DESC');
  }

  async getStats() {
    const totalPhrases = await this.get('SELECT COUNT(*) as count FROM phrases');
    const categoryCounts = await this.all(`
      SELECT category, COUNT(*) as count 
      FROM phrases 
      GROUP BY category 
      ORDER BY count DESC
    `);
    const recentCount = await this.get('SELECT COUNT(*) as count FROM phrases WHERE recent = TRUE');
    
    return {
      total: totalPhrases.count,
      recent: recentCount.count,
      recentPercentage: totalPhrases.count > 0 ? (recentCount.count / totalPhrases.count * 100).toFixed(1) : 0,
      categories: categoryCounts
    };
  }

  async checkDuplicate(phrase) {
    const existing = await this.get('SELECT phrase FROM phrases WHERE phrase = ?', [phrase]);
    return !!existing;
  }

  async checkFirstWordLimit(category, firstWord, limit = 2) {
    const count = await this.get(
      'SELECT COUNT(*) as count FROM phrases WHERE category = ? AND first_word = ?',
      [category, firstWord]
    );
    return count.count >= limit;
  }

  async addCategory(name, description = '', quota = 100) {
    const result = await this.run(
      'INSERT OR REPLACE INTO categories (name, description, quota) VALUES (?, ?, ?)',
      [name, description, quota]
    );
    logger.info(`Added/updated category: "${name}"`);
    return result;
  }

  async getCategories() {
    return await this.all('SELECT * FROM categories ORDER BY name');
  }

  extractFirstWord(phrase) {
    const firstWord = phrase.trim().split(/\s+/)[0].toLowerCase();
    // Remove possessive endings for consistency with normalizer
    if (firstWord.endsWith("'s")) {
      return firstWord.slice(0, -2);
    }
    return firstWord;
  }

  async close() {
    if (this.db) {
      return new Promise((resolve) => {
        this.db.close((err) => {
          if (err) {
            logger.error('Error closing database:', err);
          } else {
            logger.info('Database connection closed');
          }
          resolve();
        });
      });
    }
  }

  // Export data in game format
  async exportToGameFormat() {
    const phrases = await this.all('SELECT phrase, category FROM phrases ORDER BY category, phrase');
    const gameFormat = {};
    
    for (const row of phrases) {
      if (!gameFormat[row.category]) {
        gameFormat[row.category] = [];
      }
      gameFormat[row.category].push(row.phrase);
    }
    
    return gameFormat;
  }
}

module.exports = PhraseDatabase; 