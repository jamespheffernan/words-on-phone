#!/usr/bin/env node

const { DEFAULT_CATEGORY_GROUPS, getCategoryGroup } = require('./dist/types/category.js');

// New categories from the Gemini batch
const newCategories = [
  'Board Games & Toys',
  'Hobbies & Crafts', 
  'Holidays & Celebrations',
  'Mythology & Folklore',
  'Fairy Tales & Fables',
  'Household Items',
  'School & Education',
  'On the Farm',
  'Under the Sea',
  'Outer Space & Astronomy',
  'Geology & Earth Science',
  'Anatomy & Medical',
  'Tools & Home Improvement',
  'Musical Instruments',
  'Famous Duos & Trios',
  'In the Office',
  'Money & Finance',
  'Crimes & Justice',
  'Childhood & Nostalgia',
  'Natural Wonders',
  'World Architecture',
  'Units of Measurement'
];

console.log('📊 Analyzing new categories against existing groups...\n');

const grouped = {};
const ungrouped = [];

newCategories.forEach(category => {
  const group = getCategoryGroup(category);
  if (group) {
    if (!grouped[group.name]) {
      grouped[group.name] = [];
    }
    grouped[group.name].push(category);
  } else {
    ungrouped.push(category);
  }
});

console.log('✅ Categories that fit existing groups:');
Object.entries(grouped).forEach(([groupName, categories]) => {
  console.log(`  ${groupName}:`);
  categories.forEach(cat => console.log(`    • ${cat}`));
  console.log('');
});

if (ungrouped.length > 0) {
  console.log('❓ Categories that need new groups or reassignment:');
  ungrouped.forEach(cat => console.log(`  • ${cat}`));
  console.log('');
}

console.log(`📈 Summary: ${newCategories.length - ungrouped.length}/${newCategories.length} categories fit existing groups`);
console.log(`🔄 ${ungrouped.length} categories need group assignment`);