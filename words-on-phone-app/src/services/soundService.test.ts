import { describe, it, expect, beforeEach, vi } from 'vitest';
import { soundService, useSoundService } from './soundService';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('SoundService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('Configuration Management', () => {
    it('should initialize with default configuration', () => {
      expect(soundService.isEnabled()).toBe(true);
      expect(soundService.getVolume()).toBe(0.8);
      expect(soundService.getCategoryVolume('ui')).toBe(0.6);
      expect(soundService.getCategoryVolume('gameplay')).toBe(0.8);
      expect(soundService.getCategoryVolume('alerts')).toBe(0.9);
      expect(soundService.getCategoryVolume('buzzer')).toBe(1.0);
    });

    it('should save and load configuration from localStorage', () => {
      const testConfig = {
        enabled: false,
        volume: 0.5,
        categoryVolumes: {
          ui: 0.3,
          gameplay: 0.7,
          alerts: 0.8,
          buzzer: 0.9
        }
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(testConfig));
      
      // Reinitialize to load saved config
      soundService.init();
      
      expect(soundService.isEnabled()).toBe(false);
      expect(soundService.getVolume()).toBe(0.5);
      expect(soundService.getCategoryVolume('ui')).toBe(0.3);
    });

    it('should update and persist enabled state', () => {
      soundService.setEnabled(false);
      expect(soundService.isEnabled()).toBe(false);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'words-on-phone-sound-config',
        expect.stringContaining('"enabled":false')
      );
    });

    it('should update and persist volume levels', () => {
      soundService.setVolume(0.5);
      expect(soundService.getVolume()).toBe(0.5);
      expect(localStorageMock.setItem).toHaveBeenCalled();

      soundService.setCategoryVolume('ui', 0.4);
      expect(soundService.getCategoryVolume('ui')).toBe(0.4);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should clamp volume values between 0 and 1', () => {
      soundService.setVolume(-0.5);
      expect(soundService.getVolume()).toBe(0);

      soundService.setVolume(1.5);
      expect(soundService.getVolume()).toBe(1);

      soundService.setCategoryVolume('ui', -0.1);
      expect(soundService.getCategoryVolume('ui')).toBe(0);

      soundService.setCategoryVolume('ui', 1.1);
      expect(soundService.getCategoryVolume('ui')).toBe(1);
    });

    it('should reset to defaults', () => {
      soundService.setEnabled(false);
      soundService.setVolume(0.3);
      
      soundService.resetToDefaults();
      
      expect(soundService.isEnabled()).toBe(true);
      expect(soundService.getVolume()).toBe(0.8);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  describe('Sound Management', () => {
    it('should get available sounds for categories', () => {
      const uiSounds = soundService.getSoundsForCategory('ui');
      expect(Array.isArray(uiSounds)).toBe(true);
      expect(uiSounds.length).toBeGreaterThan(0);
    });

    it('should get display names for sounds', () => {
      const displayName = soundService.getSoundDisplayName('ui', 'button-tap');
      expect(typeof displayName).toBe('string');
      expect(displayName.length).toBeGreaterThan(0);
    });

    it('should handle playSound when disabled', async () => {
      soundService.setEnabled(false);
      
      // Should resolve without error when disabled
      await expect(soundService.playSound('ui', 'button-tap')).resolves.toBeUndefined();
    });

    it('should handle playSound when enabled', async () => {
      soundService.setEnabled(true);
      
      // Should resolve without error when enabled (mocked environment)
      await expect(soundService.playSound('ui', 'button-tap')).resolves.toBeUndefined();
    });
  });

  describe('React Hook', () => {
    it('should provide all necessary methods via useSoundService hook', () => {
      const hook = useSoundService();
      
      expect(typeof hook.playSound).toBe('function');
      expect(typeof hook.preloadSound).toBe('function');
      expect(typeof hook.isEnabled).toBe('function');
      expect(typeof hook.setEnabled).toBe('function');
      expect(typeof hook.getVolume).toBe('function');
      expect(typeof hook.setVolume).toBe('function');
      expect(typeof hook.getCategoryVolume).toBe('function');
      expect(typeof hook.setCategoryVolume).toBe('function');
      expect(typeof hook.getSoundsForCategory).toBe('function');
      expect(typeof hook.getSoundDisplayName).toBe('function');
      expect(typeof hook.resetToDefaults).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });
      
      // Should not throw and use defaults
      expect(() => soundService.init()).not.toThrow();
      expect(soundService.isEnabled()).toBe(true);
    });

    it('should handle invalid JSON in localStorage', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');
      
      // Should not throw and use defaults
      expect(() => soundService.init()).not.toThrow();
      expect(soundService.isEnabled()).toBe(true);
    });
  });
}); 