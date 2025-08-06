import React from 'react';
import { useGameStore, BUZZER_SOUNDS } from '../store';
import { useAudio } from '../hooks/useAudio';
import { useHaptics } from '../hooks/useHaptics';
import { analytics } from '../services/analytics';
import './GameSettingsModal.css';

interface GameSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GameSettingsModal: React.FC<GameSettingsModalProps> = ({
  isOpen,
  onClose
}) => {
  const {
    timerDuration,
    showTimer,
    useRandomTimer,
    timerRangeMin,
    timerRangeMax,
    skipLimit,
    buzzerSound,
    setTimerDuration,
    setShowTimer,
    setUseRandomTimer,
    setTimerRangeMin,
    setTimerRangeMax,
    setSkipLimit,
    setBuzzerSound
  } = useGameStore();

  const { 
    triggerImpact, 
    triggerNotification, 
    isEnabled: isHapticsEnabled,
    setEnabled: setHapticsEnabled,
    getIntensity: getHapticIntensity,
    setIntensity: setHapticIntensity
  } = useHaptics();

  // Audio hooks for testing buzzer sounds
  const testBuzzer = useAudio('buzzer', buzzerSound, { volume: 0.4, preload: true });
  
  const buzzerSoundKeys = Object.keys(BUZZER_SOUNDS) as (keyof typeof BUZZER_SOUNDS)[];

  const handleTestBuzzer = () => {
    testBuzzer.play().catch(console.warn);
    triggerImpact();
  };

  const handleClose = () => {
    triggerNotification();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content game-settings-modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>🎮 Game Settings</h2>
          <button
            className="close-button"
            onClick={handleClose}
            aria-label="Close settings"
          >
            ✕
          </button>
        </header>

        <div className="modal-body">
          {/* Timer Settings */}
          <div className="settings-section">
            <h3 className="section-title">⏱️ Timer Settings</h3>
            
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={showTimer}
                  onChange={(e) => {
                    const newValue = e.target.checked;
                    analytics.track('setting_changed', {
                      settingName: 'showTimer',
                      previousValue: showTimer,
                      newValue
                    });
                    setShowTimer(newValue);
                  }}
                  className="setting-checkbox"
                />
                Show Timer During Game
              </label>
              <p className="setting-description">
                Display the countdown timer during gameplay (hidden by default for surprise factor)
              </p>
            </div>

            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={useRandomTimer}
                  onChange={(e) => {
                    const newValue = e.target.checked;
                    analytics.track('setting_changed', {
                      settingName: 'useRandomTimer',
                      previousValue: useRandomTimer,
                      newValue
                    });
                    setUseRandomTimer(newValue);
                  }}
                  className="setting-checkbox"
                />
                Random Timer Duration
              </label>
              <p className="setting-description">
                Randomize timer duration each round for unpredictability
              </p>
            </div>

            {useRandomTimer ? (
              <div className="setting-item">
                <label htmlFor="timer-range-min">
                  Random Timer Range: {timerRangeMin}s - {timerRangeMax}s
                </label>
                <div className="dual-slider-container">
                  <input
                    id="timer-range-min"
                    type="range"
                    min="30"
                    max="90"
                    step="5"
                    value={timerRangeMin}
                    onChange={(e) => setTimerRangeMin(Number(e.target.value))}
                    className="slider range-min"
                    aria-label="Minimum timer duration"
                  />
                  <input
                    id="timer-range-max"
                    type="range"
                    min="30"
                    max="90"
                    step="5"
                    value={timerRangeMax}
                    onChange={(e) => setTimerRangeMax(Number(e.target.value))}
                    className="slider range-max"
                    aria-label="Maximum timer duration"
                  />
                </div>
              </div>
            ) : (
              <div className="setting-item">
                <label htmlFor="timer-slider">
                  Fixed Timer Duration: {timerDuration}s
                </label>
                <input
                  id="timer-slider"
                  type="range"
                  min="30"
                  max="90"
                  step="10"
                  value={timerDuration}
                  onChange={(e) => {
                    const newValue = Number(e.target.value);
                    analytics.track('setting_changed', {
                      settingName: 'timerDuration',
                      previousValue: timerDuration,
                      newValue
                    });
                    setTimerDuration(newValue);
                  }}
                  className="slider"
                />
              </div>
            )}
          </div>

          {/* Gameplay Settings */}
          <div className="settings-section">
            <h3 className="section-title">🎯 Gameplay Settings</h3>
            
            <div className="setting-item">
              <label htmlFor="skip-limit">
                Skip Limit: {skipLimit === 0 ? 'Unlimited' : skipLimit}
              </label>
              <input
                id="skip-limit"
                type="range"
                min="0"
                max="5"
                step="1"
                value={skipLimit}
                onChange={(e) => {
                  const newValue = Number(e.target.value);
                  analytics.track('setting_changed', {
                    settingName: 'skipLimit',
                    previousValue: skipLimit,
                    newValue
                  });
                  setSkipLimit(newValue);
                }}
                className="slider"
              />
              <p className="setting-description">
                Maximum number of phrases players can skip per round (0 = unlimited)
              </p>
            </div>
          </div>

          {/* Audio Settings */}
          <div className="settings-section">
            <h3 className="section-title">🔊 Audio Settings</h3>
            
            <div className="setting-item">
              <label htmlFor="buzzer-sound">
                Buzzer Sound: {BUZZER_SOUNDS[buzzerSound]}
              </label>
              <div className="buzzer-controls">
                <select
                  id="buzzer-sound"
                  value={buzzerSound}
                  onChange={(e) => setBuzzerSound(e.target.value as keyof typeof BUZZER_SOUNDS)}
                  className="buzzer-selector"
                >
                  {buzzerSoundKeys.map(soundKey => (
                    <option key={soundKey} value={soundKey}>
                      {BUZZER_SOUNDS[soundKey]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleTestBuzzer}
                  className="test-buzzer-button"
                  aria-label="Test buzzer sound"
                >
                  🔊 Test
                </button>
              </div>
              <p className="setting-description">
                ⏰ Metronome-style tick-tock sounds automatically play throughout each round, getting faster as time runs out
              </p>
            </div>
          </div>

          {/* Haptic Settings */}
          <div className="settings-section">
            <h3 className="section-title">📳 Haptic Feedback</h3>
            
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={isHapticsEnabled()}
                  onChange={(e) => {
                    const newValue = e.target.checked;
                    analytics.track('setting_changed', {
                      settingName: 'hapticsEnabled',
                      previousValue: isHapticsEnabled(),
                      newValue
                    });
                    setHapticsEnabled(newValue);
                  }}
                  className="setting-checkbox"
                />
                Enable Haptic Feedback
              </label>
              <p className="setting-description">
                Vibration feedback for mobile devices and UI interactions
              </p>
            </div>

            {isHapticsEnabled() && (
              <div className="setting-item">
                <label htmlFor="haptic-intensity">
                  Haptic Intensity: {Math.round(getHapticIntensity() * 100)}%
                </label>
                <div className="haptic-controls">
                  <input
                    id="haptic-intensity"
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={getHapticIntensity()}
                    onChange={(e) => {
                      const newValue = Number(e.target.value);
                      analytics.track('setting_changed', {
                        settingName: 'hapticIntensity',
                        previousValue: getHapticIntensity(),
                        newValue
                      });
                      setHapticIntensity(newValue);
                    }}
                    className="slider"
                  />
                  <button
                    type="button"
                    onClick={() => triggerImpact()}
                    className="test-haptic-button"
                    aria-label="Test haptic intensity"
                  >
                    📳 Test
                  </button>
                </div>
                <p className="setting-description">
                  Intensity of vibration feedback (Light to Heavy)
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="done-button"
            onClick={handleClose}
            aria-label="Close settings"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};