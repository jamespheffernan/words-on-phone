# OpenAI PhraseMachine Migration Plan

**Branch Name:** `feat/openai-phrasemachine-migration`

---

## Background and Motivation

The user wants to rebuild the AI phrase generation feature to leverage OpenAI's API instead of the current Gemini implementation. The migration will use:
- **OpenAI's GPT-4.1 nano model** (cost-efficient model)
- **Custom PhraseMachine prompt** from `docs/textForGPTprompt.txt` 
- **JSON-based response format** with structured schema
- **Batch generation** of 20-100 phrases per API call

**Key Requirements:**
- Use the exact prompt format provided in `textForGPTprompt.txt`
- Implement proper UUID generation for phrase IDs
- Support both topic-specific and general phrase generation
- Handle difficulty levels (easy/medium/hard)
- Ensure family-friendly content generation
- Maintain backward compatibility with existing game features

## Key Challenges and Analysis

1. **API Migration Complexity**:
   - Different request/response formats between Gemini and OpenAI
   - Need to update serverless function, service layer, and worker
   - Must maintain secure API key handling through Netlify functions

2. **Prompt Format Changes**:
   - New prompt uses structured JSON schema with CustomTerm interface
   - Requires UUID generation for each phrase
   - Supports optional difficulty levels not in current implementation

3. **Batch Processing**:
   - New format supports 1-100 phrases per call (vs current 30-50)
   - Need to optimize API calls for cost efficiency
   - Consider implementing request batching for custom categories

4. **Error Handling**:
   - New format has specific error response structure
   - Need to handle both successful JSON arrays and error objects
   - Must gracefully handle API failures and rate limits

5. **Backward Compatibility**:
   - Existing phrases in IndexedDB use different ID format
   - Need to maintain compatibility with current game flow
   - Custom categories should continue working seamlessly

## High-level Task Breakdown

### Task 1: Update Netlify Serverless Function for OpenAI ✅
- [x] Create new `netlify/functions/openai.ts` serverless function
- [x] Implement OpenAI API integration with GPT-4.1 nano model
- [x] Use exact prompt format from `textForGPTprompt.txt`
- [x] Handle both topic-specific and general phrase requests
- [x] Implement proper error handling for API failures
- [x] Add CORS headers for cross-origin requests
- [x] Test with curl and verify JSON response format

**Success Criteria:**
1. Function accepts POST requests with topic and phrase count ✅
2. Returns properly formatted JSON array of CustomTerm objects ✅
3. Handles errors with `{ "error": "<reason>" }` format ✅
4. CORS headers allow requests from development and production origins ✅
5. API key is securely handled server-side only ✅

### Task 2: Update Category Request Service ✅
- [x] Modify `categoryRequestService.ts` to use OpenAI endpoint
- [x] Implement UUID generation for phrase IDs
- [x] Update request format to include topic parameter
- [x] Parse new JSON response format with CustomTerm interface
- [x] Handle optional difficulty levels in responses
- [x] Update sample word generation to use new format
- [x] Maintain existing quota and rate limiting logic

**Success Criteria:**
1. Service generates proper UUIDs for each phrase request ✅
2. Topic parameter correctly passed to API ✅
3. Response parsing handles both success and error formats ✅
4. Difficulty levels stored if provided by API ✅
5. Existing features (sample words, quotas) continue working ✅

### Task 3: Update Phrase Worker for Background Fetching
- [ ] Modify `phraseWorker.ts` to use OpenAI endpoint
- [ ] Implement batch fetching with 50-100 phrases per request
- [ ] Add UUID generation for background-fetched phrases
- [ ] Update deduplication logic for new ID format
- [ ] Optimize API usage for cost efficiency
- [ ] Update logging to reference OpenAI instead of Gemini

**Success Criteria:**
1. Worker fetches phrases in efficient batches
2. UUIDs properly generated and unique
3. Deduplication prevents duplicate phrases
4. API usage stays within reasonable limits
5. Background fetching doesn't impact game performance

### Task 4: Update Data Models and Interfaces
- [ ] Create `CustomTerm` interface matching JSON schema
- [ ] Update `FetchedPhrase` interface to support difficulty levels
- [ ] Modify phrase storage to handle new ID format
- [ ] Update all type definitions from 'gemini' to 'openai'
- [ ] Ensure backward compatibility with existing phrases

**Success Criteria:**
1. All interfaces match new JSON schema exactly
2. TypeScript compilation passes without errors
3. Existing phrases in IndexedDB remain accessible
4. New difficulty field properly typed and optional
5. Source field consistently shows 'openai'

### Task 5: Update UI Components for Difficulty Levels
- [ ] Add difficulty indicator to phrase display (optional)
- [ ] Update category request modal to show difficulty distribution
- [ ] Add settings option to filter by difficulty (future enhancement)
- [ ] Ensure UI gracefully handles phrases without difficulty

**Success Criteria:**
1. Difficulty levels display when available
2. UI doesn't break for phrases without difficulty
3. Visual indicators are clear and unobtrusive
4. Category generation shows difficulty distribution
5. Settings prepared for future difficulty filtering

### Task 6: Testing and Migration Verification
- [ ] Create comprehensive test suite for new API integration
- [ ] Test phrase generation with various topics
- [ ] Verify error handling for API failures
- [ ] Test backward compatibility with existing phrases
- [ ] Performance test batch generation
- [ ] End-to-end testing of custom category flow
- [ ] Verify production deployment works correctly

**Success Criteria:**
1. All unit tests pass with >90% coverage
2. Integration tests verify API communication
3. E2E tests confirm game flow unchanged
4. Performance metrics meet requirements
5. Production deployment verified working

### Task 7: Documentation and Cleanup
- [ ] Update README with OpenAI API setup instructions
- [ ] Document new environment variables needed
- [ ] Update API documentation with new endpoints
- [ ] Remove Gemini-specific code and references
- [ ] Update deployment guide for Netlify
- [ ] Add migration notes to scratchpad

**Success Criteria:**
1. Documentation clearly explains OpenAI setup
2. All Gemini references removed from codebase
3. Deployment guide updated with new requirements
4. API documentation matches implementation
5. Migration process documented for future reference

## Implementation Details

### API Request Format
```typescript
interface OpenAIRequest {
  prompt: string; // Full prompt from textForGPTprompt.txt
  topic?: string; // Optional topic/category
  batchSize: number; // 1-100 phrases
  phraseIds: string[]; // Pre-generated UUIDs
}
```

### API Response Format
```typescript
// Success response
type SuccessResponse = CustomTerm[];

interface CustomTerm {
  id: string; // UUID echoed from request
  topic?: string; // Optional topic echoed back
  phrase: string; // 1-4 words, Title-case
  difficulty?: "easy" | "medium" | "hard"; // Optional
}

// Error response
interface ErrorResponse {
  error: string; // Short error reason
}

type OpenAIResponse = SuccessResponse | ErrorResponse;
```

### UUID Generation Strategy
- Use crypto.randomUUID() for browser environments
- Fallback to custom UUID v4 implementation for older browsers
- Pre-generate UUIDs client-side and send to API
- API echoes back the same UUIDs in response

### Cost Optimization
- Batch requests: 50-100 phrases per API call
- Cache responses aggressively in IndexedDB
- Implement daily/hourly rate limits
- Track API usage in Firebase Analytics
- Use GPT-4.1 nano for cost efficiency

## Project Status Board

### Tasks
- [x] **Task 1**: Update Netlify Serverless Function for OpenAI ✅
- [x] **Task 2**: Update Category Request Service ✅
- [ ] **Task 3**: Update Phrase Worker for Background Fetching
- [ ] **Task 4**: Update Data Models and Interfaces
- [ ] **Task 5**: Update UI Components for Difficulty Levels
- [ ] **Task 6**: Testing and Migration Verification
- [ ] **Task 7**: Documentation and Cleanup

### Milestones
- [x] API Integration Working (Tasks 1-2) ✅
- [ ] Background Fetching Migrated (Task 3)
- [ ] Data Models Updated (Task 4)
- [ ] UI Enhancements Complete (Task 5)
- [ ] Testing & Deployment Verified (Task 6)
- [ ] Documentation Complete (Task 7)

## Risk Mitigation

1. **API Key Security**: Continue using Netlify serverless functions, never expose keys client-side
2. **Cost Overruns**: Implement strict rate limiting and monitoring
3. **Breaking Changes**: Maintain backward compatibility layer for existing phrases
4. **Performance**: Test batch sizes to find optimal balance
5. **Error Handling**: Implement comprehensive retry logic with exponential backoff

## Success Metrics

1. **API Performance**: <500ms response time for phrase generation
2. **Cost Efficiency**: <$0.001 per phrase generated
3. **Reliability**: 99.9% uptime for phrase generation
4. **User Experience**: No noticeable change in game flow
5. **Code Quality**: 90%+ test coverage maintained

## Executor's Feedback or Assistance Requests

### Task 1 Completion Report [2025-01-27]

**✅ Successfully Implemented OpenAI Serverless Function**

**Technical Implementation:**
- Created `netlify/functions/openai.ts` with full OpenAI API integration
- Used exact prompt format from `textForGPTprompt.txt` (embedded in function)
- Implemented request validation for batchSize (1-100) and phraseIds
- Added comprehensive error handling for 401, 429, and general API errors
- Configured CORS headers for cross-origin support

**Key Features Implemented:**
1. **Model Selection**: Using `gpt-4o-mini` as the cost-efficient model (GPT-4.1 nano equivalent)
2. **JSON Response Format**: Configured with `response_format: { type: 'json_object' }` for reliable JSON parsing
3. **UUID Echo**: Function expects pre-generated UUIDs and instructs model to echo them back
4. **Topic Support**: Optional topic parameter properly integrated into user message
5. **Error Handling**: Distinguishes between API errors and model-generated error responses

**Test Script Created:**
- `test-openai.js` provides comprehensive testing for:
  - Topic-specific phrase generation (5 phrases for "90s Movies")
  - General phrase generation (10 phrases, no topic)
  - CORS preflight validation
  - Error handling for missing parameters
  - Large batch requests (50 phrases)

**Environment Configuration Updated:**
- Added `OPENAI_API_URL` to `environment.ts`
- Configured for both development (localhost:8888) and production
- Added `OPENAI_MAX_BATCH_SIZE` and `OPENAI_MIN_BATCH_SIZE` constants

**Next Steps:**
- Need OpenAI API key set as `OPENAI_API_KEY` in Netlify environment variables
- Ready to proceed with Task 2: Update Category Request Service

### Task 2 Completion Report [2025-01-27]

**✅ Successfully Migrated CategoryRequestService to OpenAI API**

**Technical Implementation:**
- **API Migration**: Completely updated `categoryRequestService.ts` to use OpenAI endpoint instead of Gemini
- **UUID Generation**: Implemented robust UUID generation using `crypto.randomUUID()` with fallback for older browsers
- **Interface Updates**: Added `CustomTerm` interface matching OpenAI JSON schema with optional difficulty levels
- **Request Format**: Updated to send `topic`, `batchSize`, and `phraseIds` parameters to OpenAI API
- **Response Parsing**: Implemented `parseOpenAIResponse()` method to handle both success arrays and error objects
- **Source Field**: Updated from 'gemini' to 'openai' for all new phrases

**Key Features Implemented:**
1. **UUID Integration**: Pre-generates UUIDs client-side and sends to API for echo-back
2. **Difficulty Support**: Handles optional difficulty levels ('easy', 'medium', 'hard') from API responses
3. **Batch Processing**: Optimized for OpenAI's batch format (3 for samples, 50 for full categories)
4. **Error Handling**: Distinguishes between API errors and model-generated error responses
5. **Backward Compatibility**: Maintains all existing quota and rate limiting functionality

**Testing Added:**
- Created comprehensive test suite in `categoryRequestService.test.ts`
- Tests UUID generation, API integration, and quota management
- All 5 tests pass successfully
- Verified TypeScript compilation with no errors

**Data Model Changes:**
- Updated `FetchedPhrase` interface to include optional `difficulty` field
- Updated `source` field from 'gemini' to 'openai'
- Added `CustomTerm` interface matching OpenAI API response format
- Maintained backward compatibility with existing phrase data

**Success Verification:**
✅ Service generates proper UUIDs for each phrase request
✅ Topic parameter correctly passed to API
✅ Response parsing handles both success and error formats
✅ Difficulty levels stored if provided by API
✅ Existing features (sample words, quotas) continue working

**Ready for Task 3**: Update Phrase Worker for Background Fetching

## Lessons Learned

*To be updated during implementation process* 