# Words on Phone - Project File Index

## Overview
This is a comprehensive index of all files in the "Words on Phone" project - a party game similar to "Catch Phrase" where players guess phrases while passing a phone around. The project consists of a React/TypeScript web app, phrase generation tools, and extensive documentation.

## Project Structure

### Root Directory Files

#### Configuration & Documentation
- **`README.md`** - ⚠️ **CANDIDATE FOR DELETION** - Contains only "Environment variable fix deployed". Should be replaced with proper project documentation.
- **`GUIDELINES.md`** - Engineering and collaboration guidelines, coding standards, testing requirements, and workflow rules
- **`netlify.toml`** - Netlify deployment configuration, defines build settings and serverless functions directory

#### Phrase Data Files
- **`phrases.json`** - ⚠️ **OUTDATED** - Contains exactly 173 phrases from one category; NOT used by the live app
- **`phrases_backup.json`** - Backup phrase database with 1,491 phrases across multiple categories
- **`Phrase Review June 25 2025 (1).json`** - ⚠️ **CANDIDATE FOR DELETION** - Appears to be a one-time export for review, dated file

**NOTE**: The live app actually uses hardcoded phrases in `words-on-phone-app/src/data/phrases.ts` with **560 phrases** across 10 categories, not the root JSON files.

#### Comprehensive Test & Generation Scripts (Root Level)
- **`batch-phrase-generator.js`** - ⭐ **SOPHISTICATED** - Complete phrase generation system with quality scoring, progress tracking, category management, and automatic filtering (373 lines)
- **`test-openai.js`** - **COMPREHENSIVE** - Full OpenAI serverless function testing including CORS, error handling, batch requests, and validation (197 lines)
- **`test-phrase-quality-demo.js`** - Advanced phrase quality scoring demonstration
- **`test-production.js`** - **END-TO-END** - Complete production workflow testing for custom category generation with sample words and full category creation (180 lines)
- **`test-quality-generation.js`** - Quality generation validation testing

#### Git Configuration
- **`.gitignore`** - Git ignore rules
- **`.gitattributes`** - Git attributes for line ending handling

#### System Files
- **`.DS_Store`** - ⚠️ **CANDIDATE FOR DELETION** - macOS system file that should be gitignored
- **`.cursor/`** - Cursor editor configuration directory

### GitHub Actions (`.github/workflows/`)
- **`nightly-phrase-generation.yml`** - ⭐ **ENTERPRISE-GRADE** - Sophisticated automated phrase generation pipeline with:
  - Scheduled nightly runs at 2:00 AM UTC
  - Manual dispatch with custom parameters (batch size, quality threshold, dry-run mode)
  - Complete environment setup with Node.js 18 and dependency caching
  - Automatic PR creation with detailed metrics and progress tracking
  - Failure alerting via GitHub issues with investigation steps
  - Artifact uploads for metrics and failure analysis
  - Weekly summary capabilities
  - Quality validation and database integrity checking (253 lines)

### Main Application (`words-on-phone-app/`)

#### Configuration Files - Production-Ready Setup
- **`package.json`** - ⭐ **COMPREHENSIVE** - Modern React 19 app with advanced dependencies:
  - **Core**: React 19, TypeScript 5.7, Vite 6.0, Zustand state management
  - **Mobile**: Capacitor 7.2 with iOS support and haptics
  - **Analytics**: Firebase 11.8
  - **Testing**: Vitest, Cypress 14.4, Testing Library, MSW, axe-core accessibility
  - **Quality**: ESLint 9.x, Prettier, Husky, lint-staged
  - **PWA**: Vite PWA plugin, Workbox, PWA assets generator
  - **Performance**: Sharp overrides for optimal image processing
- **`package-lock.json`** - Locked dependency versions
- **`tsconfig.json`** - TypeScript configuration
- **`tsconfig.app.json`** - App-specific TypeScript config
- **`tsconfig.node.json`** - Node-specific TypeScript config
- **`tsconfig.cypress.json`** - Cypress test TypeScript config
- **`tsconfig.cypress.tsbuildinfo`** - TypeScript build info for Cypress
- **`vite.config.ts`** - Vite bundler configuration
- **`eslint.config.js`** - ESLint linting configuration
- **`cypress.config.cjs`** - Cypress E2E testing configuration
- **`capacitor.config.ts`** - Capacitor configuration for mobile app builds
- **`pwa-assets.config.ts`** - PWA assets generation configuration

#### Entry Points
- **`index.html`** - Main HTML entry point
- **`README.md`** - Application documentation

#### Source Code (`src/`)
- **`main.tsx`** - React app entry point
- **`App.tsx`** - Main app component
- **`App.css`** - App-level styles
- **`index.css`** - Global styles
- **`vite-env.d.ts`** - Vite TypeScript declarations
- **`setupTests.ts`** - Test setup configuration

##### Components (`src/components/`)
- **`index.ts`** - Component exports
- **`MenuScreen.tsx/css`** - Main menu interface
- **`CategorySelector.tsx/css`** - Category selection with multi-select and search
- **`TeamSetup.tsx/css`** - Team configuration screen
- **`GameScreen.tsx/css`** - Main gameplay screen
- **`RippleCountdown.tsx/css`** - Countdown animation component
- **`RoundEndScreen.tsx/css`** - End of round screen
- **`EndScreen.tsx/css`** - Game over screen
- **`HowToPlayModal.tsx/css`** - Instructions modal
- **`CategoryRequestModal.tsx/css`** - Custom category request interface
- **`SelectionBanner.tsx/css`** - Selection display banner
- **`VersionDisplay.tsx/css`** - Version number display component
- **`__tests__/`** - Component unit tests

##### State Management & Logic
- **`store.ts`** - Zustand state management
- **`store.test.ts`** - Store unit tests
- **`store.skipLimit.test.ts`** - Skip limit specific tests
- **`phraseEngine.ts`** - Core phrase selection logic
- **`phrases.test.ts`** - Phrase-related tests

##### Hooks (`src/hooks/`)
- **`useAudio.ts`** - Audio playback hook
- **`useBeepAudio.ts`** - Beep sound specific hook
- **`useBeepRamp.ts/test.ts`** - Accelerating beep timer hook
- **`useHaptics.ts/test.ts`** - Haptic feedback hook
- **`usePhrases.ts`** - Phrase management hook
- **`usePhraseWorker.ts`** - Web Worker integration for phrases
- **`useTimer.ts/test.ts`** - Game timer hook
- **`useViewportHeight.ts`** - Viewport height detection
- **`useBackgroundWarning.ts/test.ts`** - Background color warning system
- **`useCategoryMetadata.ts`** - Category metadata management
- **`__tests__/`** - Hook unit tests

##### Services (`src/services/`)
- **`phraseService.ts/test.ts`** - AI phrase generation service
- **`phraseScorer.ts/test.ts`** - Phrase quality scoring
- **`soundService.ts/test.ts`** - Sound effect management
- **`categoryRequestService.ts/test.ts`** - Custom category requests
- **`__tests__/`** - Service unit tests

##### Other Modules
- **`data/`** - Static data files:
  - **`phrases.ts`** - **MAIN PHRASE DATABASE** - 560 phrases across 10 categories (Entertainment 66, Movies 70, Music 69, Sports 49, Food 71, Places 52, People 34, Technology 50, History 43, Nature 56)
  - **`teamNames.ts`** - Team name suggestions
- **`types/`** - TypeScript type definitions
- **`utils/`** - Utility functions (colorUtils.ts)
- **`config/`** - Configuration (environment.ts)
- **`firebase/`** - Firebase analytics integration
- **`storage/`** - IndexedDB storage layer
- **`workers/`** - Web Workers (phraseWorker.js/test.ts)
- **`assets/`** - Static assets
- **`review/`** - Phrase review interface

##### PWA & Mobile
- **`PWABadge.tsx/css`** - PWA installation prompt
- **`public/`** - Static files (favicon, redirects)

#### Serverless Functions (`netlify/functions/`)
- **`gemini.ts`** - Gemini AI API integration
- **`openai.ts`** - OpenAI API integration

#### iOS App (`ios/`)
- **`App/`** - iOS application code
- **`App.xcodeproj/`** - Xcode project files
- **`App.xcworkspace/`** - Xcode workspace
- **`Podfile`** - iOS dependencies

#### Build & Test Artifacts
- **`lighthouse-report.*`** - Performance test reports
- **`cypress/`** - E2E test files and screenshots

#### Utility Scripts
- **`analyze-db.js`** - Database analysis script (53 lines) - analyzes phrase quality in root phrases.json
- **`analyze-db.cjs`** - **ENHANCED VERSION** - More detailed database analysis (66 lines) with comprehensive quality metrics, historical battle detection, and improvement recommendations
- **`clean-database.cjs`** - Database cleanup script
- **`demo.js`** - Demo script
- **`score-existing.cjs`** - Score existing phrases
- **`test-parallel-batching.js`** - Test parallel batch generation
- **`scripts/generate-version.js`** - Version generation script

### Documentation (`docs/`)

#### Core Documentation
- **`scratchpad.md`** - Active development tracking, lessons learned, current status
- **`ruleset.md`** - Game rules documentation
- **`phrase-quality-guidelines.md`** - Guidelines for phrase quality
- **`updated-phrase-prompt.md`** - Updated prompts for AI generation
- **`icon.png`** - App icon image

#### Implementation Plans (`docs/implementation-plan/`)
Active and completed feature implementation plans:
- **`8-week-roadmap.md`** - Overall project roadmap
- **`phrase-database-generation.md`** - Database generation plan
- **`phrase-quality-upgrade.md`** - Quality improvement plan
- **`multi-batch-phrase-generation.md`** - Batch generation improvements
- **`team-based-scoring-system.md`** - Team scoring implementation
- **`visual-background-warning.md`** - Background warning system
- **`sound-and-haptics.md`** - Audio and haptic feedback
- **`category-selection-redesign.md`** - Category UI redesign
- **`version-number-display.md`** - Version display feature
- And many more feature-specific plans...

#### Assets (`docs/implementation-plan/assets/baseline/`)
- **`manual-qa-checklist.md`** - QA testing checklist
- **`mobile-layout-analysis.md`** - Mobile UI analysis

### Tools (`tools/`)

#### Phrase Database Tool (`tools/phrase-database/`)
⭐ **ENTERPRISE-GRADE DATABASE SYSTEM** - Production-ready SQLite-based phrase management platform:

##### Configuration
- **`package.json`** - Full-featured package with 9 NPM scripts, AI transformers, bloom filters, SQLite3, basic Jest testing
- **`README.md`** - Tool documentation
- **`README.user-guide.md`** - User guide

##### Core Source (`src/`)
- **`cli.js`** - ⭐ **COMPREHENSIVE CLI** - Full-featured command-line interface with 13 commands including:
  - **add** - File import, interactive mode, validation, dry-run
  - **validate** - Duplicate detection, quality scoring
  - **recency** - Stats, marking, auto-detection (4 subcommands)
  - **review** - Manual review workflow
  - **export** - Game format export
  - **init** - Database initialization
  - **bulk-review** - Bulk review sessions
  - Progress bars, colored output, logging (1,184 lines)
- **`database.js`** - SQLite database operations with schema management
- **`api-client.js`** - AI API client for OpenAI/Gemini
- **`phraseScorer.js`** - Advanced scoring algorithm (0-100 points)
- **`normalizer.js`** - Text normalization and standardization
- **`duplicateDetector.js`** - Sophisticated duplicate detection with bloom filters
- **`gameExporter.js`** - Export engine for multiple game formats
- **`quality-pipeline.js`** - Quality control pipeline with validation
- **`quotaTracker.js`** - API quota management and throttling
- **`recencyTracker.js`** - Track and manage phrase recency
- **`filters/`** - Content filtering modules
- **`miners/`** - External data mining (Wikipedia, Reddit)

##### Scripts (`scripts/`)
- **`generate-category.js`** - Generate single category
- **`generate-multi-categories.js`** - Generate multiple categories
- **`analyze-provider-quality.js`** - Compare AI providers
- **`analyze-scoring-calibration.js`** - Scoring analysis
- **`fix-json-conflicts.js`** - Fix merge conflicts
- **`test-integration.js`** - Integration tests
- **`test-provider-switch.js`** - Provider switching tests

##### Data & Reports
- **`data/`** - JSON data files and caches
- **`reports/`** - Analysis reports
- **`tests/`** - Unit tests
- Generated phrase files (various .txt and .json files)

#### Phrase Review Tool (`tools/phrase-review/`)
React app for manual phrase review:
- **`package.json`** - Dependencies
- **`README.md`** - Documentation
- **`src/`** - React app source code
- **`public/`** - Static files
- **`tsconfig.json`** - TypeScript config

## File Relationships

### Core Dependencies
1. **Main App** depends on:
   - **`src/data/phrases.ts`** for game content (560 phrases across 10 categories)
   - Netlify functions for AI generation (custom categories)
   - Firebase for analytics
   - Capacitor for mobile builds

2. **Phrase Generation Pipeline**:
   - Database tool generates phrases → 
   - Review tool for quality control → 
   - Export to various formats → 
   - **Manual integration into `phrases.ts`** (not automated)

**IMPORTANT**: The root `phrases.json` file is NOT used by the live app. The actual phrases are hardcoded in the TypeScript source.

3. **Development Workflow**:
   - Implementation plans guide development
   - Scratchpad tracks progress
   - GitHub Actions automate generation
   - Test scripts validate functionality

### Redundant/Obsolete Files to Consider Removing
1. **`.DS_Store`** - macOS system file
2. **`README.md`** (root) - Nearly empty, should be proper documentation
3. **`Phrase Review June 25 2025 (1).json`** - Dated export file
4. **`analyze-db.js` and `analyze-db.cjs`** - Duplicate files
5. **Root-level test scripts** - Should be moved to proper directories

## Recommended Actions
1. Create proper root README.md with project overview
2. Remove system files and add to .gitignore
3. Consolidate duplicate files
4. Move test scripts to appropriate directories
5. Archive old phrase review exports