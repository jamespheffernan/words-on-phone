#!/usr/bin/env node

// Fix Entity ### placeholders in the entity dataset
const fs = require('fs');

const entitiesFile = './data/curated/wikidata-entities-expanded.json';
const data = JSON.parse(fs.readFileSync(entitiesFile, 'utf8'));

console.log('🔧 Removing Entity ### placeholders...');
console.log(`📊 Starting with: ${Object.keys(data.entities).length} entities`);

let removed = 0;
const toRemove = [];

// Find all entities with "Entity" in the label
for (const [id, entity] of Object.entries(data.entities)) {
  if (entity.label && entity.label.match(/^Entity \d+$/)) {
    toRemove.push(id);
    removed++;
    console.log(`  Removing: ${entity.label} (${id})`);
  }
}

// Remove all Entity ### placeholders
toRemove.forEach(id => {
  delete data.entities[id];
});

// Update count
data.meta.count = Object.keys(data.entities).length;

// Save cleaned dataset
fs.writeFileSync(entitiesFile, JSON.stringify(data, null, 2));

console.log(`✅ Removed ${removed} Entity placeholders`);
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