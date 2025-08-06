#!/usr/bin/env node

/**
 * Convert the combined Gemini batch JSON to the format expected by the game
 * Input: geminibatch2-combined.json (categories with phrases arrays)
 * Output: Updates public/phrases.json (flat array of phrase objects)
 */

const fs = require('fs');
const path = require('path');

async function convertAndImportBatch() {
  try {
    console.log('🔄 Converting Gemini batch data...');
    
    // Read the combined batch file
    const batchPath = path.join(__dirname, 'geminibatch2-combined.json');
    const batchData = JSON.parse(fs.readFileSync(batchPath, 'utf8'));
    
    // Read current phrases
    const phrasesPath = path.join(__dirname, 'public', 'phrases.json');
    const currentPhrases = JSON.parse(fs.readFileSync(phrasesPath, 'utf8'));
    
    console.log(`📊 Current phrases: ${currentPhrases.length}`);
    console.log(`📊 Batch categories: ${batchData.categories.length}`);
    
    // Convert batch format to game format
    const newPhrases = [];
    let totalNewPhrases = 0;
    
    for (const category of batchData.categories) {
      console.log(`📝 Processing category: "${category.name}" (${category.phrases.length} phrases)`);
      
      for (const phrase of category.phrases) {
        newPhrases.push({
          phrase: phrase,
          category: category.name
        });
        totalNewPhrases++;
      }
    }
    
    console.log(`✨ Converted ${totalNewPhrases} new phrases from ${batchData.categories.length} categories`);
    
    // Create set of existing phrases for deduplication
    const existingPhrases = new Set(
      currentPhrases.map(p => `${p.phrase.toLowerCase()}|${p.category.toLowerCase()}`)
    );
    
    // Filter out duplicates
    const uniqueNewPhrases = newPhrases.filter(p => 
      !existingPhrases.has(`${p.phrase.toLowerCase()}|${p.category.toLowerCase()}`)
    );
    
    console.log(`🔍 After deduplication: ${uniqueNewPhrases.length} unique new phrases`);
    console.log(`🗑️  Removed ${totalNewPhrases - uniqueNewPhrases.length} duplicates`);
    
    // Combine with existing phrases
    const combinedPhrases = [...currentPhrases, ...uniqueNewPhrases];
    
    // Sort by category, then by phrase
    combinedPhrases.sort((a, b) => {
      if (a.category === b.category) {
        return a.phrase.localeCompare(b.phrase);
      }
      return a.category.localeCompare(b.category);
    });
    
    console.log(`📈 Total phrases after import: ${combinedPhrases.length}`);
    
    // Create backup of current phrases
    const backupPath = path.join(__dirname, 'public', `phrases-backup-${Date.now()}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(currentPhrases, null, 2));
    console.log(`💾 Backup created: ${backupPath}`);
    
    // Write updated phrases
    fs.writeFileSync(phrasesPath, JSON.stringify(combinedPhrases, null, 2));
    console.log('✅ phrases.json updated successfully!');
    
    // Generate summary report
    const categoryStats = {};
    combinedPhrases.forEach(p => {
      categoryStats[p.category] = (categoryStats[p.category] || 0) + 1;
    });
    
    console.log('\n📊 Category Summary:');
    Object.entries(categoryStats)
      .sort(([,a], [,b]) => b - a)
      .forEach(([category, count]) => {
        console.log(`  ${category}: ${count} phrases`);
      });
      
    console.log(`\n🎉 Import complete! Added ${uniqueNewPhrases.length} new phrases.`);
    
    return {
      totalImported: uniqueNewPhrases.length,
      totalPhrases: combinedPhrases.length,
      categoriesAdded: batchData.categories.length,
      duplicatesRemoved: totalNewPhrases - uniqueNewPhrases.length
    };
    
  } catch (error) {
    console.error('❌ Error during import:', error);
    throw error;
  }
}

// Run the conversion
if (require.main === module) {
  convertAndImportBatch().catch(console.error);
}

module.exports = { convertAndImportBatch };