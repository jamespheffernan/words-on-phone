import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { phrases, PhraseCategory, getPhrasesByCategory } from './data/phrases';
import { PhraseCursor } from './phraseEngine';
import { BUZZER_SOUNDS, type BuzzerSoundType } from './hooks/useAudio';

export enum GameStatus {
  MENU = 'menu',
  PLAYING = 'playing',
  PAUSED = 'paused',
  ENDED = 'ended'
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
  buzzerSound: BuzzerSoundType; // buzzer sound type
  
  // Round state
  skipsUsed: number;
  skipsRemaining: number;
  correctCount: number;
  
  // Timer state
  timeRemaining: number; // in seconds
  isTimerRunning: boolean;
  
  // Actions
  nextPhrase: () => void;
  skipPhrase: () => void;
  setCategory: (category: PhraseCategory) => void;
  setTimerDuration: (seconds: number) => void;
  setSkipLimit: (limit: number) => void;
  setBuzzerSound: (sound: BuzzerSoundType) => void;
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  endGame: () => void;
  resetRound: () => void;
  setTimeRemaining: (seconds: number) => void;
  setTimerRunning: (running: boolean) => void;
  onTimerComplete: () => void;
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
        buzzerSound: 'classic',
        skipsUsed: 0,
        skipsRemaining: initialSkipLimit,
        correctCount: 0,
        timeRemaining: 60,
        isTimerRunning: false,
        
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
        
        setTimerDuration: (seconds) => set({ 
          timerDuration: seconds,
          timeRemaining: seconds
        }),
        
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
          correctCount: 0,
          timeRemaining: state.timerDuration,
          isTimerRunning: true
        })),
        
        pauseGame: () => set({ 
          status: GameStatus.PAUSED,
          isTimerRunning: false
        }),
        
        resumeGame: () => set({ 
          status: GameStatus.PLAYING,
          isTimerRunning: true
        }),
        
        endGame: () => set({ 
          status: GameStatus.ENDED,
          currentPhrase: '',
          skipsUsed: 0,
          skipsRemaining: get().skipLimit === 0 ? Infinity : get().skipLimit,
          correctCount: 0,
          timeRemaining: get().timerDuration,
          isTimerRunning: false
        }),
        
        resetRound: () => set((state) => ({
          skipsUsed: 0,
          skipsRemaining: state.skipLimit === 0 ? Infinity : state.skipLimit,
          correctCount: 0,
          timeRemaining: state.timerDuration,
          isTimerRunning: false
        })),
        
        setTimeRemaining: (seconds) => set({ timeRemaining: seconds }),
        
        setTimerRunning: (running) => set({ isTimerRunning: running }),
        
        onTimerComplete: () => set({ 
          status: GameStatus.ENDED,
          isTimerRunning: false
        })
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

// Export buzzer sounds for use in components
export { BUZZER_SOUNDS }; 