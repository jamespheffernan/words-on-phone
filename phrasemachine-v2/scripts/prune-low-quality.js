#!/usr/bin/env node
/*
 * prune-low-quality.js
 * --------------------
 * Simple utility script to archive (mark as `rejected`) phrases that fall below
 * the quality threshold based on their latest score.
 *
 * Usage:
 *   node scripts/prune-low-quality.js [threshold]
 *
 *   threshold (optional) – minimum acceptable score. Any phrase whose latest
 *   `final_score` is < threshold will be marked `rejected`. Defaults to 55.
 *
 * Safety:
 *   - The script performs a single UPDATE statement constrained by the latest
 *     score view. No deletions are performed.
 *   - A summary is printed before and after the update for verification.
 */

/* eslint-disable no-console */
const { initializeDatabase } = require('../database/connection');

async function prune(threshold = 55) {
  const db = await initializeDatabase();

  try {
    console.log(`\n🔍 Counting phrases with final_score < ${threshold} ...`);
    const countRes = await db.query(
      `SELECT COUNT(*)::int AS low_count
       FROM latest_phrase_scores
       WHERE final_score < $1`,
      [threshold]
    );
    const lowCount = countRes.rows[0].low_count;
    console.log(`→ Found ${lowCount} low-quality phrases.`);

    if (lowCount === 0) {
      console.log('✅ No action required – database already clean.');
      await db.close();
      return;
    }

    const sampleRes = await db.query(
      `SELECT phrase, final_score
       FROM latest_phrase_scores
       WHERE final_score < $1
       ORDER BY final_score ASC
       LIMIT 10`,
      [threshold]
    );

    console.log('\n🗒️  Sample of low-quality phrases:');
    sampleRes.rows.forEach((r, idx) => {
      console.log(`  ${idx + 1}. "${r.phrase}" – ${r.final_score}`);
    });

    console.log('\n✂️  Archiving low-quality phrases...');
    const updateRes = await db.query(
      `UPDATE phrases
       SET status = 'rejected'
       WHERE id IN (
         SELECT phrase_id FROM latest_phrase_scores WHERE final_score < $1
       )
       AND status <> 'rejected'`,
      [threshold]
    );

    console.log(`✅ ${updateRes.rowCount} phrases marked as 'rejected'.`);
    console.log('🎉 Prune completed successfully.');
  } catch (error) {
    console.error('❌ Prune failed:', error.message);
  } finally {
    await db.close();
  }
}

// ---- CLI entry ----
const arg = process.argv[2];
const thresholdArg = arg && !Number.isNaN(parseInt(arg, 10)) ? parseInt(arg, 10) : 55;

prune(thresholdArg);
