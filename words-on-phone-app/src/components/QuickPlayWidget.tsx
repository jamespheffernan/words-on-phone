import React, { useState, useCallback, useMemo } from 'react';
import { useGameStore } from '../store';
import { useCategoryMetadata } from '../hooks/useCategoryMetadata';
import { useCategoryPopularity } from '../hooks/useCategoryPopularity';
import { useHaptics } from '../hooks/useHaptics';
import { CategoryMetadata } from '../types/category';
import './QuickPlayWidget.css';

interface QuickPlayWidgetProps {
  onCategorySelected?: (categoryName: string) => void;
  onGameStart?: () => void;
}

export const QuickPlayWidget: React.FC<QuickPlayWidgetProps> = ({
  onCategorySelected,
  onGameStart
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const { setSelectedCategories, startGame, selectedCategories } = useGameStore();
  const { defaultCategories, customCategories } = useCategoryMetadata();
  const { triggerImpact, triggerNotification } = useHaptics();

  // Combine all categories for popularity analysis
  const allCategories = useMemo(() => 
    [...defaultCategories, ...customCategories], 
    [defaultCategories, customCategories]
  );

  const {
    topCategories,
    getPopularityData,
    loading: popularityLoading
  } = useCategoryPopularity({
    categories: allCategories,
    topCount: 6,
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

  // Surprise Me - random category selection
  const handleSurpriseMe = useCallback(() => {
    if (allCategories.length === 0) return;
    
    // Equal probability for all default categories (excludes custom unless opted-in)
    const eligibleCategories = allCategories.filter(cat => cat.type === 'default');
    if (eligibleCategories.length === 0) return;
    
    const randomIndex = Math.floor(Math.random() * eligibleCategories.length);
    const selectedCategory = eligibleCategories[randomIndex];
    
    setSelectedCategories([selectedCategory.name]);
    triggerNotification();
    onCategorySelected?.(selectedCategory.name);
    
    // Auto-start game after selection for quick play
    setTimeout(() => {
      startGame();
      onGameStart?.();
    }, 100);
  }, [allCategories, setSelectedCategories, startGame, triggerNotification, onCategorySelected, onGameStart]);

  // Last Played quick start
  const handleLastPlayed = useCallback(() => {
    if (!lastPlayedCategory) return;
    
    setSelectedCategories([lastPlayedCategory.name]);
    triggerImpact();
    onCategorySelected?.(lastPlayedCategory.name);
    
    // Auto-start game
    setTimeout(() => {
      startGame();
      onGameStart?.();
    }, 100);
  }, [lastPlayedCategory, setSelectedCategories, startGame, triggerImpact, onCategorySelected, onGameStart]);

  // Category tile quick start
  const handleCategoryQuickStart = useCallback((categoryName: string) => {
    setSelectedCategories([categoryName]);
    triggerImpact();
    onCategorySelected?.(categoryName);
    
    // Auto-start game
    setTimeout(() => {
      startGame();
      onGameStart?.();
    }, 100);
  }, [setSelectedCategories, startGame, triggerImpact, onCategorySelected, onGameStart]);

  // Toggle expansion
  const toggleExpanded = useCallback(() => {
    setIsExpanded(!isExpanded);
    triggerImpact();
  }, [isExpanded, triggerImpact]);

  // Format relative time for last played
  const formatLastPlayed = useCallback((timestamp: number): string => {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMinutes > 0) return `${diffMinutes}m ago`;
    return 'just now';
  }, []);

  if (popularityLoading || allCategories.length === 0) {
    return (
      <div className="quick-play-widget">
        <div className="quick-play-header">
          <h3>⚡ Quick Play</h3>
          <div className="loading-spinner">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`quick-play-widget ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <button 
        className="quick-play-header"
        onClick={toggleExpanded}
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} Quick Play`}
      >
        <h3>⚡ Quick Play</h3>
        <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
          ▼
        </span>
      </button>

      {isExpanded && (
        <div className="quick-play-content">
          {/* Quick Start Actions */}
          <div className="quick-actions">
            {lastPlayedCategory && (
              <button 
                className="quick-action-button last-played"
                onClick={handleLastPlayed}
                title={`Continue with ${lastPlayedCategory.name}`}
              >
                <span className="action-icon">🎬</span>
                <div className="action-content">
                  <div className="action-title">Last Played</div>
                  <div className="action-subtitle">{lastPlayedCategory.name}</div>
                </div>
              </button>
            )}
            
            <button 
              className="quick-action-button surprise-me"
              onClick={handleSurpriseMe}
              title="Random category selection"
            >
              <span className="action-icon">🎲</span>
              <div className="action-content">
                <div className="action-title">Surprise Me!</div>
                <div className="action-subtitle">Random pick</div>
              </div>
            </button>
          </div>

          {/* Top Categories */}
          {topCategories.length > 0 && (
            <div className="popular-categories">
              <h4 className="popular-title">Popular Categories</h4>
              <div className="category-tiles">
                {topCategories.slice(0, 6).map((category) => {
                  const popularityData = getPopularityData(category.id);
                  return (
                    <button
                      key={category.id}
                      className="category-tile"
                      onClick={() => handleCategoryQuickStart(category.name)}
                      title={`${category.phraseCount} phrases • Score: ${Math.round(category.popularityScore || 0)}`}
                    >
                      <div className="tile-content">
                        <div className="tile-name">{category.name}</div>
                        <div className="tile-stats">
                          <span className="phrase-count">{category.phraseCount}</span>
                          {popularityData && (
                            <span className="play-count">
                              {popularityData.playCount} plays
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tap Count Indicator */}
          <div className="tap-count-info">
            <span className="tap-indicator">👆 1-2 taps to start playing!</span>
          </div>
        </div>
      )}
    </div>
  );
}; 