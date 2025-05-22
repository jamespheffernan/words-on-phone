import React, { useState } from 'react';
import { useGameStore, BUZZER_SOUNDS } from '../store';
import { PhraseCategory } from '../data/phrases';
import { HowToPlayModal } from './HowToPlayModal';
import { useAudio } from '../hooks/useAudio';
import './MenuScreen.css';

export const MenuScreen: React.FC = () => {
  const {
    selectedCategory,
    timerDuration,
    skipLimit,
    buzzerSound,
    setCategory,
    setTimerDuration,
    setSkipLimit,
    setBuzzerSound,
    startGame
  } = useGameStore();

  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Audio hook for testing buzzer sounds
  const testBuzzer = useAudio(buzzerSound, { volume: 0.4 });

  const categories = Object.values(PhraseCategory);
  const buzzerSoundKeys = Object.keys(BUZZER_SOUNDS) as (keyof typeof BUZZER_SOUNDS)[];

  const handleTestBuzzer = () => {
    testBuzzer.play().catch(console.warn);
  };

  return (
    <div className="menu-screen">
      <div className="menu-header">
        <h1 className="game-title">Words on Phone</h1>
        <p className="game-tagline">The ultimate party game!</p>
      </div>

      <div className="menu-content">
        <div className="category-section">
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
        </div>

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
              <label htmlFor="timer-slider">
                Timer: {timerDuration}s
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
    </div>
  );
}; 