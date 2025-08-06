# PhraseMachine v2 Restructuring: From Scorer to Generator

## Executive Summary
Transform PhraseMachine v2 from a phrase scoring system into a phrase generation system. Instead of evaluating existing phrases, we will generate high-quality phrases directly from curated data sources.

## Current State → Target State

### Current (Scoring System)
```
Input: phrases.json → PhraseMachine → Output: scores.json
Purpose: Filter good phrases from existing collection
Problem: Dependent on quality of input phrases
```

### Target (Generation System)
```
Input: curated data → PhraseMachine → Output: phrases.json
Purpose: Generate high-quality phrases from scratch
Benefit: Quality by design, infinite scalability
```

## Step-by-Step Restructuring Plan

### Phase 1: Directory Restructuring (30 minutes)

#### Step 1.1: Create New Directory Structure
```bash
cd phrasemachine-v2
mkdir -p generators
mkdir -p templates
mkdir -p output
mkdir -p validators
```

#### Step 1.2: Move Existing Files
```bash
# Archive scoring system (don't delete, just reorganize)
mkdir -p archive/scoring-system
mv services/scoring/* archive/scoring-system/
mv services/distinctiveness/* archive/scoring-system/
mv services/describability/* archive/scoring-system/

# Keep useful components
# - data/curated/ (our entity sources)
# - scripts/build-*.js (our build pipeline)
# - dist/ (compiled datasets)
```

### Phase 2: Core Generator Implementation (2 hours)

#### Step 2.1: Create Base Generator Class
**File:** `generators/base-generator.js`
```javascript
class PhraseGenerator {
  constructor(config) {
    this.entities = config.entities;
    this.patterns = config.patterns;
    this.minLength = config.minLength || 2;
    this.maxLength = config.maxLength || 4;
  }
  
  generate() {
    // To be implemented by subclasses
    throw new Error('Subclass must implement generate()');
  }
  
  validate(phrase) {
    // Basic validation
    const words = phrase.split(' ');
    return words.length >= this.minLength && 
           words.length <= this.maxLength;
  }
}
```

#### Step 2.2: Create Entity-Based Generator
**File:** `generators/entity-generator.js`
```javascript
// This generator creates phrases directly from entities
class EntityGenerator extends PhraseGenerator {
  generate() {
    const phrases = [];
    
    // Strategy 1: Direct entity names
    Object.values(this.entities).forEach(entity => {
      phrases.push({
        phrase: entity.label,
        category: this.getCategory(entity.type),
        difficulty: this.getDifficulty(entity.sitelinks),
        source: 'entity_direct'
      });
      
      // Also add aliases
      entity.aliases.forEach(alias => {
        phrases.push({
          phrase: alias,
          category: this.getCategory(entity.type),
          difficulty: this.getDifficulty(entity.sitelinks),
          source: 'entity_alias'
        });
      });
    });
    
    return phrases;
  }
  
  getCategory(type) {
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
    return typeMap[type] || 'other';
  }
  
  getDifficulty(sitelinks) {
    if (sitelinks > 150) return 'easy';
    if (sitelinks > 80) return 'medium';
    return 'hard';
  }
}
```

#### Step 2.3: (Removed) Pattern-Based Generator
Pattern-based phrase modifications (e.g., adding "Young", "Downtown", etc.) are **no longer required**. Skip this step entirely and do not implement `pattern-generator.js`.
**File:** `generators/pattern-generator.js`
```javascript
// This generator combines entities with patterns
class PatternGenerator extends PhraseGenerator {
  generate() {
    const phrases = [];
    const patterns = this.loadPatterns();
    
    patterns.forEach(pattern => {
      const generated = this.applyPattern(pattern);
      phrases.push(...generated);
    });
    
    return phrases;
  }
  
  loadPatterns() {
    return [
      // People patterns
      { template: "Young {person}", category: "person", filter: { type: "Q5" } },
      { template: "Old {person}", category: "person", filter: { type: "Q5" } },
      { template: "Meeting {person}", category: "person", filter: { type: "Q5" } },
      
      // Place patterns  
      { template: "Downtown {city}", category: "place", filter: { type: "Q515" } },
      { template: "Ancient {place}", category: "place", filter: { type: "Q515" } },
      { template: "Modern {place}", category: "place", filter: { type: "Q515" } },
      
      // Movie patterns
      { template: "Watching {movie}", category: "entertainment", filter: { type: "Q11424" } },
      { template: "{movie} sequel", category: "entertainment", filter: { type: "Q11424" } },
      
      // Food patterns
      { template: "Eating {food}", category: "food", filter: { type: "Q1047113" } },
      { template: "Frozen {food}", category: "food", filter: { type: "Q1047113" } },
      { template: "Spicy {food}", category: "food", filter: { type: "Q1047113" } }
    ];
  }
  
  applyPattern(pattern) {
    const phrases = [];
    const matchingEntities = this.filterEntities(pattern.filter);
    
    matchingEntities.forEach(entity => {
      const phrase = pattern.template.replace(/{(\w+)}/, entity.label);
      phrases.push({
        phrase: phrase,
        category: pattern.category,
        difficulty: this.getDifficulty(entity.sitelinks),
        source: 'pattern',
        pattern: pattern.template
      });
    });
    
    return phrases;
  }
}
```

#### Step 2.4: Create Compound Generator
**File:** `generators/compound-generator.js`
```javascript
// This generator creates multi-word phrases from our n-gram data
class CompoundGenerator extends PhraseGenerator {
  generate() {
    const phrases = [];
    
    // Use our curated n-grams directly
    Object.entries(this.patterns.ngrams).forEach(([phrase, data]) => {
      phrases.push({
        phrase: phrase,
        category: this.categorizePhrase(phrase),
        difficulty: this.getDifficultyFromPMI(data.pmi),
        source: 'compound',
        pmi: data.pmi
      });
    });
    
    return phrases;
  }
  
  categorizePhrase(phrase) {
    // Simple keyword-based categorization
    if (phrase.includes('food') || phrase.includes('eat')) return 'food';
    if (phrase.includes('movie') || phrase.includes('show')) return 'entertainment';
    if (phrase.includes('game') || phrase.includes('play')) return 'activity';
    return 'general';
  }
  
  getDifficultyFromPMI(pmi) {
    if (pmi < 7) return 'easy';
    if (pmi < 9) return 'medium';
    return 'hard';
  }
}
```

### Phase 3: Build Pipeline Integration (1 hour)

#### Step 3.1: Create Main Generator Pipeline
**File:** `generate-phrases.js`
```javascript
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Load generators
const EntityGenerator = require('./generators/entity-generator');
// PatternGenerator removed per updated requirements
const CompoundGenerator = require('./generators/compound-generator');

// Load data
const entities = JSON.parse(fs.readFileSync('./dist/entities.json'));
const ngrams = JSON.parse(fs.readFileSync('./dist/ngrams.json'));

console.log('🎮 Starting phrase generation...');

// Generate phrases from different sources
const generators = [
  {
    name: 'Entity Generator',
    instance: new EntityGenerator({ entities: entities.entities })
  },

  {
    name: 'Compound Generator',
    instance: new CompoundGenerator({ patterns: ngrams })
  }
];

let allPhrases = [];

generators.forEach(({ name, instance }) => {
  console.log(`\n📝 Running ${name}...`);
  const phrases = instance.generate();
  console.log(`✅ Generated ${phrases.length} phrases`);
  allPhrases.push(...phrases);
});

// Deduplicate
const uniquePhrases = {};
allPhrases.forEach(p => {
  const key = p.phrase.toLowerCase();
  if (!uniquePhrases[key] || p.difficulty === 'easy') {
    uniquePhrases[key] = p;
  }
});

const finalPhrases = Object.values(uniquePhrases);

// Sort by category and difficulty
finalPhrases.sort((a, b) => {
  if (a.category !== b.category) return a.category.localeCompare(b.category);
  if (a.difficulty !== b.difficulty) {
    const diffOrder = { easy: 0, medium: 1, hard: 2 };
    return diffOrder[a.difficulty] - diffOrder[b.difficulty];
  }
  return a.phrase.localeCompare(b.phrase);
});

// Save output
const output = {
  meta: {
    version: '2.0',
    generated: new Date().toISOString(),
    totalPhrases: finalPhrases.length,
    breakdown: {
      byCategory: {},
      byDifficulty: {},
      bySource: {}
    }
  },
  phrases: finalPhrases
};

// Calculate breakdown
finalPhrases.forEach(p => {
  output.meta.breakdown.byCategory[p.category] = (output.meta.breakdown.byCategory[p.category] || 0) + 1;
  output.meta.breakdown.byDifficulty[p.difficulty] = (output.meta.breakdown.byDifficulty[p.difficulty] || 0) + 1;
  output.meta.breakdown.bySource[p.source] = (output.meta.breakdown.bySource[p.source] || 0) + 1;
});

fs.writeFileSync('./output/phrases.json', JSON.stringify(output, null, 2));

console.log('\n🎉 Generation complete!');
console.log(`📊 Total phrases: ${finalPhrases.length}`);
console.log('\n📈 Breakdown:');
console.log('By Category:', output.meta.breakdown.byCategory);
console.log('By Difficulty:', output.meta.breakdown.byDifficulty);
console.log('By Source:', output.meta.breakdown.bySource);
```

#### Step 3.2: Update build.sh
**File:** `build.sh`
```bash
#!/usr/bin/env bash
set -e

echo "🚀 PhraseMachine v2 - Phrase Generation Pipeline"
echo "=============================================="

# Step 1: Build reference datasets (existing)
echo "[1/3] Building reference datasets..."
# ... existing build steps ...

# Step 2: Generate phrases
echo "[2/3] Generating phrases..."
node generate-phrases.js

# Step 3: Validate and package
echo "[3/3] Validating and packaging..."
node validators/quality-check.js --input output/phrases.json

# Compress final output
gzip -c output/phrases.json > output/phrases.json.gz

echo "✅ Build complete!"
echo "📦 Output: output/phrases.json.gz"
ls -lh output/phrases.json.gz
```

### Phase 4: Validation System (30 minutes)

#### Step 4.1: Create Quality Validator
**File:** `validators/quality-check.js`
```javascript
#!/usr/bin/env node

const fs = require('fs');
const args = process.argv.slice(2);
const inputFile = args[1] || './output/phrases.json';

console.log('🔍 Running quality checks...');

const data = JSON.parse(fs.readFileSync(inputFile));
const phrases = data.phrases;

// Quality checks
const checks = {
  minLength: 0,
  maxLength: 0,
  duplicates: 0,
  missingCategory: 0,
  missingDifficulty: 0,
  tooShort: [],
  tooLong: []
};

const seen = new Set();

phrases.forEach(p => {
  const words = p.phrase.split(' ');
  
  // Length checks
  if (words.length < 1) {
    checks.minLength++;
    checks.tooShort.push(p.phrase);
  }
  if (words.length > 4) {
    checks.maxLength++;
    checks.tooLong.push(p.phrase);
  }
  
  // Duplicate check
  const key = p.phrase.toLowerCase();
  if (seen.has(key)) {
    checks.duplicates++;
  }
  seen.add(key);
  
  // Required fields
  if (!p.category) checks.missingCategory++;
  if (!p.difficulty) checks.missingDifficulty++;
});

// Report results
console.log('\n📊 Quality Report:');
console.log(`Total phrases: ${phrases.length}`);
console.log(`Duplicates: ${checks.duplicates}`);
console.log(`Too short: ${checks.minLength}`);
console.log(`Too long: ${checks.maxLength}`);
console.log(`Missing category: ${checks.missingCategory}`);
console.log(`Missing difficulty: ${checks.missingDifficulty}`);

if (checks.tooShort.length > 0) {
  console.log('\n⚠️ Too short phrases:', checks.tooShort.slice(0, 5));
}

if (checks.tooLong.length > 0) {
  console.log('\n⚠️ Too long phrases:', checks.tooLong.slice(0, 5));
}

const hasErrors = checks.duplicates > 0 || checks.minLength > 0 || 
                  checks.maxLength > 0 || checks.missingCategory > 0 || 
                  checks.missingDifficulty > 0;

if (hasErrors) {
  console.log('\n❌ Quality check failed!');
  process.exit(1);
} else {
  console.log('\n✅ All quality checks passed!');
}
```

### Phase 5: Expansion Tools (1 hour)

#### Step 5.1: Entity Expansion Tool
**File:** `tools/expand-entities.js`
```javascript
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

function addEntity() {
  rl.question('\nEntity name (or "exit"): ', (name) => {
    if (name.toLowerCase() === 'exit') {
      saveAndExit();
      return;
    }
    
    rl.question('Category (person/movie/place/food/company/sport): ', (category) => {
      rl.question('Aliases (comma-separated, optional): ', (aliasStr) => {
        const aliases = aliasStr ? aliasStr.split(',').map(a => a.trim()) : [];
        
        // Generate a pseudo Q-number
        const qNum = 'Q' + Math.floor(Math.random() * 1000000);
        
        const typeMap = {
          'person': 'Q5',
          'movie': 'Q11424',
          'place': 'Q515',
          'food': 'Q1047113',
          'company': 'Q43229',
          'sport': 'Q349'
        };
        
        data.entities[qNum] = {
          id: qNum,
          label: name,
          sitelinks: 100, // Default medium difficulty
          type: typeMap[category] || 'Q5',
          aliases: aliases
        };
        
        console.log(`✅ Added: ${name} (${category})`);
        data.meta.entityCount = Object.keys(data.entities).length;
        
        addEntity(); // Continue adding
      });
    });
  });
}

function saveAndExit() {
  fs.writeFileSync(entitiesFile, JSON.stringify(data, null, 2));
  console.log(`\n💾 Saved ${Object.keys(data.entities).length} entities`);
  rl.close();
}

addEntity();
```

### Phase 6: Migration Checklist

#### For the Executor:

1. **Backup Current State**
   ```bash
   cp -r phrasemachine-v2 phrasemachine-v2-backup-scoring
   ```

2. **Create New Structure**
   - Run all mkdir commands from Phase 1
   - Move files as specified

3. **Implement Generators**
   - Create each generator file exactly as specified
   - Test each generator individually

4. **Update Build Pipeline**
   - Replace build.sh with new version
   - Create generate-phrases.js
   - Test full pipeline

5. **Validate Output**
   - Run quality checks
   - Ensure phrases.json is generated
   - Verify categories and difficulties

### Success Criteria

1. **Structural Success**
   - [ ] All new directories created
   - [ ] All generators implemented
   - [ ] Build pipeline updated

2. **Functional Success**
   - [ ] Generates 500+ phrases from 103 entities
   - [ ] All phrases have category and difficulty
   - [ ] No duplicates in output

3. **Quality Success**
   - [ ] Phrases are 1-4 words
   - [ ] Mix of easy/medium/hard
   - [ ] Multiple categories represented

## Summary

This restructuring transforms PhraseMachine v2 from a passive scorer to an active generator. The modular design allows easy expansion:
- Add more entities → more phrases
- Add more patterns → more variety
- Add more generators → more phrase types

The system is now focused on **creating quality** rather than **finding quality**.