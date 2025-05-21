import { describe, it, expect } from 'vitest';
// import { shufflePhrases, PhraseCursor } from './phraseEngine';

describe('Phrase Engine', () => {
  it('should shuffle phrases with Fisher-Yates and never repeat until all are used', () => {
    // Arrange
    const phrases = Array.from({ length: 100 }, (_, i) => `Phrase ${i}`);
    // Act
    // const { shuffled, cursor } = shufflePhrases(phrases);
    // let seen = new Set();
    // for (let i = 0; i < phrases.length; i++) {
    //   seen.add(cursor.next());
    // }
    // Assert
    // expect(seen.size).toBe(phrases.length);
    // expect(cursor.next()).not.toBe(seen.values().next().value); // Should reshuffle after all used
    expect(false).toBe(true); // Failing test placeholder
  });
}); 