import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock Capacitor Haptics
vi.mock('@capacitor/haptics', () => ({
  Haptics: {
    impact: vi.fn().mockResolvedValue(undefined),
    vibrate: vi.fn().mockResolvedValue(undefined),
    notification: vi.fn().mockResolvedValue(undefined),
  },
  ImpactStyle: {
    Light: 'Light',
    Medium: 'Medium',
    Heavy: 'Heavy'
  },
  NotificationType: {
    Success: 'Success',
    Warning: 'Warning',
    Error: 'Error'
  }
}));

import { useHaptics, HAPTIC_PATTERNS } from './useHaptics';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('useHaptics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('Configuration Management', () => {
    it('should initialize with default configuration', () => {
      const { result } = renderHook(() => useHaptics());
      
      expect(result.current.isEnabled()).toBe(true);
      expect(result.current.getIntensity()).toBe(0.7);
      expect(result.current.isCategoryEnabled('ui')).toBe(true);
      expect(result.current.isCategoryEnabled('gameplay')).toBe(true);
      expect(result.current.isCategoryEnabled('alerts')).toBe(true);
    });

    it('should save and load configuration from localStorage', () => {
      const testConfig = {
        enabled: false,
        intensity: 0.5,
        categoryEnabled: {
          ui: false,
          gameplay: true,
          alerts: false
        }
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(testConfig));
      
      const { result } = renderHook(() => useHaptics());
      
      expect(result.current.isEnabled()).toBe(false);
      expect(result.current.getIntensity()).toBe(0.5);
      expect(result.current.isCategoryEnabled('ui')).toBe(false);
      expect(result.current.isCategoryEnabled('gameplay')).toBe(true);
      expect(result.current.isCategoryEnabled('alerts')).toBe(false);
    });

    it('should update and persist enabled state', () => {
      const { result } = renderHook(() => useHaptics());
      
      act(() => {
        result.current.setEnabled(false);
      });
      
      expect(result.current.isEnabled()).toBe(false);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'words-on-phone-haptic-config',
        expect.stringContaining('"enabled":false')
      );
    });

    it('should update and persist intensity', () => {
      const { result } = renderHook(() => useHaptics());
      
      act(() => {
        result.current.setIntensity(0.3);
      });
      
      expect(result.current.getIntensity()).toBe(0.3);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should clamp intensity values between 0 and 1', () => {
      const { result } = renderHook(() => useHaptics());
      
      act(() => {
        result.current.setIntensity(-0.5);
      });
      expect(result.current.getIntensity()).toBe(0);
      
      act(() => {
        result.current.setIntensity(1.5);
      });
      expect(result.current.getIntensity()).toBe(1);
    });

    it('should update category enabled states', () => {
      const { result } = renderHook(() => useHaptics());
      
      act(() => {
        result.current.setCategoryEnabled('ui', false);
      });
      
      expect(result.current.isCategoryEnabled('ui')).toBe(false);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should reset to defaults', () => {
      const { result } = renderHook(() => useHaptics());
      
      act(() => {
        result.current.setEnabled(false);
        result.current.setIntensity(0.2);
      });
      
      act(() => {
        result.current.resetToDefaults();
      });
      
      expect(result.current.isEnabled()).toBe(true);
      expect(result.current.getIntensity()).toBe(0.7);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  describe('Basic Functionality', () => {
    it('should provide all required methods', () => {
      const { result } = renderHook(() => useHaptics());
      
      expect(typeof result.current.triggerHaptic).toBe('function');
      expect(typeof result.current.triggerImpact).toBe('function');
      expect(typeof result.current.triggerVibrate).toBe('function');
      expect(typeof result.current.triggerNotification).toBe('function');
      expect(typeof result.current.isEnabled).toBe('function');
      expect(typeof result.current.setEnabled).toBe('function');
      expect(typeof result.current.getIntensity).toBe('function');
      expect(typeof result.current.setIntensity).toBe('function');
      expect(typeof result.current.isCategoryEnabled).toBe('function');
      expect(typeof result.current.setCategoryEnabled).toBe('function');
      expect(typeof result.current.resetToDefaults).toBe('function');
    });

    it('should provide haptic patterns', () => {
      const { result } = renderHook(() => useHaptics());
      
      const patterns = result.current.getAvailablePatterns();
      expect(patterns).toBe(HAPTIC_PATTERNS);
      expect(patterns.ui).toBeDefined();
      expect(patterns.gameplay).toBeDefined();
      expect(patterns.alerts).toBeDefined();
    });

    it('should provide pattern display names', () => {
      const { result } = renderHook(() => useHaptics());
      
      const displayName = result.current.getPatternDisplayName('ui', 'button-tap');
      expect(displayName).toBe('Button Tap');
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });
      
      // Should not throw and use defaults
      expect(() => renderHook(() => useHaptics())).not.toThrow();
      
      const { result } = renderHook(() => useHaptics());
      expect(result.current.isEnabled()).toBe(true);
    });

    it('should handle invalid JSON in localStorage', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');
      
      // Should not throw and use defaults
      const { result } = renderHook(() => useHaptics());
      expect(result.current.isEnabled()).toBe(true);
      expect(result.current.getIntensity()).toBe(0.7);
    });

    it('should handle haptic trigger calls without throwing', async () => {
      const { result } = renderHook(() => useHaptics());
      
      // These should not throw in test environment
      await act(async () => {
        await result.current.triggerHaptic('ui', 'button-tap');
        await result.current.triggerImpact();
        await result.current.triggerVibrate(300);
        await result.current.triggerNotification();
      });
      
      // Test passes if no exceptions are thrown
      expect(true).toBe(true);
    });
  });
}); 