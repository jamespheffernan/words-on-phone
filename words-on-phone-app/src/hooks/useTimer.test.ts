import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTimer } from './useTimer';

describe('Timer Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with correct time remaining', () => {
    const { result } = renderHook(() => 
      useTimer({ duration: 60 })
    );
    
    expect(result.current.timeRemaining).toBe(60);
    expect(result.current.isRunning).toBe(false);
    expect(result.current.isPaused).toBe(false);
  });

  it('should start and stop timer correctly', () => {
    const onComplete = vi.fn();
    
    const { result } = renderHook(() => 
      useTimer({ duration: 3, onComplete })
    );
    
    // Start timer
    act(() => {
      result.current.start();
    });
    
    expect(result.current.isRunning).toBe(true);
    
    // Stop timer
    act(() => {
      result.current.stop();
    });
    
    expect(result.current.isRunning).toBe(false);
    expect(result.current.timeRemaining).toBe(3);
  });

  it('should pause and resume correctly', () => {
    const { result } = renderHook(() => 
      useTimer({ duration: 5 })
    );
    
    // Start timer
    act(() => {
      result.current.start();
    });
    expect(result.current.isRunning).toBe(true);
    expect(result.current.isPaused).toBe(false);
    
    // Pause timer
    act(() => {
      result.current.pause();
    });
    expect(result.current.isRunning).toBe(true);
    expect(result.current.isPaused).toBe(true);
    
    // Resume timer
    act(() => {
      result.current.resume();
    });
    expect(result.current.isRunning).toBe(true);
    expect(result.current.isPaused).toBe(false);
  });

  it('should reset timer to initial duration', () => {
    const { result } = renderHook(() => 
      useTimer({ duration: 10 })
    );
    
    // Start and then reset
    act(() => {
      result.current.start();
    });
    
    act(() => {
      result.current.reset();
    });
    
    expect(result.current.timeRemaining).toBe(10);
    expect(result.current.isRunning).toBe(false);
    expect(result.current.isPaused).toBe(false);
  });

  it('should update duration when changed', () => {
    const { result, rerender } = renderHook(
      ({ duration }) => useTimer({ duration }),
      { initialProps: { duration: 10 } }
    );
    
    expect(result.current.timeRemaining).toBe(10);
    
    // Change duration
    rerender({ duration: 20 });
    
    expect(result.current.timeRemaining).toBe(20);
  });

  it('should provide timer API functions', () => {
    const { result } = renderHook(() => 
      useTimer({ duration: 5 })
    );
    
    expect(typeof result.current.start).toBe('function');
    expect(typeof result.current.pause).toBe('function');
    expect(typeof result.current.resume).toBe('function');
    expect(typeof result.current.stop).toBe('function');
    expect(typeof result.current.reset).toBe('function');
    expect(typeof result.current.timeRemaining).toBe('number');
    expect(typeof result.current.isRunning).toBe('boolean');
    expect(typeof result.current.isPaused).toBe('boolean');
  });
}); 