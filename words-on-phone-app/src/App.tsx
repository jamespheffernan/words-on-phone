import { useEffect } from 'react';
import { useGameStore, GameStatus } from './store';
import { MenuScreenSteps } from './components/MenuScreenSteps';
import { GameScreen } from './components/GameScreen';
import { EndScreen } from './components/EndScreen';
import { TeamSetup } from './components/TeamSetup';
import { RoundEndScreen } from './components/RoundEndScreen';
import { PauseMenu } from './components/PauseMenu';
import { usePhraseWorker } from './hooks/usePhraseWorker';
import { phraseService } from './services/phraseService';
import { analytics } from './services/analytics';
import PWABadge from './PWABadge';
import './App.css';

function App() {
  const { status, completeRound, continueFromRoundEnd, startGame } = useGameStore();
  const { lastFetchResult } = usePhraseWorker();

  // Handle new phrases from worker
  useEffect(() => {
    if (lastFetchResult?.phrases && lastFetchResult.phrases.length > 0) {
      phraseService.handleWorkerPhrases(lastFetchResult.phrases);
    }
  }, [lastFetchResult]);

  // Track screen changes
  useEffect(() => {
    const getScreenName = (gameStatus: GameStatus) => {
      switch (gameStatus) {
        case GameStatus.MENU:
          return 'Home' as const;
        case GameStatus.TEAM_SETUP:
          return 'TeamSetup' as const;
        case GameStatus.PLAYING:
        case GameStatus.BUZZER_PLAYING:
          return 'GameScreen' as const;
        case GameStatus.ROUND_END:
          return 'RoundEnd' as const;
        case GameStatus.ENDED:
          return 'EndScreen' as const;
        case GameStatus.PAUSED:
          return 'PausedScreen' as const;
        default:
          return 'Home' as const;
      }
    };

    const screenName = getScreenName(status);
    analytics.trackScreenView(screenName, 'auto_redirect');
  }, [status]);

  const handleTeamWon = (teamIndex: number) => {
    // Complete round (this will increment the team score internally)
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
      {status === GameStatus.MENU && <MenuScreenSteps />}
      {status === GameStatus.TEAM_SETUP && (
        <TeamSetup onStartGame={handleStartGame} />
      )}
      {(status === GameStatus.PLAYING || status === GameStatus.BUZZER_PLAYING) && <GameScreen />}
      {status === GameStatus.ROUND_END && (
        <RoundEndScreen 
          onTeamWon={handleTeamWon}
          onContinue={handleContinueFromRoundEnd}
        />
      )}
      {status === GameStatus.ENDED && <EndScreen />}
      {status === GameStatus.PAUSED && <PauseMenu />}
      <PWABadge />
    </div>
  );
}

export default App;
