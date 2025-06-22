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

## Detailed Task Breakdown (v2)
_(Each task should be treated as a small vertical slice that can be implemented, tested, and merged independently.)_

1. **Branch Setup**
   1.1 Create and checkout `feature/category-selection-redesign` from `main`
   1.2 Ensure clean working tree and successful `npm run build` in both root and `words-on-phone-app/`

2. **Data Model Refactor**
   2.1 Introduce `CategoryMetadata` type to distinguish `default` vs `user` categories, phrase count, createdAt, createdBy
   2.2 Update `phraseService` to return `{ metadata: CategoryMetadata; phrases: string[] }[]`
   2.3 Create migration util to convert legacy category storage → new schema
   2.4 Write unit tests covering default → user separation and backward compatibility

3. **Persistent Storage Layer**
   3.1 Add `categoryStore` (Zustand) to persist selected categories and user prefs
   3.2 Sync `categoryStore` with IndexedDB fallback via `indexedDBStorage.ts`
   3.3 Unit test read/write logic for selection persistence

4. **CategorySelector Component (Skeleton)**
   4.1 Render tabbed UI (Default | User-Created)
   4.2 Display list/grid of categories with basic checkbox
   4.3 Integrate with `categoryStore` for selection state
   4.4 Cypress component test: selection toggles update store

5. **Multi-Selection Logic & Phrase Combining**
   5.1 Implement selector helper `getMergedPhrases(selectedIds)` in `phraseService`
   5.2 Ensure deduplication and randomization
   5.3 Add unit tests for merging correctness and performance (>10k phrases)

6. **Live Selection Banner**
   6.1 Floating banner component showing count & categories
   6.2 Animate in/out on first selection / clear
   6.3 Add "Clear" & "Select All" buttons
   6.4 Accessibility: ARIA live region for updates

7. **Category Tile Enhancements**
   7.1 Display phrase count badge on each tile
   7.2 Lazy-load counts to avoid blocking UI
   7.3 Hover/press tooltip with description (for user-created)

8. **"Everything" Logic Refinement**
   8.1 Update virtual category generator to include only default categories
   8.2 Add new "Everything+" that includes user categories
   8.3 Update help text in How-To-Play modal

9. **Category Management Utilities**
   9.1 Pin/unpin favorites logic in `categoryStore`
   9.2 Sort modes (name, count, recent)
   9.3 Bulk operations: select similar, invert selection

10. **User Category Creation Flow Enhancements**
    10.1 Mark user-created categories in metadata
    10.2 Optional description field & tag list
    10.3 Share link generator (deep-link with categoryId)

11. **Comprehensive Test Suite**
    11.1 Unit tests for services/stores (Jest + RTL)
    11.2 Cypress e2e tests covering multi-select UX
    11.3 Performance benchmarks for phrase merging

12. **Documentation & Cleanup**
    12.1 Update README and in-app help with new UX
    12.2 Add lessons learned to scratchpad
    12.3 Final QA pass and accessibility audit

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
- [ ] Task 10: Add comprehensive tests

### In Progress:

### Completed:

## Executor's Feedback or Assistance Requests

_This section will be updated by the Executor during implementation_

## Lessons Learned

_Lessons learned during implementation will be documented here_ 