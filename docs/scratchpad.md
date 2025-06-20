# Scratchpad

This scratchpad tracks the overarching vision, active implementation plans, and lessons learned while building **Words on Phone**.

## Active Implementation Plans

- [cors-fix-gemini-function](implementation-plan/cors-fix-gemini-function.md) - ⚠️ **NEEDS REVISION** - CORS Fix for Gemini Netlify Function (Production 404 Error Detected)
- [netlify-function-deployment-fix](implementation-plan/netlify-function-deployment-fix.md) - ✅ **COMPLETED** - Netlify Function Deployment Fix - 404 Error Resolution  
- [visual-background-warning](implementation-plan/visual-background-warning.md) - **✅ COMPLETE** - Visual Background Warning System (Progressive Red Background)
- [phrasemachine-prompt-upgrade](implementation-plan/phrasemachine-prompt-upgrade.md) - ✅ **COMPLETED** - PhraseMachine Prompt Format Upgrade

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
- ✅ **Phase 8C** (Week 8C): Accelerating Beep "Hot Potato" Timer System (smooth interval decrease from 1000ms to 150ms)
- ✅ **Phase 8D** (Week 8D): Gemini API Migration (complete migration from OpenAI to Gemini API with secure key management)

**Currently Active:**
- 🚧 **Phase 9**: Launch preparation (App Store submission, privacy forms, screenshots)
- ✅ **PRODUCTION ISSUE RESOLVED**: Custom category request feature now fully functional - URL path mismatch fixed and verified
- ✅ **CYPRESS TYPESCRIPT FIXED**: TypeScript configuration issues in accessibility tests resolved

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
- [2025-01-27] For React components that need to display both static and dynamic data, implement caching in the service layer to enable synchronous access to async data. Store dynamic content (like custom categories) in organized cache structures (e.g., Record<string, string[]>) that can be accessed immediately by UI components, while keeping the async loading logic separate in useEffect hooks.
- [2025-01-27] When implementing delete functionality for user-generated content: (1) Always include confirmation dialogs to prevent accidental deletion, (2) Ensure complete cleanup of all related data (phrases, metadata, cache), (3) Update UI immediately after deletion, (4) Handle edge cases like deleting currently selected items by switching to safe defaults, (5) Use visual cues (positioning, colors, icons) to make delete buttons discoverable but not accidentally clickable.
- [2025-01-27] Netlify secrets scanning will fail deployment if environment variables prefixed with `VITE_` containing sensitive data (like API keys) are exposed in the client bundle. The solution is to move API calls to secure serverless functions and remove the `VITE_` prefix from environment variables.
- [2025-01-27] Always verify production deployment endpoints match the actual deployed function paths. Documentation claiming successful production testing can be misleading if the tested URLs differ from the actual application configuration. The CORS fix documentation tested `/.netlify/functions/gemini` but the production app tries to access `/netlify/functions/gemini` (missing dot), causing 404 errors. Thorough end-to-end testing with the actual application URLs is essential to catch URL path mismatches between different environments.
- [2025-01-27] When testing serverless functions end-to-end, ensure test scripts use the exact same request format as the actual application code. API functions expect specific field names (`prompt`, `category`, `phraseCount`) and response structures (`candidates[0].content.parts[0].text`). Testing with incorrect request formats will give false negatives even when the function is working correctly. Always examine the actual service layer code to understand the precise API contract before writing integration tests.
- [2025-01-27] When updating prompt formats that change output structure (line-based to JSON), always implement parsing logic that can handle both old and new formats for smooth transitions. Production testing is essential when modifying prompt formats - what works in development may behave differently with live AI models. JSON extraction from AI responses should use regex pattern matching rather than assuming the entire response is JSON, as models may include explanatory text before/after the JSON.
- [2025-01-27] For Vite projects using Web Workers, import workers using the `?worker` query parameter (e.g., `new URL('../workers/file.ts?worker', import.meta.url)`) to avoid MIME type issues. Don't use `{ type: 'module' }` option as it can cause "video/mp2t" MIME type errors. Also ensure worker message types match exactly between sender and receiver (e.g., 'STOP' not 'STOP_WORKER').
- [2025-01-27] Cypress projects require dedicated TypeScript configuration for proper type support. Create a `tsconfig.cypress.json` file with `"types": ["cypress", "cypress-axe"]` and include it as a project reference in the main `tsconfig.json`. Configure `cypress.config.js` with `typescript: { configFile: "tsconfig.cypress.json" }` to resolve TypeScript errors for Cypress globals like `describe`, `it`, `cy`, and `expect`. Modern Cypress versions (14+) have built-in TypeScript support and don't require separate `@types/cypress` package.