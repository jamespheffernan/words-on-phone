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
- Implement Wikipedia title check (phrases WITH Wikipedia pages are GOOD)
- Add validation for extremely obscure/technical terms
- Create "recognition score" system (higher = more recognizable)
- Warn about potentially obscure phrases
- Allow manual override for edge cases
- Log validation results with reasoning

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

### Next Steps for Task 5
Since the previous implementation was backwards, we need to:
1. Remove the old "common phrase detector" logic
2. Build new "phrase accessibility validator"
3. Update CLI to use validation correctly
4. Add appropriate warnings and scoring display 