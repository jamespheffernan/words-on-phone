#!/usr/bin/env node

/**
 * Multi-Category Phrase Generation Script
 *
 * Generates 100 phrases each for 6 non-entertainment categories using the CategoryGenerator pipeline.
 */

const CategoryGenerator = require('./generate-category.js');

const categories = [
  'Food & Drink',
  'Sports & Athletes',
  'Places & Travel',
  'Famous People',
  'Technology & Science',
  'History & Events'
];

function printStatusTable(results) {
  console.log('\nCurrent Progress:');
  console.log('-------------------------------------------------------------');
  console.log('| Category              | Stored | Accepted | Avg Score |');
  console.log('-------------------------------------------------------------');
  results.forEach(r => {
    const cat = (r.category + '                    ').slice(0, 22);
    const stored = (r.totalStored || 0).toString().padStart(6);
    const accepted = (r.totalAccepted || 0).toString().padStart(8);
    const avg = (r.averageScore || 0).toString().padStart(9);
    console.log(`| ${cat} | ${stored} | ${accepted} | ${avg} |`);
  });
  console.log('-------------------------------------------------------------\n');
}

async function main() {
  console.log('=== Multi-Category Phrase Generation ===\n');
  const results = [];

  for (const category of categories) {
    console.log(`\n--- Generating for category: ${category} ---`);
    const generator = new CategoryGenerator({ debug: true });
    const stats = await generator.generateForCategory(category, 100);
    results.push({ category, ...stats });
    console.log(`\n✅ Completed: ${category}\n`);
    printStatusTable(results);
  }

  // Final summary
  console.log('\n=== Generation Summary ===');
  printStatusTable(results);
  console.log('All done!');
}

main().catch(err => {
  console.error('❌ Error in multi-category generation:', err);
  process.exit(1);
}); 