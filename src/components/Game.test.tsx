import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Game from './Game';
import { useGameStore } from '../store/gameStore';

// Mock the Zustand store
vi.mock('../store/gameStore', () => {
  const actual = vi.importActual('../store/gameStore');
  return {
    ...actual,
    useGameStore: vi.fn()
  };
});

// Mock the haptics functions
vi.mock('../utils/haptics', () => ({
  vibrate: vi.fn(),
  vibrateSuccess: vi.fn(),
  vibrateError: vi.fn(),
  vibrateWarning: vi.fn(),
  ImpactStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy'
  }
}));

describe('Game Component', () => {
  // Create mock functions for store actions
  const mockStartGame = vi.fn();
  const mockStopGame = vi.fn();
  const mockGetRandomPhrase = vi.fn().mockReturnValue('Random Phrase');
  const mockSetState = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up our mock implementation for useGameStore
    // Different selectors will be used by the component
    (useGameStore as any).mockImplementation((selector: any) => {
      // Create a mock state object
      const state = {
        isGameRunning: false,
        currentPhrase: null,
        usedPhrases: [],
        timerDuration: 60,
        startGame: mockStartGame,
        stopGame: mockStopGame,
        getRandomPhrase: mockGetRandomPhrase,
        setState: mockSetState
      };
      
      // Return the selector result
      return selector(state);
    });
    
    // Also mock the setState function
    useGameStore.setState = mockSetState;
  });

  it('should display start button when game is not running', () => {
    render(<Game darkMode={false} />);
    expect(screen.getByText(/start game/i)).toBeInTheDocument();
  });
  
  it('should start the game when start button is clicked', () => {
    render(<Game darkMode={false} />);
    const startButton = screen.getByText(/start game/i);
    fireEvent.click(startButton);
    expect(mockStartGame).toHaveBeenCalled();
  });
  
  it('should display the current phrase when game is running', () => {
    // Override the isGameRunning selector only
    (useGameStore as any).mockImplementation((selector: any) => {
      const state = {
        isGameRunning: true,
        currentPhrase: 'Test phrase',
        usedPhrases: [],
        timerDuration: 60,
        startGame: mockStartGame,
        stopGame: mockStopGame,
        getRandomPhrase: mockGetRandomPhrase
      };
      
      return selector(state);
    });
    
    render(<Game darkMode={false} />);
    expect(screen.getByText('Test phrase')).toBeInTheDocument();
    expect(screen.getByText(/pass the phone/i)).toBeInTheDocument();
  });
  
  it('should end the game when end game button is clicked', () => {
    // Override for the running game state
    (useGameStore as any).mockImplementation((selector: any) => {
      const state = {
        isGameRunning: true,
        currentPhrase: 'Test phrase',
        usedPhrases: [],
        timerDuration: 60,
        startGame: mockStartGame,
        stopGame: mockStopGame,
        getRandomPhrase: mockGetRandomPhrase
      };
      
      return selector(state);
    });
    
    render(<Game darkMode={false} />);
    const endGameButton = screen.getByText('End Game');
    fireEvent.click(endGameButton);
    expect(mockStopGame).toHaveBeenCalled();
  });
}); 