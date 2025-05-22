import React, { useState } from 'react';
import { useGameStore } from '../store';
import { PhraseCategory } from '../data/phrases';
import { HowToPlayModal } from './HowToPlayModal';
import './MenuScreen.css';

export const MenuScreen: React.FC = () => {
  const {
    selectedCategory,
    timerDuration,
    skipLimit,
    setCategory,
    setTimerDuration,
    setSkipLimit,
    startGame
  } = useGameStore();

  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const categories = Object.values(PhraseCategory);

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