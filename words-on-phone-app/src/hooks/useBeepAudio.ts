import { useRef, useCallback } from 'react';

interface BeepAudioOptions {
  volume: number;
  enabled: boolean;
}

export const useBeepAudio = (options: BeepAudioOptions) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const tickTockStateRef = useRef<boolean>(false); // false = tick, true = tock

  const initializeAudio = useCallback(() => {
    if (!audioContextRef.current) {
      // Use webkitAudioContext for Safari compatibility
      const AudioContextClass = window.AudioContext || 
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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

      // Create oscillator for tick-tock sound
      const oscillator = audioContextRef.current.createOscillator();
      oscillator.connect(gainNodeRef.current);
      
      // Alternate between tick (higher) and tock (lower) frequencies
      const isTick = !tickTockStateRef.current;
      const frequency = isTick ? 1200 : 800; // Tick is higher, tock is lower
      
      // Configure sound
      oscillator.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime);
      oscillator.type = 'sine'; // Softer than square wave
      
      // Play for 80ms - shorter and sharper
      const duration = 0.08;
      oscillator.start(audioContextRef.current.currentTime);
      oscillator.stop(audioContextRef.current.currentTime + duration);
      
      // Toggle tick-tock state for next call
      tickTockStateRef.current = !tickTockStateRef.current;
      
    } catch (error) {
      console.warn('Failed to play tick-tock:', error);
      throw error;
    }
  }, [options.volume, options.enabled, initializeAudio]);

  return {
    playBeep
  };
}; 