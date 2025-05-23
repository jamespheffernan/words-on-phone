import { useState, useEffect } from 'react';
import { useGameStore, GameStatus } from './store';
import { MenuScreen } from './components/MenuScreen';
import { GameScreen } from './components/GameScreen';
import { EndScreen } from './components/EndScreen';
import { ScoreTracker } from './components/ScoreTracker';
import { usePhraseWorker } from './hooks/usePhraseWorker';
import { phraseService } from './services/phraseService';
import PWABadge from './PWABadge';
import './App.css';

function App() {
  const { status } = useGameStore();
  const [showScoreTracker, setShowScoreTracker] = useState(false);
  const { lastFetchResult } = usePhraseWorker();

  // Handle new phrases from worker
  useEffect(() => {
    if (lastFetchResult?.phrases && lastFetchResult.phrases.length > 0) {
      phraseService.handleWorkerPhrases(lastFetchResult.phrases);
    }
  }, [lastFetchResult]);

  return (
    <div className="app">
      {status === GameStatus.MENU && <MenuScreen />}
      {status === GameStatus.PLAYING && <GameScreen />}
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
      <ScoreTracker 
        isVisible={showScoreTracker}
        onToggle={() => setShowScoreTracker(!showScoreTracker)}
      />
      <PWABadge />
    </div>
  );
}

export default App;
