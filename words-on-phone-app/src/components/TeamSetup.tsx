import React, { useState, useEffect } from 'react';
import './TeamSetup.css';
import { useGameStore } from '../store';
import { getRandomTeamNames } from '../data/teamNames';

interface TeamSetupProps {
  onStartGame: () => void;
}

export const TeamSetup: React.FC<TeamSetupProps> = ({ onStartGame }) => {
  const { setTeams, resetTeams, resetCurrentRoundAnswers } = useGameStore();
  
  // Initialize with random team names
  const [teamNames, setTeamNames] = useState<[string, string]>(() => getRandomTeamNames());
  
  useEffect(() => {
    // Reset teams and round state when component mounts
    resetTeams();
    resetCurrentRoundAnswers();
  }, [resetTeams, resetCurrentRoundAnswers]);

  const handleTeamNameChange = (index: 0 | 1, name: string) => {
    const newNames: [string, string] = [...teamNames] as [string, string];
    newNames[index] = name;
    setTeamNames(newNames);
  };

  const shuffleTeamNames = () => {
    setTeamNames(getRandomTeamNames());
  };

  const handleStartGame = () => {
    // Set up teams in store
    const teams = [
      { name: teamNames[0] || 'Team 1', score: 0 },
      { name: teamNames[1] || 'Team 2', score: 0 }
    ];
    
    setTeams(teams);
    onStartGame();
  };

  const isValid = teamNames[0].trim().length > 0 && teamNames[1].trim().length > 0;

  return (
    <div className="team-setup">
      <div className="team-setup__content">
        <div className="team-setup__header">
          <h2>Set Up Teams</h2>
          <p>Enter team names or use our fun suggestions!</p>
        </div>

      <div className="team-setup__teams">
        <div className="team-setup__team">
          <label htmlFor="team1-input">Team 1</label>
          <input
            id="team1-input"
            type="text"
            value={teamNames[0]}
            onChange={(e) => handleTeamNameChange(0, e.target.value)}
            placeholder="Enter team name"
            maxLength={20}
          />
        </div>

        <div className="team-setup__vs">VS</div>

        <div className="team-setup__team">
          <label htmlFor="team2-input">Team 2</label>
          <input
            id="team2-input"
            type="text"
            value={teamNames[1]}
            onChange={(e) => handleTeamNameChange(1, e.target.value)}
            placeholder="Enter team name"
            maxLength={20}
          />
        </div>
      </div>

      <div className="team-setup__actions">
        <button 
          type="button"
          onClick={shuffleTeamNames}
          className="team-setup__shuffle-btn"
        >
          🎲 Shuffle Names
        </button>
        
        <button
          type="button"
          onClick={handleStartGame}
          disabled={!isValid}
          className="team-setup__start-btn"
        >
          Start Game
        </button>
      </div>

      <div className="team-setup__rules">
        <h3>How to Play</h3>
        <ul>
          <li>Teams sit alternating around the device</li>
          <li>Pass the device clockwise when you get a phrase correct</li>
          <li>The team <strong>NOT</strong> holding the device when the buzzer sounds scores 1 point</li>
          <li>First team to 7 points wins!</li>
        </ul>
      </div>
      </div>
    </div>
  );
}; 