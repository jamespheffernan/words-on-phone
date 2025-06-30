const PhraseDatabase = require('./src/database');
const fs = require('fs').promises;
const path = require('path');

async function exportDatabase() {
  console.log('🎮 Starting database export...');
  
  const db = new PhraseDatabase();
  await db.initialize();
  
  try {
    // Get stats first
    const stats = await db.getStats();
    console.log(`📊 Database contains ${stats.total} phrases across ${stats.categories.length} categories:`);
    
    stats.categories.forEach(cat => {
      console.log(`  ${cat.category}: ${cat.count} phrases`);
    });
    
    // Export using built-in method
    const gameFormat = await db.exportToGameFormat();
    
    // Create backup of current phrases.json
    const backupPath = path.join(__dirname, '../../phrases_backup.json');
    const exportPath = path.join(__dirname, '../../phrases-new.json');
    
    // Write the new export
    await fs.writeFile(exportPath, JSON.stringify(gameFormat, null, 2));
    
    console.log(`\n✅ Export complete!`);
    console.log(`📄 New phrases: ${exportPath}`);
    console.log(`📊 Total phrases: ${stats.total}`);
    console.log(`📊 Categories: ${stats.categories.length}`);
    
    // Show sample of export
    console.log(`\n🔍 Sample export structure:`);
    Object.keys(gameFormat).slice(0, 3).forEach(category => {
      console.log(`  ${category}: ${gameFormat[category].length} phrases`);
      console.log(`    Sample: ${gameFormat[category].slice(0, 3).join(', ')}...`);
    });
    
  } catch (error) {
    console.error('❌ Export failed:', error.message);
    throw error;
  } finally {
    await db.close();
  }
}

// Run the export
if (require.main === module) {
  exportDatabase().catch(console.error);
}

module.exports = { exportDatabase }; 