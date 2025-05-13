The app is now called Words on Phone.
Below is the updated development plan with a web-first approach.

⸻

1 · Scope & feature set for Words on Phone

Must-have v1	Nice-to-have v1.1+
Local pass-and-play "hot-potato" loop with hidden timer	Mixed-category rounds
7 k+ seeded English phrases, no repeats	In-game scorekeeper
Options panel: 30–90 s timer slider, buzzer picker	Dark mode, haptics
Per-phrase performance stats	Adaptive difficulty
Modern minimalist UI (React + Tailwind)	Custom sound uploads
Offline-first PWA	Advanced web features (Share API, Notifications)


⸻

2 · Architecture
	•	Frontend: React + Vite PWA, Zustand state, IndexedDB storage.
	•	Web-first: Optimized for browser experience across all devices.
	•	Analytics & ops: Firebase Analytics/Crashlytics; upgrade to Sentry later.
	•	Future consideration: Native wrapper via Capacitor for app stores.

⸻

3 · Generative phrase engine
	1.	Ships with the local 7 k pool.
	2.	Background worker (OpenAI) fetches extra phrases; dedupes and stores locally.
	3.	Opt-in toggle in settings with data-use warning.

⸻

4 · Cursor-centric workflow
	•	instructions.md: keep this plan as living spec; ask Cursor to critique/regenerate.
	•	progress_log.md: update and check off tasks as they are completed to maintain the progress log.
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
5	Analytics hooks, 80% test coverage
6	PWA optimizations, service worker improvements
7	Hardening, performance optimizations
8	Web deployment; start v1.1 features


⸻

6 · Testing & QA
	•	Vitest for logic, Cypress for PWA flows.
	•	Cross-browser testing on desktop and mobile devices.
	•	Manual hot-potato runs on various devices to tune audio-timer feel.

⸻

7 · Risks & mitigations

Risk	Mitigation
Browser audio issues	Fallback to vibration; log failures
OpenAI quota/cost	Local phrases remain the default; throttle requests
Solo dev overload	Strict weekly goals, Cursor incremental loops
Cross-browser inconsistencies	Progressive enhancement, feature detection


⸻

8 · Future roadmap

PWA improvements → Online party mode → Phrase-pack marketplace → Localisation via GPT → Difficulty auto-tuning → Native app distribution (optional)

⸻

Use this updated plan as your instructions.md seed for Cursor.