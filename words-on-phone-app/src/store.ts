import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { PhraseCategory } from './data/phrases';
import { phraseService } from './services/phraseService';
import { PhraseCursor } from './phraseEngine';
import { BUZZER_SOUNDS, type BuzzerSoundType } from './hooks/useAudio';
import { indexedDBStorage } from './storage/indexedDBStorage';
import { 
  trackRoundStart, 
  trackPhraseSuccess, 
  trackPhraseTimeout, 
  trackSkipLimitReached 
} from './firebase/analytics';

export enum GameStatus {
  MENU = 'menu',
  PLAYING = 'playing',
  PAUSED = 'paused',
  ENDED = 'ended'
}

// Phrase statistics interface
export interface PhraseStats {
  phraseId: string;
  seen: number;
  success: number;
  fail: number;
  avgMs: number;
  totalMs: number;
  lastSeen: number; // timestamp
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
  
  // Phrase timing and stats
  phraseStartTime: number | null; // timestamp when phrase was shown
  phraseStats: Record<string, PhraseStats>; // phrase statistics
  
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
  // Stats actions
  recordPhraseStart: () => void;
  recordPhraseSuccess: () => void;
  recordPhraseSkip: () => void;
  recordPhraseTimeout: () => void;
  getPhraseStats: (phraseId: string) => PhraseStats | undefined;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => {
      const cursor = new PhraseCursor(phraseService.getAllPhrases());
      const initialSkipLimit = 3;
      
      // Helper function to update phrase stats
      const updatePhraseStats = (phraseId: string, success: boolean, duration?: number) => {
        const state = get();
        const existing = state.phraseStats[phraseId] || {
          phraseId,
          seen: 0,
          success: 0,
          fail: 0,
          avgMs: 0,
          totalMs: 0,
          lastSeen: 0
        };
        
        const seen = existing.seen + 1;
        const successCount = success ? existing.success + 1 : existing.success;
        const failCount = success ? existing.fail : existing.fail + 1;
        const totalMs = duration ? existing.totalMs + duration : existing.totalMs;
        const avgMs = duration ? totalMs / (successCount + failCount) : existing.avgMs;
        
        set((state) => ({
          phraseStats: {
            ...state.phraseStats,
            [phraseId]: {
              phraseId,
              seen,
              success: successCount,
              fail: failCount,
              avgMs: Math.round(avgMs),
              totalMs,
              lastSeen: Date.now()
            }
          }
        }));
      };
      
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
        phraseStartTime: null,
        phraseStats: {},
        
        // Actions
        nextPhrase: () => set((state) => {
          // Record success for current phrase
          if (state.currentPhrase && state.phraseStartTime) {
            const duration = Date.now() - state.phraseStartTime;
            updatePhraseStats(state.currentPhrase, true, duration);
            
            // Track Firebase analytics
            trackPhraseSuccess({
              phrase_id: state.currentPhrase,
              category: state.selectedCategory,
              time_taken_ms: duration,
              attempts_before_success: state.skipsUsed
            });
          }
          
          const nextPhrase = state.cursor.next();
          return {
            currentPhrase: nextPhrase,
            correctCount: state.correctCount + 1,
            skipsUsed: 0, // Reset skips on correct answer
            skipsRemaining: state.skipLimit === 0 ? Infinity : state.skipLimit,
            phraseStartTime: Date.now() // Start timing new phrase
          };
        }),
        
        skipPhrase: () => set((state) => {
          if (state.skipLimit === 0 || state.skipsRemaining > 0) {
            // Record skip for current phrase
            if (state.currentPhrase && state.phraseStartTime) {
              const duration = Date.now() - state.phraseStartTime;
              updatePhraseStats(state.currentPhrase, false, duration);
            }
            
            const nextSkipsRemaining = state.skipLimit === 0 
              ? Infinity 
              : Math.max(0, state.skipsRemaining - 1);
            
            // Check if skip limit reached
            if (state.skipLimit > 0 && nextSkipsRemaining === 0) {
              trackSkipLimitReached({
                phrase_id: state.currentPhrase,
                category: state.selectedCategory,
                skips_used: state.skipsUsed + 1,
                skip_limit: state.skipLimit
              });
            }
            
            const nextPhrase = state.cursor.next();
            return {
              currentPhrase: nextPhrase,
              skipsUsed: state.skipsUsed + 1,
              skipsRemaining: nextSkipsRemaining,
              phraseStartTime: Date.now() // Start timing new phrase
            };
          }
          return state;
        }),
        
        setCategory: (category) => set(() => {
          const categoryPhrases = phraseService.getPhrasesByCategory(category);
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
        
        startGame: () => set((state) => {
          // Track round start
          trackRoundStart({
            category: state.selectedCategory,
            timer_duration: state.timerDuration,
            skip_limit: state.skipLimit,
            buzzer_sound: state.buzzerSound
          });
          
          return {
            status: GameStatus.PLAYING,
            currentPhrase: state.cursor.next(),
            skipsUsed: 0,
            skipsRemaining: state.skipLimit === 0 ? Infinity : state.skipLimit,
            correctCount: 0,
            timeRemaining: state.timerDuration,
            isTimerRunning: true,
            phraseStartTime: Date.now()
          };
        }),
        
        pauseGame: () => set({ 
          status: GameStatus.PAUSED,
          isTimerRunning: false
        }),
        
        resumeGame: () => set({ 
          status: GameStatus.PLAYING,
          isTimerRunning: true
        }),
        
        endGame: () => set((state) => {
          // Record timeout for current phrase if game ended due to timer
          if (state.currentPhrase && state.phraseStartTime && state.status === GameStatus.PLAYING) {
            const duration = Date.now() - state.phraseStartTime;
            updatePhraseStats(state.currentPhrase, false, duration);
          }
          
          return {
            status: GameStatus.ENDED,
            currentPhrase: '',
            skipsUsed: 0,
            skipsRemaining: get().skipLimit === 0 ? Infinity : get().skipLimit,
            correctCount: 0,
            timeRemaining: get().timerDuration,
            isTimerRunning: false,
            phraseStartTime: null
          };
        }),
        
        resetRound: () => set((state) => ({
          skipsUsed: 0,
          skipsRemaining: state.skipLimit === 0 ? Infinity : state.skipLimit,
          correctCount: 0,
          timeRemaining: state.timerDuration,
          isTimerRunning: false,
          phraseStartTime: null
        })),
        
        setTimeRemaining: (seconds) => set({ timeRemaining: seconds }),
        
        setTimerRunning: (running) => set({ isTimerRunning: running }),
        
        onTimerComplete: () => set((state) => {
          // Record timeout for current phrase
          if (state.currentPhrase && state.phraseStartTime) {
            const duration = Date.now() - state.phraseStartTime;
            updatePhraseStats(state.currentPhrase, false, duration);
            
            // Track Firebase analytics for timeout
            trackPhraseTimeout({
              phrase_id: state.currentPhrase,
              category: state.selectedCategory,
              time_on_phrase_ms: duration,
              total_phrases_attempted: state.correctCount + state.skipsUsed + 1
            });
          }
          
          return {
            status: GameStatus.ENDED,
            isTimerRunning: false,
            phraseStartTime: null
          };
        }),
        
        // Stats actions
        recordPhraseStart: () => set({ phraseStartTime: Date.now() }),
        
        recordPhraseSuccess: () => {
          const state = get();
          if (state.currentPhrase && state.phraseStartTime) {
            const duration = Date.now() - state.phraseStartTime;
            updatePhraseStats(state.currentPhrase, true, duration);
          }
        },
        
        recordPhraseSkip: () => {
          const state = get();
          if (state.currentPhrase && state.phraseStartTime) {
            const duration = Date.now() - state.phraseStartTime;
            updatePhraseStats(state.currentPhrase, false, duration);
          }
        },
        
        recordPhraseTimeout: () => {
          const state = get();
          if (state.currentPhrase && state.phraseStartTime) {
            const duration = Date.now() - state.phraseStartTime;
            updatePhraseStats(state.currentPhrase, false, duration);
          }
        },
        
        getPhraseStats: (phraseId: string) => {
          return get().phraseStats[phraseId];
        }
      };
    },
    {
      name: 'words-on-phone-storage',
      storage: createJSONStorage(() => indexedDBStorage),
      partialize: (state) => ({
        selectedCategory: state.selectedCategory,
        timerDuration: state.timerDuration,
        skipLimit: state.skipLimit,
        buzzerSound: state.buzzerSound,
        phraseStats: state.phraseStats
      }),
      // Ensure proper merging of async storage to avoid race conditions
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<GameState> || {};
        return {
          ...currentState,
          selectedCategory: persisted.selectedCategory ?? currentState.selectedCategory,
          timerDuration: persisted.timerDuration ?? currentState.timerDuration,
          skipLimit: persisted.skipLimit ?? currentState.skipLimit,
          buzzerSound: persisted.buzzerSound ?? currentState.buzzerSound,
          phraseStats: persisted.phraseStats && Object.keys(persisted.phraseStats).length > 0
            ? persisted.phraseStats
            : currentState.phraseStats
        };
      }
    }
  )
);

// Export buzzer sounds and phrase stats type for use in components
export { BUZZER_SOUNDS }; 