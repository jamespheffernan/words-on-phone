#!/usr/bin/env node

/**
 * Task 4 Phrase Export Script
 * Simple export to get our 591 phrases from the database
 */

const PhraseDatabase = require('./src/database');
const GameExporter = require('./src/gameExporter');
const fs = require('fs').promises;

async function exportTask4Phrases() {
  const db = new PhraseDatabase();
  
  try {
    console.log('🚀 Task 4 Phrase Export');
    console.log('=' .repeat(50));
    
    await db.initialize();
    
    // Get all phrases
    const allPhrases = await db.getAllPhrases();
    console.log(`📊 Found ${allPhrases.length} phrases in database`);
    
    // Export in different formats
    
    // 1. Full JSON export
    const jsonPath = 'task4-phrases-full.json';
    await fs.writeFile(jsonPath, JSON.stringify(allPhrases, null, 2));
    console.log(`✅ Full JSON export: ${jsonPath} (${allPhrases.length} phrases)`);
    
    // 2. Game format export using GameExporter
    const gameExporter = new GameExporter(db);
    
    // Export all categories as separate game formats
    const gameFormats = await gameExporter.exportMultipleCategories({
      shuffle: true,
      minScore: 0 // Include all phrases
    });
    
    const gameJsonPath = 'task4-phrases-game.json';
    await fs.writeFile(gameJsonPath, JSON.stringify(gameFormats, null, 2));
    console.log(`✅ Game format export: ${gameJsonPath} (${gameFormats.length} categories)`);
    
    // 3. Category statistics
    const stats = await gameExporter.getExportStats();
    console.log('\n📈 Export Statistics:');
    console.log(`   Total phrases: ${stats.total}`);
    console.log(`   Categories: ${stats.categories.length}`);
    console.log(`   Average score: ${stats.scoreDistribution.average}/100`);
    
    console.log('\n📋 Phrases by Category:');
    stats.categories.forEach(cat => {
      console.log(`   ${cat.name}: ${cat.count} phrases (avg: ${cat.averageScore}/100)`);
    });
    
    // 4. Summary export for integration
    const summaryData = {
      exportDate: new Date().toISOString(),
      totalPhrases: allPhrases.length,
      categories: stats.categories.length,
      averageScore: stats.scoreDistribution.average,
      gameFormats: gameFormats.map(gf => ({
        category: gf.category,
        phraseCount: gf.phrases.length
      })),
      qualityDistribution: stats.scoreDistribution
    };
    
    const summaryPath = 'task4-export-summary.json';
    await fs.writeFile(summaryPath, JSON.stringify(summaryData, null, 2));
    console.log(`✅ Summary export: ${summaryPath}`);
    
    await db.close();
    
    console.log('\n🎉 Task 4 export complete!');
    console.log('📁 Generated files:');
    console.log(`   - ${jsonPath} (full data)`);
    console.log(`   - ${gameJsonPath} (game format)`);
    console.log(`   - ${summaryPath} (summary)`);
    
  } catch (error) {
    console.error('❌ Export failed:', error);
    await db.close();
    process.exit(1);
  }
}

// Run the export
exportTask4Phrases(); 