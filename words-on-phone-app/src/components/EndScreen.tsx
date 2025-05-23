import React from 'react';
import { useGameStore, GameStatus } from '../store';
import './EndScreen.css';

export const EndScreen: React.FC = () => {
  const { correctCount, startGame } = useGameStore();

  const handlePlayAgain = () => {
    startGame();
  };

  const handleBackToMenu = () => {
    useGameStore.setState({ status: GameStatus.MENU });
  };

  return (
    <div className="end-screen">
      <div className="end-content">
        <div className="buzzer-icon">
          🚨
        </div>
        
        <h1 className="end-title">Time's Up!</h1>
        
        <div className="results">
          <div className="result-item">
            <span className="result-label">Phrases Guessed:</span>
            <span className="result-value">{correctCount}</span>
          </div>
        </div>

        <div className="end-message">
          <p>
            {correctCount === 0 && "Better luck next time! 🤞"}
            {correctCount >= 1 && correctCount <= 3 && "Not bad for a warm-up! 👏"}
            {correctCount >= 4 && correctCount <= 7 && "Great job! 🎉"}
            {correctCount >= 8 && correctCount <= 12 && "Excellent performance! 🌟"}
            {correctCount >= 13 && "Absolutely amazing! 🏆"}
          </p>
        </div>

        <div className="end-actions">
          <button 
            className="play-again-button"
            onClick={handlePlayAgain}
            aria-label="Play again"
          >
            Play Again
          </button>
          
          <button 
            className="menu-button"
            onClick={handleBackToMenu}
            aria-label="Back to menu"
          >
            Back to Menu
          </button>
        </div>
      </div>
    </div>
  );
}; 