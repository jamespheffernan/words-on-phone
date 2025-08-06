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

// Global singleton AudioContext to prevent multiple contexts and premature closing
let globalAudioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext => {
  // Create new context if none exists or if current one is closed
  if (!globalAudioContext || globalAudioContext.state === 'closed') {
    globalAudioContext = new (window.AudioContext || window.webkitAudioContext!)();
  }
  return globalAudioContext;
};

export const useAudio = (soundCategory: SoundCategory, soundName: string, options: UseAudioOptions = {}) => {
  const { volume = 0.8, preload = true } = options;
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const isLoadedRef = useRef(false);

  // Create synthetic sounds using Web Audio API
  const createSyntheticSound = useCallback((category: SoundCategory, type: string): AudioBuffer => {
    const ctx = getAudioContext();
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

      // Apply envelope to avoid clicking - minimal dampening for harsh buzzers
      const envelope = category === 'buzzer' 
        ? Math.min(1, t * 100) * Math.min(1, (duration - t) * 5) // Much less fade for buzzers
        : Math.min(1, t * 20) * Math.min(1, (duration - t) * 20);
      const volume = category === 'buzzer' ? 1.0 : 0.3; // Maximum volume for buzzers
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
        // Harsh basketball shot clock buzzer - IMMEDIATELY LOUD and abrasive
        const sawtooth = (2 * (110 * t - Math.floor(110 * t + 0.5))) * 0.6; // Harsh sawtooth wave
        const square = Math.sign(Math.sin(2 * Math.PI * 110 * t)) * 0.8; // Sharp square wave  
        const buzz = Math.sin(2 * Math.PI * 110 * t) + sawtooth + square; // Combine for harshness
        const distortion = Math.tanh(buzz * 3); // Add distortion/clipping
        return distortion * 0.9; // Maximum volume, no fade-in
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
      const ctx = getAudioContext();

      // Resume audio context if suspended (required by browser autoplay policies)
      if (ctx.state === 'suspended') {
        console.log('Resuming suspended AudioContext...');
        await ctx.resume();
      }

      // Verify context state after resume attempt
      if (ctx.state === 'closed') {
        console.warn('AudioContext is closed, recreating...');
        // Force recreation of context
        globalAudioContext = null;
        const newCtx = getAudioContext();
        if (newCtx.state === 'suspended') {
          await newCtx.resume();
        }
      }

      const activeCtx = globalAudioContext || ctx;

      // Create or use existing buffer (recreate if context changed)
      let buffer = audioBufferRef.current;
      if (!buffer || buffer.sampleRate !== activeCtx.sampleRate) {
        console.log(`Creating audio buffer for ${soundCategory}/${soundName}`);
        buffer = createSyntheticSound(soundCategory, soundName);
        audioBufferRef.current = buffer;
      }

      // Create source and gain nodes
      const source = activeCtx.createBufferSource();
      const gainNode = activeCtx.createGain();

      source.buffer = buffer;
      gainNode.gain.value = volume;

      // Connect: source -> gain -> destination
      source.connect(gainNode);
      gainNode.connect(activeCtx.destination);

      // Play sound
      source.start(0);

      console.log(`Successfully played ${soundCategory}/${soundName} at volume ${volume}`);
      return Promise.resolve();
    } catch (error) {
      console.error('Failed to play audio:', error);
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

  // Note: We don't close the global AudioContext in cleanup since it's shared
  // across all audio components. It will be closed when the page unloads.

  return {
    play,
    preloadSound,
    isLoaded: isLoadedRef.current
  };
};

// Legacy export for backward compatibility
export const BUZZER_SOUNDS = SOUND_TYPES.buzzer; 