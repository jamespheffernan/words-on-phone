import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi } from 'vitest';
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
  const onChange = vi.fn();
  act(() => {
    render(
      <CategorySelector
        defaultCategories={defaults}
        customCategories={customs}
        selected={[]}
        onChange={onChange}
      />
    );
  });
  // Switch to the Custom tab
  const customTab = screen.getByRole('button', { name: /Custom/i });
  act(() => {
    fireEvent.click(customTab);
  });
  // Find the checkbox for Kitchen Stuff
  const kitchenCheckbox = screen.getByLabelText(/Kitchen Stuff/);
  act(() => {
    fireEvent.click(kitchenCheckbox);
  });
  expect(onChange).toHaveBeenCalledWith(['Kitchen Stuff']);
});

test('pin button toggles pinned state', () => {
  act(() => {
    render(
      <CategorySelector
        defaultCategories={defaults}
        customCategories={[]}
        selected={[]}
        onChange={() => {}}
      />
    );
  });
  const star = screen.getAllByRole('button', { name: /Pin/i })[0];
  act(() => {
    fireEvent.click(star);
  });
  expect(useGameStore.getState().pinnedCategories).toContain('Movies & TV');
});

test('allows multi-selection and displays phrase counts', () => {
  const onChange = vi.fn();
  act(() => {
    render(
      <CategorySelector
        defaultCategories={defaults}
        customCategories={customs}
        selected={['Movies & TV']}
        onChange={onChange}
      />
    );
  });
  // Select Music & Artists as well
  const musicCheckbox = screen.getByLabelText(/Music & Artists/);
  act(() => {
    fireEvent.click(musicCheckbox);
  });
  expect(onChange).toHaveBeenCalledWith(['Movies & TV', 'Music & Artists']);
  // Check phrase count display for default categories before switching tab
  expect(screen.getByText((_, node) => node?.textContent === '(10)')).toBeInTheDocument();
  expect(screen.getByText((_, node) => node?.textContent === '(8)')).toBeInTheDocument();
  // Switch to the Custom tab to see custom category
  const customTab = screen.getByRole('button', { name: /Custom/i });
  act(() => {
    fireEvent.click(customTab);
  });
  // Check phrase count display for custom category only
  expect(screen.getByText((_, node) => node?.textContent === '(15)')).toBeInTheDocument();
}); 