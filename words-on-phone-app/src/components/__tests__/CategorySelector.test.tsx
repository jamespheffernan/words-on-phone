import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CategorySelector } from '../CategorySelector';
import { CategoryMetadata } from '../../types/category';
import { useGameStore } from '../../store';

const defaults: CategoryMetadata[] = [
  { id: 'movies', name: 'Movies & TV', type: 'default', phraseCount: 10, createdAt: 0 },
  { id: 'music', name: 'Music & Artists', type: 'default', phraseCount: 8, createdAt: 0 }
];
const customs: CategoryMetadata[] = [
  { id: 'kitchen', name: 'Kitchen Stuff', type: 'custom', phraseCount: 15, createdAt: Date.now() }
];

afterEach(() => {
  useGameStore.getState().togglePinnedCategory('Movies & TV'); // reset pin if toggled
  useGameStore.setState({ pinnedCategories: [] });
});

test('renders categories and allows selection', () => {
  const onChange = jest.fn();
  render(
    <CategorySelector
      defaultCategories={defaults}
      customCategories={customs}
      selected={[]}
      onChange={onChange}
    />
  );
  fireEvent.click(screen.getByLabelText('Select Kitchen Stuff category'));
  expect(onChange).toHaveBeenCalledWith(['Kitchen Stuff']);
});

test('pin button toggles pinned state', () => {
  render(
    <CategorySelector
      defaultCategories={defaults}
      customCategories={[]}
      selected={[]}
      onChange={() => {}}
    />
  );
  const star = screen.getAllByText('★')[0];
  fireEvent.click(star);
  expect(useGameStore.getState().pinnedCategories).toContain('Movies & TV');
}); 