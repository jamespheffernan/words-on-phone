import phrases from '../public/phrases.json';

describe('Phrases', () => {
  test('should have the expected number of phrases', () => {
    expect(phrases.length).toBe(2969);
  });

  test('should have no duplicate phrases', () => {
    const phraseTexts = phrases.map(p => p.phrase);
    const unique = new Set(phraseTexts);
    expect(unique.size).toBe(2969);
  });

  test('should have valid category assignments', () => {
    const validCategories = [
      'Movies & TV',
      'Music & Artists', 
      'Famous People',
      'Entertainment & Pop Culture',
      'Brands & Companies',
      'History & Events',
      'Everything',
      'Food & Drink',
      'Nature & Animals',
      'Places & Travel',
      'Sports & Athletes',
      'Technology & Science'
    ];
    
    phrases.forEach(phrase => {
      expect(validCategories).toContain(phrase.category);
    });
  });

  test('should have phrases in each major category', () => {
    const categoryCounts = phrases.reduce((acc, phrase) => {
      acc[phrase.category] = (acc[phrase.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Check that we have phrases in key categories
    expect(categoryCounts['Movies & TV']).toBeGreaterThan(0);
    expect(categoryCounts['Music & Artists']).toBeGreaterThan(0);
    expect(categoryCounts['Famous People']).toBeGreaterThan(0);
    expect(categoryCounts['History & Events']).toBeGreaterThan(0);
  });
});