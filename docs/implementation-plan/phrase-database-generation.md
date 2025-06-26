# Phrase Database Generation - Rebuild to 1000+ High-Quality Phrases

## Background and Motivation

Following the successful completion of the phrase quality upgrade initiative, we now have a comprehensive phrase generation and quality validation system. The recent database cleaning removed 88.4% of phrases (from 1,491 to 173), eliminating inappropriate content and low-quality phrases. 

**Current State:**
- 173 high-quality phrases remaining (40+ points)
- Comprehensive quality scoring system (0-100 points)
- Enhanced prompts with party game context
- Manual review interface for quality control
- Production-ready generation infrastructure

**Goal:** Rebuild the database to 1000+ high-quality phrases across diverse categories, with an eventual target of 10,000+ phrases.

## Key Challenges and Analysis

1. **Scale Requirements**: Need to generate 827+ new phrases to reach 1000 total
2. **Quality Consistency**: Maintain 40+ point quality threshold across all generated content
3. **Category Distribution**: Ensure balanced representation across all game categories
4. **Batch Processing**: Work within Netlify function timeout limits (10 seconds)
5. **Manual Review**: Balance automation with human quality control
6. **Performance**: Maintain generation speed while ensuring quality
7. **Infrastructure Integration**: We have THREE separate systems that need coordination:
   - **Phrase Database Builder Tool** (SQLite-based with full CLI)
   - **Production phraseService** (uses IndexedDB and Netlify functions)
   - **Batch generator script** (currently mocked, needs real implementation)

## Revised Strategy and Approach

### Infrastructure Analysis
After reviewing our systems, we have:
1. **Production-ready phrase database tool** in `tools/phrase-database/` with:
   - SQLite database with proper schema
   - Quality scoring system (matches our 0-100 scale)
   - Duplicate detection
   - Category quota management
   - CLI with 15+ commands
   - Export functionality to game format

2. **Production AI generation** via:
   - Gemini 2.5 Flash (primary) with enhanced reasoning
   - OpenAI (fallback) 
   - Both limited to 15 phrases per request (timeout constraints)

3. **Quality validation** systems:
   - PhraseScorer service (0-100 scoring)
   - Wikipedia/Reddit validation
   - Manual review interface

### Recommended Approach
Instead of building new infrastructure, we should:
1. Use the phrase database tool as our primary generation workspace
2. Generate phrases via the production Netlify functions
3. Import and score in the database tool
4. Export clean JSON for production

This avoids duplicating infrastructure and leverages tested systems.

## High-level Task Breakdown

### Task 1: Create Feature Branch and Setup ✅
- [x] Create feature branch `feature/phrase-database-generation`
- [x] Update implementation plan and scratchpad
- [x] Analyze current database state and category distribution

**Success Criteria:**
- [x] Feature branch created and active
- [x] Current state documented (173 phrases analyzed)
- [x] Implementation plan committed to repository

### Task 2: Design Generation Strategy ⬜
- [ ] Define target phrase counts per category based on game balance
- [ ] Plan batch generation approach (15 phrases/batch due to timeout)
- [ ] Establish quality thresholds and review workflows
- [ ] Create monitoring and progress tracking system
- [ ] Design integration between database tool and production APIs

**Success Criteria:**
- [ ] Category distribution plan documented (balanced across 11 categories)
- [ ] Batch workflow designed: Generate → Score → Filter → Review → Import
- [ ] Integration path clear between tools
- [ ] Quality control process established (auto-accept 60+, review 40-59, reject <40)

### Task 3: Setup Database Tool and Integration ⬜
- [ ] Initialize phrase database in tools/phrase-database
- [ ] Create integration script to call production Netlify functions
- [ ] Setup scoring pipeline with quality thresholds
- [ ] Configure category quotas for balanced distribution
- [ ] Test end-to-end flow with small batch

**Success Criteria:**
- [ ] Database initialized with proper schema
- [ ] Can generate phrases via production API
- [ ] Scoring and filtering working (40+ threshold)
- [ ] Test batch of 15 phrases successfully processed

### Task 4: Generate Core Categories (Movies, Music, Sports, Food) ⬜
- [ ] Generate 100 phrases for Movies & TV category (7 batches)
- [ ] Generate 100 phrases for Music & Artists category (7 batches)
- [ ] Generate 100 phrases for Sports & Athletes category (7 batches)
- [ ] Generate 100 phrases for Food & Drink category (7 batches)
- [ ] Score all phrases and filter by quality (40+)
- [ ] Manual review for 40-59 score range
- [ ] Import accepted phrases to database

**Success Criteria:**
- [ ] 400+ high-quality phrases across 4 core categories
- [ ] Average score 60+ (good for gameplay)
- [ ] Balanced distribution (≈100 per category)
- [ ] No duplicates or inappropriate content

### Task 5: Generate Secondary Categories (Places, People, Pop Culture) ⬜
- [ ] Generate 80 phrases for Places & Travel category (6 batches)
- [ ] Generate 80 phrases for Famous People category (6 batches)  
- [ ] Generate additional phrases for Entertainment & Pop Culture (to reach 100)
- [ ] Apply same scoring and review process
- [ ] Ensure no overlap with existing 173 phrases

**Success Criteria:**
- [ ] 240+ additional high-quality phrases
- [ ] Secondary categories well-represented
- [ ] No conflicts with existing Entertainment phrases
- [ ] Total database size: 800+ phrases

### Task 6: Generate Specialized Categories (Tech, History, Nature) ⬜
- [ ] Generate 60 phrases for Technology & Science (4 batches)
- [ ] Generate 60 phrases for History & Events (4 batches)
- [ ] Generate 60 phrases for Nature & Animals (4 batches)
- [ ] Extra focus on accessibility - avoid academic jargon
- [ ] Review with party game context in mind

**Success Criteria:**
- [ ] 180+ phrases in specialized categories
- [ ] All phrases are fun and recognizable
- [ ] Avoid overly technical/academic content
- [ ] Total database size: 980+ phrases

### Task 7: Generate Variety Categories and Polish ⬜
- [ ] Generate mixed phrases for Everything category (fill to 100)
- [ ] Generate challenging phrases for Everything+ (fill to 80)
- [ ] Run comprehensive duplicate detection
- [ ] Balance check across all categories
- [ ] Final quality review pass
- [ ] Generate 20-50 buffer phrases for low categories

**Success Criteria:**
- [ ] Total database exceeds 1000 phrases
- [ ] All categories have sufficient phrases (50+ minimum)
- [ ] Everything/Everything+ provide good variety
- [ ] Final quality check complete

### Task 8: Export, Test, and Deploy ⬜
- [ ] Export final database to game format JSON
- [ ] Test in development environment
- [ ] Verify category counts and quality
- [ ] Update production phrases.json
- [ ] Create backup of previous database
- [ ] Document generation statistics
- [ ] Merge feature branch to main

**Success Criteria:**
- [ ] 1000+ phrases in production format
- [ ] All categories properly populated
- [ ] Game tested with new phrases
- [ ] Documentation complete with statistics
- [ ] Feature successfully deployed

## Project Status Board

### 🟢 Ready to Start
- Task 2: Design Generation Strategy
- Task 3: Setup Database Tool and Integration

### 🚧 In Progress
- Task 1: Create Feature Branch and Setup (analyzing current state)

### ✅ Completed
- _(none yet)_

## Current Status / Progress Tracking

**Phase**: Planning and Setup
**Progress**: 1/8 tasks started (12.5%)
**Target**: 1000+ high-quality phrases
**Current Database**: 173 phrases (40+ points)
**Remaining to Generate**: 827+ phrases

**Current Analysis:**
- Database cleaned from 1,491 to 173 phrases (88.4% reduction)
- All remaining phrases score 40+ points (high quality)
- Need to analyze category distribution of remaining phrases
- Generation infrastructure ready and tested

## Quality Standards Reference

### Scoring System (0-100 points)
- **80-100**: Auto-accept (clearly recognizable)
- **60-79**: Accept (good for gameplay) 
- **40-59**: Manual review suggested
- **20-39**: Warning (likely too obscure)
- **0-19**: Auto-reject (too technical)

### Enhanced Prompting Strategy
Based on our production prompts, emphasize:
1. **Simple, recognizable phrases** (2-4 words)
2. **Pop culture relevance** 
3. **Acting/guessing friendly**
4. **Avoid**: Technical jargon, offensive content, niche references

### Category Balance Targets
Aiming for relatively even distribution with slight emphasis on popular categories:
- **Core Categories** (100 each): Movies, Music, Sports, Food
- **Secondary** (80-100 each): Places, People, Entertainment  
- **Specialized** (60-80 each): Tech, History, Nature
- **Variety** (80-100 each): Everything, Everything+

This ensures no category dominates while popular categories have sufficient content.

### Quality Control Workflow
1. **Generate**: 15 phrases per API call
2. **Score**: Use phraseScorer (0-100)
3. **Auto-Filter**: 
   - Accept: 60+ scores
   - Review: 40-59 scores
   - Reject: <40 scores
4. **Manual Review**: Check 40-59 range for hidden gems
5. **Import**: Add accepted phrases to database
6. **Track**: Monitor category quotas and quality metrics

## Executor's Feedback or Assistance Requests

**Project Initiation - 2025-01-15**

User has requested to rebuild the phrase database from the current 173 high-quality phrases to 1000+ phrases using our existing phrase generation infrastructure. This represents a significant scaling effort that will leverage all the quality systems we built during the phrase quality upgrade project.

**Key Infrastructure Available:**
- Enhanced prompts with party game context
- PhraseScorer with 0-100 point quality system
- Wikipedia and Reddit validation APIs
- Manual review interface in CategoryRequestModal
- Netlify functions for AI generation (Gemini and OpenAI)

**Immediate Next Steps:**
1. Analyze current database category distribution
2. Design generation strategy with target counts per category
3. Create batch generation system for efficient scaling

**Questions for Planning:**
- Should we prioritize certain categories over others?
- What batch sizes work best with our timeout limits?
- How much manual review vs. automated filtering?
- Should we aim for 60+ point average or accept 40+ point threshold?

## Lessons Learned

_(To be updated during implementation)_

## Branch Name

`feature/phrase-database-generation` 