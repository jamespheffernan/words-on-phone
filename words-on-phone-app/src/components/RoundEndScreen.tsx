import React, { useState } from 'react';
import './RoundEndScreen.css';
import { useGameStore, GameMode, GameStatus } from '../store';
import { useHaptics } from '../hooks/useHaptics';
import { PlayerNameModal } from './PlayerNameModal';

interface RoundEndScreenProps {
  onTeamWon: (teamIndex: number) => void;
  onContinue: () => void;
}

export const RoundEndScreen: React.FC<RoundEndScreenProps> = ({ onTeamWon, onContinue }) => {
  const { 
    gameMode, 
    teams, 
    currentRoundAnswers, 
    roundNumber, 
    currentTeamIndex, 
    setCurrentTeamIndex,
    currentSoloPlayer,
    soloGameResults,
    completeSoloRound,
    startNextSoloRound,
    skipsUsed
  } = useGameStore();
  const { triggerHaptic } = useHaptics();
  
  // Assume the team that was holding the device (currentTeamIndex) lost the round
  // So the winner is the other team(s). For 2-team games, it's the other team.
  // For multi-team games, we'll default to the next team in rotation as winner
  const assumedLosingTeamIndex = currentTeamIndex;
  const assumedWinnerIndex = teams.length === 2 
    ? (currentTeamIndex + 1) % teams.length  // In 2-team game, the other team wins
    : (currentTeamIndex + 1) % teams.length; // In multi-team, next team wins by default
  
  const [selectedWinnerIndex, setSelectedWinnerIndex] = useState<number | null>(assumedWinnerIndex);
  const [nextRoundStarterIndex, setNextRoundStarterIndex] = useState<number>(
    // The losing team (who was holding device) starts next round
    assumedLosingTeamIndex
  );
  const [showPlayerNameModal, setShowPlayerNameModal] = useState(false);
  
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
    setSelectedWinnerIndex(teamIndex);
    triggerHaptic('gameplay', 'team-selection');
  };

  const handleContinueToNextRound = () => {
    if (selectedWinnerIndex !== null) {
      // Set the starting team for next round
      setCurrentTeamIndex(nextRoundStarterIndex);
      // Complete the round with the winning team
      onTeamWon(selectedWinnerIndex);
      triggerHaptic('gameplay', 'round-continue');
      onContinue();
    }
  };

  const handleSoloContinue = () => {
    triggerHaptic('gameplay', 'round-continue');
    
    // Complete the round first, then show modal
    completeSoloRound(currentSoloPlayer);
    
    // Use a small delay to ensure state updates, then show modal
    setTimeout(() => {
      setShowPlayerNameModal(true);
    }, 50);
  };

  const handleNextPlayerName = (name: string) => {
    startNextSoloRound(name);
    setShowPlayerNameModal(false);
  };

  const handleSoloEndGame = () => {
    triggerHaptic('ui', 'button-tap');
    useGameStore.setState({ status: GameStatus.ENDED });
  };

  // Solo mode render
  if (gameMode === GameMode.SOLO) {
    // Get the most recent round result for this player from soloGameResults
    // If completeSoloRound hasn't run yet, use currentRoundAnswers
    // If it has run, use the last entry in soloGameResults for this player
    const playerLastRound = soloGameResults
      .filter(result => result.playerName === currentSoloPlayer)
      .sort((a, b) => b.roundNumber - a.roundNumber)[0];
    
    // Use the saved round data if available, otherwise current round answers
    const roundAnswers = playerLastRound?.answers || currentRoundAnswers;
    const roundScore = playerLastRound?.score || currentRoundAnswers.length;
    
    // Calculate current round stats from the appropriate data source
    const slowestAnswer = roundAnswers.length > 0 
      ? roundAnswers.reduce((slowest, answer) => 
          answer.timeMs > slowest.timeMs ? answer : slowest
        )
      : null;
    
    const roundFastestAnswer = roundAnswers.length > 0 
      ? roundAnswers.reduce((fastest, answer) => 
          answer.timeMs < fastest.timeMs ? answer : fastest
        )
      : null;
    
    const roundAverageTime = roundAnswers.length > 0
      ? Math.round(roundAnswers.reduce((sum, answer) => sum + answer.timeMs, 0) / roundAnswers.length)
      : 0;

    return (
      <div className="round-end-screen solo-mode">
        <div className="round-end-content">
          <h2 className="round-title">Round {roundNumber} Complete! 🎯</h2>
          
          <div className="solo-score">
            <div className="current-player">
              <span className="player-label">Player:</span>
              <span className="player-name">{currentSoloPlayer}</span>
            </div>
            <div className="current-round-score">
              <span className="score-label">This Round:</span>
              <span className="score-value">{roundScore} correct</span>
            </div>
          </div>
          
          <div className="round-stats">
            {roundFastestAnswer && (
              <div className="stat-item highlight">
                <span className="stat-label">⚡ Fastest Answer:</span>
                <span className="stat-value">
                  "{roundFastestAnswer.phrase}" ({(roundFastestAnswer.timeMs / 1000).toFixed(1)}s)
                </span>
              </div>
            )}
            
            {slowestAnswer && (
              <div className="stat-item">
                <span className="stat-label">🐌 Slowest Answer:</span>
                <span className="stat-value">
                  "{slowestAnswer.phrase}" ({(slowestAnswer.timeMs / 1000).toFixed(1)}s)
                </span>
              </div>
            )}
            
            {roundScore > 1 && (
              <div className="stat-item">
                <span className="stat-label">📊 Average Time:</span>
                <span className="stat-value">{(roundAverageTime / 1000).toFixed(1)}s</span>
              </div>
            )}
          </div>

          <div className="leaderboard">
            <h3>Game Leaderboard</h3>
            <div className="leaderboard-table">
              <div className="leaderboard-header">
                <span className="rank-col">#</span>
                <span className="name-col">Player</span>
                <span className="score-col">Correct</span>
                <span className="skips-col">Skips</span>
              </div>
              {(() => {
                // Create leaderboard with current player included
                const allResults = [...soloGameResults];
                
                // Add current player's round if not already completed
                const hasCurrentPlayer = soloGameResults.some(r => r.playerName === currentSoloPlayer);
                if (!hasCurrentPlayer) {
                  allResults.push({
                    playerName: currentSoloPlayer,
                    score: roundScore,
                    skipsUsed: playerLastRound?.skipsUsed || skipsUsed,
                    answers: roundAnswers,
                    roundNumber: soloGameResults.length + 1
                  });
                }
                
                // Sort by score (desc), then by skips (asc - fewer skips is better)
                const sortedResults = allResults.sort((a, b) => {
                  if (a.score !== b.score) return b.score - a.score;
                  return a.skipsUsed - b.skipsUsed;
                });
                
                return sortedResults.map((result, index) => (
                  <div 
                    key={`${result.playerName}-${result.roundNumber}`}
                    className={`leaderboard-row ${result.playerName === currentSoloPlayer && !hasCurrentPlayer ? 'current' : ''}`}
                  >
                    <span className="rank-col">#{index + 1}</span>
                    <span className="name-col">{result.playerName}</span>
                    <span className="score-col">{result.score}</span>
                    <span className="skips-col">{result.skipsUsed}</span>
                  </div>
                ));
              })()}
            </div>
          </div>

          <div className="solo-actions">
            <button
              className="continue-button primary"
              onClick={handleSoloContinue}
            >
              👤 Next Player
            </button>
            <button
              className="end-game-button secondary"
              onClick={handleSoloEndGame}
            >
              🏁 End Game
            </button>
          </div>
        </div>
        
        <PlayerNameModal
          isOpen={showPlayerNameModal}
          onClose={() => setShowPlayerNameModal(false)}
          onConfirm={handleNextPlayerName}
          title="Next Player"
          message="Who's playing next?"
        />
      </div>
    );
  }

  // Team mode render (existing)
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
          <h3>Round Result</h3>
          <p className="selection-hint">
            <strong>{teams[assumedLosingTeamIndex].name}</strong> was holding the device when time ran out, so <strong>{teams[assumedWinnerIndex].name}</strong> gets the point!
          </p>
          
          <div className="round-result-display">
            <div className="losing-team">
              <span className="result-label">Lost the round:</span>
              <div className="team-info">
                <span className="team-name">{teams[assumedLosingTeamIndex].name}</span>
                <span className="score-after">Score: {teams[assumedLosingTeamIndex].score}</span>
              </div>
            </div>
            
            <div className="winning-team">
              <span className="result-label">Won the round:</span>
              <div className="team-info winner">
                <span className="team-name">{teams[assumedWinnerIndex].name}</span>
                <span className="score-after">Score: {teams[assumedWinnerIndex].score} + 1 = {teams[assumedWinnerIndex].score + 1}</span>
              </div>
            </div>
          </div>
          
          <p className="correction-hint">
            Wrong? Tap a team below to correct the winner:
          </p>
          
          <div className="team-buttons correction-buttons">
            {teams.map((team, index) => (
              <button
                key={index}
                className={`team-win-button ${selectedWinnerIndex === index ? 'selected' : ''} ${index === assumedWinnerIndex ? 'assumed-winner' : ''}`}
                onClick={() => handleTeamWon(index)}
              >
                <span className="team-name">{team.name}</span>
                <span className="current-score">Current: {team.score}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="next-round-setup">
          <h3>Next Round Setup</h3>
          <p className="selection-hint">
            <strong>{teams[nextRoundStarterIndex].name}</strong> will start the next round with the device.
          </p>
          
          <p className="correction-hint">
            Different team should start? Tap below to change:
          </p>
          
          <div className="team-buttons">
            {teams.map((team, index) => (
              <button
                key={index}
                className={`team-starter-button ${nextRoundStarterIndex === index ? 'selected' : ''} ${index === assumedLosingTeamIndex ? 'default-starter' : ''}`}
                onClick={() => {
                  setNextRoundStarterIndex(index);
                  triggerHaptic('ui', 'button-tap');
                }}
              >
                <span className="team-name">{team.name}</span>
                {index === assumedLosingTeamIndex && <span className="default-label">(Default)</span>}
              </button>
            ))}
          </div>

          <button 
            className="continue-button"
            onClick={handleContinueToNextRound}
          >
            Continue to Next Round
          </button>
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