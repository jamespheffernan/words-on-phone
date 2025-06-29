#!/usr/bin/env node

/**
 * Simple Game Format Export for Task 4
 * Creates game-compatible JSON without using GameExporter
 */

const PhraseDatabase = require('./src/database');
const fs = require('fs').promises;

async function exportGameFormat() {
  const db = new PhraseDatabase();
  
  try {
    console.log('🎮 Task 4 Game Format Export');
    console.log('=' .repeat(50));
    
    await db.initialize();
    
    // Get all phrases
    const allPhrases = await db.getAllPhrases();
    console.log(`📊 Found ${allPhrases.length} phrases in database`);
    
    // Group phrases by category
    const categorizedPhrases = {};
    allPhrases.forEach(phrase => {
      if (!categorizedPhrases[phrase.category]) {
        categorizedPhrases[phrase.category] = [];
      }
      categorizedPhrases[phrase.category].push(phrase.phrase);
    });
    
    // Create game formats array (one per category)
    const gameFormats = [];
    
    console.log('\n📋 Processing categories:');
    Object.entries(categorizedPhrases).forEach(([category, phrases]) => {
      // Shuffle phrases for game variety
      const shuffledPhrases = [...phrases].sort(() => Math.random() - 0.5);
      
      gameFormats.push({
        category: category,
        phrases: shuffledPhrases
      });
      
      console.log(`   ${category}: ${phrases.length} phrases`);
    });
    
    // Sort by phrase count (descending)
    gameFormats.sort((a, b) => b.phrases.length - a.phrases.length);
    
    // Export multiple categories format
    const gameJsonPath = 'task4-phrases-game-format.json';
    await fs.writeFile(gameJsonPath, JSON.stringify(gameFormats, null, 2));
    console.log(`\n✅ Game format export: ${gameJsonPath}`);
    
    // Export single file format (for compatibility with existing game)
    const singleCategoryPath = 'task4-entertainment-category.json';
    const entertainmentCategory = gameFormats.find(gf => gf.category === 'Entertainment & Pop Culture');
    if (entertainmentCategory) {
      await fs.writeFile(singleCategoryPath, JSON.stringify(entertainmentCategory, null, 2));
      console.log(`✅ Entertainment category: ${singleCategoryPath} (${entertainmentCategory.phrases.length} phrases)`);
    }
    
    // Create production-ready combined phrases file
    const allPhrasesForGame = gameFormats.reduce((acc, gf) => {
      return acc.concat(gf.phrases);
    }, []);
    
    const combinedPath = 'task4-all-phrases-combined.json';
    await fs.writeFile(combinedPath, JSON.stringify({ 
      category: "All Categories Combined",
      phrases: allPhrasesForGame.sort(() => Math.random() - 0.5),
      metadata: {
        totalPhrases: allPhrasesForGame.length,
        categories: gameFormats.length,
        exportDate: new Date().toISOString()
      }
    }, null, 2));
    console.log(`✅ Combined format: ${combinedPath} (${allPhrasesForGame.length} phrases)`);
    
    // Summary
    console.log('\n📈 Export Summary:');
    console.log(`   Total phrases: ${allPhrases.length}`);
    console.log(`   Categories: ${gameFormats.length}`);
    console.log(`   Largest category: ${gameFormats[0].category} (${gameFormats[0].phrases.length} phrases)`);
    console.log(`   Smallest category: ${gameFormats[gameFormats.length-1].category} (${gameFormats[gameFormats.length-1].phrases.length} phrases)`);
    
    await db.close();
    
    console.log('\n🎉 Game format export complete!');
    console.log('📁 Generated files:');
    console.log(`   - ${gameJsonPath} (all categories)`);
    console.log(`   - ${singleCategoryPath} (entertainment only)`);
    console.log(`   - ${combinedPath} (all phrases combined)`);
    
  } catch (error) {
    console.error('❌ Export failed:', error);
    await db.close();
    process.exit(1);
  }
}

// Run the export
exportGameFormat(); 