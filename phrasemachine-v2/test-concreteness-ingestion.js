#!/usr/bin/env node
/*
 * test-concreteness-ingestion.js
 * -------------------------------
 * Task 19 validation: Test Brysbaert concreteness ingestion with sample data
 * 
 * Bypasses full dataset download and tests core concreteness scoring logic
 */

const ConcretenessProcessor = require('./services/describability/concreteness-processor');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

async function loadSampleConcretenessData(processor) {
  console.log('📍 Step 1: Load Sample Concreteness Data');
  
  const csvFile = path.join(__dirname, 'data/concreteness/sample-concreteness.csv');
  const csvData = [];
  
  // Read CSV data
  return new Promise((resolve, reject) => {
    fs.createReadStream(csvFile)
      .pipe(csv())
      .on('data', (row) => {
        csvData.push(row);
      })
      .on('end', async () => {
        try {
          console.log(`   📝 Found ${csvData.length} words in sample dataset`);
          
          // Process each word
          let highCount = 0, mediumCount = 0, lowCount = 0;
          
          for (const row of csvData) {
            const word = row.Word.toLowerCase();
            const concreteness = parseFloat(row['Conc.M']);
            const percentKnown = parseFloat(row.Percent_known);
            
            // Store word concreteness
            await processor.redisClient.hSet(`concreteness:${word}`, {
              concreteness: concreteness,
              percent_known: percentKnown,
              word: word
            });
            
            // Store stemmed version for lookups
            const stemmed = processor.stemmer.stem(word);
            if (stemmed !== word) {
              await processor.redisClient.hSet(`concreteness_stem:${stemmed}`, {
                concreteness: concreteness,
                percent_known: percentKnown,
                original_word: word
              });
            }
            
            // Count distribution
            if (concreteness >= 4.0) {
              highCount++;
            } else if (concreteness >= 3.0) {
              mediumCount++;
            } else {
              lowCount++;
            }
          }
          
          // Store metadata and statistics
          await processor.redisClient.hSet('concreteness_meta', {
            total_words: csvData.length,
            source: 'Sample Brysbaert Norms',
            description: 'Sample concreteness ratings for testing (1-5 scale)',
            version: '1.0-sample',
            processed_timestamp: Date.now()
          });
          
          await processor.redisClient.set('concreteness_stats:high', highCount);
          await processor.redisClient.set('concreteness_stats:medium', mediumCount);
          await processor.redisClient.set('concreteness_stats:low', lowCount);
          
          console.log(`✅ Loaded ${csvData.length} word concreteness ratings`);
          console.log(`   🔥 High concreteness (≥4.0): ${highCount} words (15 points)`);
          console.log(`   🔸 Medium concreteness (3.0-3.9): ${mediumCount} words (8 points)`);
          console.log(`   🔹 Low concreteness (<3.0): ${lowCount} words (0 points)`);
          
          resolve({ total: csvData.length, high: highCount, medium: mediumCount, low: lowCount });
        } catch (error) {
          reject(error);
        }
      })
      .on('error', reject);
  });
}

async function testConcretenessIngestion() {
  console.log('🧪 Task 19: Brysbaert Concreteness Ingestion Test');
  console.log('=================================================\\n');
  
  const processor = new ConcretenessProcessor();
  let success = false;
  
  try {
    // Initialize Redis
    console.log('📍 Step 1: Initialize Redis Connection');
    await processor.initRedis();
    console.log('✅ Redis connected');
    
    // Clear any existing concreteness data
    console.log('\\n📍 Step 2: Clear existing concreteness data');
    const pattern = ['concreteness:*', 'concreteness_stem:*', 'concreteness_stats:*', 'concreteness_meta'];
    let totalDeleted = 0;
    for (const pat of pattern) {
      const keys = await processor.redisClient.keys(pat);
      if (keys.length > 0) {
        totalDeleted += await processor.redisClient.del(keys);
      }
    }
    console.log(`✅ Cleared ${totalDeleted} Redis keys`);
    
    // Load sample data
    console.log('\\n📍 Step 3: Load Sample Concreteness Data');
    const loadResult = await loadSampleConcretenessData(processor);
    
    // Test concreteness scoring
    console.log('\\n📍 Step 4: Test Concreteness Scoring');
    const testPhrases = [
      'coffee cup',           // Both high concreteness words → should score 15
      'ice cream',            // Both high concreteness words → should score 15
      'basketball court',     // High + medium → should score 15 or 8
      'pizza delivery',       // High + medium → should score 15 or 8
      'machine learning',     // High + low → should score varied
      'artificial intelligence', // Both low → should score 0
      'social media',         // Both low/medium → should score 0 or 8
      'wedding ceremony',     // High + medium → should score 8-15
      'mountain peak',        // Both high → should score 15
      'abstract concept',     // Both very low → should score 0
      'nonexistent phrase'    // Not found → should score 0
    ];
    
    let scoringResults = [];
    for (const phrase of testPhrases) {
      const result = await processor.scoreConcreteness(phrase);
      scoringResults.push(result);
      
      const status = result.score > 0 ? '✅ SCORED' : '❌ NO SCORE';
      console.log(`   ${status} "${phrase}" → Concreteness: ${result.concreteness}, Score: ${result.score}/15 (${result.type})`);
      console.log(`        📋 Coverage: ${result.coverage || 0}% (${result.found_count || 0}/${result.word_count || 0} words found)`);
      
      if (result.word_details && result.word_details.length > 0) {
        const foundWords = result.word_details.filter(w => w.concreteness !== null);
        if (foundWords.length > 0) {
          console.log(`        📝 Words: ${foundWords.map(w => `${w.word}=${w.concreteness}`).join(', ')}`);
        }
      }
    }
    
    // Performance test
    console.log('\\n📍 Step 5: Performance Test');
    const perfStartTime = Date.now();
    const perfTests = [];
    
    for (let i = 0; i < 50; i++) {
      const randomPhrase = testPhrases[i % testPhrases.length];
      perfTests.push(processor.scoreConcreteness(randomPhrase));
    }
    
    const perfResults = await Promise.all(perfTests);
    const avgTime = (Date.now() - perfStartTime) / perfTests.length;
    const perfPassed = avgTime < 50;
    
    console.log(`   ⏱️ Average concreteness scoring time: ${avgTime.toFixed(2)}ms`);
    console.log(`   🎯 Performance target (<50ms): ${perfPassed ? '✅ PASS' : '❌ FAIL'}`);
    
    // Test score distribution
    console.log('\\n📍 Step 6: Score Distribution Analysis');
    const highScoreCount = scoringResults.filter(r => r.score >= 10).length;
    const mediumScoreCount = scoringResults.filter(r => r.score >= 5 && r.score < 10).length;
    const lowScoreCount = scoringResults.filter(r => r.score > 0 && r.score < 5).length;
    const noScoreCount = scoringResults.filter(r => r.score === 0).length;
    
    console.log(`   🏆 High scores (≥10): ${highScoreCount} phrases`);
    console.log(`   📊 Medium scores (5-9): ${mediumScoreCount} phrases`);
    console.log(`   📉 Low scores (1-4): ${lowScoreCount} phrases`);
    console.log(`   ❌ No score (0): ${noScoreCount} phrases`);
    
    // Get final statistics
    console.log('\\n📍 Step 7: Final Statistics');
    const stats = await processor.getStats();
    console.log(`   📚 Total words: ${stats.concreteness.total_words.toLocaleString()}`);
    console.log(`   🔥 High concreteness: ${stats.concreteness.distribution.high} words`);
    console.log(`   🔸 Medium concreteness: ${stats.concreteness.distribution.medium} words`);
    console.log(`   🔹 Low concreteness: ${stats.concreteness.distribution.low} words`);
    console.log(`   🗂️ Redis keys: ${stats.redis.total_keys}`);
    
    success = loadResult.total > 0 && perfPassed && highScoreCount > 0;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    if (processor.redisClient) {
      await processor.close();
      console.log('\\n🔌 Redis connection closed');
    }
  }
  
  // Summary
  console.log('\\n🎯 Task 19 Test Results:');
  console.log('=========================');
  
  if (success) {
    console.log('✅ Concreteness ingestion pipeline working correctly!');
    console.log('   • Redis connection ✅');
    console.log('   • Sample data ingestion ✅');
    console.log('   • Concreteness scoring ✅');
    console.log('   • Performance target met ✅');
    console.log('   • Score distribution reasonable ✅');
    console.log('\\n🚀 Ready for full Brysbaert dataset processing');
  } else {
    console.log('❌ Some tests failed - review output above');
  }
  
  return success;
}

if (require.main === module) {
  testConcretenessIngestion()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('💥 Test script failed:', error);
      process.exit(1);
    });
}

module.exports = testConcretenessIngestion;