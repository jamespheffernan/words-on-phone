#!/usr/bin/env node

/**
 * Task 5.1: Scoring Calibration & Validation Analysis
 * 
 * This script analyzes the current scoring system to:
 * 1. Sample 500 recently extracted phrases (accepted & rejected)
 * 2. Compute acceptance distribution at different thresholds
 * 3. Identify scoring biases and suggest improvements
 * 4. Generate comprehensive calibration report
 */

const fs = require('fs');
const path = require('path');

class ScoringCalibrationAnalyzer {
    constructor() {
        this.phraseScoresPath = path.join(__dirname, '../data/phrase-scores.json');
        this.reportPath = path.join(__dirname, '../reports/scoring-calibration-' + new Date().toISOString().split('T')[0] + '.md');
        this.phraseScores = {};
        this.sampleSize = 500;
        this.spotCheckSize = 100;
    }

    async loadData() {
        console.log('📊 Loading phrase scores data...');
        try {
            const data = fs.readFileSync(this.phraseScoresPath, 'utf8');
            this.phraseScores = JSON.parse(data);
            console.log(`✅ Loaded ${Object.keys(this.phraseScores).length} scored phrases`);
        } catch (error) {
            console.error('❌ Error loading phrase scores:', error.message);
            throw error;
        }
    }

    samplePhrases() {
        console.log(`🎯 Sampling ${this.sampleSize} phrases for analysis...`);
        
        const allPhrases = Object.values(this.phraseScores);
        
        // Sort by timestamp (most recent first)
        allPhrases.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Take the most recent phrases up to sample size
        const sample = allPhrases.slice(0, Math.min(this.sampleSize, allPhrases.length));
        
        console.log(`✅ Sampled ${sample.length} most recent phrases`);
        return sample;
    }

    analyzeAcceptanceDistribution(sample) {
        console.log('📈 Analyzing acceptance distribution at different thresholds...');
        
        const thresholds = [60, 65, 70];
        const results = {};
        
        thresholds.forEach(threshold => {
            const accepted = sample.filter(phrase => phrase.totalScore >= threshold);
            const rejected = sample.filter(phrase => phrase.totalScore < threshold);
            
            results[threshold] = {
                threshold,
                accepted: accepted.length,
                rejected: rejected.length,
                acceptanceRate: (accepted.length / sample.length * 100).toFixed(2),
                avgScoreAccepted: accepted.length > 0 ? (accepted.reduce((sum, p) => sum + p.totalScore, 0) / accepted.length).toFixed(2) : 0,
                avgScoreRejected: rejected.length > 0 ? (rejected.reduce((sum, p) => sum + p.totalScore, 0) / rejected.length).toFixed(2) : 0
            };
        });
        
        return results;
    }

    analyzeScoreBreakdown(sample) {
        console.log('🔍 Analyzing score component breakdown...');
        
        const breakdown = {
            localHeuristics: [],
            wikidata: [],
            reddit: [],
            categoryBoost: []
        };
        
        sample.forEach(phrase => {
            if (phrase.breakdown) {
                breakdown.localHeuristics.push(phrase.breakdown.localHeuristics || 0);
                breakdown.wikidata.push(phrase.breakdown.wikidata || 0);
                breakdown.reddit.push(phrase.breakdown.reddit || 0);
                breakdown.categoryBoost.push(phrase.breakdown.categoryBoost || 0);
            }
        });
        
        const stats = {};
        Object.keys(breakdown).forEach(component => {
            const values = breakdown[component];
            if (values.length > 0) {
                stats[component] = {
                    avg: (values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(2),
                    min: Math.min(...values),
                    max: Math.max(...values),
                    zeros: values.filter(v => v === 0).length,
                    zeroPercent: (values.filter(v => v === 0).length / values.length * 100).toFixed(2)
                };
            }
        });
        
        return stats;
    }

    identifyBorderlinePhrases(sample) {
        console.log('🎯 Identifying borderline phrases for manual review...');
        
        // Focus on phrases scoring 60-79 (borderline for 70 threshold)
        const borderline = sample.filter(phrase => phrase.totalScore >= 60 && phrase.totalScore < 79);
        
        // Sort by total score for easier review
        borderline.sort((a, b) => b.totalScore - a.totalScore);
        
        // Take up to spotCheckSize for manual review
        const forReview = borderline.slice(0, Math.min(this.spotCheckSize, borderline.length));
        
        return {
            total: borderline.length,
            forReview: forReview.length,
            phrases: forReview.map(phrase => ({
                phrase: phrase.phrase,
                category: phrase.category,
                totalScore: phrase.totalScore,
                breakdown: phrase.breakdown,
                verdict: phrase.verdict
            }))
        };
    }

    identifyLowScoringFamousPhrases(sample) {
        console.log('🔍 Identifying potentially famous phrases with low scores...');
        
        // Look for phrases with low Reddit scores but high Wikidata scores
        // These might be historically famous but not trending on Reddit
        const suspicious = sample.filter(phrase => {
            const breakdown = phrase.breakdown || {};
            return (
                phrase.totalScore < 70 && // Below current threshold
                (breakdown.wikidata || 0) >= 20 && // High Wikidata score (indicates notability)
                (breakdown.reddit || 0) <= 10 // Low Reddit score
            );
        });
        
        // Sort by Wikidata score (highest first)
        suspicious.sort((a, b) => (b.breakdown?.wikidata || 0) - (a.breakdown?.wikidata || 0));
        
        return suspicious.slice(0, 20).map(phrase => ({
            phrase: phrase.phrase,
            category: phrase.category,
            totalScore: phrase.totalScore,
            breakdown: phrase.breakdown,
            wikidataScore: phrase.breakdown?.wikidata || 0,
            redditScore: phrase.breakdown?.reddit || 0,
            reasoning: 'High Wikidata score but low Reddit activity - potentially historically famous'
        }));
    }

    generateRecommendations(distributionAnalysis, breakdownStats, borderlineAnalysis, suspiciousPhrases) {
        console.log('💡 Generating scoring recommendations...');
        
        const recommendations = [];
        
        // Current acceptance rate analysis
        const current70Rate = parseFloat(distributionAnalysis[70].acceptanceRate);
        const current65Rate = parseFloat(distributionAnalysis[65].acceptanceRate);
        const current60Rate = parseFloat(distributionAnalysis[60].acceptanceRate);
        
        if (current70Rate < 3) {
            recommendations.push({
                type: 'THRESHOLD_ADJUSTMENT',
                priority: 'HIGH',
                description: `Current 70% threshold yields only ${current70Rate}% acceptance rate. Consider lowering to 65% (${current65Rate}%) or 60% (${current60Rate}%) for better recall.`,
                implementation: 'Update quality threshold in extraction pipeline from 70 to 65 points'
            });
        }
        
        // Reddit weight analysis
        const redditZeroPercent = parseFloat(breakdownStats.reddit?.zeroPercent || 0);
        if (redditZeroPercent > 30) {
            recommendations.push({
                type: 'REDDIT_WEIGHT_REDUCTION',
                priority: 'HIGH',
                description: `${redditZeroPercent}% of phrases have zero Reddit score, indicating Reddit weight may be too punitive for historical/encyclopedic content.`,
                implementation: 'Reduce Reddit weight from 15 to 5-10 points for Wikipedia-sourced phrases'
            });
        }
        
        // Wikidata analysis
        const wikidataZeroPercent = parseFloat(breakdownStats.wikidata?.zeroPercent || 0);
        if (wikidataZeroPercent > 40) {
            recommendations.push({
                type: 'WIKIDATA_SCORING_IMPROVEMENT',
                priority: 'MEDIUM',
                description: `${wikidataZeroPercent}% of phrases have zero Wikidata score. May need to improve Wikidata lookup or scoring logic.`,
                implementation: 'Review Wikidata API integration and scoring thresholds'
            });
        }
        
        // Suspicious phrases analysis
        if (suspiciousPhrases.length > 5) {
            recommendations.push({
                type: 'WIKIPEDIA_AWARE_SCORING',
                priority: 'HIGH',
                description: `Found ${suspiciousPhrases.length} phrases with high encyclopedic value but low overall scores due to Reddit bias.`,
                implementation: 'Implement Wikipedia-aware scoring pathway as outlined in Task 5.2'
            });
        }
        
        return recommendations;
    }

    async generateReport(sample, distributionAnalysis, breakdownStats, borderlineAnalysis, suspiciousPhrases, recommendations) {
        console.log('📝 Generating comprehensive calibration report...');
        
        const report = `# Scoring Calibration Analysis Report
Generated: ${new Date().toISOString()}

## Executive Summary

This analysis examines ${sample.length} recently extracted phrases to evaluate the current scoring system's performance and identify opportunities for improvement.

**Key Findings:**
- Current 70% threshold acceptance rate: **${distributionAnalysis[70].acceptanceRate}%**
- ${suspiciousPhrases.length} potentially famous phrases scored below threshold due to Reddit bias
- ${breakdownStats.reddit?.zeroPercent || 0}% of phrases have zero Reddit activity
- ${recommendations.length} actionable recommendations identified

## Sample Analysis

**Sample Size:** ${sample.length} most recent phrases
**Date Range:** ${sample[sample.length-1]?.timestamp || 'N/A'} to ${sample[0]?.timestamp || 'N/A'}

### Score Distribution by Category
${this.generateCategoryBreakdown(sample)}

## Acceptance Rate Analysis

| Threshold | Accepted | Rejected | Rate | Avg Score (Accepted) | Avg Score (Rejected) |
|-----------|----------|----------|------|---------------------|---------------------|
${Object.values(distributionAnalysis).map(d => 
`| ${d.threshold}% | ${d.accepted} | ${d.rejected} | **${d.acceptanceRate}%** | ${d.avgScoreAccepted} | ${d.avgScoreRejected} |`
).join('\n')}

## Score Component Analysis

| Component | Average | Min | Max | Zero Values | Zero % |
|-----------|---------|-----|-----|-------------|--------|
${Object.entries(breakdownStats).map(([component, stats]) => 
`| ${component} | ${stats.avg} | ${stats.min} | ${stats.max} | ${stats.zeros} | ${stats.zeroPercent}% |`
).join('\n')}

## Borderline Phrases Analysis (60-79 points)

**Total Borderline:** ${borderlineAnalysis.total} phrases
**Selected for Review:** ${borderlineAnalysis.forReview} phrases

### Sample Borderline Phrases for Manual Review
${borderlineAnalysis.phrases.slice(0, 10).map(p => 
`- **${p.phrase}** (${p.category}) - Score: ${p.totalScore}
  - Local: ${p.breakdown?.localHeuristics || 0}, Wikidata: ${p.breakdown?.wikidata || 0}, Reddit: ${p.breakdown?.reddit || 0}, Category: ${p.breakdown?.categoryBoost || 0}`
).join('\n')}

## Potentially Under-Scored Famous Phrases

These phrases have high encyclopedic value (Wikidata ≥20) but low overall scores due to limited Reddit activity:

${suspiciousPhrases.slice(0, 10).map(p => 
`- **${p.phrase}** (${p.category}) - Score: ${p.totalScore}
  - Wikidata: ${p.wikidataScore}, Reddit: ${p.redditScore}
  - ${p.reasoning}`
).join('\n')}

## Recommendations

${recommendations.map((rec, i) => 
`### ${i + 1}. ${rec.type} (${rec.priority} Priority)

**Issue:** ${rec.description}

**Recommended Action:** ${rec.implementation}
`).join('\n')}

## Proposed Scoring Adjustments

Based on this analysis, we recommend implementing the following changes:

### Option A: Threshold Adjustment (Quick Fix)
- Lower acceptance threshold from 70% to 65%
- Expected acceptance rate increase: ${distributionAnalysis[65].acceptanceRate}%
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

1. **Immediate:** Manual review of ${borderlineAnalysis.forReview} borderline phrases
2. **Short-term:** Implement threshold adjustment to 65% if manual review shows good precision
3. **Long-term:** Proceed with Task 5.2 Wikipedia-aware scoring engine

---
*Report generated by scoring-calibration-analyzer.js*
`;

        fs.writeFileSync(this.reportPath, report, 'utf8');
        console.log(`✅ Report saved to: ${this.reportPath}`);
    }

    generateCategoryBreakdown(sample) {
        const categories = {};
        sample.forEach(phrase => {
            const cat = phrase.category || 'Unknown';
            if (!categories[cat]) {
                categories[cat] = { count: 0, totalScore: 0, accepted70: 0 };
            }
            categories[cat].count++;
            categories[cat].totalScore += phrase.totalScore;
            if (phrase.totalScore >= 70) categories[cat].accepted70++;
        });

        let breakdown = '';
        Object.entries(categories).forEach(([cat, stats]) => {
            const avgScore = (stats.totalScore / stats.count).toFixed(1);
            const acceptanceRate = (stats.accepted70 / stats.count * 100).toFixed(1);
            breakdown += `- **${cat}:** ${stats.count} phrases, avg ${avgScore} pts, ${acceptanceRate}% accepted\n`;
        });

        return breakdown;
    }

    async run() {
        try {
            console.log('🚀 Starting Scoring Calibration Analysis...\n');
            
            await this.loadData();
            
            const sample = this.samplePhrases();
            const distributionAnalysis = this.analyzeAcceptanceDistribution(sample);
            const breakdownStats = this.analyzeScoreBreakdown(sample);
            const borderlineAnalysis = this.identifyBorderlinePhrases(sample);
            const suspiciousPhrases = this.identifyLowScoringFamousPhrases(sample);
            const recommendations = this.generateRecommendations(
                distributionAnalysis, 
                breakdownStats, 
                borderlineAnalysis, 
                suspiciousPhrases
            );
            
            await this.generateReport(
                sample,
                distributionAnalysis,
                breakdownStats,
                borderlineAnalysis,
                suspiciousPhrases,
                recommendations
            );
            
            console.log('\n✅ Scoring Calibration Analysis Complete!');
            console.log(`📊 Key Metrics:`);
            console.log(`   - Sample size: ${sample.length} phrases`);
            console.log(`   - 70% threshold acceptance: ${distributionAnalysis[70].acceptanceRate}%`);
            console.log(`   - Borderline phrases: ${borderlineAnalysis.total}`);
            console.log(`   - Under-scored famous phrases: ${suspiciousPhrases.length}`);
            console.log(`   - Recommendations: ${recommendations.length}`);
            console.log(`\n📝 Full report: ${this.reportPath}`);
            
        } catch (error) {
            console.error('❌ Analysis failed:', error.message);
            process.exit(1);
        }
    }
}

// Run the analysis
if (require.main === module) {
    const analyzer = new ScoringCalibrationAnalyzer();
    analyzer.run();
}

module.exports = ScoringCalibrationAnalyzer; 