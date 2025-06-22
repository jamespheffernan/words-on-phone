import React from 'react';
import './RoundEndScreen.css';
import { useGameStore } from '../store';

interface RoundEndScreenProps {
  onTeamWon: (teamIndex: number) => void;
  onContinue: () => void;
}

export const RoundEndScreen: React.FC<RoundEndScreenProps> = ({ onTeamWon, onContinue }) => {
  const { teams, currentRoundAnswers, roundNumber } = useGameStore();
  
  // Calculate round statistics
  const totalCorrect = currentRoundAnswers.length;
  const fastestAnswer = currentRoundAnswers.length > 0 
    ? currentRoundAnswers.reduce((fastest, answer) => 
        answer.timeMs < fastest.timeMs ? answer : fastest
      )
    : null;
  
  const averageTime = currentRoundAnswers.length > 0
    ? Math.round(currentRoundAnswers.reduce((sum, answer) => sum + answer.timeMs, 0) / currentRoundAnswers.length)
    : 0;

  const handleTeamWon = (teamIndex: number) => {
    onTeamWon(teamIndex);
    onContinue();
  };

  return (
    <div className="round-end-screen">
      <div className="round-end-content">
        <h2 className="round-title">Round {roundNumber} Complete!</h2>
        
        <div className="round-stats">
          <div className="stat-item">
            <span className="stat-label">Total Correct:</span>
            <span className="stat-value">{totalCorrect}</span>
          </div>
          
          {fastestAnswer && (
            <div className="stat-item">
              <span className="stat-label">Fastest Answer:</span>
              <span className="stat-value">
                "{fastestAnswer.phrase}" ({(fastestAnswer.timeMs / 1000).toFixed(1)}s)
              </span>
            </div>
          )}
          
          {totalCorrect > 1 && (
            <div className="stat-item">
              <span className="stat-label">Average Time:</span>
              <span className="stat-value">{(averageTime / 1000).toFixed(1)}s</span>
            </div>
          )}
        </div>

        <div className="team-selection">
          <h3>Which team won this round?</h3>
          <p className="selection-hint">
            The team NOT holding the device when the buzzer sounded gets the point!
          </p>
          
          <div className="team-buttons">
            {teams.map((team, index) => (
              <button
                key={index}
                className="team-win-button"
                onClick={() => handleTeamWon(index)}
              >
                <span className="team-name">{team.name}</span>
                <span className="current-score">Current: {team.score}</span>
              </button>
            ))}
          </div>
        </div>
        
        <div className="game-progress">
          <p>First team to 7 points wins!</p>
          <div className="team-scores">
            {teams.map((team, index) => (
              <div key={index} className="team-score-display">
                <span className="team-name">{team.name}:</span>
                <span className="score">{team.score}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}; 