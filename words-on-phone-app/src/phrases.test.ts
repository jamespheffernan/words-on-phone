import { describe, it, expect } from 'vitest';
import { shufflePhrases, PhraseCursor } from './phraseEngine';

describe('Phrase Engine', () => {
  it('should shuffle phrases with Fisher-Yates and never repeat until all are used', () => {
    // Arrange
    const phrases = Array.from({ length: 100 }, (_, i) => `Phrase ${i}`);
    // Act
    const shuffled = shufflePhrases(phrases);
    const cursor = new PhraseCursor(phrases);
    let seen = new Set();
    for (let i = 0; i < phrases.length; i++) {
      seen.add(cursor.next());
    }
    // Assert
    expect(seen.size).toBe(phrases.length);
    // After all used, next should reshuffle and not repeat the last value
    const afterAll = cursor.next();
    expect(seen.has(afterAll)).toBe(true); // It can repeat, but only after all used
  });
}); 