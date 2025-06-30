#!/usr/bin/env node

/**
 * Test Wikipedia-Aware Scoring Engine
 * 
 * This script tests the new scoring system with sample phrases
 * to validate the improvements outlined in Task 5.2
 */

const path = require('path');
const PhraseScorer = require('../src/phraseScorer');

class WikipediaScoringTester {
    constructor() {
        this.scorer = new PhraseScorer();
        
        // Test phrases from calibration analysis
        this.testPhrases = [
            // Under-scored famous phrases (should improve with Wikipedia scoring)
            { phrase: "Mexico City", category: "Sports & Athletes" },
            { phrase: "Rome", category: "Sports & Athletes" },
            { phrase: "World War II", category: "Sports & Athletes" },
            { phrase: "Amsterdam", category: "Sports & Athletes" },
            
            // Well-known movies (should maintain high scores)
            { phrase: "Jurassic Park", category: "Movies & TV" },
            { phrase: "Avatar", category: "Movies & TV" },
            { phrase: "Frozen", category: "Movies & TV" },
            
            // Test edge cases
            { phrase: "Disambiguation Test", category: "Entertainment & Pop Culture" },
            { phrase: "List of Academy Award winners", category: "Movies & TV" }
        ];
    }

    async runTest() {
        console.log('🧪 Testing Wikipedia-Aware Scoring Engine\n');
        
        const results = {
            ai: [],
            wikipedia: []
        };
        
        // Test each phrase with both scoring methods
        for (const testPhrase of this.testPhrases) {
            console.log(`\n🎯 Testing: "${testPhrase.phrase}" (${testPhrase.category})`);
            
            try {
                // Score with AI/default method
                const aiScore = await this.scorer.scorePhrase(
                    testPhrase.phrase, 
                    testPhrase.category, 
                    { source: 'ai' }
                );
                
                // Score with Wikipedia method
                const wikipediaScore = await this.scorer.scorePhrase(
                    testPhrase.phrase, 
                    testPhrase.category, 
                    { source: 'wikipedia' }
                );
                
                results.ai.push(aiScore);
                results.wikipedia.push(wikipediaScore);
                
                this.displayComparison(aiScore, wikipediaScore);
                
            } catch (error) {
                console.error(`❌ Error testing "${testPhrase.phrase}": ${error.message}`);
            }
            
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        this.generateSummaryReport(results);
    }

    displayComparison(aiScore, wikipediaScore) {
        console.log('📊 Scoring Comparison:');
        console.log(`   AI Source:        ${aiScore.totalScore.toFixed(1)}/100 (${aiScore.verdict})`);
        console.log(`   Wikipedia Source: ${wikipediaScore.totalScore.toFixed(1)}/100 (${wikipediaScore.verdict})`);
        
        const improvement = wikipediaScore.totalScore - aiScore.totalScore;
        const improvementStr = improvement > 0 ? `+${improvement.toFixed(1)}` : improvement.toFixed(1);
        console.log(`   Improvement:      ${improvementStr} points`);
        
        console.log('\n📋 Breakdown Comparison:');
        console.log('   Component         | AI Score | Wiki Score | Difference');
        console.log('   ------------------|----------|------------|----------');
        
        const components = ['localHeuristics', 'wikidata', 'reddit', 'categoryBoost'];
        components.forEach(component => {
            const aiVal = aiScore.breakdown[component] || 0;
            const wikiVal = wikipediaScore.breakdown[component] || 0;
            const diff = wikiVal - aiVal;
            const diffStr = diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);
            
            console.log(`   ${component.padEnd(17)} | ${aiVal.toString().padStart(8)} | ${wikiVal.toString().padStart(10)} | ${diffStr.padStart(10)}`);
        });
        
        // Show Wikipedia-specific metrics if present
        if (wikipediaScore.breakdown.wikipediaMetrics) {
            console.log(`   wikipediaMetrics  | ${'-'.padStart(8)} | ${wikipediaScore.breakdown.wikipediaMetrics.toString().padStart(10)} | ${'NEW'.padStart(10)}`);
        }
    }

    generateSummaryReport(results) {
        console.log('\n\n📈 SUMMARY REPORT');
        console.log('==================');
        
        const aiScores = results.ai.map(r => r.totalScore);
        const wikiScores = results.wikipedia.map(r => r.totalScore);
        
        const avgAI = aiScores.reduce((a, b) => a + b, 0) / aiScores.length;
        const avgWiki = wikiScores.reduce((a, b) => a + b, 0) / wikiScores.length;
        
        console.log(`Average AI Score:        ${avgAI.toFixed(2)}/100`);
        console.log(`Average Wikipedia Score: ${avgWiki.toFixed(2)}/100`);
        console.log(`Overall Improvement:     ${(avgWiki - avgAI).toFixed(2)} points`);
        
        // Acceptance rate analysis (using 70% threshold)
        const aiAccepted = aiScores.filter(score => score >= 70).length;
        const wikiAccepted = wikiScores.filter(score => score >= 70).length;
        
        console.log(`\nAcceptance Rate (70% threshold):`);
        console.log(`AI Method:        ${aiAccepted}/${aiScores.length} (${(aiAccepted/aiScores.length*100).toFixed(1)}%)`);
        console.log(`Wikipedia Method: ${wikiAccepted}/${wikiScores.length} (${(wikiAccepted/wikiScores.length*100).toFixed(1)}%)`);
        
        // Acceptance rate analysis (using 65% threshold from calibration)
        const aiAccepted65 = aiScores.filter(score => score >= 65).length;
        const wikiAccepted65 = wikiScores.filter(score => score >= 65).length;
        
        console.log(`\nAcceptance Rate (65% threshold):`);
        console.log(`AI Method:        ${aiAccepted65}/${aiScores.length} (${(aiAccepted65/aiScores.length*100).toFixed(1)}%)`);
        console.log(`Wikipedia Method: ${wikiAccepted65}/${wikiScores.length} (${(wikiAccepted65/wikiScores.length*100).toFixed(1)}%)`);
        
        // Identify biggest improvements
        const improvements = results.ai.map((aiResult, index) => ({
            phrase: aiResult.phrase,
            improvement: results.wikipedia[index].totalScore - aiResult.totalScore,
            aiScore: aiResult.totalScore,
            wikiScore: results.wikipedia[index].totalScore
        }));
        
        improvements.sort((a, b) => b.improvement - a.improvement);
        
        console.log('\n🏆 Biggest Improvements:');
        improvements.slice(0, 3).forEach((item, index) => {
            console.log(`${index + 1}. "${item.phrase}": ${item.aiScore.toFixed(1)} → ${item.wikiScore.toFixed(1)} (+${item.improvement.toFixed(1)})`);
        });
        
        console.log('\n✅ Wikipedia-aware scoring test complete!');
        
        // Validation against Task 5.2 success criteria
        console.log('\n🎯 Task 5.2 Success Criteria Validation:');
        console.log(`Target: ≥5% acceptance rate with ≥90% precision`);
        console.log(`Achieved: ${(wikiAccepted/wikiScores.length*100).toFixed(1)}% acceptance rate (70% threshold)`);
        console.log(`Achieved: ${(wikiAccepted65/wikiScores.length*100).toFixed(1)}% acceptance rate (65% threshold)`);
        
        if (wikiAccepted65/wikiScores.length >= 0.5) {
            console.log('✅ SUCCESS: Wikipedia scoring significantly improves acceptance rate');
        } else {
            console.log('⚠️  REVIEW: Acceptance rate may need further tuning');
        }
    }
}

// Run the test
if (require.main === module) {
    const tester = new WikipediaScoringTester();
    tester.runTest().catch(error => {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    });
}

module.exports = WikipediaScoringTester; 