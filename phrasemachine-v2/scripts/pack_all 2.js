#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Simple CLI arg parsing
function getArg(name) {
  const idx = process.argv.indexOf(name);
  return idx >= 0 && idx + 1 < process.argv.length ? process.argv[idx + 1] : null;
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

function loadJSON(p) {
  const abs = path.resolve(p);
  if (!fs.existsSync(abs)) {
    console.error(`File not found: ${abs}`);
    process.exit(1);
  }
  try {
    return JSON.parse(fs.readFileSync(abs, 'utf8'));
  } catch (err) {
    console.error(`Error parsing ${abs}: ${err.message}`);
    process.exit(1);
  }
}

const entitiesData = loadJSON(entitiesPath);
const ngramsData = loadJSON(ngramsPath);
const concretenessData = loadJSON(concretenessPath);
const wordnetData = loadJSON(wordnetPath);

// Build combined
const combined = {
  meta: {
    buildDate: new Date().toISOString(),
    entityCount: entitiesData.entities ? Object.keys(entitiesData.entities).length : 0,
    ngramCount: Object.keys(ngramsData).length,
    concretenessCount: Array.isArray(concretenessData) ? concretenessData.length : Object.keys(concretenessData).length,
    wordnetCount: Array.isArray(wordnetData) ? wordnetData.length : Object.keys(wordnetData).length
  },
  entities: entitiesData.entities || {},
  ngrams: ngramsData,
  concreteness: concretenessData,
  wordnet: wordnetData
};

// Write
try {
  fs.writeFileSync(path.resolve(outputPath), JSON.stringify(combined, null, 2));
  console.log(`Combined datasets written to ${outputPath}`);
} catch (err) {
  console.error(`Failed to write combined JSON: ${err.message}`);
  process.exit(1);
}