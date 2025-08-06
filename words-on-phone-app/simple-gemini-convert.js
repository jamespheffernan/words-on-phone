#!/usr/bin/env node

import fs from 'fs';

console.log('🔄 Converting Gemini phrases to game format...');

// Read and clean the file
let content = fs.readFileSync('./geminiphrases.json', 'utf8');

// Remove any trailing incomplete entries and fix JSON structure
content = content.replace(/,\s*\{\s*"category":\s*"[^"]*",\s*"term":\s*[^}]*$/g, '');
content = content.replace(/```.*$/g, '');
content = content.trim();

// Ensure it ends with ]
if (!content.endsWith(']')) {
  content = content.replace(/,\s*$/, '') + '\n]';
}

try {
  const phrases = JSON.parse(content);
  console.log(`📊 Successfully loaded ${phrases.length} phrases`);
  
  // Category mapping
  const categoryMap = {
    'Movie Quotes': 'Movies & TV',
    'Movies': 'Movies & TV', 
    'TV Shows': 'Movies & TV',
    'Songs': 'Music & Artists',
    'Celebrities': 'Famous People',
    'Literature': 'Entertainment & Pop Culture',
    'Brands & Slogans': 'Brands & Companies',
    'Mythology': 'History & Events',
    'Art': 'Entertainment & Pop Culture'
  };

  // Convert to game format and remove duplicates
  const seenPhrases = new Set();
  const gameFormat = phrases
    .map(item => ({
      phrase: item.term,
      category: categoryMap[item.category] || 'Everything'
    }))
    .filter(item => {
      const key = item.phrase.toLowerCase();
      if (seenPhrases.has(key)) {
        return false;
      }
      seenPhrases.add(key);
      return true;
    });

  // Sort by category then by phrase
  gameFormat.sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return a.phrase.localeCompare(b.phrase);
  });

  // Save to public/phrases.json
  fs.writeFileSync('./public/phrases.json', JSON.stringify(gameFormat, null, 2));

  console.log('✅ Conversion complete!');
  console.log(`📊 Total phrases: ${gameFormat.length}`);
  
  // Category breakdown
  const categoryStats = {};
  gameFormat.forEach(item => {
    categoryStats[item.category] = (categoryStats[item.category] || 0) + 1;
  });

  console.log('📊 Category breakdown:');
  Object.entries(categoryStats).forEach(([category, count]) => {
    console.log(`  ${category}: ${count} phrases`);
  });

  console.log('🎮 Game phrases updated successfully!');

} catch (error) {
  console.error('❌ JSON parsing error:', error.message);
  console.log('Attempting to fix JSON structure...');
  
  // Try to fix common JSON issues
  content = content.replace(/,(\s*])/g, '$1'); // Remove trailing commas
  content = content.replace(/([^,])\s*\n\s*]/g, '$1\n]'); // Fix ending
  
  fs.writeFileSync('./debug_content.json', content);
  console.log('💾 Saved content to debug_content.json for inspection');
}