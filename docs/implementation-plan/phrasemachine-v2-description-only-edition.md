# PhraseMachine v2 - "Description-Only Edition"

**Branch Name**: `feature/phrasemachine-v2-description-only`

## Background and Motivation

**Goal**: Build PhraseMachine v2 – an automated service that generates & vets 2-4-word phrases optimized for verbal description in 60-second party-game rounds. This represents a major evolution from the current generation system, focusing on phrases that are distinct things or idioms, instantly recognizable, family-friendly, and specifically optimized for verbal gameplay.

**Key Innovation**: Move beyond simple phrase generation to a comprehensive scoring system that evaluates distinctiveness (via Wikidata/Wikipedia matching), describability (concreteness ratings, proper noun detection), and cultural validation. The system will replace guesswork with data-driven quality assessment.

**Success Metrics**:
- <300ms average scoring latency per phrase
- >80% of auto-accepted phrases rated "easy to describe" by test panel  
- <5% false-positive rate for "non-thing" phrases in 1k-phrase sample
- Manual-review queue <20% of total generated phrases

## Key Challenges and Analysis

**Technical Complexity**: Integration of multiple data sources (Wikidata, Google Books N-gram, Brysbaert concreteness norms) with real-time scoring pipeline requires careful architecture design and performance optimization.

**Data Engineering**: Processing Wikidata dumps, Google Books 2-4-gram datasets, and academic linguistic resources into queryable formats while maintaining <300ms response times.

**Scoring Algorithm**: Balancing 6 different scoring components (distinctiveness, describability, legacy heuristics, category boost, cultural validation) with appropriate weights and thresholds.

**Quality Assurance**: Building admin dashboard for manual review of borderline cases while maintaining high throughput for auto-accepted content.

## High-level Task Breakdown

### Phase 1: Foundation & Data Infrastructure (Week 1)
**🎯 Task 1: Create Feature Branch and Project Structure**
- Create `feature/phrasemachine-v2-description-only` branch
- Set up microservices directory structure (`phrasemachine-v2/`)
- Initialize package.json with dependencies (FastAPI, Redis, PostgreSQL drivers)
- Create basic Docker setup for development environment
- **Success Criteria**: Branch created, basic project structure established, `npm install` runs without errors

**🎯 Task 2: Wikidata Data Ingestion Pipeline**
- Download and process Wikidata JSON dump (labels & redirects)
- Build Redis loading script for O(1) phrase lookup
- Create distinctiveness checker API endpoint (`/check-distinctiveness`)
- **Success Criteria**: Redis contains 50M+ Wikidata entries, API returns results in <50ms

**🎯 Task 3: Google Books N-gram Data Pipeline**  
- Download Google Books English 2019 2-4-gram datasets
- Build PMI calculation service with phrase frequency lookup
- Create PMI scoring API endpoint (`/calculate-pmi`)
- **Success Criteria**: PMI calculations working for test phrases with proper frequency weighting

**🎯 Task 4: Concreteness Norms Integration**
- Import Brysbaert concreteness dataset (40k English lemmas)
- Build lemmatization and lookup service
- Create concreteness scoring API endpoint (`/score-concreteness`)
- **Success Criteria**: Concreteness scores returned for 90%+ of common English words

### Phase 2: Core Scoring Components (Week 2)
**🎯 Task 5: Distinctiveness Detector Implementation**
- Implement exact Wikidata/Wikipedia title matching (25 pts)
- Add Wikipedia redirect/alias detection (20 pts)  
- Integrate PMI ≥ 4 scoring from Google Books (15 pts)
- Add WordNet/Merriam-Webster multi-word entry detection (10 pts)
- **Success Criteria**: All distinctiveness scoring bands working, test phrases score correctly

**🎯 Task 6: Describability Scorer Implementation**
- Implement concreteness scoring bands (15/8/0 pts for ≥4.0/3.0-3.9/<3.0)
- Add SpaCy NER for proper noun detection (+5 pts)
- Create weak-head noun pattern detection (-10 pts for strategy/fail/vibe/etc.)
- **Success Criteria**: Describability scores differentiate concrete vs abstract phrases accurately

**🎯 Task 7: Unit Testing Suite**
- Create comprehensive test cases for all scoring components
- Add performance benchmarks for <300ms latency requirement
- Build test phrase dataset with expected scores
- **Success Criteria**: 95%+ test coverage, all performance benchmarks pass

### Phase 3: Legacy Integration & Decision Engine (Week 3)
**🎯 Task 8: Legacy Heuristics Integration**
- Port existing word simplicity scoring (0-30 pts)
- Integrate length bonus calculations
- Maintain backward compatibility with current system
- **Success Criteria**: Legacy scores match current system output exactly

**🎯 Task 9: Category Boost & Cultural Validation**
- Implement category-specific scoring (+10 pts for pop-culture/food/sports)
- Add Reddit upvote validation system (+10 pts)
- Create language-count bonus from Wikidata
- **Success Criteria**: Cultural signals properly weighted in final scores

**🎯 Task 10: Decision Engine Implementation**
- Build score aggregation pipeline (total from all components)
- Implement threshold logic (≥75 auto-accept, 55-74 manual review, <55 reject)
- Create borderline case flagging system
- **Success Criteria**: Phrases correctly routed to accept/review/reject queues

### Phase 4: LLM Generator & Microservices (Week 4)
**🎯 Task 11: Enhanced LLM Prompt System**
- Implement refined GPT-4 prompt template from specification
- Add fallback model support (GPT-3.5, Gemini)
- Create prompt optimization for distinctiveness requirements
- **Success Criteria**: Generated phrases have >70% distinctiveness rate

**🎯 Task 12: Core Microservices API**
- Build `/generate` endpoint (POST {category?} → list of raw phrases)
- Implement `/score` endpoint (POST {phrase} → {breakdown, total})
- Create `/batch-score` endpoint (POST [list] → results)
- **Success Criteria**: All endpoints respond <300ms, handle concurrent requests

**🎯 Task 13: PostgreSQL Integration**
- Design phrase storage schema with score breakdowns
- Implement batch scoring results persistence
- Create phrase deduplication and history tracking
- **Success Criteria**: Database handles 10k+ phrases with full scoring history

### Phase 5: Admin Dashboard & Review Workflow (Week 5)
**🎯 Task 14: Admin Dashboard Frontend**
- Build React-based admin interface for phrase review
- Create borderline phrase queue management
- Add scoring breakdown visualization
- **Success Criteria**: Manual review workflow operational, reviewers can process 50+ phrases/hour

**🎯 Task 15: Review API & Workflow**
- Implement `/review` GET/PATCH endpoints
- Create reviewer authentication and authorization
- Add batch review operations and analytics
- **Success Criteria**: Complete review workflow from generation to approval

**🎯 Task 16: Threshold Tuning Interface**
- Build dynamic threshold adjustment controls
- Create A/B testing framework for threshold optimization
- Add real-time metrics dashboard
- **Success Criteria**: Admins can adjust thresholds and see immediate impact on acceptance rates

### Phase 6: Integration & Performance Optimization (Week 6)
**🎯 Task 17: Production Pipeline Integration**
- Connect v2 system to existing Words on Phone phrase ingestion
- Create migration path from current phrase generation
- Build backward compatibility layer
- **Success Criteria**: v2 system generates phrases compatible with existing game format

**🎯 Task 18: Performance Optimization**
- Implement Redis caching for frequent lookups
- Add database query optimization
- Create background job processing for batch operations
- **Success Criteria**: All endpoints consistently <300ms, system handles 100+ concurrent requests

**🎯 Task 19: Staging Deployment**
- Deploy complete system to staging environment
- Run end-to-end performance testing
- Validate all acceptance KPIs
- **Success Criteria**: Staging environment meets all performance requirements

### Phase 7: Quality Assurance & Testing (Week 7)
**🎯 Task 20: Comprehensive Testing**
- Generate 1000-phrase test sample
- Run human evaluation panel for "easy to describe" rating
- Measure false-positive rate for "non-thing" phrases
- **Success Criteria**: >80% describability rating, <5% false-positive rate

**🎯 Task 21: Load Testing & Optimization**
- Run sustained load tests (1000+ phrases/hour)
- Profile and optimize bottlenecks
- Validate manual-review queue stays <20%
- **Success Criteria**: System handles production load without degradation

**🎯 Task 22: Documentation & Training**
- Create operator documentation for admin dashboard
- Build troubleshooting guides and monitoring alerts
- Train content review team on new workflow
- **Success Criteria**: Team can operate system independently

### Phase 8: Production Rollout (Week 8)
**🎯 Task 23: Production Deployment**
- Deploy v2 system to production environment
- Run parallel generation with legacy system
- Monitor performance and quality metrics
- **Success Criteria**: v2 system generating phrases in production

**🎯 Task 24: Legacy Database Migration**
- Backfill existing phrase database with v2 scores
- Identify and purge low-scoring legacy phrases (<55 points)
- Validate phrase pool quality improvement
- **Success Criteria**: Phrase database upgraded with consistent v2 scoring

**🎯 Task 25: Full System Cutover**
- Switch primary phrase generation to v2 system
- Decommission legacy generation pipeline
- Monitor production metrics and user feedback
- **Success Criteria**: v2 system is primary phrase source, all KPIs met

## Project Status Board

### Phase 1: Foundation & Data Infrastructure
- [x] **Task 1**: Create Feature Branch and Project Structure ✅ **COMPLETE**
- [ ] **Task 2**: Wikidata Data Ingestion Pipeline  
- [ ] **Task 3**: Google Books N-gram Data Pipeline
- [ ] **Task 4**: Concreteness Norms Integration

### Phase 2: Core Scoring Components  
- [ ] **Task 5**: Distinctiveness Detector Implementation
- [ ] **Task 6**: Describability Scorer Implementation
- [ ] **Task 7**: Unit Testing Suite

### Phase 3: Legacy Integration & Decision Engine
- [ ] **Task 8**: Legacy Heuristics Integration
- [ ] **Task 9**: Category Boost & Cultural Validation
- [ ] **Task 10**: Decision Engine Implementation

### Phase 4: LLM Generator & Microservices
- [ ] **Task 11**: Enhanced LLM Prompt System
- [ ] **Task 12**: Core Microservices API
- [ ] **Task 13**: PostgreSQL Integration

### Phase 5: Admin Dashboard & Review Workflow
- [ ] **Task 14**: Admin Dashboard Frontend
- [ ] **Task 15**: Review API & Workflow
- [ ] **Task 16**: Threshold Tuning Interface

### Phase 6: Integration & Performance Optimization
- [ ] **Task 17**: Production Pipeline Integration
- [ ] **Task 18**: Performance Optimization
- [ ] **Task 19**: Staging Deployment

### Phase 7: Quality Assurance & Testing
- [ ] **Task 20**: Comprehensive Testing
- [ ] **Task 21**: Load Testing & Optimization
- [ ] **Task 22**: Documentation & Training

### Phase 8: Production Rollout
- [ ] **Task 23**: Production Deployment
- [ ] **Task 24**: Legacy Database Migration
- [ ] **Task 25**: Full System Cutover

## Current Status / Progress Tracking

**📋 STATUS**: Task 1 Complete - Foundation established, ready for data pipeline development

**🎯 CURRENT FOCUS**: Task 2 - Wikidata Data Ingestion Pipeline

**⏱️ TIMELINE**: 8-week implementation plan with weekly milestones (Week 1: 25% complete)

**🔧 DEPENDENCIES**: None - ready to start Task 2 immediately

**✅ TASK 1 COMPLETED SUCCESSFULLY**:
- Feature branch created and project structure established
- Microservices architecture implemented (5 services + admin)
- Docker development environment configured
- package.json with all required dependencies
- npm install verified working (696 packages installed)
- Documentation and development infrastructure complete

## Executor's Feedback or Assistance Requests

**[2025-01-29] Task 1 Completion Report:**
✅ **TASK 1 SUCCESSFULLY COMPLETED** - Create Feature Branch and Project Structure

**What was accomplished:**
- Created feature branch `feature/phrasemachine-v2-description-only` 
- Established complete microservices directory structure (generator, distinctiveness, describability, scorer, reviewer)
- Set up data directories for Wikidata, N-grams, and concreteness norms
- Created comprehensive package.json with all required dependencies (Redis, PostgreSQL, OpenAI, NLP libraries)
- Built Docker Compose development environment with 4 services
- Implemented Dockerfile.api for containerized development
- Added .gitignore, README.md with full documentation
- Verified npm install works successfully (696 packages installed)

**Success Criteria Verification:**
- ✅ Branch created: `feature/phrasemachine-v2-description-only`
- ✅ Basic project structure established with microservices architecture  
- ✅ npm install runs without errors

**Ready for Task 2:** Wikidata Data Ingestion Pipeline - no blockers or assistance needed.

*This section will be updated as implementation progresses.*

## Lessons Learned

*This section will be populated during implementation to capture insights and solutions for future reference.*

## Technical Architecture Overview

**Microservices Structure**:
```
phrasemachine-v2/
├── services/
│   ├── generator/          # LLM phrase generation
│   ├── distinctiveness/    # Wikidata/Wikipedia lookup
│   ├── describability/     # Concreteness & NER scoring  
│   ├── scorer/            # Score aggregation
│   └── reviewer/          # Admin dashboard API
├── data/
│   ├── wikidata/          # Redis-cached entities
│   ├── ngrams/            # Google Books PMI data
│   └── concreteness/      # Brysbaert norms
└── admin/                 # React dashboard
```

**Scoring Algorithm Implementation**:
- **Distinctiveness** (0-25): Wikidata exact match → Wikipedia redirect → PMI ≥4 → WordNet MWE
- **Describability** (0-25): Concreteness bands + proper noun bonus - weak-head penalty  
- **Legacy Heuristics** (0-30): Existing word simplicity + length bonus
- **Category Boost** (0-10): Pop-culture/food/sports categories
- **Cultural Validation** (0-10): Reddit upvotes + language-count bonus
- **Decision Thresholds**: ≥75 auto-accept, 55-74 manual review, <55 reject

**Performance Requirements**:
- <300ms average scoring latency
- 100+ concurrent request handling
- Redis O(1) lookups for 50M+ entities
- PostgreSQL optimization for phrase history

This implementation plan provides a comprehensive roadmap for building PhraseMachine v2 with clear milestones, success criteria, and technical specifications. 