import { create } from 'zustand';
import phrases from './phrasesData';

export interface GameState {
  isGameRunning: boolean;
  timerDuration: number;
  buzzSound: string;
  phrases: string[];
  currentPhrase: string | null;
  
  // Actions
  startGame: () => void;
  stopGame: () => void;
  setTimerDuration: (duration: number) => void;
  setBuzzSound: (sound: string) => void;
  getRandomPhrase: () => string;
}

export const useGameStore = create<GameState>((set, get) => ({
  isGameRunning: false,
  timerDuration: 60, // Default timer duration in seconds
  buzzSound: 'default',
  phrases, // Use the phrases from our data file
  currentPhrase: null,
  
  startGame: () => set({ isGameRunning: true, currentPhrase: get().getRandomPhrase() }),
  stopGame: () => set({ isGameRunning: false, currentPhrase: null }),
  setTimerDuration: (duration) => set({ timerDuration: duration }),
  setBuzzSound: (sound) => set({ buzzSound: sound }),
  getRandomPhrase: () => {
    const { phrases } = get();
    const randomIndex = Math.floor(Math.random() * phrases.length);
    return phrases[randomIndex];
  },
})); 