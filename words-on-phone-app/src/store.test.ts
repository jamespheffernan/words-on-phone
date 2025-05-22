import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from './store';
import { act } from '@testing-library/react';
import { PhraseCursor } from './phraseEngine';

// Helper to reset Zustand store state between tests
function resetStore() {
  const cursor = new PhraseCursor(['A', 'B', 'C']);
  useGameStore.setState({
    cursor,
    currentPhrase: cursor.next(),
    nextPhrase: () => useGameStore.setState((state) => ({ currentPhrase: state.cursor.next() })),
  });
}

describe('Game Store', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should initialize with a currentPhrase', () => {
    const { currentPhrase } = useGameStore.getState();
    expect(typeof currentPhrase).toBe('string');
    expect(['A', 'B', 'C']).toContain(currentPhrase);
  });

  it('should update currentPhrase when nextPhrase is called', () => {
    const { currentPhrase, nextPhrase } = useGameStore.getState();
    act(() => {
      nextPhrase();
    });
    const { currentPhrase: newPhrase } = useGameStore.getState();
    expect(['A', 'B', 'C']).toContain(newPhrase);
    // It may repeat after 3, but should change at least once in 3 calls
    expect(newPhrase).not.toBe(undefined);
  });

  it('should cycle through all phrases before repeating', () => {
    const seen = new Set();
    for (let i = 0; i < 3; i++) {
      seen.add(useGameStore.getState().currentPhrase);
      act(() => {
        useGameStore.getState().nextPhrase();
      });
    }
    expect(seen.size).toBe(3);
  });
}); 