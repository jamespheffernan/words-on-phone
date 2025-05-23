import { useMemo } from 'react';
import { calculateWarningBackground, WARNING_CONFIG } from '../utils/colorUtils';

interface UseBackgroundWarningOptions {
  timeRemaining: number;
  totalDuration: number;
  enabled?: boolean;
  customThreshold?: number; // Optional override for warning threshold
}

interface BackgroundWarningResult {
  backgroundStyle: string;
  primaryColor: string;
  secondaryColor: string;
  isWarning: boolean;
  warningIntensity: number; // 0-1, where 0 is critical and 1 is normal
}

/**
 * Hook for managing progressive background warning system
 * Returns dynamic background styles based on timer state
 */
export const useBackgroundWarning = ({
  timeRemaining,
  totalDuration,
  enabled = true,
  customThreshold
}: UseBackgroundWarningOptions): BackgroundWarningResult => {
  
  const result = useMemo(() => {
    // If disabled, return normal purple gradient
    if (!enabled || totalDuration <= 0) {
      return {
        backgroundStyle: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        primaryColor: 'rgb(102, 126, 234)',
        secondaryColor: 'rgb(118, 75, 162)',
        isWarning: false,
        warningIntensity: 1
      };
    }

    // Calculate warning colors
    const colors = calculateWarningBackground(timeRemaining, totalDuration);
    const timeProgress = timeRemaining / totalDuration;
    const threshold = customThreshold ?? WARNING_CONFIG.WARNING_THRESHOLD;
    
    const isWarning = timeProgress <= threshold;
    const warningIntensity = isWarning 
      ? Math.max(0, timeProgress / threshold)
      : 1;

    return {
      backgroundStyle: colors.cssBackground,
      primaryColor: colors.primaryColor,
      secondaryColor: colors.secondaryColor,
      isWarning,
      warningIntensity
    };
  }, [timeRemaining, totalDuration, enabled, customThreshold]);

  return result;
};

/**
 * Hook variant that provides CSS custom properties for smoother transitions
 * Returns CSS variables that can be used in component styles
 */
export const useBackgroundWarningCSS = (options: UseBackgroundWarningOptions) => {
  const warning = useBackgroundWarning(options);
  
  return useMemo(() => ({
    '--warning-primary-color': warning.primaryColor,
    '--warning-secondary-color': warning.secondaryColor,
    '--warning-intensity': warning.warningIntensity.toString(),
    '--warning-transition-duration': WARNING_CONFIG.TRANSITION_DURATION,
    '--warning-transition-easing': WARNING_CONFIG.TRANSITION_EASING,
  }), [warning]);
}; 