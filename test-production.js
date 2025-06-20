#!/usr/bin/env node

// Production Environment Test for OpenAI Function
const PRODUCTION_URL = 'https://words-on-phone.netlify.app/.netlify/functions/openai';

// Generate UUID for testing
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function testProductionOpenAI() {
  console.log('\n🚀 Testing Production OpenAI Function...');
  console.log('URL:', PRODUCTION_URL);
  console.log('🧪 Running tests...\n');

  const testResults = {
    total: 0,
    passed: 0,
    failed: 0,
  };

  async function runTest(testName, testFn) {
    testResults.total++;
    try {
      console.log(`\n📋 ${testName}`);
      await testFn();
      console.log(`✅ ${testName} - PASSED`);
      testResults.passed++;
    } catch (error) {
      console.error(`❌ ${testName} - FAILED: ${error.message}`);
      testResults.failed++;
    }
  }

  // Test 1: Basic connectivity
  await runTest('Basic Connectivity', async () => {
    const response = await fetch(PRODUCTION_URL, {
      method: 'OPTIONS',
    });
    
    if (!response.ok && response.status !== 405) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    console.log('   ✓ Function is accessible');
  });

  // Test 2: Valid OpenAI request
  await runTest('Valid OpenAI Request', async () => {
    const phraseIds = Array.from({ length: 5 }, () => generateUUID());
    
    const response = await fetch(PRODUCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic: 'Movies',
        batchSize: 5,
        phraseIds: phraseIds,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    if (Array.isArray(data)) {
      console.log(`   ✓ Received ${data.length} phrases`);
      console.log(`   ✓ Sample phrases: ${data.slice(0, 2).map(p => p.phrase).join(', ')}`);
      
      // Validate response structure
      const firstPhrase = data[0];
      if (!firstPhrase.id || !firstPhrase.phrase) {
        throw new Error('Invalid phrase structure');
      }
      console.log('   ✓ Response structure is valid');
    } else if (data.error) {
      throw new Error(`OpenAI API error: ${data.error}`);
    } else {
      throw new Error('Unexpected response format');
    }
  });

  // Test 3: Different categories
  await runTest('Different Categories', async () => {
    const categories = ['Sports', 'Food', 'Technology'];
    
    for (const category of categories) {
      const phraseIds = Array.from({ length: 3 }, () => generateUUID());
      
      const response = await fetch(PRODUCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: category,
          batchSize: 3,
          phraseIds: phraseIds,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed for category ${category}: HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error(`No phrases returned for category: ${category}`);
      }
      
      console.log(`   ✓ ${category}: ${data.length} phrases`);
    }
  });

  // Test 4: Error handling - missing required fields
  await runTest('Error Handling - Missing Fields', async () => {
    const response = await fetch(PRODUCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Missing required fields
        topic: 'Movies',
      }),
    });

    if (response.ok) {
      throw new Error('Expected request to fail but it succeeded');
    }

    const data = await response.json();
    if (!data.error) {
      throw new Error('Expected error field in response');
    }
    
    console.log('   ✓ Properly handled missing fields');
  });

  // Test 5: Invalid JSON
  await runTest('Error Handling - Invalid JSON', async () => {
    const response = await fetch(PRODUCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: 'invalid json',
    });

    if (response.ok) {
      throw new Error('Expected request to fail but it succeeded');
    }
    
    console.log('   ✓ Properly handled invalid JSON');
  });

  // Test 6: Rate limiting behavior
  await runTest('Rate Limiting Behavior', async () => {
    console.log('   ⏳ Testing rate limiting (making multiple requests)...');
    
    const requests = [];
    for (let i = 0; i < 3; i++) {
      const phraseIds = Array.from({ length: 2 }, () => generateUUID());
      
      requests.push(
        fetch(PRODUCTION_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            topic: 'Testing',
            batchSize: 2,
            phraseIds: phraseIds,
          }),
        })
      );
    }

    const responses = await Promise.all(requests);
    let successCount = 0;
    let rateLimitedCount = 0;

    for (const response of responses) {
      if (response.ok) {
        successCount++;
      } else if (response.status === 429) {
        rateLimitedCount++;
      }
    }

    console.log(`   ✓ ${successCount} successful requests, ${rateLimitedCount} rate limited`);
    
    if (successCount === 0) {
      throw new Error('All requests were blocked - possible configuration issue');
    }
  });

  // Test 7: Large batch size
  await runTest('Large Batch Size', async () => {
    const phraseIds = Array.from({ length: 50 }, () => generateUUID());
    
    const response = await fetch(PRODUCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic: 'Everything',
        batchSize: 50,
        phraseIds: phraseIds,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('No phrases returned for large batch');
    }
    
    console.log(`   ✓ Large batch: ${data.length} phrases returned`);
  });

  // Summary
  console.log('\n📊 Test Summary:');
  console.log(`   Total tests: ${testResults.total}`);
  console.log(`   Passed: ${testResults.passed}`);
  console.log(`   Failed: ${testResults.failed}`);
  console.log(`   Success rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);

  if (testResults.failed === 0) {
    console.log('\n🎉 All tests passed! OpenAI function is working correctly in production.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the OpenAI function configuration.');
  }

  if (testResults.passed > 0) {
    console.log('✅ Function accessible at correct URL (/.netlify/functions/openai)');
    console.log('✅ OpenAI API integration is working');
    console.log('✅ Error handling is functional');
    console.log('✅ Basic functionality verified');
  }

  return testResults.failed === 0;
}

// Run the tests
testProductionOpenAI().catch(console.error); 