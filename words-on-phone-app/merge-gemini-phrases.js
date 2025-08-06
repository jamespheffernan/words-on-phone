#!/usr/bin/env node

import fs from 'fs';

console.log('🔄 Merging new Gemini phrases with existing database...');

// Read existing phrases
const existingPhrases = JSON.parse(fs.readFileSync('./public/phrases.json', 'utf8'));
console.log(`📊 Existing phrases: ${existingPhrases.length}`);

// Read new phrases
const newData = fs.readFileSync('./moregeminiphrases.json', 'utf8');
const jsonMatch = newData.match(/```json\s*\n([\s\S]*?)\n```/);

if (!jsonMatch) {
  console.error('❌ Could not find JSON block in moregeminiphrases.json');
  process.exit(1);
}

const newPhrasesData = JSON.parse(jsonMatch[1]);
console.log(`📊 New categories: ${newPhrasesData.categories.length}`);

// Category mapping for new phrases
const categoryMap = {
  'Movies': 'Movies & TV',
  'Television': 'Movies & TV',
  'Music': 'Music & Artists',
  'History': 'History & Events',
  'Science': 'Technology & Science',
  'Art': 'Entertainment & Pop Culture',
  'Literature': 'Entertainment & Pop Culture',
  'Geography': 'Places & Travel',
  'Sports': 'Sports & Athletes',
  'Pop Culture': 'Entertainment & Pop Culture',
  'Brands': 'Brands & Companies',
  'Famous People': 'Famous People',
  'Nature': 'Nature & Animals',
  'Food & Drink': 'Food & Drink',
  'Mythology': 'History & Events',
  'Quotes & Phrases': 'Entertainment & Pop Culture',
  'Technology': 'Technology & Science',
  'Video Games': 'Entertainment & Pop Culture',
  'Fashion': 'Entertainment & Pop Culture',
  'Celebrities': 'Famous People'
};

// Convert new phrases to game format
const newPhrases = [];
newPhrasesData.categories.forEach(category => {
  const gameCategory = categoryMap[category.name] || 'Everything';
  category.phrases.forEach(phrase => {
    newPhrases.push({
      phrase: phrase,
      category: gameCategory
    });
  });
});

console.log(`📊 New phrases: ${newPhrases.length}`);

// Create a set of existing phrases for deduplication
const existingPhraseSet = new Set(existingPhrases.map(p => p.phrase.toLowerCase()));

// Filter out duplicates from new phrases
const uniqueNewPhrases = newPhrases.filter(item => {
  const key = item.phrase.toLowerCase();
  if (existingPhraseSet.has(key)) {
    return false;
  }
  existingPhraseSet.add(key);
  return true;
});

console.log(`📊 Unique new phrases: ${uniqueNewPhrases.length}`);

// Combine existing and new phrases
const combinedPhrases = [...existingPhrases, ...uniqueNewPhrases];

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