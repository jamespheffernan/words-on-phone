const WikidataProcessor = require('./wikidata-processor');

/**
 * Test suite for Wikidata distinctiveness checking
 */
async function runTests() {
  console.log('🧪 Starting Wikidata Distinctiveness Tests');
  console.log('='.repeat(50));
  
  const processor = new WikidataProcessor({
    maxEntries: 1000 // Small sample for testing
  });
  
  let testsPassed = 0;
  let testsTotal = 0;
  
  function assert(condition, message) {
    testsTotal++;
    if (condition) {
      console.log(`✅ ${message}`);
      testsPassed++;
    } else {
      console.log(`❌ ${message}`);
    }
  }
  
  try {
    // Test 1: Redis Connection
    console.log('\n📋 Test 1: Redis Connection');
    const connected = await processor.initRedis();
    assert(connected, 'Should connect to Redis successfully');
    
    if (!connected) {
      console.log('⚠️ Skipping remaining tests - Redis not available');
      return;
    }
    
    // Test 2: Performance Check
    console.log('\n📋 Test 2: Performance Test');
    const start = Date.now();
    await processor.redisClient.set('test:performance', 'test');
    const duration = Date.now() - start;
    assert(duration < 50, `Redis operation should be <50ms (was ${duration}ms)`);
    
    // Test 3: Basic Distinctiveness Check
    console.log('\n📋 Test 3: Basic Distinctiveness Check');
    
    // Test with a phrase that should not exist
    const nonExistentResult = await processor.checkDistinctiveness('nonexistent_test_phrase_12345');
    assert(nonExistentResult.score === 0, 'Non-existent phrase should score 0');
    assert(nonExistentResult.type === 'not_found', 'Non-existent phrase should return not_found');
    assert(nonExistentResult.duration_ms < 50, `Check should be <50ms (was ${nonExistentResult.duration_ms}ms)`);
    
    // Test 4: Input Validation
    console.log('\n📋 Test 4: Input Validation');
    try {
      await processor.checkDistinctiveness('');
      assert(false, 'Empty phrase should throw error');
    } catch (error) {
      assert(true, 'Empty phrase properly rejected');
    }
    
    // Test 5: Entity Data Extraction
    console.log('\n📋 Test 5: Entity Data Extraction');
    
    // Mock Wikidata entity
    const mockEntity = {
      id: 'Q123',
      labels: {
        en: { value: 'Test Entity' }
      },
      aliases: {
        en: [
          { value: 'Test Alias 1' },
          { value: 'Test Alias 2' }
        ]
      },
      sitelinks: {
        enwiki: { title: 'Test Entity' },
        frwiki: { title: 'Entité Test' }
      }
    };
    
    const extracted = processor.extractEntityData(mockEntity);
    assert(extracted !== null, 'Should extract valid entity data');
    assert(extracted.id === 'Q123', 'Should preserve entity ID');
    assert(extracted.label === 'test entity', 'Should normalize label to lowercase');
    assert(extracted.aliases.length === 2, 'Should extract aliases');
    assert(extracted.sitelinks === 2, 'Should count sitelinks');
    
    // Test 6: Entity without English label
    console.log('\n📋 Test 6: Non-English Entity Handling');
    const nonEnglishEntity = {
      id: 'Q456',
      labels: {
        fr: { value: 'Entité Française' }
      }
    };
    
    const nonEnglishExtracted = processor.extractEntityData(nonEnglishEntity);
    assert(nonEnglishExtracted === null, 'Should reject entities without English labels');
    
    // Test 7: Statistics
    console.log('\n📋 Test 7: Statistics');
    const stats = await processor.getStats();
    assert(stats.connected === true, 'Stats should show Redis connected');
    assert(typeof stats.total_keys === 'number', 'Stats should include key count');
    
    console.log('\n📊 Test Results Summary:');
    console.log(`   ✅ Passed: ${testsPassed}/${testsTotal}`);
    console.log(`   📈 Success Rate: ${((testsPassed / testsTotal) * 100).toFixed(1)}%`);
    
    if (testsPassed === testsTotal) {
      console.log('🎉 All tests passed!');
    } else {
      console.log('⚠️ Some tests failed');
    }
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  } finally {
    await processor.close();
  }
}

// Run tests if called directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests }; 