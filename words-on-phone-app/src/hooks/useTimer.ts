import { useEffect, useRef, useState, useCallback } from 'react';

interface UseTimerOptions {
  duration: number; // in seconds
  onComplete?: () => void;
  onTick?: (timeRemaining: number) => void;
}

export const useTimer = ({ duration, onComplete, onTick }: UseTimerOptions) => {
  const [timeRemaining, setTimeRemaining] = useState(duration * 1000); // convert to ms
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const startTimeRef = useRef<number | null>(null);
  const pausedTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  const updateTimer = useCallback(() => {
    if (!startTimeRef.current || isPaused) return;

    const now = performance.now();
    const elapsed = now - startTimeRef.current + pausedTimeRef.current;
    const remaining = Math.max(0, duration * 1000 - elapsed);
    
    // Update time remaining
    setTimeRemaining(remaining);
    
    // Call onTick callback every ~100ms to avoid too frequent updates
    if (now - lastTickRef.current >= 100) {
      onTick?.(Math.ceil(remaining / 1000));
      lastTickRef.current = now;
    }

    if (remaining > 0) {
      animationFrameRef.current = requestAnimationFrame(updateTimer);
    } else {
      setIsRunning(false);
      onComplete?.();
    }
  }, [duration, isPaused, onComplete, onTick]);

  const start = useCallback(() => {
    if (isRunning) return;
    
    startTimeRef.current = performance.now();
    pausedTimeRef.current = 0;
    lastTickRef.current = performance.now();
    setIsRunning(true);
    setIsPaused(false);
    animationFrameRef.current = requestAnimationFrame(updateTimer);
  }, [isRunning, updateTimer]);

  const pause = useCallback(() => {
    if (!isRunning || isPaused) return;
    
    setIsPaused(true);
    if (startTimeRef.current) {
      pausedTimeRef.current += performance.now() - startTimeRef.current;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, [isRunning, isPaused]);

  const resume = useCallback(() => {
    if (!isRunning || !isPaused) return;
    
    setIsPaused(false);
    startTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(updateTimer);
  }, [isRunning, isPaused, updateTimer]);

  const stop = useCallback(() => {
    setIsRunning(false);
    setIsPaused(false);
    setTimeRemaining(duration * 1000);
    startTimeRef.current = null;
    pausedTimeRef.current = 0;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, [duration]);

  const reset = useCallback(() => {
    stop();
    setTimeRemaining(duration * 1000);
  }, [duration, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Update duration when it changes
  useEffect(() => {
    if (!isRunning) {
      setTimeRemaining(duration * 1000);
    }
  }, [duration, isRunning]);

  return {
    timeRemaining: Math.ceil(timeRemaining / 1000), // return in seconds
    timeRemainingMs: timeRemaining,
    isRunning,
    isPaused,
    start,
    pause,
    resume,
    stop,
    reset
  };
}; 