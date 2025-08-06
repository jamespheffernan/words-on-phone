#!/usr/bin/env node

// Convert PhraseMachine v2 generated phrases to game-compatible format
const fs = require('fs');
const path = require('path');

const inputFile = './output/phrases.json';
const outputFile = '../words-on-phone-app/public/phrases.json';

console.log('🔄 Converting PhraseMachine v2 phrases for game integration...');

// Load generated phrases
const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
const phrases = data.phrases;

console.log(`📊 Input: ${phrases.length} phrases from ${Object.keys(data.meta.breakdown.byCategory).length} categories`);

// Category mapping from generator categories to game categories
const categoryMap = {
  'person': 'Famous People',
  'movie': 'Movies & TV',
  'tv_show': 'Movies & TV',
  'place': 'Places & Travel',
  'country': 'Places & Travel',
  'company': 'Brands & Companies',
  'food': 'Food & Drink',
  'sport': 'Sports & Athletes',
  'activity': 'Entertainment & Pop Culture',
  'entertainment': 'Entertainment & Pop Culture',
  'general': 'Everything',
  'other': 'Everything',
  // New categories from historical expansion
  'historical': 'History & Events',
  'scientist': 'Technology & Science',
  'musician': 'Music & Artists',
  'band': 'Music & Artists',
  'invention': 'Technology & Science',
  'concept': 'Technology & Science'
};

// Group phrases by game categories
const gameCategories = {};

phrases.forEach(phraseObj => {
  const gameCategory = categoryMap[phraseObj.category] || 'Everything';
  
  if (!gameCategories[gameCategory]) {
    gameCategories[gameCategory] = [];
  }
  
  gameCategories[gameCategory].push(phraseObj.phrase);
});

// Sort phrases within each category alphabetically
Object.keys(gameCategories).forEach(category => {
  gameCategories[category].sort();
});

// Create the output format expected by the game
const gameFormat = gameCategories;

// Write the converted file
fs.writeFileSync(path.resolve(outputFile), JSON.stringify(gameFormat, null, 2));

console.log('✅ Conversion complete!');
console.log(`📁 Output: ${outputFile}`);

// Show category breakdown
console.log('\n📊 Game Category Breakdown:');
Object.entries(gameFormat).forEach(([category, phrases]) => {
  console.log(`  ${category}: ${phrases.length} phrases`);
});

const totalConverted = Object.values(gameFormat).reduce((sum, phrases) => sum + phrases.length, 0);
console.log(`\n🎯 Total converted: ${totalConverted} phrases`);

// Show sample phrases from each category
console.log('\n🔍 Sample phrases by category:');
Object.entries(gameFormat).forEach(([category, phrases]) => {
  const samples = phrases.slice(0, 3);
  console.log(`  ${category}: ${samples.map(p => `"${p}"`).join(', ')}`);
});

console.log('\n🎮 Ready for game integration!');