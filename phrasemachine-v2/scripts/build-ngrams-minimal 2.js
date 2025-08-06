#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Simple arg parsing
const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf(name);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : null;
}

const outputPath = getArg('--output');

if (!outputPath) {
  console.error('Usage: build-ngrams-minimal.js --output <output.json>');
  process.exit(1);
}

console.log('🚀 Building minimal N-grams dataset...');

// For now, create a curated set of game-relevant n-grams with PMI scores
// In the future, this could download and process actual Google Books data
const gameRelevantNgrams = {
  // 2-grams (common phrases in party games)
  "ice cream": { count: 80000, pmi: 7.2, frequency: 0.0012 },
  "home run": { count: 50000, pmi: 8.5, frequency: 0.0008 },
  "hot dog": { count: 45000, pmi: 6.8, frequency: 0.0007 },
  "pop star": { count: 35000, pmi: 9.1, frequency: 0.0005 },
  "movie star": { count: 42000, pmi: 8.3, frequency: 0.0006 },
  "video game": { count: 55000, pmi: 7.9, frequency: 0.0009 },
  "fast food": { count: 38000, pmi: 7.5, frequency: 0.0006 },
  "social media": { count: 65000, pmi: 8.7, frequency: 0.0010 },
  "theme park": { count: 28000, pmi: 9.3, frequency: 0.0004 },
  "board game": { count: 32000, pmi: 8.8, frequency: 0.0005 },
  "coffee shop": { count: 41000, pmi: 7.6, frequency: 0.0006 },
  "shopping mall": { count: 29000, pmi: 8.2, frequency: 0.0004 },
  "reality show": { count: 33000, pmi: 9.0, frequency: 0.0005 },
  "action movie": { count: 26000, pmi: 8.4, frequency: 0.0004 },
  "love song": { count: 37000, pmi: 7.8, frequency: 0.0006 },
  "dance floor": { count: 24000, pmi: 8.9, frequency: 0.0004 },
  "birthday party": { count: 31000, pmi: 8.1, frequency: 0.0005 },
  "wedding dress": { count: 27000, pmi: 8.6, frequency: 0.0004 },
  "christmas tree": { count: 39000, pmi: 8.0, frequency: 0.0006 },
  "summer vacation": { count: 25000, pmi: 8.7, frequency: 0.0004 },

  // 3-grams (phrases commonly used in games)
  "ice cream cone": { count: 15000, pmi: 9.2, frequency: 0.0002 },
  "hot dog stand": { count: 12000, pmi: 9.5, frequency: 0.0002 },
  "movie theater popcorn": { count: 8000, pmi: 10.1, frequency: 0.0001 },
  "video game controller": { count: 11000, pmi: 9.8, frequency: 0.0002 },
  "fast food restaurant": { count: 13000, pmi: 9.3, frequency: 0.0002 },
  "theme park ride": { count: 9000, pmi: 9.7, frequency: 0.0001 },
  "coffee shop wifi": { count: 7000, pmi: 10.2, frequency: 0.0001 },
  "birthday party cake": { count: 8500, pmi: 9.9, frequency: 0.0001 },
  "christmas tree lights": { count: 10000, pmi: 9.6, frequency: 0.0002 },
  "summer vacation photos": { count: 6500, pmi: 10.3, frequency: 0.0001 },
  "social media post": { count: 14000, pmi: 9.1, frequency: 0.0002 },
  "reality tv show": { count: 9500, pmi: 9.4, frequency: 0.0001 },
  "action movie hero": { count: 7500, pmi: 10.0, frequency: 0.0001 },
  "dance floor music": { count: 6000, pmi: 10.4, frequency: 0.0001 },
  "wedding dress shopping": { count: 5500, pmi: 10.6, frequency: 0.0001 },

  // 4-grams (very specific phrases)
  "ice cream truck music": { count: 3000, pmi: 11.2, frequency: 0.00005 },
  "movie theater butter popcorn": { count: 2500, pmi: 11.5, frequency: 0.00004 },
  "fast food drive through": { count: 4000, pmi: 10.8, frequency: 0.00006 },
  "theme park roller coaster": { count: 3500, pmi: 11.0, frequency: 0.00005 },
  "birthday party surprise cake": { count: 2000, pmi: 11.8, frequency: 0.00003 },
  "christmas tree ornament decoration": { count: 2200, pmi: 11.6, frequency: 0.00003 },
  "summer vacation beach photos": { count: 1800, pmi: 12.0, frequency: 0.00003 },
  "social media profile picture": { count: 4500, pmi: 10.5, frequency: 0.00007 },
  "reality tv show drama": { count: 2800, pmi: 11.3, frequency: 0.00004 },
  "action movie car chase": { count: 2600, pmi: 11.4, frequency: 0.00004 }
};

const outputData = {
  meta: {
    buildDate: new Date().toISOString(),
    ngramCount: Object.keys(gameRelevantNgrams).length,
    description: 'Curated game-relevant n-grams with PMI scores',
    source: 'manually_curated',
    note: 'Future versions will process Google Books N-gram data'
  },
  ngrams: gameRelevantNgrams
};

// Write output
const outputAbsPath = path.resolve(outputPath);
try {
  fs.writeFileSync(outputAbsPath, JSON.stringify(outputData, null, 2));
  
  const ngramCount = Object.keys(gameRelevantNgrams).length;
  console.log(`💾 Saved ${ngramCount} n-grams to ${outputAbsPath}`);
  
  // Calculate file size
  const stats = fs.statSync(outputAbsPath);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`📦 File size: ${fileSizeMB} MB`);
  
  console.log('🎉 N-grams build complete!');
  console.log(`📊 Final stats: ${ngramCount} n-grams, ${fileSizeMB} MB`);
  
} catch (err) {
  console.error(`❌ Failed to write output: ${err.message}`);
  process.exit(1);
}