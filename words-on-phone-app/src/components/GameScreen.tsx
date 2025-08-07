import React, { useEffect } from 'react';
import { useGameStore, GameStatus, GameMode } from '../store';
import { useTimer } from '../hooks/useTimer';
import { useAudio } from '../hooks/useAudio';
import { useHaptics } from '../hooks/useHaptics';
import { useBeepAudio } from '../hooks/useBeepAudio';
import { useBeepRamp } from '../hooks/useBeepRamp';
import { useBackgroundWarning } from '../hooks/useBackgroundWarning';
import { useViewportHeight } from '../hooks/useViewportHeight';
import { useFlashEffect } from '../hooks/useFlashEffect';
import { useAutoFontSize } from '../hooks/useAutoFontSize';
import { RippleCountdown } from './RippleCountdown';
import { SwipeCard } from './SwipeCard';
import { analytics } from '../services/analytics';
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
    onBuzzerComplete,
    buzzerSound,
    status,
    selectedCategories,
    gameMode,
    currentSoloPlayer,
    // Beep ramp settings
    enableBeepRamp,
    beepFirstInterval,
    beepFinalInterval,
    beepVolume,
    buzzerVolume
  } = useGameStore();

  // Audio hook for buzzer sound
  console.log('GameScreen buzzerSound value:', buzzerSound);
  const buzzer = useAudio('buzzer', buzzerSound, { volume: buzzerVolume, preload: true });

  // Beep audio hook for ramp beeps
  const beepAudio = useBeepAudio({ 
    volume: beepVolume, 
    enabled: enableBeepRamp 
  });

  // Gameplay audio hooks
  const correctAudio = useAudio('gameplay', 'correct-answer', { volume: 0.7, preload: true });
  const skipAudio = useAudio('gameplay', 'skip-phrase', { volume: 0.6, preload: true });

  // Haptics hook for mobile feedback
  const { triggerNotification, triggerHaptic } = useHaptics();

  // Flash effect for round end visual feedback
  const flashEffect = useFlashEffect({
    duration: 2200, // Match buzzer duration + buffer
    flashInterval: 150, // Fast red/white flashing
    colors: ['#dc2626', '#ffffff'] // Red and white
  });

  // Timer with buzzer callback
  const timer = useTimer({
    duration: actualTimerDuration,
    onComplete: async () => {
      // Play buzzer FIRST, before any state changes
      try {
        await buzzer.play();
      } catch (error) {
        console.warn('Buzzer failed to play:', error);
        analytics.trackError('audio_failure', error as Error, 'buzzer_play_initial');
        
        // Try to reinitialize and play again
        buzzer.preloadSound();
        try {
          await buzzer.play();
        } catch (retryError) {
          console.warn('Buzzer retry also failed:', retryError);
          analytics.trackError('audio_failure', retryError as Error, 'buzzer_play_retry');
        }
      }
      
      // Add haptic feedback and flash effect
      triggerNotification();
      flashEffect.startFlash();
      
      // Immediately disable UI by setting BUZZER_PLAYING state
      onTimerComplete();
      
      // Extended delay to allow full buzzer playback (2 seconds + buffer)
      setTimeout(() => {
        onBuzzerComplete();
      }, 2200);
    },
    onTick: (remaining) => {
      setTimeRemaining(remaining);
    }
  });

  // Beep ramp system - start from beginning of timer
  const beepRamp = useBeepRamp({
    remainingMs: timer.timeRemainingMs,
    beepConfig: {
      rampStartMs: actualTimerDuration * 1000, // Start from full timer duration
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

  // Reset timer when starting a new game/round (status changes to PLAYING)
  useEffect(() => {
    if (status === GameStatus.PLAYING) {
      timer.reset();
    }
  }, [status, timer]);

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
  
  // Check if game interaction should be disabled (buzzer playing)
  const isGameInteractionDisabled = status === GameStatus.BUZZER_PLAYING;

  // Background warning system
  const backgroundWarning = useBackgroundWarning({
    timeRemaining: displayTime,
    totalDuration: actualTimerDuration,
    enabled: true // Always enabled for now, will add setting later
  });

  // Viewport height management with fallback
  const { heightValue, supportsDvh } = useViewportHeight();

  // Auto font sizing for phrases with multi-line support
  const phraseRef = useAutoFontSize<HTMLHeadingElement>({
    text: currentPhrase,
    maxFontSize: 120,
    minFontSize: 24,
    maxLines: 4
  });

  // Track phrase_shown events
  useEffect(() => {
    if (currentPhrase && status === GameStatus.PLAYING) {
      // Generate a simple phrase ID for tracking
      const phraseId = `phrase_${currentPhrase.replace(/\s+/g, '_').toLowerCase().substring(0, 20)}`;
      
      analytics.track('phrase_shown', {
        phraseId,
        categoryName: selectedCategories.join(', ') || 'Unknown',
        phraseLength: currentPhrase.length,
        timeRemaining: displayTime,
        roundNumber: teams.length > 0 ? currentRoundAnswers.length + 1 : undefined
      });
    }
  }, [currentPhrase, status, selectedCategories, displayTime, teams.length, currentRoundAnswers.length]);

  return (
    <main 
      className={`game-screen ${!showTimer ? 'hidden-timer-mode' : ''}`}
      data-testid="game-screen"
      style={{
        background: flashEffect.isFlashing ? flashEffect.currentColor : backgroundWarning.backgroundStyle,
        transition: flashEffect.isFlashing ? 'background 0.1s ease-out' : 'background 0.3s ease-in-out',
        // Apply JavaScript-calculated height for browsers without dvh support
        ...(supportsDvh === false && { minHeight: heightValue, maxHeight: heightValue })
      }}
    >
      <header className="game-header">
        <div className="game-header-controls">
          <button 
            className="pause-button"
            onClick={() => {
              pauseGame();
              triggerHaptic('ui', 'menu-open');
            }}
            aria-label="Pause game"
            data-testid="end-game-button"
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
                data-testid="game-timer"
              >
                <span className="timer-text">{formatTime(displayTime)}</span>
              </div>
            </div>
          ) : (
            <div className="timer-placeholder" aria-hidden="true">
              <RippleCountdown 
                remaining={displayTime}
                total={actualTimerDuration}
              />
            </div>
          )}
          
          <div className="team-display" role="status" aria-live="polite">
            {gameMode === GameMode.TEAM && teams.length > 0 ? (
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
            ) : gameMode === GameMode.SOLO && currentSoloPlayer ? (
              <div className="solo-player-display">
                <span className="player-name">{currentSoloPlayer}:</span>
                <span className="current-score">{currentRoundAnswers.length}</span>
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

        {selectedCategories.length > 0 && (
          <div className="current-category" data-testid="current-category">
            {selectedCategories.join(', ')}
          </div>
        )}
      </header>

      <section className="phrase-container">
        <SwipeCard
          onSwipeLeft={() => {
            if (!isGameInteractionDisabled && skipsRemaining > 0) {
              skipPhrase();
              skipAudio.play().catch(console.warn);
              triggerHaptic('gameplay', 'skip');
            }
          }}
          onSwipeRight={() => {
            if (!isGameInteractionDisabled) {
              nextPhrase();
              correctAudio.play().catch(console.warn);
              triggerHaptic('gameplay', 'correct');
            }
          }}
          disabled={isGameInteractionDisabled}
          className="phrase-swipe-card"
        >
          <h1 className="current-phrase" data-testid="phrase-display" ref={phraseRef}>{currentPhrase}</h1>
        </SwipeCard>
      </section>

      <section className="game-actions">
        <button 
          className={`correct-button ${isGameInteractionDisabled ? 'disabled' : ''}`}
          onClick={() => {
            if (!isGameInteractionDisabled) {
              nextPhrase();
              correctAudio.play().catch(console.warn);
              triggerHaptic('gameplay', 'correct');
            }
          }}
          disabled={isGameInteractionDisabled}
          aria-label={isGameInteractionDisabled ? 'Game ended - no more input allowed' : 'Mark phrase as correct and get next phrase'}
          data-testid="correct-button"
        >
          ✓ Correct
        </button>
        
        <button 
          className={`pass-button ${skipsRemaining === 0 || isGameInteractionDisabled ? 'disabled' : ''}`}
          onClick={() => {
            if (!isGameInteractionDisabled) {
              skipPhrase();
              skipAudio.play().catch(console.warn);
              triggerHaptic('gameplay', 'skip');
            }
          }}
          disabled={skipsRemaining === 0 || isGameInteractionDisabled}
          aria-label={
            isGameInteractionDisabled 
              ? 'Game ended - no more input allowed'
              : skipsRemaining === 0 
                ? 'No skips remaining' 
                : 'Skip this phrase'
          }
          data-testid="skip-button"
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