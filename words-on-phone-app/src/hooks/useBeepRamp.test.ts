import { renderHook } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useBeepRamp } from './useBeepRamp';

describe('useBeepRamp', () => {
  let mockOnBeep: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnBeep = vi.fn();
    vi.spyOn(performance, 'now').mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const defaultBeepConfig = {
    rampStartMs: 20000, // 20 seconds
    firstInterval: 1000, // 1 second
    finalInterval: 150   // 150ms
  };

  it('should not be active when remaining time is above ramp start', () => {
    const { result } = renderHook(() => useBeepRamp({
      remainingMs: 25000, // 25 seconds
      beepConfig: defaultBeepConfig,
      enabled: true,
      onBeep: mockOnBeep
    }));

    expect(result.current.isBeepRampActive).toBe(false);
    expect(mockOnBeep).not.toHaveBeenCalled();
  });

  it('should become active when remaining time enters ramp zone', () => {
    const { result, rerender } = renderHook(
      ({ remainingMs }) => useBeepRamp({
        remainingMs,
        beepConfig: defaultBeepConfig,
        enabled: true,
        onBeep: mockOnBeep
      }),
      { initialProps: { remainingMs: 25000 } }
    );

    expect(result.current.isBeepRampActive).toBe(false);

    // Enter ramp zone
    rerender({ remainingMs: 20000 });
    expect(result.current.isBeepRampActive).toBe(true);
  });

  it('should trigger first beep immediately when entering ramp zone', () => {
    const { rerender } = renderHook(
      ({ remainingMs }) => useBeepRamp({
        remainingMs,
        beepConfig: defaultBeepConfig,
        enabled: true,
        onBeep: mockOnBeep
      }),
      { initialProps: { remainingMs: 25000 } }
    );

    // Enter ramp zone
    rerender({ remainingMs: 20000 });
    expect(mockOnBeep).toHaveBeenCalledTimes(1);
  });

  it('should calculate interval interpolation correctly', () => {
    const currentTime = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => currentTime);

    const { result, rerender } = renderHook(
      ({ remainingMs }) => useBeepRamp({
        remainingMs,
        beepConfig: defaultBeepConfig,
        enabled: true,
        onBeep: mockOnBeep
      }),
      { initialProps: { remainingMs: 25000 } }
    );

    // At start of ramp (20s remaining) - should use first interval
    rerender({ remainingMs: 20000 });
    expect(result.current.currentInterval).toBe(1000);

    // At middle of ramp (10s remaining) - should be interpolated
    rerender({ remainingMs: 10000 });
    expect(result.current.currentInterval).toBeGreaterThan(150);
    expect(result.current.currentInterval).toBeLessThan(1000);

    // Near end of ramp (1s remaining) - should be close to final interval
    rerender({ remainingMs: 1000 });
    // At 1000ms remaining out of 20000ms ramp: t = 1 - (1000/20000) = 0.95
    // lerp(1000, 150, 0.95) = 1000 + (150-1000) * 0.95 = 1000 - 807.5 = 192.5
    expect(result.current.currentInterval).toBeCloseTo(192.5, 1);
  });

  it('should not beep when disabled', () => {
    const { rerender } = renderHook(
      ({ enabled }) => useBeepRamp({
        remainingMs: 15000,
        beepConfig: defaultBeepConfig,
        enabled,
        onBeep: mockOnBeep
      }),
      { initialProps: { enabled: false } }
    );

    expect(mockOnBeep).not.toHaveBeenCalled();

    // Enable beeps
    rerender({ enabled: true });
    expect(mockOnBeep).toHaveBeenCalledTimes(1);
  });

  it('should reset state when exiting ramp zone', () => {
    const { result, rerender } = renderHook(
      ({ remainingMs }) => useBeepRamp({
        remainingMs,
        beepConfig: defaultBeepConfig,
        enabled: true,
        onBeep: mockOnBeep
      }),
      { initialProps: { remainingMs: 15000 } }
    );

    expect(result.current.isBeepRampActive).toBe(true);
    expect(mockOnBeep).toHaveBeenCalledTimes(1);

    // Exit ramp zone
    rerender({ remainingMs: 25000 });
    expect(result.current.isBeepRampActive).toBe(false);

    // Re-enter ramp zone should trigger first beep again
    rerender({ remainingMs: 15000 });
    expect(mockOnBeep).toHaveBeenCalledTimes(2);
  });

  it('should handle edge case of zero remaining time', () => {
    const { result } = renderHook(() => useBeepRamp({
      remainingMs: 0,
      beepConfig: defaultBeepConfig,
      enabled: true,
      onBeep: mockOnBeep
    }));

    expect(result.current.isBeepRampActive).toBe(false);
    expect(mockOnBeep).not.toHaveBeenCalled();
  });

  it('should clamp interpolation values correctly', () => {
    const { result } = renderHook(() => useBeepRamp({
      remainingMs: -1000, // Negative time
      beepConfig: defaultBeepConfig,
      enabled: true,
      onBeep: mockOnBeep
    }));

    // Should handle negative time gracefully
    expect(result.current.currentInterval).toBe(150); // Should clamp to final interval
  });
}); 