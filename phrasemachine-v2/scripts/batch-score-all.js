#!/usr/bin/env node
/*
 * batch-score-all.js
 * ------------------
 * Scores every phrase in the `phrases` table that does **NOT** yet have a
 * record in `latest_phrase_scores` (i.e. has never been scored).
 *
 * Usage:
 *   node scripts/batch-score-all.js [--limit N] [--threshold 55]
 *
 * Options:
 *   --limit N       Score at most N phrases (default 1000)
 *   --threshold T   After scoring, show count of phrases below T (default 55)
 *
 * This script is read-only except for inserting new rows into `phrase_scores`.
 * It does **not** modify the `phrases` table or prune anything.
 */

/* eslint-disable no-console */
const { initializeDatabase } = require('../database/connection');
const DecisionEngine = require('../services/scoring/decision-engine');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { limit: 1000, threshold: 55 };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--limit' && args[i + 1]) {
      opts.limit = parseInt(args[i + 1], 10);
      i++;
    } else if (a === '--threshold' && args[i + 1]) {
      opts.threshold = parseInt(args[i + 1], 10);
      i++;
    }
  }
  return opts;
}

async function main() {
  const { limit, threshold } = parseArgs();
  const db = await initializeDatabase();
  const engine = new DecisionEngine();

  try {
    console.log('🔍 Finding unscored phrases...');
    const { rows } = await db.query(
      `SELECT p.id, p.phrase
         FROM phrases p
         LEFT JOIN latest_phrase_scores lps ON lps.phrase_id = p.id
        WHERE lps.id IS NULL
          AND p.status = 'active'
        LIMIT $1`,
      [limit]
    );

    if (rows.length === 0) {
      console.log('✅ All phrases already scored.');
      await db.close();
      return;
    }

    console.log(`→ Scoring ${rows.length} phrases (limit ${limit})...`);
    const start = Date.now();

    let processed = 0;
    for (const row of rows) {
      try {
        await engine.scorePhrase(row.phrase);
        processed++;
        if (processed % 100 === 0) {
          console.log(`  • ${processed} scored...`);
        }
      } catch (err) {
        console.warn(`  ⚠️  Could not score phrase ID ${row.id}: ${err.message}`);
      }
    }

    const duration = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`✅ Scored ${processed} phrases in ${duration}s.`);

    // Count low-quality phrases
    const lowRes = await db.query(
      `SELECT COUNT(*)::int AS low_count
         FROM latest_phrase_scores
        WHERE final_score < $1`,
      [threshold]
    );
    console.log(
      `📊 Now ${lowRes.rows[0].low_count} phrases have final_score < ${threshold}.`
    );
  } catch (err) {
    console.error('❌ Batch scoring failed:', err.message);
  } finally {
    await db.close();
  }
}

main();
