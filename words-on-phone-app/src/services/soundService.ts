import { SOUND_TYPES, SoundCategory } from '../hooks/useAudio';

// Sound service configuration
interface SoundConfig {
  enabled: boolean;
  volume: number; // 0-1
  categoryVolumes: Record<SoundCategory, number>;
}

// Default sound configuration
const DEFAULT_CONFIG: SoundConfig = {
  enabled: true,
  volume: 0.8,
  categoryVolumes: {
    ui: 0.6,
    gameplay: 0.8,
    alerts: 0.9,
    buzzer: 1.0
  }
};

class SoundService {
  private config: SoundConfig = DEFAULT_CONFIG;
  private preloadedSounds = new Set<string>();

  // Initialize the sound service
  init() {
    this.loadConfig();
    this.preloadCriticalSounds();
  }

  // Load configuration from localStorage
  private loadConfig() {
    try {
      const saved = localStorage.getItem('words-on-phone-sound-config');
      if (saved) {
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.warn('Failed to load sound config:', error);
    }
  }

  // Save configuration to localStorage
  private saveConfig() {
    try {
      localStorage.setItem('words-on-phone-sound-config', JSON.stringify(this.config));
    } catch (error) {
      console.warn('Failed to save sound config:', error);
    }
  }

  // Preload critical sounds for instant playback
  private preloadCriticalSounds() {
    const criticalSounds = [
      ['ui', 'button-tap'],
      ['gameplay', 'correct-answer'],
      ['gameplay', 'skip-phrase'],
      ['alerts', 'success'],
      ['alerts', 'error'],
      ['buzzer', 'classic']
    ] as const;

    criticalSounds.forEach(([category, sound]) => {
      this.preloadSound(category, sound);
    });
  }

  // Note: Audio instance management will be handled by React components using useAudio hook
  // This service focuses on configuration and coordination

  // Preload a specific sound
  preloadSound(category: SoundCategory, sound: string) {
    const key = `${category}-${sound}`;
    if (!this.preloadedSounds.has(key)) {
      // Mark as preloaded to avoid duplicate attempts
      this.preloadedSounds.add(key);
      // Actual preloading happens in React components using useAudio
    }
  }

  // Play a sound with proper volume mixing
  async playSound(category: SoundCategory, sound: string): Promise<void> {
    if (!this.config.enabled) {
      return Promise.resolve();
    }

    try {
      // Calculate final volume
      const categoryVolume = this.config.categoryVolumes[category];
      const finalVolume = this.config.volume * categoryVolume;

      // In practice, this will delegate to React components using useAudio
      console.log(`Playing sound: ${category}/${sound} at volume ${finalVolume}`);
      
      return Promise.resolve();
    } catch (error) {
      console.warn(`Failed to play sound ${category}/${sound}:`, error);
      return Promise.reject(error);
    }
  }

  // Configuration getters and setters
  isEnabled(): boolean {
    return this.config.enabled;
  }

  setEnabled(enabled: boolean) {
    this.config.enabled = enabled;
    this.saveConfig();
  }

  getVolume(): number {
    return this.config.volume;
  }

  setVolume(volume: number) {
    this.config.volume = Math.max(0, Math.min(1, volume));
    this.saveConfig();
  }

  getCategoryVolume(category: SoundCategory): number {
    return this.config.categoryVolumes[category];
  }

  setCategoryVolume(category: SoundCategory, volume: number) {
    this.config.categoryVolumes[category] = Math.max(0, Math.min(1, volume));
    this.saveConfig();
  }

  // Get all available sounds for a category
  getSoundsForCategory(category: SoundCategory) {
    return Object.keys(SOUND_TYPES[category]);
  }

  // Get display name for a sound
  getSoundDisplayName(category: SoundCategory, sound: string): string {
    return SOUND_TYPES[category][sound as keyof typeof SOUND_TYPES[typeof category]] || sound;
  }

  // Reset to defaults
  resetToDefaults() {
    this.config = { ...DEFAULT_CONFIG };
    this.saveConfig();
  }
}

// Export singleton instance
export const soundService = new SoundService();

// React hook for using the sound service
export const useSoundService = () => {
  return {
    playSound: soundService.playSound.bind(soundService),
    preloadSound: soundService.preloadSound.bind(soundService),
    isEnabled: soundService.isEnabled.bind(soundService),
    setEnabled: soundService.setEnabled.bind(soundService),
    getVolume: soundService.getVolume.bind(soundService),
    setVolume: soundService.setVolume.bind(soundService),
    getCategoryVolume: soundService.getCategoryVolume.bind(soundService),
    setCategoryVolume: soundService.setCategoryVolume.bind(soundService),
    getSoundsForCategory: soundService.getSoundsForCategory.bind(soundService),
    getSoundDisplayName: soundService.getSoundDisplayName.bind(soundService),
    resetToDefaults: soundService.resetToDefaults.bind(soundService)
  };
}; 