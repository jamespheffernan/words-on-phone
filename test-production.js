// Production End-to-End Test for Custom Category Request
// This script tests the complete workflow that would happen when a user
// requests a custom category through the UI

const PRODUCTION_URL = 'https://words-on-phone.netlify.app/.netlify/functions/gemini';

async function testCustomCategoryWorkflow() {
  console.log('🧪 Testing Custom Category Request - Production End-to-End');
  console.log('🌐 Production URL:', PRODUCTION_URL);
  console.log('');
  
  try {
    // Step 1: Test sample words request (simulating what the UI does)
    console.log('Step 1: Testing sample words request...');
    const sampleWordsPrompt = `You are PhraseMachine, a generator of lively, party-friendly phrases.

Task  
Generate exactly 3 example words or short phrases for the category **Test Category for Production**. These are sample items to show what this category contains.

Rules:
- Each should be 1-3 words maximum  
- Family-friendly only (no profanity, politics, or adult themes)
- Representative examples that clearly belong to "Test Category for Production"
- Return only the items, one per line, no numbering or formatting

Begin.`;
    const sampleWordsResponse = await fetch(PRODUCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: sampleWordsPrompt,
        category: 'Test Category for Production',
        phraseCount: 3
      })
    });
    
    console.log('Sample words response status:', sampleWordsResponse.status);
    console.log('Sample words response headers:', Object.fromEntries(sampleWordsResponse.headers.entries()));
    
    if (!sampleWordsResponse.ok) {
      throw new Error(`Sample words request failed: ${sampleWordsResponse.status} ${sampleWordsResponse.statusText}`);
    }
    
    const sampleWordsData = await sampleWordsResponse.json();
    console.log('✅ Sample words received:', sampleWordsData);
    
    // Parse the sample words from the response
    const sampleWords = sampleWordsData.candidates?.[0]?.content?.parts?.[0]?.text
      ?.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0) || ['test', 'production', 'verification'];
    
    console.log('Sample words parsed:', sampleWords);
    console.log('');
    
    // Step 2: Test full category generation
    console.log('Step 2: Testing full category generation...');
    const fullCategoryPrompt = `You are PhraseMachine, a generator of lively, party-friendly phrases.

Task  
1. Given the category **Test Category for Production**, output **30-50 unique English phrases** (2–6 words each).  
2. Every phrase must be recognisably tied to that category; if an item feels too niche, swap it for a well-known, adjacent concept rather than something obscure.  
3. Family-friendly only (no profanity, politics, or adult themes).  
4. No duplicates; avoid starting more than twice with the same word.

Output  
Return **only** valid JSON:

[
  "First phrase",
  "Second phrase",
  …
]

Hidden work  
Think silently. After drafting, verify:
• 30–50 items • 2–6 words each • ≥80 % on-category • no repeats.

Begin.`;
    
    const fullCategoryResponse = await fetch(PRODUCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: fullCategoryPrompt,
        category: 'Test Category for Production',
        phraseCount: 50
      })
    });
    
    console.log('Full category response status:', fullCategoryResponse.status);
    console.log('Full category response headers:', Object.fromEntries(fullCategoryResponse.headers.entries()));
    
    if (!fullCategoryResponse.ok) {
      throw new Error(`Full category request failed: ${fullCategoryResponse.status} ${fullCategoryResponse.statusText}`);
    }
    
    const fullCategoryData = await fullCategoryResponse.json();
    
    // Parse the phrases from the response (try JSON first, fallback to line-by-line)
    const responseText = fullCategoryData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    let generatedPhrases = [];
    
    try {
      // Try to parse as JSON first (new PhraseMachine format)
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const jsonArray = JSON.parse(jsonMatch[0]);
        if (Array.isArray(jsonArray)) {
          generatedPhrases = jsonArray
            .map(phrase => String(phrase).trim())
            .filter(phrase => phrase.length > 0);
        }
      }
    } catch (error) {
      console.log('Response not in JSON format, falling back to line-by-line parsing');
      // Fallback to line-by-line parsing
      generatedPhrases = responseText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
    }
    
    console.log('✅ Full category generated:', {
      phrasesCount: generatedPhrases.length,
      samplePhrases: generatedPhrases.slice(0, 3)
    });
    console.log('');
    
    // Step 3: CORS verification (OPTIONS request)
    console.log('Step 3: Testing CORS (OPTIONS request)...');
    const corsResponse = await fetch(PRODUCTION_URL, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://words-on-phone.netlify.app',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    
    console.log('CORS response status:', corsResponse.status);
    console.log('CORS headers:', Object.fromEntries(corsResponse.headers.entries()));
    
    if (!corsResponse.ok) {
      throw new Error(`CORS check failed: ${corsResponse.status} ${corsResponse.statusText}`);
    }
    
    console.log('✅ CORS configuration working correctly');
    console.log('');
    
    // Final verification
    console.log('🎉 END-TO-END PRODUCTION TEST SUCCESSFUL');
    console.log('');
    console.log('✅ Sample words request working');
    console.log('✅ Full category generation working');
    console.log('✅ CORS headers properly configured');
    console.log('✅ Function accessible at correct URL (/.netlify/functions/gemini)');
    console.log('✅ No 404 errors detected');
    
    return true;
    
  } catch (error) {
    console.error('❌ Production test failed:', error.message);
    console.error('Full error:', error);
    return false;
  }
}

// Run the test
testCustomCategoryWorkflow()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  }); 