const PhraseGenerator = require('./base-generator');

// This generator creates phrases directly from entities
class EntityGenerator extends PhraseGenerator {
  generate() {
    const phrases = [];
    
    if (!this.entities) {
      console.warn('No entities provided to EntityGenerator');
      return phrases;
    }
    
    // Strategy 1: Direct entity names
    Object.values(this.entities).forEach(entity => {
      if (!entity.label) return;
      
      phrases.push({
        phrase: entity.label,
        category: this.getCategory(entity.type),
        difficulty: this.getDifficulty(entity.sitelinks),
        source: 'entity_direct'
      });
      
      // Also add aliases if they exist
      if (entity.aliases && Array.isArray(entity.aliases)) {
        entity.aliases.forEach(alias => {
          if (alias && alias.trim()) {
            phrases.push({
              phrase: alias,
              category: this.getCategory(entity.type),
              difficulty: this.getDifficulty(entity.sitelinks),
              source: 'entity_alias'
            });
          }
        });
      }
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

module.exports = EntityGenerator;