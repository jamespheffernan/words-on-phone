import React from 'react';
import './GameModeStep.css';

export type GameMode = 'team' | 'solo';

interface GameModeStepProps {
  selectedMode: GameMode | null;
  onModeSelect: (mode: GameMode) => void;
  onNext: () => void;
}

export const GameModeStep: React.FC<GameModeStepProps> = ({
  selectedMode,
  onModeSelect,
  onNext
}) => {
  return (
    <div className="game-mode-step">
      <div className="step-header">
        <h2 className="step-title">Choose Game Mode</h2>
        <p className="step-description">Select how you'd like to play</p>
      </div>

      <div className="mode-options">
        <button
          className={`mode-option ${selectedMode === 'team' ? 'selected' : ''}`}
          onClick={() => onModeSelect('team')}
          aria-label="Team game mode"
        >
          <div className="mode-icon">👥</div>
          <div className="mode-content">
            <h3 className="mode-title">Team Game</h3>
            <p className="mode-description">
              Play with friends in teams. Take turns acting out phrases while your teammates guess.
            </p>
            <div className="mode-features">
              <span className="feature">• 2 teams</span>
              <span className="feature">• Turn-based rounds</span>
              <span className="feature">• Team scoring</span>
            </div>
          </div>
        </button>

        <button
          className={`mode-option ${selectedMode === 'solo' ? 'selected' : ''}`}
          onClick={() => onModeSelect('solo')}
          aria-label="Solo game mode"
        >
          <div className="mode-icon">👤</div>
          <div className="mode-content">
            <h3 className="mode-title">Solo Game</h3>
            <p className="mode-description">
              Play by yourself or with friends taking turns. Perfect for practice or casual fun.
            </p>
            <div className="mode-features">
              <span className="feature">• Individual scoring</span>
              <span className="feature">• Personal best tracking</span>
              <span className="feature">• Flexible gameplay</span>
            </div>
          </div>
        </button>
      </div>

      <div className="step-actions">
        <button
          className="next-button"
          onClick={onNext}
          disabled={!selectedMode}
          aria-label="Continue to category selection"
        >
          Continue
        </button>
      </div>
    </div>
  );
};