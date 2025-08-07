import { vi } from 'vitest';

// Mock the phrases.json import with inline data
vi.mock('../phrases.json', () => ({
  default: [
    { phrase: "YouTube", category: "Brands & Companies", prominence: { score: 4766830, method: "wiki_pageviews" } },
    { phrase: "Google", category: "Brands & Companies", prominence: { score: 3143222, method: "wiki_pageviews" } },
    { phrase: "Apple", category: "Brands & Companies", prominence: { score: 1000000, method: "wiki_pageviews" } },
    { phrase: "Microsoft", category: "Brands & Companies", prominence: { score: 500000, method: "wiki_pageviews" } },
    { phrase: "Facebook", category: "Brands & Companies", prominence: { score: 100000, method: "wiki_pageviews" } },
    { phrase: "Netflix", category: "Movies & TV", prominence: { score: 2000000, method: "wiki_pageviews" } },
    { phrase: "Disney", category: "Movies & TV", prominence: { score: 1500000, method: "wiki_pageviews" } },
    { phrase: "Marvel", category: "Movies & TV", prominence: { score: 800000, method: "wiki_pageviews" } },
    { phrase: "HBO", category: "Movies & TV", prominence: { score: 200000, method: "wiki_pageviews" } },
    { phrase: "Pixar", category: "Movies & TV", prominence: { score: 50000, method: "wiki_pageviews" } }
  ]
}));

import { GameDifficulty } from '../store';
import { getPhrasesForDifficulty, getDifficultyStats, getDifficultyDescription } from './difficultyService';

describe('DifficultyService', () => {
  describe('getPhrasesForDifficulty', () => {
    it('should return all phrases for hard difficulty', () => {
      const phrases = getPhrasesForDifficulty(['Brands & Companies'], GameDifficulty.HARD);
      expect(phrases).toHaveLength(5);
      expect(phrases).toContain('YouTube');
      expect(phrases).toContain('Facebook');
    });

    it('should return top 70% for medium difficulty', () => {
      const phrases = getPhrasesForDifficulty(['Brands & Companies'], GameDifficulty.MEDIUM);
      expect(phrases).toHaveLength(4); // 70% of 5 = 3.5, rounded up to 4
      expect(phrases).toContain('YouTube');
      expect(phrases).toContain('Google');
      expect(phrases).toContain('Apple');
      expect(phrases).toContain('Microsoft');
      expect(phrases).not.toContain('Facebook'); // Lowest scoring
    });

    it('should return top 40% for easy difficulty', () => {
      const phrases = getPhrasesForDifficulty(['Brands & Companies'], GameDifficulty.EASY);
      expect(phrases).toHaveLength(2); // 40% of 5 = 2
      expect(phrases).toContain('YouTube');
      expect(phrases).toContain('Google');
      expect(phrases).not.toContain('Facebook');
      expect(phrases).not.toContain('Microsoft');
    });

    it('should handle multiple categories', () => {
      const phrases = getPhrasesForDifficulty(['Brands & Companies', 'Movies & TV'], GameDifficulty.EASY);
      expect(phrases).toHaveLength(4); // 2 from each category
      expect(phrases).toContain('YouTube');
      expect(phrases).toContain('Google');
      expect(phrases).toContain('Netflix');
      expect(phrases).toContain('Disney');
    });
  });

  describe('getDifficultyStats', () => {
    it('should calculate correct stats for single category', () => {
      const stats = getDifficultyStats(['Brands & Companies']);
      expect(stats.total).toBe(5);
      expect(stats.easy).toBe(2);
      expect(stats.medium).toBe(4);
      expect(stats.hard).toBe(5);
    });

    it('should calculate correct stats for multiple categories', () => {
      const stats = getDifficultyStats(['Brands & Companies', 'Movies & TV']);
      expect(stats.total).toBe(10);
      expect(stats.easy).toBe(4); // 2 + 2
      expect(stats.medium).toBe(8); // 4 + 4
      expect(stats.hard).toBe(10); // 5 + 5
    });
  });

  describe('getDifficultyDescription', () => {
    it('should return correct descriptions', () => {
      expect(getDifficultyDescription(GameDifficulty.EASY)).toBe('Top 40% most recognizable phrases');
      expect(getDifficultyDescription(GameDifficulty.MEDIUM)).toBe('Top 70% most recognizable phrases');
      expect(getDifficultyDescription(GameDifficulty.HARD)).toBe('All phrases (including obscure ones)');
    });
  });
});