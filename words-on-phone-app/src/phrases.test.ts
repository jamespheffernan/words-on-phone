import phrases from './phrases.json';

describe('Phrases', () => {
  test('should have the expected number of phrases', () => {
    // Total includes Everything category duplicates (5773 unique + 5773 in Everything = 11546)
    expect(phrases.length).toBe(11546);
  });

  test('should have correct unique phrase count', () => {
    const nonEverythingPhrases = phrases.filter(p => p.category !== 'Everything');
    const everythingPhrases = phrases.filter(p => p.category === 'Everything');
    
    // Everything should contain same number as all other categories combined
    expect(everythingPhrases.length).toBe(nonEverythingPhrases.length);
    expect(nonEverythingPhrases.length).toBe(5773);
  });

  test('should have valid category assignments', () => {
    const validCategories = [
      'Adult Content', 'Anatomy & Medical', 'Art & Culture', 'Board Games & Toys',
      'Brands & Companies', 'Childhood & Nostalgia', 'Clothing & Fashion', 'Crimes & Justice',
      'Entertainment & Pop Culture', 'Everything', 'Fairy Tales & Fables', 'Famous Duos & Trios',
      'Famous People', 'Fantasy & Magic', 'Food & Drink', 'Geology & Earth Science',
      'History & Events', 'Hobbies & Crafts', 'Holidays & Celebrations', 'Household Items',
      'Idioms & Phrases', 'In the Office', 'Literature & Books', 'Money & Finance',
      'Movies & TV', 'Music & Artists', 'Musical Instruments', 'Mythology & Folklore',
      'Natural Wonders', 'Nature & Animals', 'On the Farm', 'Outer Space & Astronomy',
      'Places & Travel', 'School & Education', 'Sports & Athletes', 'Technology & Science',
      'Tools & Home Improvement', 'Under the Sea', 'Units of Measurement', 
      'Video Games & Gaming', 'World Architecture'
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
    expect(categoryCounts['Everything']).toBe(5773); // Everything should have all unique phrases
  });
});