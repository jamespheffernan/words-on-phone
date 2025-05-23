import { useCallback } from 'react';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export const useHaptics = () => {
  const triggerImpact = useCallback(async (style: ImpactStyle = ImpactStyle.Medium) => {
    try {
      await Haptics.impact({ style });
    } catch (error) {
      // Haptics not available (web) or not supported
      console.debug('Haptics not available:', error);
    }
  }, []);

  const triggerVibrate = useCallback(async (duration = 300) => {
    try {
      await Haptics.vibrate({ duration });
    } catch (error) {
      // Haptics not available (web) or not supported
      console.debug('Haptics not available:', error);
    }
  }, []);

  const triggerNotification = useCallback(async () => {
    try {
      await Haptics.notification({ type: NotificationType.Warning });
    } catch (error) {
      // Haptics not available (web) or not supported
      console.debug('Haptics not available:', error);
    }
  }, []);

  return {
    triggerImpact,
    triggerVibrate,
    triggerNotification
  };
}; 