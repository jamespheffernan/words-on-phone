# PhraseMachine Prompt Upgrade

**Branch Name:** `feat/phrasemachine-prompt-upgrade`

---

## Background and Motivation

The user requested to modify the Gemini custom category feature to use a more sophisticated "PhraseMachine" prompt format that is more structured and specific in its instructions for generating party-friendly phrases.

**Original Request:**
Replace the existing prompts with a new PhraseMachine format that includes:
- Specific persona ("You are PhraseMachine")
- Clear task structure with numbered requirements
- JSON output format for main phrase generation
- Word count specifications (2-6 words for phrases, 1-3 for samples)
- Family-friendly guidelines
- Quality verification instructions

## Key Challenges and Analysis

1. **Dual Prompt Systems**: The system has two different prompts:
   - Sample words prompt (generates 3 examples for user preview)
   - Full category prompt (generates 30-50 phrases in JSON format)

2. **JSON Parsing**: The new format outputs JSON arrays, requiring parsing logic updates

3. **Backward Compatibility**: Need to ensure fallback parsing for non-JSON responses

4. **Production Testing**: Must verify changes work in deployed environment

## High-level Task Breakdown

### Task 1: Update Full Category Generation Prompt ✅
- [x] Replace existing prompt in `generateFullCategory()` with PhraseMachine format
- [x] Update prompt to request 30-50 phrases in JSON format
- [x] Include word count requirements (2-6 words each)
- [x] Add family-friendly guidelines and quality verification

**Success Criteria:**
1. Prompt matches exact PhraseMachine format with `<<CATEGORY>>` replaced ✅
2. Requests JSON output format ✅
3. Includes all quality guidelines ✅

### Task 2: Update Sample Words Generation Prompt ✅
- [x] Replace existing prompt in `requestSampleWords()` with simplified PhraseMachine format
- [x] Adapt for 3 sample words instead of full phrase generation
- [x] Maintain line-by-line output for sample words

**Success Criteria:**
1. Uses PhraseMachine persona and structure ✅
2. Requests exactly 3 sample words ✅
3. Maintains simple line-by-line format ✅

### Task 3: Update Response Parsing Logic ✅
- [x] Enhance `parsePhrasesFromResponse()` to handle JSON format
- [x] Add regex matching for JSON arrays in responses
- [x] Implement fallback to line-by-line parsing for backward compatibility
- [x] Maintain existing parsing for sample words

**Success Criteria:**
1. Successfully parses JSON array responses ✅
2. Falls back gracefully to line-by-line parsing ✅
3. No breaking changes to existing functionality ✅

### Task 4: Update Production Test Script ✅
- [x] Update test script prompts to match new PhraseMachine format
- [x] Update response parsing to handle JSON format
- [x] Verify test passes with production deployment

**Success Criteria:**
1. Test script uses exact PhraseMachine prompts ✅
2. Handles both sample words and full category responses ✅
3. Production test passes successfully ✅

### Task 5: Build and Deployment Verification ✅
- [x] Verify application builds without errors
- [x] Run end-to-end production test
- [x] Commit changes with proper documentation

**Success Criteria:**
1. Build completes successfully ✅
2. Production test shows 41 phrases generated ✅
3. Changes committed and documented ✅

## Project Status Board

- ✅ **Task 1**: Full category prompt updated to PhraseMachine format
- ✅ **Task 2**: Sample words prompt updated with PhraseMachine structure  
- ✅ **Task 3**: JSON response parsing implemented with fallback
- ✅ **Task 4**: Production test script updated and verified
- ✅ **Task 5**: Build and deployment verification complete

**Status**: ✅ **COMPLETED** - PhraseMachine prompt upgrade successfully implemented

## Executor's Feedback or Assistance Requests

**IMPLEMENTATION COMPLETED [2025-01-27]:**

**All Tasks Successfully Executed:**

**Technical Implementation Results:**
- **Full Category Prompt**: Updated to exact PhraseMachine format requesting 30-50 phrases in JSON format
- **Sample Words Prompt**: Updated with PhraseMachine persona requesting exactly 3 examples
- **JSON Parsing**: Enhanced with regex-based JSON extraction and fallback to line parsing
- **Production Testing**: End-to-end test successful with 41 phrases generated

**Production Verification Results:**
- ✅ **Sample Words**: Generated 3 items ("Production Test", "Sample Item", "Test Run")
- ✅ **Full Category**: Generated 41 phrases in proper format
- ✅ **JSON Parsing**: Successfully extracted phrases from JSON response
- ✅ **Build Status**: Application builds without errors
- ✅ **CORS/Function**: All API calls working correctly

**Quality Improvements Achieved:**
1. **More Structured Prompts**: Clear persona and task definition
2. **Better Output Quality**: 30-50 phrase range with 2-6 word specifications
3. **Enhanced Parsing**: Robust JSON handling with backward compatibility
4. **Production Verified**: Live testing confirms functionality works end-to-end

**Implementation Complete**: Custom category feature now uses PhraseMachine prompt format as requested.

## Lessons Learned

- [2025-01-27] When updating prompt formats that change output structure (line-based to JSON), always implement parsing logic that can handle both old and new formats for smooth transitions
- [2025-01-27] Production testing is essential when modifying prompt formats - what works in development may behave differently with live AI models
- [2025-01-27] JSON extraction from AI responses should use regex pattern matching rather than assuming the entire response is JSON, as models may include explanatory text before/after the JSON
- [2025-01-27] When implementing dual prompt systems (sample vs full generation), maintain consistency in persona and structure while adapting output requirements appropriately 