import { get, set, keys } from 'idb-keyval';
import { 
  CategoryPopularityData, 
  PopularityCalculationOptions,
  CategoryWithPopularity,
  CategoryMetadata 
} from '../types/category';

export class CategoryPopularityService {
  private static readonly STORAGE_KEY_PREFIX = 'category-popularity:';
  
  private static readonly DEFAULT_OPTIONS: PopularityCalculationOptions = {
    playCountWeight: 0.7,
    recencyWeight: 0.3,
    maxRecencyDays: 30
  };

  /**
   * Record that a category was played
   */
  async recordCategoryPlayed(categoryId: string): Promise<void> {
    try {
      const key = this.getStorageKey(categoryId);
      const existing = await this.getPopularityData(categoryId);
      
      const updated: CategoryPopularityData = existing ? {
        ...existing,
        playCount: existing.playCount + 1,
        lastPlayed: Date.now()
      } : {
        categoryId,
        playCount: 1,
        lastPlayed: Date.now(),
        createdAt: Date.now()
      };

      await set(key, updated);
    } catch (error) {
      console.warn('Failed to record category play:', error);
    }
  }

  /**
   * Get popularity data for a specific category
   */
  async getPopularityData(categoryId: string): Promise<CategoryPopularityData | null> {
    try {
      const key = this.getStorageKey(categoryId);
      const data = await get<CategoryPopularityData>(key);
      return data || null;
    } catch (error) {
      console.warn('Failed to get popularity data:', error);
      return null;
    }
  }

  /**
   * Get popularity data for all categories
   */
  async getAllPopularityData(): Promise<CategoryPopularityData[]> {
    try {
      const allKeys = await keys();
      const popularityKeys = allKeys.filter(key => 
        typeof key === 'string' && key.startsWith(CategoryPopularityService.STORAGE_KEY_PREFIX)
      );
      
      const popularityData: CategoryPopularityData[] = [];
      
      for (const key of popularityKeys) {
        try {
          const data = await get<CategoryPopularityData>(key);
          if (data) {
            popularityData.push(data);
          }
        } catch (error) {
          console.warn(`Failed to load popularity data for key ${key}:`, error);
        }
      }
      
      return popularityData;
    } catch (error) {
      console.warn('Failed to get all popularity data:', error);
      return [];
    }
  }

  /**
   * Calculate weighted popularity score for a category
   */
  calculatePopularityScore(
    popularityData: CategoryPopularityData | null,
    options: Partial<PopularityCalculationOptions> = {}
  ): number {
    if (!popularityData) return 0;

    const opts = { ...CategoryPopularityService.DEFAULT_OPTIONS, ...options };
    
    // Play count component (0-100 scale, logarithmic)
    const playCountScore = Math.min(100, Math.log10(popularityData.playCount + 1) * 50);
    
    // Recency component (0-100 scale based on days since last played)
    const daysSinceLastPlayed = (Date.now() - popularityData.lastPlayed) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, 100 - (daysSinceLastPlayed / opts.maxRecencyDays) * 100);
    
    // Weighted final score
    const finalScore = (playCountScore * opts.playCountWeight) + (recencyScore * opts.recencyWeight);
    
    return Math.round(finalScore * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Enhance categories with popularity data and scores
   */
  async enhanceCategoriesWithPopularity(
    categories: CategoryMetadata[],
    options: Partial<PopularityCalculationOptions> = {}
  ): Promise<CategoryWithPopularity[]> {
    const allPopularityData = await this.getAllPopularityData();
    const popularityMap = new Map(allPopularityData.map(data => [data.categoryId, data]));
    
    return categories.map(category => {
      const popularityData = popularityMap.get(category.id);
      const popularityScore = this.calculatePopularityScore(popularityData || null, options);
      
      return {
        ...category,
        popularityData,
        popularityScore
      };
    });
  }

  /**
   * Get top N most popular categories
   */
  async getTopCategories(
    categories: CategoryMetadata[],
    count: number = 6,
    options: Partial<PopularityCalculationOptions> = {}
  ): Promise<CategoryWithPopularity[]> {
    const enhanced = await this.enhanceCategoriesWithPopularity(categories, options);
    
    return enhanced
      .sort((a, b) => (b.popularityScore || 0) - (a.popularityScore || 0))
      .slice(0, count);
  }

  /**
   * Clear all popularity data (for testing/reset)
   */
  async clearAllPopularityData(): Promise<void> {
    try {
      const allKeys = await keys();
      const popularityKeys = allKeys.filter(key => 
        typeof key === 'string' && key.startsWith(CategoryPopularityService.STORAGE_KEY_PREFIX)
      );
      
      for (const key of popularityKeys) {
        await set(key, undefined);
      }
    } catch (error) {
      console.warn('Failed to clear popularity data:', error);
    }
  }

  private getStorageKey(categoryId: string): string {
    return `${CategoryPopularityService.STORAGE_KEY_PREFIX}${categoryId}`;
  }
}

// Export singleton instance
export const categoryPopularityService = new CategoryPopularityService(); 