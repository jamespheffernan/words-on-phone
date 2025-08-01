// Generated phrase database from phrase-database-generation project
// Total phrases: 1092 across 20 categories

// Import the exported phrases database
import phrasesData from '../phrases.json';

// Phrase categories enum
export enum PhraseCategory {
  EVERYTHING = 'Everything',
  EVERYTHING_PLUS = 'Everything+',
  MOVIES = 'Movies & TV',
  MUSIC = 'Music & Artists',
  SPORTS = 'Sports & Athletes',
  FOOD = 'Food & Drink',
  PLACES = 'Places & Travel',
  PEOPLE = 'Famous People',
  TECHNOLOGY = 'Technology & Science',
  HISTORY = 'History & Events',
  ENTERTAINMENT = 'Entertainment & Pop Culture',
  NATURE = 'Nature & Animals',
  EMOTIONS = 'Emotions & Feelings',
  FANTASY = 'Fantasy & Magic',
  TRANSPORTATION = 'Transportation',
  WEATHER = 'Weather & Seasons',
  INTERNET = 'Internet & Social Media',
  CLOTHING = 'Clothing & Fashion',
  BRANDS = 'Brands & Companies',
  OCCUPATIONS = 'Occupations & Jobs'
}

// Category mapping from JSON keys to enum values
const categoryMapping: Record<string, PhraseCategory> = {
  'Movies & TV': PhraseCategory.MOVIES,
  'Music & Artists': PhraseCategory.MUSIC,
  'Sports & Athletes': PhraseCategory.SPORTS,
  'Food & Drink': PhraseCategory.FOOD,
  'Places & Travel': PhraseCategory.PLACES,
  'Famous People': PhraseCategory.PEOPLE,
  'Technology & Science': PhraseCategory.TECHNOLOGY,
  'History & Events': PhraseCategory.HISTORY,
  'Entertainment & Pop Culture': PhraseCategory.ENTERTAINMENT,
  'Nature & Animals': PhraseCategory.NATURE,
  'Everything': PhraseCategory.EVERYTHING,
  'Everything+': PhraseCategory.EVERYTHING_PLUS,
  'Emotions & Feelings': PhraseCategory.EMOTIONS,
  'Fantasy & Magic': PhraseCategory.FANTASY,
  'Transportation': PhraseCategory.TRANSPORTATION,
  'Weather & Seasons': PhraseCategory.WEATHER,
  'Internet & Social Media': PhraseCategory.INTERNET,
  'Clothing & Fashion': PhraseCategory.CLOTHING,
  'Brands & Companies': PhraseCategory.BRANDS,
  'Occupations & Jobs': PhraseCategory.OCCUPATIONS
};

// Convert imported data to categorized phrases
export const categorizedPhrases: Record<PhraseCategory, string[]> = {} as Record<PhraseCategory, string[]>;

// Initialize all categories with empty arrays
Object.values(PhraseCategory).forEach(category => {
  categorizedPhrases[category] = [];
});

// Populate categories from imported data
Object.entries(phrasesData as Record<string, string[]>).forEach(([categoryName, phrases]) => {
  const mappedCategory = categoryMapping[categoryName];
  if (mappedCategory && Array.isArray(phrases)) {
    categorizedPhrases[mappedCategory] = phrases;
  }
});

// Create a flat array of all phrases for general use
export const phrases: string[] = Object.values(phrasesData as Record<string, string[]>).flat();

// Get phrases by category
export function getPhrasesByCategory(category: PhraseCategory): string[] {
  if (category === PhraseCategory.EVERYTHING) {
    // Return all phrases for Everything category
    return phrases;
  }
  if (category === PhraseCategory.EVERYTHING_PLUS) {
    // Return all phrases for Everything+ category
    return phrases;
  }
  return categorizedPhrases[category] || [];
}

// Default categories for the game
export const DEFAULT_CATEGORIES: PhraseCategory[] = [
  PhraseCategory.MOVIES,
  PhraseCategory.MUSIC,
  PhraseCategory.SPORTS,
  PhraseCategory.FOOD,
  PhraseCategory.PLACES,
  PhraseCategory.PEOPLE,
  PhraseCategory.TECHNOLOGY,
  PhraseCategory.HISTORY,
  PhraseCategory.ENTERTAINMENT,
  PhraseCategory.NATURE,
];

// Export phrase statistics
export const phraseStats = {
  totalPhrases: phrases.length,
  totalCategories: Object.keys(phrasesData).length,
  categoryBreakdown: Object.fromEntries(
    Object.entries(phrasesData).map(([category, phrases]) => [category, (phrases as string[]).length])
  )
};
