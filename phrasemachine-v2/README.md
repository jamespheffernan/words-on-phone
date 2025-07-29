# PhraseMachine v2 - "Description-Only Edition"

> Automated service that generates & vets 2-4-word phrases optimized for verbal description in 60-second party-game rounds.

## 🎯 Project Overview

PhraseMachine v2 represents a major evolution from simple phrase generation to comprehensive, data-driven quality assessment. The system evaluates phrases for distinctiveness (via Wikidata/Wikipedia matching), describability (concreteness ratings, proper noun detection), and cultural validation to ensure every phrase is perfect for verbal party games.

## 🏗️ Architecture

### Microservices Structure
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

### Scoring Algorithm
- **Distinctiveness** (0-25): Wikidata exact match → Wikipedia redirect → PMI ≥4 → WordNet MWE
- **Describability** (0-25): Concreteness bands + proper noun bonus - weak-head penalty  
- **Legacy Heuristics** (0-30): Existing word simplicity + length bonus
- **Category Boost** (0-10): Pop-culture/food/sports categories
- **Cultural Validation** (0-10): Reddit upvotes + language-count bonus

### Decision Thresholds
- **≥75**: Auto-accept
- **55-74**: Manual review
- **<55**: Reject

## 🚀 Quick Start

### Prerequisites
- Node.js ≥18.0.0
- Docker & Docker Compose
- Redis
- PostgreSQL

### Development Setup
1. **Clone and navigate to project:**
   ```bash
   git checkout feature/phrasemachine-v2-description-only
   cd phrasemachine-v2
   ```

2. **Configure environment:**
   ```bash
   cp .env.template .env
   # Edit .env with your API keys and database credentials
   ```

3. **Start development environment:**
   ```bash
   docker-compose up -d
   npm install
   npm run dev
   ```

4. **Access services:**
   - API: http://localhost:3000
   - Admin Dashboard: http://localhost:3001
   - Redis: localhost:6379
   - PostgreSQL: localhost:5432

## 📊 Success Metrics

- **<300ms** average scoring latency per phrase
- **>80%** of auto-accepted phrases rated "easy to describe" by test panel
- **<5%** false-positive rate for "non-thing" phrases in 1k-phrase sample
- **<20%** manual-review queue percentage

## 🔧 API Endpoints

### Core Services
- `POST /generate` - Generate phrase candidates
- `POST /score` - Score individual phrase
- `POST /batch-score` - Score phrase batch
- `GET /review` - Get phrases for manual review
- `PATCH /review` - Update review decisions

### Data Services
- `GET /distinctiveness/{phrase}` - Check Wikidata/Wikipedia presence
- `GET /describability/{phrase}` - Get concreteness & NER scores
- `GET /pmi/{phrase}` - Calculate PMI from Google Books N-grams

## 📈 Performance Requirements

- **Response Time**: All endpoints <300ms
- **Concurrency**: 100+ concurrent requests
- **Caching**: Redis O(1) lookups for 50M+ entities
- **Database**: PostgreSQL optimized for phrase history

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific service tests
npm run test:scorer
npm run test:distinctiveness
```

## 📝 Implementation Status

**Phase 1: Foundation & Data Infrastructure** (Week 1)
- [x] **Task 1**: Create Feature Branch and Project Structure ✅
- [x] **Task 2**: Wikidata Data Ingestion Pipeline ✅
- [x] **Task 3**: Google Books N-gram Data Pipeline ✅
- [x] **Task 4**: Concreteness Norms Integration ✅

*See [Implementation Plan](../docs/implementation-plan/phrasemachine-v2-description-only-edition.md) for complete roadmap.*

## 🤝 Contributing

This project follows the Words on Phone development workflow:
1. Create feature branch from main
2. Implement in small vertical slices
3. Test thoroughly (TDD approach)
4. Update documentation
5. Submit PR with comprehensive testing

## 📄 License

MIT - See [LICENSE](../LICENSE) for details.

---

**Status**: 🚧 In Development | **Current Phase**: Foundation & Data Infrastructure | **Next**: Wikidata Data Ingestion Pipeline 