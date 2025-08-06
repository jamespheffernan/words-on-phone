#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Simple arg parsing
const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf(name);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : null;
}

const entitiesPath = getArg('--entities');
const ngramsPath = getArg('--ngrams');
const concretenessPath = getArg('--concreteness');
const wordnetPath = getArg('--wordnet');
const outputPath = getArg('--output');

if (!entitiesPath || !ngramsPath || !concretenessPath || !wordnetPath || !outputPath) {
  console.error('Usage: pack_all.js --entities <entities.json> --ngrams <ngrams.json> --concreteness <concreteness.json> --wordnet <wordnet.json> --output <combined.json>');
  process.exit(1);
}

// Read JSON files
function readJSON(p) {
  const abs = path.resolve(p);
  if (!fs.existsSync(abs)) {
    console.error(`File not found: ${abs}`);
    process.exit(1);
  }
  try {
    return JSON.parse(fs.readFileSync(abs, 'utf8'));
  } catch (err) {
    console.error(`Error parsing JSON ${abs}: ${err}`);
    process.exit(1);
  }
}

const entitiesData = readJSON(entitiesPath);
const ngramsData = readJSON(ngramsPath);
const concretenessData = readJSON(concretenessPath);
const wordnetData = readJSON(wordnetPath);

// Build combined object
const combined = {
  meta: {
    buildDate: new Date().toISOString(),
    entityCount: entitiesData.entities ? Object.keys(entitiesData.entities).length : 0,
    ngramCount: Object.keys(ngramsData).length
  },
  entities: entitiesData.entities || {},
  ngrams: ngramsData,
  concreteness: concretenessData,
  wordnet: wordnetData
};

// Write combined JSON
const outAbs = path.resolve(outputPath);
fs.writeFileSync(outAbs, JSON.stringify(combined, null, 2));
console.log(`Combined dataset written to ${outAbs}`);