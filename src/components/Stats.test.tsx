import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import Stats from './Stats';
import { getGameStats } from '../utils/storage';

// Mock the storage utilities
vi.mock('../utils/storage', () => ({
  getGameStats: vi.fn(),
  getPhraseStats: vi.fn()
}));

describe('Stats Component', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders loading state initially', () => {
    // Set up mocks
    const mockGetGameStats = getGameStats as unknown as ReturnType<typeof vi.fn>;
    mockGetGameStats.mockImplementation(() => new Promise(() => {})); // Never resolves to keep loading

    render(<Stats darkMode={false} />);
    
    expect(screen.getByText('Loading stats...')).toBeInTheDocument();
  });

  it('renders no statistics message when stats are null', async () => {
    // Set up mocks
    const mockGetGameStats = getGameStats as unknown as ReturnType<typeof vi.fn>;
    mockGetGameStats.mockResolvedValue(null);

    render(<Stats darkMode={false} />);
    
    await waitFor(() => {
      expect(screen.getByText('No statistics available')).toBeInTheDocument();
    });
  });

  it('renders game statistics when available', async () => {
    // Set up mocks
    const mockGetGameStats = getGameStats as unknown as ReturnType<typeof vi.fn>;
    mockGetGameStats.mockResolvedValue({
      totalGames: 10,
      phrasesPlayed: 50,
      lastPlayed: new Date('2023-01-01T12:00:00Z'),
      averagePhrasesPerGame: 5,
      totalPlayTime: 600
    });

    render(<Stats darkMode={false} />);
    
    await waitFor(() => {
      expect(screen.getByText('Game Statistics')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument(); // Total Games
      expect(screen.getByText('50')).toBeInTheDocument(); // Phrases Played
      expect(screen.getByText('5')).toBeInTheDocument(); // Average phrases per game
    });
  });

  it('renders top phrases section when available', async () => {
    // Set up mocks
    const mockGetGameStats = getGameStats as unknown as ReturnType<typeof vi.fn>;
    mockGetGameStats.mockResolvedValue({
      totalGames: 5,
      phrasesPlayed: 20,
      lastPlayed: new Date('2023-01-01T12:00:00Z'),
      topPhrases: [
        { phrase: 'Test Phrase 1', timesPlayed: 3 },
        { phrase: 'Test Phrase 2', timesPlayed: 2 }
      ]
    });

    render(<Stats darkMode={false} />);
    
    await waitFor(() => {
      expect(screen.getByText('Top Phrases')).toBeInTheDocument();
      expect(screen.getByText('Test Phrase 1')).toBeInTheDocument();
      expect(screen.getByText('Test Phrase 2')).toBeInTheDocument();
    });
  });
}); 