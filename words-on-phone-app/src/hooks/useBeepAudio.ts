import { useRef, useCallback } from 'react';

interface BeepAudioOptions {
  volume: number;
  enabled: boolean;
}

export const useBeepAudio = (options: BeepAudioOptions) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  const initializeAudio = useCallback(() => {
    if (!audioContextRef.current) {
      // Use webkitAudioContext for Safari compatibility
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
      
      // Create gain node for volume control
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.connect(audioContextRef.current.destination);
    }
    
    // Resume context if suspended (browser autoplay policy)
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  }, []);

  const playBeep = useCallback(async () => {
    if (!options.enabled) return;

    try {
      initializeAudio();
      
      if (!audioContextRef.current || !gainNodeRef.current) {
        throw new Error('Audio context not initialized');
      }

      // Set volume
      gainNodeRef.current.gain.value = options.volume;

      // Create oscillator for beep sound
      const oscillator = audioContextRef.current.createOscillator();
      oscillator.connect(gainNodeRef.current);
      
      // Configure beep sound (short, sharp tone)
      oscillator.frequency.setValueAtTime(800, audioContextRef.current.currentTime);
      oscillator.type = 'square';
      
      // Play for 100ms
      const duration = 0.1;
      oscillator.start(audioContextRef.current.currentTime);
      oscillator.stop(audioContextRef.current.currentTime + duration);
      
    } catch (error) {
      console.warn('Failed to play beep:', error);
      throw error;
    }
  }, [options.volume, options.enabled, initializeAudio]);

  return {
    playBeep
  };
}; 