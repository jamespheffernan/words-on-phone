# Phrase Database Builder Tool

A comprehensive SQLite-based phrase database management system for the Words on Phone game. This tool provides phrase normalization, duplicate detection, quota management, quality scoring, recency tracking, and JSON export capabilities.

## Features

✅ **SQLite Database Management**: Persistent storage with proper indexing  
✅ **Phrase Normalization**: Consistent formatting and first-word extraction  
✅ **Duplicate Detection**: Prevents duplicate phrases and first-word conflicts  
✅ **Quality Scoring**: AI-powered phrase evaluation with caching  
✅ **Quota Management**: Per-category phrase limits with warnings  
✅ **Recency Tracking**: Tracks when phrases were last used in games  
✅ **Common Phrase Detection**: Filters out overly common phrases  
✅ **JSON Export**: Generate game-ready phrase files  
✅ **Comprehensive CLI**: Full command-line interface  
✅ **Extensive Testing**: 161+ tests with 88%+ coverage

## Installation

```bash
cd tools/phrase-database
npm install
```

## Quick Start

```bash
# Initialize a new database
npm start init

# Add phrases
npm start add "The Lion King" "Movies & TV"
npm start add "Pizza" "Food & Drink"

# Check status
npm start status

# Export for game
npm start export --output game-phrases.json
```

## CLI Commands

### Database Management
```bash
# Initialize new database
npm start init [--db-path ./data/phrases.db]

# Get database status
npm start status

# Backup database
npm start backup --output backup.db
```

### Phrase Management
```bash
# Add single phrase
npm start add "phrase text" "category"

# Add multiple phrases from file
npm start batch-add --file phrases.txt --category "Movies & TV"

# List phrases
npm start list [--category "Movies & TV"] [--limit 50]

# Remove phrase
npm start remove "phrase text"
```

### Quality and Validation
```bash
# Score phrases
npm start score "phrase text" "category"
npm start batch-score --category "Movies & TV"

# Check for duplicates
npm start check-duplicates [--category "Movies & TV"]

# Detect common phrases
npm start check-common "phrase text"
```

### Quota Management
```bash
# Check quotas
npm start quota-status

# Update quota
npm start quota-set "Movies & TV" 1500

# Reset quotas to defaults
npm start quota-reset
```

### Export
```bash
# Export to JSON (Words on Phone format)
npm start export --output game-phrases.json [--min-per-category 50]

# Export raw data
npm start export-raw --output raw-data.json
```

## Database Schema

```sql
-- Main phrases table
CREATE TABLE phrases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_text TEXT NOT NULL,
    normalized_text TEXT NOT NULL,
    first_word TEXT NOT NULL,
    category TEXT NOT NULL,
    score INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used DATETIME
);

-- Indexes for performance
CREATE INDEX idx_phrases_category ON phrases(category);
CREATE INDEX idx_phrases_first_word ON phrases(first_word);
CREATE INDEX idx_phrases_normalized ON phrases(normalized_text);
CREATE INDEX idx_phrases_last_used ON phrases(last_used);
```

## API Usage

### Database Operations
```javascript
const Database = require('./src/database');
const db = new Database('./data/phrases.db');

await db.addPhrase('The Lion King', 'Movies & TV');
const phrases = await db.getByCategory('Movies & TV');
```

### Phrase Normalization
```javascript
const Normalizer = require('./src/normalizer');
const normalizer = new Normalizer();

const result = normalizer.normalize('  THE LION king  ');
// { normalized: 'The Lion King', firstWord: 'lion' }
```

### Duplicate Detection
```javascript
const DuplicateDetector = require('./src/duplicateDetector');
const detector = new DuplicateDetector(database);

const result = await detector.checkPhrase('The Lion King', 'Movies & TV');
// { isDuplicate: boolean, reason: string, conflictingPhrase: object }
```

### Quality Scoring
```javascript
const PhraseScorer = require('./src/phraseScorer');
const scorer = new PhraseScorer();

const result = await scorer.scorePhrase('The Lion King', 'Movies & TV');
// { score: 85, recommendation: 'ACCEPT', details: {...} }
```

### Quota Management
```javascript
const QuotaTracker = require('./src/quotaTracker');
const tracker = new QuotaTracker('./data/quota-config.json');

const status = await tracker.checkQuota(database, 'Movies & TV', 1);
// { allowed: true, current: 150, limit: 1000, remaining: 850 }
```

## Configuration

### Default Quotas
```javascript
{
  "Movies & TV": 1000,
  "Music": 800,
  "Sports": 600,
  "Food & Drink": 500,
  "Books": 400,
  "Science": 300,
  "History": 250,
  "Geography": 200
}
```

### Scoring Criteria
- **Length**: Optimal 2-4 words (5-25 characters)
- **Complexity**: Balanced syllable count
- **Uniqueness**: Not overly common phrases
- **Category Relevance**: Fits category appropriately
- **Game Suitability**: Good for charades-style gameplay

## File Structure

```
tools/phrase-database/
├── src/
│   ├── cli.js              # Command-line interface
│   ├── database.js         # SQLite database operations
│   ├── normalizer.js       # Text normalization
│   ├── duplicateDetector.js # Duplicate detection logic
│   ├── phraseScorer.js     # Quality scoring system
│   ├── quotaTracker.js     # Quota management
│   ├── recencyTracker.js   # Usage tracking
│   └── gameExporter.js     # JSON export functionality
├── tests/
│   └── *.test.js           # Comprehensive test suite
├── data/
│   ├── common-phrases.json # Common phrases database
│   └── wikipedia-cache.json # Wikipedia title cache
├── package.json
└── README.md
```

## Testing

Run the comprehensive test suite:

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test tests/database.test.js
```

**Test Coverage**: 161 tests with 88%+ overall coverage

## Development

### Adding New Features

1. **Add source file** in `src/`
2. **Create test file** in `tests/`
3. **Update CLI** in `src/cli.js`
4. **Add documentation** here

### Code Quality

```bash
# Lint code
npm run lint

# Run in development mode
npm run dev
```

### Database Migrations

The database auto-initializes with proper schema and indexes. For migrations:

```javascript
// Add to database.js initialize() method
await this.db.exec(`ALTER TABLE phrases ADD COLUMN new_field TEXT;`);
```

## Integration with Words on Phone

### Export Format
```javascript
{
  "Entertainment & Pop Culture": [
    "The Lion King",
    "Star Wars",
    "Pizza"
  ],
  "Movies & TV": [
    "Avatar",
    "Friends"
  ]
}
```

### Usage in Main App
```bash
# Export phrases for production
npm start export --output ../../words-on-phone-app/src/data/phrases.json --min-per-category 50

# The main app imports this file automatically
```

## Troubleshooting

### Common Issues

**Database locked**: Ensure no other processes are using the database
```bash
# Kill any hanging processes
pkill -f "phrase-database"
```

**Missing dependencies**: Reinstall packages
```bash
npm ci
```

**Test failures**: Check database permissions
```bash
chmod 755 data/
```

**Low scores**: Review scoring criteria and adjust phrase selection

### Debugging

Enable verbose logging:
```bash
DEBUG=phrase-database:* npm start <command>
```

## Performance

- **Database**: Optimized with proper indexes
- **Scoring**: Results cached to avoid API rate limits
- **Batch Operations**: Efficient bulk processing
- **Memory**: Minimal footprint with streaming for large datasets

## Contributing

1. Add comprehensive tests for new features
2. Maintain >85% test coverage
3. Update documentation
4. Follow existing code patterns
5. Test CLI commands thoroughly

## License

ISC - Part of the Words on Phone project 