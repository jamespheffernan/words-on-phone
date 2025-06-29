# Phrase Database Architecture

## Overview

The Phrase Database system is a comprehensive pipeline for generating, scoring, storing, and exporting high-quality phrases for the Words on Phone party game. The system integrates AI generation, quality scoring, duplicate detection, and provider attribution into a cohesive workflow.

## Data Flow Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   AI Generation │    │ Quality Pipeline │    │ Database Storage│
│  (OpenAI/Gemini)│───▶│ (Scoring & Valid)│───▶│   (SQLite v2)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Provider        │    │ Decision Engine  │    │ Attribution     │
│ Attribution     │    │ Accept/Review/   │    │ Tracking        │
│ (source+model)  │    │ Reject           │    │ (provider+model)│
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                 │
                                 ▼
                    ┌──────────────────┐
                    │ Manual Review    │
                    │ (React UI)       │
                    └──────────────────┘
                                 │
                                 ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Game Export     │◀───│ Export Pipeline  │◀───│ Quality Filter  │
│ (JSON Format)   │    │ (Validation)     │    │ (Score Thresh.) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────┐
│ Game Import     │
│ (React App)     │
└─────────────────┘
```

## Core Components

### 1. Configuration Layer (`config/index.js`)
- **Purpose**: Centralized configuration for categories, thresholds, and settings
- **Key Features**:
  - 12 game categories with quotas and examples
  - Quality thresholds (auto-accept: 60, manual review: 40-59, auto-reject: <40)
  - Generation settings (batch size, rate limits, provider configuration)
  - Export formats and validation rules

### 2. AI Generation Layer (`src/api-client.js`)
- **Purpose**: Interface with production AI APIs (OpenAI primary, Gemini fallback)
- **Key Features**:
  - OpenAI GPT-4o as primary service
  - Gemini 2.5 Flash as fallback
  - Service-specific payload handling
  - Provider attribution (service + model ID)
  - Duplicate avoidance through existing phrase context

### 3. Quality Pipeline (`src/quality-pipeline.js`)
- **Purpose**: Score and validate generated phrases
- **Key Features**:
  - Configurable quality thresholds
  - Decision engine (accept/review/reject)
  - Provider attribution propagation
  - Batch processing with statistics
  - Integration with scoring algorithms

### 4. Database Layer (`src/database.js`)
- **Purpose**: SQLite persistence with schema versioning
- **Schema v2 Features**:
  - Provider attribution columns (`source_provider`, `model_id`)
  - Automatic migration system
  - Phrase deduplication
  - Category quota tracking
  - Indexed queries for performance

### 5. Export Pipeline (`src/gameExporter.js`)
- **Purpose**: Convert database phrases to game-compatible JSON format
- **Key Features**:
  - Game format validation
  - Multiple export modes (single category, all categories, production)
  - Quality filtering and shuffling
  - Backup and analytics export options

## Refactored Scripts

### 1. `generate-batch.js` (renamed from `generate-category.js`)
- **Purpose**: Generate phrases for a single category
- **Usage**: `node scripts/generate-batch.js "Movies & TV" 100 --debug`
- **Features**:
  - Category validation against configuration
  - Quota enforcement
  - Provider attribution tracking
  - Batch statistics and progress reporting
  - Configurable delays and retries

### 2. `process-batch.js` (new)
- **Purpose**: Process existing phrases through quality pipeline
- **Usage**: `node scripts/process-batch.js "Movies & TV" --unscored`
- **Features**:
  - Re-score existing phrases
  - Filter by score thresholds
  - Quality distribution analysis
  - Batch processing for performance

### 3. `export-game-json.js` (new)
- **Purpose**: Export phrases to game JSON format
- **Usage**: `node scripts/export-game-json.js production --output-dir=./exports`
- **Features**:
  - Multiple export modes (category, all, production, stats)
  - Quality filtering and validation
  - Production readiness assessment
  - File output management

## Provider Attribution System

### Database Schema
```sql
-- Schema v2 additions
ALTER TABLE phrases ADD COLUMN source_provider TEXT;
ALTER TABLE phrases ADD COLUMN model_id TEXT;
```

### Attribution Flow
1. **Generation**: API client captures service and model ID
2. **Processing**: Quality pipeline propagates attribution
3. **Storage**: Database stores provider information with each phrase
4. **Analytics**: Provider comparison scripts analyze quality by source

### Supported Providers
- **OpenAI**: `gpt-4o` (primary)
- **Gemini**: `gemini-2.5-flash` (fallback)
- **Future**: Extensible for additional providers

## Quality Scoring System

### Thresholds (Configurable)
- **Auto-Accept**: Score ≥ 60 (Grade C+)
- **Manual Review**: Score 40-59 (Grade D)
- **Auto-Reject**: Score < 40 (Grade F)

### Scoring Factors
- Length optimization (2-4 words, 8-20 characters)
- Syllable complexity (≤6 syllables preferred)
- Category relevance (keyword matching)
- Pop culture relevance (entertainment bonus)
- Inappropriate content detection
- Common phrase penalty

### Decision Engine
```javascript
if (score >= 60) return 'accept';      // Auto-approve
if (score >= 40) return 'review';      // Queue for manual review
return 'reject';                       // Auto-reject
```

## Category Management

### 12 Standard Categories
1. **Movies & TV** (quota: 500)
2. **Music & Artists** (quota: 400)
3. **Sports & Athletes** (quota: 400)
4. **Food & Drink** (quota: 350)
5. **Places & Travel** (quota: 350)
6. **Famous People** (quota: 300)
7. **Technology & Science** (quota: 300)
8. **Nature & Animals** (quota: 300)
9. **Entertainment & Pop Culture** (quota: 400)
10. **History & Events** (quota: 250)
11. **Everything** (quota: 200)
12. **Everything+** (quota: 200)

**Total Quota**: 4,000 phrases (expandable to 5,000+)

### Quota Enforcement
- Configurable per category
- Warning at 90% of quota
- Optional enforcement during generation
- Balanced distribution across categories

## Export Formats

### Game Format (Primary)
```json
{
  "category": "Movies & TV",
  "phrases": [
    "Star Wars",
    "Breaking Bad",
    "Marvel Movie"
  ]
}
```

### Analytics Format
```json
{
  "phrase": "Star Wars",
  "category": "Movies & TV",
  "score": 85,
  "source_provider": "openai",
  "model_id": "gpt-4o",
  "added": "2025-01-15T10:30:00Z"
}
```

## Performance Characteristics

### Generation Performance
- **Batch Size**: 15 phrases per API call (timeout limit)
- **Processing Time**: <2 seconds per batch
- **Rate Limits**: 3 RPM, 200 RPD (configurable)
- **Concurrency**: Max 2 parallel batches

### Database Performance
- **Schema**: Optimized with indexes on category, first_word, score
- **Migration**: Automatic schema versioning
- **Queries**: Sub-second response for typical operations
- **Storage**: Efficient SQLite with WAL mode

### Quality Pipeline Performance
- **Scoring**: ~50ms per phrase
- **Batch Processing**: 20 phrases per batch
- **Decision Engine**: Real-time threshold application
- **Validation**: Comprehensive duplicate and content checks

## Integration Points

### Main Game Application
- **Import Path**: `words-on-phone-app/src/data/phrases.ts`
- **Format**: TypeScript constant with category arrays
- **Update Process**: Export → Copy → Deploy

### Manual Review Interface
- **Location**: `tools/phrase-review/` (React app)
- **Database**: Direct SQLite connection
- **Features**: Bulk review, keyboard shortcuts, quality filtering

### Analytics Dashboard
- **Provider Comparison**: Quality metrics by AI service
- **Category Analysis**: Distribution and balance tracking
- **Quality Trends**: Score improvements over time

## Monitoring & Observability

### Logging
- **Winston**: Structured logging to console and file
- **Levels**: Error, warn, info, debug
- **Context**: Provider, category, batch, phrase-level details

### Metrics
- **Generation**: Success rate, provider usage, processing time
- **Quality**: Score distribution, acceptance rate, manual review queue
- **Database**: Storage growth, category balance, duplicate rate

### Error Handling
- **Provider Fallback**: Automatic OpenAI → Gemini fallback
- **Retry Logic**: Configurable retry attempts
- **Graceful Degradation**: Continue processing on individual failures

## Security & Data Privacy

### API Security
- **Key Management**: Environment variables only
- **Rate Limiting**: Respect provider limits
- **Timeout Handling**: 30-second request timeouts

### Data Privacy
- **No PII**: Only phrase text and metadata stored
- **Local Storage**: SQLite database, no cloud persistence
- **Provider Attribution**: Service name and model only, no request IDs

## Future Extensibility

### Provider Support
- Easy addition of new AI services
- Configurable model parameters
- A/B testing capabilities

### Quality Improvements
- Machine learning scoring models
- User feedback integration
- Crowdsourced quality ratings

### Scale Considerations
- Distributed generation across multiple API keys
- Database sharding for >100k phrases
- Caching layer for repeated operations

## Development Workflow

### Local Development
```bash
# Install dependencies
npm install

# Generate phrases
node scripts/generate-batch.js "Movies & TV" 50 --debug

# Process quality
node scripts/process-batch.js "Movies & TV" --distribution

# Export for game
node scripts/export-game-json.js production --output-dir=./exports
```

### Testing
```bash
# Run test suite
npm test

# Integration test
node scripts/test-integration.js

# Provider test
node scripts/test-provider-switch.js
```

### Production Deployment
1. Generate phrases in staging environment
2. Quality review and approval
3. Export production JSON
4. Deploy to game application
5. Monitor usage and quality metrics 