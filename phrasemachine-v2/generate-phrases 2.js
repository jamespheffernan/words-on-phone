#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Load generators
const EntityGenerator = require('./generators/entity-generator');
const CompoundGenerator = require('./generators/compound-generator');

function loadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf8'));
  } catch (err) {
    console.error(`Failed to load ${filePath}: ${err.message}`);
    process.exit(1);
  }
}

// Load data
console.log('📁 Loading datasets...');
const entities = loadJson('./dist/entities.json');
const ngrams = loadJson('./dist/ngrams.json');

console.log('🎮 Starting phrase generation...');

// Generate phrases from different sources
const generators = [
  {
    name: 'Entity Generator',
    instance: new EntityGenerator({ entities: entities.entities })
  },
  {
    name: 'Compound Generator',
    instance: new CompoundGenerator({ patterns: ngrams })
  }
];

let allPhrases = [];

generators.forEach(({ name, instance }) => {
  console.log(`\n📝 Running ${name}...`);
  const phrases = instance.generate();
  console.log(`✅ Generated ${phrases.length} phrases`);
  allPhrases.push(...phrases);
});

console.log(`\n📊 Total raw phrases: ${allPhrases.length}`);

// Deduplicate
const uniquePhrases = {};
allPhrases.forEach(p => {
  const key = p.phrase.toLowerCase().trim();
  if (!uniquePhrases[key] || p.difficulty === 'easy') {
    uniquePhrases[key] = p;
  }
});

const finalPhrases = Object.values(uniquePhrases);

// Sort by category and difficulty
finalPhrases.sort((a, b) => {
  if (a.category !== b.category) return a.category.localeCompare(b.category);
  if (a.difficulty !== b.difficulty) {
    const diffOrder = { easy: 0, medium: 1, hard: 2 };
    return diffOrder[a.difficulty] - diffOrder[b.difficulty];
  }
  return a.phrase.localeCompare(b.phrase);
});

// Calculate breakdown
const breakdown = {
  byCategory: {},
  byDifficulty: {},
  bySource: {}
};

finalPhrases.forEach(p => {
  breakdown.byCategory[p.category] = (breakdown.byCategory[p.category] || 0) + 1;
  breakdown.byDifficulty[p.difficulty] = (breakdown.byDifficulty[p.difficulty] || 0) + 1;
  breakdown.bySource[p.source] = (breakdown.bySource[p.source] || 0) + 1;
});

// Save output
const output = {
  meta: {
    version: '2.0',
    generated: new Date().toISOString(),
    totalPhrases: finalPhrases.length,
    breakdown: breakdown
  },
  phrases: finalPhrases
};

// Ensure output directory exists
if (!fs.existsSync('./output')) {
  fs.mkdirSync('./output');
}

fs.writeFileSync('./output/phrases.json', JSON.stringify(output, null, 2));

console.log('\n🎉 Generation complete!');
console.log(`📊 Total unique phrases: ${finalPhrases.length}`);
console.log('\n📈 Breakdown:');
console.log('By Category:', breakdown.byCategory);
console.log('By Difficulty:', breakdown.byDifficulty);
console.log('By Source:', breakdown.bySource);

// Show sample phrases from each category
console.log('\n🔍 Sample phrases by category:');
Object.keys(breakdown.byCategory).forEach(category => {
  const samples = finalPhrases
    .filter(p => p.category === category)
    .slice(0, 3)
    .map(p => `"${p.phrase}" (${p.difficulty})`);
  console.log(`  ${category}: ${samples.join(', ')}`);
});

console.log(`\n💾 Output saved to: ./output/phrases.json`);
const fileSize = (fs.statSync('./output/phrases.json').size / 1024).toFixed(1);
console.log(`📦 File size: ${fileSize} KB`);