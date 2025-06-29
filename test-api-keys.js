#!/usr/bin/env node

/**
 * Test script to verify API keys are properly configured
 */

console.log('🔑 Testing API Key Configuration\n');

// Check OpenAI key
const openaiKey = process.env.OPENAI_API_KEY || process.env.OpenAI_API_KEY;
if (openaiKey) {
  console.log('✅ OpenAI API Key found');
  console.log(`   Key starts with: ${openaiKey.substring(0, 8)}...`);
  console.log(`   Key length: ${openaiKey.length} characters`);
  
  if (openaiKey.startsWith('sk-')) {
    console.log('   ✅ Format looks correct (starts with sk-)');
  } else {
    console.log('   ⚠️  Warning: OpenAI keys usually start with "sk-"');
  }
} else {
  console.log('❌ OpenAI API Key not found');
  console.log('   Set with: export OPENAI_API_KEY="your-key-here"');
}

console.log('');

// Check Gemini key
const geminiKey = process.env.GEMINI_API_KEY;
if (geminiKey) {
  console.log('✅ Gemini API Key found');
  console.log(`   Key starts with: ${geminiKey.substring(0, 8)}...`);
  console.log(`   Key length: ${geminiKey.length} characters`);
} else {
  console.log('❌ Gemini API Key not found');
  console.log('   Set with: export GEMINI_API_KEY="your-key-here"');
}

console.log('');

// Summary
const hasOpenAI = !!openaiKey;
const hasGemini = !!geminiKey;

if (hasOpenAI && hasGemini) {
  console.log('🎉 Both API keys configured! You can run the full comparison.');
  console.log('   Run: node direct-model-comparison.js');
} else if (hasOpenAI || hasGemini) {
  console.log('⚠️  Partial setup - you can test with available provider(s).');
  console.log('   Run: node direct-model-comparison.js');
} else {
  console.log('❌ No API keys found. Please set up at least one key to run tests.');
  console.log('\nQuick setup:');
  console.log('   export OPENAI_API_KEY="sk-your-openai-key"');
  console.log('   export GEMINI_API_KEY="your-gemini-key"');
}

console.log('\n📖 For detailed setup instructions, see: MODEL_COMPARISON_README.md');