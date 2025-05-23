import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBeepAudio } from './useBeepAudio';

// Mock functions declared at top level
const mockPlay = vi.fn();
const mockStop = vi.fn();
const mockPreloadSound = vi.fn();

// Mock the useAudio hook
vi.mock('./useAudio', () => ({
  useAudio: vi.fn(() => ({
    play: mockPlay,
    stop: mockStop,
    preloadSound: mockPreloadSound,
    isLoaded: true
  }))
}));

describe('useBeepAudio Hook', () => {
  beforeEach(() => {
    mockPlay.mockClear();
    mockStop.mockClear();
    mockPreloadSound.mockClear();
    
    mockPlay.mockResolvedValue(undefined);
    mockPreloadSound.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default options', () => {
      const { result } = renderHook(() => useBeepAudio());
      
      expect(typeof result.current.playBeep).toBe('function');
      expect(typeof result.current.stopBeep).toBe('function');
      expect(typeof result.current.preloadBeep).toBe('function');
      expect(result.current.isLoaded).toBe(true);
    });

    it('should accept custom volume and enabled options', async () => {
      const { useAudio } = await import('./useAudio');
      
      renderHook(() => useBeepAudio({ volume: 0.8, enabled: false }));
      
      // Check that useAudio was called with correct parameters
      expect(useAudio).toHaveBeenCalledWith('beep', {
        type: 'beep',
        volume: 0.8,
        preload: true
      });
    });
  });

  describe('Beep Playback', () => {
    it('should play beep when enabled', async () => {
      const { result } = renderHook(() => useBeepAudio({ enabled: true }));
      
      await act(async () => {
        await result.current.playBeep();
      });
      
      expect(mockPlay).toHaveBeenCalledTimes(1);
    });

    it('should not play beep when disabled', async () => {
      const { result } = renderHook(() => useBeepAudio({ enabled: false }));
      
      await act(async () => {
        await result.current.playBeep();
      });
      
      expect(mockPlay).not.toHaveBeenCalled();
    });

    it('should handle play errors gracefully', async () => {
      mockPlay.mockRejectedValueOnce(new Error('Audio context error'));
      const { result } = renderHook(() => useBeepAudio());
      
      // Should not throw error
      await act(async () => {
        await expect(result.current.playBeep()).resolves.toBeUndefined();
      });
      
      expect(mockPlay).toHaveBeenCalledTimes(1);
    });

    it('should support rapid-fire beep calls', async () => {
      const { result } = renderHook(() => useBeepAudio());
      
      // Fire multiple beeps in quick succession
      await act(async () => {
        const promises = [];
        for (let i = 0; i < 5; i++) {
          promises.push(result.current.playBeep());
        }
        await Promise.all(promises);
      });
      
      expect(mockPlay).toHaveBeenCalledTimes(5);
    });
  });

  describe('Beep Control', () => {
    it('should stop beep when requested', () => {
      const { result } = renderHook(() => useBeepAudio());
      
      act(() => {
        result.current.stopBeep();
      });
      
      expect(mockStop).toHaveBeenCalledTimes(1);
    });

    it('should preload beep sound', async () => {
      const { result } = renderHook(() => useBeepAudio());
      
      await act(async () => {
        await result.current.preloadBeep();
      });
      
      expect(mockPreloadSound).toHaveBeenCalledTimes(1);
    });
  });

  describe('Volume Control', () => {
    it('should use default volume when not specified', async () => {
      const { useAudio } = await import('./useAudio');
      
      renderHook(() => useBeepAudio());
      
      expect(useAudio).toHaveBeenCalledWith('beep', {
        type: 'beep',
        volume: 0.6, // Default volume
        preload: true
      });
    });

    it('should use custom volume when specified', async () => {
      const { useAudio } = await import('./useAudio');
      
      renderHook(() => useBeepAudio({ volume: 0.9 }));
      
      expect(useAudio).toHaveBeenCalledWith('beep', {
        type: 'beep',
        volume: 0.9,
        preload: true
      });
    });
  });

  describe('State Management', () => {
    it('should update behavior when enabled state changes', async () => {
      const { result, rerender } = renderHook(
        ({ enabled }) => useBeepAudio({ enabled }),
        { initialProps: { enabled: true } }
      );
      
      // Play beep while enabled
      await act(async () => {
        await result.current.playBeep();
      });
      expect(mockPlay).toHaveBeenCalledTimes(1);
      
      // Disable and try to play again
      rerender({ enabled: false });
      
      await act(async () => {
        await result.current.playBeep();
      });
      
      // Should not have called play again
      expect(mockPlay).toHaveBeenCalledTimes(1);
    });

    it('should handle preload setting correctly', async () => {
      const { useAudio } = await import('./useAudio');
      
      renderHook(() => useBeepAudio());
      
      expect(useAudio).toHaveBeenCalledWith('beep', 
        expect.objectContaining({
          preload: true // Always preload for beeps
        })
      );
    });
  });

  describe('Integration', () => {
    it('should work with rapid beep sequences like countdown timer', async () => {
      const { result } = renderHook(() => useBeepAudio());
      
      // Simulate countdown beep sequence
      const beepIntervals = [1000, 800, 600, 400, 200]; // Decreasing intervals
      
      for (const interval of beepIntervals) {
        await act(async () => {
          await result.current.playBeep();
        });
        
        // In real usage, there would be a delay here
        // but for testing we just verify the calls happen
      }
      
      expect(mockPlay).toHaveBeenCalledTimes(beepIntervals.length);
    });

    it('should handle disabled state during beep sequence', async () => {
      const { result, rerender } = renderHook(
        ({ enabled }) => useBeepAudio({ enabled }),
        { initialProps: { enabled: true } }
      );
      
      // Start beep sequence
      await act(async () => {
        await result.current.playBeep();
      });
      expect(mockPlay).toHaveBeenCalledTimes(1);
      
      // Disable mid-sequence
      rerender({ enabled: false });
      
      // Try to play more beeps
      await act(async () => {
        await result.current.playBeep();
        await result.current.playBeep();
      });
      
      // Should not have played additional beeps
      expect(mockPlay).toHaveBeenCalledTimes(1);
      
      // Should still be able to stop
      act(() => {
        result.current.stopBeep();
      });
      expect(mockStop).toHaveBeenCalledTimes(1);
    });
  });
}); 