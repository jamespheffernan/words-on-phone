# Words on Phone – Progress Log

## 0. Project Setup & Configuration
- [x] React + TypeScript + Vite bootstrapped  
- [x] Tailwind CSS configured  
- [x] ESLint & Prettier applied  
- [x] Vitest, Testing Library & Cypress installed  
- [x] Capacitor CLI initialized & iOS scaffolded  
- [x] Firebase SDK added & basic init

## 1. Core v1 Features
- [x] Pass-and-play "hot-potato" loop (hidden timer)  
- [x] Timer slider (30–90 s) in Settings  
- [x] Buzzer picker UI & audio playback  
- [x] 7 000+ seeded phrases loaded locally  
- [x] In-game scorekeeper (UI + logic)  
- [ ] Per-phrase performance stats collection & display  

## 2. v1.1+ Nice-to-Have Features
- [ ] Mixed-category rounds  
- [ ] Dark mode (CSS variables, toggle)  
- [ ] Haptics on buzzer events  
- [ ] Custom sound upload & preview  
- [ ] Adaptive difficulty algorithm  

## 3. PWA & Offline Support
- [ ] Service worker via Vite PWA plugin  
- [ ] Pre-cache shell + runtime caching strategy  
- [ ] Offline fallbacks & UI messaging  
- [ ] "Install app" prompt + manifest icons  
- [ ] Lighthouse audit → PWA compliance

## 4. Phrase Engine & External Data
- [ ] Web Worker scaffolding for fetcher  
- [ ] OpenAI integration (API key mgmt)  
- [ ] Deduplication of fetched phrases  
- [ ] IndexedDB persistence for new phrases  
- [ ] Opt-in toggle + data-use warning UI  

## 5. UI/UX & Accessibility
- [ ] Responsive minimalist layout (mobile↔desktop)  
- [ ] Keyboard navigation & focus states  
- [ ] ARIA roles/labels for screen readers  
- [ ] Animations for timer, transitions (perf-safe)  
- [ ] High-contrast and dark-mode accessible styles

## 6. Settings & Options
- [ ] Timer duration slider (30–90 s)  
- [ ] Buzzer sound picker with preview  
- [ ] Phrase category selectors (future)  
- [ ] Reset stats & clear storage flow  
- [ ] Theme (light/dark) & haptics toggles  

## 7. State & Data Persistence
- [ ] Finalize Zustand store shape  
- [ ] Sync store ↔ IndexedDB via storage util  
- [ ] Schema migration strategy  
- [ ] "Reset game" & "clear local data" UI

## 8. Testing & QA
- [x] Fix component tests for QR code sharing feature
- [x] Implement proper mocks for haptics functionality
- [x] Update storage utility tests
- [x] Fix Firebase analytics tests
- [x] Ensure App test handles async loading state
- [ ] Vitest unit tests ≥ 80% coverage  
- [ ] Integration tests (Game, Settings, Stats)  
- [ ] Cypress E2E flows: play-loop, offline, install  
- [ ] Cross-browser smoke tests (Chrome, Safari, Firefox)  
- [ ] Mobile PWA emulation & device runs  

## 9. Performance & Optimization
- [ ] Code-splitting & dynamic imports  
- [ ] Purge unused CSS/JS  
- [ ] Optimize images & compress audio  
- [ ] Preload critical assets  
- [ ] Memory & CPU profiling fixes  

## 10. Analytics & Monitoring
- [ ] Firebase Analytics: key game events  
- [ ] Crashlytics for mobile builds  
- [ ] Log audio failures + fallback use  
- [ ] Sentry integration & error boundaries  

## 11. Mobile / Native Integration
- [ ] Capacitor build & run on iOS hardware  
- [ ] Verify haptic feedback on device  
- [ ] Deep linking & universal links  
- [ ] Android support scaffold (future)  

## 12. Deployment & CI/CD
- [ ] Netlify / Firebase hosting config  
- [ ] GitHub Actions: lint → test → build → deploy  
- [ ] Version bump & changelog automation  
- [ ] App Store distribution script (future)  

## 13. Risks & Mitigation
- [ ] Browser audio fallback → vibration log  
- [ ] Rate-limit OpenAI calls & handle quotas  
- [ ] Weekly green-build commits + reviews  
- [ ] Feature flags for experimental code  

## 14. Future Roadmap
- [ ] Online party mode (WebRTC)  
- [ ] Phrase-pack marketplace & payments  
- [ ] GPT-powered localization  
- [ ] Auto difficulty tuning  
- [ ] Full native wrapper & store submission  