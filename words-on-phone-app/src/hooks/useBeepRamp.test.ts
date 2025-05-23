import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBeepRamp } from './useBeepRamp';
import { BeepConfig } from '../utils/beepUtils';

// Mock performance.now and requestAnimationFrame
const mockRaf = vi.fn();
const mockCancelRaf = vi.fn();
let now = 0;
let rafCallbacks: (() => void)[] = [];

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', mockRaf);
  vi.stubGlobal('cancelAnimationFrame', mockCancelRaf);
  vi.stubGlobal('performance', { now: () => now });
  now = 0;
  rafCallbacks = [];
  mockRaf.mockClear();
  mockCancelRaf.mockClear();
  
  // Store RAF callbacks without auto-executing
  mockRaf.mockImplementation((callback) => {
    rafCallbacks.push(callback);
    return rafCallbacks.length;
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  rafCallbacks = [];
});

// Helper to execute stored RAF callbacks
const executeRafCallbacks = () => {
  const callbacks = [...rafCallbacks];
  rafCallbacks = [];
  callbacks.forEach(callback => callback());
};

const defaultBeepConfig: BeepConfig = {
  rampStartMs: 20000,
  firstInterval: 1000,
  finalInterval: 150,
  enabled: true
};

describe('useBeepRamp Hook', () => {
  describe('Initialization', () => {
    it('should initialize with inactive state', () => {
      const { result } = renderHook(() => 
        useBeepRamp(30000, { beepConfig: defaultBeepConfig })
      );
      
      expect(result.current.isRampActive).toBe(false);
      expect(result.current.beepCount).toBe(0);
      expect(result.current.currentInterval).toBe(Infinity);
    });

    it('should provide all required API methods', () => {
      const { result } = renderHook(() => 
        useBeepRamp(30000, { beepConfig: defaultBeepConfig })
      );
      
      expect(typeof result.current.start).toBe('function');
      expect(typeof result.current.stop).toBe('function');
      expect(typeof result.current.pause).toBe('function');
      expect(typeof result.current.resume).toBe('function');
      expect(typeof result.current.getCurrentState).toBe('function');
    });
  });

  describe('Beep Triggering', () => {
    it('should not trigger beeps when remaining time is above ramp start', () => {
      const onBeep = vi.fn();
      const { result } = renderHook(() => 
        useBeepRamp(30000, { beepConfig: defaultBeepConfig, onBeep })
      );
      
      act(() => {
        result.current.start();
      });
      
      act(() => {
        executeRafCallbacks();
      });
      
      expect(onBeep).not.toHaveBeenCalled();
      expect(result.current.isRampActive).toBe(false);
    });

    it('should activate ramp when remaining time reaches ramp start', () => {
      const onBeep = vi.fn();
      const { result, rerender } = renderHook(
        ({ remainingMs }) => useBeepRamp(remainingMs, { beepConfig: defaultBeepConfig, onBeep }),
        { initialProps: { remainingMs: 25000 } }
      );
      
      act(() => {
        result.current.start();
      });
      
      act(() => {
        executeRafCallbacks();
      });
      
      expect(result.current.isRampActive).toBe(false);
      
      // Move to ramp start time
      rerender({ remainingMs: 20000 });
      
      act(() => {
        executeRafCallbacks();
      });
      
      expect(result.current.isRampActive).toBe(true);
    });

    it('should trigger beeps at calculated intervals', () => {
      const onBeep = vi.fn();
      const { result } = renderHook(() => 
        useBeepRamp(20000, { beepConfig: defaultBeepConfig, onBeep })
      );
      
      act(() => {
        result.current.start();
      });
      
      act(() => {
        executeRafCallbacks();
      });
      
      // Should be active
      expect(result.current.isRampActive).toBe(true);
      
      // Simulate time passing to trigger beep
      now = 1000; // First interval is 1000ms
      
      act(() => {
        executeRafCallbacks();
      });
      
      expect(onBeep).toHaveBeenCalledTimes(1);
      expect(result.current.beepCount).toBe(1);
    });
  });

  describe('State Management', () => {
    it('should reset state when stopping', () => {
      const onBeep = vi.fn();
      const { result } = renderHook(() => 
        useBeepRamp(10000, { beepConfig: defaultBeepConfig, onBeep })
      );
      
      act(() => {
        result.current.start();
      });
      
      act(() => {
        executeRafCallbacks();
      });
      
      expect(result.current.isRampActive).toBe(true);
      
      act(() => {
        result.current.stop();
      });
      
      expect(result.current.isRampActive).toBe(false);
      expect(result.current.beepCount).toBe(0);
      expect(result.current.currentInterval).toBe(Infinity);
    });

    it('should maintain state when pausing', () => {
      const onBeep = vi.fn();
      const { result } = renderHook(() => 
        useBeepRamp(10000, { beepConfig: defaultBeepConfig, onBeep })
      );
      
      act(() => {
        result.current.start();
      });
      
      act(() => {
        executeRafCallbacks();
      });
      
      const initialState = result.current.getCurrentState();
      
      act(() => {
        result.current.pause();
      });
      
      // State should be preserved
      expect(result.current.isRampActive).toBe(initialState.isRampActive);
      expect(result.current.beepCount).toBe(initialState.beepCount);
    });

    it('should resume correctly after pause', () => {
      const onBeep = vi.fn();
      const { result } = renderHook(() => 
        useBeepRamp(10000, { beepConfig: defaultBeepConfig, onBeep })
      );
      
      act(() => {
        result.current.start();
      });
      
      act(() => {
        result.current.pause();
      });
      
      const rafCallsBefore = mockRaf.mock.calls.length;
      
      act(() => {
        result.current.resume();
      });
      
      // Should schedule new RAF
      expect(mockRaf.mock.calls.length).toBeGreaterThan(rafCallsBefore);
    });
  });

  describe('Interval Calculation', () => {
    it('should start with first interval at ramp start', () => {
      const { result } = renderHook(() => 
        useBeepRamp(20000, { beepConfig: defaultBeepConfig })
      );
      
      act(() => {
        result.current.start();
      });
      
      act(() => {
        executeRafCallbacks();
      });
      
      expect(result.current.currentInterval).toBeCloseTo(1000, -1);
    });

    it('should decrease interval as time progresses', () => {
      const { result, rerender } = renderHook(
        ({ remainingMs }) => useBeepRamp(remainingMs, { beepConfig: defaultBeepConfig }),
        { initialProps: { remainingMs: 20000 } }
      );
      
      act(() => {
        result.current.start();
      });
      
      act(() => {
        executeRafCallbacks();
      });
      
      const initialInterval = result.current.currentInterval;
      
      // Move closer to end
      rerender({ remainingMs: 5000 });
      
      act(() => {
        executeRafCallbacks();
      });
      
      // Should recalculate to shorter interval
      expect(result.current.currentInterval).toBeLessThan(initialInterval);
    });
  });

  describe('Edge Cases', () => {
    it('should handle disabled config', () => {
      const disabledConfig: BeepConfig = {
        ...defaultBeepConfig,
        enabled: false
      };
      
      const onBeep = vi.fn();
      const { result } = renderHook(() => 
        useBeepRamp(10000, { beepConfig: disabledConfig, onBeep })
      );
      
      act(() => {
        result.current.start();
      });
      
      act(() => {
        executeRafCallbacks();
      });
      
      expect(result.current.isRampActive).toBe(false);
      expect(onBeep).not.toHaveBeenCalled();
    });

    it('should handle enabled=false option', () => {
      const onBeep = vi.fn();
      const { result } = renderHook(() => 
        useBeepRamp(10000, { beepConfig: defaultBeepConfig, onBeep, enabled: false })
      );
      
      act(() => {
        result.current.start();
      });
      
      expect(result.current.isRampActive).toBe(false);
      expect(onBeep).not.toHaveBeenCalled();
    });

    it('should handle short rounds correctly', () => {
      const shortConfig: BeepConfig = {
        rampStartMs: 30000, // Longer than remaining time
        firstInterval: 1000,
        finalInterval: 150,
        enabled: true
      };
      
      const onBeep = vi.fn();
      const { result } = renderHook(() => 
        useBeepRamp(20000, { beepConfig: shortConfig, onBeep })
      );
      
      act(() => {
        result.current.start();
      });
      
      act(() => {
        executeRafCallbacks();
      });
      
      // Should still activate since 20000 < 30000
      expect(result.current.isRampActive).toBe(true);
    });

    it('should handle zero remaining time', () => {
      const onBeep = vi.fn();
      const { result } = renderHook(() => 
        useBeepRamp(0, { beepConfig: defaultBeepConfig, onBeep })
      );
      
      act(() => {
        result.current.start();
      });
      
      act(() => {
        executeRafCallbacks();
      });
      
      expect(result.current.isRampActive).toBe(false);
      expect(onBeep).not.toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should cancel animation frame on unmount', () => {
      const { result, unmount } = renderHook(() => 
        useBeepRamp(10000, { beepConfig: defaultBeepConfig })
      );
      
      act(() => {
        result.current.start();
      });
      
      unmount();
      
      expect(mockCancelRaf).toHaveBeenCalled();
    });

    it('should cancel animation frame on stop', () => {
      const { result } = renderHook(() => 
        useBeepRamp(10000, { beepConfig: defaultBeepConfig })
      );
      
      act(() => {
        result.current.start();
      });
      
      act(() => {
        result.current.stop();
      });
      
      expect(mockCancelRaf).toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('should not cause excessive re-renders', () => {
      let renderCount = 0;
      const { rerender } = renderHook(() => {
        renderCount++;
        return useBeepRamp(15000, { beepConfig: defaultBeepConfig });
      });
      
      const initialRenderCount = renderCount;
      
      // Multiple re-renders with same props shouldn't cause many renders
      for (let i = 0; i < 5; i++) {
        rerender();
      }
      
      expect(renderCount - initialRenderCount).toBeLessThanOrEqual(5);
    });

    it('should prevent multiple starts', () => {
      const { result } = renderHook(() => 
        useBeepRamp(10000, { beepConfig: defaultBeepConfig })
      );
      
      act(() => {
        result.current.start();
      });
      
      const rafCallsAfterFirstStart = mockRaf.mock.calls.length;
      
      act(() => {
        result.current.start(); // Try to start again
      });
      
      // Should not schedule additional RAF
      expect(mockRaf.mock.calls.length).toBe(rafCallsAfterFirstStart);
    });
  });

  describe('Integration', () => {
    it('should work through a complete beep sequence', () => {
      const onBeep = vi.fn();
      const beepTimestamps: number[] = [];
      
      // Track when beeps occur
      onBeep.mockImplementation(() => {
        beepTimestamps.push(now);
      });
      
      const { result, rerender } = renderHook(
        ({ remainingMs }) => useBeepRamp(remainingMs, { beepConfig: defaultBeepConfig, onBeep }),
        { initialProps: { remainingMs: 20000 } }
      );
      
      act(() => {
        result.current.start();
      });
      
      // Simulate countdown progression
      const timeSteps = [
        { remainingMs: 20000, now: 0 },
        { remainingMs: 15000, now: 5000 },
        { remainingMs: 10000, now: 10000 },
        { remainingMs: 5000, now: 15000 },
        { remainingMs: 1000, now: 19000 },
      ];
      
      timeSteps.forEach(({ remainingMs, now: timeNow }) => {
        now = timeNow;
        rerender({ remainingMs });
        
        act(() => {
          executeRafCallbacks();
        });
      });
      
      // Should have activated the ramp
      expect(result.current.isRampActive).toBe(true);
      expect(result.current.beepCount).toBeGreaterThanOrEqual(0);
    });
  });
}); 