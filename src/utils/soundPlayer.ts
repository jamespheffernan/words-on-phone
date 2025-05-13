/**
 * Sound player utility for playing game sounds
 */

type SoundType = 'default' | 'buzzer' | 'bell' | 'horn';

// Cache for sound instances to avoid reloading
const soundCache: Record<string, HTMLAudioElement> = {};

/**
 * Preloads sound files for faster playback
 */
export const preloadSounds = async (): Promise<void> => {
  const sounds: SoundType[] = ['default', 'buzzer', 'bell', 'horn'];
  
  for (const sound of sounds) {
    try {
      await loadSound(sound);
    } catch (error) {
      console.error(`Failed to preload sound: ${sound}`, error);
    }
  }
};

/**
 * Loads a sound file and caches it
 */
export const loadSound = (type: SoundType): Promise<HTMLAudioElement> => {
  return new Promise((resolve, reject) => {
    if (soundCache[type]) {
      resolve(soundCache[type]);
      return;
    }
    
    const filename = getSoundFilename(type);
    const audio = new Audio(filename);
    
    audio.addEventListener('canplaythrough', () => {
      soundCache[type] = audio;
      resolve(audio);
    }, { once: true });
    
    audio.addEventListener('error', (e) => {
      console.error(`Error loading sound: ${filename}`, e);
      reject(new Error(`Failed to load sound: ${filename}`));
    }, { once: true });
    
    // Start loading
    audio.load();
  });
};

/**
 * Gets the appropriate filename for a sound type
 */
export const getSoundFilename = (type: SoundType): string => {
  switch (type) {
    case 'default':
      return '/sounds/buzzer-default.mp3';
    case 'buzzer':
      return '/sounds/buzzer2.mp3';
    case 'bell':
      return '/sounds/bell.mp3';
    case 'horn':
      return '/sounds/horn.mp3';
    default:
      return '/sounds/buzzer-default.mp3';
  }
};

/**
 * Plays a buzzer sound
 * @param type The type of sound to play
 * @returns Promise that resolves when sound starts playing
 */
export const playSound = async (type: SoundType = 'default'): Promise<void> => {
  try {
    const audio = await loadSound(type);
    
    // Reset the audio to the beginning if it's already playing
    audio.pause();
    audio.currentTime = 0;
    
    const playPromise = audio.play();
    
    // Modern browsers return a promise from play()
    if (playPromise !== undefined) {
      await playPromise;
    }
  } catch (error) {
    console.error(`Failed to play sound: ${type}`, error);
  }
};

/**
 * Previews a buzzer sound (for use in settings)
 * @param type The type of sound to preview
 */
export const previewSound = async (type: SoundType): Promise<void> => {
  await playSound(type);
};

/**
 * Gets a list of available sounds
 */
export const getAvailableSounds = (): SoundType[] => {
  return ['default', 'buzzer', 'bell', 'horn'];
}; 