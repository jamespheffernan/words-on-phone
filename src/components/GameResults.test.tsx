import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import GameResults from './GameResults';
import { useGameStore } from '../store/gameStore';

// Mock the game store
vi.mock('../store/gameStore', () => ({
  useGameStore: vi.fn()
}));

describe('GameResults Component', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('displays game summary and used phrases', () => {
    // Set up mock store data
    const mockStartNewGame = vi.fn();
    const mockGoToHome = vi.fn();
    
    (useGameStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      usedPhrases: ['Phrase 1', 'Phrase 2', 'Phrase 3'],
      gameTime: 120, // 2 minutes
      startNewGame: mockStartNewGame,
      goToHome: mockGoToHome
    });

    render(<GameResults />);
    
    // Check for summary information
    expect(screen.getByText('Game Complete!')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // Number of phrases
    expect(screen.getByText('2m 0s')).toBeInTheDocument(); // Game duration
    
    // Check for phrases
    expect(screen.getByText('Phrase 1')).toBeInTheDocument();
    expect(screen.getByText('Phrase 2')).toBeInTheDocument();
    expect(screen.getByText('Phrase 3')).toBeInTheDocument();
  });

  it('calls startNewGame when Play Again button is clicked', () => {
    // Set up mock store data
    const mockStartNewGame = vi.fn();
    const mockGoToHome = vi.fn();
    
    (useGameStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      usedPhrases: ['Phrase 1'],
      gameTime: 60,
      startNewGame: mockStartNewGame,
      goToHome: mockGoToHome
    });

    render(<GameResults />);
    
    // Click the Play Again button
    fireEvent.click(screen.getByText('Play Again'));
    
    // Check if startNewGame was called
    expect(mockStartNewGame).toHaveBeenCalled();
  });

  it('calls goToHome when Back to Home button is clicked', () => {
    // Set up mock store data
    const mockStartNewGame = vi.fn();
    const mockGoToHome = vi.fn();
    
    (useGameStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      usedPhrases: ['Phrase 1'],
      gameTime: 60,
      startNewGame: mockStartNewGame,
      goToHome: mockGoToHome
    });

    render(<GameResults />);
    
    // Click the Back to Home button
    fireEvent.click(screen.getByText('Back to Home'));
    
    // Check if goToHome was called
    expect(mockGoToHome).toHaveBeenCalled();
  });

  it('displays a message when no phrases were played', () => {
    // Set up mock store data with no phrases
    const mockStartNewGame = vi.fn();
    const mockGoToHome = vi.fn();
    
    (useGameStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      usedPhrases: [],
      gameTime: 0,
      startNewGame: mockStartNewGame,
      goToHome: mockGoToHome
    });

    render(<GameResults />);
    
    // Check for no phrases message
    expect(screen.getByText('No phrases were played in this game.')).toBeInTheDocument();
  });
}); 