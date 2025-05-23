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
}

// Global audio context to prevent multiple instances
let globalAudioContext: AudioContext | null = null;

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
  const { volume = 0.8, preload = true } = options;
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const isLoadedRef = useRef(false);

  // Create synthetic buzzer sounds using Web Audio API
  const createBuzzerSound = useCallback(async (type: string): Promise<AudioBuffer> => {
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

      switch (type) {
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
      createBuzzerSound(soundName)
        .then(buffer => {
          audioBufferRef.current = buffer;
          isLoadedRef.current = true;
        })
        .catch(error => {
          console.warn('Failed to create audio buffer:', error);
        });
    }
  }, [soundName, preload, createBuzzerSound]);

  const play = useCallback(async () => {
    try {
      const ctx = await getAudioContext();

      // Create or use existing buffer
      let buffer = audioBufferRef.current;
      if (!buffer) {
        buffer = await createBuzzerSound(soundName);
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

      // Play sound
      source.start(0);

      return Promise.resolve();
    } catch (error) {
      console.warn('Failed to play audio:', error);
      return Promise.reject(error);
    }
  }, [soundName, volume, createBuzzerSound]);

  const preloadSound = useCallback(async () => {
    if (!isLoadedRef.current) {
      try {
        const buffer = await createBuzzerSound(soundName);
        audioBufferRef.current = buffer;
        isLoadedRef.current = true;
      } catch (error) {
        console.warn('Failed to preload audio:', error);
      }
    }
  }, [soundName, createBuzzerSound]);

  // No cleanup effect needed since we're using a global context
  // The browser will handle cleanup when the tab/window closes

  return {
    play,
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