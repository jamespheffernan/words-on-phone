import React, { useEffect } from 'react';
import { useGameStore } from '../store';
import { useTimer } from '../hooks/useTimer';
import { useAudio } from '../hooks/useAudio';
import './GameScreen.css';

export const GameScreen: React.FC = () => {
  const {
    currentPhrase,
    nextPhrase,
    skipPhrase,
    skipsRemaining,
    skipLimit,
    correctCount,
    pauseGame,
    timerDuration,
    timeRemaining,
    isTimerRunning,
    setTimeRemaining,
    onTimerComplete,
    buzzerSound
  } = useGameStore();

  // Audio hook for buzzer sound
  const buzzer = useAudio(buzzerSound, { volume: 0.6, preload: true });

  // Timer with buzzer callback
  const timer = useTimer({
    duration: timerDuration,
    onComplete: () => {
      buzzer.play().catch(console.warn);
      onTimerComplete();
    },
    onTick: setTimeRemaining
  });

  // Sync timer with game state
  useEffect(() => {
    if (isTimerRunning && !timer.isRunning && !timer.isPaused) {
      timer.start();
    } else if (!isTimerRunning && timer.isRunning) {
      timer.pause();
    } else if (isTimerRunning && timer.isPaused) {
      timer.resume();
    }
  }, [isTimerRunning, timer.isRunning, timer.isPaused, timer]);

  // Reset timer when duration changes or when game is not running
  useEffect(() => {
    if (!isTimerRunning) {
      timer.reset();
    }
  }, [timerDuration, isTimerRunning, timer]);

  // Preload buzzer sound when it changes
  useEffect(() => {
    buzzer.preloadSound();
  }, [buzzerSound, buzzer]);

  const handleCorrect = () => {
    nextPhrase();
  };

  const handleSkip = () => {
    skipPhrase();
  };

  const canSkip = skipLimit === 0 || skipsRemaining > 0;

  // Use timer hook's time when running, store's time when not running
  const displayTime = timer.isRunning || timer.isPaused ? timer.timeRemaining : timeRemaining;
  const timerProgress = (displayTime / timerDuration) * 100;
  const isTimerLow = displayTime <= 10;

  return (
    <div className="game-screen">
      <div className="game-header">
        <button className="pause-button" onClick={pauseGame} aria-label="Pause game">
          ⏸
        </button>
        <div className="timer-display">
          <div 
            className={`timer-circle ${isTimerLow ? 'timer-low' : ''}`}
            style={{ '--progress': `${timerProgress}%` } as React.CSSProperties}
          >
            <span className="timer-text">{displayTime}s</span>
          </div>
        </div>
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