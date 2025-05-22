import React, { useState } from 'react';
import { useGameStore, GameStatus } from './store';
import { MenuScreen } from './components/MenuScreen';
import { GameScreen } from './components/GameScreen';
import { EndScreen } from './components/EndScreen';
import { ScoreTracker } from './components/ScoreTracker';
import PWABadge from './PWABadge';
import './App.css';

function App() {
  const { status } = useGameStore();
  const [showScoreTracker, setShowScoreTracker] = useState(false);

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
