# Mobile Gameplay Screen UX Optimization

> **Branch Name:** `mobile-gameplay-screen-ux`

## Background and Motivation

Players on mobile devices have reported that the gameplay screen occasionally scrolls or hides critical UI elements (timer, score, action buttons) behind the browser chrome or OS safe-area insets. This breaks the fast-paced experience because users must scroll or cannot see the controls. We need to guarantee that **all game elements are always visible** in both PWA (Standalone) and regular mobile browsers, across iOS Safari and Android Chrome, in portrait and landscape modes.

## Key Challenges and Analysis

1. **Viewport Height Variations**
   - Mobile browsers deduct address bar & tab bar space from `100vh` only after the first scroll, leading to unintended overflow. New CSS units (`svh`, `lvh`, `dvh`) and `calc()` with `env(safe-area-inset-*)` must be leveraged.
2. **Safe-Area Insets (Notch & Home Indicator)**
   - Devices with notches / home indicators require padding via `constant(safe-area-inset-bottom)` / `env()` to prevent clipped buttons.
3. **Dynamic Content Size**
   - Long phrases can increase the height of the phrase container. We must use responsive typography (`clamp`) and allow the text to wrap while still respecting the fixed viewport height.
4. **Orientation Changes**
   - The layout should gracefully re-flow when switching between portrait and landscape without introducing scroll.
5. **Cross-Browser Support**
   - Ensure fallback for browsers that do not yet support the new viewport units (iOS 15 Safari, older Android). Progressive enhancement is required.
6. **Testing Strategy**
   - Automated Cypress tests for common mobile viewports (iPhone SE, iPhone 14 Pro, Pixel 5) asserting zero vertical scroll.
   - Manual QA using BrowserStack / real devices.

## High-level Task Breakdown

1. **Create feature branch**
   - Checkout from `main` and push `mobile-gameplay-screen-ux`.
   - *Success:* Branch exists on GitHub with initial README update.
2. **Baseline Reproduction & Metrics**
   - Record current scroll height & screenshots on target devices (DevTools simulation).
   - Add them to plan for reference.
   - *Success:* Baseline documented in `./assets/baseline/`.
3. **Update Layout Container**
   - Replace `height: 100vh` with `min-height: 100dvh` (fallback: `min-height: 100vh`) on `.game-screen`.
   - Use CSS custom property `--safe-bottom` = `env(safe-area-inset-bottom, 0px)` and apply `padding-bottom`.
   - *Success:* No scroll in portrait on iPhone 14 Pro Safari.
4. **Responsive Header & Footer Sizing**
   - Convert fixed pixel gaps (`20px`) to `clamp()` ranges.
   - Ensure buttons shrink on narrow screens (`font-size`, `padding` via `clamp`).
   - *Success:* Controls fit without truncation on iPhone SE.
5. **Phrase Container Flex Behaviour**
   - Use CSS Grid (rows: auto 1fr auto) or Flex with `flex: 0 0 auto` for header/actions and `flex: 1 1 auto` for phrase.
   - Apply `overflow-wrap: anywhere` and responsive font.
   - *Success:* Long phrase wraps but page height stays <= viewport.
6. **Orientation Styles**
   - Add media queries for `(orientation: landscape)` to adjust button layout (row instead of column).
   - *Success:* Landscape still shows all elements without scroll on iPhone 14 Pro Max.
7. **Fallback for Unsupported Browsers**
   - Feature-detect `100dvh` with `@supports(height: 100dvh)`; fall back to JS resize listener if needed.
   - *Success:* Android Chrome 96 still unscrollable.
8. **Automated Cypress Tests**
   - Write test that loads `/` at each viewport and asserts `cy.window().its('innerHeight').then(h => cy.document().its('documentElement.scrollHeight').should('be.lte', h + 1))`.
   - *Success:* Tests pass in CI.
9. **Manual QA & Lighthouse Verification**
   - Run Lighthouse mobile category; verify no regressions.
   - *Success:* Accessibility 95+ and no layout shift warnings.
10. **Update Docs & Changelog**
    - Document CSS techniques in `GUIDELINES.md`.
    - *Success:* PR description includes screenshots and passes review.
11. **Merge & Deploy**
    - Rebase/squash merge after approvals.
    - *Success:* Production site shows fixed layout.

## Project Status Board

- [ ] Task 1 – Create feature branch `mobile-gameplay-screen-ux`
- [ ] Task 2 – Baseline reproduction & metrics
- [ ] Task 3 – Update layout container to `100dvh`
- [ ] Task 4 – Responsive header & footer sizing
- [ ] Task 5 – Phrase container flex/grid adjustments
- [ ] Task 6 – Orientation styles
- [ ] Task 7 – Fallback for unsupported browsers
- [ ] Task 8 – Automated Cypress tests
- [ ] Task 9 – Manual QA & Lighthouse verification
- [ ] Task 10 – Docs & changelog update
- [ ] Task 11 – Merge & deploy to production

## Current Status / Progress Tracking

Initial planning phase. No development work started.

## Executor's Feedback or Assistance Requests

_None yet._

--- 