# Accelerating Beep "Hot Potato" Timer System

**Branch Name:** `feature/accelerating-beep-timer`

---

## Background and Motivation

Research shows that accelerating-beep hot-potato timers are a well-established pattern in Catch Phrase-style games that significantly increase player engagement and tension. The original Catch Phrase disc features "a timer that beeps at an increasing rate before randomly buzzing," and this pattern is consistently found across successful party games.

**Key Research Findings:**
- Hasbro's electronic units use escalating audio cues (15s reminder → frantic buzz at zero)
- STEM educational activities teach "increasingly fast and high-pitched sounds as the bomb counts down"
- Mobile party-timer apps receive user requests for "accelerating beep to increase pressure"
- Reviews consistently note that fast-ticking end phases create "frenzied" and exciting gameplay

This feature will implement a dynamic countdown-beep system that mirrors established Catch Phrase behavior, raising tension by fading in audible beeps as the hidden timer nears zero, with intervals shrinking smoothly until the final buzzer.

## Key Challenges and Analysis

1. **Precise Audio Timing**: Web Audio API scheduling must be frame-perfect to avoid perceptible drift in beep intervals
2. **iOS Audio Latency**: Mobile Safari has inherent audio latency that must be compensated for smooth beep sequences  
3. **Performance Optimization**: Beep scheduler must add < 0.1ms per animation frame to avoid impacting game performance
4. **Cross-Platform Compatibility**: Ensure consistent behavior across Chrome, Safari, Firefox on both desktop and mobile
5. **Accessibility Considerations**: Provide visual alternatives and respect "Reduce Motion" preferences
6. **Background Tab Handling**: Maintain accurate timing when app is backgrounded/foregrounded
7. **Integration Complexity**: Seamlessly integrate with existing timer modes (fixed, random, hidden, visible)

## High-level Task Breakdown

> Each task includes specific, measurable success criteria. Tasks must be completed sequentially with full testing before proceeding.

### Task 1: Core Timer Extension & Utilities
**Objective**: Extend existing timer infrastructure to support millisecond-precision beep scheduling

**Subtasks:**
- [x] Modify `useCountdown` hook to expose `remainingMs` on each `requestAnimationFrame` cycle
- [x] Implement `lerp(a, b, t)` linear interpolation utility function
- [x] Add `clamp(value, min, max)` utility function for safe boundary handling
- [x] Create `getBeepInterval(remainingMs, config)` calculation function
- [x] Unit tests covering interpolation accuracy and boundary conditions

**Success Criteria:**
1. `remainingMs` updates every animation frame with ±1ms accuracy
2. `lerp()` produces smooth transitions verified by mathematical assertions
3. Beep interval calculation handles edge cases (negative time, zero duration, etc.)
4. All utility functions have 100% test coverage

**Time Estimate**: 4-6 hours

---

### Task 2: Beep Ramp Scheduler Hook
**Objective**: Create dedicated hook for managing accelerating beep timing logic

**Subtasks:**
- [x] Create `useBeepRamp(remainingMs, beepConfig)` hook
- [x] Implement beep interval easing: `t = 1 - remainingMs / rampStartMs; interval = lerp(firstInterval, finalInterval, clamp(t, 0, 1))`
- [x] Track `nextBeepAt` timestamp using `performance.now()` for precision
- [x] Add state management for `isRampActive`, `beepCount`, `lastBeepTime`
- [x] Implement beep triggering logic: fire when `now >= nextBeepAt`
- [x] Unit tests with fake timers simulating full 60s countdown

**Success Criteria:**
1. Beep intervals decrease monotonically from 1000ms to 150ms over 20s
2. No beeps fire before ramp start time (e.g., with 20s remaining)
3. Timing drift stays within ±20ms tolerance over full countdown simulation
4. Hook properly resets between game rounds
5. Edge case handling: short rounds (< rampStart) begin ramping immediately

**Time Estimate**: 6-8 hours

---

### Task 3: Enhanced Audio System
**Objective**: Extend audio capabilities for rapid-fire beep sequences without overlap or latency

**Subtasks:**
- [ ] Create distinct beep sound generation in `useAudio` hook (short, sharp 200ms tone)
- [ ] Implement non-overlapping beep playback (stop previous beep before starting new one)
- [ ] Add beep volume control independent of buzzer volume
- [ ] Optimize for iOS latency: pre-create audio buffers, use single-source technique
- [ ] Add Service Worker pre-caching for beep audio assets
- [ ] Integration testing: rapid-fire beep sequences without audio glitches

**Success Criteria:**
1. Beep sound is distinct from round-end buzzer (higher pitch, shorter duration)
2. No audio overlap: each new beep cleanly stops the previous one
3. iOS audio latency < 50ms measured on actual device
4. Beep volume independently controllable from buzzer volume
5. Offline functionality: beeps work when network disabled
6. No memory leaks during extended beep sequences

**Time Estimate**: 6-8 hours

---

### Task 4: Settings Integration & Persistence
**Objective**: Add user controls for beep configuration with proper state management

**Subtasks:**
- [ ] Extend Zustand store schema with beep configuration:
  - `enableBeepRamp: boolean` (default: true)
  - `beepRampStart: number` (default: 20, range: 10-40)
  - `beepFirstInterval: number` (default: 1000, range: 400-1500) 
  - `beepFinalInterval: number` (default: 150, range: 80-400)
  - `beepVolume: number` (default: 0.6, range: 0-1)
- [ ] Add settings UI in MenuScreen with sliders and toggles
- [ ] Implement IndexedDB persistence using existing `persist` middleware
- [ ] Add setting validation and boundary enforcement
- [ ] Unit tests for settings persistence and validation

**Success Criteria:**
1. All beep settings persist across browser sessions
2. Settings UI provides clear feedback on current values and ranges
3. Invalid settings are automatically clamped to valid ranges
4. Settings changes take effect immediately (no app restart required)
5. Default settings provide optimal user experience out-of-box

**Time Estimate**: 4-6 hours

---

### Task 5: Game Integration & Lifecycle Management
**Objective**: Integrate beep ramp into GameScreen with proper start/stop/pause handling

**Subtasks:**
- [ ] Integrate `useBeepRamp` hook into GameScreen component
- [ ] Handle game lifecycle events: start (reset beep state), pause (stop beeps), resume (recalculate timing)
- [ ] Manage tab visibility changes: pause beeps when backgrounded, resume accurately on focus
- [ ] Handle edge cases: game end before ramp starts, immediate game restart
- [ ] Synchronize beep playback with actual beep timing calculations
- [ ] Integration testing: full game lifecycle with beep sequences

**Success Criteria:**
1. Beep ramp starts automatically at configured time remaining
2. Game pause immediately stops beeps; resume recalculates timing accurately
3. Tab backgrounding/foregrounding maintains timing accuracy (±50ms)
4. Game end immediately stops all beep activity
5. Rapid game restart doesn't cause audio overlap or timing issues
6. Beep ramp respects all timer modes (fixed, random, hidden, visible)

**Time Estimate**: 6-8 hours

---

### Task 6: Accessibility & Visual Feedback
**Objective**: Provide accessible alternatives and respect user preferences

**Subtasks:**
- [ ] Add "Visual Pulse" option: screen edge flash synchronized with beeps
- [ ] Implement `prefers-reduced-motion` detection and respect user preference
- [ ] Add screen reader announcements for beep ramp start ("Countdown accelerating")
- [ ] Ensure beep settings are keyboard accessible
- [ ] Add ARIA labels for all beep-related UI elements
- [ ] Test with VoiceOver (iOS) and screen reader compatibility

**Success Criteria:**
1. Visual pulse flashes screen edges in sync with audio beeps (±10ms)
2. Users with "Reduce Motion" enabled see no visual effects but still hear beeps
3. Screen readers announce beep ramp activation appropriately
4. All beep settings can be configured using keyboard navigation only
5. Color contrast and visual indicators meet WCAG 2.1 AA standards
6. VoiceOver testing confirms proper accessibility implementation

**Time Estimate**: 4-6 hours

---

### Task 7: Haptic Feedback & Mobile Optimization
**Objective**: Enhance mobile experience with haptic feedback and performance optimization

**Subtasks:**
- [ ] Integrate Capacitor Haptics: subtle pulse on each beep (mobile only)
- [ ] Implement graceful degradation for devices without haptic support
- [ ] Performance optimization: profile beep scheduler CPU/memory usage
- [ ] Mobile-specific audio testing: verify performance on mid-range devices
- [ ] Battery usage optimization: minimize background processing
- [ ] Test on actual iOS/Android devices for real-world performance

**Success Criteria:**
1. Haptic pulses synchronize with beeps on supported mobile devices
2. Graceful fallback when haptics unavailable (no errors or warnings)
3. Beep scheduler adds < 0.1ms per animation frame (measured with performance profiling)
4. Smooth performance on iPhone 12 and equivalent Android devices
5. No significant battery drain during extended gameplay sessions
6. Audio latency acceptable on real mobile hardware (< 50ms)

**Time Estimate**: 4-6 hours

---

### Task 8: Analytics & Monitoring
**Objective**: Track feature usage and performance for optimization and user insights

**Subtasks:**
- [ ] Add Firebase events: `beep_ramp_start`, `beep_ramp_complete`, `beep_settings_changed`
- [ ] Track beep timing accuracy metrics for performance monitoring
- [ ] Monitor audio buffer loading success rates
- [ ] Capture user engagement metrics: games with/without beeps enabled
- [ ] Add performance monitoring: beep scheduler execution time
- [ ] Dashboard monitoring for feature adoption and performance

**Success Criteria:**
1. All beep-related events properly logged to Firebase with correct parameters
2. Timing accuracy data allows identification of performance issues
3. User engagement metrics show feature impact on gameplay experience
4. Performance monitoring catches any degradation in beep timing
5. Analytics dashboard provides actionable insights for feature optimization

**Time Estimate**: 3-4 hours

---

### Task 9: Comprehensive Testing & Quality Assurance
**Objective**: Ensure robust, reliable functionality across all environments and edge cases

**Subtasks:**
- [ ] Unit tests: Vitest fake-timers, simulate full 60s game, verify beep timing (±20ms tolerance)
- [ ] Integration tests: beep ramp with all timer modes, settings combinations
- [ ] E2E tests: Cypress audio event recording, verify monotonic interval decrease
- [ ] Performance tests: measure CPU/memory impact during beep sequences
- [ ] Cross-browser testing: Chrome, Safari, Firefox (desktop + mobile)
- [ ] Accessibility testing: screen reader compatibility, visual pulse accuracy
- [ ] Device testing: iOS, Android real devices, various screen sizes

**Success Criteria:**
1. 100% unit test coverage for beep-related functions and edge cases
2. Integration tests pass for all timer mode combinations
3. E2E tests verify proper audio event sequencing in browser environment
4. Performance benchmarks meet < 0.1ms per frame requirement
5. Cross-browser compatibility confirmed (no audio glitches or timing issues)
6. Accessibility audit passes with no violations
7. Real device testing confirms acceptable performance and audio quality

**Time Estimate**: 8-10 hours

---

### Task 10: Documentation & User Experience
**Objective**: Provide clear documentation and optimal user experience guidance

**Subtasks:**
- [ ] Update "How to Play" modal with beep ramp explanation
- [ ] Add tooltips/help text for beep settings in options panel
- [ ] Update README with technical documentation for beep feature
- [ ] Create user guide: optimal beep settings for different group sizes/game styles
- [ ] Add inline help: explain why beep ramp enhances gameplay experience
- [ ] Video/animation demonstrating beep ramp feature

**Success Criteria:**
1. "How to Play" clearly explains beep ramp feature and settings
2. Settings tooltips provide helpful guidance without cluttering UI
3. Technical documentation enables future developers to understand and modify feature
4. User guide helps players optimize settings for their preferred game style
5. Feature explanation increases user adoption and understanding

**Time Estimate**: 3-4 hours

---

## Project Status Board

### Task Progress Tracking
- [x] **Task 1**: Core Timer Extension & Utilities ✅
  - [x] Modify useCountdown for remainingMs exposure (useTimer already exposes timeRemainingMs)
  - [x] Implement lerp/clamp utility functions  
  - [x] Create beep interval calculation function
  - [x] Write comprehensive unit tests (24 tests, all passing)
  
- [x] **Task 2**: Beep Ramp Scheduler Hook ✅
  - [x] Create useBeepRamp hook with configuration
  - [x] Implement interval easing algorithm
  - [x] Add timing state management
  - [x] Write timing accuracy tests (19 tests, all passing)
  
- [ ] **Task 3**: Enhanced Audio System
  - [ ] Create distinct beep sound generation
  - [ ] Implement non-overlapping playback
  - [ ] Optimize for iOS audio latency
  - [ ] Add Service Worker caching
  
- [ ] **Task 4**: Settings Integration & Persistence
  - [ ] Extend Zustand store schema
  - [ ] Build settings UI components
  - [ ] Implement IndexedDB persistence
  - [ ] Add validation and boundary checks
  
- [ ] **Task 5**: Game Integration & Lifecycle
  - [ ] Integrate beep ramp into GameScreen
  - [ ] Handle game lifecycle events
  - [ ] Manage tab visibility changes
  - [ ] Test edge cases and rapid transitions
  
- [ ] **Task 6**: Accessibility & Visual Feedback
  - [ ] Implement visual pulse option
  - [ ] Add reduced motion support
  - [ ] Ensure screen reader compatibility
  - [ ] Test keyboard accessibility
  
- [ ] **Task 7**: Haptic Feedback & Mobile Optimization
  - [ ] Integrate Capacitor Haptics
  - [ ] Optimize mobile performance
  - [ ] Test on real devices
  - [ ] Monitor battery impact
  
- [ ] **Task 8**: Analytics & Monitoring
  - [ ] Add Firebase analytics events
  - [ ] Implement performance monitoring
  - [ ] Create analytics dashboard views
  - [ ] Track user engagement metrics
  
- [ ] **Task 9**: Comprehensive Testing & QA
  - [ ] Write unit tests with fake timers
  - [ ] Create integration test suite
  - [ ] Implement E2E audio testing
  - [ ] Conduct cross-browser testing
  
- [ ] **Task 10**: Documentation & User Experience
  - [ ] Update help documentation
  - [ ] Add UI tooltips and guidance
  - [ ] Create technical documentation
  - [ ] Produce user experience guide

### Current Status / Progress Tracking
- **Phase**: Task 2 Complete ✅
- **Next**: Task 3: Enhanced Audio System - Starting implementation

### Executor's Feedback or Assistance Requests

**Task 1 Complete (2025-01-27):** ✅ Successfully implemented core timer extension and utility functions.

**Implementation Summary:**
- Created `beepUtils.ts` with mathematical functions for beep interval calculation
- Implemented `lerp()` for smooth linear interpolation between beep intervals
- Added `clamp()` for safe boundary handling of timing values
- Created `getBeepInterval()` that smoothly transitions from 1000ms to 150ms intervals
- Built `shouldBeepRampBeActive()` helper for state management
- Verified existing `useTimer` hook already exposes `timeRemainingMs` for millisecond precision
- Created comprehensive test suite with 24 tests covering all edge cases and integration scenarios

**Technical Validation:**
- All utility functions handle edge cases correctly (zero time, negative values, boundary conditions)
- Mathematical interpolation produces monotonically decreasing intervals as required
- Short game scenarios (duration < ramp start) handled properly with immediate ramping
- Integration tests verify typical 60s game behavior matches specifications

**Task 2 Complete (2025-01-27):** ✅ Successfully implemented beep ramp scheduler hook.

**Implementation Summary:**
- Created `useBeepRamp` hook with comprehensive state management
- Implemented precise timing using `performance.now()` and `requestAnimationFrame`
- Added start/stop/pause/resume lifecycle methods for game integration
- Built interval easing algorithm that smoothly decreases beep intervals
- Handled edge cases: disabled config, short rounds, zero time, multiple starts
- Created comprehensive test suite with 19 tests covering all functionality

**Technical Validation:**
- Hook properly activates ramp when remaining time reaches threshold
- Beep intervals decrease monotonically as expected (1000ms → 150ms)
- State management works correctly with pause/resume functionality
- Animation frame cleanup prevents memory leaks
- All timing accuracy tests pass with fake timer simulation

**Next Steps:** Beginning Task 3 - enhancing the audio system to generate distinct beep sounds and handle rapid-fire playback without overlap or latency issues.

## Lessons Learned
*This section will be updated as implementation proceeds*

---

## Success Metrics & Acceptance Criteria

**Technical Requirements:**
1. Beep ramp activates in final 20s with smooth interval decrease from 1000ms to 150ms
2. Audio latency < 50ms on iOS devices; beeps synchronized with calculated timestamps  
3. Settings persist across sessions; all configuration options work as specified
4. Performance impact < 0.1ms per frame; no audio glitches or overlapping beeps
5. Cross-browser compatibility verified on Chrome, Safari, Firefox (desktop + mobile)

**User Experience Requirements:**
6. Accessibility features work correctly; respects "Reduce Motion" preferences
7. All tests pass: unit (timing accuracy), integration (timer modes), E2E (audio events)
8. Feature integrates seamlessly with existing timer modes and settings

**Business/Analytics Requirements:**
9. 95% of play sessions show at least 4 ramp beeps before final buzzer (Firebase analytics)
10. Player feedback indicates ≥80% "adds excitement" agreement in user testing

**Performance Budget:**
- Audio buffers: ≤ 120 kB total
- CPU impact: < 0.1ms per animation frame
- Memory: No leaks during extended gameplay
- Battery: Minimal impact on mobile devices 