#!/usr/bin/env node

import fs from 'fs';

console.log('🔧 Fixing all category mappings...');

// Read current phrases
const currentPhrases = JSON.parse(fs.readFileSync('./public/phrases.json', 'utf8'));
console.log(`📊 Current phrases: ${currentPhrases.length}`);

// Comprehensive category mapping
const categoryMapping = {
  // Current game categories
  'Movies & TV': 'Movies & TV',
  'Music & Artists': 'Music & Artists',
  'Sports & Athletes': 'Sports & Athletes',
  'Food & Drink': 'Food & Drink',
  'Places & Travel': 'Places & Travel',
  'Famous People': 'Famous People',
  'Technology & Science': 'Technology & Science',
  'History & Events': 'History & Events',
  'Entertainment & Pop Culture': 'Entertainment & Pop Culture',
  'Nature & Animals': 'Nature & Animals',
  'Everything': 'Everything',
  'Brands & Companies': 'Brands & Companies',
  'Adult Content': 'Adult Content',
  
  // Original Gemini categories that need proper mapping
  'Movies': 'Movies & TV',
  'Television': 'Movies & TV',
  'TV Shows': 'Movies & TV',
  'Movie Quotes': 'Movies & TV',
  'Music': 'Music & Artists',
  'Songs': 'Music & Artists',
  'Sports': 'Sports & Athletes',
  'Food & Drink': 'Food & Drink',
  'Geography': 'Places & Travel',
  'Celebrities': 'Famous People',
  'Famous People': 'Famous People',
  'Science': 'Technology & Science',
  'Technology': 'Technology & Science',
  'History': 'History & Events',
  'Mythology': 'Fantasy & Magic',
  'Pop Culture': 'Entertainment & Pop Culture',
  'Nature': 'Nature & Animals',
  'Brands': 'Brands & Companies',
  'Brands & Slogans': 'Brands & Companies',
  'Fashion': 'Clothing & Fashion',
  'Art': 'Art & Culture',
  'Literature': 'Literature & Books',
  'Quotes & Phrases': 'Idioms & Phrases',
  'Video Games': 'Video Games & Gaming',
  'Idioms & Phrases': 'Idioms & Phrases'
};

// Track changes and stats
let changes = 0;
const categoryStats = {};
const unmappedCategories = new Set();

// Apply mapping
currentPhrases.forEach(phrase => {
  const originalCategory = phrase.category;
  const newCategory = categoryMapping[originalCategory];
  
  if (newCategory && newCategory !== originalCategory) {
    phrase.category = newCategory;
    changes++;
  } else if (!newCategory) {
    unmappedCategories.add(originalCategory);
  }
  
  // Track stats
  categoryStats[phrase.category] = (categoryStats[phrase.category] || 0) + 1;
});

console.log(`📝 Applied ${changes} category changes`);

if (unmappedCategories.size > 0) {
  console.log('\n❌ Unmapped categories found:');
  unmappedCategories.forEach(cat => {
    const count = currentPhrases.filter(p => p.category === cat).length;
    console.log(`  - ${cat}: ${count} phrases`);
  });
}

// Save updated phrases
fs.writeFileSync('./public/phrases.json', JSON.stringify(currentPhrases, null, 2));

console.log('\n📊 Final category breakdown:');
Object.entries(categoryStats).sort((a, b) => b[1] - a[1]).forEach(([category, count]) => {
  console.log(`  ${category}: ${count} phrases`);
});

// Check against game categories
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
  'Adult Content',
  'Art & Culture',
  'Literature & Books',
  'Idioms & Phrases',
  'Video Games & Gaming'
];

console.log('\n🎮 Game category status:');
gameCategories.forEach(cat => {
  const hasPhrases = categoryStats[cat] > 0;
  const count = categoryStats[cat] || 0;
  console.log(`  - ${cat}: ${count} phrases ${hasPhrases ? '✅' : '❌'}`);
});

console.log('\n✅ Category mapping fixed!'); 