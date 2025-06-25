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
4. **Common Phrase Detection**: Implementing tests for overly common phrases
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

### Task 5: Create common phrase detection
**Success Criteria**:
- Implement Wikipedia title check (via API or local dataset)
- Add Google n-gram frequency check
- Create configurable threshold for "too common"
- Log rejected phrases with reasons

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
- [ ] Task 1: Create feature branch and project structure
- [ ] Task 2: Set up SQLite database schema
- [ ] Task 3: Build phrase normalization pipeline
- [ ] Task 4: Implement duplicate detection system
- [ ] Task 5: Create common phrase detection
- [ ] Task 6: Build quota tracking system
- [ ] Task 7: Implement recency tracking
- [ ] Task 8: Create CLI interface
- [ ] Task 9: Build JSON export system
- [ ] Task 10: Add testing and documentation

### In Progress:

### Completed:

## Executor's Feedback or Assistance Requests

_This section will be updated by the Executor during implementation_

## Lessons Learned

_Lessons learned during implementation will be documented here_ 