import { useCallback, useRef, useEffect } from 'react';
import { getBeepInterval, shouldBeepRampBeActive, BeepConfig } from '../utils/beepUtils';

export interface UseBeepRampOptions {
  beepConfig: BeepConfig;
  onBeep?: () => void; // Callback to trigger beep sound
  enabled?: boolean;   // Master enable/disable
}

export interface BeepRampState {
  isRampActive: boolean;
  beepCount: number;
  lastBeepTime: number;
  currentInterval: number;
  nextBeepAt: number;
}

export const useBeepRamp = (remainingMs: number, options: UseBeepRampOptions) => {
  const { beepConfig, onBeep, enabled = true } = options;
  
  // Use refs to track beep state without causing re-renders
  const stateRef = useRef<BeepRampState>({
    isRampActive: false,
    beepCount: 0,
    lastBeepTime: 0,
    currentInterval: Infinity,
    nextBeepAt: 0
  });
  
  const animationFrameRef = useRef<number | null>(null);
  const isStartedRef = useRef(false);
  const lastRemainingMsRef = useRef(remainingMs);

  // Main beep scheduler function
  const scheduleBeeps = useCallback(() => {
    const now = performance.now();
    const state = stateRef.current;
    const currentRemainingMs = lastRemainingMsRef.current;
    
    // Check if we should be ramping
    const shouldRamp = shouldBeepRampBeActive(currentRemainingMs, beepConfig) && enabled;
    
    if (!shouldRamp) {
      // Not in ramp phase, reset state
      state.isRampActive = false;
      state.nextBeepAt = 0;
      state.currentInterval = Infinity;
      // Don't cancel here, let the caller handle it
      return;
    }
    
    // We're in ramp phase
    if (!state.isRampActive) {
      // Just entered ramp phase
      state.isRampActive = true;
      state.beepCount = 0;
      state.lastBeepTime = now;
      state.currentInterval = getBeepInterval(currentRemainingMs, beepConfig);
      state.nextBeepAt = now + state.currentInterval;
    } else {
      // Already in ramp phase, update current interval based on remaining time
      state.currentInterval = getBeepInterval(currentRemainingMs, beepConfig);
    }
    
    // Check if it's time for the next beep
    if (now >= state.nextBeepAt && state.nextBeepAt > 0) {
      // Trigger beep
      onBeep?.();
      
      // Update state
      state.beepCount += 1;
      state.lastBeepTime = now;
      state.currentInterval = getBeepInterval(currentRemainingMs, beepConfig);
      
      // Schedule next beep, but only if we're still in valid ramp range
      if (state.currentInterval !== Infinity) {
        state.nextBeepAt = now + state.currentInterval;
      } else {
        state.nextBeepAt = 0;
      }
    }
    
    // Continue scheduling if we're still in ramp phase
    if (shouldBeepRampBeActive(currentRemainingMs, beepConfig) && enabled && isStartedRef.current) {
      animationFrameRef.current = requestAnimationFrame(scheduleBeeps);
    } else {
      animationFrameRef.current = null;
    }
  }, [beepConfig, onBeep, enabled]);

  // Update remaining time reference and trigger re-evaluation
  useEffect(() => {
    lastRemainingMsRef.current = remainingMs;
    
    // If we're currently started and the remaining time changes significantly, 
    // trigger a new evaluation
    if (isStartedRef.current && enabled) {
      // Cancel current frame and schedule new one
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(scheduleBeeps);
    }
  }, [remainingMs, scheduleBeeps, enabled]);

  // Public API methods
  const start = useCallback(() => {
    if (isStartedRef.current) return; // Prevent multiple starts
    
    isStartedRef.current = true;
    
    // Reset state
    stateRef.current = {
      isRampActive: false,
      beepCount: 0,
      lastBeepTime: 0,
      currentInterval: Infinity,
      nextBeepAt: 0
    };
    
    // Start scheduling if enabled
    if (enabled) {
      animationFrameRef.current = requestAnimationFrame(scheduleBeeps);
    }
  }, [scheduleBeeps, enabled]);

  const stop = useCallback(() => {
    isStartedRef.current = false;
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Reset state
    stateRef.current = {
      isRampActive: false,
      beepCount: 0,
      lastBeepTime: 0,
      currentInterval: Infinity,
      nextBeepAt: 0
    };
  }, []);

  const pause = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const resume = useCallback(() => {
    if (isStartedRef.current && enabled) {
      // Recalculate timing after pause
      const now = performance.now();
      const state = stateRef.current;
      
      if (state.isRampActive && state.nextBeepAt > 0) {
        // Adjust next beep time based on current remaining time
        state.currentInterval = getBeepInterval(remainingMs, beepConfig);
        if (state.currentInterval !== Infinity) {
          state.nextBeepAt = now + state.currentInterval;
        }
      }
      
      animationFrameRef.current = requestAnimationFrame(scheduleBeeps);
    }
  }, [scheduleBeeps, remainingMs, beepConfig, enabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, []);

  // Return current state (creates new object to avoid mutation)
  const getCurrentState = useCallback((): BeepRampState => {
    return { ...stateRef.current };
  }, []);

  return {
    start,
    stop,
    pause,
    resume,
    getCurrentState,
    // Convenience getters for current state
    get isRampActive() { return stateRef.current.isRampActive; },
    get beepCount() { return stateRef.current.beepCount; },
    get currentInterval() { return stateRef.current.currentInterval; },
  };
}; 