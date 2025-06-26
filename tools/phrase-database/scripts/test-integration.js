#!/usr/bin/env node

/**
 * Integration Test Script
 * 
 * Tests the complete phrase generation pipeline:
 * API Client → Quality Pipeline → Database Storage
 */

const APIClient = require('../src/api-client');
const QualityPipeline = require('../src/quality-pipeline');
const PhraseDatabase = require('../src/database');

async function runIntegrationTest() {
  console.log('🧪 Starting Integration Test\n');
  console.log('Testing: API Client → Quality Pipeline → Database Storage');
  console.log('===============================================\n');

  const testCategory = 'Movies & TV';
  const testCount = 5; // Small batch for testing
  
  try {
    // Initialize components
    console.log('🔧 Initializing components...');
    const apiClient = new APIClient({ debug: true });
    const qualityPipeline = new QualityPipeline({ debug: true });
    const database = new PhraseDatabase('./data/phrases.db');
    
    // Initialize database connection
    await database.initialize();
    
    // Test 1: API Connectivity
    console.log('\n📡 Test 1: API Connectivity');
    console.log('----------------------------');
    
    const connectivity = await apiClient.testConnectivity();
    console.log('Gemini available:', connectivity.gemini.available ? '✅' : '❌');
    if (!connectivity.gemini.available) {
      console.log('Gemini error:', connectivity.gemini.error);
    }
    
    console.log('OpenAI available:', connectivity.openai.available ? '✅' : '❌');
    if (!connectivity.openai.available) {
      console.log('OpenAI error:', connectivity.openai.error);
    }
    
    if (!connectivity.gemini.available && !connectivity.openai.available) {
      throw new Error('No AI services available - cannot proceed with test');
    }
    
    // Test 2: Phrase Generation
    console.log('\n🎯 Test 2: Phrase Generation');
    console.log('-----------------------------');
    
    const generationResult = await apiClient.generatePhrasesWithFallback(testCategory, testCount);
    console.log(`Generated ${generationResult.phrases.length} phrases via ${generationResult.service.toUpperCase()}`);
    console.log('Generated phrases:');
    generationResult.phrases.forEach((phrase, i) => {
      console.log(`  ${i + 1}. "${phrase}"`);
    });
    
    // Test 3: Quality Pipeline
    console.log('\n📊 Test 3: Quality Processing');
    console.log('------------------------------');
    
    const qualityResult = await qualityPipeline.processBatch(
      generationResult.phrases, 
      testCategory, 
      generationResult.service
    );
    
    console.log('\nQuality Results:');
    qualityResult.processed.forEach((item, i) => {
      const decision = item.decision === 'accept' ? '✅' : 
                     item.decision === 'review' ? '⚠️' : '❌';
      console.log(`  ${i + 1}. ${decision} "${item.phrase}" (${item.score}/100) - ${item.decision.toUpperCase()}`);
    });
    
    const stats = qualityPipeline.getBatchStatistics(qualityResult);
    console.log('\nBatch Statistics:');
    console.log(`  Acceptance Rate: ${stats.acceptanceRate}%`);
    console.log(`  Review Rate: ${stats.reviewRate}%`);
    console.log(`  Rejection Rate: ${stats.rejectionRate}%`);
    console.log(`  Average Score: ${stats.averageScore}/100 (Grade: ${stats.qualityGrade})`);
    console.log(`  Recommendation: ${stats.recommendation}`);
    
    // Test 4: Database Storage
    console.log('\n💾 Test 4: Database Storage');
    console.log('----------------------------');
    
    const acceptedPhrases = qualityResult.processed.filter(p => p.decision === 'accept');
    let addedCount = 0;
    
    for (const item of acceptedPhrases) {
      try {
        await database.addPhrase(item.phrase, testCategory, { score: item.score });
        addedCount++;
        console.log(`✅ Added: "${item.phrase}"`);
      } catch (error) {
        console.log(`❌ Failed to add: "${item.phrase}" - ${error.message}`);
      }
    }
    
    console.log(`\nAdded ${addedCount}/${acceptedPhrases.length} accepted phrases to database`);
    
    // Test 5: Database Verification
    console.log('\n🔍 Test 5: Database Verification');
    console.log('---------------------------------');
    
    const categoryPhrases = await database.getPhrasesByCategory(testCategory);
    console.log(`Total phrases in "${testCategory}" category: ${categoryPhrases.length}`);
    
    if (categoryPhrases.length > 0) {
      console.log('Sample phrases from database:');
      categoryPhrases.slice(-addedCount).forEach((phrase, i) => {
        console.log(`  ${i + 1}. "${phrase.phrase}" (Score: ${phrase.score || 'N/A'})`);
      });
    }
    
    // Final Summary
    console.log('\n🎉 Integration Test Complete');
    console.log('============================');
    console.log(`✅ Generated: ${generationResult.phrases.length} phrases`);
    console.log(`✅ Processed: ${qualityResult.processed.length} phrases`);
    console.log(`✅ Accepted: ${acceptedPhrases.length} phrases`);
    console.log(`✅ Stored: ${addedCount} phrases`);
    console.log(`📊 Success Rate: ${Math.round((addedCount / generationResult.phrases.length) * 100)}%`);
    
    if (addedCount > 0) {
      console.log('\n🎯 Integration test PASSED - End-to-end pipeline working!');
    } else {
      console.log('\n⚠️  Integration test PARTIAL - Pipeline works but no phrases met quality threshold');
    }
    
    // Clean up database connection
    await database.close();
    
  } catch (error) {
    console.error('\n❌ Integration test FAILED:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

// CLI execution
if (require.main === module) {
  runIntegrationTest()
    .then(() => {
      console.log('\n✅ Test completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { runIntegrationTest }; 