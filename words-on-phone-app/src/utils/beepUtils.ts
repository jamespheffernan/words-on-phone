/**
 * Utility functions for accelerating beep timer system
 */

/**
 * Linear interpolation between two values
 * @param a - Start value
 * @param b - End value  
 * @param t - Interpolation factor (0-1)
 * @returns Interpolated value
 */
export const lerp = (a: number, b: number, t: number): number => {
  return a + (b - a) * t;
};

/**
 * Clamp a value between min and max bounds
 * @param value - Value to clamp
 * @param min - Minimum bound
 * @param max - Maximum bound
 * @returns Clamped value
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

/**
 * Configuration for beep ramp system
 */
export interface BeepConfig {
  rampStartMs: number;    // When to start beeping (ms before end)
  firstInterval: number;  // Initial beep interval (ms)
  finalInterval: number;  // Final rapid beep interval (ms)
  enabled: boolean;       // Whether beep ramp is enabled
}

/**
 * Calculate the current beep interval based on remaining time
 * @param remainingMs - Milliseconds remaining in timer
 * @param config - Beep configuration
 * @returns Current beep interval in milliseconds
 */
export const getBeepInterval = (remainingMs: number, config: BeepConfig): number => {
  const { rampStartMs, firstInterval, finalInterval } = config;
  
  // If we haven't reached ramp start time, no beeping
  if (remainingMs > rampStartMs) {
    return Infinity;
  }
  
  // If remaining time is 0 or negative, no more beeps (buzzer will play)
  if (remainingMs <= 0) {
    return Infinity;
  }
  
  // Calculate interpolation factor (0 at ramp start, 1 at end)
  const t = rampStartMs > 0 ? 1 - (remainingMs / rampStartMs) : 1;
  const clampedT = clamp(t, 0, 1);
  
  // Linear interpolation from first to final interval
  return lerp(firstInterval, finalInterval, clampedT);
};

/**
 * Check if beep ramp should be active based on remaining time
 * @param remainingMs - Milliseconds remaining in timer
 * @param config - Beep configuration
 * @returns Whether beep ramp is active
 */
export const shouldBeepRampBeActive = (remainingMs: number, config: BeepConfig): boolean => {
  return config.enabled && remainingMs <= config.rampStartMs && remainingMs > 0;
}; 