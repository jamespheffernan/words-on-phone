#!/usr/bin/env node

// Interactive tool to easily add more entities
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const entitiesFile = './data/curated/wikidata-entities-expanded.json';
const data = JSON.parse(fs.readFileSync(entitiesFile));

console.log('🎯 Entity Expansion Tool');
console.log('Current entities:', Object.keys(data.entities).length);
console.log('Target: 500+ entities\n');

// Show current distribution
const stats = {};
Object.values(data.entities).forEach(entity => {
  const typeMap = {
    'Q5': 'person',
    'Q11424': 'movie',
    'Q5398426': 'tv_show',
    'Q515': 'place',
    'Q6256': 'country',
    'Q43229': 'company',
    'Q1047113': 'food',
    'Q349': 'sport'
  };
  const category = typeMap[entity.type] || 'other';
  stats[category] = (stats[category] || 0) + 1;
});

console.log('📊 Current Distribution:');
Object.entries(stats).sort(([,a], [,b]) => b - a).forEach(([cat, count]) => {
  const target = data.meta.target_categories[cat] || 0;
  const remaining = Math.max(0, target - count);
  console.log(`  ${cat}: ${count}/${target} (need ${remaining} more)`);
});
console.log();

function addEntity() {
  rl.question('Entity name (or "exit" to save & quit): ', (name) => {
    if (name.toLowerCase() === 'exit') {
      saveAndExit();
      return;
    }
    
    if (!name.trim()) {
      console.log('❌ Please enter a valid entity name');
      addEntity();
      return;
    }
    
    rl.question('Category (person/movie/tv_show/place/country/company/food/sport/other): ', (category) => {
      const validCategories = ['person', 'movie', 'tv_show', 'place', 'country', 'company', 'food', 'sport', 'other'];
      if (!validCategories.includes(category)) {
        console.log('❌ Invalid category. Please use one of:', validCategories.join(', '));
        addEntity();
        return;
      }
      
      rl.question('Aliases (comma-separated, optional): ', (aliasStr) => {
        rl.question('Sitelinks count (for difficulty, default 100): ', (sitelinksStr) => {
          const aliases = aliasStr ? aliasStr.split(',').map(a => a.trim()).filter(a => a) : [];
          const sitelinks = parseInt(sitelinksStr) || 100;
          
          // Generate a pseudo Q-number
          const qNum = 'Q' + Math.floor(Math.random() * 1000000);
          
          const typeMap = {
            'person': 'Q5',
            'movie': 'Q11424',
            'tv_show': 'Q5398426',
            'place': 'Q515',
            'country': 'Q6256',
            'company': 'Q43229',
            'food': 'Q1047113',
            'sport': 'Q349',
            'other': 'Q35120'
          };
          
          data.entities[qNum] = {
            id: qNum,
            label: name.trim(),
            sitelinks: sitelinks,
            type: typeMap[category],
            aliases: aliases
          };
          
          console.log(`✅ Added: ${name} (${category}) with ${aliases.length} aliases`);
          data.meta.count = Object.keys(data.entities).length;
          
          // Show updated count for this category
          const newStats = {};
          Object.values(data.entities).forEach(entity => {
            const cat = Object.keys(typeMap).find(key => typeMap[key] === entity.type) || 'other';
            newStats[cat] = (newStats[cat] || 0) + 1;
          });
          
          const target = data.meta.target_categories[category] || 0;
          const current = newStats[category] || 0;
          const remaining = Math.max(0, target - current);
          console.log(`📊 ${category}: ${current}/${target} (need ${remaining} more)\n`);
          
          addEntity(); // Continue adding
        });
      });
    });
  });
}

function saveAndExit() {
  fs.writeFileSync(entitiesFile, JSON.stringify(data, null, 2));
  console.log(`\n💾 Saved ${Object.keys(data.entities).length} entities`);
  console.log('🎉 Entity expansion complete!');
  
  // Show final distribution
  const finalStats = {};
  Object.values(data.entities).forEach(entity => {
    const typeMap = {
      'Q5': 'person',
      'Q11424': 'movie',
      'Q5398426': 'tv_show',
      'Q515': 'place',
      'Q6256': 'country',
      'Q43229': 'company',
      'Q1047113': 'food',
      'Q349': 'sport'
    };
    const category = typeMap[entity.type] || 'other';
    finalStats[category] = (finalStats[category] || 0) + 1;
  });
  
  console.log('\n📊 Final Distribution:');
  Object.entries(finalStats).sort(([,a], [,b]) => b - a).forEach(([cat, count]) => {
    const target = data.meta.target_categories[cat] || 0;
    const progress = target > 0 ? Math.round((count / target) * 100) : 100;
    console.log(`  ${cat}: ${count}/${target} (${progress}%)`);
  });
  
  rl.close();
}

addEntity();