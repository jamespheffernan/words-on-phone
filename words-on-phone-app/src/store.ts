import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { phrases, PhraseCategory, getPhrasesByCategory } from './data/phrases';
import { PhraseCursor } from './phraseEngine';

export enum GameStatus {
  MENU = 'menu',
  PLAYING = 'playing',
  PAUSED = 'paused'
}

interface GameState {
  // Game status
  status: GameStatus;
  
  // Phrase management
  cursor: PhraseCursor<string>;
  currentPhrase: string;
  selectedCategory: PhraseCategory;
  
  // Game settings
  timerDuration: number; // in seconds (30-90)
  skipLimit: number; // 0 = unlimited, 1-5 = fixed cap
  buzzerSound: string; // sound file name
  
  // Round state
  skipsUsed: number;
  skipsRemaining: number;
  correctCount: number;
  
  // Actions
  nextPhrase: () => void;
  skipPhrase: () => void;
  setCategory: (category: PhraseCategory) => void;
  setTimerDuration: (seconds: number) => void;
  setSkipLimit: (limit: number) => void;
  setBuzzerSound: (sound: string) => void;
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  endGame: () => void;
  resetRound: () => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => {
      const cursor = new PhraseCursor(phrases);
      const initialSkipLimit = 3;
      
      return {
        // Initial state
        status: GameStatus.MENU,
        cursor,
        currentPhrase: '',
        selectedCategory: PhraseCategory.EVERYTHING,
        timerDuration: 60,
        skipLimit: initialSkipLimit,
        buzzerSound: 'default',
        skipsUsed: 0,
        skipsRemaining: initialSkipLimit,
        correctCount: 0,
        
        // Actions
        nextPhrase: () => set((state) => {
          const nextPhrase = state.cursor.next();
          return {
            currentPhrase: nextPhrase,
            correctCount: state.correctCount + 1,
            skipsUsed: 0, // Reset skips on correct answer
            skipsRemaining: state.skipLimit === 0 ? Infinity : state.skipLimit
          };
        }),
        
        skipPhrase: () => set((state) => {
          if (state.skipLimit === 0 || state.skipsRemaining > 0) {
            const nextPhrase = state.cursor.next();
            return {
              currentPhrase: nextPhrase,
              skipsUsed: state.skipsUsed + 1,
              skipsRemaining: state.skipLimit === 0 
                ? Infinity 
                : Math.max(0, state.skipsRemaining - 1)
            };
          }
          return state;
        }),
        
        setCategory: (category) => set(() => {
          const categoryPhrases = getPhrasesByCategory(category);
          const newCursor = new PhraseCursor(categoryPhrases);
          return {
            selectedCategory: category,
            cursor: newCursor,
            currentPhrase: ''
          };
        }),
        
        setTimerDuration: (seconds) => set({ timerDuration: seconds }),
        
        setSkipLimit: (limit) => set({ 
          skipLimit: limit,
          skipsRemaining: limit === 0 ? Infinity : limit 
        }),
        
        setBuzzerSound: (sound) => set({ buzzerSound: sound }),
        
        startGame: () => set((state) => ({
          status: GameStatus.PLAYING,
          currentPhrase: state.cursor.next(),
          skipsUsed: 0,
          skipsRemaining: state.skipLimit === 0 ? Infinity : state.skipLimit,
          correctCount: 0
        })),
        
        pauseGame: () => set({ status: GameStatus.PAUSED }),
        
        resumeGame: () => set({ status: GameStatus.PLAYING }),
        
        endGame: () => set({ 
          status: GameStatus.MENU,
          currentPhrase: '',
          skipsUsed: 0,
          skipsRemaining: get().skipLimit === 0 ? Infinity : get().skipLimit,
          correctCount: 0
        }),
        
        resetRound: () => set((state) => ({
          skipsUsed: 0,
          skipsRemaining: state.skipLimit === 0 ? Infinity : state.skipLimit,
          correctCount: 0
        }))
      };
    },
    {
      name: 'words-on-phone-storage',
      partialize: (state) => ({
        selectedCategory: state.selectedCategory,
        timerDuration: state.timerDuration,
        skipLimit: state.skipLimit,
        buzzerSound: state.buzzerSound
      })
    }
  )
); 