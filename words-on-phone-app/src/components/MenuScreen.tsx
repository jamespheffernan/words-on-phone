import React, { useState } from 'react';
import { useGameStore, BUZZER_SOUNDS } from '../store';
import { PhraseCategory } from '../data/phrases';
import { HowToPlayModal } from './HowToPlayModal';
import { CategoryRequestModal } from './CategoryRequestModal';
import { useAudio } from '../hooks/useAudio';
import { useBeepAudio } from '../hooks/useBeepAudio';
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
    // Beep ramp settings
    enableBeepRamp,
    beepRampStart,
    beepFirstInterval,
    beepFinalInterval,
    beepVolume,
    setCategory,
    setTimerDuration,
    setShowTimer,
    setUseRandomTimer,
    setTimerRangeMin,
    setTimerRangeMax,
    setSkipLimit,
    setBuzzerSound,
    // Beep ramp actions
    setEnableBeepRamp,
    setBeepRampStart,
    setBeepFirstInterval,
    setBeepFinalInterval,
    setBeepVolume,
    startGame
  } = useGameStore();

  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCategoryRequest, setShowCategoryRequest] = useState(false);

  // Audio hook for testing buzzer sounds
  const testBuzzer = useAudio(buzzerSound, { volume: 0.4 });
  
  // Beep audio hook for testing beep sounds
  const testBeepAudio = useBeepAudio({ volume: beepVolume, enabled: true });

  const categories = Object.values(PhraseCategory);
  const buzzerSoundKeys = Object.keys(BUZZER_SOUNDS) as (keyof typeof BUZZER_SOUNDS)[];

  const handleTestBuzzer = async () => {
    try {
      console.log('Testing buzzer sound:', buzzerSound);
      await testBuzzer.play();
      console.log('Buzzer test successful');
    } catch (error) {
      console.warn('Buzzer test failed:', error);
      // You could add a toast notification here for user feedback
    }
  };

  const handleTestBeep = async () => {
    try {
      console.log('Testing beep sound with volume:', beepVolume);
      await testBeepAudio.playBeep();
      console.log('Beep test successful');
    } catch (error) {
      console.warn('Beep test failed:', error);
    }
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
        <p className="game-tagline">The game with the words on your phone!!</p>
      </header>

      <div className="menu-content">
        <section className="category-section">
          <h2>Choose Category</h2>
          <div className="category-grid">
            {categories.map(category => (
              <button
                key={category}
                className={`category-button ${selectedCategory === category ? 'selected' : ''}`}
                onClick={() => setCategory(category)}
                aria-label={`Select ${category} category`}
              >
                {category}
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

            <div className="setting-item beep-ramp-section">
              <label>
                <input
                  type="checkbox"
                  checked={enableBeepRamp}
                  onChange={(e) => setEnableBeepRamp(e.target.checked)}
                  className="setting-checkbox"
                />
                Enable "Hot Potato" Beep Ramp (default: enabled)
              </label>
              <p className="setting-description">
                Accelerating beeps in final seconds build excitement like Catch Phrase
              </p>
              
              {enableBeepRamp && (
                <>
                  <div className="setting-item">
                    <label htmlFor="beep-ramp-start">
                      Start Beeping: {beepRampStart}s before end
                    </label>
                    <input
                      id="beep-ramp-start"
                      type="range"
                      min="10"
                      max="40"
                      step="5"
                      value={beepRampStart}
                      onChange={(e) => setBeepRampStart(Number(e.target.value))}
                      className="slider"
                      aria-label="Beep ramp start time"
                    />
                  </div>

                  <div className="setting-item">
                    <label htmlFor="beep-volume">
                      Beep Volume: {Math.round(beepVolume * 100)}%
                    </label>
                    <div className="buzzer-controls">
                      <input
                        id="beep-volume"
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={beepVolume}
                        onChange={(e) => setBeepVolume(Number(e.target.value))}
                        className="slider"
                        aria-label="Beep volume"
                      />
                      <button
                        type="button"
                        onClick={handleTestBeep}
                        className="test-buzzer-button"
                        aria-label="Test beep sound"
                      >
                        🔊 Test Beep
                      </button>
                    </div>
                  </div>

                  <div className="setting-item">
                    <label htmlFor="beep-intervals">
                      Beep Speed: {beepFirstInterval}ms → {beepFinalInterval}ms
                    </label>
                    <p className="setting-description">
                      First interval (slow) to final interval (rapid fire)
                    </p>
                    <div className="dual-slider-container">
                      <input
                        id="beep-first-interval"
                        type="range"
                        min="400"
                        max="1500"
                        step="100"
                        value={beepFirstInterval}
                        onChange={(e) => setBeepFirstInterval(Number(e.target.value))}
                        className="slider range-min"
                        aria-label="Initial beep interval"
                      />
                      <input
                        id="beep-final-interval"
                        type="range"
                        min="80"
                        max="400"
                        step="20"
                        value={beepFinalInterval}
                        onChange={(e) => setBeepFinalInterval(Number(e.target.value))}
                        className="slider range-max"
                        aria-label="Final beep interval"
                      />
                    </div>
                  </div>
                </>
              )}
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
            className="start-button"
            onClick={startGame}
            aria-label="Start game"
          >
            Start Game
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
    </main>
  );
}; 