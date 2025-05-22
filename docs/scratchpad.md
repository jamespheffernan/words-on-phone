# Scratchpad

This scratchpad tracks the overarching vision, active implementation plans, and lessons learned while building **Words on Phone**.

## Active Implementation Plans

- [8-week-roadmap](implementation-plan/8-week-roadmap.md) - **Phase 3 Complete** ✅ Timer, Audio & PWA Foundation

---

## Lessons Learned

- [2025-05-22] When using @testing-library/react, ensure @testing-library/dom is also installed as a dependency to avoid runtime errors.
- [2025-05-22] Use --legacy-peer-deps flag when encountering ESLint version conflicts in npm install.
- [2025-05-22] requestAnimationFrame-based timers are difficult to test with fake timers; focus tests on state management and API contracts rather than timing accuracy.
- [2025-05-22] Web Audio API requires proper TypeScript declarations for webkitAudioContext to support older browsers.
- [2025-05-22] jsdom environment is required for testing React hooks that interact with DOM APIs like AudioContext. 