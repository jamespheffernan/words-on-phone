// Quick test for parallel batching implementation
// This simulates the CategoryRequestService behavior

const PHRASES_PER_REQUEST = 15;
const TOTAL_PHRASES_PER_CATEGORY = 45;

// Mock API call that returns phrases after a delay
const mockApiCall = async (categoryName, batchNumber) => {
  console.log(`📦 Starting batch ${batchNumber} for ${categoryName}...`);
  
  // Simulate API delay (2-3 seconds)
  const delay = 2000 + Math.random() * 1000;
  await new Promise(resolve => setTimeout(resolve, delay));
  
  // Generate mock phrases with some potential duplicates
  const phrases = [];
  for (let i = 0; i < PHRASES_PER_REQUEST; i++) {
    const phraseNum = (batchNumber - 1) * PHRASES_PER_REQUEST + i + 1;
    // Introduce some duplicates (10% chance)
    const isDuplicate = Math.random() < 0.1;
    const text = isDuplicate 
      ? `Common Phrase ${Math.floor(Math.random() * 5) + 1}` 
      : `${categoryName} Phrase ${phraseNum}`;
    
    phrases.push({
      phraseId: `phrase_${phraseNum}_${Date.now()}_${Math.random()}`,
      text,
      customCategory: categoryName,
      category: 'Everything',
      source: 'openai',
      fetchedAt: Date.now()
    });
  }
  
  console.log(`✅ Batch ${batchNumber} completed with ${phrases.length} phrases`);
  return phrases;
};

// Deduplication function (matches the service implementation)
const deduplicateAcrossBatches = (phrases) => {
  const seenTexts = new Set();
  const uniquePhrases = [];
  
  for (const phrase of phrases) {
    const normalizedText = phrase.text.toLowerCase();
    if (!seenTexts.has(normalizedText)) {
      seenTexts.add(normalizedText);
      uniquePhrases.push(phrase);
    }
  }
  
  return uniquePhrases;
};

// Main parallel batching function
const generatePhrasesWithBatching = async (categoryName) => {
  console.log(`🚀 Starting parallel batch generation for category: ${categoryName}`);
  const startTime = Date.now();
  
  // Launch 3 parallel batch requests
  const batchPromises = Array.from({ length: 3 }, (_, index) => 
    mockApiCall(categoryName, index + 1)
  );
  
  // Wait for all batches to complete (or fail)
  const batchResults = await Promise.allSettled(batchPromises);
  
  // Collect successful batches
  const allPhrases = [];
  let successfulBatches = 0;
  
  for (const [index, result] of batchResults.entries()) {
    if (result.status === 'fulfilled') {
      allPhrases.push(...result.value);
      successfulBatches++;
      console.log(`✅ Batch ${index + 1} succeeded with ${result.value.length} phrases`);
    } else {
      console.warn(`❌ Batch ${index + 1} failed:`, result.reason);
    }
  }
  
  if (successfulBatches === 0) {
    throw new Error('All batch requests failed. Please try again.');
  }
  
  // Deduplicate across batches
  const uniquePhrases = deduplicateAcrossBatches(allPhrases);
  console.log(`🔄 After deduplication: ${uniquePhrases.length} unique phrases from ${allPhrases.length} total`);
  
  // If we have fewer than target, try additional sequential batch
  if (uniquePhrases.length < TOTAL_PHRASES_PER_CATEGORY && successfulBatches < 4) {
    console.log(`📈 Attempting retry batch to reach ${TOTAL_PHRASES_PER_CATEGORY} phrases...`);
    try {
      const retryBatch = await mockApiCall(categoryName, 4);
      const combinedPhrases = [...uniquePhrases, ...retryBatch];
      const finalUniquePhrases = deduplicateAcrossBatches(combinedPhrases);
      console.log(`✅ Retry batch added ${finalUniquePhrases.length - uniquePhrases.length} new unique phrases`);
      
      const totalTime = Date.now() - startTime;
      console.log(`🎯 Final result: ${finalUniquePhrases.length} unique phrases generated in ${totalTime}ms`);
      return finalUniquePhrases;
    } catch (error) {
      console.warn('❌ Retry batch failed:', error);
    }
  }
  
  const totalTime = Date.now() - startTime;
  console.log(`🎯 Final result: ${uniquePhrases.length} unique phrases generated in ${totalTime}ms`);
  return uniquePhrases;
};

// Run the test
(async () => {
  try {
    console.log('🧪 Testing parallel batch phrase generation...\n');
    const result = await generatePhrasesWithBatching('Movies');
    console.log('\n📊 Test Results:');
    console.log(`- Total unique phrases: ${result.length}`);
    console.log(`- Target was: ${TOTAL_PHRASES_PER_CATEGORY}`);
    console.log(`- Success rate: ${(result.length / TOTAL_PHRASES_PER_CATEGORY * 100).toFixed(1)}%`);
    console.log('\n✅ Test completed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
})(); 