# Phrase Database Builder Tool

A powerful CLI tool for building and managing phrase databases with SQLite persistence, normalization, and validation.

## Features

- **SQLite Database**: Persistent storage with proper schema and indexing
- **Phrase Normalization**: Automatic Title Case, ASCII filtering, and whitespace cleanup
- **Duplicate Detection**: Prevent exact duplicates and enforce first-word limits per category
- **Common Phrase Filtering**: Reject overly common phrases using Wikipedia/n-gram checks
- **Category Quotas**: Track and enforce phrase limits per category
- **Recency Tracking**: Maintain 10% recent phrases for fresh content
- **JSON Export**: Export to game-compatible format
- **CLI Interface**: Command-line interface for all operations

## Installation

```bash
# Install dependencies
npm install

# Make CLI globally available (optional)
npm link
```

## Usage

### Initialize Database
```bash
npm start init
```

### Add Phrases
```bash
# Add phrases interactively
npm start add --interactive --category "Movies & TV"

# Import from file
npm start add --file phrases.json --category "Sports"
```

### View Statistics
```bash
npm start stats
```

### Export Database
```bash
# Export all phrases
npm start export --output phrases-export.json

# Export specific category
npm start export --category "Movies & TV" --output movies-export.json
```

## Database Schema

```sql
CREATE TABLE phrases (
    phrase TEXT PRIMARY KEY,
    category TEXT,
    first_word TEXT,
    recent BOOLEAN DEFAULT FALSE,
    added TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_category ON phrases(category);
CREATE INDEX idx_first_word_category ON phrases(first_word, category);
```

## Validation Rules

1. **Length**: Maximum 6 words per phrase
2. **Duplicates**: No exact phrase duplicates
3. **First Word Limit**: Maximum 2 phrases per category with same first word
4. **Common Phrases**: Reject overly common phrases (Wikipedia titles, high n-gram frequency)
5. **ASCII Only**: Strip non-ASCII characters during normalization

## Development

```bash
# Run in development mode
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint
```

## Project Structure

```
src/
├── cli.js              # Main CLI entry point
├── database.js         # Database operations
├── normalizer.js       # Phrase normalization
├── validator.js        # Validation rules
└── exporter.js         # JSON export functionality

lib/
├── common-phrases.js   # Common phrase detection
└── utils.js           # Utility functions

tests/
├── *.test.js          # Unit tests

data/
├── phrases.db         # SQLite database file
└── *.json            # Import/export files
```

## License

ISC 