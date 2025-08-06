#!/usr/bin/env node
const fs = require('fs');
const readline = require('readline');
const zlib = require('zlib');
const { spawn } = require('child_process');

// Args
const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf(name);
  return idx>=0 && idx+1<args.length ? args[idx+1] : null;
}
const outputPath = getArg('--output');
if (!outputPath) {
  console.error('Usage: extract_kdwd_jsonl.js --output <entities.json>');
  process.exit(1);
}

const PRIORITY_TYPES = new Set([
  'Q5','Q11424','Q5398426','Q482994','Q7725634','Q1107','Q349','Q515','Q6256','Q1047113','Q41438','Q3305213'
]);

(async ()=>{
  const entities = {};
  let processed=0, kept=0;

  // Stream from stdin
  const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
  for await (const line of rl) {
    processed++;
    let rec;
    try {
      rec = JSON.parse(line);
    } catch {
      continue;
    }
    const id = rec.id;
    const claims = rec.claims || {};
    const sitelinks = rec.sitelinks ? Object.keys(rec.sitelinks).length : 0;
    const instance = claims.P31 && claims.P31[0] && claims.P31[0].mainsnak.datavalue.value.id;
    if (sitelinks>=10 && PRIORITY_TYPES.has(instance)) {
      entities[id] = {
        id, label: rec.labels && rec.labels.en && rec.labels.en.value, sitelinks, type: instance,
        aliases: rec.aliases && rec.aliases.en ? rec.aliases.en.map(a=>a.value):[]
      };
      kept++;
    }
  }

  const output = { meta:{ processed, kept, timestamp: new Date().toISOString() }, entities };
  fs.writeFileSync(outputPath, JSON.stringify(output,null,2));
  console.log(`Extracted ${kept}/${processed} entities to ${outputPath}`);
})();