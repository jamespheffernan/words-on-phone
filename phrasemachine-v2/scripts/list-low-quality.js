#!/usr/bin/env node
/*
 * list-low-quality.js
 * -------------------
 * Lists phrases whose latest `final_score` is below a given threshold so that a
 * human can review them before pruning.
 *
 * Usage:
 *   node scripts/list-low-quality.js [threshold] [--csv]
 *
 *   threshold (optional) – default 55
 *   --csv              – output in CSV format for easy review
 */

/* eslint-disable no-console */
const { initializeDatabase } = require('../database/connection');
const fs = require('fs');

async function main() {
  const arg = process.argv[2];
  const threshold = arg && !Number.isNaN(parseInt(arg, 10)) ? parseInt(arg, 10) : 55;
  const csv = process.argv.includes('--csv');

  const db = await initializeDatabase();
  try {
    const { rows } = await db.query(
      `SELECT p.id, p.phrase, lps.final_score
         FROM latest_phrase_scores lps
         JOIN phrases p ON p.id = lps.phrase_id
        WHERE lps.final_score < $1
        ORDER BY lps.final_score ASC`,
      [threshold]
    );

    console.log(`Found ${rows.length} phrases with final_score < ${threshold}.`);

    if (csv) {
      const path = `low_quality_below_${threshold}.csv`;
      const lines = ['id,phrase,final_score', ...rows.map(r => `${r.id},"${r.phrase.replace(/"/g, '""')}",${r.final_score}`)];
      fs.writeFileSync(path, lines.join('\n'));
      console.log(`📄 CSV written to ${path}`);
    } else {
      rows.slice(0, 50).forEach((r, idx) => {
        console.log(`${idx + 1}. (${r.id}) "${r.phrase}" – ${r.final_score}`);
      });
      if (rows.length > 50) {
        console.log(`...and ${rows.length - 50} more. Use --csv to export full list.`);
      }
    }
  } catch (err) {
    console.error('❌ Failed to list phrases:', err.message);
  } finally {
    await db.close();
  }
}

main();
