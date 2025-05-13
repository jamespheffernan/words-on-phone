import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

// Use the original ImpactStyle directly rather than re-exporting
export { ImpactStyle };

/**
 * Trigger haptic feedback with specified impact style
 * @param style The impact style to use (Light, Medium, Heavy)
 * @returns Promise that resolves after haptic feedback is triggered
 */
export const vibrate = async (style: ImpactStyle = ImpactStyle.Medium): Promise<void> => {
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
      type: NotificationType.Success
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
      type: NotificationType.Error
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
      type: NotificationType.Warning
    });
  } catch (error) {
    console.debug('Haptics not available:', error);
  }
}; 