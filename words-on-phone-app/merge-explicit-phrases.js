#!/usr/bin/env node

import fs from 'fs';

console.log('🔄 Merging explicit phrases with existing database...');

// Read existing phrases
const existingPhrases = JSON.parse(fs.readFileSync('./public/phrases.json', 'utf8'));
console.log(`📊 Existing phrases: ${existingPhrases.length}`);

// Read explicit phrases
const explicitData = JSON.parse(fs.readFileSync('./fixed-explicit-phrases.json', 'utf8'));
console.log(`📊 Explicit categories: ${explicitData.categories.length}`);

// Convert explicit phrases to game format
const explicitPhrases = [];
explicitData.categories.forEach(category => {
  category.phrases.forEach(phrase => {
    explicitPhrases.push({
      phrase: phrase,
      category: 'Adult Content'
    });
  });
});

console.log(`📊 Explicit phrases: ${explicitPhrases.length}`);

// Create a set of existing phrases for deduplication
const existingPhraseSet = new Set(existingPhrases.map(p => p.phrase.toLowerCase()));

// Filter out duplicates from explicit phrases
const uniqueExplicitPhrases = explicitPhrases.filter(item => {
  const key = item.phrase.toLowerCase();
  if (existingPhraseSet.has(key)) {
    return false;
  }
  existingPhraseSet.add(key);
  return true;
});

console.log(`📊 Unique explicit phrases: ${uniqueExplicitPhrases.length}`);

// Combine existing and explicit phrases
const combinedPhrases = [...existingPhrases, ...uniqueExplicitPhrases];

// Sort by category then by phrase
combinedPhrases.sort((a, b) => {
  if (a.category !== b.category) {
    return a.category.localeCompare(b.category);
  }
  return a.phrase.localeCompare(b.phrase);
});

// Save the combined phrases
fs.writeFileSync('./public/phrases.json', JSON.stringify(combinedPhrases, null, 2));

console.log('✅ Merge complete!');
console.log(`📊 Total phrases: ${combinedPhrases.length}`);
console.log(`📈 Increase: ${existingPhrases.length} → ${combinedPhrases.length} (+${combinedPhrases.length - existingPhrases.length})`);

// Category breakdown
const categoryStats = {};
combinedPhrases.forEach(item => {
  categoryStats[item.category] = (categoryStats[item.category] || 0) + 1;
});

console.log('📊 Category breakdown:');
Object.entries(categoryStats).forEach(([category, count]) => {
  console.log(`  ${category}: ${count} phrases`);
});

console.log('🎮 Game phrases updated successfully!'); 