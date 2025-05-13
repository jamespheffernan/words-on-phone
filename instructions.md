The app is now called Words on Phone.
Below is the same lean development plan with the new name applied everywhere relevant.

⸻

1 · Scope & feature set for Words on Phone

Must-have v1	Nice-to-have v1.1+
Local pass-and-play “hot-potato” loop with hidden timer	Mixed-category rounds
7 k+ seeded English phrases, no repeats	In-game scorekeeper
Options panel: 30–90 s timer slider, buzzer picker	Dark mode, haptics
Per-phrase performance stats	Adaptive difficulty
Modern minimalist UI (React + Tailwind)	Custom sound uploads
Offline-first PWA	Capacitor plugins (Haptics, Share)


⸻

2 · Architecture
	•	Frontend: React + Vite PWA, Zustand state, IndexedDB storage.
	•	Native wrapper: Capacitor v7 → single codebase for iOS App Store.
	•	Analytics & ops: Firebase Analytics/Crashlytics; upgrade to Sentry later.

⸻

3 · Generative phrase engine
	1.	Ships with the local 7 k pool.
	2.	Background worker (OpenAI) fetches extra phrases; dedupes and stores locally.
	3.	Opt-in toggle in settings with data-use warning.

⸻

4 · Cursor-centric workflow
	•	instructions.md: keep this plan as living spec; ask Cursor to critique/regenerate.
	•	.cursor/rules: write failing Vitest test first, small edit-test loops, auto-lint.
	•	.cursorsignore: exclude media; resync nightly.
	•	Commit every green test; push to GitHub.

⸻

5 · Milestones (one-person, 8-week target)

Week	Goal
1	Repo bootstrap, PWA shell
2	Phrase list, shuffle, timer, buzzers
3	Stats + persistence, options UI
4	OpenAI fetcher, opt-in control
5	Analytics hooks, 80 % test coverage
6	Capacitor iOS build, TestFlight
7	Hardening, crash fixes
8	App Store submission; start v1.1 features


⸻

6 · Testing & QA
	•	Vitest for logic, Cypress for PWA flows, XCTest via Firebase Test Lab.
	•	Manual hot-potato runs on real iPhones to tune audio-timer feel.

⸻

7 · Risks & mitigations

Risk	Mitigation
WebView audio issues	Fallback to vibration; log failures
OpenAI quota/cost	Local phrases remain the default; throttle requests
Solo dev overload	Strict weekly goals, Cursor incremental loops
App Store privacy rejection	Declare “anonymous play, no tracking” clearly


⸻

8 · Future roadmap

Online party mode → Phrase-pack marketplace (IAP) → Localisation via GPT → Difficulty auto-tuning.

⸻

Use this updated plan as your instructions.md seed for Cursor.