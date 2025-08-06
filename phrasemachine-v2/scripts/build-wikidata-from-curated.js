#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Simple arg parsing
const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf(name);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : null;
}

const curatedPath = getArg('--curated');
const externalPath = getArg('--external');
const outputPath = getArg('--output');

if (!curatedPath || !outputPath) {
  console.error('Usage: build-wikidata-from-curated.js --curated <curated.json> [--external <external.json>] --output <output.json>');
  process.exit(1);
}

console.log('🚀 Building Wikidata from curated datasets...');

function loadJSON(filePath) {
  const absPath = path.resolve(filePath);
  if (!fs.existsSync(absPath)) {
    console.error(`❌ File not found: ${absPath}`);
    process.exit(1);
  }
  
  try {
    const content = fs.readFileSync(absPath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.error(`❌ Failed to parse JSON from ${absPath}: ${err.message}`);
    process.exit(1);
  }
}

// Load curated data
console.log(`📁 Loading curated data from ${curatedPath}...`);
const curatedData = loadJSON(curatedPath);
const entities = { ...curatedData.entities };
let totalEntities = Object.keys(entities).length;

console.log(`✅ Loaded ${totalEntities} curated entities`);

// Load external data if provided
if (externalPath && fs.existsSync(path.resolve(externalPath))) {
  console.log(`📁 Loading external data from ${externalPath}...`);
  const externalData = loadJSON(externalPath);
  
  let addedCount = 0;
  const externalEntities = externalData.entities || externalData;
  
  for (const [id, entity] of Object.entries(externalEntities)) {
    if (!entities[id]) {
      entities[id] = entity;
      addedCount++;
    }
  }
  
  totalEntities += addedCount;
  console.log(`✅ Added ${addedCount} external entities`);
} else if (externalPath) {
  console.log(`⚠️ External file ${externalPath} not found, skipping`);
} else {
  console.log(`ℹ️ No external data specified, using curated only`);
}

// Create output structure
const outputData = {
  meta: {
    buildDate: new Date().toISOString(),
    entityCount: totalEntities,
    sources: {
      curated: curatedPath,
      external: externalPath || null
    },
    description: 'Combined Wikidata entities for PhraseMachine v2'
  },
  entities: entities
};

// Write output
const outputAbsPath = path.resolve(outputPath);
try {
  fs.writeFileSync(outputAbsPath, JSON.stringify(outputData, null, 2));
  console.log(`💾 Saved ${totalEntities} entities to ${outputAbsPath}`);
  
  // Calculate file size
  const stats = fs.statSync(outputAbsPath);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`📦 File size: ${fileSizeMB} MB`);
  
  console.log('🎉 Wikidata build complete!');
  console.log(`📊 Final stats: ${totalEntities} entities, ${fileSizeMB} MB`);
  
} catch (err) {
  console.error(`❌ Failed to write output: ${err.message}`);
  process.exit(1);
}