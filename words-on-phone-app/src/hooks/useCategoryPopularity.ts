import { useState, useEffect, useCallback, useMemo } from 'react';
import { categoryPopularityService } from '../services/categoryPopularityService';
import { 
  CategoryWithPopularity, 
  CategoryMetadata, 
  CategoryPopularityData,
  PopularityCalculationOptions 
} from '../types/category';

interface UseCategoryPopularityReturn {
  // Enhanced categories with popularity data
  categoriesWithPopularity: CategoryWithPopularity[];
  
  // Top popular categories
  topCategories: CategoryWithPopularity[];
  
  // Individual category popularity data
  getPopularityData: (categoryId: string) => CategoryPopularityData | undefined;
  
  // Actions
  recordCategoryPlayed: (categoryId: string) => Promise<void>;
  refreshPopularityData: () => Promise<void>;
  
  // State
  loading: boolean;
  error: string | null;
}

interface UseCategoryPopularityOptions {
  categories: CategoryMetadata[];
  topCount?: number;
  popularityOptions?: Partial<PopularityCalculationOptions>;
  autoRefresh?: boolean; // Whether to auto-refresh on mount
}

export function useCategoryPopularity({
  categories,
  topCount = 6,
  popularityOptions = {},
  autoRefresh = true
}: UseCategoryPopularityOptions): UseCategoryPopularityReturn {
  const [categoriesWithPopularity, setCategoriesWithPopularity] = useState<CategoryWithPopularity[]>([]);
  const [topCategories, setTopCategories] = useState<CategoryWithPopularity[]>([]);
  const [popularityDataMap, setPopularityDataMap] = useState<Map<string, CategoryPopularityData>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoize the options to prevent unnecessary re-renders
  const memoizedOptions = useMemo(() => popularityOptions, [JSON.stringify(popularityOptions)]);
  
  // Memoize category IDs to detect actual changes
  const categoryIds = useMemo(() => 
    categories.map(cat => cat.id).sort().join(','), 
    [categories]
  );

  // Load popularity data and enhance categories
  const refreshPopularityData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get enhanced categories with popularity data
      const enhanced = await categoryPopularityService.enhanceCategoriesWithPopularity(
        categories,
        memoizedOptions
      );
      setCategoriesWithPopularity(enhanced);

      // Get top categories
      const top = await categoryPopularityService.getTopCategories(
        categories,
        topCount,
        memoizedOptions
      );
      setTopCategories(top);

      // Build popularity data map for quick lookup
      const allPopularityData = await categoryPopularityService.getAllPopularityData();
      const dataMap = new Map(allPopularityData.map(data => [data.categoryId, data]));
      setPopularityDataMap(dataMap);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load popularity data';
      setError(errorMessage);
      console.error('Error loading category popularity data:', err);
    } finally {
      setLoading(false);
    }
  }, [categories, topCount, memoizedOptions]);

  // Record category play and refresh data
  const recordCategoryPlayed = useCallback(async (categoryId: string) => {
    try {
      await categoryPopularityService.recordCategoryPlayed(categoryId);
      // Refresh data to reflect the new play count
      await refreshPopularityData();
    } catch (err) {
      console.error('Error recording category play:', err);
      throw err;
    }
  }, [refreshPopularityData]);

  // Get popularity data for a specific category
  const getPopularityData = useCallback((categoryId: string): CategoryPopularityData | undefined => {
    return popularityDataMap.get(categoryId);
  }, [popularityDataMap]);

  // Auto-refresh on mount and when category IDs actually change
  useEffect(() => {
    if (autoRefresh && categories.length > 0) {
      refreshPopularityData();
    }
  }, [autoRefresh, categoryIds, topCount, JSON.stringify(memoizedOptions)]);

  return {
    categoriesWithPopularity,
    topCategories,
    getPopularityData,
    recordCategoryPlayed,
    refreshPopularityData,
    loading,
    error
  };
} 