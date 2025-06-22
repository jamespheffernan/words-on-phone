import React from 'react';
import { useGameStore, GameStatus } from '../store';
import { useHaptics } from '../hooks/useHaptics';
import './EndScreen.css';

export const EndScreen: React.FC = () => {
  const { teams, roundStats, startGame, resetTeams, resetCurrentRoundAnswers } = useGameStore();
  const { triggerHaptic } = useHaptics();

  // Determine if game ended due to victory or timeout
  const winningTeam = teams.find(team => team.score >= 7);
  const isVictory = !!winningTeam;
  
  // Calculate game statistics
  const totalRounds = roundStats.length;
  const totalAnswers = roundStats.reduce((sum, round) => sum + round.totalCorrect, 0);
  const fastestAnswer = roundStats
    .flatMap(round => round.fastestAnswer ? [round.fastestAnswer] : [])
    .reduce((fastest, answer) => 
      !fastest || answer.timeMs < fastest.timeMs ? answer : fastest, 
      null as { phrase: string; timeMs: number } | null
    );

  const handlePlayAgain = () => {
    // Reset teams to start fresh
    resetTeams();
    resetCurrentRoundAnswers();
    triggerHaptic('ui', 'button-tap');
    startGame();
  };

  const handleBackToMenu = () => {
    // Reset teams when going back to menu
    resetTeams();
    resetCurrentRoundAnswers();
    triggerHaptic('ui', 'menu-open');
    useGameStore.setState({ status: GameStatus.MENU });
  };

  return (
    <div className="end-screen">
      <div className="end-content">
        <div className="end-icon">
          {isVictory ? '🏆' : '🚨'}
        </div>
        
        <h1 className="end-title">
          {isVictory ? `${winningTeam?.name} Wins!` : "Time's Up!"}
        </h1>
        
        <div className="results">
          {teams.length > 0 ? (
            <>
              <div className="team-scores">
                <h2>Final Scores</h2>
                {teams
                  .sort((a, b) => b.score - a.score) // Sort by score descending
                  .map((team, index) => (
                    <div 
                      key={index} 
                      className={`team-result ${team === winningTeam ? 'winner' : ''}`}
                    >
                      <span className="team-name">
                        {team === winningTeam && '🏆 '}
                        {team.name}
                      </span>
                      <span className="team-score">{team.score} points</span>
                    </div>
                  ))}
              </div>
              
              {totalRounds > 0 && (
                <div className="game-stats">
                  <h3>Game Statistics</h3>
                  <div className="stat-grid">
                    <div className="stat">
                      <span className="stat-label">Rounds Played:</span>
                      <span className="stat-value">{totalRounds}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Total Correct:</span>
                      <span className="stat-value">{totalAnswers}</span>
                    </div>
                    {fastestAnswer && (
                      <div className="stat fastest-answer">
                        <span className="stat-label">Fastest Answer:</span>
                        <span className="stat-value">
                          "{fastestAnswer.phrase}" ({(fastestAnswer.timeMs / 1000).toFixed(1)}s)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="result-item">
              <span className="result-label">Game Over</span>
            </div>
          )}
        </div>

        <div className="end-message">
          <p>
            {isVictory 
              ? `Congratulations ${winningTeam?.name}! First to 7 points! 🎉` 
              : teams.length > 0 
                ? "Great game everyone! 👏"
                : "Time's up! Thanks for playing! 👏"}
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