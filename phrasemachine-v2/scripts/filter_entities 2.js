#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Simple arg parsing
const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf(name);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : null;
}
const inputPath = getArg('--input');
const outputPath = getArg('--output');
if (!inputPath || !outputPath) {
  console.error('Usage: filter_entities.js --input <input.json> --output <output.json>');
  process.exit(1);
}

const inFile = path.resolve(inputPath);
const outFile = path.resolve(outputPath);
if (!fs.existsSync(inFile)) {
  console.error(`Input file not found: ${inFile}`);
  process.exit(1);
}

let data;
try {
  data = JSON.parse(fs.readFileSync(inFile, 'utf8'));
} catch (err) {
  console.error(`Failed to parse input JSON: ${err.message}`);
  process.exit(1);
}

// Priority types from our plan
const PRIORITY_TYPES = [
  'Q5',       // human
  'Q11424',   // film
  'Q5398426', // TV series
  'Q482994',  // album
  'Q7725634', // literary work
  'Q1107',    // anime
  'Q349',     // sport
  'Q515',     // city
  'Q6256',    // country
  'Q1047113', // specialty food
  'Q41438',   // brand
  'Q3305213'  // painting
];

const entities = {};
let processed = 0;
let kept = 0;

// If input JSON is an object with .entities, unwrap
if (data.entities) {
  data = Object.values(data.entities);
}

data.forEach(rec => {
  processed++;
  const id = rec.id;
  const label = rec.label;
  const type = rec.type;
  const sitelinks = parseInt(rec.sitelinks || '0', 10);
  if (sitelinks >= 10 && PRIORITY_TYPES.includes(type)) {
    entities[id] = { id, label, sitelinks, type, aliases: rec.aliases || [] };
    kept++;
  }
});

const output = {
  meta: { processed, kept, timestamp: new Date().toISOString() },
  entities
};
fs.writeFileSync(outFile, JSON.stringify(output, null, 2));
console.log(`Filtered ${kept}/${processed} entities -> ${outFile}`);