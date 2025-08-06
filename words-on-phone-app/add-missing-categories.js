#!/usr/bin/env node

import fs from 'fs';

console.log('➕ Adding missing categories...');

// Read current phrases
const phrases = JSON.parse(fs.readFileSync('./public/phrases.json', 'utf8'));
console.log(`📊 Current phrases: ${phrases.length}`);

// Add Everything category (all phrases)
const allPhrases = phrases.map(p => p.phrase);
const everythingPhrases = allPhrases.map(phrase => ({
  phrase: phrase,
  category: 'Everything'
}));

// Read explicit phrases for Adult Content
const explicitData = JSON.parse(fs.readFileSync('./fixed-explicit-phrases.json', 'utf8'));
const adultPhrases = [];
explicitData.categories.forEach(category => {
  category.phrases.forEach(phrase => {
    adultPhrases.push({
      phrase: phrase,
      category: 'Adult Content'
    });
  });
});

// Combine all phrases
const combinedPhrases = [...everythingPhrases, ...phrases, ...adultPhrases];

// Remove duplicates (keep first occurrence)
const seenPhrases = new Set();
const uniquePhrases = combinedPhrases.filter(item => {
  const key = item.phrase.toLowerCase();
  if (seenPhrases.has(key)) {
    return false;
  }
  seenPhrases.add(key);
  return true;
});

// Sort by category then by phrase
uniquePhrases.sort((a, b) => {
  if (a.category !== b.category) {
    return a.category.localeCompare(b.category);
  }
  return a.phrase.localeCompare(b.phrase);
});

// Save updated phrases
fs.writeFileSync('./public/phrases.json', JSON.stringify(uniquePhrases, null, 2));

console.log('✅ Missing categories added!');
console.log(`📊 Total phrases: ${uniquePhrases.length}`);

// Category breakdown
const categoryStats = {};
uniquePhrases.forEach(item => {
  categoryStats[item.category] = (categoryStats[item.category] || 0) + 1;
});

console.log('\n📊 Category breakdown:');
Object.entries(categoryStats).sort((a, b) => b[1] - a[1]).forEach(([category, count]) => {
  console.log(`  ${category}: ${count} phrases`);
});

console.log('\n🎮 Game phrases updated successfully!'); 