import { useCallback } from 'react';
import { useAudio } from './useAudio';

interface UseBeepAudioOptions {
  volume?: number; // 0-1, independent of buzzer volume
  enabled?: boolean; // Master enable/disable for beeps
}

/**
 * Specialized hook for playing countdown beep sounds
 * Optimized for rapid-fire playback without overlap
 */
export const useBeepAudio = (options: UseBeepAudioOptions = {}) => {
  const { volume = 0.6, enabled = true } = options;

  // Create beep audio instance with optimized settings
  const beepAudio = useAudio('beep', {
    type: 'beep',
    volume,
    preload: true // Always preload beeps for minimal latency
  });

  // Wrapper that respects enabled setting
  const playBeep = useCallback(async () => {
    if (!enabled) {
      return Promise.resolve();
    }
    
    try {
      await beepAudio.play();
    } catch (error) {
      console.warn('Beep playback failed:', error);
      // Don't throw - beep failures shouldn't break game flow
    }
  }, [beepAudio, enabled]);

  // Stop any currently playing beep
  const stopBeep = useCallback(() => {
    beepAudio.stop();
  }, [beepAudio]);

  // Preload beep sound for better performance
  const preloadBeep = useCallback(async () => {
    await beepAudio.preloadSound();
  }, [beepAudio]);

  return {
    playBeep,
    stopBeep,
    preloadBeep,
    isLoaded: beepAudio.isLoaded
  };
}; 