# Phrase Data Structure Clarification

## Current Live App Phrase Data

**The live Words on Phone app uses exactly 560 phrases across 10 categories, NOT the root-level JSON files.**

### Actual Phrase Source
- **File**: `words-on-phone-app/src/data/phrases.ts`
- **Total Phrases**: 560 phrases
- **Categories**: 
  - Entertainment & Pop Culture (66 phrases)
  - Movies & TV (70 phrases) 
  - Music & Artists (69 phrases)
  - Sports & Athletes (49 phrases)
  - Food & Drink (71 phrases)
  - Places & Travel (52 phrases)
  - Famous People (34 phrases)
  - Technology & Science (50 phrases)
  - History & Events (43 phrases)
  - Nature & Animals (56 phrases)

### Root-Level Files (Confusion Source)

#### `phrases.json` (173 phrases)
- **Status**: ⚠️ OUTDATED - NOT used by the live app
- **Content**: Only "Entertainment & Pop Culture" category
- **Purpose**: Likely used by phrase generation tools or legacy

#### `phrases_backup.json` (1,491 phrases)
- **Status**: Backup/archive file
- **Content**: Multiple categories with many more phrases
- **Purpose**: Possibly a backup of generated phrases before manual curation

## Why The Confusion?

The PROJECT_INDEX.md initially incorrectly stated that the app uses the root `phrases.json` file with 178 phrases (which is actually 173 phrases). In reality:

1. **Development Tools** may use the root JSON files
2. **Live App** uses hardcoded TypeScript arrays in `phrases.ts`
3. **Phrase Generation** creates JSON files but requires manual integration

## Recommendations

1. **Document** the actual phrase data flow clearly
2. **Move** root-level phrase JSON files to `tools/` if they're only for development
3. **Automate** the integration from generated phrases to `phrases.ts` if possible
4. **Archive** outdated files that aren't part of the active workflow

## Key Takeaway

**The live app has 560 phrases across 10 categories, providing rich gameplay variety across different topics.**