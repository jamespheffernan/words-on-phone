export type CategoryType = 'default' | 'custom';

export interface CategoryMetadata {
  id: string;              // Unique identifier (slugified name)
  name: string;            // Display name
  type: CategoryType;      // default | custom
  phraseCount: number;     // Number of phrases in the category
  createdAt: number;       // Unix epoch ms – 0 for built-in categories
  lastUpdated?: number;    // For custom categories when phrases were last refreshed
} 

// Task 1: Popularity tracking types
export interface CategoryPopularityData {
  categoryId: string;      // Matches CategoryMetadata.id
  playCount: number;       // Total number of times this category was played
  lastPlayed: number;      // Unix timestamp of last play session
  createdAt: number;       // When tracking started for this category
}

export interface PopularityCalculationOptions {
  playCountWeight: number;   // Weight for play count in score (default: 0.7)
  recencyWeight: number;     // Weight for recency in score (default: 0.3)
  maxRecencyDays: number;    // Days after which recency bonus becomes 0 (default: 30)
}

export interface CategoryWithPopularity extends CategoryMetadata {
  popularityData?: CategoryPopularityData | null;
  popularityScore?: number;
}

// Task 3: Category grouping types
export interface CategoryGroup {
  id: string;              // Unique group identifier
  name: string;            // Display name for the group
  emoji: string;           // Emoji icon for the group
  categoryNames: string[]; // List of category names that belong to this group
  description?: string;    // Optional description of the group
}

export interface CategoryGroupingState {
  expandedGroups: Set<string>;  // Set of group IDs that are currently expanded
}

// Define the default category groups
export const DEFAULT_CATEGORY_GROUPS: CategoryGroup[] = [
  {
    id: 'entertainment',
    name: 'Entertainment',
    emoji: '🎬',
    categoryNames: [
      'Movies & TV',
      'Music & Artists',
      'Entertainment & Pop Culture',
      'Famous People'
    ],
    description: 'Movies, TV shows, music, celebrities, and pop culture'
  },
  {
    id: 'daily-life',
    name: 'Daily Life', 
    emoji: '🏠',
    categoryNames: [
      'Food & Drink'
    ],
    description: 'Food, household items, daily activities'
  },
  {
    id: 'world-knowledge',
    name: 'World & Knowledge',
    emoji: '🌍',
    categoryNames: [
      'Places & Travel',
      'History & Events', 
      'Technology & Science',
      'Nature & Animals'
    ],
    description: 'Geography, history, science, and nature'
  },
  {
    id: 'activities-sports',
    name: 'Activities & Sports',
    emoji: '🏃',
    categoryNames: [
      'Sports & Athletes'
    ],
    description: 'Sports, activities, and actions'
  },
  {
    id: 'creative-misc',
    name: 'Creative & Misc',
    emoji: '🎨',
    categoryNames: [
      'Everything',
      'Everything+'
    ],
    description: 'Mixed categories and creative topics'
  }
];

// Helper function to get the group for a category
export function getCategoryGroup(categoryName: string): CategoryGroup | undefined {
  return DEFAULT_CATEGORY_GROUPS.find(group => 
    group.categoryNames.includes(categoryName)
  );
}

// Helper function to group categories by their assigned groups
export function groupCategoriesByGroup(categories: CategoryMetadata[]): Record<string, CategoryMetadata[]> {
  const grouped: Record<string, CategoryMetadata[]> = {};
  
  // Initialize all groups
  DEFAULT_CATEGORY_GROUPS.forEach(group => {
    grouped[group.id] = [];
  });
  
  // Add ungrouped category for categories not in any group
  grouped['ungrouped'] = [];
  
  // Categorize each category
  categories.forEach(category => {
    const group = getCategoryGroup(category.name);
    if (group) {
      grouped[group.id].push(category);
    } else {
      grouped['ungrouped'].push(category);
    }
  });
  
  return grouped;
}

// Task 4: Category icon mapping for UI enhancement
export const CATEGORY_ICONS: Record<string, string> = {
  // Entertainment & Pop Culture group
  'Movies & TV': '🎬',
  'Music & Artists': '🎵',
  'Entertainment & Pop Culture': '🎭',
  'Famous People': '⭐',
  
  // Daily Life group
  'Food & Drink': '🍕',
  'Clothing & Fashion': '👗',
  'Occupations & Jobs': '💼',
  
  // World & Knowledge group
  'Places & Travel': '🌍',
  'History & Events': '📜',
  'Technology & Science': '🔬',
  'Nature & Animals': '🐾',
  
  // Activities & Sports group
  'Sports & Athletes': '⚽',
  'Transportation': '🚗',
  
  // Creative & Misc group
  'Everything': '🎲',
  'Everything+': '✨',
  'Fantasy & Magic': '🔮',
  
  // Additional categories not in groups yet
  'Brands & Companies': '🏢',
  'Emotions & Feelings': '😊',
  'Internet & Social Media': '💻',
  'Weather & Seasons': '🌤️'
};

// Helper function to get icon for a category
export function getCategoryIcon(categoryName: string): string {
  return CATEGORY_ICONS[categoryName] || '📁'; // Default folder icon for unknown categories
} 