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
  },
  
  // Phase 1 Category Expansion - Task 5e
  'Occupations & Jobs': {
    description: 'Professions, careers, job roles, workplace activities',
    quota: 200,
    examples: ['Police Officer', 'Software Engineer', 'Restaurant Chef', 'School Teacher']
  },
  'Brands & Companies': {
    description: 'Famous brands, companies, products, logos, retail stores',
    quota: 200,
    examples: ['Apple Store', 'Nike Shoes', 'Tesla Car', 'Starbucks Coffee']
  },
  'Holidays & Celebrations': {
    description: 'Holidays, festivals, special occasions, party themes',
    quota: 150,
    examples: ['Christmas Morning', 'Birthday Party', 'New Year', 'Halloween Costume']
  },
  'Emotions & Feelings': {
    description: 'Emotions, moods, expressions, reactions, body language',
    quota: 150,
    examples: ['Happy Dance', 'Angry Face', 'Nervous Laugh', 'Surprised Look']
  },
  'Actions & Verbs': {
    description: 'Common actions, activities, daily tasks, physical movements',
    quota: 200,
    examples: ['Running Late', 'Taking Selfie', 'Cooking Dinner', 'Walking Dog']
  },
  
  // Phase 2 Category Expansion - Task 5e
  'Clothing & Fashion': {
    description: 'Clothing items, fashion accessories, style trends, wardrobe pieces',
    quota: 150,
    examples: ['High Heels', 'Winter Coat', 'Baseball Cap', 'Evening Dress']
  },
  'Weather & Seasons': {
    description: 'Weather conditions, seasonal activities, climate phenomena, seasonal changes',
    quota: 100,
    examples: ['Thunder Storm', 'Snow Day', 'Heat Wave', 'Spring Rain']
  },
  'School & Education': {
    description: 'Educational activities, school subjects, academic events, learning concepts',
    quota: 150,
    examples: ['Math Test', 'Science Fair', 'Graduation Day', 'Library Book']
  },
  'Health & Medical': {
    description: 'Medical procedures, health activities, body care, wellness concepts',
    quota: 150,
    examples: ['Doctor Visit', 'Broken Arm', 'Eye Exam', 'Taking Medicine']
  },
  'Hobbies & Activities': {
    description: 'Recreational activities, pastimes, creative pursuits, leisure activities',
    quota: 200,
    examples: ['Video Gaming', 'Book Club', 'Yoga Class', 'Garden Work']
  },
  'Transportation': {
    description: 'Vehicles, travel methods, transportation activities, commuting',
    quota: 150,
    examples: ['Road Trip', 'Airplane Landing', 'Subway Ride', 'Bicycle Race']
  },
  'Household Items': {
    description: 'Home appliances, furniture, kitchen items, daily household objects',
    quota: 200,
    examples: ['Coffee Maker', 'Washing Machine', 'TV Remote', 'Vacuum Cleaner']
  },
  
  // Phase 3 Category Expansion - Task 5e (Final Phase)
  'Body Parts & Gestures': {
    description: 'Body parts, physical gestures, movements, expressions, sign language',
    quota: 100,
    examples: ['Thumbs Up', 'Eye Roll', 'High Five', 'Shoulder Shrug']
  },
  'Colors & Shapes': {
    description: 'Colors, geometric shapes, patterns, visual designs, artistic elements',
    quota: 100,
    examples: ['Red Circle', 'Blue Sky', 'Yellow Sun', 'Green Triangle']
  },
  'Numbers & Time': {
    description: 'Numbers, time concepts, calendar events, mathematical operations, measurements',
    quota: 100,
    examples: ['Five Minutes', 'Midnight Hour', 'Lucky Seven', 'Half Past Two']
  },
  'Fantasy & Magic': {
    description: 'Fantasy creatures, magical concepts, mythical beings, supernatural elements',
    quota: 150,
    examples: ['Magic Wand', 'Dragon Fire', 'Fairy Tale', 'Wizard Hat']
  },
  'Crime & Mystery': {
    description: 'Detective stories, crime scenes, mystery solving, police work, investigations',
    quota: 150,
    examples: ['Detective Story', 'Bank Robbery', 'Secret Agent', 'Crime Scene']
  },
  'Romance & Relationships': {
    description: 'Romance, dating, relationships, love, marriage, family connections',
    quota: 150,
    examples: ['First Date', 'Wedding Day', 'Love Letter', 'Anniversary']
  },
  'Kids & Baby': {
    description: 'Children activities, baby items, toys, playground, parenting, childhood',
    quota: 150,
    examples: ['Baby Bottle', 'Playground Slide', 'Bedtime Story', 'Toy Box']
  },
  'Internet & Social Media': {
    description: 'Online activities, social media, digital life, technology interactions, web culture',
    quota: 150,
    examples: ['Instagram Post', 'Viral Video', 'Text Message', 'Online Shopping']
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