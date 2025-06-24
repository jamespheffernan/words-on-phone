import { useCallback, useState, useEffect } from 'react';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

// Haptic pattern types
export const HAPTIC_PATTERNS = {
  // UI Interaction Haptics
  ui: {
    'button-tap': 'Button Tap',
    'button-long-press': 'Button Long Press',
    'menu-open': 'Menu Open',
    'tab-switch': 'Tab Switch',
    'modal-open': 'Modal Open',
    'swipe': 'Swipe Gesture'
  },
  // Gameplay Haptics
  gameplay: {
    'correct-answer': 'Correct Answer',
    'skip-phrase': 'Skip Phrase',
    'round-start': 'Round Start',
    'team-transition': 'Team Transition',
    'timer-warning': 'Timer Warning',
    'timer-urgent': 'Timer Urgent'
  },
  // Alert/Feedback Haptics
  alerts: {
    'success': 'Success',
    'error': 'Error',
    'warning': 'Warning',
    'celebration': 'Celebration'
  }
} as const;

export type HapticCategory = keyof typeof HAPTIC_PATTERNS;
export type HapticType<T extends HapticCategory> = keyof typeof HAPTIC_PATTERNS[T];

// Haptic configuration
interface HapticConfig {
  enabled: boolean;
  intensity: number; // 0-1 (maps to ImpactStyle)
  categoryEnabled: Record<HapticCategory, boolean>;
}

// Default haptic configuration
const DEFAULT_HAPTIC_CONFIG: HapticConfig = {
  enabled: true,
  intensity: 0.7,
  categoryEnabled: {
    ui: true,
    gameplay: true,
    alerts: true
  }
};

export const useHaptics = () => {
  // React state for configuration
  const [config, setConfig] = useState<HapticConfig>(() => {
    try {
      const saved = localStorage.getItem('words-on-phone-haptic-config');
      if (saved) {
        return { ...DEFAULT_HAPTIC_CONFIG, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.warn('Failed to load haptic config:', error);
    }
    return DEFAULT_HAPTIC_CONFIG;
  });

  // Save configuration to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('words-on-phone-haptic-config', JSON.stringify(config));
    } catch (error) {
      console.warn('Failed to save haptic config:', error);
    }
  }, [config]);

  // Convert intensity to ImpactStyle
  const getImpactStyle = useCallback((intensity: number): ImpactStyle => {
    if (intensity <= 0.3) return ImpactStyle.Light;
    if (intensity <= 0.7) return ImpactStyle.Medium;
    return ImpactStyle.Heavy;
  }, []);

  // Basic haptic methods (legacy compatibility)
  const triggerImpact = useCallback(async (style: ImpactStyle = ImpactStyle.Medium) => {
    if (!config.enabled) return;

    try {
      await Haptics.impact({ style });
    } catch (error) {
      console.debug('Haptics not available:', error);
    }
  }, [config.enabled]);

  const triggerVibrate = useCallback(async (duration = 300) => {
    if (!config.enabled) return;

    try {
      await Haptics.vibrate({ duration });
    } catch (error) {
      console.debug('Haptics not available:', error);
    }
  }, [config.enabled]);

  const triggerNotification = useCallback(async () => {
    if (!config.enabled) return;

    try {
      await Haptics.notification({ type: NotificationType.Warning });
    } catch (error) {
      console.debug('Haptics not available:', error);
    }
  }, [config.enabled]);

  // Enhanced contextual haptic method
  const triggerHaptic = useCallback(async (category: HapticCategory, type: string) => {
    if (!config.enabled || !config.categoryEnabled[category]) {
      return;
    }

    try {
      const intensity = config.intensity;
      const impactStyle = getImpactStyle(intensity);

      // Different haptic patterns based on category and type
      if (category === 'ui') {
        await triggerUIHaptic(type, impactStyle);
      } else if (category === 'gameplay') {
        await triggerGameplayHaptic(type, impactStyle);
      } else if (category === 'alerts') {
        await triggerAlertHaptic(type, impactStyle);
      }
    } catch (error) {
      console.debug('Haptics not available:', error);
    }
  }, [config.enabled, config.categoryEnabled, config.intensity, getImpactStyle]);

  // UI haptic patterns
  const triggerUIHaptic = async (type: string, style: ImpactStyle) => {
    switch (type) {
      case 'button-tap':
        await Haptics.impact({ style: ImpactStyle.Light });
        break;
      case 'button-long-press':
        await Haptics.impact({ style: ImpactStyle.Medium });
        setTimeout(() => Haptics.impact({ style: ImpactStyle.Light }), 100);
        break;
      case 'menu-open':
        await Haptics.impact({ style: ImpactStyle.Medium });
        break;
      case 'tab-switch':
        await Haptics.impact({ style: ImpactStyle.Light });
        break;
      case 'modal-open':
        await Haptics.impact({ style: ImpactStyle.Medium });
        break;
      case 'swipe':
        await Haptics.impact({ style: ImpactStyle.Light });
        break;
      default:
        await Haptics.impact({ style });
    }
  };

  // Gameplay haptic patterns
  const triggerGameplayHaptic = async (type: string, style: ImpactStyle) => {
    switch (type) {
      case 'correct-answer':
        // Double tap for success
        await Haptics.impact({ style: ImpactStyle.Medium });
        setTimeout(() => Haptics.impact({ style: ImpactStyle.Light }), 100);
        break;
      case 'skip-phrase':
        await Haptics.impact({ style: ImpactStyle.Light });
        break;
      case 'round-start':
        // Strong start signal
        await Haptics.impact({ style: ImpactStyle.Heavy });
        break;
      case 'team-transition':
        // Triple tap for team change
        await Haptics.impact({ style: ImpactStyle.Medium });
        setTimeout(() => Haptics.impact({ style: ImpactStyle.Medium }), 100);
        setTimeout(() => Haptics.impact({ style: ImpactStyle.Medium }), 200);
        break;
      case 'timer-warning':
        await Haptics.impact({ style: ImpactStyle.Medium });
        break;
      case 'timer-urgent':
        // Rapid pulses for urgency
        await Haptics.impact({ style: ImpactStyle.Heavy });
        setTimeout(() => Haptics.impact({ style: ImpactStyle.Heavy }), 150);
        break;
      default:
        await Haptics.impact({ style });
    }
  };

  // Alert haptic patterns
  const triggerAlertHaptic = async (type: string, style: ImpactStyle) => {
    switch (type) {
      case 'success':
        // Celebratory pattern
        await Haptics.notification({ type: NotificationType.Success });
        break;
      case 'error':
        await Haptics.notification({ type: NotificationType.Error });
        break;
      case 'warning':
        await Haptics.notification({ type: NotificationType.Warning });
        break;
      case 'celebration':
        // Extended celebration pattern
        await Haptics.impact({ style: ImpactStyle.Heavy });
        setTimeout(() => Haptics.impact({ style: ImpactStyle.Medium }), 100);
        setTimeout(() => Haptics.impact({ style: ImpactStyle.Heavy }), 200);
        setTimeout(() => Haptics.impact({ style: ImpactStyle.Light }), 300);
        break;
      default:
        await Haptics.impact({ style });
    }
  };

  // Configuration methods
  const isEnabled = useCallback((): boolean => {
    return config.enabled;
  }, [config.enabled]);

  const setEnabled = useCallback((enabled: boolean) => {
    setConfig(prev => ({ ...prev, enabled }));
  }, []);

  const getIntensity = useCallback((): number => {
    return config.intensity;
  }, [config.intensity]);

  const setIntensity = useCallback((intensity: number) => {
    setConfig(prev => ({ ...prev, intensity: Math.max(0, Math.min(1, intensity)) }));
  }, []);

  const isCategoryEnabled = useCallback((category: HapticCategory): boolean => {
    return config.categoryEnabled[category];
  }, [config.categoryEnabled]);

  const setCategoryEnabled = useCallback((category: HapticCategory, enabled: boolean) => {
    setConfig(prev => ({ 
      ...prev, 
      categoryEnabled: { ...prev.categoryEnabled, [category]: enabled }
    }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setConfig(DEFAULT_HAPTIC_CONFIG);
  }, []);

  return {
    // Legacy methods (backward compatibility)
    triggerImpact,
    triggerVibrate,
    triggerNotification,
    
    // Enhanced contextual method
    triggerHaptic,
    
    // Configuration methods
    isEnabled,
    setEnabled,
    getIntensity,
    setIntensity,
    isCategoryEnabled,
    setCategoryEnabled,
    resetToDefaults,
    
    // Utility methods
    getAvailablePatterns: () => HAPTIC_PATTERNS,
    getPatternDisplayName: (category: HapticCategory, type: string) => 
      HAPTIC_PATTERNS[category][type as keyof typeof HAPTIC_PATTERNS[typeof category]] || type
  };
}; 