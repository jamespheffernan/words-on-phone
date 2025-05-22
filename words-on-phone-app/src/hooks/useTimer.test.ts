import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTimer } from './useTimer';

// Mock requestAnimationFrame and performance.now for controlled testing
const mockRaf = vi.fn();
const mockCancelRaf = vi.fn();
let now = 0;

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', mockRaf);
  vi.stubGlobal('cancelAnimationFrame', mockCancelRaf);
  vi.stubGlobal('performance', { now: () => now });
  now = 0;
  mockRaf.mockClear();
  mockCancelRaf.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Timer Hook', () => {
  it('should initialize with correct time remaining', () => {
    const { result } = renderHook(() => useTimer({ duration: 60 }));
    
    expect(result.current.timeRemaining).toBe(60);
    expect(result.current.isRunning).toBe(false);
    expect(result.current.isPaused).toBe(false);
  });

  it('should start and stop timer correctly', () => {
    const { result } = renderHook(() => useTimer({ duration: 60 }));
    
    act(() => {
      result.current.start();
    });
    
    expect(result.current.isRunning).toBe(true);
    expect(mockRaf).toHaveBeenCalled();
    
    act(() => {
      result.current.stop();
    });
    
    expect(result.current.isRunning).toBe(false);
    expect(result.current.timeRemaining).toBe(60);
  });

  it('should pause and resume correctly', () => {
    const { result } = renderHook(() => useTimer({ duration: 60 }));
    
    act(() => {
      result.current.start();
    });
    
    expect(result.current.isRunning).toBe(true);
    
    act(() => {
      result.current.pause();
    });
    
    expect(result.current.isRunning).toBe(true);
    expect(result.current.isPaused).toBe(true);
    
    act(() => {
      result.current.resume();
    });
    
    expect(result.current.isRunning).toBe(true);
    expect(result.current.isPaused).toBe(false);
  });

  it('should reset timer to initial duration', () => {
    const { result } = renderHook(() => useTimer({ duration: 60 }));
    
    act(() => {
      result.current.start();
    });
    
    act(() => {
      result.current.reset();
    });
    
    expect(result.current.timeRemaining).toBe(60);
    expect(result.current.isRunning).toBe(false);
    expect(result.current.isPaused).toBe(false);
  });

  it('should update duration when changed', () => {
    const { result, rerender } = renderHook(
      ({ duration }) => useTimer({ duration }),
      { initialProps: { duration: 60 } }
    );
    
    expect(result.current.timeRemaining).toBe(60);
    
    rerender({ duration: 90 });
    
    expect(result.current.timeRemaining).toBe(90);
  });

  it('should provide timer API functions', () => {
    const { result } = renderHook(() => useTimer({ duration: 60 }));
    
    expect(typeof result.current.start).toBe('function');
    expect(typeof result.current.pause).toBe('function');
    expect(typeof result.current.resume).toBe('function');
    expect(typeof result.current.stop).toBe('function');
    expect(typeof result.current.reset).toBe('function');
  });

  // New test for timer start functionality
  it('should start timer and trigger updates correctly', () => {
    const onTick = vi.fn();
    const onComplete = vi.fn();
    
    const { result } = renderHook(() => useTimer({ 
      duration: 5, // Short duration for testing
      onTick,
      onComplete 
    }));
    
    // Start the timer
    act(() => {
      result.current.start();
    });
    
    expect(result.current.isRunning).toBe(true);
    expect(result.current.isPaused).toBe(false);
    expect(mockRaf).toHaveBeenCalled();
    
    // Simulate time passing
    act(() => {
      now = 1000; // 1 second
      const rafCallback = mockRaf.mock.calls[0][0];
      rafCallback();
    });
    
    expect(result.current.timeRemaining).toBeLessThan(5);
    expect(onTick).toHaveBeenCalled();
  });

  it('should handle multiple start calls gracefully', () => {
    const { result } = renderHook(() => useTimer({ duration: 60 }));
    
    // Start timer
    act(() => {
      result.current.start();
    });
    
    expect(result.current.isRunning).toBe(true);
    const firstCallCount = mockRaf.mock.calls.length;
    
    // Try to start again
    act(() => {
      result.current.start();
    });
    
    // Should not call RAF again
    expect(mockRaf.mock.calls.length).toBe(firstCallCount);
    expect(result.current.isRunning).toBe(true);
  });
}); 