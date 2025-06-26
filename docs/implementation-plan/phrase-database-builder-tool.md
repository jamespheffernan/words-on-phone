# Phrase Database Builder Tool Implementation Plan

Branch Name: `feature/phrase-database-builder`

## Background and Motivation

The user wants a persistent tool to build and manage the phrase database with:
1. SQLite database for persistent state
2. Script for processing candidate phrases with normalization and validation
3. Duplicate detection and prevention
4. Category quota tracking
5. Recency tracking (10% recent phrases)
6. JSON export capability
7. Version control for rollback

This tool will enable systematic phrase database construction with quality controls and state persistence.

## Key Challenges and Analysis

1. **Database Design**: Creating efficient schema for phrase storage and metadata
2. **Normalization Pipeline**: Consistent text processing (Title Case, ASCII, trimming)
3. **Validation Rules**: Enforcing business rules (max 6 words, 2 per first-word/category)
4. **Phrase Recognition Validation**: Ensuring phrases are recognizable and not too obscure
5. **Quota Management**: Tracking and enforcing category quotas
6. **Recency Tracking**: Managing the 10% recent phrase requirement
7. **Export/Import**: Seamless JSON export for game integration

## High-level Task Breakdown

### Task 1: Create feature branch and project structure
**Success Criteria**: 
- Create and checkout `feature/phrase-database-builder` branch
- Create `tools/phrase-database/` directory structure
- Initialize npm project with dependencies (sqlite3, commander, etc.)

### Task 2: Set up SQLite database schema
**Success Criteria**:
- Create SQLite database file
- Implement phrases table with proper schema
- Add indexes for performance (category, first_word)
- Create migrations system for schema updates
- Add categories and metadata tables

### Task 3: Build phrase normalization pipeline
**Success Criteria**:
- Title Case conversion function
- Non-ASCII character stripping
- Whitespace trimming and normalization
- Word count validation (max 6 words)
- Extract first word for duplicate checking

### Task 4: Implement duplicate detection system
**Success Criteria**:
- Check for exact phrase duplicates
- Enforce max 2 phrases per category with same first word
- Provide detailed duplicate reports
- Handle case-insensitive matching

### Task 5: Create phrase recognition validation
**Success Criteria**:
- Implement local heuristics scoring (word complexity, recency indicators)
- Integrate Wikidata SPARQL API for batch validation
- Add Reddit API integration for cultural relevance checking
- Create tiered scoring system (0-100 with auto-accept/reject thresholds)
- Build efficient batch processing for thousands of phrases
- Implement caching to avoid redundant API calls
- Add manual override capability with reason tracking
- Generate detailed validation reports with score breakdowns
- Achieve <10 minute processing time for 10,000 phrases

### Task 6: Build quota tracking system
**Success Criteria**:
- Track phrases per category
- Display quota status
- Warn when approaching limits
- Generate quota reports
- Support custom quota configurations

### Task 7: Implement recency tracking
**Success Criteria**:
- Add 'recent' boolean field to schema
- Track percentage of recent phrases
- Create commands to mark phrases as recent
- Generate recency reports
- Auto-calculate if 10% target is met

### Task 8: Create CLI interface
**Success Criteria**:
- Command to add phrases (single or batch)
- Command to import from CSV/JSON
- Command to view statistics
- Command to export to game format
- Interactive mode for phrase review

### Task 9: Build JSON export system
**Success Criteria**:
- Export all phrases by category
- Match existing game format exactly
- Support filtering (recent only, etc.)
- Validate export against schema
- Create backup before export

### Task 10: Add testing and documentation
**Success Criteria**:
- Unit tests for all validation rules
- Integration tests for CLI commands
- README with usage examples
- Database backup/restore procedures
- CI/CD integration

## Project Status Board

### TODO:
- [ ] Task 3: Build phrase normalization pipeline (REDO - previous implementation removed)
- [ ] Task 4: Implement duplicate detection system (REDO - previous implementation removed)
- [ ] Task 5: Create phrase recognition validation (REDO with correct approach)
- [ ] Task 6: Build quota tracking system
- [ ] Task 7: Implement recency tracking
- [ ] Task 8: Create CLI interface (partially done - add command needs implementation)
- [ ] Task 9: Build JSON export system
- [ ] Task 10: Add testing and documentation

### In Progress:

### Completed:
- [x] **Task 1: Create feature branch and project structure** ✅ 
  - Created `feature/phrase-database-builder` branch
  - Set up `tools/phrase-database/` directory structure
  - Initialized npm project with dependencies (sqlite3, commander, chalk, winston, fs-extra)
  - Built working CLI interface with commander.js (add, stats, export, init commands)
  - Added comprehensive README with usage examples and project documentation
  - Configured package.json with proper scripts and bin configuration
  - Added .gitignore for clean repository management
  - Verified CLI functionality - all commands working properly
  - **Files**: 4 changed, 313 insertions (package.json, README.md, cli.js, .gitignore)
  - **Commit**: 29613cb8 - Ready for Task 2

- [x] **Task 2: Set up SQLite database schema** ✅
  - Created comprehensive database.js with SQLite schema and full operations
  - Implemented phrases table with proper schema (phrase, category, first_word, recent, added)
  - Added categories table for metadata and quota tracking
  - Created schema_info table for version tracking  
  - Added performance indexes for category, first_word, recent, and added fields
  - Implemented complete database operations: add, query, stats, duplicate checking, first-word limits
  - Updated CLI init command to create database with 8 default categories
  - Updated CLI stats command to show real database statistics with category breakdown
  - Added comprehensive test suite - 9 passing tests covering all database functionality
  - Fixed database path configuration for proper test isolation
  - Verified database creation and schema with direct SQLite verification
  - **Files**: 4 changed, 7441 insertions (database.js, updated cli.js, tests, package-lock.json)
  - **Commit**: 37d27788 - Ready for Task 3

## Executor's Feedback or Assistance Requests

### Task 1 Completion Report (2025-01-15)
✅ **TASK 1 SUCCESSFULLY COMPLETED** - Feature branch and project structure fully implemented

**Achievements:**
- Feature branch `feature/phrase-database-builder` created and active
- Complete Node.js project structure established in `tools/phrase-database/`
- All dependencies installed and working (fixed chalk v5 compatibility issue by downgrading to v4.1.2)
- CLI interface fully functional with help system and placeholder commands
- Professional documentation and configuration files in place

**Technical Notes:**
- Encountered chalk v5 ESM import issue - resolved by using chalk v4.1.2 for CommonJS compatibility
- CLI tested and working: `node src/cli.js --help` and all commands execute properly
- Project structure follows best practices with separate src/, lib/, tests/, data/ directories

**Ready for Task 2:** SQLite database schema implementation
Please confirm to proceed with Task 2 or provide any adjustments needed.

### Task 2 Completion Report (2025-01-15)
✅ **TASK 2 SUCCESSFULLY COMPLETED** - SQLite database schema and operations fully implemented

**Major Achievements:**
- **Complete Database Schema**: Created phrases table with all required fields (phrase, category, first_word, recent, added)
- **Supporting Tables**: Added categories table for metadata/quotas and schema_info for version tracking
- **Performance Optimization**: Implemented 4 strategic indexes for fast queries
- **Full CRUD Operations**: Complete database operations including add, query, stats, duplicate detection
- **Business Logic**: Implemented first-word limit enforcement and recency tracking
- **CLI Integration**: Working init and stats commands with real database operations
- **Quality Assurance**: 9 comprehensive tests covering all functionality - 100% pass rate

**Technical Implementation:**
- SQLite database with proper schema design following the original specifications
- Promisified sqlite3 operations for clean async/await code
- Proper error handling and logging throughout
- Test isolation with separate test database paths
- Default categories: Movies & TV, Sports, Music, Food & Drink, Animals, Places, Books & Literature, Science & Technology

**Database Validation:**
- Verified schema creation with direct SQLite commands
- Tested all database operations: initialization, phrase insertion, statistics, category management
- Confirmed proper indexing and performance optimization
- Validated duplicate detection and first-word limit enforcement

**Ready for Task 3:** Phrase normalization pipeline implementation
The database foundation is solid and ready for the normalization layer.

### Planner Analysis (2025-01-15)
**CRITICAL PIVOT REQUIRED** - Tasks 3-5 need complete re-implementation

**Current State Assessment:**
- Git history shows Tasks 3-5 were completed but the implementation files have been deleted
- The original Task 5 "common phrase detection" was built with backwards logic
- We were REJECTING common phrases when we should be ACCEPTING them
- This fundamental misunderstanding means the validation pipeline needs redesign

**Why Previous Code Was Removed:**
- The normalizer, duplicate detector, and common phrase detector were all built around the wrong premise
- Rather than patch incorrect logic, clean slate approach is better
- Core database (Task 2) remains solid and unchanged

**Recommended Approach:**
1. **Task 3 (Normalization)**: Can likely reuse most logic - Title Case, ASCII conversion, etc.
2. **Task 4 (Duplicate Detection)**: Logic is still valid - reimplement as before
3. **Task 5 (Recognition Validation)**: Complete redesign with new approach
4. **Integration**: Build these as integrated database methods rather than separate modules

The database foundation from Task 2 is excellent. We just need to rebuild the validation layer with the correct game design philosophy: **accessible, recognizable phrases that everyone can enjoy**.

## Lessons Learned

- **[2025-01-15] CRITICAL UNDERSTANDING SHIFT**: Initial Task 5 design was backwards - we want to ACCEPT common/recognizable phrases and REJECT obscure ones. For a party game, phrases should be:
  - **GOOD**: Have Wikipedia pages, commonly known, recognizable by most players
  - **BAD**: Ultra-technical jargon, made-up words, hyper-specific references
  - The validation system should ensure accessibility, not filter out well-known terms
  - Wikipedia presence is a positive signal, not negative

## Re-evaluation Based on Corrected Understanding

### What We're Actually Building
A phrase database builder that ensures all phrases are **suitable for a party game** - meaning they should be recognizable, fun, and accessible to general audiences. The tool should:

1. **ACCEPT phrases that are:**
   - Well-known (have Wikipedia pages, appear in common usage)
   - Pop culture references (movies, TV, music, sports)
   - Common foods, places, activities
   - Recognizable brands, products, concepts
   - Fun and engaging for gameplay

2. **REJECT or WARN about phrases that are:**
   - Hyper-technical jargon (e.g., "Endoplasmic reticulum")
   - Ultra-obscure references (e.g., "Treaty of Westphalia Article 23")
   - Made-up or nonsensical phrases
   - Too localized/regional to be widely known
   - Academic terms that only experts would know

### Revised Task 5 Approach
Instead of "common phrase detection" (which implies filtering out common phrases), we need **"phrase accessibility validation"** that ensures phrases meet these criteria:

1. **Wikipedia Validation** (Positive Signal)
   - Check if phrase has Wikipedia page → Good sign it's recognizable
   - Extract page view statistics if available → Higher views = more recognizable
   - Check disambiguation pages → Multiple meanings often = well-known

2. **Technical/Obscurity Detection** (Negative Signals)
   - Word complexity analysis (syllable count, rare letter combinations)
   - Academic/technical term detection (Latin roots, -ology/-itis suffixes)
   - Acronym/abbreviation checking (unless widely known like "FBI")

3. **Recognition Scoring System**
   - Score 0-100 based on multiple factors
   - Wikipedia presence: +40 points
   - Simple words: +20 points
   - Pop culture category: +20 points
   - Technical indicators: -30 points
   - Threshold: Warn below 50, reject below 30

4. **Manual Override System**
   - Allow curator to override with reason
   - Track overrides for pattern analysis
   - Learn from override decisions

### Revised Task 5 Approach - Scalable Recognition System
Instead of "common phrase detection", we need **"phrase accessibility validation"** that can handle thousands of phrases efficiently:

#### Scoring Components (0-100 points)

1. **Local Heuristics** (0-40 points) - Instant, no API
   ```javascript
   // Word simplicity (0-20)
   - Syllable count, word length
   - No technical suffixes (-ology, -itis, -osis)
   - Basic readability score
   
   // Recency indicators (0-20)
   - Contains years 2020-2025: +15 points
   - Platform names (TikTok, Netflix, iPhone): +10 points
   - Sequel patterns (Part 2, Season 3): +10 points
   - Brand + Number patterns: +10 points
   ```

2. **Wikidata SPARQL** (0-30 points) - Free, unlimited
   ```javascript
   // Batch query up to 50 phrases at once
   - Has Wikidata item: +20 points
   - 10+ language versions: +5 points
   - High sitelink count: +5 points
   // Returns rich metadata (film, person, place, etc.)
   ```

3. **Reddit Mentions** (0-15 points) - 60 requests/min
   ```javascript
   // Check cultural relevance
   - Post with 1000+ upvotes: +15 points
   - Post with 100+ upvotes: +10 points
   - Any recent mentions: +5 points
   ```

4. **Category Context** (0-15 points) - Local
   ```javascript
   categoryBoosts = {
     "Movies & TV": +10,     // Pop culture
     "Food & Drink": +10,    // Universal
     "Sports": +8,           // Widely known
     "Music": +8,            // Popular culture
     "Science & Technology": -5  // Often technical
   }
   ```

#### Implementation Strategy

```javascript
class ScalablePhraseScorer {
  async processBatch(phrases) {
    // Step 1: Local scoring for ALL phrases (instant)
    const localScores = phrases.map(p => ({
      phrase: p.phrase,
      category: p.category,
      localScore: this.getLocalScore(p.phrase, p.category),
      needsValidation: null
    }));
    
    // Step 2: Sort into buckets
    const autoAccept = localScores.filter(p => p.localScore >= 70);
    const autoReject = localScores.filter(p => p.localScore <= 20);
    const needsChecking = localScores.filter(p => p.localScore > 20 && p.localScore < 70);
    
    // Step 3: Batch API validation for borderline cases only
    if (needsChecking.length > 0) {
      // Wikidata: Check 50 at a time
      for (let i = 0; i < needsChecking.length; i += 50) {
        const batch = needsChecking.slice(i, i + 50);
        await this.checkWikidataBatch(batch);
      }
      
      // Reddit: Rate limited, check highest priority first
      const prioritized = needsChecking
        .sort((a, b) => b.localScore - a.localScore)
        .slice(0, 60); // One minute worth
      
      for (const phrase of prioritized) {
        phrase.redditScore = await this.checkReddit(phrase.phrase);
        await this.sleep(1000); // Respect rate limit
      }
    }
    
    return {
      autoAccepted: autoAccept.length,
      autoRejected: autoReject.length,
      validated: needsChecking.length,
      results: [...autoAccept, ...autoReject, ...needsChecking]
    };
  }
}
```

#### Scoring Thresholds
- **80-100**: Auto-accept (highly recognizable)
- **60-79**: Accept with confidence
- **40-59**: Manual review recommended
- **20-39**: Likely too obscure (warn)
- **0-19**: Auto-reject (too technical/obscure)

#### Cost Efficiency
- **Phase 1**: Process 10,000 phrases with local scoring only (~1 second)
- **Phase 2**: ~2,000 borderline cases need Wikidata validation (~40 batch queries)
- **Phase 3**: ~500 highest priority get Reddit validation (~8 minutes)
- **Total time**: ~10 minutes for 10,000 phrases
- **Total cost**: $0 (all APIs used are free)

#### Scoring Examples

**"Taylor Swift" (Music)**
```
Local Heuristics: 35/40
  - Word simplicity: 20/20 (simple name)
  - Recency: 15/20 (current artist, no year but trending)
Wikidata: 30/30 (exists, 100+ languages, musician)
Reddit: 15/15 (thousands of upvotes)
Category: 8/15 (Music boost)
Total: 88/100 → AUTO-ACCEPT
```

**"Barbenheimer" (Movies & TV)**
```
Local Heuristics: 30/40
  - Word simplicity: 15/20 (blend word, pronounceable)
  - Recency: 15/20 (2023 phenomenon)
Wikidata: 25/30 (exists, cultural event)
Reddit: 15/15 (viral posts)
Category: 10/15 (Movies boost)
Total: 80/100 → AUTO-ACCEPT
```

**"Pizza" (Food & Drink)**
```
Local Heuristics: 35/40
  - Word simplicity: 20/20 (simple, common)
  - Recency: 15/20 (timeless food)
(No API needed - auto-accepted locally)
Total: 85/100 → AUTO-ACCEPT
```

**"Quantum Chromodynamics" (Science & Technology)**
```
Local Heuristics: 5/40
  - Word simplicity: 0/20 (complex, technical)
  - Recency: 5/20 (no recent indicators)
Category: -5/15 (Science penalty)
Total: 0/100 → AUTO-REJECT
```

**"Among Us" (borderline case)**
```
Local Heuristics: 25/40
  - Word simplicity: 20/20 (simple words)
  - Recency: 5/20 (no year indicator)
Wikidata: 25/30 (video game, 50+ languages)
Reddit: 15/15 (viral game 2020-2021)
Category: 10/15 (assuming Games category)
Total: 75/100 → ACCEPT
``` 