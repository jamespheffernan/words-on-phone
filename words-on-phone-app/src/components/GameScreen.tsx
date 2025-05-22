import React from 'react';
import { useGameStore } from '../store';
import './GameScreen.css';

export const GameScreen: React.FC = () => {
  const {
    currentPhrase,
    nextPhrase,
    skipPhrase,
    skipsRemaining,
    skipLimit,
    correctCount,
    pauseGame
  } = useGameStore();

  const handleCorrect = () => {
    nextPhrase();
  };

  const handleSkip = () => {
    skipPhrase();
  };

  const canSkip = skipLimit === 0 || skipsRemaining > 0;

  return (
    <div className="game-screen">
      <div className="game-header">
        <button className="pause-button" onClick={pauseGame} aria-label="Pause game">
          ⏸
        </button>
        <div className="score">Correct: {correctCount}</div>
      </div>

      <div className="phrase-container">
        <h1 className="current-phrase">{currentPhrase}</h1>
      </div>

      <div className="game-controls">
        <button
          className="pass-button"
          onClick={handleSkip}
          disabled={!canSkip}
          aria-label="Skip phrase"
        >
          Pass
        </button>
        
        {skipLimit > 0 && (
          <div className="skip-counter">
            Skips left: {skipsRemaining}
          </div>
        )}
        
        <button
          className="correct-button"
          onClick={handleCorrect}
          aria-label="Mark phrase as correct"
        >
          Got it!
        </button>
      </div>

      <div className="game-footer">
        <p className="hint">
          Show this phrase to your team without saying any words in it!
        </p>
      </div>
    </div>
  );
}; 