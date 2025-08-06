import { useState, useEffect, useCallback } from 'react';

interface FlashEffectOptions {
  /** Duration of flash effect in milliseconds */
  duration?: number;
  /** Interval between flashes in milliseconds */
  flashInterval?: number;
  /** Colors to cycle through */
  colors?: string[];
}

export const useFlashEffect = (options: FlashEffectOptions = {}) => {
  const {
    duration = 2000,
    flashInterval = 200,
    colors = ['#ff0000', '#ffffff'] // Red and white
  } = options;

  const [isFlashing, setIsFlashing] = useState(false);
  const [currentColorIndex, setCurrentColorIndex] = useState(0);

  const startFlash = useCallback(() => {
    setIsFlashing(true);
    setCurrentColorIndex(0);
  }, []);

  const stopFlash = useCallback(() => {
    setIsFlashing(false);
    setCurrentColorIndex(0);
  }, []);

  useEffect(() => {
    if (!isFlashing) return;

    // Flash interval timer
    const flashTimer = setInterval(() => {
      setCurrentColorIndex(prev => (prev + 1) % colors.length);
    }, flashInterval);

    // Duration timer to stop flashing
    const durationTimer = setTimeout(() => {
      stopFlash();
    }, duration);

    return () => {
      clearInterval(flashTimer);
      clearTimeout(durationTimer);
    };
  }, [isFlashing, flashInterval, duration, colors.length, stopFlash]);

  const flashStyle: React.CSSProperties = isFlashing
    ? {
        backgroundColor: colors[currentColorIndex],
        transition: `background-color ${flashInterval / 4}ms ease-out`,
      }
    : {};

  return {
    isFlashing,
    flashStyle,
    startFlash,
    stopFlash,
    currentColor: isFlashing ? colors[currentColorIndex] : undefined,
  };
};