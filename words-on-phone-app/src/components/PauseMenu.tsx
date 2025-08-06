import React from 'react';
import { useGameStore } from '../store';
import { useAudio } from '../hooks/useAudio';
import './PauseMenu.css';

export const PauseMenu: React.FC = () => {
  const { 
    resumeGame, 
    endGame, 
    beepVolume, 
    buzzerVolume, 
    setBeepVolume, 
    setBuzzerVolume,
    buzzerSound
  } = useGameStore();

  // Test buzzer for volume adjustment
  const testBuzzer = useAudio('buzzer', buzzerSound, { volume: buzzerVolume, preload: true });

  const handleTestBuzzer = () => {
    testBuzzer.play().catch(console.warn);
  };

  return (
    <div className="pause-menu-overlay">
      <div className="pause-menu">
        <h2>Game Paused</h2>
        
        <div className="volume-controls">
          <div className="volume-control">
            <label htmlFor="beep-volume">
              Beep Volume
              <span className="volume-value">{Math.round(beepVolume * 100)}%</span>
            </label>
            <input
              id="beep-volume"
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={beepVolume}
              onChange={(e) => setBeepVolume(Number(e.target.value))}
              className="volume-slider"
            />
          </div>

          <div className="volume-control">
            <label htmlFor="buzzer-volume">
              Buzzer Volume
              <span className="volume-value">{Math.round(buzzerVolume * 100)}%</span>
            </label>
            <input
              id="buzzer-volume"
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={buzzerVolume}
              onChange={(e) => setBuzzerVolume(Number(e.target.value))}
              className="volume-slider"
            />
            <button 
              onClick={handleTestBuzzer}
              className="test-buzzer-button"
              type="button"
            >
              Test Buzzer
            </button>
          </div>
        </div>

        <div className="pause-menu-actions">
          <button 
            onClick={resumeGame}
            className="resume-button primary"
          >
            Resume Game
          </button>
          <button 
            onClick={endGame}
            className="end-game-button secondary"
          >
            End Game
          </button>
        </div>
      </div>
    </div>
  );
};