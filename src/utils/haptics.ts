import { Haptics, ImpactStyle } from '@capacitor/haptics';

// Re-export the ImpactStyle enum for use in our app
export enum HapticsImpactStyle {
  Light = ImpactStyle.Light,
  Medium = ImpactStyle.Medium,
  Heavy = ImpactStyle.Heavy
}

/**
 * Trigger haptic feedback with specified impact style
 * @param style The impact style to use (Light, Medium, Heavy)
 * @returns Promise that resolves after haptic feedback is triggered
 */
export const vibrate = async (style: HapticsImpactStyle = HapticsImpactStyle.Medium): Promise<void> => {
  try {
    await Haptics.impact({
      style
    });
  } catch (error) {
    // Silently handle errors in case haptics aren't available
    console.debug('Haptics not available:', error);
  }
};

/**
 * Trigger success haptic feedback
 * @returns Promise that resolves after haptic feedback is triggered
 */
export const vibrateSuccess = async (): Promise<void> => {
  try {
    await Haptics.notification({
      type: 'SUCCESS'
    });
  } catch (error) {
    console.debug('Haptics not available:', error);
  }
};

/**
 * Trigger error haptic feedback
 * @returns Promise that resolves after haptic feedback is triggered
 */
export const vibrateError = async (): Promise<void> => {
  try {
    await Haptics.notification({
      type: 'ERROR'
    });
  } catch (error) {
    console.debug('Haptics not available:', error);
  }
};

/**
 * Trigger warning haptic feedback
 * @returns Promise that resolves after haptic feedback is triggered
 */
export const vibrateWarning = async (): Promise<void> => {
  try {
    await Haptics.notification({
      type: 'WARNING'
    });
  } catch (error) {
    console.debug('Haptics not available:', error);
  }
}; 