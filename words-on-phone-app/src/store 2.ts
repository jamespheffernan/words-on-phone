import { create } from 'zustand';
import { phrases } from './data/phrases';
import { PhraseCursor } from './phraseEngine';

interface GameState {
  cursor: PhraseCursor<string>;
  currentPhrase: string;
  nextPhrase: () => void;
}

export const useGameStore = create<GameState>((set, get) => {
  const cursor = new PhraseCursor(phrases);
  return {
    cursor,
    currentPhrase: cursor.next(),
    nextPhrase: () => set(() => ({ currentPhrase: get().cursor.next() })),
  };
}); 