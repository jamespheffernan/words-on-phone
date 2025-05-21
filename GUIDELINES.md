# Words on Phone – Engineering & Collaboration Guidelines

> "If it isn't tested, it's already broken." – Unknown

These guidelines codify the development workflow for **Words on Phone**.  They complement the project's Planner–Executor framework and are enforced by automated tooling where possible.

---

## 1. Workflow Fundamentals

1. **Write a failing test first.**  All production code must be preceded by a failing Vitest or Cypress test.
2. **Small Pull Requests (< 200 LOC).**  Keep review units small and focussed.
3. **Continuous Integration.**  GitHub Actions must pass (`npm run lint && npm run test`).
4. **Vertical Slices.**  Implement features end-to-end (UI, logic, tests, docs) before starting the next slice.
5. **Branch Naming.**  Use the `Branch Name` specified inside each `docs/implementation-plan/*.md`.

## 2. Commit & PR Standards

| Aspect | Rule |
| ------ | ---- |
| Message style | Conventional Commits (`feat:`, `fix:`, `chore:`…) |
| Scope | One logical change per commit; squash-merge PRs |
| Checklist | PR template must show CI status, test run, and link to spec |

**Do not** use `--force` pushes unless Planner explicitly approves.

## 3. Coding Style

- **Language:** TypeScript Strict Mode; no `any` outside top-level test mocks.
- **Formatting:** Prettier enforced via Husky pre-commit.
- **Linting:** ESLint Airbnb-/React-based rules; zero warnings in CI.
- **State Management:** Prefer Zustand; avoid React context for frequently-updated values.
- **Side Effects:** Contain in hooks or dedicated services; avoid in components.

## 4. Testing Strategy

| Layer | Framework | Purpose |
| ----- | --------- | ------- |
| Unit | Vitest + React Testing Library | Pure functions & components |
| Integration | Vitest + msw | Store + components + API mocks |
| E2E | Cypress | User journeys on `/` |

- Aim for **> 80 %** statement coverage at all times.
- Include timing tolerance tests for the high-precision timer.

## 5. Security & Privacy

1. Run `npm audit` weekly or when adding deps.
2. Keep OpenAI API Key in `.env` and never commit it.
3. No client-side PII collection; Firebase events are anonymised.

## 6. Accessibility & UX

- All interactive elements require `aria-label` or text content.
- Honour `prefers-color-scheme` and respect user motion settings.

## 7. Service Worker & Offline

- Follow a **cache-first** strategy for static assets.
- Ensure app works with `navigator.offline === true`.

## 8. Documentation Discipline

- Update `docs/scratchpad.md` after each insight or lesson.
- Keep `docs/implementation-plan/*.md` in sync with actual progress.

## 9. Asserting Quality

- Lighthouse PWA & Performance scores must stay ≥ 90.
- Attach reports to PRs touching performance-critical code.

## 10. What Would John Carmack Do?™

If you encounter recurring mistakes or unclear code:
1. Stop and reflect.
2. Document the lesson in `docs/scratchpad.md` with a timestamp.
3. Refactor or write tests until the issue cannot reoccur.

---

Happy coding! 🕹️ 