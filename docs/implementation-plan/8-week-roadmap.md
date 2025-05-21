# Words on Phone – Roadmap (8 Phases)

**Branch Name:** `feature/8-week-roadmap`

---

## Background and Motivation

Words on Phone is a mobile-first party game inspired by the classic "catch-phrase" mechanics.  The objective of this roadmap is to deliver a production-ready, offline-capable Progressive Web App (PWA) through **eight logical development phases**, wrapping it with Capacitor for iOS distribution.  This document replaces the original outline by adding a configurable **skip-limit** feature and clarifying phase deliverables, success criteria, and risk mitigation.

## Key Challenges and Analysis

1. Accurate, low-latency timer and buzzer that work in PWAs and Capacitor WebViews.
2. Managing OpenAI API usage limits and cost while keeping gameplay fresh.
3. Ensuring IndexedDB reliability across browser upgrades.
4. Implementing an **optional skip-limit** that:
   - Persists per-round state.
   - Resets upon a correct answer.
   - Can be configured (0 = unlimited, 1-5 = fixed cap).
   - Provides real-time UI feedback and analytics.
5. Solo-developer bandwidth: keep tasks small and test-driven.

## High-level Task Breakdown

> Each task lists measurable success criteria.  The Executor must not check off a task until all criteria are met, tests are green, and documentation is updated.

### Phase 1 – Project Bootstrap
- [ ] Scaffold with `npm create @vite-pwa/pwa` (React + TypeScript template).
- [ ] Add ESLint, Prettier, Husky pre-commit hook, Vitest, and GitHub Actions CI (`vitest run`).
- [ ] Commit `.cursor/rules` enforcing "write-failing-test-first".

**Success criteria**
1. `npm run lint && npm run test` exit 0.
2. First CI run is green.

---

### Phase 2 – Phrase Engine & Core Loop (incl. Basic Skip Handling)
- [ ] Import the 7 000-phrase JSON → `src/data/phrases.ts`.
- [ ] Implement Fisher-Yates shuffle + no-repeat cursor; unit-tests cover edge cases.
- [ ] Create minimal game screen: current phrase to clue-giver, countdown placeholder, **Pass** button.
- [ ] Persist game state with Zustand.
- [ ] Add simple skip counter in state (unlimited for now) to lay groundwork for future cap logic.
- [ ] Add "How to Play" modal accessible via a ℹ️ icon describing **Setup**, **Turn-by-turn play**, **End of round & scoring**, and **Optional settings & house rules** exactly as per the spec below.

**Success criteria**
1. User can start a round and tap *Pass* to advance phrases without repeats.
2. State survives hot reload.
3. Clicking the ℹ️ icon opens the modal showing the full rules text and the modal is scrollable on mobile.

---

### Phase 3 – Timer, Audio, Offline
- [ ] High-precision timer using `performance.now()` + `requestAnimationFrame`.
- [ ] Buzzer sounds via Web Audio API; preload in Service Worker cache.
- [ ] Configure Workbox in `vite.config.ts` to precache static assets and audio.
- [ ] Add Cypress smoke test: visit `/`, start a round, timer counts down.

**Success criteria**
1. Timer drifts < ±50 ms over 60 s in unit test.
2. App functions with network disabled (Chrome DevTools offline).

---

### Phase 4 – Options, **Skip-Limit**, and Stats
- [ ] Build Settings panel:
  - Timer slider (30-90 s).
  - Buzzer picker.
  - **Skip-limit selector** (`0 = unlimited`, `1-5 skips`).
- [ ] Extend Zustand store with `skipLimit` and per-round `skipsRemaining`.
- [ ] Disable/grey the **Pass** button when `skipsRemaining === 0`.
- [ ] Show small UI badge "Skips left: N".
- [ ] Persist settings via `persist` middleware using `indexedDBStorage` adaptor.
- [ ] Track per-phrase stats `{ phraseId, seen, success, fail, avgMs }`.
- [ ] Emit Firebase events: `round_start`, `phrase_success`, `phrase_timeout`, **`skip_limit_reached`**.
- [ ] Unit & integration tests: verify pass disabled after limit, re-enabled after correct answer.
- [ ] Add optional score tracker overlay (not enforced) so teams can tally points; display reminder that app does not enforce score limit.

**Success criteria**
1. Setting skip limit in Options immediately affects gameplay.
2. Cypress test proves *Pass* button locks after limit.
3. Event shows in Firebase DebugView.
4. Rules modal remains accessible from game and settings screens.

---

### Phase 5 – OpenAI Phrase-Fetcher
- [ ] Web Worker polling every 4 h → OpenAI Chat Completions; abort if daily quota ≥ 1000.
- [ ] Deduplicate by `phraseId` before `indexedDB.bulkAdd`.
- [ ] Vitest coverage for throttle logic; mock fetcher.

**Success criteria**
1. Worker skipped when `Date.now() - lastFetch < 4 h`.
2. New phrases appear in DB and shuffle pool.

---

### Phase 6 – Capacitor & iOS
- [ ] `npx cap add ios`; configure `capacitor.config.ts` → `/dist`.
- [ ] Install `@capacitor/haptics`; trigger haptic tick on timeout.
- [ ] Build & upload TestFlight build.

**Success criteria**
1. All smoke tests pass in iOS Simulator.
2. TestFlight build available to testers.

---

### Phase 7 – QA, Performance, Accessibility
- [ ] Run Firebase Test Lab; fix any crashes.
- [ ] Lighthouse scores ≥ 90 (PWA & Performance).
- [ ] Add `aria-*` labels and `prefers-color-scheme` dark-mode styles.

**Success criteria**
1. Lighthouse report attached to PR.
2. No accessibility violations in Cypress + axe.

---

### Phase 8 – Launch
- [ ] Fill App Privacy form (no tracking; anonymised analytics).
- [ ] Prepare 6.7-inch & 5.5-inch screenshots + promo text.
- [ ] Submit for App Store review.

**Success criteria**
1. App passes App Store review without rejection.

---

## Project Status Board

### Phases / Major Milestones
- [x] Phase 1 – Project Bootstrap (done: scaffold, lint, test, CI, and Cursor rules committed)
- [x] Phase 2 – Phrase Engine & Core Loop
- [ ] Phase 3 – Timer, Audio, Offline
- [ ] Phase 4 – Options, Skip-Limit, and Stats
- [ ] Phase 5 – OpenAI Phrase-Fetcher
- [ ] Phase 6 – Capacitor & iOS
- [ ] Phase 7 – QA, Performance, Accessibility
- [ ] Phase 8 – Launch

> Update each checklist item to **in-progress**, **partially complete**, or **done** as work proceeds.

## Executor's Feedback or Assistance Requests

- Store logic test implemented as store.test.ts. Running test suite to verify correctness and coverage. User should review test results before marking this task as complete.

## Lessons Learned

_(Append lessons in the format `