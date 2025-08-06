#!/usr/bin/env node

// Remove placeholder entities and rebalance the dataset
const fs = require('fs');

const entitiesFile = './data/curated/wikidata-entities-expanded.json';
const data = JSON.parse(fs.readFileSync(entitiesFile, 'utf8'));

console.log('🧹 Removing placeholder entities...');
console.log(`📊 Starting with: ${Object.keys(data.entities).length} entities`);

// Remove entities that are clearly placeholders
const placeholderPatterns = [
  /Placeholder/i,
  /Entity \d+/,
  /Test Entity/i,
  /Sample/i,
  /Example/i,
  /Dummy/i,
  /^Q\d+_placeholder/,
  /^Entity_\d+/
];

let removed = 0;
const toRemove = [];

for (const [id, entity] of Object.entries(data.entities)) {
  const isPlaceholder = placeholderPatterns.some(pattern => 
    pattern.test(entity.label) || pattern.test(id)
  );
  
  if (isPlaceholder) {
    toRemove.push(id);
    removed++;
  }
}

// Remove placeholders
toRemove.forEach(id => {
  delete data.entities[id];
});

// Update count
data.meta.count = Object.keys(data.entities).length;

// Save cleaned dataset
fs.writeFileSync(entitiesFile, JSON.stringify(data, null, 2));

console.log(`✅ Removed ${removed} placeholder entities`);
console.log(`📊 New total: ${data.meta.count} entities`);

// Show new distribution
const distribution = {};
for (const entity of Object.values(data.entities)) {
  const category = entity.category || 'other';
  distribution[category] = (distribution[category] || 0) + 1;
}

console.log('\n📊 Updated Distribution:');
for (const [category, count] of Object.entries(distribution).sort((a, b) => b[1] - a[1])) {
  const target = data.meta.target_categories[category] || 0;
  const percentage = target > 0 ? Math.round((count / target) * 100) : 0;
  console.log(`  ${category}: ${count}/${target} (${percentage}%)`);
}