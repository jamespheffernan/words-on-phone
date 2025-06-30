# Scoring Calibration Analysis Report
Generated: 2025-06-30T22:43:06.467Z

## Executive Summary

This analysis examines 500 recently extracted phrases to evaluate the current scoring system's performance and identify opportunities for improvement.

**Key Findings:**
- Current 70% threshold acceptance rate: **12.40%**
- 20 potentially famous phrases scored below threshold due to Reddit bias
- 56.60% of phrases have zero Reddit activity
- 3 actionable recommendations identified

## Sample Analysis

**Sample Size:** 500 most recent phrases
**Date Range:** 2025-06-26T16:12:18.017Z to 2025-06-30T22:24:43.077Z

### Score Distribution by Category
- **Sports & Athletes:** 132 phrases, avg 47.1 pts, 6.1% accepted
- **Music & Artists:** 175 phrases, avg 36.5 pts, 2.3% accepted
- **Famous People:** 19 phrases, avg 45.0 pts, 0.0% accepted
- **Movies & TV:** 120 phrases, avg 61.7 pts, 41.7% accepted
- **Entertainment & Pop Culture:** 54 phrases, avg 36.5 pts, 0.0% accepted


## Acceptance Rate Analysis

| Threshold | Accepted | Rejected | Rate | Avg Score (Accepted) | Avg Score (Rejected) |
|-----------|----------|----------|------|---------------------|---------------------|
| 60% | 137 | 363 | **27.40%** | 69.63 | 36.61 |
| 65% | 110 | 390 | **22.00%** | 71.47 | 38.37 |
| 70% | 62 | 438 | **12.40%** | 74.51 | 41.57 |

## Score Component Analysis

| Component | Average | Min | Max | Zero Values | Zero % |
|-----------|---------|-----|-----|-------------|--------|
| localHeuristics | 19.92 | 11.4 | 33 | 0 | 0.00% |
| wikidata | 14.18 | 0 | 30 | 201 | 40.20% |
| reddit | 5.34 | 0 | 15 | 283 | 56.60% |
| categoryBoost | 6.21 | 5 | 15 | 0 | 0.00% |

## Borderline Phrases Analysis (60-79 points)

**Total Borderline:** 128 phrases
**Selected for Review:** 100 phrases

### Sample Borderline Phrases for Manual Review
- **The Robe** (Movies & TV) - Score: 78
  - Local: 28, Wikidata: 25, Reddit: 15, Category: 10
- **The Jungle Book** (Movies & TV) - Score: 78
  - Local: 23, Wikidata: 30, Reddit: 15, Category: 10
- **Mrs. Miniver** (Movies & TV) - Score: 77
  - Local: 22, Wikidata: 30, Reddit: 15, Category: 10
- **Bambi** (Movies & TV) - Score: 77
  - Local: 22, Wikidata: 30, Reddit: 15, Category: 10
- **Grand Hotel** (Movies & TV) - Score: 77
  - Local: 22, Wikidata: 30, Reddit: 15, Category: 10
- **Wings** (Movies & TV) - Score: 77
  - Local: 22, Wikidata: 30, Reddit: 15, Category: 10
- **Frozen** (Movies & TV) - Score: 77
  - Local: 22, Wikidata: 30, Reddit: 15, Category: 10
- **Furious 7** (Movies & TV) - Score: 77
  - Local: 22, Wikidata: 30, Reddit: 15, Category: 10
- **Avatar** (Movies & TV) - Score: 77
  - Local: 22, Wikidata: 30, Reddit: 15, Category: 10
- **Jurassic Park** (Movies & TV) - Score: 77
  - Local: 22, Wikidata: 30, Reddit: 15, Category: 10

## Potentially Under-Scored Famous Phrases

These phrases have high encyclopedic value (Wikidata ≥20) but low overall scores due to limited Reddit activity:

- **Mexico City** (Sports & Athletes) - Score: 59
  - Wikidata: 30, Reddit: 0
  - High Wikidata score but low Reddit activity - potentially historically famous
- **Grenoble** (Sports & Athletes) - Score: 53
  - Wikidata: 30, Reddit: 0
  - High Wikidata score but low Reddit activity - potentially historically famous
- **Rome** (Sports & Athletes) - Score: 61
  - Wikidata: 30, Reddit: 0
  - High Wikidata score but low Reddit activity - potentially historically famous
- **Melbourne** (Sports & Athletes) - Score: 49
  - Wikidata: 30, Reddit: 0
  - High Wikidata score but low Reddit activity - potentially historically famous
- **Oslo** (Sports & Athletes) - Score: 61
  - Wikidata: 30, Reddit: 0
  - High Wikidata score but low Reddit activity - potentially historically famous
- **World War II** (Sports & Athletes) - Score: 59.33333333333333
  - Wikidata: 30, Reddit: 0
  - High Wikidata score but low Reddit activity - potentially historically famous
- **Nazi Germany** (Sports & Athletes) - Score: 57
  - Wikidata: 30, Reddit: 0
  - High Wikidata score but low Reddit activity - potentially historically famous
- **Second Sino-Japanese War** (Sports & Athletes) - Score: 52.666666666666664
  - Wikidata: 30, Reddit: 0
  - High Wikidata score but low Reddit activity - potentially historically famous
- **Amsterdam** (Sports & Athletes) - Score: 49
  - Wikidata: 30, Reddit: 0
  - High Wikidata score but low Reddit activity - potentially historically famous
- **Antwerp** (Sports & Athletes) - Score: 60
  - Wikidata: 30, Reddit: 7
  - High Wikidata score but low Reddit activity - potentially historically famous

## Recommendations

### 1. REDDIT_WEIGHT_REDUCTION (HIGH Priority)

**Issue:** 56.6% of phrases have zero Reddit score, indicating Reddit weight may be too punitive for historical/encyclopedic content.

**Recommended Action:** Reduce Reddit weight from 15 to 5-10 points for Wikipedia-sourced phrases

### 2. WIKIDATA_SCORING_IMPROVEMENT (MEDIUM Priority)

**Issue:** 40.2% of phrases have zero Wikidata score. May need to improve Wikidata lookup or scoring logic.

**Recommended Action:** Review Wikidata API integration and scoring thresholds

### 3. WIKIPEDIA_AWARE_SCORING (HIGH Priority)

**Issue:** Found 20 phrases with high encyclopedic value but low overall scores due to Reddit bias.

**Recommended Action:** Implement Wikipedia-aware scoring pathway as outlined in Task 5.2


## Proposed Scoring Adjustments

Based on this analysis, we recommend implementing the following changes:

### Option A: Threshold Adjustment (Quick Fix)
- Lower acceptance threshold from 70% to 65%
- Expected acceptance rate increase: 22.00%
- Risk: May accept some lower-quality phrases

### Option B: Wikipedia-Aware Scoring (Task 5.2)
- Implement dynamic scoring based on phrase source
- Reduce Reddit weight for Wikipedia phrases (15 → 5 points)
- Add Wikipedia-specific metrics (pageviews, article structure)
- Expected acceptance rate: 5-8% with maintained precision

### Option C: Hybrid Approach (Recommended)
- Implement Option B for long-term solution
- Use Option A as interim fix while developing Wikipedia-aware scoring

## Next Steps

1. **Immediate:** Manual review of 100 borderline phrases
2. **Short-term:** Implement threshold adjustment to 65% if manual review shows good precision
3. **Long-term:** Proceed with Task 5.2 Wikipedia-aware scoring engine

---
*Report generated by scoring-calibration-analyzer.js*
