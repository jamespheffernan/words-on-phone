#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ENTITIES_FILE = path.join(__dirname, '../data/curated/wikidata-entities-expanded.json');

// Historical figures, events, and periods with rich aliases
const HISTORICAL_ENTITIES = {
  // Ancient Historical Figures
  "Q14212": {
    "id": "Q14211",
    "label": "Cleopatra",
    "sitelinks": 120,
    "type": "Q169470",
    "aliases": [
      "Cleopatra VII",
      "Queen of Egypt",
      "Cleopatra the Great"
    ],
    "category": "historical"
  },
  "Q1048": {
    "id": "Q1048",
    "label": "Julius Caesar",
    "sitelinks": 180,
    "type": "Q169470",
    "aliases": [
      "Caesar",
      "Gaius Julius Caesar",
      "The Dictator"
    ],
    "category": "historical"
  },
  "Q34201": {
    "id": "Q34201",
    "label": "Alexander the Great",
    "sitelinks": 160,
    "type": "Q169470",
    "aliases": [
      "Alexander III",
      "Alexander of Macedon",
      "The Great"
    ],
    "category": "historical"
  },
  "Q517": {
    "id": "Q517",
    "label": "Napoleon Bonaparte",
    "sitelinks": 200,
    "type": "Q169470",
    "aliases": [
      "Napoleon",
      "Napoleon I",
      "The Little Corporal",
      "Emperor Napoleon"
    ],
    "category": "historical"
  },
  "Q91": {
    "id": "Q91",
    "label": "George Washington",
    "sitelinks": 150,
    "type": "Q169470",
    "aliases": [
      "Washington",
      "Father of His Country",
      "General Washington"
    ],
    "category": "historical"
  },
  "Q958": {
    "id": "Q958",
    "label": "Abraham Lincoln",
    "sitelinks": 170,
    "type": "Q169470",
    "aliases": [
      "Lincoln",
      "Honest Abe",
      "The Great Emancipator",
      "Abe"
    ],
    "category": "historical"
  },
  "Q34433": {
    "id": "Q34433",
    "label": "Winston Churchill",
    "sitelinks": 160,
    "type": "Q169470",
    "aliases": [
      "Churchill",
      "Sir Winston",
      "The Bulldog"
    ],
    "category": "historical"
  },
  "Q7226": {
    "id": "Q7226",
    "label": "Joan of Arc",
    "sitelinks": 140,
    "type": "Q169470",
    "aliases": [
      "The Maid of Orléans",
      "Jeanne d'Arc",
      "Saint Joan"
    ],
    "category": "historical"
  },
  "Q472": {
    "id": "Q472",
    "label": "Queen Victoria",
    "sitelinks": 130,
    "type": "Q169470",
    "aliases": [
      "Victoria",
      "The Grandmother of Europe",
      "Queen Vic"
    ],
    "category": "historical"
  },
  "Q33999": {
    "id": "Q33999",
    "label": "Genghis Khan",
    "sitelinks": 120,
    "type": "Q169470",
    "aliases": [
      "Temujin",
      "The Great Khan",
      "Chinggis Khan"
    ],
    "category": "historical"
  },

  // Historical Events
  "Q362": {
    "id": "Q362",
    "label": "World War II",
    "sitelinks": 200,
    "type": "Q1190554",
    "aliases": [
      "WWII",
      "Second World War",
      "The War",
      "World War 2"
    ],
    "category": "historical"
  },
  "Q459": {
    "id": "Q459",
    "label": "World War I",
    "sitelinks": 180,
    "type": "Q1190554",
    "aliases": [
      "WWI",
      "The Great War",
      "First World War",
      "World War 1"
    ],
    "category": "historical"
  },
  "Q34636": {
    "id": "Q34636",
    "label": "French Revolution",
    "sitelinks": 150,
    "type": "Q1190554",
    "aliases": [
      "The Revolution",
      "Revolution française",
      "1789 Revolution"
    ],
    "category": "historical"
  },
  "Q12544": {
    "id": "Q12544",
    "label": "Moon Landing",
    "sitelinks": 140,
    "type": "Q1190554",
    "aliases": [
      "Apollo 11",
      "First Moon Landing",
      "Neil Armstrong",
      "One Small Step"
    ],
    "category": "historical"
  },
  "Q8676": {
    "id": "Q8676",
    "label": "American Civil War",
    "sitelinks": 130,
    "type": "Q1190554",
    "aliases": [
      "Civil War",
      "The War Between the States",
      "War of Northern Aggression"
    ],
    "category": "historical"
  },

  // Historical Periods
  "Q4692": {
    "id": "Q4692",
    "label": "Renaissance",
    "sitelinks": 120,
    "type": "Q198",
    "aliases": [
      "The Renaissance",
      "Italian Renaissance",
      "Rebirth"
    ],
    "category": "historical"
  },
  "Q12791": {
    "id": "Q12791",
    "label": "Industrial Revolution",
    "sitelinks": 110,
    "type": "Q198",
    "aliases": [
      "The Industrial Revolution",
      "Industrial Age",
      "Age of Industry"
    ],
    "category": "historical"
  },
  "Q866": {
    "id": "Q866",
    "label": "Cold War",
    "sitelinks": 140,
    "type": "Q198",
    "aliases": [
      "The Cold War",
      "Cold War Era",
      "East-West Conflict"
    ],
    "category": "historical"
  },

  // Scientists and Inventors
  "Q937": {
    "id": "Q937",
    "label": "Albert Einstein",
    "sitelinks": 170,
    "type": "Q37226",
    "aliases": [
      "Einstein",
      "The Genius",
      "E=mc²"
    ],
    "category": "scientist"
  },
  "Q935": {
    "id": "Q935",
    "label": "Isaac Newton",
    "sitelinks": 160,
    "type": "Q37226",
    "aliases": [
      "Newton",
      "Sir Isaac",
      "Father of Physics"
    ],
    "category": "scientist"
  },
  "Q1035": {
    "id": "Q1035",
    "label": "Charles Darwin",
    "sitelinks": 150,
    "type": "Q37226",
    "aliases": [
      "Darwin",
      "Father of Evolution",
      "Origin of Species"
    ],
    "category": "scientist"
  },
  "Q7186": {
    "id": "Q7186",
    "label": "Marie Curie",
    "sitelinks": 140,
    "type": "Q37226",
    "aliases": [
      "Madame Curie",
      "Radioactivity Pioneer",
      "Nobel Prize Winner"
    ],
    "category": "scientist"
  },
  "Q5684": {
    "id": "Q5684",
    "label": "Thomas Edison",
    "sitelinks": 130,
    "type": "Q37226",
    "aliases": [
      "Edison",
      "The Wizard of Menlo Park",
      "Light Bulb Inventor"
    ],
    "category": "scientist"
  },

  // Famous Inventions
  "Q3962": {
    "id": "Q3962",
    "label": "Telephone",
    "sitelinks": 100,
    "type": "Q3957",
    "aliases": [
      "Phone",
      "Bell's Invention",
      "Communication Device"
    ],
    "category": "invention"
  },
  "Q4006": {
    "id": "Q4006",
    "label": "Light Bulb",
    "sitelinks": 90,
    "type": "Q3957",
    "aliases": [
      "Electric Light",
      "Edison Bulb",
      "Incandescent Light"
    ],
    "category": "invention"
  },
  "Q14212": {
    "id": "Q14211",
    "label": "Internet",
    "sitelinks": 180,
    "type": "Q3957",
    "aliases": [
      "The Web",
      "World Wide Web",
      "Information Superhighway",
      "Net"
    ],
    "category": "invention"
  },
  "Q4830453": {
    "id": "Q4830453",
    "label": "iPhone",
    "sitelinks": 120,
    "type": "Q3957",
    "aliases": [
      "Apple iPhone",
      "Smartphone",
      "Mobile Phone"
    ],
    "category": "invention"
  },

  // Classical Musicians
  "Q254": {
    "id": "Q254",
    "label": "Wolfgang Amadeus Mozart",
    "sitelinks": 150,
    "type": "Q177220",
    "aliases": [
      "Mozart",
      "W.A. Mozart",
      "The Child Prodigy"
    ],
    "category": "musician"
  },
  "Q255": {
    "id": "Q255",
    "label": "Ludwig van Beethoven",
    "sitelinks": 160,
    "type": "Q177220",
    "aliases": [
      "Beethoven",
      "Ludwig Beethoven",
      "The Deaf Composer"
    ],
    "category": "musician"
  },
  "Q1339": {
    "id": "Q1339",
    "label": "Johann Sebastian Bach",
    "sitelinks": 140,
    "type": "Q177220",
    "aliases": [
      "Bach",
      "J.S. Bach",
      "The Master"
    ],
    "category": "musician"
  },

  // Famous Bands
  "Q1299": {
    "id": "Q1299",
    "label": "The Beatles",
    "sitelinks": 180,
    "type": "Q215380",
    "aliases": [
      "Beatles",
      "Fab Four",
      "John, Paul, George, Ringo"
    ],
    "category": "band"
  },
  "Q1316": {
    "id": "Q1316",
    "label": "Queen",
    "sitelinks": 150,
    "type": "Q215380",
    "aliases": [
      "Queen Band",
      "Freddie Mercury Band",
      "Bohemian Rhapsody Band"
    ],
    "category": "band"
  },
  "Q1168": {
    "id": "Q1168",
    "label": "Nirvana",
    "sitelinks": 130,
    "type": "Q215380",
    "aliases": [
      "Kurt Cobain Band",
      "Grunge Band",
      "Smells Like Teen Spirit"
    ],
    "category": "band"
  }
};

function addHistoricalEntities() {
  console.log('📚 Adding historical figures, events, and periods...');
  
  // Read existing entities
  const data = JSON.parse(fs.readFileSync(ENTITIES_FILE, 'utf8'));
  const existingIds = new Set(Object.keys(data.entities));
  
  let added = 0;
  let skipped = 0;
  
  // Add new historical entities
  Object.entries(HISTORICAL_ENTITIES).forEach(([id, entity]) => {
    if (existingIds.has(id)) {
      skipped++;
      return;
    }
    
    data.entities[id] = entity;
    added++;
  });
  
  // Update metadata
  data.meta.count = Object.keys(data.entities).length;
  data.meta.last_updated = new Date().toISOString();
  data.meta.expansion_phase = "Phase 2 - Historical & Scientific Expansion";
  
  // Write back to file
  fs.writeFileSync(ENTITIES_FILE, JSON.stringify(data, null, 2));
  
  console.log(`✅ Added ${added} historical entities`);
  console.log(`⏭️  Skipped ${skipped} existing entities`);
  console.log(`📊 Total entities: ${data.meta.count}`);
  
  // Show category breakdown
  const categories = {};
  Object.values(data.entities).forEach(entity => {
    const cat = entity.category || 'other';
    categories[cat] = (categories[cat] || 0) + 1;
  });
  
  console.log('\n📈 Category breakdown:');
  Object.entries(categories).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count} entities`);
  });
}

if (require.main === module) {
  addHistoricalEntities();
}

module.exports = { addHistoricalEntities, HISTORICAL_ENTITIES }; 