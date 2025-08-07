import React, { useState } from 'react';
import { useGameStore, BUZZER_SOUNDS } from '../store';
import { GameModeStep, GameMode } from './GameModeStep';
import { CategorySelectionStep } from './CategorySelectionStep';
import { GameOptionsStep } from './GameOptionsStep';
import { StepIndicator } from './StepIndicator';
import { HowToPlayModal } from './HowToPlayModal';
import { PrivacySettings } from './PrivacySettings';
import { GameSettingsModal } from './GameSettingsModal';
import { VersionDisplay } from './VersionDisplay';
import { useHaptics } from '../hooks/useHaptics';
import { analytics } from '../services/analytics';
import { getRandomTeamNames } from '../data/teamNames';
import './MenuScreenSteps.css';

interface GameOptions {
  showTimer: boolean;
  timerDuration: number;
  useRandomTimer: boolean;
  timerRangeMin: number;
  timerRangeMax: number;
  skipLimit: number;
  buzzerSound: keyof typeof BUZZER_SOUNDS;
  gameLength: number;
  teamNames?: string[];
  playerName?: string;
}

const STEPS = [
  { id: 1, title: 'Game Mode', description: 'Choose team or solo play' },
  { id: 2, title: 'Categories', description: 'Select phrase categories' },
  { id: 3, title: 'Settings', description: 'Configure your game' }
];

export const MenuScreenSteps: React.FC = () => {
  const {
    selectedCategories,
    showTimer,
    timerDuration,
    useRandomTimer,
    timerRangeMin,
    timerRangeMax,
    skipLimit,
    buzzerSound,
    gameLength,
    setSelectedCategories,
    setShowTimer,
    setTimerDuration,
    setUseRandomTimer,
    setTimerRangeMin,
    setTimerRangeMax,
    setSkipLimit,
    setBuzzerSound,
    setGameLength,
    startSoloGame,
    setTeams
  } = useGameStore();

  // Step state
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode | null>(null);
  const [gameOptions, setGameOptions] = useState<GameOptions>({
    showTimer,
    timerDuration,
    useRandomTimer,
    timerRangeMin,
    timerRangeMax,
    skipLimit,
    buzzerSound,
    gameLength,
    teamNames: getRandomTeamNames(),
    playerName: ''
  });

  // Modal states
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showGameSettings, setShowGameSettings] = useState(false);
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);

  const { triggerNotification } = useHaptics();

  const handleModeSelect = (mode: GameMode) => {
    setSelectedGameMode(mode);
    triggerNotification();
    analytics.track('category_selected', { 
      categoryName: `${mode}_mode_selection`,
      source: 'grid'
    });
  };

  const handleNextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
      triggerNotification();
      analytics.track('screen_viewed', { 
        screenName: 'Home',
        navigationMethod: 'button_click'
      });
    }
  };

  const handleBackStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      triggerNotification();
      analytics.track('screen_viewed', { 
        screenName: 'Home',
        navigationMethod: 'back_button'
      });
    }
  };

  const handleCategoriesChange = (categories: string[]) => {
    setSelectedCategories(categories);
    if (categories.length > 0) {
      analytics.track('category_selected', { 
        categoryName: `multiple_categories_${categories.length}`,
        source: 'grid'
      });
    }
  };

  const handleOptionsChange = (options: GameOptions) => {
    setGameOptions(options);
    
    // Update global store settings immediately
    if (options.showTimer !== showTimer) {
      setShowTimer(options.showTimer);
    }
    if (options.timerDuration !== timerDuration) {
      setTimerDuration(options.timerDuration);
    }
    if (options.useRandomTimer !== useRandomTimer) {
      setUseRandomTimer(options.useRandomTimer);
    }
    if (options.timerRangeMin !== timerRangeMin) {
      setTimerRangeMin(options.timerRangeMin);
    }
    if (options.timerRangeMax !== timerRangeMax) {
      setTimerRangeMax(options.timerRangeMax);
    }
    if (options.skipLimit !== skipLimit) {
      setSkipLimit(options.skipLimit);
    }
    if (options.buzzerSound !== buzzerSound) {
      setBuzzerSound(options.buzzerSound);
    }
    if (options.gameLength !== gameLength) {
      setGameLength(options.gameLength);
    }
  };

  const handleStartGame = () => {
    if (!selectedGameMode) return;

    // Update global settings
    setShowTimer(gameOptions.showTimer);

    analytics.track('game_started', {
      categoryName: selectedCategories[0] || 'multiple',
      timerMode: gameOptions.showTimer ? 'visible' : 'hidden',
      isTeamMode: selectedGameMode === 'team',
      teamCount: selectedGameMode === 'team' ? 2 : 1,
      skipLimit: 3,
      gameId: Date.now().toString(),
      phraseCount: 0,
      gameMode: selectedGameMode
    });

    if (selectedGameMode === 'team') {
      if (gameOptions.teamNames && gameOptions.teamNames.length >= 2) {
        // Set up teams and start game directly, skipping the separate team setup screen
        const teams = gameOptions.teamNames.slice(0, 2).map((name) => ({
          name,
          score: 0
        }));
        setTeams(teams);
        // Start team game directly using existing startGame function
        useGameStore.getState().startGame();
      }
    } else {
      if (gameOptions.playerName) {
        useGameStore.getState().setCurrentSoloPlayer(gameOptions.playerName);
        useGameStore.getState().startNewSoloGame();
        startSoloGame();
      }
    }

    triggerNotification();
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <GameModeStep
            selectedMode={selectedGameMode}
            onModeSelect={handleModeSelect}
            onNext={handleNextStep}
          />
        );
      
      case 2:
        return (
          <CategorySelectionStep
            selectedCategories={selectedCategories}
            onCategoriesChange={handleCategoriesChange}
            onNext={handleNextStep}
            onBack={handleBackStep}
          />
        );
      
      case 3:
        return (
          <GameOptionsStep
            gameMode={selectedGameMode!}
            selectedCategories={selectedCategories}
            gameOptions={gameOptions}
            onOptionsChange={handleOptionsChange}
            onStartGame={handleStartGame}
            onBack={handleBackStep}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <main className="menu-screen-steps" data-testid="menu-screen">
      <div className="menu-content">
        {/* Compact header with quick access buttons and step indicator */}
        <div className="menu-header">
          <div className="header-top-row">
            <div className="header-actions">
              <button
                className="header-action-button"
                onClick={() => setShowGameSettings(true)}
                aria-label="Game settings"
              >
                ⚙️
              </button>
              
              <button
                className="header-action-button"
                onClick={() => setShowHowToPlay(true)}
                aria-label="How to play"
              >
                ℹ️
              </button>
              
              <button
                className="header-action-button"
                onClick={() => setShowPrivacySettings(true)}
                aria-label="Privacy settings"
              >
                🔒
              </button>
            </div>
          </div>
          
          <div className="header-step-row">
            <StepIndicator
              currentStep={currentStep}
              totalSteps={STEPS.length}
              steps={STEPS}
            />
          </div>
        </div>

        {/* Current step content with footer inside scrollable area */}
        <div className="step-container">
          <div className="step-content">
            {renderCurrentStep()}
          </div>
          
          {/* Footer moved inside scrollable area */}
          <div className="menu-footer">
            <VersionDisplay />
          </div>
        </div>
      </div>

      {/* Modals */}
      <HowToPlayModal
        isOpen={showHowToPlay}
        onClose={() => setShowHowToPlay(false)}
      />

      <GameSettingsModal
        isOpen={showGameSettings}
        onClose={() => setShowGameSettings(false)}
      />

      <PrivacySettings
        isOpen={showPrivacySettings}
        onClose={() => setShowPrivacySettings(false)}
      />
    </main>
  );
};