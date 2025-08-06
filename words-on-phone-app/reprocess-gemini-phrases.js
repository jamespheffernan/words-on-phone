#!/usr/bin/env node

import fs from 'fs';

console.log('🔄 Re-processing Gemini phrases with proper category mapping...');

// Read and clean the first Gemini file
let content1 = fs.readFileSync('./geminiphrases.json', 'utf8');
content1 = content1.replace(/,\s*\{\s*"category":\s*"[^"]*",\s*"term":\s*[^}]*$/g, '');
content1 = content1.replace(/```.*$/g, '');
content1 = content1.trim();
if (!content1.endsWith(']')) {
  content1 = content1.replace(/,\s*$/, '') + '\n]';
}

// Read the second Gemini file
const content2 = fs.readFileSync('./moregeminiphrases.json', 'utf8');
const jsonMatch = content2.match(/```json\s*\n([\s\S]*?)\n```/);

if (!jsonMatch) {
  console.error('❌ Could not find JSON block in moregeminiphrases.json');
  process.exit(1);
}

// Parse both files
const phrases1 = JSON.parse(content1);
const phrases2Data = JSON.parse(jsonMatch[1]);

console.log(`📊 File 1: ${phrases1.length} phrases`);
console.log(`📊 File 2: ${phrases2Data.categories.length} categories`);

// Comprehensive category mapping
const categoryMapping = {
  // File 1 categories
  'Movie Quotes': 'Movies & TV',
  'Movies': 'Movies & TV', 
  'TV Shows': 'Movies & TV',
  'Songs': 'Music & Artists',
  'Celebrities': 'Famous People',
  'Literature': 'Literature & Books',
  'Brands & Slogans': 'Brands & Companies',
  'Mythology': 'Fantasy & Magic',
  'Art': 'Art & Culture',
  'Idioms & Phrases': 'Idioms & Phrases',
  'Science & Technology': 'Technology & Science',
  'Pop Culture': 'Entertainment & Pop Culture',
  'Historical Figures': 'History & Events',
  'Geography': 'Places & Travel',
  'Sports': 'Sports & Athletes',
  
  // File 2 categories
  'Television': 'Movies & TV',
  'Music': 'Music & Artists',
  'History': 'History & Events',
  'Science': 'Technology & Science',
  'Literature': 'Literature & Books',
  'Geography': 'Places & Travel',
  'Sports': 'Sports & Athletes',
  'Pop Culture': 'Entertainment & Pop Culture',
  'Brands': 'Brands & Companies',
  'Famous People': 'Famous People',
  'Nature': 'Nature & Animals',
  'Food & Drink': 'Food & Drink',
  'Mythology': 'Fantasy & Magic',
  'Quotes & Phrases': 'Idioms & Phrases',
  'Technology': 'Technology & Science',
  'Video Games': 'Video Games & Gaming',
  'Fashion': 'Clothing & Fashion',
  'Celebrities': 'Famous People'
};

// Process file 1
const processedPhrases1 = phrases1.map(item => ({
  phrase: item.term,
  category: categoryMapping[item.category] || 'Everything'
}));

// Process file 2
const processedPhrases2 = [];
phrases2Data.categories.forEach(category => {
  const gameCategory = categoryMapping[category.name] || 'Everything';
  category.phrases.forEach(phrase => {
    processedPhrases2.push({
      phrase: phrase,
      category: gameCategory
    });
  });
});

// Combine all phrases
const allPhrases = [...processedPhrases1, ...processedPhrases2];

// Remove duplicates
const seenPhrases = new Set();
const uniquePhrases = allPhrases.filter(item => {
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

// Save to phrases.json
fs.writeFileSync('./public/phrases.json', JSON.stringify(uniquePhrases, null, 2));

console.log('✅ Re-processing complete!');
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

console.log('\n🎮 Game phrases updated successfully!'); 