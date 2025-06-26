const PhraseNormalizer = require('../src/normalizer');

describe('PhraseNormalizer', () => {
  let normalizer;

  beforeEach(() => {
    normalizer = new PhraseNormalizer();
  });

  describe('Basic Functionality', () => {
    test('should normalize simple phrase correctly', () => {
      const result = normalizer.process('harry potter');
      expect(result.phrase).toBe('Harry Potter');
      expect(result.firstWord).toBe('harry');
      expect(result.wordCount).toBe(2);
    });

    test('should handle single word', () => {
      const result = normalizer.process('pizza');
      expect(result.phrase).toBe('Pizza');
      expect(result.firstWord).toBe('pizza');
      expect(result.wordCount).toBe(1);
    });

    test('should handle maximum word count', () => {
      const result = normalizer.process('the lord of the rings fellowship');
      expect(result.phrase).toBe('The Lord of the Rings Fellowship');
      expect(result.wordCount).toBe(6);
    });
  });

  describe('Title Case Conversion', () => {
    test('should capitalize first and last words', () => {
      const result = normalizer.process('the lord of the rings');
      expect(result.phrase).toBe('The Lord of the Rings');
    });

    test('should keep articles lowercase in middle', () => {
      const result = normalizer.process('lord of the rings');
      expect(result.phrase).toBe('Lord of the Rings');
    });

    test('should capitalize important words', () => {
      const result = normalizer.process('star wars empire strikes back');
      expect(result.phrase).toBe('Star Wars Empire Strikes Back');
    });

    test('should handle prepositions correctly', () => {
      const result = normalizer.process('beauty and the beast');
      expect(result.phrase).toBe('Beauty and the Beast');
    });
  });

  describe('ASCII Normalization', () => {
    test('should convert smart quotes to straight quotes', () => {
      const result = normalizer.process('\u2018hello world\u2019');
      expect(result.phrase).toBe("'hello World'");
    });

    test('should convert em dashes to hyphens', () => {
      const result = normalizer.process('spider—man');
      expect(result.phrase).toBe('Spider-man');
    });

    test('should remove accents', () => {
      const result = normalizer.process('café résumé naïve');
      expect(result.phrase).toBe('Cafe Resume Naive');
    });

    test('should handle ellipsis', () => {
      const result = normalizer.process('wait…');
      expect(result.phrase).toBe('Wait...');
    });

    test('should remove non-ASCII characters', () => {
      const result = normalizer.process('hello 世界');
      expect(result.phrase).toBe('Hello');
    });
  });

  describe('Whitespace Handling', () => {
    test('should trim leading and trailing spaces', () => {
      const result = normalizer.process('  harry potter  ');
      expect(result.phrase).toBe('Harry Potter');
    });

    test('should normalize multiple spaces to single space', () => {
      const result = normalizer.process('harry    potter');
      expect(result.phrase).toBe('Harry Potter');
    });

    test('should convert non-breaking spaces', () => {
      const result = normalizer.process('harry\u00A0potter');
      expect(result.phrase).toBe('Harry Potter');
    });
  });

  describe('Word Count Validation', () => {
    test('should reject empty string', () => {
      expect(() => normalizer.process('')).toThrow('Phrase must be a non-empty string');
    });

    test('should reject null or undefined', () => {
      expect(() => normalizer.process(null)).toThrow('Phrase must be a non-empty string');
      expect(() => normalizer.process(undefined)).toThrow('Phrase must be a non-empty string');
    });

    test('should reject phrases with too many words', () => {
      expect(() => normalizer.process('one two three four five six seven')).toThrow('Phrase must have 1-6 words, got 7');
    });

    test('should accept phrases at word limit', () => {
      const result = normalizer.process('one two three four five six');
      expect(result.wordCount).toBe(6);
    });
  });

  describe('First Word Extraction', () => {
    test('should extract first word in lowercase', () => {
      const result = normalizer.process('HARRY Potter');
      expect(result.firstWord).toBe('harry');
    });

    test('should handle phrases with articles', () => {
      const result = normalizer.process('The Lord of the Rings');
      expect(result.firstWord).toBe('the');
    });

    test('should handle single character words', () => {
      const result = normalizer.process('A Beautiful Mind');
      expect(result.firstWord).toBe('a');
    });
  });

  describe('Transformation Tracking', () => {
    test('should track trimming transformation', () => {
      const result = normalizer.process('  harry potter  ');
      expect(result.transformations).toContain('trimmed');
    });

    test('should track whitespace normalization', () => {
      const result = normalizer.process('harry    potter');
      expect(result.transformations).toContain('whitespace-normalized');
    });

    test('should track case adjustment', () => {
      const result = normalizer.process('harry potter all lowercase');
      expect(result.transformations).toContain('case-adjusted');
    });

    test('should track diacritics removal', () => {
      const result = normalizer.process('café');
      expect(result.transformations).toContain('diacritics-removed');
    });

    test('should track non-ASCII cleanup', () => {
      const result = normalizer.process('hello 世界');
      expect(result.transformations).toContain('non-ascii-cleaned');
    });
  });

  describe('Validation Method', () => {
    test('should validate correct phrases', () => {
      const result = normalizer.validate('Harry Potter');
      expect(result.valid).toBe(true);
    });

    test('should reject invalid phrases', () => {
      const result = normalizer.validate('one two three four five six seven');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Phrase must have 1-6 words');
    });

    test('should reject empty phrases', () => {
      const result = normalizer.validate('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('non-empty string');
    });
  });

  describe('Complex Real-world Examples', () => {
    test('should handle movie titles correctly', () => {
      const result = normalizer.process('the lord of the rings');
      expect(result.phrase).toBe('The Lord of the Rings');
      expect(result.firstWord).toBe('the');
    });

    test('should handle titles with numbers', () => {
      const result = normalizer.process('iron man 2');
      expect(result.phrase).toBe('Iron Man 2');
      expect(result.firstWord).toBe('iron');
    });

    test('should handle possessives', () => {
      const result = normalizer.process("schindler's list");
      expect(result.phrase).toBe("Schindler's List");
      expect(result.firstWord).toBe('schindler');
    });

    test('should handle acronyms', () => {
      const result = normalizer.process('FBI most wanted');
      expect(result.phrase).toBe('FBI Most Wanted');
      expect(result.firstWord).toBe('fbi');
    });
  });
}); 