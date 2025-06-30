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
- **`phrases.json`** - ⚠️ **OUTDATED** - Contains only 178 phrases from one category; NOT used by the live app
- **`phrases_backup.json`** - Backup phrase database with ~1,400+ phrases across multiple categories
- **`Phrase Review June 25 2025 (1).json`** - ⚠️ **CANDIDATE FOR DELETION** - Appears to be a one-time export for review, dated file

**NOTE**: The live app actually uses hardcoded phrases in `words-on-phone-app/src/data/phrases.ts` with ~535 phrases across 10+ categories, not the root JSON files.

#### Test Scripts (Root Level)
- **`batch-phrase-generator.js`** - Script for generating multiple batches of phrases using AI services
- **`test-openai.js`** - Test script for OpenAI API integration
- **`test-phrase-quality-demo.js`** - Demo script for testing phrase quality scoring
- **`test-production.js`** - Production environment testing script
- **`test-quality-generation.js`** - Quality generation testing script

#### Git Configuration
- **`.gitignore`** - Git ignore rules
- **`.gitattributes`** - Git attributes for line ending handling

#### System Files
- **`.DS_Store`** - ⚠️ **CANDIDATE FOR DELETION** - macOS system file that should be gitignored
- **`.cursor/`** - Cursor editor configuration directory

### GitHub Actions (`.github/workflows/`)
- **`nightly-phrase-generation.yml`** - Automated workflow for generating new phrases nightly, creates PRs with new content

### Main Application (`words-on-phone-app/`)

#### Configuration Files
- **`package.json`** - Node.js dependencies and scripts for the React app
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
  - **`phrases.ts`** - **MAIN PHRASE DATABASE** - ~535 phrases across 10+ categories (Entertainment, Movies, Music, Sports, Food, Places, People, Technology, History, Nature)
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
- **`analyze-db.js/cjs`** - ⚠️ **DUPLICATE FILES** - Database analysis scripts
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
Comprehensive tooling for phrase generation and management:

##### Configuration
- **`package.json`** - Dependencies and scripts
- **`README.md`** - Tool documentation
- **`README.user-guide.md`** - User guide

##### Core Source (`src/`)
- **`cli.js`** - Command-line interface
- **`database.js`** - Database operations
- **`api-client.js`** - AI API client
- **`phraseScorer.js`** - Scoring algorithm
- **`normalizer.js`** - Text normalization
- **`duplicateDetector.js`** - Duplicate detection
- **`gameExporter.js`** - Export for game use
- **`quality-pipeline.js`** - Quality control pipeline
- **`quotaTracker.js`** - API quota management
- **`recencyTracker.js`** - Track recent generations
- **`filters/`** - Content filtering
- **`miners/`** - External data mining

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
   - **`src/data/phrases.ts`** for game content (~535 phrases across 10+ categories)
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