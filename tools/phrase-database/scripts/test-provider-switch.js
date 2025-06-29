#!/usr/bin/env node

/**
 * Test Provider Switch Script
 * 
 * Tests the OpenAI-first provider switch and attribution system.
 * Validates the Provider Switch Pre-Task requirements.
 */

const APIClient = require('../src/api-client');
const QualityPipeline = require('../src/quality-pipeline');
const PhraseDatabase = require('../src/database');

async function testProviderSwitch() {
  console.log('🧪 Testing Provider Switch and Attribution System\n');

  // Initialize components
  const apiClient = new APIClient({ debug: true });
  const qualityPipeline = new QualityPipeline({ debug: true });
  const database = new PhraseDatabase();
  
  try {
    await database.initialize();
    console.log('✅ Database initialized\n');

    // Test 1: API Client connectivity
    console.log('📡 Test 1: API Client Connectivity');
    console.log('===================================');
    
    const connectivity = await apiClient.testConnectivity();
    console.log('OpenAI Available:', connectivity.openai.available ? '✅' : '❌');
    if (connectivity.openai.error) {
      console.log('OpenAI Error:', connectivity.openai.error);
    }
    console.log('Gemini Available:', connectivity.gemini.available ? '✅' : '❌');
    if (connectivity.gemini.error) {
      console.log('Gemini Error:', connectivity.gemini.error);
    }
    console.log('');

    // Test 2: Provider fallback order (OpenAI first)
    console.log('🔄 Test 2: Provider Fallback Order');
    console.log('===================================');
    
    let result;
    try {
      result = await apiClient.generatePhrasesWithFallback('Movies & TV', 5, []);
      console.log(`✅ Generated ${result.phrases.length} phrases`);
      console.log(`🤖 Service used: ${result.service} (${result.modelId || 'unknown model'})`);
      console.log(`📝 Sample phrases: ${result.phrases.slice(0, 3).join(', ')}`);
      
      if (result.service === 'openai') {
        console.log('✅ OpenAI is correctly used as primary service');
      } else {
        console.log('⚠️  Fallback to Gemini occurred - check OpenAI configuration');
      }
    } catch (error) {
      console.log('❌ Provider fallback test failed:', error.message);
    }
    console.log('');

    // Test 3: Quality pipeline with attribution
    console.log('🔍 Test 3: Quality Pipeline with Attribution');
    console.log('=============================================');
    
    const testPhrases = ['Star Wars', 'Breaking Bad', 'Pizza Delivery', 'Quantum Chromodynamics'];
    const pipelineResult = await qualityPipeline.processBatch(
      testPhrases, 
      'Movies & TV', 
      'openai', 
      'gpt-4o'
    );
    
    console.log(`📊 Processed ${pipelineResult.processed.length} phrases`);
    console.log(`✅ Auto-accepted: ${pipelineResult.summary.autoAccepted}`);
    console.log(`🔍 Needs review: ${pipelineResult.summary.needsReview}`);
    console.log(`❌ Auto-rejected: ${pipelineResult.summary.autoRejected}`);
    console.log(`📈 Average score: ${pipelineResult.summary.averageScore}/100`);
    
    // Check attribution
    const hasAttribution = pipelineResult.processed.every(p => p.sourceProvider && p.modelId);
    console.log(`🏷️  Attribution complete: ${hasAttribution ? '✅' : '❌'}`);
    console.log('');

    // Test 4: Database storage with attribution
    console.log('💾 Test 4: Database Storage with Attribution');
    console.log('=============================================');
    
    const acceptedPhrases = pipelineResult.processed.filter(p => p.decision === 'accept');
    let storedCount = 0;
    
    for (const processed of acceptedPhrases) {
      try {
        await database.addPhrase(processed.phrase, processed.category, {
          score: processed.score,
          sourceProvider: processed.sourceProvider,
          modelId: processed.modelId,
          firstWord: database.extractFirstWord(processed.phrase)
        });
        storedCount++;
      } catch (error) {
        if (!error.message.includes('UNIQUE constraint failed')) {
          console.log(`⚠️  Failed to store "${processed.phrase}":`, error.message);
        }
      }
    }
    
    console.log(`💾 Stored ${storedCount} phrases with attribution`);
    
    // Verify attribution in database
    const storedPhrases = await database.all(`
      SELECT phrase, source_provider, model_id 
      FROM phrases 
      WHERE source_provider IS NOT NULL 
      ORDER BY added DESC 
      LIMIT 5
    `);
    
    console.log(`🔍 Recent phrases with attribution: ${storedPhrases.length}`);
    for (const phrase of storedPhrases) {
      console.log(`   "${phrase.phrase}" → ${phrase.source_provider}/${phrase.model_id}`);
    }
    console.log('');

    // Test 5: Success criteria validation
    console.log('✅ Test 5: Success Criteria Validation');
    console.log('======================================');
    
    const successCriteria = {
      'OpenAI as primary': result?.service === 'openai',
      'Attribution recorded': hasAttribution,
      'Database migration': storedPhrases.length > 0,
      'Quality pipeline': pipelineResult.summary.averageScore >= 50,
      'Processing time': pipelineResult.summary.processingTime < 10000 // <10 seconds
    };
    
    let allPassed = true;
    for (const [criterion, passed] of Object.entries(successCriteria)) {
      console.log(`${passed ? '✅' : '❌'} ${criterion}`);
      if (!passed) allPassed = false;
    }
    
    console.log('');
    console.log(`🎯 Overall Success: ${allPassed ? '✅ PASSED' : '❌ FAILED'}`);
    
    if (allPassed) {
      console.log('🚀 Provider Switch Pre-Task completed successfully!');
      console.log('   Ready to proceed with Task 0: Project Setup');
    } else {
      console.log('🔧 Some tests failed - review configuration before proceeding');
    }

  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    console.error(error.stack);
  } finally {
    await database.close();
  }
}

// Run tests
if (require.main === module) {
  testProviderSwitch();
}

module.exports = { testProviderSwitch }; 