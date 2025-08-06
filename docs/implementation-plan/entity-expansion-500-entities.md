# Entity Expansion – Phase 1 (500+ Entities)

**Branch Name**: `feature/entity-expansion-500`

## Background and Motivation
The generator currently uses 103 curated game-relevant entities which produce 195 phrases.  Expanding the entity pool will linearly increase phrase volume and category diversity while preserving quality-by-design.  Phase 1 targets **≥ 500 curated entities** spread across key categories (people, movies/TV, places, brands, food, sports).

## Key Challenges and Analysis
1. **Curation Effort** – avoid random scraping; maintain recognisability & family-friendly tone.
2. **Deduplication** – prevent alias collisions (e.g. “NYC” vs “New York City”).
3. **Category Balance** – ensure no single category dominates.
4. **Difficulty Calibration** – use `sitelinks` heuristic to keep easy/medium/hard mix.

## Success Criteria
- 🗂️ **Entity Count** ≥ 500 (stretch 1000)
- 🔤 **Category Coverage** ≥ 6 distinct categories with ≥ 50 entities each
- 🛡️ **Validation**: build + quality-check passes with **0 duplicates**
- 📦 **Output Size**: phrases.json ≤ 150 KB uncompressed
- ⏱️ **Build Time** unchanged (< 2 min CI)

## High-level Task Breakdown

| # | Task | Acceptance Criteria |
|---|------|---------------------|
| 1 | Analyse current distribution and draft target counts per category | Markdown table committed to repo |
| 2 | Update `data/curated/wikidata-entities-expanded.json` **spec** section with new targets | JSON committed |
| 3 | Use `tools/expand-entities.js` **interactive CLI** to add entities + aliases until counts met | File shows ≥ 500 entities |
| 4 | Run `npm run build` (build.sh) & ensure generation produces ≥ 900 unique phrases | Build succeeds; phrase count logged |
| 5 | Run `validators/quality-check.js` – must pass all checks | Exit 0 |
| 6 | Update documentation (plan + scratchpad) with new stats | Docs committed |
| 7 | Push branch & open draft PR titled **feat: expand curated entities to 500+** | PR open |

## Current Status / Progress Tracking
- [ ] 1. Analyse current distribution
- [ ] 2. Update spec
- [ ] 3. Add entities via CLI
- [ ] 4. Build + generate phrases
- [ ] 5. Validate quality
- [ ] 6. Update docs
- [ ] 7. Draft PR opened

## Executor's Feedback or Assistance Requests
_(add here during execution)_
