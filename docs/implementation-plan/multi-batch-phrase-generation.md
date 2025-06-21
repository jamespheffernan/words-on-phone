# Multi-Batch Phrase Generation (3×15 → 45 Phrases)

**Branch Name:** `feat/multi-batch-phrase-generation`

---

## Background and Motivation

Netlify functions reliably return a maximum of **15 phrases** within the 10-second execution window. However, a full round of Words on Phone gameplay consumes around **40-50 phrases**. Players currently run out of content after a single batch and must trigger additional requests manually, breaking the game's flow.

To restore the original experience we will **aggregate three successive 15-phrase calls (15 × 3 = 45)** whenever the app needs a fresh set of phrases. Because the underlying AI model can repeat itself across calls we must deduplicate phrases before storing them.

## Key Challenges and Analysis

1. **Function Timeouts** – Each 15-phrase request is ~6-7 s; chaining three sequentially could exceed 20 s if performed inside the same Netlify function.  We will therefore keep the serverless function unchanged and perform the **three calls client-side in `CategoryRequestService`**.
2. **Function Timeouts & Concurrency** – Each 15-phrase request averages ~6–7 s. Making the three requests **in parallel** via `Promise.allSettled()` will finish in roughly the longest single call instead of triple that.  Netlify allows several concurrent invocations, so three simultaneous calls stay within limits.  The serverless function remains unchanged; batching happens in `CategoryRequestService`.
3. **Duplicates Across Batches** – The second and third batches may repeat phrases from earlier batches or from the local cache.  We need a Set-based deduplication step before persisting.
4. **Rate & Daily Quotas** – Triple calls count against the existing daily quota logic.  We will record **one quota unit per 15-phrase request** so the limit behaviour remains predictable.
5. **Partial Results** – If after three batches we still have <45 unique phrases (because of heavy overlap) we should optionally issue a **fourth retry** capped at one extra attempt, then gracefully continue with however many unique phrases were secured.
6. **Unit + E2E Testing** – Mocked OpenAI & Gemini responses must simulate duplicates to affirm the deduplication logic.

## High-level Task Breakdown

### Task 1: Update Environment Constants
- [ ] Add `TOTAL_PHRASES_PER_CATEGORY = 45` to `environment.ts`
- [ ] Keep existing `PHRASES_PER_REQUEST = 15`

**Success Criteria**: The constants clearly document batch vs total counts and compile without TypeScript errors.

### Task 2: Refactor CategoryRequestService for Batched Generation
- [ ] Extract existing 15-phrase logic into `generatePhrasesBatchFromOpenAI()` / `…Gemini()`
- [ ] In `generateFullCategory()` fire **three parallel batch requests** with `Promise.allSettled()`
- [ ] Merge successful arrays, dedupe, and check count; if <45 unique => launch **incremental sequential retries** (one at a time) until unique count reached or **4 total batches** attempted
- [ ] Use a `Set<string>` to track lower-cased phrase texts for uniqueness across batches
- [ ] Respect and update the daily usage counter **per batch** (including any retries)

**Success Criteria**:
1. Exactly one IndexedDB write containing ≤45 unique phrases
2. No duplicate phrase texts in the returned array
3. Function completes in <30 s on slow 3G network (measured via Lighthouse throttling)

### Task 3: Expand Deduplication Logic
- [ ] Add helper `deduplicateAgainstExisting()` that combines existing phrase cache + in-flight batch Set
- [ ] Unit-test with mocked duplicates to ensure only unique phrases persist

**Success Criteria**: All new tests pass; duplicate phrases are removed during a three-batch run.

### Task 4: UI / Progress Feedback (Optional but Recommended)
- [ ] Show a spinner or progress bar "Generating phrases 1/3, 2/3, 3/3…" in the Category modal
- [ ] Disable the 'Generate' button while batches are in flight

**Success Criteria**: Users receive visual feedback and cannot double-submit requests.

### Task 5: Testing & QA
- [ ] Unit tests for batching logic in CategoryRequestService (mock fetch)
- [ ] Cypress E2E: create custom category and verify 45 phrases rendered
- [ ] Manual smoke test on production build with slow-network throttling

**Success Criteria**: All tests green; manual test confirms smooth UX and 45 phrases available.

### Task 6: Documentation & Cleanup
- [ ] Update README and developer docs to explain new batching constants
- [ ] Record a lesson learned about batching vs Netlify timeouts in `docs/scratchpad.md`

**Success Criteria**: Documentation builds without broken links; scratchpad entry added.

## Project Status Board

### 🟢 Ready to Start
- [ ] **Task 3**: Expand Deduplication Logic
- [ ] **Task 4**: UI / Progress Feedback (Optional but Recommended)

### 🚧 In Progress
_(to be updated by Executor)_

### ✅ Completed
- [x] **Task 1**: Update Environment Constants
- [x] **Task 2**: Refactor CategoryRequestService for Batched Generation

## Current Status / Progress Tracking

Phase: **Planning** – awaiting human review.

## Executor's Feedback or Assistance Requests

**[2025-06-21 - Executor]** ✅ **Tasks 1-2 Complete: Environment Constants & Parallel Batching**

**✅ Task 1 Complete:**
- Added `TOTAL_PHRASES_PER_CATEGORY = 45` constant to `environment.ts`
- TypeScript compilation passes without errors

**✅ Task 2 Complete:**
- Refactored `CategoryRequestService.generateFullCategory()` to use parallel batching
- Extracted single batch logic into `generatePhrasesBatchFromOpenAI()` and `generatePhrasesBatchFromGemini()`
- Implemented `generatePhrasesWithBatching()` using `Promise.allSettled()` for 3 parallel requests
- Added cross-batch deduplication with `deduplicateAcrossBatches()` method
- Included retry mechanism: if <45 unique phrases after 3 batches, attempts 1 additional batch
- Updated daily usage tracking to count each batch individually
- All existing tests pass (6/6) - backward compatibility maintained

**🚀 Implementation Highlights:**
- Parallel requests reduce wait time from ~20s (sequential) to ~7s (parallel)
- Robust error handling: continues with successful batches even if some fail
- Console logging for debugging batch progress and deduplication results
- Graceful fallback: accepts whatever unique phrases are generated if retry fails

**Next Steps:** Ready to move to Task 3 (Expand Deduplication Logic) - though the cross-batch deduplication is already implemented, we may need additional unit tests to verify edge cases.

## Lessons Learned

_(to be populated during implementation)_ 