#!/usr/bin/env node
/*
 ... (same header) ... */
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { initializeDatabase } = require('../database/connection');
const Phrase = require('../database/models/phrase');

function parseArgs() {
  const args = process.argv.slice(2);
  const paths = [];
  const opts = { source: 'imported' };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--source' && args[i + 1]) {
      opts.source = args[i + 1];
      i++;
    } else if (!a.startsWith('--')) {
      paths.push(a);
    }
  }
  if (paths.length === 0) {
    console.error('❌ Please provide at least one JSON file path to import');
    process.exit(1);
  }
  return { paths, opts };
}

function extractPhrases(jsonData) {
  if (Array.isArray(jsonData) && jsonData.length && typeof jsonData[0] === 'string') {
    return jsonData.map(p => ({ phrase: p }));
  }
  if (Array.isArray(jsonData) && jsonData.length && typeof jsonData[0] === 'object') {
    const list = [];
    for (const block of jsonData) {
      if (!block || !block.phrases) continue;
      for (const p of block.phrases) {
        list.push({ phrase: p }); // default category -> 'general' inside model
      }
    }
    return list;
  }
  throw new Error('Unsupported JSON structure');
}

async function main() {
  const { paths, opts } = parseArgs();
  const db = await initializeDatabase();

  try {
    let totalImported = 0;
    for (const p of paths) {
      const fullPath = path.resolve(p);
      console.log(`📄 Reading ${fullPath}`);
      const raw = fs.readFileSync(fullPath, 'utf-8');
      const json = JSON.parse(raw);
      const phraseObjects = extractPhrases(json);
      console.log(`→ ${phraseObjects.length} phrases found in file`);

      const importRes = await Phrase.bulkInsert(phraseObjects, { source: opts.source });
      console.log(`   ✔️  ${importRes.successful_count} inserted, ${importRes.error_count} skipped/errors`);
      totalImported += importRes.successful_count;
    }
    console.log(`🎉 Import complete – ${totalImported} new phrases added.`);
  } catch (err) {
    console.error('❌ Import failed:', err.message);
  } finally {
    await db.close();
  }
}

main();
