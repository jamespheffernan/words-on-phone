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

// Sound categories and types
export const SOUND_TYPES = {
  // UI Interaction Sounds
  ui: {
    'button-tap': 'Button Tap',
    'button-hover': 'Button Hover',
    'menu-open': 'Menu Open',
    'menu-close': 'Menu Close',
    'tab-switch': 'Tab Switch',
    'modal-open': 'Modal Open',
    'modal-close': 'Modal Close'
  },
  // Gameplay Sounds
  gameplay: {
    'correct-answer': 'Correct Answer',
    'skip-phrase': 'Skip Phrase',
    'round-start': 'Round Start',
    'team-transition': 'Team Transition',
    'timer-warning': 'Timer Warning',
    'timer-urgent': 'Timer Urgent'
  },
  // Alert/Feedback Sounds
  alerts: {
    'success': 'Success',
    'error': 'Error',
    'warning': 'Warning',
    'celebration': 'Celebration'
  },
  // Buzzer sounds (existing)
  buzzer: {
    'classic': 'Classic Buzzer',
    'airhorn': 'Air Horn',
    'alarm': 'Alarm',
    'game-show': 'Game Show',
    'electronic': 'Electronic Beep',
    'default': 'Default'
  }
} as const;

export type SoundCategory = keyof typeof SOUND_TYPES;
export type SoundType<T extends SoundCategory> = keyof typeof SOUND_TYPES[T];
export type BuzzerSoundType = SoundType<'buzzer'>;

export const useAudio = (soundCategory: SoundCategory, soundName: string, options: UseAudioOptions = {}) => {
  const { volume = 0.8, preload = true } = options;
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const isLoadedRef = useRef(false);

  // Create synthetic sounds using Web Audio API
  const createSyntheticSound = useCallback((category: SoundCategory, type: string): AudioBuffer => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext!)();
    }

    const ctx = audioContextRef.current;
    const sampleRate = ctx.sampleRate;
    
    // Different durations for different sound types
    const duration = category === 'ui' ? 0.1 : category === 'gameplay' ? 0.5 : category === 'buzzer' ? 2.0 : 1.5;
    const bufferLength = sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferLength, sampleRate);
    const channelData = buffer.getChannelData(0);

    // Generate sounds based on category and type
    for (let i = 0; i < bufferLength; i++) {
      const t = i / sampleRate;
      let sample = 0;

      if (category === 'ui') {
        sample = createUISound(type, t, duration);
      } else if (category === 'gameplay') {
        sample = createGameplaySound(type, t, duration);
      } else if (category === 'alerts') {
        sample = createAlertSound(type, t, duration);
      } else if (category === 'buzzer') {
        sample = createBuzzerSound(type, t, duration);
      }

      // Apply envelope to avoid clicking - less dampening for buzzers
      const envelope = category === 'buzzer' 
        ? Math.min(1, t * 50) * Math.min(1, (duration - t) * 10) // Gentler fade for buzzers
        : Math.min(1, t * 20) * Math.min(1, (duration - t) * 20);
      const volume = category === 'buzzer' ? 0.7 : 0.3; // Louder buzzers
      channelData[i] = sample * envelope * volume;
    }

    return buffer;
  }, []);

  // UI sound generation
  const createUISound = (type: string, t: number, duration: number): number => {
    switch (type) {
      case 'button-tap':
        return Math.sin(2 * Math.PI * 800 * t) * Math.exp(-t * 15);
      case 'button-hover':
        return Math.sin(2 * Math.PI * 600 * t) * Math.exp(-t * 20) * 0.5;
      case 'menu-open':
        return Math.sin(2 * Math.PI * (400 + 200 * t / duration) * t) * Math.exp(-t * 8);
      case 'menu-close':
        return Math.sin(2 * Math.PI * (600 - 200 * t / duration) * t) * Math.exp(-t * 8);
      case 'tab-switch':
        return Math.sin(2 * Math.PI * 1000 * t) * Math.exp(-t * 12);
      case 'modal-open':
        return Math.sin(2 * Math.PI * (300 + 400 * t / duration) * t) * Math.exp(-t * 6);
      case 'modal-close':
        return Math.sin(2 * Math.PI * (700 - 400 * t / duration) * t) * Math.exp(-t * 6);
      default:
        return Math.sin(2 * Math.PI * 800 * t) * Math.exp(-t * 15);
    }
  };

  // Gameplay sound generation
  const createGameplaySound = (type: string, t: number, duration: number): number => {
    switch (type) {
      case 'correct-answer':
        // Pleasant ascending chime
        return Math.sin(2 * Math.PI * (523 + 200 * t / duration) * t) * Math.exp(-t * 3);
      case 'skip-phrase':
        // Neutral swoosh
        return Math.sin(2 * Math.PI * (300 - 100 * t / duration) * t) * Math.exp(-t * 4);
      case 'round-start':
        // Energetic start sound
        return Math.sin(2 * Math.PI * (440 + 220 * Math.sin(4 * Math.PI * t)) * t) * Math.exp(-t * 2);
      case 'team-transition':
        // Fanfare-like sound
        return (Math.sin(2 * Math.PI * 523 * t) + Math.sin(2 * Math.PI * 659 * t)) * Math.exp(-t * 2);
      case 'timer-warning':
        // Gentle warning beep
        return Math.sin(2 * Math.PI * 880 * t) * Math.exp(-t * 5);
      case 'timer-urgent':
        // More urgent beep
        return Math.sin(2 * Math.PI * 1100 * t) * Math.exp(-t * 8);
      default:
        return Math.sin(2 * Math.PI * 440 * t) * Math.exp(-t * 3);
    }
  };

  // Alert sound generation
  const createAlertSound = (type: string, t: number, _duration: number): number => {
    switch (type) {
      case 'success':
        // Happy success sound
        return (Math.sin(2 * Math.PI * 523 * t) + Math.sin(2 * Math.PI * 659 * t) + Math.sin(2 * Math.PI * 784 * t)) * Math.exp(-t * 2);
      case 'error':
        // Dissonant error sound
        return Math.sin(2 * Math.PI * 200 * t) * Math.exp(-t * 4);
      case 'warning':
        // Attention-getting warning
        return Math.sin(2 * Math.PI * (400 + 200 * Math.sin(8 * Math.PI * t)) * t) * Math.exp(-t * 3);
      case 'celebration':
        // Victory fanfare
        return (Math.sin(2 * Math.PI * 523 * t) + Math.sin(2 * Math.PI * 659 * t) + Math.sin(2 * Math.PI * 784 * t) + Math.sin(2 * Math.PI * 1047 * t)) * Math.exp(-t * 1.5);
      default:
        return Math.sin(2 * Math.PI * 440 * t) * Math.exp(-t * 3);
    }
  };

  // Buzzer sound generation (existing functionality)
  const createBuzzerSound = (type: string, t: number, _duration: number): number => {
    switch (type) {
      case 'classic':
        // Much more noticeable classic buzzer - loud, attention-grabbing
        return Math.sin(2 * Math.PI * (600 - 200 * t) * t) * (1 - Math.exp(-t * 3)) * 0.8;
      case 'airhorn':
        // Dramatic airhorn blast
        return Math.sin(2 * Math.PI * 150 * t) * (1 - Math.exp(-t * 0.8)) * 0.9;
      case 'alarm':
        // Urgent alarm sound
        return Math.sin(2 * Math.PI * (400 + 300 * Math.sin(12 * Math.PI * t)) * t) * (1 - Math.exp(-t * 2));
      case 'game-show':
        // Game show buzzer - starts quiet, gets LOUD
        return Math.sin(2 * Math.PI * 120 * t) * (1 - Math.exp(-t * 8)) * Math.min(1, t * 4);
      case 'electronic':
        // Sharp electronic buzz
        return Math.sin(2 * Math.PI * 800 * t) * Math.exp(-t * 1.5);
      default:
        // Default buzzer - make it very noticeable
        return Math.sin(2 * Math.PI * 500 * t) * (1 - Math.exp(-t * 2)) * 0.7;
    }
  };

  // Load sound
  useEffect(() => {
    if (preload && !isLoadedRef.current) {
      try {
        audioBufferRef.current = createSyntheticSound(soundCategory, soundName);
        isLoadedRef.current = true;
      } catch (error) {
        console.warn('Failed to create audio buffer:', error);
      }
    }
  }, [soundCategory, soundName, preload, createSyntheticSound]);

  const play = useCallback(async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext!)();
      }

      const ctx = audioContextRef.current;

      // Resume audio context if suspended (required by browser autoplay policies)
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      // Create or use existing buffer
      let buffer = audioBufferRef.current;
      if (!buffer) {
        buffer = createSyntheticSound(soundCategory, soundName);
        audioBufferRef.current = buffer;
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
  }, [soundCategory, soundName, volume, createSyntheticSound]);

  const preloadSound = useCallback(() => {
    if (!isLoadedRef.current) {
      try {
        audioBufferRef.current = createSyntheticSound(soundCategory, soundName);
        isLoadedRef.current = true;
      } catch (error) {
        console.warn('Failed to preload audio:', error);
      }
    }
  }, [soundCategory, soundName, createSyntheticSound]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    play,
    preloadSound,
    isLoaded: isLoadedRef.current
  };
};

// Legacy export for backward compatibility
export const BUZZER_SOUNDS = SOUND_TYPES.buzzer; 