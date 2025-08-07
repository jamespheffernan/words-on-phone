import React, { useMemo, useCallback } from 'react';
import { useGameStore } from '../store';
import { useCategoryMetadata } from '../hooks/useCategoryMetadata';
import { useCategoryPopularity } from '../hooks/useCategoryPopularity';
import { useHaptics } from '../hooks/useHaptics';
import { CategoryMetadata } from '../types/category';
import { TopCategoriesGrid } from './TopCategoriesGrid';
import { analytics } from '../services/analytics';
import './HeroSection.css';

interface HeroSectionProps {
  onCategorySelected?: (categoryName: string) => void;
  onGameStart?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onCategorySelected,
  onGameStart
}) => {
  const { setSelectedCategories, startGame } = useGameStore();
  const { defaultCategories, customCategories } = useCategoryMetadata();
  const { triggerImpact, triggerNotification } = useHaptics();

  // Combine all categories for popularity analysis
  const allCategories = useMemo(() => 
    [...defaultCategories, ...customCategories], 
    [defaultCategories, customCategories]
  );

  const {
    getPopularityData
  } = useCategoryPopularity({
    categories: allCategories,
    topCount: 10,
    popularityOptions: {},
    autoRefresh: true
  });

  // Get last played category
  const lastPlayedCategory = useMemo(() => {
    if (allCategories.length === 0) return null;
    
    let mostRecent: { category: CategoryMetadata; lastPlayed: number } | null = null;
    
    for (const category of allCategories) {
      const popularityData = getPopularityData(category.id);
      if (popularityData && popularityData.lastPlayed) {
        if (!mostRecent || popularityData.lastPlayed > mostRecent.lastPlayed) {
          mostRecent = { category, lastPlayed: popularityData.lastPlayed };
        }
      }
    }
    
    return mostRecent?.category || null;
  }, [allCategories, getPopularityData]);

  // Last Played quick start
  const handleLastPlayed = useCallback(() => {
    if (!lastPlayedCategory) return;
    
    analytics.track('category_selected', {
      categoryName: lastPlayedCategory.name,
      source: 'hero_last_played',
      selectionIndex: 0,
      isMultiSelect: false
    });
    
    setSelectedCategories([lastPlayedCategory.name]);
    triggerImpact();
    onCategorySelected?.(lastPlayedCategory.name);
    
    // Auto-start game
    setTimeout(() => {
      startGame();
      onGameStart?.();
    }, 100);
  }, [lastPlayedCategory, setSelectedCategories, startGame, triggerImpact, onCategorySelected, onGameStart]);

  // Surprise Me - random category selection
  const handleSurpriseMe = useCallback(() => {
    if (allCategories.length === 0) return;
    
    // Equal probability for all default categories
    const eligibleCategories = allCategories.filter(cat => cat.type === 'default');
    if (eligibleCategories.length === 0) return;
    
    const randomIndex = Math.floor(Math.random() * eligibleCategories.length);
    const selectedCategory = eligibleCategories[randomIndex];
    
    analytics.track('surprise_me_clicked', {
      selectedCategory: selectedCategory.name,
      availableCategories: eligibleCategories.length,
      source: 'hero_section'
    });
    
    analytics.track('category_selected', {
      categoryName: selectedCategory.name,
      source: 'hero_surprise_me',
      selectionIndex: randomIndex,
      isMultiSelect: false
    });
    
    setSelectedCategories([selectedCategory.name]);
    triggerNotification();
    onCategorySelected?.(selectedCategory.name);
    
    // Auto-start game after selection
    setTimeout(() => {
      startGame();
      onGameStart?.();
    }, 100);
  }, [allCategories, setSelectedCategories, startGame, triggerNotification, onCategorySelected, onGameStart]);

  // Team Game handler - navigate to team setup flow
  const handleTeamGame = useCallback(() => {
    analytics.track('team_game_clicked', {
      source: 'hero_section'
    });
    
    triggerImpact();
    // Team setup is now handled in MenuScreenSteps, so we'll just trigger the callback
    onGameStart?.();
  }, [triggerImpact, onGameStart]);

  return (
    <section className="hero-section" data-testid="hero-section">
      <header className="hero-header">
        <h1 className="game-title">Words on Phone</h1>
        <p className="game-tagline">Quick party gaming at your fingertips!</p>
      </header>

      <div className="quick-actions">
        {lastPlayedCategory ? (
          <button 
            className="quick-action-button primary last-played"
            onClick={handleLastPlayed}
            data-testid="hero-last-played-button"
            aria-label={`Continue with ${lastPlayedCategory.name}`}
          >
            <span className="action-icon">🎬</span>
            <div className="action-content">
              <div className="action-title">Continue Playing</div>
              <div className="action-subtitle">{lastPlayedCategory.name}</div>
            </div>
          </button>
        ) : (
          <button 
            className="quick-action-button primary get-started"
            onClick={handleSurpriseMe}
            data-testid="hero-get-started-button"
            aria-label="Get started with a random category"
          >
            <span className="action-icon">🚀</span>
            <div className="action-content">
              <div className="action-title">Get Started</div>
              <div className="action-subtitle">Random category</div>
            </div>
          </button>
        )}
        
        <div className="secondary-actions">
          <button 
            className="quick-action-button secondary surprise-me"
            onClick={handleSurpriseMe}
            data-testid="hero-surprise-me-button"
            aria-label="Random category selection"
          >
            <span className="action-icon">🎲</span>
            <span className="action-label">Surprise Me</span>
          </button>
          
          <button 
            className="quick-action-button secondary team-game"
            onClick={handleTeamGame}
            data-testid="hero-team-game-button"
            aria-label="Start team game"
          >
            <span className="action-icon">🏆</span>
            <span className="action-label">Team Game</span>
          </button>
        </div>
      </div>

      <div className="popular-categories">
        <h3 className="section-title">Popular Categories</h3>
        <TopCategoriesGrid
          defaultCategories={defaultCategories}
          customCategories={customCategories}
          onCategorySelected={onCategorySelected}
          onGameStart={onGameStart}
          maxCategories={6}
        />
      </div>
    </section>
  );
};