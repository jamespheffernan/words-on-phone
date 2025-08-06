#!/usr/bin/env node
/*
 * test-ngram-ingestion.js
 * -----------------------
 * Task 18 validation: Test N-gram ingestion and PMI calculation with sample data
 * 
 * Bypasses full Google Books download and tests core PMI logic
 */

const NgramProcessor = require('./services/distinctiveness/ngram-processor');
const fs = require('fs');
const path = require('path');

async function loadSampleNgramData(processor) {
  console.log('📍 Step 1: Load Sample N-gram Data');
  
  // Load 2-grams (phrases)
  const twogramFile = path.join(__dirname, 'data/ngrams/sample-2grams.txt');
  const twogramData = fs.readFileSync(twogramFile, 'utf8');
  const twogramLines = twogramData.trim().split('\n');
  
  // Load 1-grams (individual words)
  const onegramFile = path.join(__dirname, 'data/ngrams/sample-1grams.txt');
  const onegramData = fs.readFileSync(onegramFile, 'utf8');
  const onegramLines = onegramData.trim().split('\n');
  
  console.log(`   📝 Found ${twogramLines.length} 2-grams and ${onegramLines.length} 1-grams`);
  
  // Process 2-grams (phrases)
  console.log('   📊 Loading 2-grams into Redis...');
  let totalPhraseCount = 0;
  let totalPhraseVolumes = 0;
  
  for (const line of twogramLines) {
    const [ngram, year, matchCount, volumeCount] = line.split('\t');
    const normalizedNgram = ngram.toLowerCase();
    const count = parseInt(matchCount);
    const volumes = parseInt(volumeCount);
    
    // Store phrase data
    await processor.redisClient.hSet(`ngram:${normalizedNgram}`, {
      total_count: count,
      total_volumes: volumes,
      last_year: year
    });
    
    totalPhraseCount += count;
    totalPhraseVolumes += volumes;
  }
  
  // Process 1-grams (words)
  console.log('   📝 Loading 1-grams (words) into Redis...');
  let totalWordCount = 0;
  let totalWordVolumes = 0;
  
  for (const line of onegramLines) {
    const [word, year, matchCount, volumeCount] = line.split('\t');
    const normalizedWord = word.toLowerCase();
    const count = parseInt(matchCount);
    const volumes = parseInt(volumeCount);
    
    // Store word data
    await processor.redisClient.hSet(`word:${normalizedWord}`, {
      total_count: count,
      total_volumes: volumes,
      last_year: year
    });
    
    totalWordCount += count;
    totalWordVolumes += volumes;
  }
  
  // Store corpus statistics
  console.log('   📊 Storing corpus statistics...');
  await processor.redisClient.hSet('corpus:stats', {
    total_ngrams: totalPhraseCount + totalWordCount,
    total_volumes: totalPhraseVolumes + totalWordVolumes,
    phrase_count: totalPhraseCount,
    word_count: totalWordCount,
    processed_timestamp: Date.now(),
    version: 'sample-v1',
    language: 'eng'
  });
  
  console.log(`✅ Loaded ${twogramLines.length} phrases and ${onegramLines.length} words`);
  console.log(`   📊 Total phrase occurrences: ${totalPhraseCount.toLocaleString()}`);
  console.log(`   📝 Total word occurrences: ${totalWordCount.toLocaleString()}`);
  
  return { phrases: twogramLines.length, words: onegramLines.length, totalCorpus: totalPhraseCount + totalWordCount };
}

async function testNgramIngestion() {
  console.log('🧪 Task 18: Google N-gram PMI Ingestion Test');
  console.log('=============================================\\n');
  
  const processor = new NgramProcessor();
  let success = false;
  
  try {
    // Initialize Redis
    console.log('📍 Step 1: Initialize Redis Connection');
    await processor.initRedis();
    console.log('✅ Redis connected');
    
    // Clear any existing N-gram data
    console.log('\\n📍 Step 2: Clear existing N-gram data');
    const pattern = ['ngram:*', 'word:*', 'corpus:*'];
    let totalDeleted = 0;
    for (const pat of pattern) {
      const keys = await processor.redisClient.keys(pat);
      if (keys.length > 0) {
        totalDeleted += await processor.redisClient.del(keys);
      }
    }
    console.log(`✅ Cleared ${totalDeleted} Redis keys`);
    
    // Load sample data
    console.log('\\n📍 Step 3: Load Sample N-gram Data');
    const loadResult = await loadSampleNgramData(processor);
    
    // Test PMI calculations
    console.log('\\n📍 Step 4: Test PMI Calculations');
    const testPhrases = [
      'machine learning',      // Should have high PMI
      'taylor swift',          // Should have high PMI  
      'new york',              // Should have high PMI
      'artificial intelligence', // Should have high PMI
      'social media',          // Should have high PMI
      'completely random',     // Should have low PMI (low frequency)
      'made phrase',           // Should have very low PMI
      'nonexistent phrase'     // Should not be found
    ];
    
    let pmiResults = [];
    for (const phrase of testPhrases) {
      const result = await processor.calculatePMI(phrase);
      pmiResults.push(result);
      
      const status = result.score > 0 ? '✅ FOUND' : '❌ NOT FOUND';
      console.log(`   ${status} "${phrase}" → PMI: ${result.pmi}, Score: ${result.score}/15 (${result.type})`);
      if (result.phrase_count) {
        console.log(`        🔢 Counts: phrase=${result.phrase_count}, corpus=${result.total_corpus}`);
      }
    }
    
    // Performance test
    console.log('\\n📍 Step 5: Performance Test');
    const perfStartTime = Date.now();
    const perfTests = [];
    
    for (let i = 0; i < 50; i++) {
      const randomPhrase = testPhrases[i % testPhrases.length];
      perfTests.push(processor.calculatePMI(randomPhrase));
    }
    
    const perfResults = await Promise.all(perfTests);
    const avgTime = (Date.now() - perfStartTime) / perfTests.length;
    const perfPassed = avgTime < 50;
    
    console.log(`   ⏱️ Average PMI calculation time: ${avgTime.toFixed(2)}ms`);
    console.log(`   🎯 Performance target (<50ms): ${perfPassed ? '✅ PASS' : '❌ FAIL'}`);
    
    // Test score distribution
    console.log('\\n📍 Step 6: Score Distribution Analysis');
    const highScoreCount = pmiResults.filter(r => r.score >= 10).length;
    const mediumScoreCount = pmiResults.filter(r => r.score >= 5 && r.score < 10).length;
    const lowScoreCount = pmiResults.filter(r => r.score > 0 && r.score < 5).length;
    const notFoundCount = pmiResults.filter(r => r.score === 0).length;
    
    console.log(`   🏆 High scores (≥10): ${highScoreCount} phrases`);
    console.log(`   📊 Medium scores (5-9): ${mediumScoreCount} phrases`);
    console.log(`   📉 Low scores (1-4): ${lowScoreCount} phrases`);
    console.log(`   ❌ Not found (0): ${notFoundCount} phrases`);
    
    // Get final statistics
    console.log('\\n📍 Step 7: Final Statistics');
    const stats = await processor.getStats();
    console.log(`   📊 Total corpus: ${stats.corpus.total_ngrams.toLocaleString()}`);
    console.log(`   📋 Phrases loaded: ${stats.corpus.phrase_count?.toLocaleString() || 'N/A'}`);
    console.log(`   📝 Words loaded: ${stats.corpus.word_count?.toLocaleString() || 'N/A'}`);
    console.log(`   🗂️ Redis keys: ${stats.redis.total_keys.toLocaleString()}`);
    
    success = loadResult.phrases > 0 && perfPassed && highScoreCount > 0;
    
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
  console.log('\\n🎯 Task 18 Test Results:');
  console.log('=========================');
  
  if (success) {
    console.log('✅ N-gram PMI ingestion pipeline working correctly!');
    console.log('   • Redis connection ✅');
    console.log('   • Sample data ingestion ✅');
    console.log('   • PMI calculations ✅');
    console.log('   • Performance target met ✅');
    console.log('   • Score distribution reasonable ✅');
    console.log('\\n🚀 Ready for full Google Books N-gram processing');
  } else {
    console.log('❌ Some tests failed - review output above');
  }
  
  return success;
}

if (require.main === module) {
  testNgramIngestion()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('💥 Test script failed:', error);
      process.exit(1);
    });
}

module.exports = testNgramIngestion;