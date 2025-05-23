# Scratchpad

This scratchpad tracks the overarching vision, active implementation plans, and lessons learned while building **Words on Phone**.

## Active Implementation Plans

- [8-week-roadmap](implementation-plan/8-week-roadmap.md) - **Phase 8C In Progress** - Accelerating Beep "Hot Potato" Timer System
- [cors-fix-gemini-function](implementation-plan/cors-fix-gemini-function.md) - **Planning Complete** - CORS Fix for Gemini Netlify Function

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
- 🚨 **CORS Fix**: Custom category request feature blocked by CORS policy in development environment

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
- [2025-01-27] Netlify secrets scanning will fail deployment if environment variables prefixed with `VITE_` containing sensitive data (like API keys) are exposed in the client bundle. The solution is to move API calls to secure serverless functions and remove the `VITE_` prefix so keys stay server-side. Create Netlify functions (e.g., `/netlify/functions/api-name.ts`) to proxy API calls securely, and update client code to call these functions instead of external APIs directly.
- [2025-01-27] Netlify deployment requires proper configuration in `netlify.toml` at the project root to deploy serverless functions correctly. Must specify the functions directory path relative to build base. Additionally, Vite may build worker files with `.ts` extensions causing MIME type errors - configure Vite's worker.rollupOptions to ensure `.js` extensions for proper browser loading.
- [2025-05-23] Always run `git status` before deployment to ensure all critical configuration files are committed and tracked. Configuration files like `netlify.toml` that exist locally but are untracked will cause deployment failures since they won't be available in the deployed environment. Missing configuration files can cause serverless functions to return 404 errors even when the function code exists locally. Always commit configuration files immediately after creation to prevent deployment regressions.
- [2025-01-27] **Editor Conflict Resolution**: When encountering "Use the actions in the editor tool bar to either undo your changes or overwrite" errors, check for multiple dev server instances running simultaneously. Multiple Vite processes create competing file watchers and HMR conflicts that prevent file saves. Solution: (1) Kill all dev server processes with `pkill -f vite`, (2) Clear node module caches, (3) Restart a single dev server on a specific port. Prevention: Always check for existing dev servers before starting new ones, and use explicit port assignments to avoid port exhaustion.
- [2025-05-23] **Branch Merge Analysis**: When considering merging feature branches with potential conflicts, systematically compare the actual implementations rather than just file names. In this case, the main branch already contained all valuable work from feature/8-week-roadmap but in upgraded form (Gemini API vs OpenAI, complete beep system, clean file structure). The "conflicts" were actually the main branch being more advanced. No merge was needed - main branch was already the authoritative version containing all completed work from Phase 8A-8D.
- [2025-05-23] **Git Reference Corruption**: When encountering "fatal: bad object refs/heads/branch-name 2" errors during fetch/pull operations, check for corrupted git references with spaces or special characters in `.git/refs/heads/`. These can be caused by file system operations that create duplicate files with "2" suffixes. Fix by removing the corrupted reference files: `rm ".git/refs/heads/branch-name 2"`. Always use quotes when removing files with spaces in names.
- [2025-05-23] **CORS and UI Integration**: When implementing serverless functions for client-side API calls, two separate issues often arise: (1) CORS preflight failure when functions don't handle OPTIONS requests properly - fix by adding explicit OPTIONS handler returning 200 OK with proper headers, and (2) UI integration gaps where backend functionality works but frontend doesn't display results - ensure React components load and refresh data from services after async operations complete. Both issues can appear as "API not working" but have different root causes requiring separate fixes.
- [2025-05-23] **Systematic Linting Error Resolution**: When addressing multiple ESLint errors (26 problems → 0), tackle them systematically by category: (1) Update ESLint config to exclude build artifacts and add environment-specific rules (Cypress tests), (2) Replace `any` types with `unknown` and proper type assertions, (3) Remove unused imports/parameters, (4) Fix React hook dependency arrays using ref-based approaches for circular dependencies, (5) Use ESLint disable comments sparingly and only for legitimate cases like test mocks. Always verify with `npm run lint` and `npm run build` after fixes. This approach maintains type safety while eliminating development server warnings.
