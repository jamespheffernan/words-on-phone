#!/usr/bin/env node

/**
 * Batch Score All Phrases
 * 
 * This script loads all phrases from the main phrases.json file
 * and runs them through the PhraseMachine v2 scoring system.
 * Results are exported to CSV for analysis.
 */

const fs = require('fs');
const path = require('path');
const DecisionEngine = require('./services/scoring/decision-engine');

async function batchScoreAllPhrases() {
  console.log('🎯 PhraseMachine v2 - Batch Scoring All Phrases');
  console.log('===============================================\n');

  try {
    // Load phrases from main database
    const phrasesPath = path.join(__dirname, '../phrases.json');
    console.log(`📂 Loading phrases from: ${phrasesPath}`);
    
    if (!fs.existsSync(phrasesPath)) {
      throw new Error(`Phrases file not found: ${phrasesPath}`);
    }
    
    const phrasesData = JSON.parse(fs.readFileSync(phrasesPath, 'utf8'));
    
    // Extract all phrases from all categories
    const allPhrases = [];
    for (const [category, phrases] of Object.entries(phrasesData)) {
      for (const phrase of phrases) {
        allPhrases.push({
          phrase: phrase,
          category: category
        });
      }
    }
    
    console.log(`📊 Total phrases loaded: ${allPhrases.length}`);
    console.log(`📂 Categories: ${Object.keys(phrasesData).length}`);
    
    // Initialize DecisionEngine
    console.log('\n🔄 Initializing PhraseMachine v2 DecisionEngine...');
    const decisionEngine = new DecisionEngine();
    
    const initStart = Date.now();
    const initResults = await decisionEngine.initialize();
    const initDuration = Date.now() - initStart;
    
    console.log(`✅ Initialization completed in ${initDuration}ms`);
    console.log('📊 Component status:', initResults);
    
    const readyComponents = Object.values(initResults).filter(Boolean).length;
    console.log(`✅ ${readyComponents}/4 scoring components ready`);
    
    if (readyComponents < 2) {
      throw new Error('Insufficient components initialized - need at least 2 for meaningful scoring');
    }
    
    // Batch scoring configuration
    const BATCH_SIZE = 50; // Process 50 phrases at a time
    const results = [];
    let processedCount = 0;
    
    console.log(`\n🏃 Starting batch scoring (${BATCH_SIZE} phrases per batch)...\n`);
    
    const overallStart = Date.now();
    
    // Process in batches
    for (let i = 0; i < allPhrases.length; i += BATCH_SIZE) {
      const batch = allPhrases.slice(i, i + BATCH_SIZE);
      const batchStart = Date.now();
      
      console.log(`📦 Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(allPhrases.length/BATCH_SIZE)} (${batch.length} phrases)`);
      
      // Score all phrases in batch in parallel
      const batchPromises = batch.map(async (item) => {
        try {
          const startTime = Date.now();
          const result = await decisionEngine.scorePhrase(item.phrase);
          const duration = Date.now() - startTime;
          
          return {
            phrase: item.phrase,
            category: item.category,
            final_score: result.final_score,
            quality_classification: result.quality_classification,
            decision: result.decision,
            component_scores: result.component_scores,
            duration_ms: duration,
            timestamp: result.timestamp
          };
        } catch (error) {
          console.error(`❌ Error scoring "${item.phrase}":`, error.message);
          return {
            phrase: item.phrase,
            category: item.category,
            final_score: 0,
            quality_classification: 'error',
            decision: 'auto_reject',
            component_scores: { distinctiveness: 0, describability: 0, legacy_heuristics: 0, cultural_validation: 0 },
            duration_ms: 0,
            error: error.message,
            timestamp: new Date().toISOString()
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      processedCount += batch.length;
      
      const batchDuration = Date.now() - batchStart;
      const avgDuration = batchDuration / batch.length;
      
      console.log(`   ✅ Batch completed in ${batchDuration}ms (avg: ${avgDuration.toFixed(1)}ms per phrase)`);
      console.log(`   📈 Progress: ${processedCount}/${allPhrases.length} (${((processedCount/allPhrases.length)*100).toFixed(1)}%)`);
      
      // Show some sample results from this batch
      const highScores = batchResults.filter(r => r.final_score >= 60).length;
      const mediumScores = batchResults.filter(r => r.final_score >= 40 && r.final_score < 60).length;
      const lowScores = batchResults.filter(r => r.final_score < 40).length;
      
      console.log(`   🎯 Scores: ${highScores} high (≥60), ${mediumScores} medium (40-59), ${lowScores} low (<40)`);
      console.log('');
    }
    
    const overallDuration = Date.now() - overallStart;
    const avgDuration = overallDuration / allPhrases.length;
    
    console.log('🎉 Batch Scoring Complete!');
    console.log('==========================');
    console.log(`⏱️ Total time: ${(overallDuration/1000).toFixed(1)} seconds`);
    console.log(`⚡ Average per phrase: ${avgDuration.toFixed(1)}ms`);
    console.log(`📊 Total phrases scored: ${results.length}`);
    
    // Analyze results
    const scoreDistribution = {
      excellent: results.filter(r => r.final_score >= 80).length,
      good: results.filter(r => r.final_score >= 60 && r.final_score < 80).length,
      acceptable: results.filter(r => r.final_score >= 40 && r.final_score < 60).length,
      poor: results.filter(r => r.final_score >= 20 && r.final_score < 40).length,
      unacceptable: results.filter(r => r.final_score < 20).length,
      errors: results.filter(r => r.quality_classification === 'error').length
    };
    
    console.log('\n📈 Score Distribution:');
    console.log(`   🌟 Excellent (80-100): ${scoreDistribution.excellent} (${((scoreDistribution.excellent/results.length)*100).toFixed(1)}%)`);
    console.log(`   ✅ Good (60-79): ${scoreDistribution.good} (${((scoreDistribution.good/results.length)*100).toFixed(1)}%)`);
    console.log(`   🔶 Acceptable (40-59): ${scoreDistribution.acceptable} (${((scoreDistribution.acceptable/results.length)*100).toFixed(1)}%)`);
    console.log(`   🔸 Poor (20-39): ${scoreDistribution.poor} (${((scoreDistribution.poor/results.length)*100).toFixed(1)}%)`);
    console.log(`   ❌ Unacceptable (0-19): ${scoreDistribution.unacceptable} (${((scoreDistribution.unacceptable/results.length)*100).toFixed(1)}%)`);
    if (scoreDistribution.errors > 0) {
      console.log(`   ⚠️ Errors: ${scoreDistribution.errors} (${((scoreDistribution.errors/results.length)*100).toFixed(1)}%)`);
    }
    
    // Show top scoring phrases
    const topPhrases = results
      .filter(r => r.quality_classification !== 'error')
      .sort((a, b) => b.final_score - a.final_score)
      .slice(0, 10);
    
    console.log('\n🏆 Top 10 Scoring Phrases:');
    topPhrases.forEach((result, index) => {
      console.log(`   ${index + 1}. "${result.phrase}" - ${result.final_score.toFixed(1)}/100 (${result.category})`);
    });
    
    // Show bottom scoring phrases
    const bottomPhrases = results
      .filter(r => r.quality_classification !== 'error')
      .sort((a, b) => a.final_score - b.final_score)
      .slice(0, 10);
    
    console.log('\n⬇️ Bottom 10 Scoring Phrases:');
    bottomPhrases.forEach((result, index) => {
      console.log(`   ${index + 1}. "${result.phrase}" - ${result.final_score.toFixed(1)}/100 (${result.category})`);
    });
    
    // Export results to CSV
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const csvPath = `batch-scoring-results-${timestamp}.csv`;
    
    console.log(`\n💾 Exporting results to: ${csvPath}`);
    
    const csvHeaders = [
      'phrase',
      'category', 
      'final_score',
      'quality_classification',
      'decision',
      'distinctiveness_score',
      'describability_score', 
      'legacy_heuristics_score',
      'cultural_validation_score',
      'duration_ms',
      'timestamp',
      'error'
    ];
    
    const csvRows = results.map(result => [
      `"${result.phrase.replace(/"/g, '""')}"`,
      `"${result.category}"`,
      result.final_score.toFixed(2),
      result.quality_classification,
      result.decision,
      result.component_scores.distinctiveness || 0,
      result.component_scores.describability || 0,
      result.component_scores.legacy_heuristics || 0,
      result.component_scores.cultural_validation || 0,
      result.duration_ms,
      result.timestamp,
      result.error ? `"${result.error.replace(/"/g, '""')}"` : ''
    ]);
    
    const csvContent = [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n');
    fs.writeFileSync(csvPath, csvContent);
    
    console.log(`✅ Results exported to ${csvPath}`);
    console.log(`📊 CSV contains ${results.length} scored phrases with detailed component breakdowns`);
    
    // Summary statistics
    const avgScore = results.reduce((sum, r) => sum + r.final_score, 0) / results.length;
    const maxScore = Math.max(...results.map(r => r.final_score));
    const minScore = Math.min(...results.map(r => r.final_score));
    
    console.log('\n📊 Summary Statistics:');
    console.log(`   📈 Average score: ${avgScore.toFixed(1)}/100`);
    console.log(`   🏆 Highest score: ${maxScore.toFixed(1)}/100`);
    console.log(`   ⬇️ Lowest score: ${minScore.toFixed(1)}/100`);
    
    const acceptableOrBetter = results.filter(r => r.final_score >= 40).length;
    const acceptanceRate = (acceptableOrBetter / results.length) * 100;
    
    console.log(`   ✅ Acceptable or better (≥40): ${acceptableOrBetter}/${results.length} (${acceptanceRate.toFixed(1)}%)`);
    
    console.log('\n🎉 Batch scoring completed successfully!');
    console.log(`📄 Open ${csvPath} to analyze detailed results`);
    
  } catch (error) {
    console.error('❌ Batch scoring failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the batch scoring
if (require.main === module) {
  batchScoreAllPhrases();
}

module.exports = batchScoreAllPhrases;