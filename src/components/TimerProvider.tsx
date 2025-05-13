import React, { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { playBuzzerSound } from '../assets/sounds';

interface TimerProviderProps {
  children: React.ReactNode;
}

const TimerProvider: React.FC<TimerProviderProps> = ({ children }) => {
  const { isGameRunning, timerDuration, buzzSound, stopGame } = useGameStore(state => ({
    isGameRunning: state.isGameRunning,
    timerDuration: state.timerDuration,
    buzzSound: state.buzzSound,
    stopGame: state.stopGame,
  }));
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Clear any existing timers
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    // Start new timer if game is running
    if (isGameRunning) {
      const timeoutDuration = timerDuration * 1000; // convert seconds to milliseconds
      timerRef.current = setTimeout(() => {
        // Play buzzer sound when timer ends
        playBuzzerSound(buzzSound);
        
        // Timer expired, stop the game
        stopGame();
      }, timeoutDuration);
    }
    
    // Clean up timer on unmount
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isGameRunning, timerDuration, buzzSound, stopGame]);
  
  return <>{children}</>;
};

export default TimerProvider; 