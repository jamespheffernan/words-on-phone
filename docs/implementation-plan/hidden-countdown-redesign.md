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

## Design Concept – "Drifting Ember Particles"

A dynamic field of tiny, translucent **ember-like particles** originates from the safe-area perimeter and **drifts toward the centre** of the screen. As the hidden timer advances:

- **Spawn rate & speed ramp-up:** Particles spawn slowly at first (≈2 emb/s) then accelerate to a rapid shower (≈15 emb/s) during the final five seconds.
- **Colour synergy with Background Warning System (BWS):** Embers inherit the real-time warning hue provided by `useBackgroundWarning` so both visual systems remain tonally consistent. When BWS elevates from _calm_ to _alert_, ember tint shifts from neutral (🩵 teal-white) to accent (🍊 orange-red).
- **Size & opacity modulation:** Each ember gradually fades/ shrinks as it approaches the centre, preventing clutter over phrase text.
- **GPU-friendly implementation:** A single `<canvas>` (or WebGL fallback) batches all particle draws, keeping compositing overhead minimal; movement uses `requestAnimationFrame` tied to device pixel ratio.

Benefits:

- **Peripheral urgency:** Motion stays at the edges—no overlap with interactive UI or phrase area.
- **Shared urgency language:** Re-uses existing beep-ramp interval to modulate spawn velocity, creating coherent multisensory feedback.
- **Thematic flair:** Embers fit the playful, energetic brand while elevating visual sophistication over the current ripple.

Accessibility / Motion Safety:

- Respect user "Reduce Motion" OS setting and in-app Accessibility toggle → switch to static pulsing vignette fallback when enabled.
- ARIA live region continues to announce key thresholds (start / 5 s remaining).

---

## Alternative Design Concepts (Archived for reference)

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

### 4. Closing Frame Glow

A subtle, hair-line **glow frame** sits just inside the safe-area edges. Over time the frame very slowly **scales inward** (`transform: scale()`) while its glow intensity and thickness increase. In the final 5 s the frame rapidly contracts and flashes, giving an unmistakable sense of pressure.

Pros:
- Single overlay element → minimal DOM/compositing cost.
- Scale transform is GPU-accelerated and does **not** trigger reflow.
- Clear "space is running out" metaphor that avoids covering central UI.

Cons:
- Continuous inward motion could distract highly sensitive users (mitigate with Accessibility toggle).
- Requires careful safe-area calculation to avoid clipping on notched devices.

### 5. Vignette Darkening

A barely-noticeable **vignette overlay** darkens the screen edges. The vignette's opacity and radius animate so the centre gradually "spotlights" the phrase while the surroundings dim. Final seconds feature a rapid pulsing dark-to-light vignette effect.

Pros:
- Zero new shapes; just an rgba radial-gradient background – extremely lightweight.
- Focuses player attention on phrase text in centre.
- Works in both light and dark themes by blending with underlying colours.

Cons:
- On very dark backgrounds the effect may be subtle; might need adaptive colour logic.
- Edge darkening could slightly reduce perceived contrast of peripheral UI icons.

We can include these in the research/prototyping task (Task 1) and select the most compelling option based on performance and user feedback.

---

## High-level Task Breakdown

0. **(Meta)** Create feature branch `feature/hidden-countdown-redesign` off `main`.

1. **Research & Prototype – Ember System**
   - Review performant JS/Canvas particle systems and mobile WebGL best practices.
   - Build proof-of-concept CodePen: adjustable spawn rate, colour binding, and motion curve.
   - Validate on iPhone SE & low-end Android → maintain 60 fps ≤5 ms scripting/frame.
   - **Success Criteria:** Ember prototype responsive to interval changes; no frame drops over 60 s run.

2. **Technical Research & Kick-off**
   - Survey high-performance JS/Canvas particle techniques (e.g., pixi.js, vanilla canvas batching).
   - Decide on implementation approach (`<canvas>` vs WebGL) and draft minimal demo _locally_ (no external user testing).
   - Document chosen architecture (particle pool, spawn scheduler, colour mapping to BWS).
   - **Success Criteria:** Approach documented; local demo renders embers lively at 60 fps on iPhone SE simulator.

3. **Component Implementation – `HiddenCountdownEmbers`**
   - React component fixed inside `GameScreen` with `<canvas>` covering safe-area.
   - Canvas draws particle pool; uses `devicePixelRatio` for crispness.
   - Expose `spawnRate`, `emberHue`, and `velocityCurve` props.
   - **Success Criteria:** Component renders without crashing; initial slow drift visible.

4. **Integrate with Timer & BWS**
   - Extend `useTimer` / `useBeepRamp` to output current **spawn multiplier**.
   - Tap `useBackgroundWarning` to obtain warning hue state (`calm` → `alert`).
   - Combine into props for `HiddenCountdownEmbers`.
   - **Success Criteria:** Ember activity aligns within ±50 ms of beep tick; colour matches BWS state transitions.

5. **Accessibility & Settings**
   - Add "Visual Timer Embers" toggle (default ON) in Settings → Accessibility.
   - Respect OS Reduce Motion flag; fall back to static vignette darkening.
   - Axe-core accessibility pass.
   - **Success Criteria:** No new violations; toggle behaves correctly.

6. **Responsive & Theming**
   - Test on light/dark themes, various safe-area insets, landscape orientation.
   - Ensure particles never occlude essential UI; adjust alpha blending.
   - **Success Criteria:** Embers remain peripheral and legible across viewports.

7. **Testing & QA**
   - Unit: utility functions (spawn rate calc, hue mapping) ≥90 % coverage.
   - Cypress: embers increase density over time; toggle hides canvas; colour syncs with BWS mock.
   - Manual QA checklist updated.
   - **Success Criteria:** All tests & CI pass; manual sign-off.

8. **Documentation & Cleanup**
   - Update README, in-app How-to-Play, and marketing screenshots.
   - Loom demo for stakeholders.
   - Squash commits → PR to `main`.
   - **Success Criteria:** PR approved & merged; Netlify deploy includes ember indicator.

---

## Acceptance Criteria

1. **Visual Elegance:** Ember indicator is polished, thematically on-brand, and favourably received in user testing.
2. **Non-Obtrusive:** Particles stay outside interactive zones and never obscure phrase text.
3. **Multisensory Sync:** Spawn velocity aligns within ±50 ms of beep ramp and colour matches Background Warning System state.
4. **Performance:** Maintains ≥55 fps on iPhone SE (Safari & Chrome) with ≤5 ms scripting time.
5. **Accessibility:** No new axe-core violations; Reduce Motion toggle functional; screen readers receive audible countdown cues.
6. **Configurability:** Users can enable/disable Ember indicator in Settings → Accessibility.
7. **Test Coverage:** ≥90 % unit coverage for new code; Cypress scenarios pass in CI.
8. **Documentation:** README, How-to-Play modal, and QA checklist all updated.
9. **Visual Elegance:** Ember indicator is polished, thematically on-brand, and passes internal design review.

---

## Project Status Board

- [ ] 0. Create feature branch `feature/hidden-countdown-redesign`
- [ ] 1. Research & Prototype – Ember System
- [ ] 2. Technical Research & Kick-off
- [ ] 3. Component Implementation – `HiddenCountdownEmbers`
- [ ] 4. Integrate with Timer & BWS
- [ ] 5. Accessibility & Settings
- [ ] 6. Responsive & Theming
- [ ] 7. Testing & QA
- [ ] 8. Documentation & Cleanup

---

## Executor's Feedback or Assistance Requests

_To be filled by Executor during implementation._

---

## Lessons Learned (Append as discovered) 