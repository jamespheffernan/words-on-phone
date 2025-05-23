import { useEffect, useRef, useCallback } from 'react';

interface BeepConfig {
  rampStartMs: number; // when to begin beeping (in ms before end)
  firstInterval: number; // initial beep interval in ms
  finalInterval: number; // final rapid beep interval in ms
}

interface UseBeepRampOptions {
  remainingMs: number;
  beepConfig: BeepConfig;
  enabled: boolean;
  onBeep: () => void;
}

// Linear interpolation utility
const lerp = (start: number, end: number, t: number): number => {
  return start + (end - start) * t;
};

// Clamp utility
const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

export const useBeepRamp = ({ remainingMs, beepConfig, enabled, onBeep }: UseBeepRampOptions) => {
  const nextBeepAtRef = useRef<number>(0);
  const lastBeepTimeRef = useRef<number>(0);
  const isActiveRef = useRef<boolean>(false);

  const calculateCurrentInterval = useCallback((remaining: number): number => {
    const { rampStartMs, firstInterval, finalInterval } = beepConfig;
    
    if (remaining > rampStartMs) {
      return firstInterval; // Not in ramp yet, use first interval
    }
    
    // Calculate progress through the ramp (0 = start of ramp, 1 = end of timer)
    const t = rampStartMs > 0 ? 1 - (remaining / rampStartMs) : 1;
    const clampedT = clamp(t, 0, 1);
    
    // Smooth interpolation from first to final interval
    return lerp(firstInterval, finalInterval, clampedT);
  }, [beepConfig]);

  const shouldBeepNow = useCallback((remaining: number): boolean => {
    if (!enabled || remaining <= 0 || remaining > beepConfig.rampStartMs) {
      return false;
    }

    const now = performance.now();
    
    // Initialize on first call in ramp
    if (!isActiveRef.current) {
      isActiveRef.current = true;
      lastBeepTimeRef.current = now;
      nextBeepAtRef.current = now;
      return true; // Play first beep immediately
    }

    // Check if it's time for the next beep
    if (now >= nextBeepAtRef.current) {
      const currentInterval = calculateCurrentInterval(remaining);
      nextBeepAtRef.current = now + currentInterval;
      lastBeepTimeRef.current = now;
      return true;
    }

    return false;
  }, [enabled, beepConfig.rampStartMs, calculateCurrentInterval]);

  // Reset when timer resets or beep disabled
  useEffect(() => {
    if (!enabled || remainingMs > beepConfig.rampStartMs) {
      isActiveRef.current = false;
      nextBeepAtRef.current = 0;
      lastBeepTimeRef.current = 0;
    }
  }, [enabled, remainingMs, beepConfig.rampStartMs]);

  // Check for beep on every remaining time update
  useEffect(() => {
    if (shouldBeepNow(remainingMs)) {
      onBeep();
    }
  }, [remainingMs, shouldBeepNow, onBeep]);

  return {
    isBeepRampActive: enabled && remainingMs <= beepConfig.rampStartMs && remainingMs > 0,
    currentInterval: calculateCurrentInterval(remainingMs),
    nextBeepIn: Math.max(0, nextBeepAtRef.current - performance.now())
  };
}; 