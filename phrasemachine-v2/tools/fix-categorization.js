#!/usr/bin/env node

// Fix entity categorization based on type and label analysis
const fs = require('fs');

const entitiesFile = './data/curated/wikidata-entities-expanded.json';
const data = JSON.parse(fs.readFileSync(entitiesFile, 'utf8'));

console.log('🔧 Fixing entity categorization...');
console.log(`📊 Processing: ${Object.keys(data.entities).length} entities`);

// Categorization rules
function categorizeEntity(entity) {
  const label = entity.label.toLowerCase();
  
  // Person (Q5 = human)
  if (entity.type === 'Q5') {
    return 'person';
  }
  
  // Movies - common movie patterns
  if (label.includes('movie') || label.includes('film') || 
      ['the ', 'a ', 'an '].some(prefix => label.startsWith(prefix)) ||
      ['avatar', 'titanic', 'frozen', 'avengers', 'star wars', 'harry potter', 
       'lord of the rings', 'batman', 'superman', 'spider-man', 'iron man',
       'jurassic', 'godfather', 'pulp fiction', 'shawshank', 'forrest gump'].some(movie => label.includes(movie))) {
    return 'movie';
  }
  
  // TV Shows
  if (label.includes('show') || label.includes('series') ||
      ['breaking bad', 'game of thrones', 'friends', 'the office', 'stranger things',
       'house of cards', 'orange is the new black', 'walking dead', 'lost', 'seinfeld'].some(show => label.includes(show))) {
    return 'tv_show';
  }
  
  // Places - cities, landmarks
  if (['new york', 'los angeles', 'chicago', 'houston', 'philadelphia', 'phoenix',
       'san antonio', 'san diego', 'dallas', 'san jose', 'austin', 'jacksonville',
       'fort worth', 'columbus', 'charlotte', 'san francisco', 'indianapolis',
       'seattle', 'denver', 'washington', 'boston', 'el paso', 'detroit', 'nashville',
       'portland', 'memphis', 'oklahoma city', 'las vegas', 'louisville', 'baltimore',
       'milwaukee', 'albuquerque', 'tucson', 'fresno', 'sacramento', 'mesa', 'kansas city',
       'atlanta', 'long beach', 'colorado springs', 'raleigh', 'miami', 'virginia beach',
       'omaha', 'oakland', 'minneapolis', 'tulsa', 'arlington', 'tampa', 'new orleans',
       'london', 'paris', 'tokyo', 'berlin', 'madrid', 'rome', 'moscow', 'beijing',
       'sydney', 'toronto', 'dubai', 'mumbai', 'delhi', 'bangkok', 'seoul', 'cairo',
       'bridge', 'tower', 'statue', 'park', 'square', 'falls', 'canyon', 'mountain'].some(place => label.includes(place))) {
    return 'place';
  }
  
  // Companies
  if (['apple', 'google', 'microsoft', 'amazon', 'facebook', 'meta', 'tesla', 'netflix',
       'disney', 'mcdonalds', 'coca-cola', 'pepsi', 'nike', 'adidas', 'walmart', 'target',
       'starbucks', 'uber', 'airbnb', 'spotify', 'twitter', 'instagram', 'youtube',
       'corporation', 'company', 'inc', 'llc', 'ltd'].some(company => label.includes(company))) {
    return 'company';
  }
  
  // Food
  if (['pizza', 'burger', 'sandwich', 'pasta', 'chicken', 'beef', 'pork', 'fish',
       'salad', 'soup', 'bread', 'cheese', 'chocolate', 'cake', 'cookie', 'ice cream',
       'coffee', 'tea', 'beer', 'wine', 'soda', 'juice', 'water', 'milk'].some(food => label.includes(food))) {
    return 'food';
  }
  
  // Sports
  if (['football', 'basketball', 'baseball', 'soccer', 'tennis', 'golf', 'hockey',
       'boxing', 'swimming', 'running', 'cycling', 'skiing', 'snowboarding',
       'surfing', 'skating', 'wrestling', 'volleyball', 'cricket', 'rugby'].some(sport => label.includes(sport))) {
    return 'sport';
  }
  
  // Countries
  if (['united states', 'canada', 'mexico', 'brazil', 'argentina', 'chile', 'colombia',
       'peru', 'venezuela', 'ecuador', 'bolivia', 'uruguay', 'paraguay', 'guyana',
       'suriname', 'france', 'germany', 'italy', 'spain', 'portugal', 'netherlands',
       'belgium', 'switzerland', 'austria', 'sweden', 'norway', 'denmark', 'finland',
       'poland', 'czech republic', 'slovakia', 'hungary', 'romania', 'bulgaria',
       'greece', 'turkey', 'russia', 'ukraine', 'belarus', 'lithuania', 'latvia',
       'estonia', 'china', 'japan', 'south korea', 'north korea', 'india', 'pakistan',
       'bangladesh', 'sri lanka', 'nepal', 'bhutan', 'maldives', 'afghanistan',
       'iran', 'iraq', 'syria', 'lebanon', 'israel', 'palestine', 'jordan', 'saudi arabia',
       'yemen', 'oman', 'uae', 'qatar', 'bahrain', 'kuwait', 'egypt', 'libya', 'tunisia',
       'algeria', 'morocco', 'sudan', 'ethiopia', 'kenya', 'tanzania', 'uganda',
       'rwanda', 'burundi', 'congo', 'cameroon', 'nigeria', 'ghana', 'ivory coast',
       'senegal', 'mali', 'burkina faso', 'niger', 'chad', 'central african republic',
       'gabon', 'equatorial guinea', 'sao tome and principe', 'cape verde',
       'guinea-bissau', 'guinea', 'sierra leone', 'liberia', 'madagascar', 'mauritius',
       'seychelles', 'comoros', 'djibouti', 'eritrea', 'somalia', 'south africa',
       'namibia', 'botswana', 'zimbabwe', 'zambia', 'malawi', 'mozambique', 'swaziland',
       'lesotho', 'australia', 'new zealand', 'fiji', 'papua new guinea', 'solomon islands',
       'vanuatu', 'samoa', 'tonga', 'kiribati', 'tuvalu', 'nauru', 'palau', 'marshall islands',
       'micronesia'].some(country => label.includes(country))) {
    return 'country';
  }
  
  return 'other';
}

// Apply categorization
let categorized = 0;
for (const entity of Object.values(data.entities)) {
  const newCategory = categorizeEntity(entity);
  if (newCategory !== 'other') {
    entity.category = newCategory;
    categorized++;
  } else {
    entity.category = 'other';
  }
}

// Save updated dataset
fs.writeFileSync(entitiesFile, JSON.stringify(data, null, 2));

console.log(`✅ Categorized ${categorized} entities`);

// Show distribution
const distribution = {};
for (const entity of Object.values(data.entities)) {
  const category = entity.category || 'other';
  distribution[category] = (distribution[category] || 0) + 1;
}

console.log('\n📊 Final Distribution:');
for (const [category, count] of Object.entries(distribution).sort((a, b) => b[1] - a[1])) {
  const target = data.meta.target_categories[category] || 0;
  const percentage = target > 0 ? Math.round((count / target) * 100) : 0;
  console.log(`  ${category}: ${count}/${target} (${percentage}%)`);
}