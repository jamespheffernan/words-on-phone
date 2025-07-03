# Hidden Countdown Redesign (V2)

## Metadata

- **Branch Name:** `feature/hidden-countdown-redesign`
- **Status:** 📝 **PLANNED**
- **Planner:** o3 AI (Planner role)
- **Executor:** o3 AI (Executor role once approved)
- **Related Files:** `words-on-phone-app/src/components/RippleCountdown.tsx`, `words-on-phone-app/src/components/GameScreen.tsx`, `words-on-phone-app/src/components/QuickPlayWidget.tsx`, `words-on-phone-app/src/hooks/useTimer.ts`, `words-on-phone-app/src/App.tsx`
- **Target Release:** Phase 9 polish (App Store submission readiness)

---

## Background and Motivation

The current hidden countdown implementation relies on a **ripple animation** that originates from the centre of the screen.  While functional, users have reported that:

1. **Aesthetic issues** – the ripple looks dated and lacks visual polish compared to the rest of the modern glassmorphic UI.
2. **Layout overlap** – on smaller devices the expanding ripple occasionally covers interactive controls (e.g., _Correct_, _Pass_) causing distraction.
3. **Clarity** – some players do not notice the subtle ripple early, defeating the purpose of conveying that *time is ticking away*.

We need a **beautiful, novel visualisation** that communicates a progressing (yet indeterminate) timer without explicit numbers, avoids control overlap, and elevates the overall aesthetic of the gameplay screen.

---

## Key Challenges and Analysis

| # | Challenge | Analysis |
|---|-----------|----------|
| 1 | **Non-intrusive placement** | Indicator must not obstruct gameplay buttons or phrase text. Edge-based or background-based visuals are preferred. |
| 2 | **Performance on mobile** | Animation should use GPU-accelerated CSS transforms / opacity only; avoid layout thrash or expensive JS intervals. |
| 3 | **Indeterminate length** | Actual remaining time (45-75 s random) is known internally; visual should hint at urgency without revealing exact amount. |
| 4 | **Accessibility** | Must maintain colour-contrast ratios and expose ARIA live region for screen-reader cue. Allow disable via Settings → Accessibility. |
| 5 | **Consistency with beep ramp** | Visual urgency should synchronise with the existing accelerating beep audio for cohesive UX. |

---

## Design Concept – "Pulsing Halo"

A thin, soft-glow **halo ring** around the safe-area edge that **pulses faster and brightens** as time progresses:

- **Early phase (calm):** Halo barely visible, slow 1 s fade-in/out.
- **Mid phase:** Pulse interval shortens, glow widens slightly, colour shifts towards accent colour.
- **Final seconds:** Rapid strobing (≈150 ms) in warning accent (e.g., 🍊 orange-red).

Benefits:

- Positioned entirely in the outer viewport margin → zero overlap with controls.
- Reinforces urgency in sync with beep ramp (reuse same interval computation).
- Visually striking yet minimal – leverages modern neon/glassmorphism aesthetic.

Fallback for OLED burn-in: alternate subtle radial gradient darkening option.

---

## Alternative Design Concepts

Below are additional ideas for visually conveying the hidden countdown. They share the same constraints (non-obtrusive, performant, accessible) but offer different aesthetics.  We can prototype several and user-test before committing to one.

### 1. Ambient Corner Orbs

A small translucent **orb** resides in each screen corner (4 total).  As time passes, the orbs:
- Grow slightly in size and opacity.
- Drift inward by a few pixels, simulating "closing in" on the gameplay area.
- Final 5 s: orbs flash synchronously every 150 ms in warning colour.

Pros:
- Never overlaps centre UI.
- Subtle peripheral vision cue.
- Easy CSS transform/opacity animation.

Cons:
- Four animated elements (higher compositing cost than single halo).
- May be less noticeable on very small screens.

### 2. Gradient Background Sweep

The entire background hosts a **radial gradient** whose inner colour slowly shifts from neutral to accent red as time elapses.
- Uses CSS `background-position` / `background-size` animation to create subtle "closing iris" effect.
- Syncs hue & saturation changes with beep-ramp for urgency.

Pros:
- Zero new DOM elements; just background style.
- Highly immersive; supports glassmorphism overlays.

Cons:
- Colour shift could clash with category colours or background warning system; needs careful palette selection.
- Harder to perceive in very bright conditions.

### 3. Perimeter Ticker Dashes

A thin border comprised of **12-16 small dashes** evenly spaced around the viewport (think clock ticks).
- Dashes illuminate sequentially (clockwise) at the beep interval creating motion.
- In later phase, multiple dashes light simultaneously producing sense of acceleration.

Pros:
- Provides directional motion cue without covering UI.
- Sequential lighting conveys progress intuitively (like a progress wheel but discreet).

Cons:
- Requires JavaScript to update which dash is active (still lightweight with `requestAnimationFrame`).
- More complex to ensure perfect safe-area alignment.

We can include these in the research/prototyping task (Task 1) and select the most compelling option based on performance and user feedback.

---

## High-level Task Breakdown

0. **(Meta)** Create feature branch `feature/hidden-countdown-redesign` off `main`.

1. **Research & Prototype**
   - Collect references of halo / border pulse animations (Dribbble, CSS Tricks).
   - Prototype pure-CSS halo animation in CodePen with variable pulse interval.
   - Validate performance on iPhone SE & low-end Android via Chrome DevTools → target <5 ms scripting/frame.
   - **Success Criteria:** Prototype runs 60 fps on mobile simulator with interval range 1000-150 ms.

2. **Component Implementation** – `HiddenCountdownHalo`
   - Create React component rendered inside `GameScreen` root using `position: fixed; inset: 0; pointer-events: none`.
   - Use `::before` pseudo-element for radial border; animate via CSS `keyframes` + inline `--pulse-interval` custom property supplied via props.
   - Sync `--pulse-interval` with existing `useBeepRamp` logic (share hook or context).
   - **Success Criteria:** Halo visible, responsive, no overlap issues on all viewports.

3. **Integrate with Timer Logic**
   - Extend `useTimer` (or create utility) to expose elapsed‐percent or current beep interval.
   - Pass interval to `HiddenCountdownHalo` to adjust pulse speed/colour.
   - Ensure hidden timer option toggles halo visibility (respect user setting).
   - **Success Criteria:** Halo reacts in real-time; final 5 s visibly intense.

4. **Accessibility & Settings**
   - Add Settings toggle "Visual Timer Indicator" (default ON).
   - Provide ARIA live region cue: announce "Timer started", "5 seconds remaining" when intensity threshold crossed.
   - Conduct axe-core accessibility tests.
   - **Success Criteria:** No new axe violations; indicator can be disabled.

5. **Responsive & Theming**
   - Test on dark/light mode, large desktop, iPad, iPhone SE.
   - Ensure safe-area insets handled (env(safe-area-inset-*)).
   - **Success Criteria:** Halo always within safe-area, scales with aspect ratio.

6. **Testing & QA**
   - Unit tests: interval mapping, component renders without crashing.
   - Cypress E2E: Halo present, pulses faster during game, hidden when timer visible option selected.
   - Manual QA checklist (baseline/assets/manual-qa-checklist.md) update.
   - **Success Criteria:** All tests pass, manual QA sign-off.

7. **Documentation & Cleanup**
   - Update README & in-app "How to Play" modal screenshots.
   - Record Loom demo for stakeholder review.
   - Squash commits → PR into `main`.
   - **Success Criteria:** PR approved & merged; Netlify deploy includes new halo indicator.

---

## Acceptance Criteria

1. **Visual Elegance:** Halo indicator is aesthetically pleasing, aligns with glassmorphism style, and is positively received in user review.
2. **Non-Obtrusive:** Indicator never covers phrase text or action buttons on any supported device sizes.
3. **Sync with Audio:** Pulse frequency aligns within ±50 ms of beep ramp interval throughout game.
4. **Performance:** Animation maintains 55-60 fps on iPhone SE (Chrome & Safari) with ≤5 ms scripting time.
5. **Accessibility:** No new axe-core violations; screen readers receive audible countdown cues.
6. **Configurability:** Users can enable/disable visual indicator in Settings → Accessibility.
7. **Test Coverage:** ≥90% unit test coverage for new component/hook; new Cypress tests pass in CI.
8. **Documentation:** README, "How to Play" modal, and QA checklist updated.

---

## Project Status Board

- [ ] 0. Create feature branch `feature/hidden-countdown-redesign`
- [ ] 1. Research & Prototype (halo animation)
- [ ] 2. Component Implementation – `HiddenCountdownHalo`
- [ ] 3. Integrate with Timer Logic
- [ ] 4. Accessibility & Settings
- [ ] 5. Responsive & Theming
- [ ] 6. Testing & QA
- [ ] 7. Documentation & Cleanup

---

## Executor's Feedback or Assistance Requests

_To be filled by Executor during implementation._

---

## Lessons Learned (Append as discovered) 