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

// Define the default category groups - organized for scaling to 40+ categories
export const DEFAULT_CATEGORY_GROUPS: CategoryGroup[] = [
  {
    id: 'entertainment-media',
    name: 'Entertainment & Media',
    emoji: '🎬',
    categoryNames: [
      'Movies & TV',
      'Music & Artists', 
      'Entertainment & Pop Culture',
      'Video Games & Gaming',
      'Art & Culture',
      'Literature & Books',
      'Famous People',
      'Comics & Animation',
      'Theater & Performing Arts',
      'Film Industry',
      'Music Industry'
    ],
    description: 'Movies, TV, music, games, art, books, and celebrities'
  },
  {
    id: 'daily-life-culture',
    name: 'Daily Life & Culture',
    emoji: '🏠',
    categoryNames: [
      'Food & Drink',
      'Clothing & Fashion',
      'Occupations & Jobs',
      'Idioms & Phrases',
      'Home & Garden',
      'Health & Wellness',
      'Beauty & Personal Care',
      'Relationships & Family',
      'Education & Learning',
      'Household Items',
      'In the Office',
      'Childhood & Nostalgia',
      'Holidays & Celebrations'
    ],
    description: 'Food, fashion, work, expressions, home life, and celebrations'
  },
  {
    id: 'world-knowledge',
    name: 'World & Knowledge',
    emoji: '🌍',
    categoryNames: [
      'Places & Travel',
      'History & Events',
      'Technology & Science',
      'Nature & Animals',
      'Geography',
      'Mathematics',
      'Physics & Chemistry',
      'Biology & Medicine',
      'Astronomy & Space',
      'Outer Space & Astronomy',
      'Geology & Earth Science',
      'Anatomy & Medical',
      'Under the Sea',
      'On the Farm',
      'Natural Wonders',
      'Units of Measurement'
    ],
    description: 'Geography, history, science, nature, space, medicine, and academic subjects'
  },
  {
    id: 'activities-sports',
    name: 'Activities & Sports',
    emoji: '⚽',
    categoryNames: [
      'Sports & Athletes',
      'Outdoor Activities',
      'Fitness & Exercise',
      'Recreational Games',
      'Adventure & Extreme Sports',
      'Team Sports',
      'Individual Sports',
      'Olympic Sports',
      'Board Games & Toys'
    ],
    description: 'Sports, fitness, outdoor activities, games, and recreational pursuits'
  },
  {
    id: 'modern-life-tech',
    name: 'Modern Life & Technology',
    emoji: '💻',
    categoryNames: [
      'Transportation',
      'Internet & Social Media', 
      'Brands & Companies',
      'Gadgets & Electronics',
      'Software & Apps',
      'Cryptocurrency & Finance',
      'Business & Economy',
      'Current Events',
      'Money & Finance',
      'Tools & Home Improvement'
    ],
    description: 'Technology, business, transport, finance, and contemporary topics'
  },
  {
    id: 'creative-arts',
    name: 'Creative Arts & Hobbies',
    emoji: '🎨',
    categoryNames: [
      'Fantasy & Magic',
      'Crafts & DIY',
      'Photography',
      'Design & Architecture',
      'Music Production',
      'Creative Writing',
      'Dance & Movement',
      'Hobbies & Crafts',
      'Musical Instruments',
      'World Architecture'
    ],
    description: 'Creative pursuits, artistic endeavors, and hobby activities'
  },
  {
    id: 'stories-culture',
    name: 'Stories & Culture',
    emoji: '📖',
    categoryNames: [
      'Mythology & Folklore',
      'Fairy Tales & Fables',
      'Famous Duos & Trios',
      'Crimes & Justice',
      'School & Education'
    ],
    description: 'Cultural stories, education, mythology, and famous pairs'
  },
  {
    id: 'mixed-everything',
    name: 'Mixed & Everything',
    emoji: '🎲',
    categoryNames: [
      'Everything',
      'Everything+'
    ],
    description: 'Mixed categories with phrases from all topics'
  },
  {
    id: 'mature-content',
    name: 'Adult Content',
    emoji: '🔞',
    categoryNames: [
      'Adult Content'
    ],
    description: 'Mature content for adult players only'
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

// Category icon mapping for UI enhancement - expanded for 40+ categories
export const CATEGORY_ICONS: Record<string, string> = {
  // Entertainment & Media group
  'Movies & TV': '🎬',
  'Music & Artists': '🎵',
  'Entertainment & Pop Culture': '🎭',
  'Famous People': '⭐',
  'Video Games & Gaming': '🎮',
  'Art & Culture': '🎨',
  'Literature & Books': '📚',
  'Comics & Animation': '📖',
  'Theater & Performing Arts': '🎭',
  'Film Industry': '🎥',
  'Music Industry': '🎤',
  
  // Daily Life & Culture group
  'Food & Drink': '🍕',
  'Clothing & Fashion': '👗',
  'Occupations & Jobs': '💼',
  'Idioms & Phrases': '💬',
  'Home & Garden': '🏡',
  'Health & Wellness': '🏥',
  'Beauty & Personal Care': '💄',
  'Relationships & Family': '👨‍👩‍👧‍👦',
  'Education & Learning': '🎓',
  
  // World & Knowledge group
  'Places & Travel': '🌍',
  'History & Events': '📜',
  'Technology & Science': '🔬',
  'Nature & Animals': '🐾',
  'Geography': '🗺️',
  'Mathematics': '🔢',
  'Physics & Chemistry': '⚗️',
  'Biology & Medicine': '🧬',
  'Astronomy & Space': '🚀',
  
  // Activities & Sports group
  'Sports & Athletes': '⚽',
  'Outdoor Activities': '🏔️',
  'Fitness & Exercise': '💪',
  'Recreational Games': '🎯',
  'Adventure & Extreme Sports': '🏄',
  'Team Sports': '🏀',
  'Individual Sports': '🎾',
  'Olympic Sports': '🥇',
  'Board Games & Toys': '🎲',
  
  // Modern Life & Technology group
  'Transportation': '🚗',
  'Internet & Social Media': '💻',
  'Brands & Companies': '🏢',
  'Gadgets & Electronics': '📱',
  'Software & Apps': '💾',
  'Cryptocurrency & Finance': '💰',
  'Business & Economy': '📈',
  'Current Events': '📰',
  
  // Creative Arts & Hobbies group
  'Fantasy & Magic': '🔮',
  'Crafts & DIY': '🔨',
  'Photography': '📷',
  'Design & Architecture': '🏛️',
  'Music Production': '🎧',
  'Creative Writing': '✍️',
  'Dance & Movement': '💃',
  
  // Mixed & Everything group
  'Everything': '🎲',
  'Everything+': '✨',
  
  // Adult Content
  'Adult Content': '🔞',
  
  // New Gemini batch categories
  'Hobbies & Crafts': '🎨',
  'Holidays & Celebrations': '🎉',
  'Mythology & Folklore': '🐉',
  'Fairy Tales & Fables': '🧚',
  'Household Items': '🏠',
  'School & Education': '🎓',
  'On the Farm': '🚜',
  'Under the Sea': '🌊',
  'Outer Space & Astronomy': '🚀',
  'Geology & Earth Science': '🏔️',
  'Anatomy & Medical': '🩺',
  'Tools & Home Improvement': '🔧',
  'Musical Instruments': '🎹',
  'Famous Duos & Trios': '👥',
  'In the Office': '🏢',
  'Money & Finance': '💰',
  'Crimes & Justice': '⚖️',
  'Childhood & Nostalgia': '🧸',
  'Natural Wonders': '🏔️',
  'World Architecture': '🏛️',
  'Units of Measurement': '📏'
};

// Helper function to get icon for a category
export function getCategoryIcon(categoryName: string): string {
  return CATEGORY_ICONS[categoryName] || '📁'; // Default folder icon for unknown categories
} 