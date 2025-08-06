import React, { useMemo, useCallback } from 'react';
import { CategoryMetadata, getCategoryIcon } from '../types/category';
import { useCategoryPopularity } from '../hooks/useCategoryPopularity';
import { useGameStore } from '../store';
import { useHaptics } from '../hooks/useHaptics';
import { analytics } from '../services/analytics';
import './TopCategoriesGrid.css';

interface TopCategoriesGridProps {
  defaultCategories: CategoryMetadata[];
  customCategories: CategoryMetadata[];
  onCategorySelected?: (categoryName: string) => void;
  onGameStart?: () => void;
  maxCategories?: number;
}

export const TopCategoriesGrid: React.FC<TopCategoriesGridProps> = ({
  defaultCategories,
  customCategories,
  onCategorySelected,
  onGameStart,
  maxCategories = 6
}) => {
  const { setSelectedCategories, startGame } = useGameStore();
  const { triggerImpact } = useHaptics();

  // Combine all categories for popularity analysis
  const allCategories = useMemo(() => 
    [...defaultCategories, ...customCategories], 
    [defaultCategories, customCategories]
  );

  // Get top categories based on popularity
  const {
    topCategories,
    loading: popularityLoading
  } = useCategoryPopularity({
    categories: allCategories,
    topCount: maxCategories * 2, // Get more to ensure variety
    popularityOptions: {},
    autoRefresh: true
  });

  // Smart category selection algorithm
  const smartCategories = useMemo(() => {
    if (topCategories.length === 0) {
      // Fallback for new users: show balanced default categories
      const fallbackCategories = [
        'Movies & TV',
        'Music & Artists', 
        'Food & Drink',
        'Sports & Athletes',
        'Places & Travel',
        'Famous People'
      ];
      
      return defaultCategories
        .filter(cat => fallbackCategories.includes(cat.name))
        .slice(0, maxCategories);
    }

    // Ensure category variety by group
    const categoryGroups = {
      entertainment: ['Movies & TV', 'Music & Artists', 'Entertainment & Pop Culture', 'Famous People'],
      dailyLife: ['Food & Drink', 'Clothing & Fashion', 'Occupations & Jobs'],
      worldKnowledge: ['Places & Travel', 'History & Events', 'Technology & Science', 'Nature & Animals'],
      activities: ['Sports & Athletes', 'Transportation'],
      creative: ['Everything', 'Everything+', 'Fantasy & Magic']
    };

    const selected: CategoryMetadata[] = [];
    const usedGroups = new Set<string>();
    
    // First pass: one from each group if possible
    for (const category of topCategories) {
      if (selected.length >= maxCategories) break;
      
      const group = Object.keys(categoryGroups).find(groupKey =>
        categoryGroups[groupKey as keyof typeof categoryGroups].includes(category.name)
      );
      
      if (group && !usedGroups.has(group)) {
        selected.push(category);
        usedGroups.add(group);
      }
    }
    
    // Second pass: fill remaining slots with most popular
    for (const category of topCategories) {
      if (selected.length >= maxCategories) break;
      if (!selected.find(c => c.name === category.name)) {
        selected.push(category);
      }
    }

    return selected;
  }, [topCategories, defaultCategories, maxCategories]);

  // Handle category quick start
  const handleCategoryQuickStart = useCallback((categoryName: string, categoryIndex: number) => {
    // Track category selection
    analytics.track('category_selected', {
      categoryName,
      source: 'hero_grid',
      selectionIndex: categoryIndex,
      isMultiSelect: false
    });
    
    setSelectedCategories([categoryName]);
    triggerImpact();
    onCategorySelected?.(categoryName);
    
    // Auto-start game after brief delay
    setTimeout(() => {
      startGame();
      onGameStart?.();
    }, 100);
  }, [setSelectedCategories, startGame, triggerImpact, onCategorySelected, onGameStart]);

  if (popularityLoading || smartCategories.length === 0) {
    return (
      <div className="top-categories-grid">
        <div className="grid-loading">
          <div className="loading-text">Loading categories...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="top-categories-grid" data-testid="top-categories-grid">
      <div className="category-grid">
        {smartCategories.map((category, index) => (
          <button
            key={category.id}
            className="category-tile"
            onClick={() => handleCategoryQuickStart(category.name, index)}
            data-testid={`category-tile-${category.id}`}
            aria-label={`Start game with ${category.name} - ${category.phraseCount} phrases`}
          >
            <div className="tile-icon">
              {getCategoryIcon(category.name)}
            </div>
            <div className="tile-content">
              <div className="tile-name">{category.name}</div>
              <div className="tile-count">{category.phraseCount}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};