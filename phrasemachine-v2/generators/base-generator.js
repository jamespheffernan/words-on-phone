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

module.exports = PhraseGenerator;