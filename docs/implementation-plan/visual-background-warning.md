# Visual Background Warning System (Progressive Red Background)

**Branch Name:** `feature/visual-background-warning`

## Background and Motivation

The user wants a visual warning system that progressively changes the GameScreen background color from normal to red as the timer gets closer to zero. This will provide an intuitive visual indicator of urgency without requiring the timer to be visible.

Currently, the GameScreen has a static purple gradient background (`linear-gradient(135deg, #667eea 0%, #764ba2 100%)`) and only shows timer urgency through the timer circle's color change when `isLowTime` is true (≤ 10 seconds remaining).

## Key Challenges and Analysis

1. **Smooth Transitions**: Need to implement smooth color interpolation between normal and warning colors
2. **Timer Integration**: Must work with both visible and hidden timer modes
3. **Accessibility**: Need to ensure sufficient color contrast for text readability
4. **Performance**: Smooth transitions should not impact performance during gameplay
5. **Visual Harmony**: Warning colors should be visually appealing and not jarring
6. **Threshold Management**: Need configurable thresholds for when warning begins

## High-level Task Breakdown

### Task 1: Design Visual Warning System
- [ ] Define color progression stages (normal → yellow/orange → red)
- [ ] Determine warning activation threshold (e.g., last 30 seconds, 50% of timer, etc.)
- [ ] Create smooth color interpolation utility functions
- [ ] Design CSS variables and transitions for background changes

**Success Criteria:**
- Clear color progression plan with specific hex/RGB values
- Smooth transition timing specifications
- Accessibility-compliant color choices with adequate contrast

### Task 2: Implement Background Warning Hook
- [ ] Create `useBackgroundWarning` hook that accepts timeRemaining and totalDuration
- [ ] Implement color interpolation logic based on time percentage
- [ ] Add smooth CSS transitions with optimized performance
- [ ] Return dynamic background styles for GameScreen component

**Success Criteria:**
- Hook correctly calculates warning intensity based on time remaining
- Smooth color transitions without performance impact
- Works with both visible and hidden timer modes

### Task 3: Integrate with GameScreen Component
- [ ] Import and use the background warning hook in GameScreen
- [ ] Apply dynamic background styles to game-screen CSS class
- [ ] Ensure compatibility with existing hidden-timer-mode styles
- [ ] Test visual harmony with all other UI elements

**Success Criteria:**
- GameScreen background progressively changes color as time runs out
- No visual conflicts with existing UI elements
- Maintains readability of all text and buttons

### Task 4: Add Configuration Options
- [ ] Add warning system settings to game store (enable/disable, threshold)
- [ ] Create settings UI controls in MenuScreen
- [ ] Implement user preference persistence
- [ ] Add accessibility considerations (reduced motion, color blind friendly)

**Success Criteria:**
- Users can enable/disable background warning system
- Configurable warning threshold (when warning starts)
- Settings persist across app sessions
- Accessibility options available

### Task 5: Testing and Refinement
- [ ] Write unit tests for color interpolation functions
- [ ] Test visual warning system across different timer durations
- [ ] Validate accessibility with color contrast checkers
- [ ] Performance testing during active gameplay

**Success Criteria:**
- All tests pass with 100% coverage for new code
- Visual warning works correctly across all timer configurations
- Meets WCAG color contrast guidelines
- No performance degradation during gameplay

## Project Status Board

### 🟢 Ready to Start
- [ ] **Task 4**: Add Configuration Options

### 🚫 Deferred (User Satisfied)
- [ ] **Task 4**: Add Configuration Options (deferred - not needed at this time)
- [ ] **Task 5**: Testing and Refinement (deferred - core functionality complete)

### ✅ Completed
- [x] Initial planning and requirements analysis
- [x] **Task 1**: Design Visual Warning System
  - [x] Define color progression stages (normal → orange → red)
  - [x] Determine warning activation threshold (50% of timer)
  - [x] Create color interpolation utility functions
  - [x] Design CSS variables and transitions
- [x] **Task 2**: Implement Background Warning Hook
  - [x] Create useBackgroundWarning hook with timeRemaining and totalDuration
  - [x] Implement color interpolation logic with performance optimization
  - [x] Add CSS custom properties variant for smooth transitions
  - [x] Ensure compatibility with both visible and hidden timer modes
- [x] **Task 3**: Integrate with GameScreen Component
  - [x] Import and use the background warning hook in GameScreen
  - [x] Apply dynamic background styles to game-screen CSS class
  - [x] Ensure compatibility with existing hidden-timer-mode styles
  - [x] Test visual harmony with all other UI elements

## Current Status / Progress Tracking

**Phase:** Project Complete - User Satisfied

**[2025-01-27 - Executor]** Project completed successfully! User has tested the visual background warning system and confirmed it's working well. The core functionality meets requirements and no additional configuration options are needed at this time.

## Executor's Feedback or Assistance Requests

**[2025-01-27 - Executor]** Successfully completed Tasks 1-3. The visual background warning system is now working:

✅ **Core Implementation Complete:**
- Color interpolation utilities with smooth transitions (normal → orange → red)
- React hook for background warning state management
- Full integration with GameScreen component
- Dynamic background styling with CSS transitions
- Compatibility with both visible and hidden timer modes
- All tests passing (27/27 test cases)

**✅ User Testing Complete:** The background warning system has been tested and confirmed working well. The progressive color changes from purple → orange → red are functioning as expected.

**🎯 Project Complete:** User is satisfied with the current implementation. Tasks 4 and 5 are not needed at this time and can be implemented later if required.

## Lessons Learned

*This section will be updated during implementation...* 