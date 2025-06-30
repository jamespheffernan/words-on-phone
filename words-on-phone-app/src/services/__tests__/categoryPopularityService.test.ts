import { describe, it, expect, vi, beforeEach } from 'vitest';
import { categoryPopularityService } from '../categoryPopularityService';
import { CategoryMetadata } from '../../types/category';

// Mock idb-keyval
const mockStorage = new Map<string, any>();

vi.mock('idb-keyval', () => ({
  get: vi.fn((key: string) => Promise.resolve(mockStorage.get(key))),
  set: vi.fn((key: string, value: any) => {
    mockStorage.set(key, value);
    return Promise.resolve();
  }),
  keys: vi.fn(() => Promise.resolve(Array.from(mockStorage.keys()))),
}));

describe('CategoryPopularityService', () => {
  beforeEach(() => {
    // Clear mock storage before each test
    mockStorage.clear();
  });

  describe('recordCategoryPlayed', () => {
    it('should create new popularity data for first play', async () => {
      const categoryId = 'movies-tv';
      await categoryPopularityService.recordCategoryPlayed(categoryId);
      
      const data = await categoryPopularityService.getPopularityData(categoryId);
      
      expect(data).toEqual({
        categoryId: 'movies-tv',
        playCount: 1,
        lastPlayed: expect.any(Number),
        createdAt: expect.any(Number)
      });
    });

    it('should increment play count for existing category', async () => {
      const categoryId = 'movies-tv';
      
      // Play twice
      await categoryPopularityService.recordCategoryPlayed(categoryId);
      await categoryPopularityService.recordCategoryPlayed(categoryId);
      
      const data = await categoryPopularityService.getPopularityData(categoryId);
      expect(data?.playCount).toBe(2);
    });
  });

  describe('calculatePopularityScore', () => {
    it('should return 0 for null data', () => {
      const score = categoryPopularityService.calculatePopularityScore(null);
      expect(score).toBe(0);
    });

    it('should calculate score based on play count and recency', () => {
      const now = Date.now();
      const popularityData = {
        categoryId: 'test',
        playCount: 5,
        lastPlayed: now - (7 * 24 * 60 * 60 * 1000), // 7 days ago
        createdAt: now - (30 * 24 * 60 * 60 * 1000)
      };

      const score = categoryPopularityService.calculatePopularityScore(popularityData);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should give higher score to recently played categories', () => {
      const now = Date.now();
      const recentData = {
        categoryId: 'recent',
        playCount: 3,
        lastPlayed: now - (1 * 24 * 60 * 60 * 1000), // 1 day ago
        createdAt: now - (10 * 24 * 60 * 60 * 1000)
      };
      
      const oldData = {
        categoryId: 'old',
        playCount: 3,
        lastPlayed: now - (20 * 24 * 60 * 60 * 1000), // 20 days ago
        createdAt: now - (30 * 24 * 60 * 60 * 1000)
      };

      const recentScore = categoryPopularityService.calculatePopularityScore(recentData);
      const oldScore = categoryPopularityService.calculatePopularityScore(oldData);
      
      expect(recentScore).toBeGreaterThan(oldScore);
    });
  });

  describe('enhanceCategoriesWithPopularity', () => {
    it('should enhance categories with popularity data', async () => {
      const categoryId = 'movies-tv';
      const categories: CategoryMetadata[] = [{
        id: categoryId,
        name: 'Movies & TV',
        type: 'default',
        phraseCount: 50,
        createdAt: 0
      }];

      // Record some plays
      await categoryPopularityService.recordCategoryPlayed(categoryId);
      await categoryPopularityService.recordCategoryPlayed(categoryId);

      const enhanced = await categoryPopularityService.enhanceCategoriesWithPopularity(categories);
      
      expect(enhanced).toHaveLength(1);
      expect(enhanced[0]).toEqual({
        id: categoryId,
        name: 'Movies & TV',
        type: 'default',
        phraseCount: 50,
        createdAt: 0,
        popularityData: {
          categoryId,
          playCount: 2,
          lastPlayed: expect.any(Number),
          createdAt: expect.any(Number)
        },
        popularityScore: expect.any(Number)
      });
    });

    it('should handle categories without popularity data', async () => {
      const categories: CategoryMetadata[] = [{
        id: 'unplayed-category',
        name: 'Never Played',
        type: 'default',
        phraseCount: 30,
        createdAt: 0
      }];

      const enhanced = await categoryPopularityService.enhanceCategoriesWithPopularity(categories);
      
      expect(enhanced[0].popularityData).toBeUndefined();
      expect(enhanced[0].popularityScore).toBe(0);
    });
  });

  describe('getTopCategories', () => {
    it('should return categories sorted by popularity score', async () => {
      const categories: CategoryMetadata[] = [
        { id: 'category-a', name: 'Category A', type: 'default', phraseCount: 10, createdAt: 0 },
        { id: 'category-b', name: 'Category B', type: 'default', phraseCount: 20, createdAt: 0 },
        { id: 'category-c', name: 'Category C', type: 'default', phraseCount: 15, createdAt: 0 }
      ];

      // Make category-b more popular
      await categoryPopularityService.recordCategoryPlayed('category-b');
      await categoryPopularityService.recordCategoryPlayed('category-b');
      await categoryPopularityService.recordCategoryPlayed('category-b');
      
      // Make category-a moderately popular
      await categoryPopularityService.recordCategoryPlayed('category-a');

      const topCategories = await categoryPopularityService.getTopCategories(categories, 2);
      
      expect(topCategories).toHaveLength(2);
      expect(topCategories[0].id).toBe('category-b');
      expect(topCategories[1].id).toBe('category-a');
    });

    it('should limit results to requested count', async () => {
      const categories: CategoryMetadata[] = Array.from({ length: 10 }, (_, i) => ({
        id: `category-${i}`,
        name: `Category ${i}`,
        type: 'default' as const,
        phraseCount: 10,
        createdAt: 0
      }));

      const topCategories = await categoryPopularityService.getTopCategories(categories, 3);
      expect(topCategories).toHaveLength(3);
    });
  });
}); 