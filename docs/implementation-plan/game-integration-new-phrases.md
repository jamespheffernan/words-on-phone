# Game Integration – Use Generated Phrases

**Branch Name**: `feature/game-phrase-integration`

## Background and Motivation
With the generator now producing high-quality `phrases.json`, the mobile web game (`words-on-phone-app/`) must consume the new file so players immediately benefit.

## Key Challenges
1. **File Placement** – ensure build process copies the new phrases into the app’s `public/` folder.
2. **Import Paths** – update any hard-coded paths in React components or service workers.
3. **Tests & Fixtures** – sync Jest + Cypress fixtures.
4. **Payload Size** – keep bundle size small for mobile performance.

## Success Criteria
- 🎮 **Gameplay** loads with new phrases (manual smoke test)
- 📊 **Analytics** event `phrase_loaded` fires with 195+ phrases
- ✅ **Unit + Cypress** suites pass
- 📦 **Bundle size** increase < 40 KB gzipped
- 🚀 **Netlify staging deploy** green

## High-level Task Breakdown
| # | Task | Acceptance Criteria |
|---|------|---------------------|
| 1 | Create feature branch | Branch exists |
| 2 | Copy `phrasemachine-v2/output/phrases.json` → `words-on-phone-app/public/phrases.json` (remove legacy files) | File present; lint passes |
| 3 | Search & update import paths (`fetch('/phrases.json')`) if needed | App compiles |
| 4 | Run unit tests (`pnpm test`) – fix snapshots or mocks | All green |
| 5 | Update Cypress fixtures & run `pnpm cypress:run` | All e2e tests green |
| 6 | Generate bundle report (`pnpm build --report`) – verify size | Report shows < 40 KB delta |
| 7 | Push branch; open **draft PR** titled **feat: integrate generated phrases** | PR open |
| 8 | Deploy preview via Netlify, share link in PR description | Preview link works |
| 9 | After human QA approval – squash-merge | PR merged |

## Current Status / Progress Tracking
- [ ] 1. Branch created
- [ ] 2. New phrases copied
- [ ] 3. Imports updated
- [ ] 4. Unit tests pass
- [ ] 5. Cypress tests pass
- [ ] 6. Bundle size checked
- [ ] 7. Draft PR open
- [ ] 8. Preview deploy
- [ ] 9. Merge after QA

## Executor's Feedback or Assistance Requests
_(add here during execution)_
