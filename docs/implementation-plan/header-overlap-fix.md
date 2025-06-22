# Header Overlap Fix - Scoreboard and Skip Counter

## Background and Motivation

**Issue Identified**: In the new mobile gameplay UI, the scoreboard icon (score display) and skip counter overlap on certain screen sizes. This creates a poor user experience where important game information becomes unreadable.

**Root Cause Analysis**: 
- The `.skip-counter` is positioned as a separate block element below `.game-header-controls`
- The score display is positioned at the end of `.game-header-controls` 
- On smaller screens, these elements can visually overlap or create layout conflicts
- The current CSS doesn't ensure proper spacing and hierarchy between these elements

**User Impact**: Players cannot clearly see their current score or remaining skips, which are critical gameplay elements.

## Key Challenges and Analysis

1. **Layout Hierarchy**: Need to reorganize header structure to prevent overlaps
2. **Responsive Design**: Ensure proper spacing across all mobile screen sizes
3. **Visual Clarity**: Maintain clear separation between score and skip information
4. **Touch Targets**: Preserve accessibility requirements for mobile interaction
5. **Existing Mobile Optimizations**: Must not break the recently implemented mobile viewport fixes

## High-level Task Breakdown

### Task 1: Create Feature Branch
- **Objective**: Set up development branch for header overlap fix
- **Actions**: 
  - Create branch `header-overlap-fix` from main
  - Ensure clean working directory
- **Success Criteria**: 
  - Branch created successfully
  - Git status shows clean state

### Task 2: Analyze Current Header Layout Structure
- **Objective**: Document current layout issues and measure overlap scenarios
- **Actions**:
  - Test current layout on various mobile screen sizes
  - Document specific overlap conditions
  - Screenshot problematic layouts for reference
- **Success Criteria**:
  - Clear documentation of overlap scenarios
  - Baseline measurements recorded

### Task 3: Redesign Header Layout Structure
- **Objective**: Create non-overlapping header layout that works on all screen sizes
- **Actions**:
  - Reorganize header into logical sections
  - Implement proper CSS Grid or Flexbox layout
  - Ensure skip counter has dedicated space when visible
- **Success Criteria**:
  - Header elements never overlap
  - Layout remains responsive
  - Visual hierarchy is clear

### Task 4: Implement Responsive Spacing
- **Objective**: Add proper spacing and sizing for all mobile screen sizes
- **Actions**:
  - Use `clamp()` functions for responsive spacing
  - Add specific media queries for edge cases
  - Ensure minimum touch targets are maintained
- **Success Criteria**:
  - No overlaps on iPhone SE (375px width)
  - Proper spacing on iPhone 14 Pro Max
  - Landscape orientation works correctly

### Task 5: Test Layout Across Devices
- **Objective**: Verify fix works on all target mobile devices
- **Actions**:
  - Test on iPhone SE, iPhone 14 Pro, iPhone 14 Pro Max
  - Test on Android devices (Pixel 5, Galaxy S21)
  - Test both portrait and landscape orientations
- **Success Criteria**:
  - No overlaps on any target device
  - All text remains readable
  - Touch targets remain accessible

### Task 6: Update Cypress Tests
- **Objective**: Add automated tests to prevent regression
- **Actions**:
  - Add header layout tests to mobile-viewport.cy.ts
  - Test for element positioning and overlap detection
  - Verify skip counter visibility when skip limit > 0
- **Success Criteria**:
  - Tests pass on all viewport sizes
  - Overlap detection works correctly
  - Skip counter visibility logic is tested

### Task 7: Documentation and Deployment
- **Objective**: Document fix and deploy to production
- **Actions**:
  - Update implementation plan with technical details
  - Commit changes with descriptive message
  - Merge to main and deploy
- **Success Criteria**:
  - Documentation is complete
  - Changes are deployed successfully
  - No regressions in production

## Branch Name
`header-overlap-fix`

## Current Status / Progress Tracking

### Project Status Board
- [ ] **Task 1**: Create feature branch `header-overlap-fix`
- [ ] **Task 2**: Analyze and document current overlap scenarios
- [ ] **Task 3**: Redesign header layout structure to prevent overlaps
- [ ] **Task 4**: Implement responsive spacing with clamp() functions
- [ ] **Task 5**: Test layout across all target mobile devices
- [ ] **Task 6**: Add Cypress tests for overlap detection
- [ ] **Task 7**: Documentation and deployment

### Acceptance Criteria
- ✅ **AC1**: Score display and skip counter never overlap on any screen size
- ✅ **AC2**: Header layout remains responsive and mobile-optimized
- ✅ **AC3**: Skip counter only shows when skip limit > 0 (existing behavior)
- ✅ **AC4**: All touch targets maintain minimum 44px size
- ✅ **AC5**: Layout works in both portrait and landscape orientations
- ✅ **AC6**: No regressions to existing mobile viewport optimizations

## Executor's Feedback or Assistance Requests

*This section will be updated by the Executor during implementation.*

## Technical Implementation Notes

*This section will be updated with specific technical details during implementation.*

## Lessons Learned

*This section will be updated with any insights or challenges discovered during implementation.* 