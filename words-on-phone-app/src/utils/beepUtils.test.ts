import { describe, it, expect } from 'vitest';
import { lerp, clamp, getBeepInterval, shouldBeepRampBeActive, BeepConfig } from './beepUtils';

describe('Beep Utility Functions', () => {
  describe('lerp', () => {
    it('should interpolate correctly between two values', () => {
      expect(lerp(0, 10, 0)).toBe(0);
      expect(lerp(0, 10, 0.5)).toBe(5);
      expect(lerp(0, 10, 1)).toBe(10);
    });

    it('should handle negative values', () => {
      expect(lerp(-10, 10, 0.5)).toBe(0);
      expect(lerp(10, -10, 0.5)).toBe(0);
    });

    it('should handle fractional interpolation factors', () => {
      expect(lerp(0, 100, 0.25)).toBe(25);
      expect(lerp(0, 100, 0.75)).toBe(75);
    });

    it('should handle extrapolation beyond 0-1 range', () => {
      expect(lerp(0, 10, -0.5)).toBe(-5);
      expect(lerp(0, 10, 1.5)).toBe(15);
    });

    it('should handle identical start and end values', () => {
      expect(lerp(5, 5, 0.5)).toBe(5);
      expect(lerp(5, 5, 0)).toBe(5);
      expect(lerp(5, 5, 1)).toBe(5);
    });
  });

  describe('clamp', () => {
    it('should clamp values within bounds', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it('should handle edge cases', () => {
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(10, 0, 10)).toBe(10);
    });

    it('should handle negative bounds', () => {
      expect(clamp(-5, -10, -1)).toBe(-5);
      expect(clamp(-15, -10, -1)).toBe(-10);
      expect(clamp(5, -10, -1)).toBe(-1);
    });

    it('should handle min equal to max', () => {
      expect(clamp(5, 10, 10)).toBe(10);
      expect(clamp(15, 10, 10)).toBe(10);
      expect(clamp(5, 10, 10)).toBe(10);
    });
  });

  describe('getBeepInterval', () => {
    const defaultConfig: BeepConfig = {
      rampStartMs: 20000,
      firstInterval: 1000,
      finalInterval: 150,
      enabled: true
    };

    it('should return Infinity when remaining time is above ramp start', () => {
      expect(getBeepInterval(25000, defaultConfig)).toBe(Infinity);
      expect(getBeepInterval(30000, defaultConfig)).toBe(Infinity);
    });

    it('should return Infinity when remaining time is 0 or negative', () => {
      expect(getBeepInterval(0, defaultConfig)).toBe(Infinity);
      expect(getBeepInterval(-1000, defaultConfig)).toBe(Infinity);
    });

    it('should return first interval at ramp start', () => {
      const interval = getBeepInterval(20000, defaultConfig);
      expect(interval).toBeCloseTo(1000, 1);
    });

    it('should approach final interval near the end', () => {
      // At 100ms remaining (very close to end), should be very close to final interval
      const interval = getBeepInterval(100, defaultConfig);
      // t = 1 - (100 / 20000) = 1 - 0.005 = 0.995
      // interval = 1000 + 0.995 * (150 - 1000) = 1000 + 0.995 * (-850) = 1000 - 845.75 = 154.25
      expect(interval).toBeCloseTo(154.25, 1);
    });

    it('should interpolate smoothly between first and final intervals', () => {
      // At halfway point (10s remaining), should be halfway between intervals
      const midInterval = getBeepInterval(10000, defaultConfig);
      const expectedMid = (1000 + 150) / 2; // 575
      expect(midInterval).toBeCloseTo(expectedMid, 1);

      // At 75% through ramp (5s remaining), should be 75% toward final
      const quarterInterval = getBeepInterval(5000, defaultConfig);
      const expectedQuarter = 1000 + 0.75 * (150 - 1000); // 362.5
      expect(quarterInterval).toBeCloseTo(expectedQuarter, 1);
    });

    it('should handle edge case when rampStartMs is 0', () => {
      const zeroRampConfig: BeepConfig = {
        ...defaultConfig,
        rampStartMs: 0
      };
      
      expect(getBeepInterval(0, zeroRampConfig)).toBe(Infinity);
      expect(getBeepInterval(1000, zeroRampConfig)).toBe(Infinity);
    });

    it('should handle short rounds (remaining < rampStart)', () => {
      const shortRoundConfig: BeepConfig = {
        rampStartMs: 30000, // 30s ramp start
        firstInterval: 1000,
        finalInterval: 150,
        enabled: true
      };

      // For a 20s timer with 30s ramp start:
      // t = 1 - (20000 / 30000) = 1 - 0.667 = 0.333
      // interval = 1000 + 0.333 * (150 - 1000) = 1000 + 0.333 * (-850) = 1000 - 283.33 = 716.67
      const interval = getBeepInterval(20000, shortRoundConfig);
      expect(interval).toBeCloseTo(716.67, 1);
    });

    it('should produce monotonically decreasing intervals', () => {
      const intervals: number[] = [];
      
      // Sample intervals from 20s down to 1s
      for (let ms = 20000; ms >= 1000; ms -= 1000) {
        const interval = getBeepInterval(ms, defaultConfig);
        intervals.push(interval);
      }

      // Each interval should be <= the previous one
      for (let i = 1; i < intervals.length; i++) {
        expect(intervals[i]).toBeLessThanOrEqual(intervals[i - 1]);
      }
    });
  });

  describe('shouldBeepRampBeActive', () => {
    const defaultConfig: BeepConfig = {
      rampStartMs: 20000,
      firstInterval: 1000,
      finalInterval: 150,
      enabled: true
    };

    it('should return false when beep ramp is disabled', () => {
      const disabledConfig: BeepConfig = {
        ...defaultConfig,
        enabled: false
      };

      expect(shouldBeepRampBeActive(10000, disabledConfig)).toBe(false);
      expect(shouldBeepRampBeActive(5000, disabledConfig)).toBe(false);
    });

    it('should return false when remaining time is above ramp start', () => {
      expect(shouldBeepRampBeActive(25000, defaultConfig)).toBe(false);
      expect(shouldBeepRampBeActive(30000, defaultConfig)).toBe(false);
    });

    it('should return false when remaining time is 0 or negative', () => {
      expect(shouldBeepRampBeActive(0, defaultConfig)).toBe(false);
      expect(shouldBeepRampBeActive(-1000, defaultConfig)).toBe(false);
    });

    it('should return true when in ramp period with enabled config', () => {
      expect(shouldBeepRampBeActive(20000, defaultConfig)).toBe(true);
      expect(shouldBeepRampBeActive(10000, defaultConfig)).toBe(true);
      expect(shouldBeepRampBeActive(1000, defaultConfig)).toBe(true);
      expect(shouldBeepRampBeActive(100, defaultConfig)).toBe(true);
    });

    it('should handle edge case at exact ramp start time', () => {
      expect(shouldBeepRampBeActive(20000, defaultConfig)).toBe(true);
    });
  });

  describe('Integration tests', () => {
    it('should work correctly for typical 60s game scenario', () => {
      const config: BeepConfig = {
        rampStartMs: 20000, // Start beeping at 20s remaining
        firstInterval: 1000, // 1s initial interval
        finalInterval: 150,  // 150ms final interval
        enabled: true
      };

      // Before ramp: no beeping
      expect(shouldBeepRampBeActive(30000, config)).toBe(false);
      expect(getBeepInterval(30000, config)).toBe(Infinity);

      // At ramp start: first interval
      expect(shouldBeepRampBeActive(20000, config)).toBe(true);
      expect(getBeepInterval(20000, config)).toBeCloseTo(1000, 1);

      // Mid-ramp: interpolated interval
      expect(shouldBeepRampBeActive(10000, config)).toBe(true);
      const midInterval = getBeepInterval(10000, config);
      expect(midInterval).toBeGreaterThan(150);
      expect(midInterval).toBeLessThan(1000);

      // Near end: closer to final interval but not exactly final
      expect(shouldBeepRampBeActive(1000, config)).toBe(true);
      // t = 1 - (1000 / 20000) = 1 - 0.05 = 0.95
      // interval = 1000 + 0.95 * (150 - 1000) = 1000 + 0.95 * (-850) = 1000 - 807.5 = 192.5
      expect(getBeepInterval(1000, config)).toBeCloseTo(192.5, 1);

      // At end: no more beeps
      expect(shouldBeepRampBeActive(0, config)).toBe(false);
      expect(getBeepInterval(0, config)).toBe(Infinity);
    });

    it('should handle very short games correctly', () => {
      const config: BeepConfig = {
        rampStartMs: 20000, // Ramp longer than game
        firstInterval: 1000,
        finalInterval: 150,
        enabled: true
      };

      // 10s game should be partially through ramp
      expect(shouldBeepRampBeActive(10000, config)).toBe(true);
      // t = 1 - (10000 / 20000) = 1 - 0.5 = 0.5
      // interval = 1000 + 0.5 * (150 - 1000) = 1000 + 0.5 * (-850) = 1000 - 425 = 575
      const interval = getBeepInterval(10000, config);
      expect(interval).toBeCloseTo(575, 1);
    });
  });
}); 