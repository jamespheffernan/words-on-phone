#!/usr/bin/env node

import fs from 'fs';

console.log('🔍 Analyzing category mapping issues...');

// Read current phrases
const currentPhrases = JSON.parse(fs.readFileSync('./public/phrases.json', 'utf8'));
console.log(`📊 Current phrases: ${currentPhrases.length}`);

// Get current categories
const currentCategories = [...new Set(currentPhrases.map(p => p.category))];
console.log('\n📋 Current categories in phrases.json:');
currentCategories.sort().forEach(cat => {
  const count = currentPhrases.filter(p => p.category === cat).length;
  console.log(`  - ${cat}: ${count} phrases`);
});

// Check what categories are mapped in the game
const gameCategories = [
  'Everything',
  'Everything+',
  'Movies & TV',
  'Music & Artists',
  'Sports & Athletes',
  'Food & Drink',
  'Places & Travel',
  'Famous People',
  'Technology & Science',
  'History & Events',
  'Entertainment & Pop Culture',
  'Nature & Animals',
  'Emotions & Feelings',
  'Fantasy & Magic',
  'Transportation',
  'Weather & Seasons',
  'Internet & Social Media',
  'Clothing & Fashion',
  'Brands & Companies',
  'Occupations & Jobs',
  'Adult Content'
];

console.log('\n🎮 Categories defined in game:');
gameCategories.forEach(cat => {
  const hasPhrases = currentCategories.includes(cat);
  const count = hasPhrases ? currentPhrases.filter(p => p.category === cat).length : 0;
  console.log(`  - ${cat}: ${count} phrases ${hasPhrases ? '✅' : '❌'}`);
});

// Check for unmapped categories
const unmappedCategories = currentCategories.filter(cat => !gameCategories.includes(cat));
if (unmappedCategories.length > 0) {
  console.log('\n❌ Unmapped categories:');
  unmappedCategories.forEach(cat => {
    const count = currentPhrases.filter(p => p.category === cat).length;
    console.log(`  - ${cat}: ${count} phrases`);
  });
}

// Check for empty categories
const emptyCategories = gameCategories.filter(cat => !currentCategories.includes(cat));
if (emptyCategories.length > 0) {
  console.log('\n📭 Empty categories in game:');
  emptyCategories.forEach(cat => {
    console.log(`  - ${cat}: 0 phrases`);
  });
}

console.log('\n✅ Analysis complete!'); 