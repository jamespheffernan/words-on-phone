#!/usr/bin/env node

const PhraseDatabase = require('../src/database');
const path = require('path');

class DatabaseCleanup {
  constructor() {
    this.db = new PhraseDatabase();
  }

  async initialize() {
    await this.db.initialize();
    console.log('🧹 Database Cleanup Tool');
    console.log('========================');
  }

  async analyzeScores(threshold = 70) {
    console.log(`\n📊 Analyzing phrases below score threshold: ${threshold}`);
    
    const lowScoring = await this.db.db.all(`
      SELECT id, phrase, category, score, source_provider, model_id
      FROM phrases 
      WHERE score > 0 AND score < ?
      ORDER BY score ASC
    `, [threshold]);

    console.log(`Found ${lowScoring ? lowScoring.length : 0} phrases below threshold:`);
    if (lowScoring && lowScoring.length > 0) {
      lowScoring.forEach(p => {
        console.log(`  ${p.score}: "${p.phrase}" (${p.category}) [${p.source_provider}]`);
      });
    }

    return lowScoring || [];
  }

  async removeLowScoringPhrases(threshold = 70, dryRun = false) {
    const lowScoring = await this.analyzeScores(threshold);
    
    if (lowScoring.length === 0) {
      console.log('✅ No phrases found below threshold - database is already clean!');
      return;
    }

    if (dryRun) {
      console.log(`\n🔍 DRY RUN: Would remove ${lowScoring.length} phrases`);
      return;
    }

    console.log(`\n🗑️  Removing ${lowScoring.length} phrases below score ${threshold}...`);
    
    for (const phrase of lowScoring) {
      const result = await this.db.db.run('DELETE FROM phrases WHERE id = ?', [phrase.id]);
      console.log(`  ✓ Removed: "${phrase.phrase}" (score: ${phrase.score})`);
    }

    console.log(`\n✅ Successfully removed ${lowScoring.length} low-scoring phrases`);
  }

  async generateStats() {
    console.log('\n📈 Updated Database Statistics:');
    
    const stats = await this.db.db.get(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN score >= 80 THEN 1 END) as excellent,
        COUNT(CASE WHEN score >= 70 THEN 1 END) as good_plus,
        AVG(score) as avg_score,
        MIN(score) as min_score,
        MAX(score) as max_score
      FROM phrases
    `);

    console.log(`  Total phrases: ${stats.total}`);
    console.log(`  Excellent (80+): ${stats.excellent} (${((stats.excellent/stats.total)*100).toFixed(1)}%)`);
    console.log(`  Good+ (70+): ${stats.good_plus} (${((stats.good_plus/stats.total)*100).toFixed(1)}%)`);
    console.log(`  Average score: ${stats.avg_score.toFixed(1)}`);
    console.log(`  Score range: ${stats.min_score} - ${stats.max_score}`);

    // Category distribution
    const categories = await this.db.db.all(`
      SELECT category, COUNT(*) as count
      FROM phrases 
      GROUP BY category 
      ORDER BY count DESC
    `);

    console.log('\n📋 Category distribution:');
    categories.forEach(cat => {
      console.log(`  ${cat.category}: ${cat.count} phrases`);
    });
  }

  async exportCleanedGame() {
    console.log('\n📤 Exporting cleaned phrases for game...');
    
    try {
      const exportScript = path.join(__dirname, 'export-game-json.js');
      const { execSync } = require('child_process');
      
      execSync(`node "${exportScript}"`, { 
        stdio: 'inherit',
        cwd: path.dirname(exportScript)
      });
      
      console.log('✅ Game export completed successfully');
    } catch (error) {
      console.error('❌ Export failed:', error.message);
      console.log('💡 You can manually run: npm run export-game');
    }
  }

  async close() {
    await this.db.close();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const threshold = parseInt(args.find(arg => arg.startsWith('--threshold='))?.split('=')[1]) || 70;
  const dryRun = args.includes('--dry-run');
  const skipExport = args.includes('--skip-export');

  if (args.includes('--help')) {
    console.log(`
Database Cleanup Tool - Remove low-scoring phrases

Usage: node cleanup-low-scores.js [options]

Options:
  --threshold=N     Remove phrases below score N (default: 70)
  --dry-run        Show what would be removed without actually removing
  --skip-export    Don't regenerate game export after cleanup
  --help           Show this help message

Examples:
  node cleanup-low-scores.js --threshold=60 --dry-run
  node cleanup-low-scores.js --threshold=70
  node cleanup-low-scores.js --threshold=65 --skip-export
`);
    return;
  }

  const cleanup = new DatabaseCleanup();
  
  try {
    await cleanup.initialize();
    await cleanup.removeLowScoringPhrases(threshold, dryRun);
    
    if (!dryRun) {
      await cleanup.generateStats();
      
      if (!skipExport) {
        await cleanup.exportCleanedGame();
      }
    }
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  } finally {
    await cleanup.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = DatabaseCleanup; 