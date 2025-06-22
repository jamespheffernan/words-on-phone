import { useEffect } from 'react';
import { useGameStore, GameStatus } from './store';
import { MenuScreen } from './components/MenuScreen';
import { GameScreen } from './components/GameScreen';
import { EndScreen } from './components/EndScreen';
import { TeamSetup } from './components/TeamSetup';
import { RoundEndScreen } from './components/RoundEndScreen';
import { usePhraseWorker } from './hooks/usePhraseWorker';
import { phraseService } from './services/phraseService';
import PWABadge from './PWABadge';
import './App.css';

function App() {
  const { status, incrementTeamScore, completeRound, continueFromRoundEnd, startGame } = useGameStore();
  const { lastFetchResult } = usePhraseWorker();

  // Handle new phrases from worker
  useEffect(() => {
    if (lastFetchResult?.phrases && lastFetchResult.phrases.length > 0) {
      phraseService.handleWorkerPhrases(lastFetchResult.phrases);
    }
  }, [lastFetchResult]);

  const handleTeamWon = (teamIndex: number) => {
    // Increment team score and complete round
    incrementTeamScore(teamIndex);
    completeRound(teamIndex);
  };

  const handleContinueFromRoundEnd = () => {
    continueFromRoundEnd();
  };

  const handleStartGame = () => {
    startGame();
  };

  return (
    <div className="app">
      {status === GameStatus.MENU && <MenuScreen />}
      {status === GameStatus.TEAM_SETUP && (
        <TeamSetup onStartGame={handleStartGame} />
      )}
      {status === GameStatus.PLAYING && <GameScreen />}
      {status === GameStatus.ROUND_END && (
        <RoundEndScreen 
          onTeamWon={handleTeamWon}
          onContinue={handleContinueFromRoundEnd}
        />
      )}
      {status === GameStatus.ENDED && <EndScreen />}
      {status === GameStatus.PAUSED && (
        <div className="paused-overlay">
          <h2>Game Paused</h2>
          <button onClick={() => useGameStore.getState().resumeGame()}>
            Resume
          </button>
          <button onClick={() => useGameStore.getState().endGame()}>
            End Game
          </button>
        </div>
      )}
      <PWABadge />
    </div>
  );
}

export default App;
