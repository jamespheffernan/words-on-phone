const PhraseGenerator = require('./base-generator');

// This generator creates multi-word phrases from our n-gram data
class CompoundGenerator extends PhraseGenerator {
  generate() {
    const phrases = [];
    
    if (!this.patterns || !this.patterns.ngrams) {
      console.warn('No n-gram patterns provided to CompoundGenerator');
      return phrases;
    }
    
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
    const lowerPhrase = phrase.toLowerCase();
    
    if (lowerPhrase.includes('food') || lowerPhrase.includes('eat') || 
        lowerPhrase.includes('cream') || lowerPhrase.includes('pizza') ||
        lowerPhrase.includes('dog') || lowerPhrase.includes('fries')) return 'food';
    
    if (lowerPhrase.includes('movie') || lowerPhrase.includes('show') ||
        lowerPhrase.includes('wars') || lowerPhrase.includes('thrones') ||
        lowerPhrase.includes('potter') || lowerPhrase.includes('office')) return 'entertainment';
    
    if (lowerPhrase.includes('game') || lowerPhrase.includes('play') ||
        lowerPhrase.includes('run') || lowerPhrase.includes('basketball') ||
        lowerPhrase.includes('football')) return 'activity';
    
    if (lowerPhrase.includes('city') || lowerPhrase.includes('york') ||
        lowerPhrase.includes('bridge') || lowerPhrase.includes('tower') ||
        lowerPhrase.includes('states') || lowerPhrase.includes('kingdom')) return 'place';
    
    if (lowerPhrase.includes('swift') || lowerPhrase.includes('obama') ||
        lowerPhrase.includes('jackson') || lowerPhrase.includes('einstein')) return 'person';
    
    if (lowerPhrase.includes('apple') || lowerPhrase.includes('google') ||
        lowerPhrase.includes('microsoft') || lowerPhrase.includes('coca') ||
        lowerPhrase.includes('disney')) return 'company';
    
    return 'general';
  }
  
  getDifficultyFromPMI(pmi) {
    if (pmi < 7) return 'easy';
    if (pmi < 9) return 'medium';
    return 'hard';
  }
}

module.exports = CompoundGenerator;