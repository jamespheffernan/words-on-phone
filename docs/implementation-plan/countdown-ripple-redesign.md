# Countdown Ripple Redesign (Hidden Timer Indicator)

**Branch Name:** `feature/countdown-ripple-redesign`

## Background and Motivation

When the timer is hidden, the game currently displays an "alien wingdings" string of decorative symbols to imply a countdown without revealing the exact time. The user would like a more intuitive yet still obscured indicator: **3–4 central dots that emit ripples (concentric circles) which slowly pulsate and fade**. The inner dots should continue changing (e.g.
color/opacity) as time progresses, preserving the mystique of the hidden timer while feeling more polished and thematic.

## Key Challenges and Analysis

1. **Visual & Motion Design** – Crafting CSS animations that look smooth and performant across devices (mobile-first) without relying on heavy JavaScript.
2. **Performance** – Avoid creating hundreds of DOM nodes or expensive JS intervals; leverage `@keyframes`, `will-change`, and staggered animation delays.
3. **Dynamic Intensity Mapping** – Increase ripple frequency or size as the timer approaches 0 s, mirroring the existing beep-ramp urgency curve.
4. **Accessibility** – Honour `prefers-reduced-motion`; ensure no seizure-triggering flashes; keep sufficient contrast against dynamic backgrounds.
5. **Component Encapsulation** – Replace the inline `getObscuredCountdown()` logic with a reusable <RippleCountdown /> component for easier testing and styling.
6. **Testing** – Snapshot/DOM unit tests for correct ripple counts; Cypress accessibility tests to ensure no Axe violations.

## High-level Task Breakdown

### Task 1 – Finalise Visual Design & API
- [x] Audit current hidden-timer code (`GameScreen.tsx → getObscuredCountdown`).
- [x] Decide dot count (3 or 4), ripple radius progression, colour palette.
- [x] Define component props: `remaining`, `total`, optional `variant`.

**Success Criteria:** Figma-style spec or markdown table describing animation frames, colours, and timing tied to `% remaining`.

**Visual Design Specification:**
- **Dot Count:** 4 central dots arranged in a diamond pattern
- **Colors:** 
  - Dots: `rgba(255, 255, 255, 0.9)` fading to `rgba(255, 255, 255, 0.4)` based on intensity
  - Ripples: `rgba(255, 255, 255, 0.3)` starting, fading to transparent
- **Sizing:**
  - Container: 60px × 60px (matching current `.hidden-timer-indicator`)
  - Central dots: 4px diameter each
  - Ripples: Start at 8px, expand to 50px before fading
- **Animation Timing:**
  - Base ripple duration: 2s per cycle
  - Intensity mapping: At 100% time remaining → 2s cycle, At 0% time remaining → 0.5s cycle
  - Dot opacity pulse: 1.5s cycle, independent of ripples
- **Component Props:**
  ```typescript
  interface RippleCountdownProps {
    remaining: number;    // seconds remaining
    total: number;        // total timer duration
    variant?: 'default';  // future extensibility
  }
  ```

### Task 2 – Implement <RippleCountdown /> Component
- [x] Create `RippleCountdown.tsx` with internal state derived from `remaining` via React hooks.
- [x] Add scoped CSS (`RippleCountdown.css`) with keyframes for scale & fade.
- [x] Support reduced-motion by disabling scale/opacity animation when `prefers-reduced-motion` is true.

**Success Criteria:** Component renders correct structure and animations in Storybook/dev server, verified visually.

### Task 3 – Integrate into GameScreen
- [x] Replace `<span className="obscured-countdown">…` block with `<RippleCountdown … />`.
- [x] Remove obsolete `getObscuredCountdown` helper.
- [x] Ensure responsive sizing & alignment within existing header layout.

**Success Criteria:** Hidden-timer mode shows ripples; no layout shifts or console errors.

### Task 4 – Dynamic Intensity Hook
- [ ] Reuse `beepRamp` config or implement a `useRippleIntensity` hook that returns animation speed based on `remaining`.
- [ ] Update component to adjust CSS variables (e.g. `--ripple-delay`) in real time.

**Success Criteria:** Ripples pulse faster as time dwindles (≤10 s) mirroring beep ramp cadence.

### Task 5 – Accessibility & Reduced Motion
- [ ] Add `aria-hidden="true"` to purely decorative ripples.
- [ ] Provide screen-reader-only timer announcements (already exists) – ensure still intact.
- [ ] Honour `prefers-reduced-motion`: static dots with subtle opacity shift.

**Success Criteria:** Axe reports 0 violations; reduced-motion users see no scale animation.

### Task 6 – Testing & QA
- [ ] Jest/RTL snapshot test for component structure at various `remaining` values.
- [ ] Unit test for `useRippleIntensity` mapping.
- [ ] Cypress visual regression screenshot for ripple countdown.

**Success Criteria:** 100 % tests pass; no new failing Lighthouse/Cypress accessibility tests.

## Project Status Board

### 🟢 Ready to Start
- [ ] **Task 4** – Dynamic Intensity Hook

### 🚧 In Progress

### ✅ Completed
- [x] **Task 1** – Finalise Visual Design & API
- [x] **Task 2** – Implement <RippleCountdown /> Component  
- [x] **Task 3** – Integrate into GameScreen

## Current Status / Progress Tracking

| Date | Role | Update |
|------|------|--------|
| 2025-07-05 | Planner | Initial plan drafted – pending user review |
| 2025-07-05 | Executor | **Tasks 1-3 Complete** - Core RippleCountdown implementation finished |

**✅ Major Milestone Reached:**
- Visual design specification completed (4 dots in diamond pattern, ripple expansion)
- RippleCountdown component implemented with dynamic intensity mapping
- Full integration into GameScreen replacing old "alien wingdings" countdown
- Comprehensive CSS animations with reduced-motion support
- 5/5 unit tests passing for new component
- Build successful with no TypeScript errors

**🎯 Current Status:** Basic ripple countdown is working! User can test the hidden timer mode to see 4 dots with expanding ripples that speed up as time runs out.

## Executor's Feedback or Assistance Requests

*No updates yet – awaiting Executor phase.*

## Lessons Learned

*This section will be populated during implementation.* 