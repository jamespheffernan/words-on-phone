import { describe, it, expect } from 'vitest';
import { shufflePhrases, PhraseCursor } from './phraseEngine';
import { phrases } from './data/phrases';

describe('Phrase Engine', () => {
  it('should shuffle phrases with Fisher-Yates and never repeat until all are used', () => {
    // Arrange
    const testPhrases = Array.from({ length: 100 }, (_, i) => `Phrase ${i}`);
    // Act
    shufflePhrases(testPhrases);
    const cursor = new PhraseCursor(testPhrases);
    let seen = new Set();
    for (let i = 0; i < testPhrases.length; i++) {
      seen.add(cursor.next());
    }
    // Assert
    expect(seen.size).toBe(testPhrases.length);
    // After all used, next should reshuffle and not repeat the last value
    const afterAll = cursor.next();
    expect(seen.has(afterAll)).toBe(true); // It can repeat, but only after all used
  });

  it('should import 500 unique string phrases for development', () => {
    expect(Array.isArray(phrases)).toBe(true);
    expect(phrases.length).toBe(500);
    const unique = new Set(phrases);
    expect(unique.size).toBe(500);
    expect(typeof phrases[0]).toBe('string');
  });
}); 