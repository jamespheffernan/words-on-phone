#!/usr/bin/env node

import fs from 'fs';

console.log('🔧 Fixing category mapping...');

// Read current phrases
const phrases = JSON.parse(fs.readFileSync('./public/phrases.json', 'utf8'));
console.log(`📊 Current phrases: ${phrases.length}`);

// Define the complete category mapping
const categoryMapping = {
  // Current mappings
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
  
  // Missing mappings from original data
  'Movies': 'Movies & TV',
  'Television': 'Movies & TV',
  'Music': 'Music & Artists',
  'Sports': 'Sports & Athletes',
  'Food & Drink': 'Food & Drink',
  'Geography': 'Places & Travel',
  'Celebrities': 'Famous People',
  'Famous People': 'Famous People',
  'Science': 'Technology & Science',
  'Technology': 'Technology & Science',
  'History': 'History & Events',
  'Pop Culture': 'Entertainment & Pop Culture',
  'Nature': 'Nature & Animals',
  'Brands': 'Brands & Companies',
  'Fashion': 'Clothing & Fashion',
  'Art': 'Art & Culture',
  'Literature': 'Literature & Books',
  'Mythology': 'Fantasy & Magic',
  'Quotes & Phrases': 'Idioms & Phrases',
  'Video Games': 'Video Games & Gaming'
};

// Track changes
let changes = 0;
const categoryStats = {};

// Apply mapping
phrases.forEach(phrase => {
  const originalCategory = phrase.category;
  const newCategory = categoryMapping[originalCategory];
  
  if (newCategory && newCategory !== originalCategory) {
    phrase.category = newCategory;
    changes++;
  }
  
  // Track stats
  categoryStats[phrase.category] = (categoryStats[phrase.category] || 0) + 1;
});

console.log(`📝 Applied ${changes} category changes`);

// Save updated phrases
fs.writeFileSync('./public/phrases.json', JSON.stringify(phrases, null, 2));

console.log('\n📊 Final category breakdown:');
Object.entries(categoryStats).sort((a, b) => b[1] - a[1]).forEach(([category, count]) => {
  console.log(`  ${category}: ${count} phrases`);
});

console.log('\n✅ Category mapping fixed!'); 