#!/usr/bin/env node

/**
 * Convert Task 4 phrases to game TypeScript format
 * 
 * Takes our game-format JSON export and converts it to the TypeScript
 * format expected by words-on-phone-app/src/data/phrases.ts
 */

const fs = require('fs');
const path = require('path');

// Load our generated phrases
const phrasesData = JSON.parse(fs.readFileSync('task4-phrases-game-format.json', 'utf8'));

// Category mapping from our names to the game's variable names
const categoryToVarName = {
  'Movies & TV': 'moviePhrases',
  'Music & Artists': 'musicPhrases', 
  'Sports & Athletes': 'sportsPhrases',
  'Food & Drink': 'foodPhrases',
  'Places & Travel': 'placesPhrases',
  'Famous People': 'peoplePhrases',
  'Technology & Science': 'techPhrases',
  'History & Events': 'historyPhrases',
  'Entertainment & Pop Culture': 'entertainmentPhrases',
  'Nature & Animals': 'naturePhrases',
  'Everything': 'everythingPhrases',
  'Everything+': 'everythingPlusPhrases'
};

// Create the TypeScript content
function generateTypeScriptFile() {
  let tsContent = `// Phrase categories as mentioned in the game rules
export enum PhraseCategory {
  EVERYTHING = 'Everything',
  EVERYTHING_PLUS = 'Everything+',
  MOVIES = 'Movies & TV',
  MUSIC = 'Music & Artists',
  SPORTS = 'Sports & Athletes',
  FOOD = 'Food & Drink',
  PLACES = 'Places & Travel',
  PEOPLE = 'Famous People',
  TECHNOLOGY = 'Technology & Science',
  HISTORY = 'History & Events',
  ENTERTAINMENT = 'Entertainment & Pop Culture',
  NATURE = 'Nature & Animals'
}

// High-quality generated phrases for each category
`;

  // Generate each category array (skip Everything categories - they're handled separately)
  phrasesData.forEach(categoryData => {
    const varName = categoryToVarName[categoryData.category];
    if (!varName) {
      console.warn(`Unknown category: ${categoryData.category}`);
      return;
    }
    
    // Skip Everything categories - they're computed from all other categories
    if (categoryData.category === 'Everything' || categoryData.category === 'Everything+') {
      return;
    }
    
    tsContent += `const ${varName} = [\n`;
    categoryData.phrases.forEach(phrase => {
      // Escape quotes and backslashes
      const escapedPhrase = phrase.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      tsContent += `  "${escapedPhrase}",\n`;
    });
    tsContent += `];\n\n`;
  });

  // Add the combination object and exports
  tsContent += `// Combine all category phrases
const allCategoryPhrases = {
  [PhraseCategory.MOVIES]: moviePhrases,
  [PhraseCategory.MUSIC]: musicPhrases,
  [PhraseCategory.SPORTS]: sportsPhrases,
  [PhraseCategory.FOOD]: foodPhrases,
  [PhraseCategory.PLACES]: placesPhrases,
  [PhraseCategory.PEOPLE]: peoplePhrases,
  [PhraseCategory.TECHNOLOGY]: techPhrases,
  [PhraseCategory.HISTORY]: historyPhrases,
  [PhraseCategory.ENTERTAINMENT]: entertainmentPhrases,
  [PhraseCategory.NATURE]: naturePhrases
};

// All phrases combined for Everything categories
const allPhrases = Object.values(allCategoryPhrases).flat();

export const phrases: string[] = allPhrases;

// Export categorized phrases for category selection
export const categorizedPhrases = allCategoryPhrases;

// Get phrases by category
export function getPhrasesByCategory(category: PhraseCategory): string[] {
  if (category === PhraseCategory.EVERYTHING) {
    return allPhrases;
  }
  if (category === PhraseCategory.EVERYTHING_PLUS) {
    return allPhrases;
  }
  return categorizedPhrases[category] || [];
}

export const DEFAULT_CATEGORIES: PhraseCategory[] = [
  PhraseCategory.MOVIES,
  PhraseCategory.MUSIC,
  PhraseCategory.SPORTS,
  PhraseCategory.FOOD,
  PhraseCategory.PLACES,
  PhraseCategory.PEOPLE,
  PhraseCategory.TECHNOLOGY,
  PhraseCategory.HISTORY,
  PhraseCategory.ENTERTAINMENT,
  PhraseCategory.NATURE,
];
`;

  return tsContent;
}

// Generate the TypeScript content
const newPhrasesContent = generateTypeScriptFile();

// Write to a new file
const outputPath = 'phrases-updated.ts';
fs.writeFileSync(outputPath, newPhrasesContent);

// Calculate statistics
const totalPhrases = phrasesData.reduce((sum, cat) => sum + cat.phrases.length, 0);
const oldPhrasesPath = '../../words-on-phone-app/src/data/phrases.ts';
let oldCount = 0;
if (fs.existsSync(oldPhrasesPath)) {
  const oldContent = fs.readFileSync(oldPhrasesPath, 'utf8');
  const matches = oldContent.match(/"/g);
  oldCount = matches ? Math.floor(matches.length / 2) : 0;
}

console.log('🎉 Conversion completed!');
console.log('');
console.log('📊 Statistics:');
console.log(`  Old phrases (live): ~${oldCount}`);
console.log(`  New phrases (generated): ${totalPhrases}`);
console.log(`  Increase: ${totalPhrases - oldCount} phrases (+${Math.round(((totalPhrases - oldCount) / oldCount) * 100)}%)`);
console.log('');
console.log('📂 Files:');
console.log(`  Generated: ${outputPath}`);
console.log(`  Target: ${oldPhrasesPath}`);
console.log('');
console.log('🔧 Categories:');
phrasesData.forEach(cat => {
  console.log(`  ${cat.category}: ${cat.phrases.length} phrases`);
});
console.log('');
console.log('🚀 Ready to update the live game!');
console.log('   Run: cp phrases-updated.ts ../../words-on-phone-app/src/data/phrases.ts'); 