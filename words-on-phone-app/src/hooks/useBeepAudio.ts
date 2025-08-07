import { useRef, useCallback } from 'react';

interface BeepAudioOptions {
  volume: number;
  enabled: boolean;
}

export const useBeepAudio = (options: BeepAudioOptions) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const tickTockStateRef = useRef<boolean>(false); // false = tick, true = tock
  const lastBeepTimeRef = useRef<number>(0); // Track last beep to prevent rapid fire

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

    // Mobile safeguard: prevent beeps that are too close together (minimum 30ms apart)
    const now = performance.now();
    if (now - lastBeepTimeRef.current < 30) {
      return;
    }
    lastBeepTimeRef.current = now;

    try {
      initializeAudio();
      
      if (!audioContextRef.current || !gainNodeRef.current) {
        throw new Error('Audio context not initialized');
      }

      // Mobile-specific: Ensure audio context is running
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      // Double-check context is running before proceeding
      if (audioContextRef.current.state !== 'running') {
        console.warn('Audio context not running, skipping beep');
        return;
      }

      // Set volume
      gainNodeRef.current.gain.value = options.volume;

      // Create oscillator for metronome-like tick sound
      const oscillator = audioContextRef.current.createOscillator();
      const envelope = audioContextRef.current.createGain();
      
      // Connect: oscillator -> envelope -> main gain -> destination
      oscillator.connect(envelope);
      envelope.connect(gainNodeRef.current);
      
      // Alternate between tick (higher, woody) and tock (lower, woody) sounds
      const isTick = !tickTockStateRef.current;
      
      // More metronome-like frequencies - closer together, less piercing
      const frequency = isTick ? 800 : 600; // Tick slightly higher, tock lower
      
      // Use a triangle wave for a softer, more wooden sound
      oscillator.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime);
      oscillator.type = 'triangle'; // Softer than sine, much softer than square
      
      // Create a gentle envelope for a more natural tick sound
      const now = audioContextRef.current.currentTime;
      const duration = 0.12; // Slightly longer for more natural sound
      
      // Quick attack, gentle decay - like a wooden metronome
      envelope.gain.setValueAtTime(0, now);
      envelope.gain.linearRampToValueAtTime(0.8, now + 0.005); // Quick attack
      envelope.gain.exponentialRampToValueAtTime(0.1, now + 0.04); // Quick initial decay
      envelope.gain.exponentialRampToValueAtTime(0.001, now + duration); // Gentle tail
      
      // Start and stop
      oscillator.start(now);
      oscillator.stop(now + duration);
      
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