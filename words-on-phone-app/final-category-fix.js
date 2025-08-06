#!/usr/bin/env node

import fs from 'fs';

console.log('🔧 Final category fix...');

// Re-process the Gemini phrases first
console.log('📝 Re-processing Gemini phrases...');
let content1 = fs.readFileSync('./geminiphrases.json', 'utf8');
content1 = content1.replace(/,\s*\{\s*"category":\s*"[^"]*",\s*"term":\s*[^}]*$/g, '');
content1 = content1.replace(/```.*$/g, '');
content1 = content1.trim();
if (!content1.endsWith(']')) {
  content1 = content1.replace(/,\s*$/, '') + '\n]';
}

const content2 = fs.readFileSync('./moregeminiphrases.json', 'utf8');
const jsonMatch = content2.match(/```json\s*\n([\s\S]*?)\n```/);

const phrases1 = JSON.parse(content1);
const phrases2Data = JSON.parse(jsonMatch[1]);

// Category mapping
const categoryMapping = {
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
  'Television': 'Movies & TV',
  'Music': 'Music & Artists',
  'History': 'History & Events',
  'Science': 'Technology & Science',
  'Nature': 'Nature & Animals',
  'Food & Drink': 'Food & Drink',
  'Quotes & Phrases': 'Idioms & Phrases',
  'Technology': 'Technology & Science',
  'Video Games': 'Video Games & Gaming',
  'Fashion': 'Clothing & Fashion',
  'Brands': 'Brands & Companies',
  'Famous People': 'Famous People'
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

// Remove duplicates within each category
const uniquePhrases = [];
const seenInCategory = {};

allPhrases.forEach(item => {
  const category = item.category;
  const phrase = item.phrase.toLowerCase();
  
  if (!seenInCategory[category]) {
    seenInCategory[category] = new Set();
  }
  
  if (!seenInCategory[category].has(phrase)) {
    seenInCategory[category].add(phrase);
    uniquePhrases.push(item);
  }
});

// Add Everything category (all unique phrases)
const allUniquePhrases = [...new Set(uniquePhrases.map(p => p.phrase))];
allUniquePhrases.forEach(phrase => {
  uniquePhrases.push({
    phrase: phrase,
    category: 'Everything'
  });
});

// Add Adult Content
const explicitData = JSON.parse(fs.readFileSync('./fixed-explicit-phrases.json', 'utf8'));
explicitData.categories.forEach(category => {
  category.phrases.forEach(phrase => {
    uniquePhrases.push({
      phrase: phrase,
      category: 'Adult Content'
    });
  });
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

console.log('✅ Final category fix complete!');
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