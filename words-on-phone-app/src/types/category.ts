export type CategoryType = 'default' | 'custom';

export interface CategoryMetadata {
  id: string;              // Unique identifier (slugified name)
  name: string;            // Display name
  type: CategoryType;      // default | custom
  phraseCount: number;     // Number of phrases in the category
  createdAt: number;       // Unix epoch ms – 0 for built-in categories
  lastUpdated?: number;    // For custom categories when phrases were last refreshed
} 