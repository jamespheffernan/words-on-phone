import React, { useState, useEffect } from 'react';
import { GameMode } from './GameModeStep';
import { useGameStore, BUZZER_SOUNDS, GameDifficulty } from '../store';
import { useCategoryMetadata } from '../hooks/useCategoryMetadata';
import { getCategoryGroup } from '../types/category';
import { getRandomTeamNames } from '../data/teamNames';
import { getDifficultyStats, getDifficultyDescription } from '../services/difficultyService';
import './GameOptionsStep.css';

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

interface GameOptionsStepProps {
  gameMode: GameMode;
  selectedCategories: string[];
  gameOptions: GameOptions;
  onOptionsChange: (options: GameOptions) => void;
  onStartGame: () => void;
  onBack: () => void;
}

// Get initial random team names
const getInitialTeamNames = () => {
  const [team1, team2] = getRandomTeamNames();
  return [team1, team2];
};

// Format timer duration for better readability
const formatTimerDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }
  return `${minutes}m ${remainingSeconds}s`;
};

export const GameOptionsStep: React.FC<GameOptionsStepProps> = ({
  gameMode,
  selectedCategories,
  gameOptions,
  onOptionsChange,
  onStartGame,
  onBack
}) => {
  const { 
    timerDuration: globalTimerDuration,
    useRandomTimer: globalUseRandomTimer,
    timerRangeMin: globalTimerRangeMin,
    timerRangeMax: globalTimerRangeMax,
    skipLimit: globalSkipLimit,
    buzzerSound: globalBuzzerSound,
    gameLength: globalGameLength,
    difficulty: globalDifficulty,
    setDifficulty
  } = useGameStore();

  const [teamNames, setTeamNames] = useState<string[]>(
    gameOptions.teamNames || getInitialTeamNames()
  );
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [difficultyStats, setDifficultyStats] = useState(() => 
    getDifficultyStats(selectedCategories)
  );
  
  // Get category metadata for displaying selected categories
  const { defaultCategories, customCategories, loading: categoriesLoading } = useCategoryMetadata();

  // Update difficulty stats when categories change
  useEffect(() => {
    setDifficultyStats(getDifficultyStats(selectedCategories));
  }, [selectedCategories]);
  
  // Initialize with global store values if not set in gameOptions
  const currentOptions = {
    ...gameOptions,
    timerDuration: gameOptions.timerDuration ?? globalTimerDuration,
    useRandomTimer: gameOptions.useRandomTimer ?? globalUseRandomTimer,
    timerRangeMin: gameOptions.timerRangeMin ?? globalTimerRangeMin,
    timerRangeMax: gameOptions.timerRangeMax ?? globalTimerRangeMax,
    skipLimit: gameOptions.skipLimit ?? globalSkipLimit,
    buzzerSound: gameOptions.buzzerSound ?? globalBuzzerSound,
    gameLength: gameOptions.gameLength ?? globalGameLength
  };

  const handleTeamNameChange = (index: number, name: string) => {
    const newTeamNames = [...teamNames];
    newTeamNames[index] = name;
    setTeamNames(newTeamNames);
    onOptionsChange({
      ...gameOptions,
      teamNames: newTeamNames
    });
  };

  const shuffleTeamNames = () => {
    const [team1, team2] = getRandomTeamNames();
    const newTeamNames = [team1, team2];
    setTeamNames(newTeamNames);
    onOptionsChange({
      ...gameOptions,
      teamNames: newTeamNames
    });
  };

  // Team management functions removed - only 2 teams supported

  const handleTimerToggle = (showTimer: boolean) => {
    onOptionsChange({
      ...currentOptions,
      showTimer
    });
  };

  const handleTimerDurationChange = (duration: number) => {
    onOptionsChange({
      ...currentOptions,
      timerDuration: duration
    });
  };

  const handleRandomTimerToggle = (useRandomTimer: boolean) => {
    onOptionsChange({
      ...currentOptions,
      useRandomTimer
    });
  };

  const handleTimerRangeChange = (min: number, max: number) => {
    onOptionsChange({
      ...currentOptions,
      timerRangeMin: min,
      timerRangeMax: max
    });
  };

  const handleSkipLimitChange = (skipLimit: number) => {
    onOptionsChange({
      ...currentOptions,
      skipLimit
    });
  };

  const handleBuzzerSoundChange = (buzzerSound: keyof typeof BUZZER_SOUNDS) => {
    onOptionsChange({
      ...currentOptions,
      buzzerSound
    });
  };

  const handleGameLengthChange = (gameLength: number) => {
    onOptionsChange({
      ...currentOptions,
      gameLength
    });
  };

  const handleDifficultyChange = (difficulty: GameDifficulty) => {
    setDifficulty(difficulty);
  };

  const canStartGame = gameMode === 'team' 
    ? teamNames.slice(0, 2).every(name => name.trim().length > 0)
    : true; // Solo mode no longer requires player name up front

  // Get selected categories organized by group
  const getSelectedCategoryGroups = () => {
    const allCategories = [...defaultCategories, ...customCategories];
    const selectedCategoryData = allCategories.filter(cat => selectedCategories.includes(cat.name));
    
    const groups: { [key: string]: Array<{ name: string; phraseCount: number; icon: string }> } = {};
    selectedCategoryData.forEach(cat => {
      const categoryGroup = getCategoryGroup(cat.name);
      const groupName = categoryGroup ? categoryGroup.name : 'Other';
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push({
        ...cat,
        icon: categoryGroup?.emoji || '📂'
      });
    });
    
    return groups;
  };

  return (
    <div className="game-options-step">
      <div className="step-header">
        <h2 className="step-title">Game Settings</h2>
        <p className="step-description">
          Configure your {gameMode} game with {selectedCategories.length} categories
        </p>
      </div>

      <div className="options-content">
        {gameMode === 'team' && (
          <div className="team-setup-section">
            <div className="section-header">
              <div>
                <h3 className="section-title">Team Setup</h3>
                <p className="section-description">Name your two teams</p>
              </div>
              <button
                type="button"
                className="shuffle-button"
                onClick={shuffleTeamNames}
                title="Shuffle team names"
              >
                🎲 Shuffle
              </button>
            </div>
            
            <div className="teams-grid">
              {teamNames.slice(0, 2).map((name, index) => (
                <div key={index} className="team-input-group">
                  <label className="team-label">Team {index + 1}</label>
                  <div className="team-input-container">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => handleTeamNameChange(index, e.target.value)}
                      className="team-input"
                      placeholder={`Team ${index + 1}`}
                      maxLength={20}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {gameMode === 'solo' && (
          <div className="solo-info-section">
            <h3 className="section-title">Solo Mode</h3>
            <p className="section-description">
              Take turns with friends - each player gets one round and results are tracked on a leaderboard.
            </p>
            <div className="solo-flow-info">
              <div className="flow-step">
                <span className="step-number">1</span>
                <span className="step-text">Configure game settings</span>
              </div>
              <div className="flow-step">
                <span className="step-number">2</span>
                <span className="step-text">Enter first player's name</span>
              </div>
              <div className="flow-step">
                <span className="step-number">3</span>
                <span className="step-text">Play round & see leaderboard</span>
              </div>
              <div className="flow-step">
                <span className="step-number">4</span>
                <span className="step-text">Add next player & repeat</span>
              </div>
            </div>
          </div>
        )}

        <div className="game-settings-section">
          <h3 className="section-title">⏱️ Timer Settings</h3>
          
          <div className="settings-grid">
            <div className="setting-item timer-visibility-setting">
              <label className="setting-label enhanced-checkbox-label">
                <input
                  type="checkbox"
                  checked={currentOptions.showTimer}
                  onChange={(e) => handleTimerToggle(e.target.checked)}
                  className="setting-checkbox"
                />
                <span className="checkbox-label">Show Timer During Rounds</span>
              </label>
              <p className="setting-description">Display countdown timer to players during gameplay</p>
            </div>

            <div className="setting-item">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={currentOptions.useRandomTimer}
                  onChange={(e) => handleRandomTimerToggle(e.target.checked)}
                  className="setting-checkbox"
                />
                <span className="checkbox-label">Random Timer Duration</span>
              </label>
              <p className="setting-description">Randomize timer duration each round</p>
            </div>

            {currentOptions.useRandomTimer ? (
              <div className="setting-item timer-range-setting">
                <div className="timer-setting-header">
                  <span className="timer-setting-label">Random Timer Range</span>
                  <div className="timer-values-display">
                    <div className="timer-value-badge min-value">
                      <span className="timer-value">{formatTimerDuration(currentOptions.timerRangeMin)}</span>
                      <span className="timer-sublabel">minimum</span>
                    </div>
                    <span className="timer-range-separator">to</span>
                    <div className="timer-value-badge max-value">
                      <span className="timer-value">{formatTimerDuration(currentOptions.timerRangeMax)}</span>
                      <span className="timer-sublabel">maximum</span>
                    </div>
                  </div>
                </div>
                <div className="dual-slider-container">
                  <div className="slider-group">
                    <label className="slider-label">Minimum: {formatTimerDuration(currentOptions.timerRangeMin)}</label>
                    <input
                      type="range"
                      min="60"
                      max="300"
                      step="15"
                      value={currentOptions.timerRangeMin}
                      onChange={(e) => handleTimerRangeChange(Number(e.target.value), currentOptions.timerRangeMax)}
                      className="slider range-min"
                      aria-label="Minimum timer duration"
                    />
                  </div>
                  <div className="slider-group">
                    <label className="slider-label">Maximum: {formatTimerDuration(currentOptions.timerRangeMax)}</label>
                    <input
                      type="range"
                      min="60"
                      max="300"
                      step="15"
                      value={currentOptions.timerRangeMax}
                      onChange={(e) => handleTimerRangeChange(currentOptions.timerRangeMin, Number(e.target.value))}
                      className="slider range-max"
                      aria-label="Maximum timer duration"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="setting-item timer-fixed-setting">
                <div className="timer-setting-header">
                  <span className="timer-setting-label">Timer Duration</span>
                  <div className="timer-value-badge fixed-value">
                    <span className="timer-value">{formatTimerDuration(currentOptions.timerDuration)}</span>
                    <span className="timer-sublabel">per round</span>
                  </div>
                </div>
                <div className="slider-group">
                  <label className="slider-label">Duration: {formatTimerDuration(currentOptions.timerDuration)}</label>
                  <input
                    type="range"
                    min="60"
                    max="300"
                    step="15"
                    value={currentOptions.timerDuration}
                    onChange={(e) => handleTimerDurationChange(Number(e.target.value))}
                    className="slider"
                  />
                </div>
              </div>
            )}
          </div>

          <h3 className="section-title">🎯 Gameplay Settings</h3>
          
          <div className="settings-grid">
            <div className="setting-item">
              <label className="setting-label">
                Skip Limit: {currentOptions.skipLimit === 0 ? 'Unlimited' : currentOptions.skipLimit}
              </label>
              <input
                type="range"
                min="0"
                max="5"
                step="1"
                value={currentOptions.skipLimit}
                onChange={(e) => handleSkipLimitChange(Number(e.target.value))}
                className="slider"
              />
              <p className="setting-description">Maximum skips allowed per round</p>
            </div>

            <div className="setting-item">
              <label className="setting-label">
                Difficulty: {globalDifficulty.charAt(0).toUpperCase() + globalDifficulty.slice(1)}
              </label>
              <div className="difficulty-selector">
                {Object.values(GameDifficulty).map((difficulty) => (
                  <button
                    key={difficulty}
                    type="button"
                    className={`difficulty-button ${globalDifficulty === difficulty ? 'active' : ''}`}
                    onClick={() => handleDifficultyChange(difficulty)}
                  >
                    <span className="difficulty-name">
                      {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                    </span>
                    <span className="difficulty-count">
                      {difficultyStats[difficulty].toLocaleString()} phrases
                    </span>
                  </button>
                ))}
              </div>
              <p className="setting-description">
                {getDifficultyDescription(globalDifficulty)}
              </p>
            </div>

            <div className="setting-item">
              <label className="setting-label">
                Game Length: First to {currentOptions.gameLength} {currentOptions.gameLength === 1 ? 'point' : 'points'}
              </label>
              <input
                type="range"
                min="3"
                max="15"
                step="1"
                value={currentOptions.gameLength}
                onChange={(e) => handleGameLengthChange(Number(e.target.value))}
                className="slider"
              />
              <p className="setting-description">Points needed to win the game</p>
            </div>

            <div className="setting-item">
              <label className="setting-label">
                Buzzer Sound: {BUZZER_SOUNDS[currentOptions.buzzerSound]}
              </label>
              <select
                value={currentOptions.buzzerSound}
                onChange={(e) => handleBuzzerSoundChange(e.target.value as keyof typeof BUZZER_SOUNDS)}
                className="setting-select"
              >
                {Object.keys(BUZZER_SOUNDS).map(soundKey => (
                  <option key={soundKey} value={soundKey}>
                    {BUZZER_SOUNDS[soundKey as keyof typeof BUZZER_SOUNDS]}
                  </option>
                ))}
              </select>
              <p className="setting-description">Sound to play when time runs out</p>
            </div>
          </div>
        </div>

        <div className="summary-section">
          <button
            className="summary-toggle"
            onClick={() => setShowCategoriesModal(true)}
            type="button"
            aria-label="View game configuration"
          >
            <div className="summary-compact">
              <span className="summary-mode">{gameMode === 'team' ? '👥 Team Game' : '👤 Solo Game'}</span>
              <span className="summary-categories">{selectedCategories.length} categories</span>
              <span className="summary-timer">
                {currentOptions.useRandomTimer ? '🎲 Random timer' : `⏱️ ${currentOptions.timerDuration}s`}
              </span>
            </div>
            <span className="summary-expand-hint">👆 Tap to see full details</span>
          </button>
        </div>
      </div>

      <div className="step-navigation">
        <button
          className="back-button"
          onClick={onBack}
        >
          Back
        </button>
        
        <button
          className="start-game-button"
          onClick={onStartGame}
          disabled={!canStartGame}
        >
          <span className="button-icon">🎮</span>
          Start Game!
        </button>
      </div>

      {/* Selected Categories Modal */}
      {showCategoriesModal && (
        <div className="modal-overlay" onClick={() => setShowCategoriesModal(false)}>
          <div className="modal-content categories-modal" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h2>Selected Categories</h2>
              <button
                className="close-button"
                onClick={() => setShowCategoriesModal(false)}
                aria-label="Close categories"
              >
                ✕
              </button>
            </header>

            <div className="modal-body">
              {!categoriesLoading && Object.keys(getSelectedCategoryGroups()).length > 0 ? (
                <div className="categories-by-group">
                  {Object.entries(getSelectedCategoryGroups()).map(([groupName, categories]) => (
                    <div key={groupName} className="category-group">
                      <h3 className="group-title">{groupName}</h3>
                      <div className="category-rows">
                        {categories.map((category) => (
                          <div key={category.name} className="category-row">
                            <span className="category-icon">{category.icon}</span>
                            <div className="category-info">
                              <span className="category-name">{category.name}</span>
                              <span className="category-count">
                                {category.phraseCount || 0} phrases
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-categories">
                  <p>No categories selected</p>
                </div>
              )}
              
              <div className="categories-summary">
                <p>
                  <strong>Total:</strong> {selectedCategories.length} categories selected
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};