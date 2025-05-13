import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Game from './Game';
import { useGameStore } from '../store/gameStore';

// Mock the Zustand store
vi.mock('../store/gameStore', () => {
  const actual = vi.importActual('../store/gameStore');
  return {
    ...actual,
    useGameStore: vi.fn(),
  };
});

describe('Game Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock the store implementation
    const mockStartGame = vi.fn();
    const mockStopGame = vi.fn();
    
    (useGameStore as any).mockImplementation((selector: any) => 
      selector({
        isGameRunning: false,
        currentPhrase: null,
        timerDuration: 60,
        startGame: mockStartGame,
        stopGame: mockStopGame,
      })
    );
  });

  it('should display start button when game is not running', () => {
    render(<Game darkMode={false} />);
    expect(screen.getByText(/start game/i)).toBeInTheDocument();
  });
  
  it('should start the game when start button is clicked', () => {
    const mockStartGame = vi.fn();
    (useGameStore as any).mockImplementation((selector: any) => 
      selector({
        isGameRunning: false,
        currentPhrase: null,
        timerDuration: 60,
        startGame: mockStartGame,
        stopGame: vi.fn(),
      })
    );
    
    render(<Game darkMode={false} />);
    fireEvent.click(screen.getByText(/start game/i));
    expect(mockStartGame).toHaveBeenCalled();
  });
  
  it('should display the current phrase when game is running', () => {
    (useGameStore as any).mockImplementation((selector: any) => 
      selector({
        isGameRunning: true,
        currentPhrase: 'Test phrase',
        timerDuration: 60,
        startGame: vi.fn(),
        stopGame: vi.fn(),
      })
    );
    
    render(<Game darkMode={false} />);
    expect(screen.getByText('Test phrase')).toBeInTheDocument();
    expect(screen.getByText(/pass the phone/i)).toBeInTheDocument();
  });
  
  it('should stop the game when stop button is clicked', () => {
    const mockStopGame = vi.fn();
    (useGameStore as any).mockImplementation((selector: any) => 
      selector({
        isGameRunning: true,
        currentPhrase: 'Test phrase',
        timerDuration: 60,
        startGame: vi.fn(),
        stopGame: mockStopGame,
      })
    );
    
    render(<Game darkMode={false} />);
    fireEvent.click(screen.getByText(/stop game/i));
    expect(mockStopGame).toHaveBeenCalled();
  });
}); 