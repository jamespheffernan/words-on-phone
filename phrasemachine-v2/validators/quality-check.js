#!/usr/bin/env node

const fs = require('fs');
const args = process.argv.slice(2);

function getArg(name) {
  const idx = args.indexOf(name);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : null;
}

const inputFile = getArg('--input') || './output/phrases.json';

if (!fs.existsSync(inputFile)) {
  console.error(`❌ Input file not found: ${inputFile}`);
  process.exit(1);
}

console.log('🔍 Running quality checks...');
console.log(`📁 Input file: ${inputFile}`);

const data = JSON.parse(fs.readFileSync(inputFile));
const phrases = data.phrases;

if (!phrases || !Array.isArray(phrases)) {
  console.error('❌ Invalid phrases data structure');
  process.exit(1);
}

// Quality checks
const checks = {
  minLength: 0,
  maxLength: 0,
  duplicates: 0,
  missingCategory: 0,
  missingDifficulty: 0,
  missingSource: 0,
  emptyPhrases: 0,
  tooShort: [],
  tooLong: [],
  invalidChars: []
};

const seen = new Set();
const validCategories = ['person', 'place', 'movie', 'tv_show', 'company', 'food', 'sport', 'activity', 'entertainment', 'country', 'general', 'other'];
const validDifficulties = ['easy', 'medium', 'hard'];

phrases.forEach((p, index) => {
  if (!p.phrase || typeof p.phrase !== 'string') {
    checks.emptyPhrases++;
    return;
  }

  const words = p.phrase.trim().split(/\s+/);
  
  // Length checks
  if (words.length < 1) {
    checks.minLength++;
    checks.tooShort.push(p.phrase);
  }
  if (words.length > 4) {
    checks.maxLength++;
    checks.tooLong.push(p.phrase);
  }
  
  // Duplicate check
  const key = p.phrase.toLowerCase().trim();
  if (seen.has(key)) {
    checks.duplicates++;
  }
  seen.add(key);
  
  // Required fields
  if (!p.category) {
    checks.missingCategory++;
  } else if (!validCategories.includes(p.category)) {
    console.warn(`⚠️ Invalid category "${p.category}" for phrase "${p.phrase}"`);
  }
  
  if (!p.difficulty) {
    checks.missingDifficulty++;
  } else if (!validDifficulties.includes(p.difficulty)) {
    console.warn(`⚠️ Invalid difficulty "${p.difficulty}" for phrase "${p.phrase}"`);
  }
  
  if (!p.source) {
    checks.missingSource++;
  }
  
  // Character validation (basic - no weird characters)
  if (!/^[a-zA-Z0-9\s\-'.,!&]+$/.test(p.phrase)) {
    checks.invalidChars.push(p.phrase);
  }
});

// Report results
console.log('\n📊 Quality Report:');
console.log(`Total phrases: ${phrases.length}`);
console.log(`Unique phrases: ${seen.size}`);
console.log(`Empty phrases: ${checks.emptyPhrases}`);
console.log(`Duplicates: ${checks.duplicates}`);
console.log(`Too short: ${checks.minLength}`);
console.log(`Too long: ${checks.maxLength}`);
console.log(`Missing category: ${checks.missingCategory}`);
console.log(`Missing difficulty: ${checks.missingDifficulty}`);
console.log(`Missing source: ${checks.missingSource}`);
console.log(`Invalid characters: ${checks.invalidChars.length}`);

// Category breakdown
console.log('\n📈 Category Distribution:');
if (data.meta && data.meta.breakdown && data.meta.breakdown.byCategory) {
  Object.entries(data.meta.breakdown.byCategory)
    .sort(([,a], [,b]) => b - a)
    .forEach(([category, count]) => {
      console.log(`  ${category}: ${count}`);
    });
}

// Difficulty breakdown
console.log('\n🎯 Difficulty Distribution:');
if (data.meta && data.meta.breakdown && data.meta.breakdown.byDifficulty) {
  Object.entries(data.meta.breakdown.byDifficulty)
    .forEach(([difficulty, count]) => {
      console.log(`  ${difficulty}: ${count}`);
    });
}

if (checks.tooShort.length > 0) {
  console.log('\n⚠️ Too short phrases:', checks.tooShort.slice(0, 5));
}

if (checks.tooLong.length > 0) {
  console.log('\n⚠️ Too long phrases:', checks.tooLong.slice(0, 5));
}

if (checks.invalidChars.length > 0) {
  console.log('\n⚠️ Invalid characters:', checks.invalidChars.slice(0, 5));
}

const hasErrors = checks.duplicates > 0 || checks.minLength > 0 || 
                  checks.maxLength > 0 || checks.missingCategory > 0 || 
                  checks.missingDifficulty > 0 || checks.missingSource > 0 ||
                  checks.emptyPhrases > 0;

if (hasErrors) {
  console.log('\n❌ Quality check failed!');
  process.exit(1);
} else {
  console.log('\n✅ All quality checks passed!');
  console.log(`🎉 ${phrases.length} high-quality phrases ready for production`);
}