const PhraseNormalizer = require('../src/normalizer');

describe('PhraseNormalizer', () => {
  let normalizer;

  beforeEach(() => {
    normalizer = new PhraseNormalizer();
  });

  describe('Basic Normalization', () => {
    test('should normalize a simple phrase correctly', () => {
      const result = normalizer.normalize('harry potter');
      
      expect(result.isValid).toBe(true);
      expect(result.normalized).toBe('Harry Potter');
      expect(result.errors).toHaveLength(0);
      expect(result.wordCount).toBe(2);
    });

    test('should handle empty or invalid input', () => {
      expect(normalizer.normalize('').isValid).toBe(false);
      expect(normalizer.normalize(null).isValid).toBe(false);
      expect(normalizer.normalize(undefined).isValid).toBe(false);
      expect(normalizer.normalize(123).isValid).toBe(false);
    });

    test('should handle whitespace-only input', () => {
      const result = normalizer.normalize('   ');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(err => err.includes('too short') || err.includes('whitespace'))).toBe(true);
    });
  });

  describe('ASCII Filtering', () => {
    test('should strip non-ASCII characters', () => {
      const result = normalizer.normalize('Café Français');
      expect(result.isValid).toBe(true);
      expect(result.normalized).toBe('Caf Franais'); // Non-ASCII removed
    });

    test('should preserve ASCII punctuation', () => {
      const result = normalizer.normalize('hello, world!');
      expect(result.isValid).toBe(true);
      expect(result.normalized).toBe('Hello, World!');
    });

    test('should handle mixed ASCII and non-ASCII', () => {
      const result = normalizer.normalize('Test™ with® symbols©');
      expect(result.isValid).toBe(true);
      expect(result.normalized).toBe('Test With Symbols');
    });
  });

  describe('Whitespace Normalization', () => {
    test('should collapse multiple spaces', () => {
      const result = normalizer.normalize('multiple    spaces   here');
      expect(result.isValid).toBe(true);
      expect(result.normalized).toBe('Multiple Spaces Here');
    });

    test('should trim leading and trailing whitespace', () => {
      const result = normalizer.normalize('  trimmed phrase  ');
      expect(result.isValid).toBe(true);
      expect(result.normalized).toBe('Trimmed Phrase');
    });

    test('should handle tabs and newlines', () => {
      const result = normalizer.normalize('\tword1\nword2\r\nword3');
      expect(result.isValid).toBe(true);
      expect(result.normalized).toBe('Word1word2word3');
    });

    test('should fix punctuation spacing', () => {
      const result = normalizer.normalize('word1 , word2 ! word3 ?');
      expect(result.isValid).toBe(true);
      expect(result.normalized).toBe('Word1, Word2! Word3?');
    });
  });

  describe('Title Case Conversion', () => {
    test('should capitalize first and last words', () => {
      const result = normalizer.normalize('the lord of the rings');
      expect(result.isValid).toBe(true);
      expect(result.normalized).toBe('The Lord of the Rings');
    });

    test('should keep articles lowercase in middle', () => {
      const result = normalizer.normalize('gone with the wind');
      expect(result.isValid).toBe(true);
      expect(result.normalized).toBe('Gone With the Wind');
    });

    test('should capitalize important words', () => {
      const result = normalizer.normalize('star wars empire strikes back');
      expect(result.isValid).toBe(true);
      expect(result.normalized).toBe('Star Wars Empire Strikes Back');
    });

    test('should handle single word', () => {
      const result = normalizer.normalize('batman');
      expect(result.isValid).toBe(true);
      expect(result.normalized).toBe('Batman');
    });

    test('should handle prepositions correctly', () => {
      const result = normalizer.normalize('mission impossible');
      expect(result.isValid).toBe(true);
      expect(result.normalized).toBe('Mission Impossible');
    });
  });

  describe('Word Count Validation', () => {
    test('should accept phrases with 6 words or less', () => {
      const phrases = [
        'one',
        'one two',
        'one two three',
        'one two three four',
        'one two three four five',
        'one two three four five six'
      ];
      
      phrases.forEach(phrase => {
        const result = normalizer.normalize(phrase);
        expect(result.isValid).toBe(true);
      });
    });

    test('should reject phrases with more than 6 words', () => {
      const result = normalizer.normalize('one two three four five six seven');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Too many words (maximum 6 words, found 7)');
    });

    test('should count words correctly with punctuation', () => {
      const result = normalizer.normalize('word1, word2! word3? word4.');
      expect(result.isValid).toBe(true);
      expect(result.wordCount).toBe(4);
    });
  });

  describe('Length Validation', () => {
    test('should reject phrases that are too short', () => {
      const result = normalizer.normalize('a');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Phrase too short (minimum 2 characters)');
    });

    test('should accept minimum length phrases', () => {
      const result = normalizer.normalize('ab');
      expect(result.isValid).toBe(true);
    });

    test('should reject phrases that are too long', () => {
      const longPhrase = 'a'.repeat(101);
      const result = normalizer.normalize(longPhrase);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Phrase too long (maximum 100 characters)');
    });
  });

  describe('First Word Extraction', () => {
    test('should extract first word correctly', () => {
      expect(normalizer.extractFirstWord('Harry Potter')).toBe('harry');
      expect(normalizer.extractFirstWord('The Lord of the Rings')).toBe('the');
      expect(normalizer.extractFirstWord('Spider-Man')).toBe('spiderman');
    });

    test('should handle punctuation in first word', () => {
      expect(normalizer.extractFirstWord('Dr. Strange')).toBe('dr');
      expect(normalizer.extractFirstWord('Mr. Bean')).toBe('mr');
      expect(normalizer.extractFirstWord('X-Men')).toBe('xmen');
    });

    test('should handle empty or invalid input', () => {
      expect(normalizer.extractFirstWord('')).toBe('');
      expect(normalizer.extractFirstWord(null)).toBe('');
      expect(normalizer.extractFirstWord(undefined)).toBe('');
    });

    test('should handle single word phrases', () => {
      expect(normalizer.extractFirstWord('Batman')).toBe('batman');
      expect(normalizer.extractFirstWord('Superman!')).toBe('superman');
    });
  });

  describe('Batch Processing', () => {
    test('should process multiple phrases correctly', () => {
      const phrases = [
        'harry potter',
        'lord of the rings',
        'star wars',
        '', // Invalid
        'one two three four five six seven', // Too many words
        'valid phrase'
      ];

      const results = normalizer.normalizeBatch(phrases);
      
      expect(results).toHaveLength(6);
      expect(results[0].isValid).toBe(true);
      expect(results[0].normalized).toBe('Harry Potter');
      expect(results[1].isValid).toBe(true);
      expect(results[1].normalized).toBe('Lord of the Rings');
      expect(results[2].isValid).toBe(true);
      expect(results[2].normalized).toBe('Star Wars');
      expect(results[3].isValid).toBe(false);
      expect(results[4].isValid).toBe(false);
      expect(results[5].isValid).toBe(true);
    });

    test('should throw error for non-array input', () => {
      expect(() => normalizer.normalizeBatch('not an array')).toThrow();
    });

    test('should handle empty array', () => {
      const results = normalizer.normalizeBatch([]);
      expect(results).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle phrases with only numbers', () => {
      const result = normalizer.normalize('123 456');
      expect(result.isValid).toBe(true);
      expect(result.normalized).toBe('123 456');
    });

    test('should handle phrases with mixed case', () => {
      const result = normalizer.normalize('hArRy PoTtEr');
      expect(result.isValid).toBe(true);
      expect(result.normalized).toBe('Harry Potter');
    });

    test('should handle phrases with special characters', () => {
      const result = normalizer.normalize('Spider-Man: Far From Home');
      expect(result.isValid).toBe(true);
      expect(result.normalized).toBe('Spider-man: Far From Home');
    });

    test('should handle phrases with apostrophes', () => {
      const result = normalizer.normalize("Don't Stop Believin'");
      expect(result.isValid).toBe(true);
      expect(result.normalized).toBe("Don't Stop Believin'");
    });
  });

  describe('Configuration', () => {
    test('should return correct configuration', () => {
      const config = normalizer.getConfig();
      expect(config.maxWords).toBe(6);
      expect(config.minLength).toBe(2);
      expect(config.maxLength).toBe(100);
      expect(config.version).toBe('1.0.0');
    });
  });

  describe('Real-world Examples', () => {
    test('should handle movie titles correctly', () => {
      const movieTitles = [
        'the godfather',
        'pulp fiction',
        'the dark knight',
        'forrest gump',
        'the shawshank redemption'
      ];

      const expected = [
        'The Godfather',
        'Pulp Fiction',
        'The Dark Knight', 
        'Forrest Gump',
        'The Shawshank Redemption'
      ];

      movieTitles.forEach((title, index) => {
        const result = normalizer.normalize(title);
        expect(result.isValid).toBe(true);
        expect(result.normalized).toBe(expected[index]);
      });
    });

    test('should handle book titles correctly', () => {
      const bookTitles = [
        'to kill a mockingbird',
        'one flew over the cuckoos nest',
        'the catcher in the rye'
      ];

      const expected = [
        'To Kill a Mockingbird',
        'One Flew Over the Cuckoos Nest',
        'The Catcher in the Rye'
      ];

      bookTitles.forEach((title, index) => {
        const result = normalizer.normalize(title);
        expect(result.isValid).toBe(true);
        expect(result.normalized).toBe(expected[index]);
      });
    });
  });
}); 