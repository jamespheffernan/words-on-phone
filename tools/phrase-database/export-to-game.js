const PhraseDatabase = require('./src/database');
const fs = require('fs').promises;
const path = require('path');

// Category mapping from database to game format
const CATEGORY_MAPPING = {
  'Movies & TV': 'MOVIES',
  'Music & Artists': 'MUSIC', 
  'Sports & Athletes': 'SPORTS',
  'Food & Drink': 'FOOD',
  'Places & Travel': 'PLACES',
  'Famous People': 'PEOPLE',
  'Technology & Science': 'TECHNOLOGY',
  'History & Events': 'HISTORY',
  'Entertainment & Pop Culture': 'ENTERTAINMENT',
  'Nature & Animals': 'NATURE',
  'Everything': 'EVERYTHING',
  'Everything+': 'EVERYTHING_PLUS',
  'Emotions & Feelings': 'EMOTIONS',
  'Fantasy & Magic': 'FANTASY',
  'Transportation': 'TRANSPORTATION', 
  'Weather & Seasons': 'WEATHER',
  'Internet & Social Media': 'INTERNET',
  'Clothing & Fashion': 'CLOTHING',
  'Brands & Companies': 'BRANDS',
  'Occupations & Jobs': 'OCCUPATIONS'
};

async function exportToGameFormat() {
  console.log('🎮 Starting export to game format...');
  
  const db = new PhraseDatabase();
  await db.initialize();
  
  try {
    // Get all categories first
    const categoryList = await db.db.all(`
      SELECT category, COUNT(*) as count 
      FROM phrases 
      GROUP BY category 
      ORDER BY count DESC
    `);
    
    console.log(`📊 Found ${categoryList ? categoryList.length : 0} categories:`);
    
    const exportData = {};
    let totalPhrases = 0;
    
    if (categoryList && categoryList.length > 0) {
      for (const cat of categoryList) {
        // Get phrases for this category
        const phraseRows = await db.db.all(`
          SELECT phrase FROM phrases 
          WHERE category = ? 
          ORDER BY phrase
        `, [cat.category]);
        
        const phrases = phraseRows.map(row => row.phrase);
        const varName = CATEGORY_MAPPING[cat.category] || cat.category.toUpperCase().replace(/[^A-Z0-9]/g, '_');
        
        exportData[varName] = {
          name: cat.category,
          count: cat.count,
          phrases: phrases
        };
        
        totalPhrases += cat.count;
        console.log(`  ${cat.category}: ${cat.count} phrases`);
      }
    } else {
      console.log('  No categories found in database');
    }
    
    console.log(`\n📈 Total phrases: ${totalPhrases}`);
    
    // Create TypeScript format
    const tsContent = generateTypeScriptFormat(exportData);
    
    // Create JSON backup
    const jsonContent = JSON.stringify(exportData, null, 2);
    
    // Write files
    const outputDir = path.join(__dirname, '../../');
    await fs.writeFile(path.join(outputDir, 'phrases-export.json'), jsonContent);
    await fs.writeFile(path.join(outputDir, 'phrases-export.ts'), tsContent);
    
    console.log(`\n✅ Export complete!`);
    console.log(`📄 JSON: phrases-export.json (${Math.round(jsonContent.length / 1024)}KB)`);
    console.log(`📄 TypeScript: phrases-export.ts (${Math.round(tsContent.length / 1024)}KB)`);
    console.log(`🎯 Ready for integration into words-on-phone-app/src/data/phrases.ts`);
    
  } catch (error) {
    console.error('❌ Export failed:', error.message);
    throw error;
  } finally {
    await db.close();
  }
}

function generateTypeScriptFormat(data) {
  let content = `// Generated phrase database export - ${new Date().toISOString()}\n`;
  content += `// Total phrases: ${Object.values(data).reduce((sum, cat) => sum + cat.count, 0)}\n\n`;
  
  content += `// Phrase categories enum\n`;
  content += `export enum PhraseCategory {\n`;
  for (const [varName, category] of Object.entries(data)) {
    content += `  ${varName} = '${category.name}',\n`;
  }
  content += `}\n\n`;
  
  // Generate phrase arrays
  for (const [varName, category] of Object.entries(data)) {
    const arrayName = `${varName.toLowerCase()}Phrases`;
    content += `// ${category.name} - ${category.count} phrases\n`;
    content += `const ${arrayName} = [\n`;
    for (const phrase of category.phrases) {
      content += `  "${phrase.replace(/"/g, '\\"')}",\n`;
    }
    content += `];\n\n`;
  }
  
  // Generate category mapping
  content += `// Category to phrases mapping\n`;
  content += `export const phrasesByCategory = {\n`;
  for (const [varName, category] of Object.entries(data)) {
    const arrayName = `${varName.toLowerCase()}Phrases`;
    content += `  [PhraseCategory.${varName}]: ${arrayName},\n`;
  }
  content += `};\n\n`;
  
  // Generate helper function
  content += `export function getPhrasesByCategory(category: PhraseCategory): string[] {\n`;
  content += `  return phrasesByCategory[category] || [];\n`;
  content += `}\n\n`;
  
  // Generate stats
  content += `export const phraseStats = {\n`;
  content += `  totalPhrases: ${Object.values(data).reduce((sum, cat) => sum + cat.count, 0)},\n`;
  content += `  totalCategories: ${Object.keys(data).length},\n`;
  content += `  generatedAt: '${new Date().toISOString()}',\n`;
  content += `  categoryBreakdown: {\n`;
  for (const [varName, category] of Object.entries(data)) {
    content += `    '${category.name}': ${category.count},\n`;
  }
  content += `  }\n`;
  content += `};\n`;
  
  return content;
}

// Run the export
if (require.main === module) {
  exportToGameFormat().catch(console.error);
}

module.exports = { exportToGameFormat }; 