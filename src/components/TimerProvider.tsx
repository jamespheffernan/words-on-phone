import React, { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { playBuzzerSound } from '../assets/sounds';

interface TimerProviderProps {
  children: React.ReactNode;
}

const TimerProvider: React.FC<TimerProviderProps> = ({ children }) => {
  // Use separate selectors for better performance and to prevent infinite loops
  const isGameRunning = useGameStore(state => state.isGameRunning);
  const timerDuration = useGameStore(state => state.timerDuration);
  const buzzSound = useGameStore(state => state.buzzSound);
  const stopGame = useGameStore(state => state.stopGame);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Memoize the stop game handler
  const handleTimerExpired = useCallback(() => {
    // Play buzzer sound when timer ends
    playBuzzerSound(buzzSound);
    
    // Timer expired, stop the game
    stopGame();
  }, [buzzSound, stopGame]);
  
  useEffect(() => {
    // Clear any existing timers
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    // Start new timer if game is running
    if (isGameRunning) {
      const timeoutDuration = timerDuration * 1000; // convert seconds to milliseconds
      timerRef.current = setTimeout(handleTimerExpired, timeoutDuration);
    }
    
    // Clean up timer on unmount
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isGameRunning, timerDuration, handleTimerExpired]);
  
  return <>{children}</>;
};

export default TimerProvider; 