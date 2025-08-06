# Entity Expansion Analysis - Phase 1

## Current Distribution (103 entities)
- **person**: 37 (36%)
- **movie**: 16 (16%)
- **place**: 15 (15%) 
- **company**: 9 (9%)
- **other**: 8 (8%)
- **tv_show**: 6 (6%)
- **food**: 6 (6%)
- **sport**: 5 (5%)
- **country**: 1 (1%)

## Target Distribution (500+ entities)

| Category | Current | Target | Increase | Rationale |
|----------|---------|---------|----------|-----------|
| **person** | 37 | 150 | +113 | Core category - celebrities, historical figures, musicians, actors |
| **movie** | 16 | 75 | +59 | Popular entertainment - blockbusters, classics, franchises |
| **place** | 15 | 75 | +60 | Cities, landmarks, countries - highly recognizable |
| **tv_show** | 6 | 50 | +44 | Popular series - sitcoms, dramas, reality shows |
| **company** | 9 | 50 | +41 | Major brands - tech, retail, food chains |
| **food** | 6 | 40 | +34 | Common foods, dishes, snacks |
| **sport** | 5 | 30 | +25 | Sports, teams, equipment |
| **country** | 1 | 20 | +19 | Major countries and regions |
| **other** | 8 | 10 | +2 | Miscellaneous - books, concepts, etc. |

**Total Target: 500 entities** (397 new additions needed)

## Implementation Strategy
1. **High-Recognition Priority**: Focus on entities with high Wikipedia sitelinks (>100)
2. **Family-Friendly**: Avoid controversial figures or inappropriate content  
3. **Global Appeal**: Include international celebrities, movies, places
4. **Alias Rich**: Prioritize entities with common nicknames/abbreviations
5. **Game Balance**: Maintain mix of easy/medium/hard difficulty levels

## Quality Targets
- **Phrase Output**: 900-1200 unique phrases (from 500 entities)
- **Category Balance**: No single category >30% of total
- **Difficulty Mix**: ~30% easy, ~50% medium, ~20% hard
- **Validation**: Zero duplicates, proper categorization