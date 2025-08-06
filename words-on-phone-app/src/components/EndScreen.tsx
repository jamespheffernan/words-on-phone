import React from 'react';
import { useGameStore, GameStatus, GameMode } from '../store';
import { useHaptics } from '../hooks/useHaptics';
import './EndScreen.css';

export const EndScreen: React.FC = () => {
  const { 
    gameMode, 
    teams, 
    roundStats, 
    startGame, 
    startSoloGame, 
    resetTeams, 
    resetCurrentRoundAnswers,
    soloGameResults 
  } = useGameStore();
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
    if (gameMode === GameMode.SOLO) {
      startSoloGame();
    } else {
      startGame();
    }
  };

  const handleBackToMenu = () => {
    // Reset teams when going back to menu
    resetTeams();
    resetCurrentRoundAnswers();
    triggerHaptic('ui', 'menu-open');
    useGameStore.setState({ status: GameStatus.MENU });
  };

  // Solo mode render
  if (gameMode === GameMode.SOLO) {
    // Calculate solo game stats
    const totalRounds = soloGameResults.length;
    const totalCorrect = soloGameResults.reduce((sum, result) => sum + result.score, 0);
    const fastestAnswer = soloGameResults
      .flatMap((result) => result.answers)
      .reduce((fastest, answer) => 
        !fastest || answer.timeMs < fastest.timeMs ? answer : fastest, 
        null as { phrase: string; timeMs: number } | null
      );
    const slowestAnswer = soloGameResults
      .flatMap((result) => result.answers)
      .reduce((slowest, answer) => 
        !slowest || answer.timeMs > slowest.timeMs ? answer : slowest, 
        null as { phrase: string; timeMs: number } | null
      );
    const averageCorrectPerRound = totalRounds > 0 ? (totalCorrect / totalRounds).toFixed(1) : '0';

    return (
      <div className="end-screen solo-mode">
        <div className="end-content">
          <div className="end-icon">
            🎯
          </div>
          
          <h1 className="end-title">
            Game Complete!
          </h1>
          
          <div className="solo-final-score">
            <div className="total-score-display">
              <span className="score-label">Final Score:</span>
              <span className="score-value">{totalCorrect} correct answers</span>
            </div>
            <div className="rounds-played">
              <span className="stat-label">Rounds Played: {totalRounds}</span>
            </div>
            <div className="average-score">
              <span className="stat-label">Average per Round: {averageCorrectPerRound}</span>
            </div>
          </div>

          <div className="solo-game-stats">
            <h3>Your Best Performance</h3>
            <div className="stat-grid">
              {fastestAnswer && (
                <div className="stat highlight">
                  <span className="stat-label">⚡ Fastest Answer:</span>
                  <span className="stat-value">
                    "{fastestAnswer.phrase}" ({(fastestAnswer.timeMs / 1000).toFixed(1)}s)
                  </span>
                </div>
              )}
              {slowestAnswer && (
                <div className="stat">
                  <span className="stat-label">🐌 Slowest Answer:</span>
                  <span className="stat-value">
                    "{slowestAnswer.phrase}" ({(slowestAnswer.timeMs / 1000).toFixed(1)}s)
                  </span>
                </div>
              )}
            </div>
          </div>

          {soloGameResults.length > 1 && (
            <div className="round-performance">
              <h3>Final Leaderboard</h3>
              <div className="rounds-grid">
                {soloGameResults
                  .sort((a, b) => b.score - a.score)
                  .map((result, index) => (
                    <div key={index} className="round-result">
                      <span className="round-label">{result.playerName}:</span>
                      <span className="round-score">{result.score} correct</span>
                      {index === 0 && <span className="winner-badge">🏆</span>}
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="end-message">
            <p>
              {totalCorrect === 0 
                ? "Don't give up - practice makes perfect! 💪" 
                : totalCorrect < 10
                ? "Good effort! Keep playing to improve! 👍"
                : totalCorrect < 25
                ? "Great job! You're getting the hang of it! 🎉"
                : "Amazing performance! You're a word wizard! 🧙‍♂️"}
            </p>
          </div>

          <div className="end-actions">
            <button 
              className="play-again-button"
              onClick={handlePlayAgain}
              aria-label="Play solo game again"
            >
              🎯 Play Again
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
  }

  // Team mode render (existing)
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