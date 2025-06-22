# Category Selection UX Redesign Implementation Plan

Branch Name: `feature/category-selection-redesign`

## Background and Motivation

The user wants to redesign the category selection with these requirements:
1. Retain user-created categories (available to all users)
2. User categories not included in "Everything" by default
3. Easy multi-category selection
4. Live updating banner showing selected categories and total word count
5. Better organization (e.g., swipe to see user-created categories)

Current limitations:
- Single category selection only
- User categories mixed with default categories
- No indication of phrase count per category
- No way to combine multiple categories

## Key Challenges and Analysis

1. **Data Architecture**: Need to separate default vs user-created categories
2. **Multi-Select UI**: Design intuitive multi-category selection
3. **Real-time Updates**: Calculate total phrase count across selected categories
4. **Storage**: Persist user category preferences and selections
5. **Performance**: Efficient deduplication when combining categories

## High-level Task Breakdown

### Task 1: Create feature branch
**Success Criteria**: 
- Create and checkout `feature/category-selection-redesign` branch
- Verify clean git status

### Task 2: Refactor category data structure
**Success Criteria**:
- Separate default and user categories in phraseService
- Add metadata (phrase count, creation date, creator)
- Update storage to maintain category separation
- Ensure backward compatibility

### Task 3: Design new CategorySelector component
**Success Criteria**:
- Tab or swipe navigation between default/user categories
- Checkbox UI for multi-selection
- Visual distinction between category types
- Search/filter functionality
- Responsive grid layout

### Task 4: Implement live selection banner
**Success Criteria**:
- Floating banner showing selected categories
- Real-time phrase count calculation
- Quick clear/select all buttons
- Smooth animations for add/remove
- Collapsible for more screen space

### Task 5: Add phrase count indicators
**Success Criteria**:
- Show phrase count on each category tile
- Update counts when categories are modified
- Performance optimization for large datasets
- Loading states during calculation

### Task 6: Implement multi-category phrase loading
**Success Criteria**:
- Combine phrases from selected categories
- Efficient deduplication algorithm
- Maintain proper randomization
- Update PhraseCursor to handle merged sets

### Task 7: Add category management features
**Success Criteria**:
- Pin favorite categories to top
- Sort by name, count, or usage
- Bulk operations (select similar, invert)
- Remember last selection

### Task 8: Update "Everything" category logic
**Success Criteria**:
- Include only default categories in "Everything"
- Add "Everything+" option for all categories
- Clear indication of what's included
- Update tooltip/help text

### Task 9: Enhance user category creation
**Success Criteria**:
- Flag categories as user-created
- Optional category description
- Category tags/themes
- Share category via link/code

### Task 10: Add comprehensive tests
**Success Criteria**:
- Test multi-selection logic
- Test phrase count calculations
- Test category combination
- Test UI interactions
- Performance benchmarks

### Task 10 Sub-tasks (detailed)

| Sub-task | Description | Owner | Status |
|----------|-------------|--------|--------|
| 10a | Stub `indexedDBStorage` (or mock idb-keyval) inside `phraseService.test.ts` so that `addFetchedPhrases` and `handleWorkerPhrases` resolve immediately, eliminating 10 s timeouts | Executor | ✅ Done |
| 10b | Convert `useTimer.test.ts` to `vi.useFakeTimers()` and advance timers to deterministic points; adjust assertion tolerances | Executor | ✅ Done |
| 10c | Re-write `phraseWorker.test.ts` to spy on `self.addEventListener('message', …)` instead of expecting `message` handler on mocked worker, then manually `dispatchEvent` messages for START / STATUS / unknown | Executor | ✅ Done |
| 10d | Silence remaining `act()` warnings in `CategorySelector.test.tsx` by wrapping initial renders causing state updates (non-blocking) | Executor | ✅ Done |

**Acceptance Criteria for Task 10**
1. `npm test` exits with zero failures and no unhandled promise rejections.
2. No React `act()` warnings in console output.
3. Tests run in <15 s on CI parallel runner.

## Project Status Board

### TODO:
- [ ] Task 1: Create feature branch
- [ ] Task 2: Refactor category data structure
- [ ] Task 3: Design new CategorySelector component
- [ ] Task 4: Implement live selection banner
- [ ] Task 5: Add phrase count indicators
- [ ] Task 6: Implement multi-category phrase loading
- [ ] Task 7: Add category management features
- [ ] Task 8: Update "Everything" category logic
- [ ] Task 9: Enhance user category creation
- [ ] Task 10: Add comprehensive tests (see sub-tasks 10a-10d)

### In Progress:
- [ ] Task 10: Add comprehensive tests (see sub-tasks 10a-10d)

### Completed:
- [x] Task 1: Create feature branch ✅ Branch `feature/category-selection-redesign` created and checked out
- [x] Task 2: Refactor category data structure ✅ Completed – category metadata added, default vs custom separation implemented in words-on-phone-app/src/services/phraseService.ts
- [x] Task 3: Design new CategorySelector component
- [x] Task 4: Implement live selection banner
- [x] Task 5: Add phrase count indicators
- [x] Task 6: Implement multi-category phrase loading
- [x] Task 7: Add category management features
- [x] Task 8: Update "Everything" category logic
- [x] Task 9: Enhance user category creation

## Executor's Feedback or Assistance Requests

**BLOCKER - File Corruption Issue**: During Task 2 implementation, encountered persistent corruption of `src/services/phraseService.ts` file when attempting to add the enhanced category metadata interfaces. The file gets truncated to only 23 lines instead of the original 324 lines after edits. Multiple restoration attempts (git checkout, git restore, git show) have failed to recover the complete file content.

**Request**: Need assistance to:
1. Properly restore the complete phraseService.ts file (324 lines)
2. Alternative approach to implement the category metadata enhancement without file corruption
3. Investigation into why the edit_file tool is corrupting this specific file

**Current Status**: Task 1 complete, Task 2 blocked due to file corruption issue.

✅ RESOLVED 2025-06-22 – The corrupted duplicate file (`src/services/phraseService.ts`) was identified as unused legacy code. It has been safely removed, and the fully-featured implementation in `words-on-phone-app/src/services/phraseService.ts` now serves as the single source of truth. Category metadata, default/custom separation, and Everything/Everything+ logic are fully operational. No further corruption observed.

**Current Focus:** Task 10 completed – all sub-tasks done and tests run clean with no warnings/timeouts. Ready for planner review/closure.

## Lessons Learned

_Lessons learned during implementation will be documented here_

* [2025-06-22] Keep an eye out for duplicate legacy files – they can cause confusion and apparent "corruption" when the real implementation lives elsewhere. 