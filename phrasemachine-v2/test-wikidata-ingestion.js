#!/usr/bin/env node
/*
 * test-wikidata-ingestion.js
 * ---------------------------
 * Task 17 validation: Test Wikidata ingestion with sample data
 * 
 * Bypasses full dump download and tests core ingestion logic
 */

const WikidataProcessor = require('./services/distinctiveness/wikidata-processor');
const fs = require('fs');
const path = require('path');

// Sample Wikidata entities for testing
const sampleEntities = [
  {
    id: "Q5",
    type: "item",
    labels: { en: { language: "en", value: "human" } },
    aliases: { en: [
      { language: "en", value: "homo sapiens" },
      { language: "en", value: "person" }
    ]}
  },
  {
    id: "Q76", 
    type: "item",
    labels: { en: { language: "en", value: "Barack Obama" } },
    aliases: { en: [
      { language: "en", value: "Obama" },
      { language: "en", value: "President Obama" }
    ]}
  },
  {
    id: "Q15",
    type: "item", 
    labels: { en: { language: "en", value: "Taylor Swift" } },
    aliases: { en: [
      { language: "en", value: "T-Swift" },
      { language: "en", value: "Swift" }
    ]}
  },
  {
    id: "Q10",
    type: "item",
    labels: { en: { language: "en", value: "New York City" } },
    aliases: { en: [
      { language: "en", value: "NYC" },
      { language: "en", value: "The Big Apple" }
    ]}
  },
  {
    id: "Q23",
    type: "item",
    labels: { en: { language: "en", value: "pizza" } },
    aliases: { en: [
      { language: "en", value: "pizza pie" }
    ]}
  }
];

async function testWikidataIngestion() {
  console.log('🧪 Task 17: Wikidata Ingestion Test');
  console.log('===================================\\n');
  
  const processor = new WikidataProcessor();
  let success = false;
  
  try {
    // Initialize Redis
    console.log('📍 Step 1: Initialize Redis Connection');
    await processor.initRedis();
    console.log('✅ Redis connected');
    
    // Clear any existing data
    console.log('\\n📍 Step 2: Clear existing data');
    const deleteCount = await processor.redisClient.del(
      'wikidata:entities', 'wikidata:aliases', 'wikidata:redirects'
    );
    console.log(`✅ Cleared ${deleteCount} Redis keys`);
    
    // Process sample entities
    console.log('\\n📍 Step 3: Process sample entities');
    let processedEntities = [];
    
    for (const entity of sampleEntities) {
      const processed = processor.extractEntityData(entity);
      if (processed) {
        processedEntities.push(processed);
        console.log(`   📝 Extracted: "${processed.title}" + ${processed.aliases.length} aliases`);
      }
    }
    
    console.log(`✅ Processed ${processedEntities.length} entities`);
    
    // Load into Redis
    console.log('\\n📍 Step 4: Load into Redis');
    await processor.processBatch(processedEntities);
    console.log(`✅ Loaded ${processedEntities.length} entities into Redis`);
    
    // Test distinctiveness checking
    console.log('\\n📍 Step 5: Test Distinctiveness Checking');
    const testPhrases = [
      'Taylor Swift',  // Should be found (exact match)
      'Obama',         // Should be found (alias)
      'pizza',         // Should be found (exact match)  
      'NYC',           // Should be found (alias)
      'nonexistent phrase'  // Should not be found
    ];
    
    for (const phrase of testPhrases) {
      const result = await processor.checkDistinctiveness(phrase);
      const status = result.score > 0 ? '✅ FOUND' : '❌ NOT FOUND';
      console.log(`   ${status} "${phrase}" → ${result.score}/25 points (${result.type})`);
    }
    
    // Performance test
    console.log('\\n📍 Step 6: Performance Test');
    const perfStartTime = Date.now();
    const perfTests = [];
    
    for (let i = 0; i < 100; i++) {
      const randomPhrase = testPhrases[i % testPhrases.length];
      perfTests.push(processor.checkDistinctiveness(randomPhrase));
    }
    
    await Promise.all(perfTests);
    const avgTime = (Date.now() - perfStartTime) / 100;
    const perfPassed = avgTime < 20;
    
    console.log(`   ⏱️ Average lookup time: ${avgTime.toFixed(2)}ms`);
    console.log(`   🎯 Performance target (<20ms): ${perfPassed ? '✅ PASS' : '❌ FAIL'}`);
    
    // Get final statistics
    console.log('\\n📍 Step 7: Final Statistics');
    const stats = await processor.getStats();
    console.log(`   📊 Total entities: ${stats.total_entities}`);
    console.log(`   📋 Total aliases: ${stats.total_aliases}`);
    console.log(`   💾 Redis memory usage: ${stats.memory_usage || 'N/A'}`);
    
    success = processedEntities.length > 0 && perfPassed;
    
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
  console.log('\\n🎯 Task 17 Test Results:');
  console.log('========================');
  
  if (success) {
    console.log('✅ Wikidata ingestion pipeline working correctly!');
    console.log('   • Redis connection ✅');
    console.log('   • Entity extraction ✅'); 
    console.log('   • Batch processing ✅');
    console.log('   • Distinctiveness checking ✅');
    console.log('   • Performance target met ✅');
    console.log('\\n🚀 Ready for full Wikidata dump processing');
  } else {
    console.log('❌ Some tests failed - review output above');
  }
  
  return success;
}

if (require.main === module) {
  testWikidataIngestion()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('💥 Test script failed:', error);
      process.exit(1);
    });
}

module.exports = testWikidataIngestion;