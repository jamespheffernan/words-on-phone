# Phrase Generation Quality Upgrade

**Branch Name:** `feature/phrase-quality-upgrade`

---

## Background and Motivation

The current phrase generation system produces low-quality phrases unsuitable for a party game. Analysis reveals several critical issues:

1. **Weak Prompts**: Vague instructions like "lively, party-friendly phrases" without concrete examples or game context
2. **No Quality Validation**: Generated phrases are stored directly without any scoring or verification
3. **Generic Output**: AI produces uninspired, generic phrases like "Talent Show", "Game Night", "Awards Show"
4. **Poor Game Suitability**: Many phrases are difficult to act out or describe in a charades-style game
5. **No Cultural Relevance Checks**: No verification that phrases are widely recognizable or current

The existing phrase database builder tool demonstrates the right approach with sophisticated scoring (0-100 points) based on simplicity, Wikipedia presence, Reddit relevance, and category appropriateness. We need to apply similar rigor to custom category generation.

## Key Challenges and Analysis

1. **Prompt Engineering**: Current prompts lack specificity about what makes a good game phrase
2. **Quality Metrics**: No scoring system to evaluate phrase suitability
3. **Validation Pipeline**: Need to integrate Wikipedia/cultural relevance checks
4. **Batch Processing**: Must handle validation efficiently within Netlify's 10-second timeout
5. **Backwards Compatibility**: Ensure existing custom categories continue to work
6. **User Experience**: Maintain fast response times while adding validation

## High-level Task Breakdown

### Task 1: Create Enhanced Prompt System
- [ ] Design detailed prompts with game context and actability requirements
- [ ] Include examples of good vs bad phrases with explanations
- [ ] Add specific criteria for party game suitability
- [ ] Create separate prompts for different difficulty levels
- [ ] Test prompts extensively with various categories

**Success Criteria**:
1. Prompts produce 80%+ phrases suitable for gameplay
2. Clear differentiation between good/bad examples
3. Consistent quality across different categories
4. Prompts work with both OpenAI and Gemini

### Task 2: Implement Phrase Scoring System
- [ ] Port scoring logic from phrase database builder tool
- [ ] Create `PhraseScorer` class with local heuristics (0-40 points)
- [ ] Add word simplicity scoring (syllables, common words)
- [ ] Implement cultural relevance patterns (recent years, platforms, viral terms)
- [ ] Add category-specific boosts

**Success Criteria**:
1. Scoring system matches database builder's logic
2. Fast local scoring (<10ms per phrase)
3. Comprehensive test coverage
4. Clear score thresholds for accept/reject

### Task 3: Add Wikipedia Validation (Batch API)
- [ ] Implement Wikidata SPARQL batch queries (50 phrases per request)
- [ ] Score based on entry existence, language versions, sitelinks
- [ ] Cache results to avoid redundant API calls
- [ ] Handle API failures gracefully with fallback scoring

**Success Criteria**:
1. Batch processing of 50 phrases in <2 seconds
2. Proper scoring: +20 for entry, +5 for languages, +5 for sitelinks
3. Cache hit rate >50% for common phrases
4. Zero-cost implementation using free API

### Task 4: Integrate Reddit Relevance Check (Optional)
- [ ] Implement Reddit API integration with rate limiting
- [ ] Score based on post upvotes (1000+ = +15, 100+ = +10)
- [ ] Focus on top borderline cases only (score 40-60)
- [ ] Make this step optional/configurable

**Success Criteria**:
1. Respects 60/min rate limit
2. Only validates borderline phrases
3. Can be disabled without breaking flow
4. Adds <1 second to total processing time

### Task 5: Update Phrase Generation Service
- [ ] Modify `generatePhrasesBatchFromGemini` to use new prompts
- [ ] Add validation pipeline after generation
- [ ] Implement retry logic for low-scoring batches
- [ ] Add quality metrics to response

**Success Criteria**:
1. 90%+ of generated phrases score >60
2. Automatic retry for batches with <50% good phrases
3. Quality metrics included in API response
4. Maintains <10 second total response time

### Task 6: Create Phrase Review Interface
- [ ] Add review mode to category request modal
- [ ] Show phrase scores and breakdown
- [ ] Allow manual override with reason
- [ ] Track quality metrics over time

**Success Criteria**:
1. Clear display of scores and reasons
2. Easy manual override workflow
3. Metrics dashboard for quality tracking
4. Mobile-friendly interface

### Task 7: Update Test Infrastructure
- [ ] Create comprehensive test suite for scoring
- [ ] Mock Wikipedia/Reddit APIs for testing
- [ ] Add quality regression tests
- [ ] Performance benchmarks

**Success Criteria**:
1. 100% coverage of scoring logic
2. Tests run in <5 seconds
3. Quality benchmarks prevent regression
4. Mock APIs simulate real responses

### Task 8: Documentation and Rollout
- [ ] Document new prompt templates
- [ ] Create quality guidelines document
- [ ] Update API documentation
- [ ] Plan phased rollout strategy

**Success Criteria**:
1. Complete prompt template library
2. Clear quality standards documented
3. API changes documented
4. Rollback plan in place

## Project Status Board

### 🟢 Ready to Start
- Task 1: Create Enhanced Prompt System
- Task 2: Implement Phrase Scoring System

### 🚧 In Progress
_(none)_

### ✅ Completed
_(none)_

## Current Status / Progress Tracking

Phase: **Planning** – Ready for human review before implementation begins.

## Quality Scoring Reference

### Scoring System (0-100 points)
1. **Local Heuristics (0-40)**: 
   - Word simplicity (1-2 syllables): +10
   - Common English words: +10
   - Recent years (2020-2025): +15
   - Platform/brand names: +10
   - Viral/trending prefixes: +5

2. **Wikidata (0-30)**:
   - Has Wikidata entry: +20
   - 10+ Wikipedia languages: +5
   - High sitelink count: +5

3. **Reddit (0-15)**:
   - Post with 1000+ upvotes: +15
   - Post with 100+ upvotes: +10
   - Recent mentions: +5

4. **Category Boost (0-15)**:
   - Movies & TV: +10
   - Food & Drink: +10
   - Sports: +8
   - Music: +8
   - Science & Technology: -5

### Thresholds
- **80-100**: Auto-accept (clearly recognizable)
- **60-79**: Accept (good for gameplay)
- **40-59**: Manual review suggested
- **20-39**: Warning (likely too obscure)
- **0-19**: Auto-reject (too technical)

## Lessons Learned

- Quality validation is essential for party games - Wikipedia presence indicates recognizability
- Local heuristics can filter 80% of phrases before expensive API calls
- Batch processing is crucial for staying within timeout limits
- Clear examples in prompts dramatically improve output quality 