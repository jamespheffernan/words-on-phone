import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QuickPlayWidget } from '../QuickPlayWidget';
import { useGameStore } from '../../store';
import { useCategoryMetadata } from '../../hooks/useCategoryMetadata';
import { useCategoryPopularity } from '../../hooks/useCategoryPopularity';
import { CategoryMetadata } from '../../types/category';

// Mock dependencies
vi.mock('../../store');
vi.mock('../../hooks/useCategoryMetadata');
vi.mock('../../hooks/useCategoryPopularity');
vi.mock('../../hooks/useHaptics', () => ({
  useHaptics: () => ({
    triggerImpact: vi.fn(),
    triggerNotification: vi.fn()
  })
}));

const mockCategories: CategoryMetadata[] = [
  { id: 'movies-tv', name: 'Movies & TV', type: 'default', phraseCount: 50, createdAt: 0 },
  { id: 'music-artists', name: 'Music & Artists', type: 'default', phraseCount: 45, createdAt: 0 },
  { id: 'sports-athletes', name: 'Sports & Athletes', type: 'default', phraseCount: 40, createdAt: 0 },
  { id: 'food-drink', name: 'Food & Drink', type: 'default', phraseCount: 55, createdAt: 0 }
];

const mockTopCategories = mockCategories.map(cat => ({
  ...cat,
  popularityScore: Math.random() * 100,
  popularityData: {
    categoryId: cat.id,
    playCount: Math.floor(Math.random() * 10) + 1,
    lastPlayed: Date.now() - Math.random() * 86400000,
    createdAt: Date.now() - 86400000 * 30
  }
}));

describe('QuickPlayWidget', () => {
  const mockSetSelectedCategories = vi.fn();
  const mockStartGame = vi.fn();
  const mockGetPopularityData = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock useGameStore
    (useGameStore as any).mockReturnValue({
      setSelectedCategories: mockSetSelectedCategories,
      startGame: mockStartGame,
      selectedCategories: []
    });

    // Mock useCategoryMetadata
    (useCategoryMetadata as any).mockReturnValue({
      defaultCategories: mockCategories,
      customCategories: [],
      loading: false
    });

    // Mock useCategoryPopularity
    (useCategoryPopularity as any).mockReturnValue({
      topCategories: mockTopCategories,
      getPopularityData: mockGetPopularityData,
      loading: false
    });

    // Setup popularity data mock
    mockGetPopularityData.mockImplementation((categoryId: string) => {
      const category = mockTopCategories.find(cat => cat.id === categoryId);
      return category?.popularityData;
    });
  });

  it('should render with expanded state by default', () => {
    render(<QuickPlayWidget />);
    
    expect(screen.getByText('⚡ Quick Play')).toBeInTheDocument();
    expect(screen.getByText('Surprise Me!')).toBeInTheDocument();
    expect(screen.getByText('Popular Categories')).toBeInTheDocument();
  });

  it('should be collapsible', async () => {
    render(<QuickPlayWidget />);
    
    const header = screen.getByRole('button', { name: /collapse quick play/i });
    fireEvent.click(header);
    
    // Should collapse - Quick actions and categories should not be visible
    await waitFor(() => {
      expect(screen.queryByText('Surprise Me!')).not.toBeInTheDocument();
      expect(screen.queryByText('Popular Categories')).not.toBeInTheDocument();
    });
  });

  it('should display last played category when available', () => {
    const lastPlayedCategory = mockTopCategories[0];
    mockGetPopularityData.mockReturnValue({
      categoryId: lastPlayedCategory.id,
      playCount: 3,
      lastPlayed: Date.now() - 3600000, // 1 hour ago
      createdAt: Date.now() - 86400000
    });

    render(<QuickPlayWidget />);
    
    expect(screen.getByText('Last Played')).toBeInTheDocument();
    // Check specifically in the last played button context
    expect(screen.getByTitle(`Continue with ${lastPlayedCategory.name}`)).toBeInTheDocument();
  });

  it('should handle Surprise Me selection', async () => {
    const onCategorySelected = vi.fn();
    const onGameStart = vi.fn();
    
    render(
      <QuickPlayWidget 
        onCategorySelected={onCategorySelected}
        onGameStart={onGameStart}
      />
    );
    
    const surpriseMeButton = screen.getByText('Surprise Me!').closest('button');
    fireEvent.click(surpriseMeButton!);
    
    expect(mockSetSelectedCategories).toHaveBeenCalledWith([expect.any(String)]);
    
    // Should auto-start game after selection
    await waitFor(() => {
      expect(mockStartGame).toHaveBeenCalled();
    }, { timeout: 200 });
  });

  it('should handle last played quick start', async () => {
    const lastPlayedCategory = mockTopCategories[0];
    mockGetPopularityData.mockReturnValue({
      categoryId: lastPlayedCategory.id,
      playCount: 3,
      lastPlayed: Date.now() - 3600000,
      createdAt: Date.now() - 86400000
    });

    const onCategorySelected = vi.fn();
    const onGameStart = vi.fn();
    
    render(
      <QuickPlayWidget 
        onCategorySelected={onCategorySelected}
        onGameStart={onGameStart}
      />
    );
    
    const lastPlayedButton = screen.getByText('Last Played').closest('button');
    fireEvent.click(lastPlayedButton!);
    
    expect(mockSetSelectedCategories).toHaveBeenCalledWith([lastPlayedCategory.name]);
    expect(onCategorySelected).toHaveBeenCalledWith(lastPlayedCategory.name);
    
    // Should auto-start game after selection
    await waitFor(() => {
      expect(mockStartGame).toHaveBeenCalled();
      expect(onGameStart).toHaveBeenCalled();
    }, { timeout: 200 });
  });

  it('should handle category tile quick start', async () => {
    const onCategorySelected = vi.fn();
    const onGameStart = vi.fn();
    
    render(
      <QuickPlayWidget 
        onCategorySelected={onCategorySelected}
        onGameStart={onGameStart}
      />
    );
    
    const categoryTile = screen.getByText(mockTopCategories[0].name).closest('button');
    fireEvent.click(categoryTile!);
    
    expect(mockSetSelectedCategories).toHaveBeenCalledWith([mockTopCategories[0].name]);
    expect(onCategorySelected).toHaveBeenCalledWith(mockTopCategories[0].name);
    
    // Should auto-start game after selection
    await waitFor(() => {
      expect(mockStartGame).toHaveBeenCalled();
      expect(onGameStart).toHaveBeenCalled();
    }, { timeout: 200 });
  });

  it('should display category statistics', () => {
    render(<QuickPlayWidget />);
    
    // Check that category tiles show phrase counts
    const firstCategory = mockTopCategories[0];
    expect(screen.getByText(firstCategory.phraseCount.toString())).toBeInTheDocument();
  });

  it('should show tap count indicator', () => {
    render(<QuickPlayWidget />);
    
    expect(screen.getByText('👆 1-2 taps to start playing!')).toBeInTheDocument();
  });

  it('should show loading state when categories are loading', () => {
    (useCategoryPopularity as any).mockReturnValue({
      topCategories: [],
      getPopularityData: vi.fn(),
      loading: true
    });

    render(<QuickPlayWidget />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should display up to 6 popular categories', () => {
    const manyCategories = Array.from({ length: 10 }, (_, i) => ({
      ...mockCategories[0],
      id: `category-${i}`,
      name: `Category ${i}`,
      popularityScore: Math.random() * 100
    }));

    (useCategoryPopularity as any).mockReturnValue({
      topCategories: manyCategories,
      getPopularityData: mockGetPopularityData,
      loading: false
    });

    render(<QuickPlayWidget />);
    
    // Should only show 6 categories max
    const categoryTiles = screen.getAllByText(/Category \d/).length;
    expect(categoryTiles).toBeLessThanOrEqual(6);
  });

  it('should have proper accessibility attributes', () => {
    render(<QuickPlayWidget />);
    
    const header = screen.getByRole('button', { name: /collapse quick play/i });
    expect(header).toHaveAttribute('aria-expanded', 'true');
  });
}); 