import React, { useState, useEffect } from 'react';
import { useGameStore, BUZZER_SOUNDS } from '../store';
import { PhraseCategory } from '../data/phrases';
import { HowToPlayModal } from './HowToPlayModal';
import { CategoryRequestModal } from './CategoryRequestModal';
import { VersionDisplay } from './VersionDisplay';
import { useAudio } from '../hooks/useAudio';
import { categoryRequestService } from '../services/categoryRequestService';
import { phraseService } from '../services/phraseService';
import { trackCategoryRequested, trackCategoryConfirmed, trackCategoryGenerated } from '../firebase/analytics';
import './MenuScreen.css';

export const MenuScreen: React.FC = () => {
  const {
    selectedCategory,
    timerDuration,
    showTimer,
    useRandomTimer,
    timerRangeMin,
    timerRangeMax,
    skipLimit,
    buzzerSound,
    setCategory,
    setTimerDuration,
    setShowTimer,
    setUseRandomTimer,
    setTimerRangeMin,
    setTimerRangeMax,
    setSkipLimit,
    setBuzzerSound,
    startTeamSetup,
    startGame
  } = useGameStore();

  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCategoryRequest, setShowCategoryRequest] = useState(false);
  const [customCategories, setCustomCategories] = useState<string[]>([]);

  // Audio hook for testing buzzer sounds
  const testBuzzer = useAudio(buzzerSound, { volume: 0.4 });

  const staticCategories = Object.values(PhraseCategory);
  const buzzerSoundKeys = Object.keys(BUZZER_SOUNDS) as (keyof typeof BUZZER_SOUNDS)[];

  // Load custom categories on component mount
  useEffect(() => {
    const loadCustomCategories = async () => {
      try {
        const customCats = await phraseService.getCustomCategories();
        setCustomCategories(customCats);
      } catch (error) {
        console.warn('Failed to load custom categories:', error);
      }
    };

    loadCustomCategories();
  }, []);

  const handleTestBuzzer = () => {
    testBuzzer.play().catch(console.warn);
  };

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

  const handleConfirmGeneration = async (categoryName: string, sampleWords: string[]): Promise<void> => {
    const startTime = Date.now();
    const requestId = `req_${categoryName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
    
    try {
      // Track confirmation
      trackCategoryConfirmed({
        category_name: categoryName,
        request_id: requestId,
        sample_words: sampleWords
      });
      
      const customPhrases = await categoryRequestService.generateFullCategory(categoryName, sampleWords);
      const generationTime = Date.now() - startTime;
      
      // Track generation completion
      trackCategoryGenerated({
        category_name: categoryName,
        request_id: requestId,
        phrases_generated: customPhrases.length,
        generation_time_ms: generationTime
      });
      
      // Refresh phrase service to include new custom phrases
      await phraseService.refreshCustomPhrases();
      
      // Refresh custom categories list in UI
      const updatedCustomCategories = await phraseService.getCustomCategories();
      setCustomCategories(updatedCustomCategories);
      
      console.log(`Generated ${customPhrases.length} phrases for category: ${categoryName}`);
    } catch (error) {
      console.error('Category generation failed:', error);
      throw error;
    }
  };

  return (
    <main className="menu-screen">
      <header className="menu-header">
        <h1 className="game-title">Words on Phone</h1>
        <p className="game-tagline">The Game with the Words on the Phone!</p>
      </header>

      <div className="menu-content">
        <section className="category-section">
          <h2>Choose Category</h2>
          <div className="category-grid">
            {staticCategories.map(category => (
              <button
                key={category}
                className={`category-button ${selectedCategory === category ? 'selected' : ''}`}
                onClick={() => setCategory(category)}
                aria-label={`Select ${category} category`}
              >
                {category}
              </button>
            ))}
            {customCategories.map(category => (
              <button
                key={`custom-${category}`}
                className={`category-button custom-category ${selectedCategory === category ? 'selected' : ''}`}
                onClick={() => setCategory(category)}
                aria-label={`Select ${category} custom category`}
              >
                ✨ {category}
              </button>
            ))}
          </div>
        </section>

        <button
          className="settings-toggle"
          onClick={() => setShowSettings(!showSettings)}
          aria-label="Toggle settings"
        >
          ⚙️ Settings
        </button>

        {showSettings && (
          <div className="settings-panel">
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={showTimer}
                  onChange={(e) => setShowTimer(e.target.checked)}
                  className="setting-checkbox"
                />
                Show Timer (default: hidden)
              </label>
              <p className="setting-description">
                Display the countdown timer during gameplay
              </p>
            </div>

            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={useRandomTimer}
                  onChange={(e) => setUseRandomTimer(e.target.checked)}
                  className="setting-checkbox"
                />
                Random Timer Duration (default: enabled)
              </label>
              <p className="setting-description">
                Randomize timer duration each round for unpredictability
              </p>
            </div>

            {useRandomTimer ? (
              <>
                <div className="setting-item">
                  <label htmlFor="timer-range-min">
                    Random Timer Range: {timerRangeMin}s - {timerRangeMax}s
                  </label>
                  <div className="dual-slider-container">
                    <input
                      id="timer-range-min"
                      type="range"
                      min="30"
                      max="90"
                      step="5"
                      value={timerRangeMin}
                      onChange={(e) => setTimerRangeMin(Number(e.target.value))}
                      className="slider range-min"
                      aria-label="Minimum timer duration"
                    />
                    <input
                      id="timer-range-max"
                      type="range"
                      min="30"
                      max="90"
                      step="5"
                      value={timerRangeMax}
                      onChange={(e) => setTimerRangeMax(Number(e.target.value))}
                      className="slider range-max"
                      aria-label="Maximum timer duration"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="setting-item">
                <label htmlFor="timer-slider">
                  Fixed Timer Duration: {timerDuration}s
                </label>
                <input
                  id="timer-slider"
                  type="range"
                  min="30"
                  max="90"
                  step="10"
                  value={timerDuration}
                  onChange={(e) => setTimerDuration(Number(e.target.value))}
                  className="slider"
                />
              </div>
            )}

            <div className="setting-item">
              <label htmlFor="skip-limit">
                Skip Limit: {skipLimit === 0 ? 'Unlimited' : skipLimit}
              </label>
              <input
                id="skip-limit"
                type="range"
                min="0"
                max="5"
                step="1"
                value={skipLimit}
                onChange={(e) => setSkipLimit(Number(e.target.value))}
                className="slider"
              />
            </div>

            <div className="setting-item">
              <label htmlFor="buzzer-sound">
                Buzzer Sound: {BUZZER_SOUNDS[buzzerSound]}
              </label>
              <div className="buzzer-controls">
                <select
                  id="buzzer-sound"
                  value={buzzerSound}
                  onChange={(e) => setBuzzerSound(e.target.value as keyof typeof BUZZER_SOUNDS)}
                  className="buzzer-selector"
                >
                  {buzzerSoundKeys.map(soundKey => (
                    <option key={soundKey} value={soundKey}>
                      {BUZZER_SOUNDS[soundKey]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleTestBuzzer}
                  className="test-buzzer-button"
                  aria-label="Test buzzer sound"
                >
                  🔊 Test
                </button>
              </div>
            </div>

            <div className="setting-item custom-category-section">
              <label>Custom Categories</label>
              <p className="setting-description">
                Request AI-generated phrases for specific categories
              </p>
              <button
                type="button"
                onClick={() => setShowCategoryRequest(true)}
                className="category-request-button"
                aria-label="Request custom category"
              >
                🎯 Request Category
              </button>
            </div>
          </div>
        )}

        <div className="menu-actions">
          <button
            className="start-button team-game"
            onClick={startTeamSetup}
            aria-label="Start team game"
          >
            🏆 Team Game
          </button>

          <button
            className="start-button solo-game"
            onClick={startGame}
            aria-label="Start solo game"
          >
            👤 Solo Game
          </button>

          <button
            className="how-to-play-button"
            onClick={() => setShowHowToPlay(true)}
            aria-label="How to play"
          >
            ℹ️ How to Play
          </button>
        </div>
      </div>

      <HowToPlayModal
        isOpen={showHowToPlay}
        onClose={() => setShowHowToPlay(false)}
      />

      <CategoryRequestModal
        isOpen={showCategoryRequest}
        onClose={() => setShowCategoryRequest(false)}
        onRequestCategory={handleCategoryRequest}
        onConfirmGeneration={handleConfirmGeneration}
      />
      
      <VersionDisplay />
    </main>
  );
}; 