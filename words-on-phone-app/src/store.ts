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
  trackSkipLimitReached,
  trackTimerPreferencesChanged
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
  showTimer: boolean; // whether to display timer visually (default: false)
  useRandomTimer: boolean; // whether to use random timer duration (default: true)
  timerRangeMin: number; // minimum timer duration for randomization (default: 45)
  timerRangeMax: number; // maximum timer duration for randomization (default: 75)
  actualTimerDuration: number; // actual timer duration used (randomized or fixed)
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
  setShowTimer: (show: boolean) => void;
  setUseRandomTimer: (useRandom: boolean) => void;
  setTimerRangeMin: (min: number) => void;
  setTimerRangeMax: (max: number) => void;
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
  // Helper function to generate random timer duration
  generateRandomTimerDuration: () => number;
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
        showTimer: false,
        useRandomTimer: true,
        timerRangeMin: 45,
        timerRangeMax: 75,
        actualTimerDuration: 60,
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
        
        setShowTimer: (show) => {
          set({ showTimer: show });
          // Track preference change
          const state = get();
          trackTimerPreferencesChanged({
            show_timer: show,
            use_random_timer: state.useRandomTimer,
            timer_range_min: state.timerRangeMin,
            timer_range_max: state.timerRangeMax,
            fixed_timer_duration: state.timerDuration
          });
        },
        
        setUseRandomTimer: (useRandom) => {
          set({ useRandomTimer: useRandom });
          // Track preference change
          const state = get();
          trackTimerPreferencesChanged({
            show_timer: state.showTimer,
            use_random_timer: useRandom,
            timer_range_min: state.timerRangeMin,
            timer_range_max: state.timerRangeMax,
            fixed_timer_duration: state.timerDuration
          });
        },
        
        setTimerRangeMin: (min) => set((state) => {
          // Ensure min doesn't exceed max
          const validMin = Math.min(min, state.timerRangeMax);
          return { timerRangeMin: validMin };
        }),
        
        setTimerRangeMax: (max) => set((state) => {
          // Ensure max doesn't go below min
          const validMax = Math.max(max, state.timerRangeMin);
          return { timerRangeMax: validMax };
        }),
        
        setSkipLimit: (limit) => set({ 
          skipLimit: limit,
          skipsRemaining: limit === 0 ? Infinity : limit 
        }),
        
        setBuzzerSound: (sound) => set({ buzzerSound: sound }),
        
        startGame: () => set((state) => {
          // Determine actual timer duration based on settings
          const actualDuration = state.useRandomTimer 
            ? state.generateRandomTimerDuration()
            : state.timerDuration;
          
          // Track round start with enhanced timer data
          trackRoundStart({
            category: state.selectedCategory,
            timer_duration: actualDuration,
            show_timer: state.showTimer,
            use_random_timer: state.useRandomTimer,
            timer_range_min: state.useRandomTimer ? state.timerRangeMin : undefined,
            timer_range_max: state.useRandomTimer ? state.timerRangeMax : undefined,
            skip_limit: state.skipLimit,
            buzzer_sound: state.buzzerSound
          });
          
          return {
            status: GameStatus.PLAYING,
            currentPhrase: state.cursor.next(),
            skipsUsed: 0,
            skipsRemaining: state.skipLimit === 0 ? Infinity : state.skipLimit,
            correctCount: 0,
            actualTimerDuration: actualDuration,
            timeRemaining: actualDuration,
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
            timeRemaining: get().actualTimerDuration,
            isTimerRunning: false,
            phraseStartTime: null
          };
        }),
        
        resetRound: () => set((state) => ({
          skipsUsed: 0,
          skipsRemaining: state.skipLimit === 0 ? Infinity : state.skipLimit,
          correctCount: 0,
          timeRemaining: state.actualTimerDuration,
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
        
        // Helper function to generate random timer duration
        generateRandomTimerDuration: () => {
          const state = get();
          const min = state.timerRangeMin;
          const max = state.timerRangeMax;
          // Ensure valid range
          if (min >= max) {
            return min;
          }
          return Math.floor(Math.random() * (max - min + 1)) + min;
        },
        
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
        showTimer: state.showTimer,
        useRandomTimer: state.useRandomTimer,
        timerRangeMin: state.timerRangeMin,
        timerRangeMax: state.timerRangeMax,
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
          showTimer: persisted.showTimer ?? currentState.showTimer,
          useRandomTimer: persisted.useRandomTimer ?? currentState.useRandomTimer,
          timerRangeMin: persisted.timerRangeMin ?? currentState.timerRangeMin,
          timerRangeMax: persisted.timerRangeMax ?? currentState.timerRangeMax,
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