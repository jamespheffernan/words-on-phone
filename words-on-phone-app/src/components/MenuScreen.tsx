import React, { useState } from 'react';
import { useGameStore } from '../store';
import { HowToPlayModal } from './HowToPlayModal';
import { CategoryRequestModal } from './CategoryRequestModal';
import { VersionDisplay } from './VersionDisplay';
import { PrivacySettings } from './PrivacySettings';
import { GameSettingsModal } from './GameSettingsModal';
import { useHaptics } from '../hooks/useHaptics';
import { categoryRequestService } from '../services/categoryRequestService';
import { phraseService } from '../services/phraseService';
import { trackCategoryRequested, trackCategoryConfirmed, trackCategoryGenerated } from '../firebase/analytics';
import { useCategoryMetadata } from '../hooks/useCategoryMetadata';
import { CategorySelector } from './CategorySelector';
import { SelectionBanner } from './SelectionBanner';
import { HeroSection } from './HeroSection';
import { analytics } from '../services/analytics';
import './MenuScreen.css';

export const MenuScreen: React.FC = () => {
  const {
    selectedCategories,
    showTimer,
    setSelectedCategories,
    setShowTimer,
    startSoloGame
  } = useGameStore();

  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showGameSettings, setShowGameSettings] = useState(false);
  const [showBrowseCategories, setShowBrowseCategories] = useState(false);
  const [showCategoryRequest, setShowCategoryRequest] = useState(false);
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  
  const { defaultCategories, customCategories, loading: categoriesLoading, reload: reloadCategories } = useCategoryMetadata();

  // Basic haptics using current implementation  
  const { triggerNotification } = useHaptics();

  const handleCategoryRequest = async (categoryName: string): Promise<string[]> => {
    try {
      const sampleWords = await categoryRequestService.requestSampleWords(categoryName);
      const requestId = `req_${categoryName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
      const quotaCheck = await categoryRequestService.canMakeRequest();
      
      // Track analytics
      trackCategoryRequested({
        category_name: categoryName,
        request_id: requestId,
        remaining_quota: quotaCheck.remainingToday
      });
      
      return sampleWords;
    } catch (error) {
      console.error('Category request failed:', error);
      throw error;
    }
  };

  const handleConfirmGeneration = async (info: { name: string; description: string; tags: string[] }, sampleWords: string[]) => {
    const startTime = Date.now();
    const requestId = `req_${info.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
    
    try {
      // Track confirmation
      trackCategoryConfirmed({
        category_name: info.name,
        request_id: requestId,
        sample_words: sampleWords
      });
      
      const customPhrases = await categoryRequestService.generateFullCategory(info.name, sampleWords, info.description, info.tags);
      const generationTime = Date.now() - startTime;
      
      // Track generation completion
      trackCategoryGenerated({
        category_name: info.name,
        request_id: requestId,
        phrases_generated: customPhrases.length,
        generation_time_ms: generationTime
      });
      
      // Refresh phrase service cache and reload category metadata
      await phraseService.refreshCustomPhrases();
      reloadCategories();
      
      console.log(`Generated ${customPhrases.length} phrases for category: ${info.name}`);
      
      // Return the generated phrases for review
      return customPhrases;
    } catch (error) {
      console.error('Category generation failed:', error);
      throw error;
    }
  };

  return (
    <main className="menu-screen" data-testid="menu-screen">
      <div className="menu-content">
        {/* Hero Section - Primary actions and popular categories */}
        <HeroSection
          onCategorySelected={(categoryName) => {
            console.log('Hero section category selected:', categoryName);
          }}
          onGameStart={() => {
            console.log('Hero section game started');
          }}
        />

        {/* Progressive Disclosure Section */}
        <div className="progressive-disclosure">
          
          {/* Browse All Categories */}
          <div className="disclosure-section">
            <button
              className="disclosure-header"
              onClick={() => {
                setShowBrowseCategories(!showBrowseCategories);
                triggerNotification();
                
                if (!showBrowseCategories) {
                  analytics.track('browse_categories_opened', {
                    source: 'menu_disclosure'
                  });
                }
              }}
              aria-expanded={showBrowseCategories}
              aria-label="Browse all categories"
            >
              <span className="disclosure-icon">📂</span>
              <span className="disclosure-title">Browse All Categories</span>
              <span className={`disclosure-chevron ${showBrowseCategories ? 'expanded' : ''}`}>▼</span>
            </button>
            
            {showBrowseCategories && (
              <div className="disclosure-content">
                <CategorySelector
                  defaultCategories={defaultCategories}
                  customCategories={customCategories}
                  selected={selectedCategories}
                  onChange={(sel) => setSelectedCategories(sel)}
                  loading={categoriesLoading}
                />

                <SelectionBanner
                  categories={selectedCategories}
                  onClear={() => setSelectedCategories([])}
                />

                {selectedCategories.length > 0 && (
                  <div className="browse-actions">
                    <button
                      className="start-button solo-game"
                      onClick={startSoloGame}
                      aria-label="Start solo game with selected categories"
                    >
                      👤 Start Solo Game
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Settings */}
          <div className="disclosure-section">
            <button
              className="disclosure-header"
              onClick={() => {
                setShowGameSettings(true);
                analytics.track('settings_opened', {
                  source: 'menu_disclosure'
                });
              }}
              aria-label="Game settings"
            >
              <span className="disclosure-icon">⚙️</span>
              <span className="disclosure-title">Game Settings</span>
              <span className="disclosure-subtitle">Timer • Sound • Controls</span>
            </button>
          </div>

          {/* Advanced Options */}
          <div className="disclosure-section">
            <button
              className="disclosure-header"
              onClick={() => {
                setShowAdvancedOptions(!showAdvancedOptions);
                triggerNotification();
              }}
              aria-expanded={showAdvancedOptions}
              aria-label="Advanced options"
            >
              <span className="disclosure-icon">🔒</span>
              <span className="disclosure-title">Privacy & More</span>
              <span className={`disclosure-chevron ${showAdvancedOptions ? 'expanded' : ''}`}>▼</span>
            </button>
            
            {showAdvancedOptions && (
              <div className="disclosure-content">
                <div className="advanced-options-grid">
                  <button
                    className="advanced-option-button"
                    onClick={() => setShowCategoryRequest(true)}
                    aria-label="Request custom category"
                  >
                    <span className="option-icon">🎯</span>
                    <div className="option-content">
                      <div className="option-title">Custom Categories</div>
                      <div className="option-subtitle">AI-generated phrases</div>
                    </div>
                  </button>
                  
                  <button
                    className="advanced-option-button"
                    onClick={() => setShowPrivacySettings(true)}
                    aria-label="Privacy settings"
                  >
                    <span className="option-icon">🔒</span>
                    <div className="option-content">
                      <div className="option-title">Privacy Settings</div>
                      <div className="option-subtitle">Data & analytics</div>
                    </div>
                  </button>
                  
                  <button
                    className="advanced-option-button"
                    onClick={() => setShowHowToPlay(true)}
                    aria-label="How to play"
                  >
                    <span className="option-icon">ℹ️</span>
                    <div className="option-content">
                      <div className="option-title">How to Play</div>
                      <div className="option-subtitle">Rules & tips</div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Quick Settings Toggle */}
          <div className="quick-settings">
            <label className="quick-setting-item">
              <input
                type="checkbox"
                checked={showTimer}
                onChange={(e) => {
                  const newValue = e.target.checked;
                  analytics.track('setting_changed', {
                    settingName: 'showTimer',
                    previousValue: showTimer,
                    newValue
                  });
                  setShowTimer(newValue);
                }}
                className="setting-checkbox"
              />
              <span className="setting-label">Show Timer</span>
            </label>
          </div>
        </div>

        <VersionDisplay />
      </div>

      {/* Modals */}
      <HowToPlayModal
        isOpen={showHowToPlay}
        onClose={() => setShowHowToPlay(false)}
      />

      <GameSettingsModal
        isOpen={showGameSettings}
        onClose={() => setShowGameSettings(false)}
      />

      <CategoryRequestModal
        isOpen={showCategoryRequest}
        onClose={() => setShowCategoryRequest(false)}
        onRequestCategory={handleCategoryRequest}
        onConfirmGeneration={handleConfirmGeneration}
      />

      <PrivacySettings
        isOpen={showPrivacySettings}
        onClose={() => setShowPrivacySettings(false)}
      />
    </main>
  );
}; 