import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import TimerProvider from './TimerProvider';
import { useGameStore } from '../store/gameStore';
import { playBuzzerSound } from '../assets/sounds';

// Mock the sound module
vi.mock('../assets/sounds', () => ({
  playBuzzerSound: vi.fn(),
}));

// Mock the zustand store
vi.mock('../store/gameStore', () => {
  const actual = vi.importActual('../store/gameStore');
  return {
    ...actual,
    useGameStore: vi.fn(),
  };
});

describe('TimerProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Mock the store implementation
    const mockStopGame = vi.fn();
    
    (useGameStore as any).mockImplementation((selector: any) => 
      selector({
        isGameRunning: true,
        timerDuration: 5, // 5 seconds for testing
        buzzSound: 'default',
        stopGame: mockStopGame,
      })
    );
  });
  
  afterEach(() => {
    vi.useRealTimers();
  });
  
  it('should start timer when game is running', () => {
    render(
      <TimerProvider>
        <div>Child Component</div>
      </TimerProvider>
    );
    
    // Timer should be running
    expect(screen.getByText(/Child Component/)).toBeInTheDocument();
  });
  
  it('should stop game and play sound when timer runs out', () => {
    const mockStopGame = vi.fn();
    (useGameStore as any).mockImplementation((selector: any) => 
      selector({
        isGameRunning: true,
        timerDuration: 5, // 5 seconds
        buzzSound: 'buzzer2',
        stopGame: mockStopGame,
      })
    );
    
    render(
      <TimerProvider>
        <div>Child Component</div>
      </TimerProvider>
    );
    
    // Fast-forward 6 seconds (more than timer duration)
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    
    // Game should have been stopped and sound played
    expect(mockStopGame).toHaveBeenCalled();
    expect(playBuzzerSound).toHaveBeenCalledWith('buzzer2');
  });
  
  it('should not set timer when game is not running', () => {
    const mockStopGame = vi.fn();
    (useGameStore as any).mockImplementation((selector: any) => 
      selector({
        isGameRunning: false,
        timerDuration: 5,
        buzzSound: 'default',
        stopGame: mockStopGame,
      })
    );
    
    render(
      <TimerProvider>
        <div>Child Component</div>
      </TimerProvider>
    );
    
    // Fast-forward 6 seconds
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    
    // stopGame should not have been called
    expect(mockStopGame).not.toHaveBeenCalled();
    expect(playBuzzerSound).not.toHaveBeenCalled();
  });
}); 