# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

Words on Phone is a mobile-first party game inspired by "catch-phrase" mechanics with React/TypeScript frontend and Node.js phrase generation systems. The codebase consists of two main applications:

1. **words-on-phone-app/**: Main React PWA game application
2. **phrasemachine-v2/**: Node.js phrase generation and scoring system

## Common Development Commands

### Main App (words-on-phone-app/)
```bash
npm run dev           # Start development server with Vite
npm run build         # Build for production (TypeScript + Vite)
npm run test          # Run Vitest unit tests
npm run test:coverage # Run tests with coverage reporting
npm run test:ui       # Interactive test UI with Vitest
npm run lint          # ESLint code quality checks
npm run preview       # Preview production build locally
```

### PhraseMachine v2 (phrasemachine-v2/)
```bash
npm run dev           # Start all services (API + admin dashboard)
npm run build         # Build API and admin dashboard
npm test              # Run Jest test suite
npm run test:coverage # Jest with coverage
npm run lint          # ESLint checks
npm run db:migrate    # Run database migrations
npm run build-all-datasets  # Build complete phrase datasets
```

### Testing Commands
```bash
# Main app tests
cd words-on-phone-app && npm run test
cd words-on-phone-app && npm run test:coverage
cd words-on-phone-app && npx cypress run    # E2E tests (if available)

# PhraseMachine tests  
cd phrasemachine-v2 && npm test
cd phrasemachine-v2 && npm run test:integration
cd phrasemachine-v2 && npm run test:performance
```

## High-Level Architecture

### Main Game App (words-on-phone-app/)

**Core Technologies:**
- React 19 with TypeScript (strict mode)
- Zustand for state management with persistence
- Vite for development and building
- PWA with offline capabilities via service worker
- Capacitor for mobile app functionality

**Key Architecture Patterns:**
- **State Management**: Zustand store in `src/store.ts` handles game state, settings, and analytics preferences
- **Component Architecture**: Functional components with hooks in `src/components/`
- **Service Layer**: Analytics, audio, phrase scoring in `src/services/`
- **Hook-Based Logic**: Custom hooks for audio, haptics, timers in `src/hooks/`
- **Web Workers**: Phrase processing offloaded to `src/workers/phraseWorker.js`

**Data Flow:**
1. Phrases loaded from `src/data/phrases.ts` (6,000+ curated phrases)
2. Categories managed via `useCategoryPopularity` hook
3. Game state managed via Zustand with IndexedDB persistence
4. Analytics events sent to PostHog (optional, user-controlled)

**Key Files:**
- `src/App.tsx`: Main app component with screen routing
- `src/store.ts`: Zustand state management
- `src/data/phrases.ts`: All game phrases with categories
- `src/services/analytics.ts`: PostHog integration with privacy controls

### PhraseMachine v2 (phrasemachine-v2/)

**Core Architecture:**
- **Microservices Pattern**: Independent services for generation, scoring, validation
- **Data Pipeline**: Transforms raw datasets (Wikidata, Google N-grams) into optimized phrase datasets
- **Generator System**: Creates phrases from curated entities and patterns
- **Quality Scoring**: Multi-faceted scoring (distinctiveness, describability, cultural validation)

**Service Structure:**
```
services/
├── api/                # Main API server and service discovery
├── generation/         # LLM-based phrase generation
├── scoring/           # Multi-factor phrase quality scoring
├── shared/            # Common utilities and dataset loaders
└── distinctiveness/   # Wikidata/Wikipedia entity matching
```

**Data Pipeline:**
1. **Raw Data**: Wikidata entities, Google N-grams, concreteness norms
2. **Processing**: Scripts in `scripts/` build optimized datasets
3. **Generation**: `generate-phrases.js` combines entity and pattern generators
4. **Validation**: `validators/quality-check.js` ensures output quality
5. **Output**: `output/phrases.json` ready for game integration

**Key Integration Points:**
- `tools/convert-for-game.js`: Converts PhraseMachine output to game format
- Phrase data flows: PhraseMachine → `words-on-phone-app/src/data/phrases.ts`

## Development Workflow Requirements

### Test-Driven Development
- **All changes must start with a failing test** (Vitest for main app, Jest for PhraseMachine)
- Tests required for: components, hooks, services, phrase generation logic
- E2E tests via Cypress for critical user journeys

### Code Quality Standards
- **TypeScript Strict Mode**: No `any` types except in test mocks
- **ESLint**: Airbnb/React rules, zero warnings in CI
- **Testing Coverage**: >80% statement coverage required
- **Privacy-First**: All analytics optional, no PII collection

### Git Workflow
- **Small PRs**: <200 lines excluding tests/docs
- **Conventional Commits**: `feat:`, `fix:`, `chore:` prefixes
- **Branch Naming**: Follow `docs/implementation-plan/*.md` specifications
- **CI Requirements**: All tests + linting must pass

### Gameplay Rule Compliance
- **Before implementing gameplay changes**, consult `docs/ruleset.md`
- Core mechanics: 7-point scoring, hot-potato passing, timer-based rounds, clue-giving restrictions
- Changes affecting game mechanics require user confirmation

## Key Configuration Files

### Main App Configuration
- `vite.config.ts`: Vite build configuration with PWA plugin
- `tsconfig.json`: TypeScript strict mode configuration
- `eslint.config.js`: ESLint rules and React/accessibility plugins
- `capacitor.config.ts`: Mobile app configuration

### PhraseMachine Configuration  
- `package.json`: Extensive npm scripts for services and data processing
- `jest.config.js`: Test configuration for microservices
- `docker-compose.yml`: Local development with Redis/PostgreSQL
- Database schemas in `database/schema/`

## Privacy and Analytics

### User Control Philosophy
- **Opt-in by Default**: Analytics enabled but completely user-controllable
- **Anonymous Only**: No personal data collection, anonymous IDs only
- **One-Click Disable**: Toggle in Privacy Settings disables all tracking
- **Transparent**: Full disclosure of data collected and purpose

### Analytics Implementation
- **PostHog Integration**: Event tracking with privacy controls
- **Local Storage**: User preferences stored locally, never uploaded
- **GDPR Compliant**: Right to opt-out and data deletion
- Analytics configuration in `src/firebase/analytics.ts` and `src/services/analytics.ts`

## Performance Requirements

### Main App Performance
- **PWA Scores**: Lighthouse PWA and Performance ≥90
- **Bundle Size**: Optimized with Vite tree-shaking and code splitting
- **Offline Capability**: Service worker for offline phrase access
- **Mobile Optimization**: Touch targets ≥44px, responsive design

### PhraseMachine Performance
- **API Response Time**: <300ms for phrase scoring endpoints  
- **Concurrency**: Support 100+ concurrent requests
- **Data Pipeline**: Redis O(1) lookups for 50M+ entities
- **Database**: PostgreSQL optimized for phrase history and scoring

## Common Debugging Commands

### Main App Debugging
```bash
# Check build issues
npm run build 2>&1 | grep -i error

# Test specific components
npm test -- --grep "ComponentName"

# Lighthouse performance check
npm run build && npm run preview
# Then run Lighthouse on preview URL
```

### PhraseMachine Debugging
```bash
# Check service health
npm run test:main-api
npm run test:distinctiveness-scorer

# Database connectivity
npm run db:test

# Data pipeline validation
node validators/quality-check.js --input output/phrases.json
```

## AI Integration Notes

### LLM Services
- **OpenAI Integration**: Netlify functions in `netlify/functions/openai.ts`
- **Gemini Integration**: Netlify functions in `netlify/functions/gemini.ts`  
- **Custom Categories**: AI-generated phrases for user-requested categories
- **Rate Limiting**: Implemented via quota tracking in phrase database tools

### Phrase Quality Pipeline
- PhraseMachine v2 uses multi-factor scoring combining distinctiveness, describability, and cultural validation
- Wikidata entity matching for phrase uniqueness
- Concreteness scoring for describability in verbal games
- Pattern-based generation from curated entity datasets

## Security Considerations

### API Key Management
- Environment variables for all API keys (never committed)
- Netlify functions for secure API access from frontend
- No API keys exposed to client-side code

### Data Privacy
- No server-side data storage of user sessions
- All game data stored locally (IndexedDB/localStorage)
- Analytics data anonymized and user-controllable

This architecture supports a privacy-focused party game with AI-enhanced phrase generation and comprehensive quality scoring while maintaining excellent performance and user experience standards.