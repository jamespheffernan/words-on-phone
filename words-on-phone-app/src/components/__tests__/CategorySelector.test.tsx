import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CategorySelector } from '../CategorySelector';
import { CategoryMetadata } from '../../types/category';
import { useGameStore } from '../../store';

// Mock the store
const mockTogglePinnedCategory = vi.fn();
const mockToggleGroupExpanded = vi.fn();
const mockExpandAllGroups = vi.fn();
const mockCollapseAllGroups = vi.fn();

vi.mock('../../store', () => ({
  useGameStore: () => ({
    pinnedCategories: ['Movies & TV'],
    togglePinnedCategory: mockTogglePinnedCategory,
    expandedGroups: new Set(['entertainment']),
    toggleGroupExpanded: mockToggleGroupExpanded,
    expandAllGroups: mockExpandAllGroups,
    collapseAllGroups: mockCollapseAllGroups
  })
}));

describe('CategorySelector', () => {
  const mockOnChange = vi.fn();
  
  const defaultCategories: CategoryMetadata[] = [
    { id: 'movies-tv', name: 'Movies & TV', type: 'default', phraseCount: 100, createdAt: 0 },
    { id: 'music-artists', name: 'Music & Artists', type: 'default', phraseCount: 75, createdAt: 0 },
    { id: 'entertainment-pop-culture', name: 'Entertainment & Pop Culture', type: 'default', phraseCount: 85, createdAt: 0 },
    { id: 'food-drink', name: 'Food & Drink', type: 'default', phraseCount: 120, createdAt: 0 },
    { id: 'sports-athletes', name: 'Sports & Athletes', type: 'default', phraseCount: 90, createdAt: 0 }
  ];

  const customCategories: CategoryMetadata[] = [
    { id: 'custom-1', name: 'Custom Category', type: 'custom', phraseCount: 20, createdAt: Date.now() }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders default and custom tabs', () => {
    render(
      <CategorySelector
        defaultCategories={defaultCategories}
        customCategories={customCategories}
        selected={['Movies & TV']}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('Default')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();
  });

  it('displays accordion groups for default categories', () => {
    render(
      <CategorySelector
        defaultCategories={defaultCategories}
        customCategories={customCategories}
        selected={['Movies & TV']}
        onChange={mockOnChange}
      />
    );

    // Entertainment group should be visible and expanded
    expect(screen.getByText('🎬')).toBeInTheDocument();
    expect(screen.getByText('Entertainment')).toBeInTheDocument();
    
    // Should show grouped categories when expanded
    expect(screen.getByText('Movies & TV')).toBeInTheDocument();
    expect(screen.getByText('Music & Artists')).toBeInTheDocument();
  });

  it('toggles group expansion when clicking accordion header', () => {
    render(
      <CategorySelector
        defaultCategories={defaultCategories}
        customCategories={customCategories}
        selected={[]}
        onChange={mockOnChange}
      />
    );

    const entertainmentHeader = screen.getByLabelText(/Entertainment category group/);
    fireEvent.click(entertainmentHeader);

    expect(mockToggleGroupExpanded).toHaveBeenCalledWith('entertainment');
  });

  it('shows expand/collapse all buttons for default categories', () => {
    render(
      <CategorySelector
        defaultCategories={defaultCategories}
        customCategories={customCategories}
        selected={[]}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('Expand All')).toBeInTheDocument();
  });

  it('calls expand all groups when clicking expand all button', () => {
    render(
      <CategorySelector
        defaultCategories={defaultCategories}
        customCategories={customCategories}
        selected={[]}
        onChange={mockOnChange}
      />
    );

    const expandAllButton = screen.getByText('Expand All');
    fireEvent.click(expandAllButton);

    expect(mockExpandAllGroups).toHaveBeenCalled();
  });

  it('switches to flat view for custom categories', () => {
    render(
      <CategorySelector
        defaultCategories={defaultCategories}
        customCategories={customCategories}
        selected={[]}
        onChange={mockOnChange}
      />
    );

    // Switch to custom tab
    const customTab = screen.getByText('Custom');
    fireEvent.click(customTab);

    // Should show flat grid instead of accordion
    expect(screen.getByText('Custom Category')).toBeInTheDocument();
    expect(screen.queryByText('Entertainment')).not.toBeInTheDocument();
  });

  it('handles category selection in accordion groups', () => {
    render(
      <CategorySelector
        defaultCategories={defaultCategories}
        customCategories={customCategories}
        selected={[]}
        onChange={mockOnChange}
      />
    );

    const moviesTvCheckbox = screen.getByLabelText(/Movies & TV/);
    fireEvent.click(moviesTvCheckbox);

    expect(mockOnChange).toHaveBeenCalledWith(['Movies & TV']);
  });

  it('shows correct selection count in accordion headers', () => {
    render(
      <CategorySelector
        defaultCategories={defaultCategories}
        customCategories={customCategories}
        selected={['Movies & TV', 'Music & Artists']}
        onChange={mockOnChange}
      />
    );

    // Entertainment group should show 2/3 selected (Movies & TV, Music & Artists, Entertainment & Pop Culture)
    expect(screen.getByText('(2/3)')).toBeInTheDocument();
  });

  it('handles pin/unpin functionality in accordion groups', () => {
    render(
      <CategorySelector
        defaultCategories={defaultCategories}
        customCategories={customCategories}
        selected={[]}
        onChange={mockOnChange}
      />
    );

    const pinButtons = screen.getAllByLabelText(/Pin|Unpin/);
    fireEvent.click(pinButtons[0]);

    expect(mockTogglePinnedCategory).toHaveBeenCalled();
  });

  it('sorts categories within groups based on sort key', () => {
    render(
      <CategorySelector
        defaultCategories={defaultCategories}
        customCategories={customCategories}
        selected={[]}
        onChange={mockOnChange}
      />
    );

    // Change to sort by phrase count
    const sortSelect = screen.getByLabelText('Sort categories');
    fireEvent.change(sortSelect, { target: { value: 'count' } });

    // Categories should be reordered (Food & Drink has 120 phrases, highest in entertainment group)
    expect(screen.getByText('Food & Drink')).toBeInTheDocument();
  });

  it('filters categories with search', () => {
    render(
      <CategorySelector
        defaultCategories={defaultCategories}
        customCategories={customCategories}
        selected={[]}
        onChange={mockOnChange}
      />
    );

    // Switch to custom tab for testing search
    const customTab = screen.getByText('Custom');
    fireEvent.click(customTab);

    const searchInput = screen.getByPlaceholderText('Search categories...');
    fireEvent.change(searchInput, { target: { value: 'Custom' } });

    expect(screen.getByText('Custom Category')).toBeInTheDocument();
  });

  it('handles loading state', () => {
    render(
      <CategorySelector
        defaultCategories={[]}
        customCategories={[]}
        selected={[]}
        onChange={mockOnChange}
        loading={true}
      />
    );

    expect(screen.getByText('Loading categories...')).toBeInTheDocument();
  });

  it('shows ungrouped categories section when present', () => {
    const categoriesWithUngrouped = [
      ...defaultCategories,
      { id: 'ungrouped-cat', name: 'Ungrouped Category', type: 'default' as const, phraseCount: 50, createdAt: 0 }
    ];

    render(
      <CategorySelector
        defaultCategories={categoriesWithUngrouped}
        customCategories={customCategories}
        selected={[]}
        onChange={mockOnChange}
      />
    );

    // Should show the Other Categories group for ungrouped items
    expect(screen.getByText('📂')).toBeInTheDocument();
    expect(screen.getByText('Other Categories')).toBeInTheDocument();
  });
}); 