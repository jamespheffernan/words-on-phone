// Test script for OpenAI serverless function
// Usage: node test-openai.js

async function testOpenAIFunction() {
  const FUNCTION_URL = process.env.FUNCTION_URL || 'http://localhost:8888/.netlify/functions/openai';
  
  console.log('Testing OpenAI Serverless Function');
  console.log('URL:', FUNCTION_URL);
  console.log('');

  // Helper function to generate UUIDs
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Test 1: Generate phrases with a specific topic
  console.log('Test 1: Generate 5 phrases for "90s Movies"');
  const phraseIds1 = Array(5).fill(null).map(() => generateUUID());
  
  try {
    const response1 = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic: '90s Movies',
        batchSize: 5,
        phraseIds: phraseIds1
      })
    });

    console.log('Response status:', response1.status);
    const data1 = await response1.json();
    console.log('Response:', JSON.stringify(data1, null, 2));
    
    // Validate response
    if (Array.isArray(data1)) {
      console.log(`✅ Received ${data1.length} phrases`);
      data1.forEach((term, i) => {
        console.log(`  ${i + 1}. "${term.phrase}" (ID: ${term.id})`);
        if (term.difficulty) {
          console.log(`     Difficulty: ${term.difficulty}`);
        }
      });
    } else if (data1.error) {
      console.log('❌ Error response:', data1.error);
    }
  } catch (error) {
    console.error('❌ Request failed:', error);
  }

  console.log('\n---\n');

  // Test 2: Generate phrases without a topic
  console.log('Test 2: Generate 10 general phrases (no topic)');
  const phraseIds2 = Array(10).fill(null).map(() => generateUUID());
  
  try {
    const response2 = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        batchSize: 10,
        phraseIds: phraseIds2
      })
    });

    console.log('Response status:', response2.status);
    const data2 = await response2.json();
    
    if (Array.isArray(data2)) {
      console.log(`✅ Received ${data2.length} phrases`);
      data2.forEach((term, i) => {
        console.log(`  ${i + 1}. "${term.phrase}" (ID: ${term.id})`);
        if (term.difficulty) {
          console.log(`     Difficulty: ${term.difficulty}`);
        }
      });
    } else if (data2.error) {
      console.log('❌ Error response:', data2.error);
    }
  } catch (error) {
    console.error('❌ Request failed:', error);
  }

  console.log('\n---\n');

  // Test 3: Test CORS preflight
  console.log('Test 3: CORS preflight request');
  try {
    const response3 = await fetch(FUNCTION_URL, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:5173',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });

    console.log('Response status:', response3.status);
    console.log('CORS headers:');
    console.log('  Access-Control-Allow-Origin:', response3.headers.get('Access-Control-Allow-Origin'));
    console.log('  Access-Control-Allow-Methods:', response3.headers.get('Access-Control-Allow-Methods'));
    console.log('  Access-Control-Allow-Headers:', response3.headers.get('Access-Control-Allow-Headers'));
    
    if (response3.status === 200) {
      console.log('✅ CORS preflight successful');
    } else {
      console.log('❌ CORS preflight failed');
    }
  } catch (error) {
    console.error('❌ CORS test failed:', error);
  }

  console.log('\n---\n');

  // Test 4: Error handling - missing parameters
  console.log('Test 4: Error handling - missing parameters');
  try {
    const response4 = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic: 'Test'
        // Missing batchSize and phraseIds
      })
    });

    console.log('Response status:', response4.status);
    const data4 = await response4.json();
    console.log('Response:', data4);
    
    if (response4.status === 400 && data4.error) {
      console.log('✅ Error handling works correctly');
    } else {
      console.log('❌ Unexpected response for error case');
    }
  } catch (error) {
    console.error('❌ Request failed:', error);
  }

  console.log('\n---\n');

  // Test 5: Large batch request
  console.log('Test 5: Large batch request (50 phrases)');
  const phraseIds5 = Array(50).fill(null).map(() => generateUUID());
  
  try {
    const response5 = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic: 'Kitchen Items',
        batchSize: 50,
        phraseIds: phraseIds5
      })
    });

    console.log('Response status:', response5.status);
    const data5 = await response5.json();
    
    if (Array.isArray(data5)) {
      console.log(`✅ Received ${data5.length} phrases`);
      console.log('First 5 phrases:');
      data5.slice(0, 5).forEach((term, i) => {
        console.log(`  ${i + 1}. "${term.phrase}"`);
      });
      console.log(`  ... and ${data5.length - 5} more`);
      
      // Check difficulty distribution
      const difficulties = data5.reduce((acc, term) => {
        if (term.difficulty) {
          acc[term.difficulty] = (acc[term.difficulty] || 0) + 1;
        }
        return acc;
      }, {});
      console.log('Difficulty distribution:', difficulties);
    } else if (data5.error) {
      console.log('❌ Error response:', data5.error);
    }
  } catch (error) {
    console.error('❌ Request failed:', error);
  }
}

// Run the tests
testOpenAIFunction().catch(console.error); 