import React, { useState } from 'react';
import './ScoreTracker.css';

interface ScoreTrackerProps {
  isVisible: boolean;
  onToggle: () => void;
}

interface TeamScore {
  name: string;
  score: number;
}

export const ScoreTracker: React.FC<ScoreTrackerProps> = ({ isVisible, onToggle }) => {
  const [teams, setTeams] = useState<TeamScore[]>([
    { name: 'Team 1', score: 0 },
    { name: 'Team 2', score: 0 }
  ]);
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [tempName, setTempName] = useState('');

  const updateScore = (index: number, delta: number) => {
    setTeams(teams.map((team, i) => 
      i === index ? { ...team, score: Math.max(0, team.score + delta) } : team
    ));
  };

  const startEditing = (index: number) => {
    setIsEditing(index);
    setTempName(teams[index].name);
  };

  const finishEditing = () => {
    if (isEditing !== null && tempName.trim()) {
      setTeams(teams.map((team, i) => 
        i === isEditing ? { ...team, name: tempName.trim() } : team
      ));
    }
    setIsEditing(null);
    setTempName('');
  };

  const resetScores = () => {
    setTeams(teams.map(team => ({ ...team, score: 0 })));
  };

  const addTeam = () => {
    if (teams.length < 6) {
      setTeams([...teams, { name: `Team ${teams.length + 1}`, score: 0 }]);
    }
  };

  const removeTeam = (index: number) => {
    if (teams.length > 2) {
      setTeams(teams.filter((_, i) => i !== index));
    }
  };

  if (!isVisible) {
    return (
      <button 
        className="score-tracker-toggle"
        onClick={onToggle}
        aria-label="Show score tracker"
      >
        📊
      </button>
    );
  }

  return (
    <div className="score-tracker-overlay">
      <div className="score-tracker">
        <div className="score-tracker-header">
          <h3>Score Tracker</h3>
          <button 
            className="close-button"
            onClick={onToggle}
            aria-label="Hide score tracker"
          >
            ✕
          </button>
        </div>

        <div className="score-disclaimer">
          <p>⚠️ This is an optional score tracker. The app does not enforce score limits.</p>
        </div>

        <div className="teams-list">
          {teams.map((team, index) => (
            <div key={index} className="team-row">
              <div className="team-name">
                {isEditing === index ? (
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    onBlur={finishEditing}
                    onKeyDown={(e) => e.key === 'Enter' && finishEditing()}
                    className="team-name-input"
                    autoFocus
                  />
                ) : (
                  <span 
                    className="team-name-text"
                    onClick={() => startEditing(index)}
                  >
                    {team.name}
                  </span>
                )}
              </div>
              
              <div className="score-controls">
                <button
                  className="score-button minus"
                  onClick={() => updateScore(index, -1)}
                  aria-label={`Decrease ${team.name} score`}
                >
                  −
                </button>
                
                <span className="score-value">{team.score}</span>
                
                <button
                  className="score-button plus"
                  onClick={() => updateScore(index, 1)}
                  aria-label={`Increase ${team.name} score`}
                >
                  +
                </button>
              </div>

              {teams.length > 2 && (
                <button
                  className="remove-team-button"
                  onClick={() => removeTeam(index)}
                  aria-label={`Remove ${team.name}`}
                >
                  🗑️
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="score-tracker-actions">
          {teams.length < 6 && (
            <button className="add-team-button" onClick={addTeam}>
              + Add Team
            </button>
          )}
          
          <button className="reset-button" onClick={resetScores}>
            Reset All Scores
          </button>
        </div>
      </div>
    </div>
  );
}; 