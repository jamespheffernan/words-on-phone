# Agent Handoff Brief - Words on Phone Project

## Overview
You are taking over the **OpenAI PhraseMachine Migration** project for **Words on Phone**, a React-based party game similar to Catch Phrase. The project is transitioning from Gemini API to OpenAI's GPT-4o-mini for AI-powered phrase generation.

## Project Context
- **Main App**: React PWA with offline capabilities, housed in `words-on-phone-app/` subdirectory
- **Current Phase**: Phase 9 (Launch preparation) - project is mostly complete, this is a strategic API migration
- **Current Status**: Production app is live and functional with Gemini API, OpenAI migration is enhancement

## Migration Status: Task 1 ✅ Complete, Task 2 Next

### ✅ Just Completed (Task 1): OpenAI Serverless Function
- **File**: `words-on-phone-app/netlify/functions/openai.ts` ✅ Created
- **Test Script**: `test-openai.js` ✅ Created  
- **Environment Config**: `words-on-phone-app/src/config/environment.ts` ✅ Updated
- **Model**: Using `gpt-4o-mini` (cost-efficient GPT-4.1 nano equivalent)
- **Prompt**: Exact format from `docs/textForGPTprompt.txt` embedded in function
- **Features**: UUID echo, JSON response format, CORS support, comprehensive error handling

### 🎯 Next Task (Task 2): Update Category Request Service
**File to modify**: `words-on-phone-app/src/services/categoryRequestService.ts`

**Requirements**:
1. Change API endpoint from Gemini to OpenAI
2. Implement UUID generation for phrase IDs (crypto.randomUUID())
3. Update request format to match OpenAI function expectations
4. Parse new JSON response format with CustomTerm interface
5. Handle optional difficulty levels in responses
6. Maintain existing quota and rate limiting logic

## Key Technical Details

### OpenAI API Contract
```typescript
// Request Format
{
  topic?: string,        // Optional category
  batchSize: number,     // 1-100 phrases
  phraseIds: string[]    // Pre-generated UUIDs
}

// Response Format
CustomTerm[] | { error: string }

interface CustomTerm {
  id: string;                                    // UUID echoed back
  topic?: string;                               // Optional topic
  phrase: string;                               // 1-4 words, Title-case
  difficulty?: "easy" | "medium" | "hard";      // Optional difficulty
}
```

### Environment Setup Required
- **OPENAI_API_KEY**: Must be set in Netlify environment variables
- **Testing**: Use `test-openai.js` script to verify function works
- **Endpoints**: Configured in `environment.ts` for dev/prod

## Implementation Plan Structure

### Remaining Tasks (6 of 7 complete)
1. ✅ Task 1: Update Netlify Serverless Function for OpenAI
2. 🎯 **Task 2: Update Category Request Service** (NEXT)
3. Task 3: Update Phrase Worker for Background Fetching
4. Task 4: Update Data Models and Interfaces  
5. Task 5: Update UI Components for Difficulty Levels
6. Task 6: Testing and Migration Verification
7. Task 7: Documentation and Cleanup

### Key Implementation Files
- **Detailed Plan**: `docs/implementation-plan/openai-phrasemachine-migration.md`
- **Progress Tracking**: `docs/scratchpad.md`
- **Prompt Source**: `docs/textForGPTprompt.txt`

## Workflow Guidelines (Critical)

### User Rules Summary
- **Roles**: You can be **Planner** (high-level analysis, planning) or **Executor** (implementation)
- **Mode**: User will specify which mode to use, or ask if unclear
- **Documentation**: Always update implementation plan with progress/blockers
- **Commits**: Work in small vertical slices, commit when tests pass
- **Testing**: Adopt TDD approach, test each functionality before moving on
- **Communication**: Report completion/blockers to user before proceeding to next task

### Project Structure
- **Main directory**: `words-on-phone-app/` (React app)
- **Root directory**: Minimal stub, all work happens in subdirectory
- **Branch**: Create feature branch `feat/openai-phrasemachine-migration`
- **Git**: Currently on `main`, ahead by 3 commits (recent fixes)

## Current Environment State
- **Shell**: `/bin/zsh` in `/Users/jamesheffernan/Documents/GitHub/words-on-phone/words-on-phone-app`
- **Git Status**: On `main` branch, some uncommitted changes to implementation docs
- **Dependencies**: Project uses React 18, TypeScript, Vite, Netlify Functions

## Immediate Next Steps
1. **Executor Mode**: Take on Task 2 implementation
2. **Create Feature Branch**: `feat/openai-phrasemachine-migration`
3. **Review Current Code**: Examine `categoryRequestService.ts` structure
4. **Implement Changes**: Update service to use OpenAI endpoint
5. **Test**: Verify functionality works with new API
6. **Update Documentation**: Mark Task 2 complete in implementation plan

## Important Notes
- **Backward Compatibility**: Maintain existing game functionality
- **Error Handling**: Comprehensive error handling for API failures
- **Cost Optimization**: Use batch requests (20-50 phrases per call)
- **Security**: Never expose API keys client-side
- **Performance**: Maintain <500ms response times

## Questions for User
1. Which mode should I start in - **Planner** or **Executor**?
2. Should I proceed with Task 2 (Category Request Service) or do you want to review/modify the plan first?

## Key Files to Know
- `docs/implementation-plan/openai-phrasemachine-migration.md` - Detailed implementation plan
- `docs/scratchpad.md` - Project overview and lessons learned
- `words-on-phone-app/src/services/categoryRequestService.ts` - Next file to modify
- `words-on-phone-app/netlify/functions/openai.ts` - Just completed OpenAI function
- `test-openai.js` - Test script for verifying API functionality 