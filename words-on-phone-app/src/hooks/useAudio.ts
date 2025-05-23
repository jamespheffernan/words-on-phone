import { useCallback, useRef, useEffect } from 'react';

// Extend Window interface for webkit audio context
declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

interface UseAudioOptions {
  volume?: number; // 0-1
  preload?: boolean;
  type?: 'buzzer' | 'beep'; // New: specify audio type
}

// Global audio context to prevent multiple instances
let globalAudioContext: AudioContext | null = null;

// Global source tracking for non-overlapping playback
const activeSources = new Map<string, AudioBufferSourceNode>();

const getAudioContext = async (): Promise<AudioContext> => {
  if (!globalAudioContext || globalAudioContext.state === 'closed') {
    globalAudioContext = new (window.AudioContext || window.webkitAudioContext!)();
  }
  
  // Resume context if suspended (required by browser autoplay policies)
  if (globalAudioContext.state === 'suspended') {
    await globalAudioContext.resume();
  }
  
  return globalAudioContext;
};

export const useAudio = (soundName: string, options: UseAudioOptions = {}) => {
  const { volume = 0.8, preload = true, type = 'buzzer' } = options;
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const isLoadedRef = useRef(false);
  const lastSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Create synthetic beep sounds for countdown timer
  const createBeepSound = useCallback(async (): Promise<AudioBuffer> => {
    const ctx = await getAudioContext();
    const sampleRate = ctx.sampleRate;
    const duration = 0.2; // Short 200ms beep
    const bufferLength = sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferLength, sampleRate);
    const channelData = buffer.getChannelData(0);

    // Generate sharp, attention-grabbing beep
    for (let i = 0; i < bufferLength; i++) {
      const t = i / sampleRate;
      
      // High-pitched tone (1200Hz) with quick decay
      const frequency = 1200;
      const sample = Math.sin(2 * Math.PI * frequency * t);
      
      // Quick attack, exponential decay envelope
      const attack = Math.min(1, t * 50); // 20ms attack
      const decay = Math.exp(-t * 8); // Fast decay
      const envelope = attack * decay;
      
      channelData[i] = sample * envelope * 0.4; // Moderate volume to avoid harshness
    }

    return buffer;
  }, []);

  // Create synthetic buzzer sounds using Web Audio API
  const createBuzzerSound = useCallback(async (buzzerType: string): Promise<AudioBuffer> => {
    const ctx = await getAudioContext();
    const sampleRate = ctx.sampleRate;
    const duration = 1.5; // 1.5 seconds
    const bufferLength = sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferLength, sampleRate);
    const channelData = buffer.getChannelData(0);

    // Generate different buzzer sounds based on type
    for (let i = 0; i < bufferLength; i++) {
      const t = i / sampleRate;
      let sample = 0;

      switch (buzzerType) {
        case 'classic':
          // Classic buzzer with falling frequency
          sample = Math.sin(2 * Math.PI * (800 - 400 * t) * t) * Math.exp(-t * 2);
          break;
        case 'airhorn':
          // Air horn effect
          sample = Math.sin(2 * Math.PI * 200 * t) * Math.exp(-t * 0.5);
          break;
        case 'alarm':
          // Alarm sound
          sample = Math.sin(2 * Math.PI * (400 + 200 * Math.sin(8 * Math.PI * t)) * t) * Math.exp(-t);
          break;
        case 'game-show':
          // Game show buzzer
          sample = Math.sin(2 * Math.PI * 150 * t) * (1 - Math.exp(-t * 10));
          break;
        case 'electronic':
          // Electronic beep
          sample = Math.sin(2 * Math.PI * 1000 * t) * Math.exp(-t * 3);
          break;
        default:
          // Default buzzer
          sample = Math.sin(2 * Math.PI * 600 * t) * Math.exp(-t * 1.5);
      }

      // Apply envelope to avoid clicking
      const envelope = Math.min(1, t * 10) * Math.min(1, (duration - t) * 10);
      channelData[i] = sample * envelope * 0.3; // Reduce volume to prevent distortion
    }

    return buffer;
  }, []);

  // Load sound
  useEffect(() => {
    if (preload && !isLoadedRef.current) {
      const createSound = type === 'beep' ? createBeepSound() : createBuzzerSound(soundName);
      
      createSound
        .then(buffer => {
          audioBufferRef.current = buffer;
          isLoadedRef.current = true;
        })
        .catch(error => {
          console.warn('Failed to create audio buffer:', error);
        });
    }
  }, [soundName, preload, type, createBuzzerSound, createBeepSound]);

  const play = useCallback(async () => {
    try {
      const ctx = await getAudioContext();

      // For beeps, stop any previous beep to prevent overlap
      if (type === 'beep') {
        const activeSource = activeSources.get('beep');
        if (activeSource) {
          try {
            activeSource.stop();
          } catch (e) {
            // Source may already be stopped, ignore error
          }
        }
        
        // Also stop the last source from this hook instance
        if (lastSourceRef.current) {
          try {
            lastSourceRef.current.stop();
          } catch (e) {
            // Source may already be stopped, ignore error
          }
        }
      }

      // Create or use existing buffer
      let buffer = audioBufferRef.current;
      if (!buffer) {
        if (type === 'beep') {
          buffer = await createBeepSound();
        } else {
          buffer = await createBuzzerSound(soundName);
        }
        audioBufferRef.current = buffer;
        isLoadedRef.current = true;
      }

      // Create source and gain nodes
      const source = ctx.createBufferSource();
      const gainNode = ctx.createGain();

      source.buffer = buffer;
      gainNode.gain.value = volume;

      // Connect: source -> gain -> destination
      source.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Track active source for non-overlapping playback
      if (type === 'beep') {
        activeSources.set('beep', source);
        lastSourceRef.current = source;
        
        // Clean up when source ends
        source.onended = () => {
          activeSources.delete('beep');
          if (lastSourceRef.current === source) {
            lastSourceRef.current = null;
          }
        };
      }

      // Play sound
      source.start(0);

      return Promise.resolve();
    } catch (error) {
      console.warn('Failed to play audio:', error);
      return Promise.reject(error);
    }
  }, [soundName, volume, type, createBuzzerSound, createBeepSound]);

  const preloadSound = useCallback(async () => {
    if (!isLoadedRef.current) {
      try {
        const buffer = type === 'beep' ? await createBeepSound() : await createBuzzerSound(soundName);
        audioBufferRef.current = buffer;
        isLoadedRef.current = true;
      } catch (error) {
        console.warn('Failed to preload audio:', error);
      }
    }
  }, [soundName, type, createBuzzerSound, createBeepSound]);

  // Stop any currently playing audio from this instance
  const stop = useCallback(() => {
    if (lastSourceRef.current) {
      try {
        lastSourceRef.current.stop();
      } catch (e) {
        // Source may already be stopped, ignore error
      }
      lastSourceRef.current = null;
    }
    
    if (type === 'beep') {
      const activeSource = activeSources.get('beep');
      if (activeSource) {
        try {
          activeSource.stop();
        } catch (e) {
          // Source may already be stopped, ignore error
        }
        activeSources.delete('beep');
      }
    }
  }, [type]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    play,
    stop,
    preloadSound,
    isLoaded: isLoadedRef.current
  };
};

// Available buzzer sound types
export const BUZZER_SOUNDS = {
  classic: 'Classic Buzzer',
  airhorn: 'Air Horn',
  alarm: 'Alarm',
  'game-show': 'Game Show',
  electronic: 'Electronic Beep',
  default: 'Default'
} as const;

export type BuzzerSoundType = keyof typeof BUZZER_SOUNDS; 