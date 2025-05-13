import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import GameResults from './GameResults';
import { useGameStore } from '../store/gameStore';

// Mock the game store
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

// Mock the storage functions
vi.mock('../utils/storage', () => ({
  getDarkMode: vi.fn().mockResolvedValue(false)
}));

describe('GameResults Component', () => {
  const mockStartNewGame = vi.fn();
  const mockGoToHome = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create a more realistic mock of the store selector
    (useGameStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(selector => {
      const state = {
        usedPhrases: [],
        gameTime: 0,
        startNewGame: mockStartNewGame,
        goToHome: mockGoToHome
      };
      return selector(state);
    });
  });
  
  it('displays game summary and used phrases', () => {
    // Override the default mock for this test
    (useGameStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(selector => {
      const state = {
        usedPhrases: ['Phrase 1', 'Phrase 2', 'Phrase 3'],
        gameTime: 120, // 2 minutes
        startNewGame: mockStartNewGame,
        goToHome: mockGoToHome
      };
      return selector(state);
    });

    render(<GameResults />);
    
    // Check for summary information
    expect(screen.getByText('Game Complete!')).toBeInTheDocument();
    
    // Check for phrases
    const phraseItems = screen.getAllByRole('listitem');
    expect(phraseItems).toHaveLength(3);
    expect(phraseItems[0]).toHaveTextContent('Phrase 1');
    expect(phraseItems[1]).toHaveTextContent('Phrase 2');
    expect(phraseItems[2]).toHaveTextContent('Phrase 3');
    
    // Check for correct game time
    expect(screen.getByText('2m 0s')).toBeInTheDocument();
  });

  it('calls startNewGame when Play Again button is clicked', () => {
    // Override the default mock for this test
    (useGameStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(selector => {
      const state = {
        usedPhrases: ['Phrase 1'],
        gameTime: 60,
        startNewGame: mockStartNewGame,
        goToHome: mockGoToHome
      };
      return selector(state);
    });

    render(<GameResults />);
    
    // Directly call the handler rather than clicking the button
    // This is more reliable in the test environment
    const playAgainButton = screen.getByText('Play Again');
    fireEvent.click(playAgainButton);
    
    // Check if startNewGame was called
    expect(mockStartNewGame).toHaveBeenCalled();
  });

  it('calls goToHome when Back to Home button is clicked', () => {
    // Override the default mock for this test
    (useGameStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(selector => {
      const state = {
        usedPhrases: ['Phrase 1'],
        gameTime: 60,
        startNewGame: mockStartNewGame,
        goToHome: mockGoToHome
      };
      return selector(state);
    });

    render(<GameResults />);
    
    // Directly click the button
    const homeButton = screen.getByText('Back to Home');
    fireEvent.click(homeButton);
    
    // Check if goToHome was called
    expect(mockGoToHome).toHaveBeenCalled();
  });

  it('displays a message when no phrases were played', () => {
    // Use the default mock which has no phrases
    render(<GameResults />);
    
    // Check for no phrases message
    expect(screen.getByText('No phrases were played in this game.')).toBeInTheDocument();
  });
}); 