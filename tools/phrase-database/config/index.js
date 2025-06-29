/**
 * Shared Configuration for Phrase Database System
 * 
 * Centralizes categories, thresholds, and settings used across
 * the phrase generation and quality pipeline
 */

// Standard game categories with descriptions and quotas
const CATEGORIES = {
  'Movies & TV': {
    description: 'Films, TV shows, streaming content, actors, directors',
    quota: 500,
    examples: ['Star Wars', 'Breaking Bad', 'Marvel Movie', 'Disney Princess']
  },
  'Music & Artists': {
    description: 'Songs, artists, bands, music genres, instruments',
    quota: 400,
    examples: ['Taylor Swift', 'Rock Concert', 'Piano Solo', 'Pop Song']
  },
  'Sports & Athletes': {
    description: 'Sports, athletes, teams, games, equipment',
    quota: 400,
    examples: ['Basketball Game', 'Soccer Ball', 'Olympic Games', 'Home Run']
  },
  'Food & Drink': {
    description: 'Cuisine, restaurants, cooking, beverages',
    quota: 350,
    examples: ['Pizza Slice', 'Coffee Shop', 'Ice Cream', 'Taco Tuesday']
  },
  'Places & Travel': {
    description: 'Countries, cities, landmarks, vacation spots',
    quota: 350,
    examples: ['Paris France', 'Beach Vacation', 'Mountain Hiking', 'City Tour']
  },
  'Famous People': {
    description: 'Celebrities, historical figures, public figures',
    quota: 300,
    examples: ['Albert Einstein', 'Oprah Winfrey', 'Steve Jobs', 'Michael Jordan']
  },
  'Technology & Science': {
    description: 'Gadgets, inventions, scientific concepts, tech companies',
    quota: 300,
    examples: ['Smartphone App', 'Solar Panel', 'WiFi Password', 'Robot Vacuum']
  },
  'History & Events': {
    description: 'Historical events, periods, wars, discoveries',
    quota: 250,
    examples: ['Moon Landing', 'World War', 'Ancient Egypt', 'Renaissance Art']
  },
  'Nature & Animals': {
    description: 'Animals, plants, natural phenomena, outdoors',
    quota: 300,
    examples: ['Golden Retriever', 'Tropical Fish', 'Mountain Lion', 'Ocean Wave']
  },
  'Entertainment & Pop Culture': {
    description: 'Trends, memes, social media, general entertainment',
    quota: 400,
    examples: ['TikTok Dance', 'Viral Meme', 'Celebrity Gossip', 'Award Show']
  },
  'Everything': {
    description: 'General mixed content, everyday activities',
    quota: 200,
    examples: ['Birthday Party', 'Road Trip', 'Science Project', 'Family Dinner']
  },
  'Everything+': {
    description: 'Advanced/complex content for experienced players',
    quota: 200,
    examples: ['Quantum Physics', 'Ancient Mythology', 'Abstract Art', 'Philosophy Book']
  }
};

// Quality scoring thresholds
const QUALITY_THRESHOLDS = {
  autoAccept: 70,     // Auto-accept phrases with score >= 70 (Task 3 upgrade)
  manualReview: 40,   // Queue for manual review: 40-69 (Task 3 upgrade)
  autoReject: 40,     // Auto-reject phrases with score < 40 (Task 3 upgrade)
  
  // Additional thresholds for different use cases
  highQuality: 80,    // Consider high quality
  export: 50,         // Minimum score for game export
  bulk: 75           // Bulk approval threshold (upgraded for Task 3)
};

// Generation settings
const GENERATION_SETTINGS = {
  defaultBatchSize: 15,          // Phrases per API call
  maxBatchSize: 15,              // API timeout limit
  maxConcurrentBatches: 2,       // Parallel generation limit
  batchDelayMs: 3000,           // Delay between batches
  retryAttempts: 2,             // Retry failed generations
  
  // Quota enforcement
  enforceQuotas: true,
  quotaWarningThreshold: 0.9,   // Warn at 90% of quota
  
  // Duplicate detection
  duplicateThreshold: 0.85,     // Similarity threshold for duplicates
  firstWordLimit: 2,            // Max phrases per first word per category
  
  // Provider settings
  primaryProvider: 'openai',
  fallbackProvider: 'gemini',
  providerTimeout: 30000,       // 30 second timeout
  
  // Rate limiting
  rateLimitRpm: 3,              // Requests per minute
  rateLimitRpd: 200            // Requests per day
};

// Export formats and schemas
const EXPORT_FORMATS = {
  game: {
    structure: {
      category: 'string',
      phrases: 'string[]'
    },
    validation: {
      maxPhraseLength: 50,
      minPhraseLength: 3,
      allowDuplicates: false
    }
  },
  
  backup: {
    includeMetadata: true,
    includeScores: true,
    includeProviderInfo: true
  },
  
  analytics: {
    groupByProvider: true,
    groupByCategory: true,
    includeTimestamps: true
  }
};

// Database schema information
const DATABASE_SCHEMA = {
  version: 2,
  tables: {
    phrases: {
      columns: [
        'id INTEGER PRIMARY KEY AUTOINCREMENT',
        'phrase TEXT UNIQUE NOT NULL',
        'category TEXT NOT NULL',
        'first_word TEXT NOT NULL',
        'recent BOOLEAN DEFAULT FALSE',
        'score INTEGER DEFAULT 0',
        'source_provider TEXT',
        'model_id TEXT',
        'added TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
      ],
      indexes: [
        'idx_category ON phrases(category)',
        'idx_first_word_category ON phrases(first_word, category)',
        'idx_recent ON phrases(recent)',
        'idx_added ON phrases(added)'
      ]
    },
    categories: {
      columns: [
        'name TEXT PRIMARY KEY',
        'description TEXT',
        'quota INTEGER DEFAULT 100',
        'created TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
      ]
    },
    schema_info: {
      columns: [
        'version INTEGER PRIMARY KEY',
        'updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
      ]
    }
  }
};

// Helper functions
function getCategoryList() {
  return Object.keys(CATEGORIES);
}

function getCategoryConfig(categoryName) {
  return CATEGORIES[categoryName] || null;
}

function getTotalQuota() {
  return Object.values(CATEGORIES).reduce((sum, cat) => sum + cat.quota, 0);
}

function getQualityGrade(score) {
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

function isValidCategory(categoryName) {
  return categoryName in CATEGORIES;
}

module.exports = {
  CATEGORIES,
  QUALITY_THRESHOLDS,
  GENERATION_SETTINGS,
  EXPORT_FORMATS,
  DATABASE_SCHEMA,
  
  // Helper functions
  getCategoryList,
  getCategoryConfig,
  getTotalQuota,
  getQualityGrade,
  isValidCategory
}; 