import React, { useEffect } from 'react';
import { useGameStore } from '../store';
import { useTimer } from '../hooks/useTimer';
import { useAudio } from '../hooks/useAudio';
import { useHaptics } from '../hooks/useHaptics';
import { useBeepAudio } from '../hooks/useBeepAudio';
import { useBeepRamp } from '../hooks/useBeepRamp';
import { useBackgroundWarning } from '../hooks/useBackgroundWarning';
import { useViewportHeight } from '../hooks/useViewportHeight';
import './GameScreen.css';

export const GameScreen: React.FC = () => {
  const {
    currentPhrase,
    nextPhrase,
    skipPhrase,
    skipsRemaining,
    skipLimit,
    teams,
    currentTeamIndex,
    currentRoundAnswers,
    pauseGame,
    actualTimerDuration,
    showTimer,
    useRandomTimer,
    timeRemaining,
    isTimerRunning,
    setTimeRemaining,
    onTimerComplete,
    buzzerSound,
    // Beep ramp settings
    enableBeepRamp,
    beepRampStart,
    beepFirstInterval,
    beepFinalInterval,
    beepVolume
  } = useGameStore();

  // Audio hook for buzzer sound
  const buzzer = useAudio(buzzerSound, { volume: 0.6, preload: true });

  // Beep audio hook for ramp beeps
  const beepAudio = useBeepAudio({ 
    volume: beepVolume, 
    enabled: enableBeepRamp 
  });

  // Haptics hook for mobile feedback
  const { triggerNotification } = useHaptics();

  // Timer with buzzer callback
  const timer = useTimer({
    duration: actualTimerDuration,
    onComplete: () => {
      buzzer.play().catch(console.warn);
      triggerNotification(); // Add haptic feedback on timeout
      onTimerComplete();
    },
    onTick: (remaining) => {
      setTimeRemaining(remaining);
    }
  });

  // Beep ramp system
  const beepRamp = useBeepRamp({
    remainingMs: timer.timeRemainingMs,
    beepConfig: {
      rampStartMs: beepRampStart * 1000, // convert seconds to ms
      firstInterval: beepFirstInterval,
      finalInterval: beepFinalInterval
    },
    enabled: enableBeepRamp && timer.isRunning && !timer.isPaused,
    onBeep: () => {
      beepAudio.playBeep().catch(console.warn);
    }
  });

  // Debug info for beep system
  if (process.env.NODE_ENV === 'development') {
    console.debug('Beep ramp status:', {
      isActive: beepRamp.isBeepRampActive,
      currentInterval: beepRamp.currentInterval,
      nextBeepIn: beepRamp.nextBeepIn,
      remainingMs: timer.timeRemainingMs
    });
  }

  // Sync timer with game state
  useEffect(() => {
    if (isTimerRunning && !timer.isRunning && !timer.isPaused) {
      timer.start();
    } else if (!isTimerRunning && timer.isRunning) {
      timer.pause();
    } else if (isTimerRunning && timer.isPaused) {
      timer.resume();
    }
  }, [isTimerRunning, timer]);

  // Reset timer when duration changes or when game is not running
  useEffect(() => {
    if (!isTimerRunning) {
      timer.reset();
    }
  }, [actualTimerDuration, isTimerRunning, timer]);

  // Use timer's timeRemaining when running, store's when idle
  const displayTime = timer.isRunning || timer.isPaused ? timer.timeRemaining : timeRemaining;

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage for visual timer
  const progress = (displayTime / actualTimerDuration) * 100;
  const isLowTime = displayTime <= 10;

  // Background warning system
  const backgroundWarning = useBackgroundWarning({
    timeRemaining: displayTime,
    totalDuration: actualTimerDuration,
    enabled: true // Always enabled for now, will add setting later
  });

  // Viewport height management with fallback
  const { heightValue, supportsDvh } = useViewportHeight();

  return (
    <main 
      className={`game-screen ${!showTimer ? 'hidden-timer-mode' : ''}`}
      style={{
        background: backgroundWarning.backgroundStyle,
        transition: 'background 0.3s ease-in-out',
        // Apply JavaScript-calculated height for browsers without dvh support
        ...(supportsDvh === false && { minHeight: heightValue, maxHeight: heightValue })
      }}
    >
      <header className="game-header">
        <div className="game-header-controls">
          <button 
            className="pause-button"
            onClick={pauseGame}
            aria-label="Pause game"
          >
            ⏸️
          </button>
          
          {showTimer ? (
            <div className={`timer-display ${isLowTime ? 'low-time' : ''}`}>
              <div 
                className="timer-circle"
                style={{
                  '--progress': `${progress}%`
                } as React.CSSProperties}
                role="timer"
                aria-label={`Timer: ${formatTime(displayTime)} remaining`}
              >
                <span className="timer-text">{formatTime(displayTime)}</span>
              </div>
            </div>
          ) : (
            <div className="timer-placeholder" aria-hidden="true">
              <div className="hidden-timer-indicator">
                {useRandomTimer ? '🎲' : '⏱️'}
              </div>
            </div>
          )}
          
          <div className="team-display" role="status" aria-live="polite">
            {teams.length > 0 ? (
              <div className="current-team">
                <div className="team-indicator">
                  <span className="holding-label">Holding:</span>
                  <span className="team-name">{teams[currentTeamIndex]?.name || 'Team'}</span>
                </div>
                <div className="team-scores">
                  {teams.map((team, index) => (
                    <span 
                      key={index} 
                      className={`team-score ${index === currentTeamIndex ? 'active' : ''}`}
                    >
                      {team.name}: {team.score}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="round-counter">Round: {currentRoundAnswers.length}</div>
            )}
          </div>
        </div>

        {skipLimit > 0 && (
          <div className="skip-counter" role="status" aria-live="polite">
            Skips left: {skipsRemaining}
          </div>
        )}
      </header>

      <section className="phrase-container">
        <h1 className="current-phrase">{currentPhrase}</h1>
      </section>

      <section className="game-actions">
        <button 
          className="correct-button"
          onClick={nextPhrase}
          aria-label="Mark phrase as correct and get next phrase"
        >
          ✓ Correct
        </button>
        
        <button 
          className={`pass-button ${skipsRemaining === 0 ? 'disabled' : ''}`}
          onClick={skipPhrase}
          disabled={skipsRemaining === 0}
          aria-label={skipsRemaining === 0 ? 'No skips remaining' : 'Skip this phrase'}
        >
          ⏭️ Pass
        </button>
      </section>

      {/* Hidden timer info for screen readers */}
      {!showTimer && (
        <div className="sr-only" role="timer" aria-live="polite">
          {useRandomTimer 
            ? `Timer running with random duration (${actualTimerDuration}s)`
            : `Timer running with fixed duration (${actualTimerDuration}s)`
          }
        </div>
      )}
    </main>
  );
}; 