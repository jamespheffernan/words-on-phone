import { GameDifficulty } from '../store';
import phrasesData from '../phrases.json';

// Interface for phrase objects from JSON
interface PhraseWithProminence {
  phrase: string;
  category: string;
  prominence?: {
    score: number;
    method: string;
    article?: string;
  };
}

/**
 * Filters phrases by difficulty level within each selected category
 * @param selectedCategories Array of category names to include
 * @param difficulty Difficulty level (easy, medium, hard)
 * @returns Filtered array of phrase strings
 */
export function getPhrasesForDifficulty(
  selectedCategories: string[],
  difficulty: GameDifficulty
): string[] {
  const phrases = phrasesData as PhraseWithProminence[];
  
  // If hard difficulty, return all phrases from selected categories
  if (difficulty === GameDifficulty.HARD) {
    return phrases
      .filter(item => selectedCategories.includes(item.category))
      .map(item => item.phrase);
  }
  
  // For medium and easy, we need to filter by prominence percentiles within each category
  const categoryPhraseSets: string[] = [];
  
  selectedCategories.forEach(categoryName => {
    // Get all phrases for this category
    const categoryPhrases = phrases.filter(item => item.category === categoryName);
    
    if (categoryPhrases.length === 0) return;
    
    // Sort by prominence score (highest to lowest)
    const sortedPhrases = categoryPhrases.sort((a, b) => {
      const scoreA = a.prominence?.score || 0;
      const scoreB = b.prominence?.score || 0;
      return scoreB - scoreA;
    });
    
    // Calculate cutoff based on difficulty
    let cutoffPercentile: number;
    switch (difficulty) {
      case GameDifficulty.EASY:
        cutoffPercentile = 0.4; // Top 40%
        break;
      case GameDifficulty.MEDIUM:
        cutoffPercentile = 0.7; // Top 70%
        break;
      default:
        cutoffPercentile = 1.0; // All phrases (should not reach here for hard)
    }
    
    const cutoffIndex = Math.ceil(sortedPhrases.length * cutoffPercentile);
    const filteredPhrases = sortedPhrases.slice(0, cutoffIndex);
    
    // Add phrases to the result set
    filteredPhrases.forEach(item => {
      categoryPhraseSets.push(item.phrase);
    });
  });
  
  return categoryPhraseSets;
}

/**
 * Gets difficulty statistics for selected categories
 * @param selectedCategories Array of category names
 * @returns Object with phrase counts per difficulty level
 */
export function getDifficultyStats(selectedCategories: string[]): {
  total: number;
  easy: number;
  medium: number;
  hard: number;
  categoryBreakdown: Record<string, { total: number; easy: number; medium: number; hard: number }>;
} {
  const phrases = phrasesData as PhraseWithProminence[];
  
  let total = 0;
  let easy = 0;
  let medium = 0;
  let hard = 0;
  const categoryBreakdown: Record<string, { total: number; easy: number; medium: number; hard: number }> = {};
  
  selectedCategories.forEach(categoryName => {
    const categoryPhrases = phrases.filter(item => item.category === categoryName);
    const categoryTotal = categoryPhrases.length;
    
    if (categoryTotal === 0) {
      categoryBreakdown[categoryName] = { total: 0, easy: 0, medium: 0, hard: 0 };
      return;
    }
    
    const categoryEasy = Math.ceil(categoryTotal * 0.4);
    const categoryMedium = Math.ceil(categoryTotal * 0.7);
    const categoryHard = categoryTotal;
    
    categoryBreakdown[categoryName] = {
      total: categoryTotal,
      easy: categoryEasy,
      medium: categoryMedium,
      hard: categoryHard
    };
    
    total += categoryTotal;
    easy += categoryEasy;
    medium += categoryMedium;
    hard += categoryHard;
  });
  
  return {
    total,
    easy,
    medium,
    hard,
    categoryBreakdown
  };
}

/**
 * Gets the difficulty description for display
 */
export function getDifficultyDescription(difficulty: GameDifficulty): string {
  switch (difficulty) {
    case GameDifficulty.EASY:
      return 'Top 40% most recognizable phrases';
    case GameDifficulty.MEDIUM:
      return 'Top 70% most recognizable phrases';
    case GameDifficulty.HARD:
      return 'All phrases (including obscure ones)';
    default:
      return 'Unknown difficulty';
  }
}

/**
 * Updates phrase selection in store based on difficulty
 * This function would be called when categories or difficulty changes
 */
export function updatePhraseSelectionForDifficulty(
  selectedCategories: string[],
  difficulty: GameDifficulty
): { phrases: string[]; count: number } {
  const phrases = getPhrasesForDifficulty(selectedCategories, difficulty);
  
  return {
    phrases,
    count: phrases.length
  };
}