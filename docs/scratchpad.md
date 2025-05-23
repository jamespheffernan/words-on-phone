# Scratchpad

This scratchpad tracks the overarching vision, active implementation plans, and lessons learned while building **Words on Phone**.

## Active Implementation Plans

- [8-week-roadmap](implementation-plan/8-week-roadmap.md) - **Phase 8C In Progress** - Accelerating Beep "Hot Potato" Timer System

## Current Status / Progress Tracking

**Completed Phases:**
- ✅ **Phase 1** (Week 1): Complete React app structure, core navigation, basic components
- ✅ **Phase 2** (Week 2): Core game logic, phrase categories, skip limits, state management  
- ✅ **Phase 3** (Week 3): High-precision timer, Web Audio API, offline capabilities
- ✅ **Phase 4** (Week 4): Options panel, skip-limit features, Firebase analytics, IndexedDB persistence
- ✅ **Phase 5** (Week 5): OpenAI phrase-fetcher with Web Worker, deduplication, throttling
- ✅ **Phase 6** (Week 6): Capacitor mobile app, iOS deployment
- ✅ **Phase 7** (Week 7): QA, performance optimization, accessibility (Lighthouse: Performance 78/100, Accessibility 95/100, Best Practices 96/100, SEO 90/100)
- ✅ **Phase 8A** (Week 8A): Custom Category Request System (user requests category → see sample words → generate 50+ phrases)
- ✅ **Phase 8B** (Week 8B): Enhanced Timer UX (randomized duration 45-75s, hidden by default, optional visible/fixed timer)
- ✅ **Phase 8D** (Week 8D): Gemini API Migration (complete migration from OpenAI to Gemini API with secure key management)

**Currently Active:**
- 🚧 **Phase 8C**: Accelerating Beep "Hot Potato" Timer System (Tasks 1-4 Complete ✅, Task 5 Next)

**Next Up:**
- Phase 9: Final polish, App Store submission, documentation

---

## Lessons Learned

- [2025-05-22] When using @testing-library/react, ensure @testing-library/dom is also installed as a dependency to avoid runtime errors.
- [2025-05-22] Use --legacy-peer-deps flag when encountering ESLint version conflicts in npm install.
- [2025-05-22] requestAnimationFrame-based timers are difficult to test with fake timers; focus tests on state management and API contracts rather than timing accuracy.
- [2025-05-22] Web Audio API requires proper TypeScript declarations for webkitAudioContext to support older browsers.
- [2025-05-22] jsdom environment is required for testing React hooks that interact with DOM APIs like AudioContext.
- [2025-05-22] Project has nested structure with React app in `words-on-phone-app/` subdirectory. Always run dev/build commands from the words-on-phone-app directory, not the root. Root package.json is just a stub with minimal scripts.
- [2025-05-22] Lighthouse Performance scores of 78/100 are respectable for React PWAs with complex game logic. Focus on achieving 90+ in Accessibility, Best Practices, and SEO as primary success criteria. Performance can be optimized but shouldn't block release for scores above 70.
- [2025-01-27] IndexedDB mocking in tests requires careful implementation of all methods used by the app. Missing methods like `getAll()` in mock objects can cause test timeouts. Sometimes it's better to focus on functional testing over complete unit test coverage when 3rd-party library mocking becomes complex.
- [2025-01-27] Web Audio API AudioContext should use a global singleton pattern to prevent multiple contexts and "closed context" errors. Browser autoplay policies require AudioContext to be resumed on user interaction. Cleanup effects that close contexts should be avoided when the context needs to persist across component re-renders.
- [2025-01-27] When implementing complex validation logic in Zustand stores, ensure cross-validation between related settings (e.g., first interval >= final interval) to prevent invalid configurations. Range clamping with Math.max/Math.min provides safe boundaries for user input while maintaining usability.
- [2025-01-27] Migrating from OpenAI to Gemini API requires careful attention to request/response format differences. Gemini uses `contents` array with `parts` containing `text`, while OpenAI uses `messages` array. API key authentication differs: Gemini uses URL parameter `?key=${apiKey}` while OpenAI uses Bearer token in Authorization header. Both require proper error handling for 401 (invalid key) and 429 (rate limit) responses.
- [2025-01-27] When implementing stateful request systems, avoid timestamps in ID generation for multi-step processes. Use deterministic IDs based on content (e.g., category name) so the same logical entity always has the same ID across different function calls. Non-deterministic IDs with timestamps cause "request not found" errors between related operations. 