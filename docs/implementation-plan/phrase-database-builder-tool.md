# Phrase Database Builder Tool Implementation Plan

Branch Name: `feature/phrase-database-builder`

## Background and Motivation

The user wants a persistent tool to build and manage a high-quality phrase database for the Words on Phone game. The tool must ensure all phrases are **recognizable, fun, and accessible** to general audiences while maintaining variety and appropriate difficulty.

Key requirements:
1. SQLite database for persistent state
2. Phrase validation pipeline ensuring accessibility (not obscurity)
3. Duplicate detection and smart limits
4. Category quota tracking
5. Recency tracking (10% recent phrases)
6. Scalable validation for thousands of phrases
7. JSON export for game integration

## Core Philosophy

**For a party game, we want phrases that everyone can enjoy:**
- ✅ **ACCEPT**: Common knowledge, pop culture, Wikipedia-worthy topics
- ❌ **REJECT**: Ultra-technical jargon, obscure references, made-up terms

## Key Challenges and Analysis

1. **Database Design**: ✅ SOLVED - Efficient SQLite schema with indexes
2. **Text Normalization**: Consistent processing (Title Case, ASCII, word limits)
3. **Duplicate Prevention**: Smart limits (max 2 per first-word/category)
4. **Accessibility Validation**: Ensure phrases are recognizable, not obscure
5. **Scalable Processing**: Handle 10,000+ phrases efficiently at zero cost
6. **Quota Management**: Track and enforce category limits
7. **Export System**: Seamless JSON export matching game format

## Phrase Validation System (Task 5 Focus)

### Recognition Score Components (0-100 points)

#### 1. Local Heuristics (0-40 points) - Instant, No API
```javascript
// Word Simplicity (0-20 points)
- Simple words (1-2 syllables): +10
- Common English words: +10
- No technical suffixes: preserved
- Penalty for -ology, -itis, -osis: -15

// Cultural Relevance (0-20 points)
- Recent years (2020-2025): +15
- Platform/brand names: +10
- Sequel/series patterns: +10
- Viral/trending prefixes: +5
```

#### 2. Wikidata Validation (0-30 points) - Free, Batch API
```javascript
// Batch up to 50 phrases per SPARQL query
- Has Wikidata entry: +20
- 10+ Wikipedia languages: +5
- High sitelink count: +5
// Rich metadata: type (film/book/person)
```

#### 3. Reddit Relevance (0-15 points) - 60/min Rate Limit
```javascript
// Cultural zeitgeist check
- Post with 1000+ upvotes: +15
- Post with 100+ upvotes: +10
- Recent mentions: +5
```

#### 4. Category Boost (0-15 points) - Local
```javascript
{
  "Movies & TV": +10,
  "Food & Drink": +10,
  "Sports": +8,
  "Music": +8,
  "Animals": +5,
  "Places": +5,
  "Science & Technology": -5
}
```

### Processing Pipeline

```javascript
async function validatePhrases(phrases) {
  // Stage 1: Local scoring (1 second for 10,000)
  const scored = phrases.map(p => ({
    ...p,
    localScore: getLocalScore(p),
    status: null
  }));
  
  // Stage 2: Auto-categorize
  const autoAccept = scored.filter(s => s.localScore >= 70);
  const autoReject = scored.filter(s => s.localScore <= 20);
  const needsValidation = scored.filter(s => s.localScore > 20 && s.localScore < 70);
  
  // Stage 3: Batch Wikidata (free, unlimited)
  for (let i = 0; i < needsValidation.length; i += 50) {
    await validateWikidataBatch(needsValidation.slice(i, i + 50));
  }
  
  // Stage 4: Reddit for top borderline cases
  const topBorderline = needsValidation
    .filter(p => p.totalScore > 40 && p.totalScore < 60)
    .slice(0, 60); // 1 minute of API calls
    
  for (const phrase of topBorderline) {
    phrase.redditScore = await checkReddit(phrase);
    await sleep(1000); // Rate limit
  }
}
```

### Score Interpretation
- **80-100**: Excellent! Highly recognizable
- **60-79**: Good, clearly acceptable
- **40-59**: Borderline, manual review suggested
- **20-39**: Warning - likely too obscure
- **0-19**: Reject - too technical/unknown

## High-level Task Breakdown

### Task 1: Create feature branch and project structure ✅ COMPLETE

### Task 2: Set up SQLite database schema ✅ COMPLETE

### Task 3: Build phrase normalization pipeline
**Success Criteria**:
- Title Case conversion with smart handling
- ASCII character normalization
- Whitespace cleanup
- Word count validation (max 6)
- First word extraction for duplicate checking
- Integration with database add method

### Task 4: Implement duplicate detection system
**Success Criteria**:
- Prevent exact phrase duplicates
- Enforce max 2 phrases per first-word/category combo
- Case-insensitive matching
- Clear rejection messages
- Database-integrated checks

### Task 5: Create phrase recognition validation
**Success Criteria**:
- Local heuristics engine (complexity, recency, patterns)
- Wikidata SPARQL batch integration
- Reddit API for cultural validation
- Scoring system with auto-accept/reject thresholds
- Efficient processing (<10 min for 10,000 phrases)
- Result caching to prevent redundant checks
- Manual override with reason tracking
- Detailed score breakdown reports

### Task 6: Build quota tracking system
**Success Criteria**:
- Real-time category counts
- Configurable limits per category
- Warning at 80% capacity
- Enforcement at 100%
- Quota status reports

### Task 7: Implement recency tracking
**Success Criteria**:
- Mark phrases as "recent" (last 2 years)
- Track percentage (target: 10%)
- Bulk marking commands
- Recency reports
- Auto-suggestions when below target

### Task 8: Complete CLI interface
**Success Criteria**:
- `add` command with file import
- `validate` command for batch checking
- `stats` with detailed breakdowns
- `export` with format options
- Interactive phrase review mode
- Progress bars for batch operations

### Task 9: Build JSON export system
**Success Criteria**:
- Match existing game format exactly
- Category-based organization
- Filtering options (recent, score ranges)
- Backup before export
- Validation of output

### Task 10: Testing and documentation
**Success Criteria**:
- Unit tests for all validators
- Integration tests for CLI
- Performance benchmarks
- API mock for testing
- Comprehensive README
- Video demo of workflow

## Project Status Board

### TODO:
- [ ] Task 3: Build phrase normalization pipeline
- [ ] Task 4: Implement duplicate detection system  
- [ ] Task 5: Create phrase recognition validation (NEW APPROACH)
- [ ] Task 6: Build quota tracking system
- [ ] Task 7: Implement recency tracking
- [ ] Task 8: Complete CLI interface
- [ ] Task 9: Build JSON export system
- [ ] Task 10: Testing and documentation

### In Progress:

### Completed:
- [x] **Task 1: Create feature branch and project structure** ✅
  - Branch: `feature/phrase-database-builder`
  - Complete project structure with src/, tests/, data/
  - Dependencies installed (sqlite3, commander, chalk, winston)
  - Basic CLI framework operational
  
- [x] **Task 2: Set up SQLite database schema** ✅
  - Phrases table with all fields (phrase, category, first_word, recent, added)
  - Categories table for metadata and quotas
  - Performance indexes on key fields
  - Full CRUD operations implemented
  - 9 tests passing

## Implementation Notes

### Task 3-5 Architecture Decision
Based on the pivot in understanding, we're building an integrated validation pipeline rather than separate modules:

```javascript
class PhraseValidator {
  constructor(database) {
    this.db = database;
    this.scorer = new PhraseScorer();
    this.normalizer = new PhraseNormalizer();
  }
  
  async validateAndAdd(phrase, category, options = {}) {
    // 1. Normalize
    const normalized = this.normalizer.process(phrase);
    
    // 2. Check duplicates
    if (await this.db.checkDuplicate(normalized.phrase)) {
      return { success: false, reason: 'duplicate' };
    }
    
    // 3. Check first-word limit
    if (await this.db.checkFirstWordLimit(category, normalized.firstWord)) {
      return { success: false, reason: 'first-word-limit' };
    }
    
    // 4. Score for accessibility
    const score = await this.scorer.score(normalized.phrase, category);
    
    // 5. Apply thresholds
    if (score.total < 20 && !options.force) {
      return { success: false, reason: 'too-obscure', score };
    }
    
    // 6. Add with metadata
    await this.db.addPhrase(normalized.phrase, category, {
      firstWord: normalized.firstWord,
      recent: options.recent || false,
      score: score.total,
      scoreBreakdown: score.breakdown
    });
    
    return { success: true, score };
  }
}
```

## Lessons Learned

- **[2025-01-15] CRITICAL UNDERSTANDING**: For party games, we want to ACCEPT common/recognizable phrases and REJECT obscure ones. Wikipedia presence is a positive signal, not negative.
- **[2025-01-15] API STRATEGY**: Free APIs (Wikidata SPARQL, Reddit) can handle validation at scale. Local heuristics should filter 80% of phrases before any API calls.
- **[2025-01-15] ARCHITECTURE**: Instead of separate detector modules, an integrated validation pipeline provides better cohesion and reusability. 