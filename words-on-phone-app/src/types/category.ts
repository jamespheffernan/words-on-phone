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

export interface CategoryWithPopularity extends CategoryMetadata {
  popularityData?: CategoryPopularityData;
  popularityScore?: number; // Calculated weighted score
}

export interface PopularityCalculationOptions {
  playCountWeight: number; // Weight for play count (0-1, default: 0.7)
  recencyWeight: number;   // Weight for recency bonus (0-1, default: 0.3)
  maxRecencyDays: number;  // Max days for recency calculation (default: 30)
} 