#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the phrases.json file
const phrasesPath = path.join(__dirname, 'src', 'phrases.json');
const phrases = JSON.parse(fs.readFileSync(phrasesPath, 'utf8'));

// Count phrases by category
const categoryCounts = {};
phrases.forEach(phrase => {
  const category = phrase.category;
  categoryCounts[category] = (categoryCounts[category] || 0) + 1;
});

// Separate Everything from other categories
const everythingCount = categoryCounts['Everything'] || 0;
const otherCategories = Object.entries(categoryCounts)
  .filter(([category]) => category !== 'Everything')
  .sort(([,a], [,b]) => b - a);

console.log('📊 Category Phrase Counts:\n');

// Show Everything separately
if (everythingCount > 0) {
  console.log(`🌟 Everything: ${everythingCount} phrases (aggregated from all categories below)`);
  console.log('');
}

let totalCategories = 0;
let emptyCategories = 0;

// Show other categories
otherCategories.forEach(([category, count]) => {
  totalCategories++;
  if (count === 0) {
    emptyCategories++;
    console.log(`❌ ${category}: ${count} phrases`);
  } else {
    console.log(`✅ ${category}: ${count} phrases`);
  }
});

console.log(`\n📈 Summary:`);
console.log(`Unique categories (excluding Everything): ${totalCategories}`);
console.log(`Empty categories: ${emptyCategories}`);
console.log(`Categories with phrases: ${totalCategories - emptyCategories}`);
console.log(`Total unique phrases: ${otherCategories.reduce((sum, [, count]) => sum + count, 0)}`);
console.log(`Everything contains: ${everythingCount} phrases (should match unique phrases)`);

if (emptyCategories === 0) {
  console.log(`\n🎉 Great! No empty categories found. "Surprise Me" will work properly.`);
} else {
  console.log(`\n⚠️  Found ${emptyCategories} empty categories. These should be investigated.`);
}