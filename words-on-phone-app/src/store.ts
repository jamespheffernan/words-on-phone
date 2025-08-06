import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { PhraseCategory } from './data/phrases';
import { phraseService } from './services/phraseService';
import { PhraseCursor } from './phraseEngine';
import { BUZZER_SOUNDS, type BuzzerSoundType } from './hooks/useAudio';
import { indexedDBStorage } from './storage/indexedDBStorage';
import { categoryPopularityService } from './services/categoryPopularityService';
import { DEFAULT_CATEGORY_GROUPS } from './types/category';
import { getRandomTeamNames } from './data/teamNames';
import { 
  trackRoundStart, 
  trackPhraseSuccess, 
  trackPhraseTimeout, 
  trackSkipLimitReached,
  trackTimerPreferencesChanged
} from './firebase/analytics';
import { analytics } from './services/analytics';

export enum GameStatus {
  MENU = 'menu',
  TEAM_SETUP = 'team_setup',
  PLAYING = 'playing',
  PAUSED = 'paused',
  BUZZER_PLAYING = 'buzzer_playing',
  ROUND_END = 'round_end',
  ENDED = 'ended'
}

export enum GameMode {
  SOLO = 'solo',
  TEAM = 'team'
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

// Team and round stats types
export interface Team {
  name: string;
  score: number;
  color?: string; // Optional for future UI
}

export interface RoundStats {
  roundNumber: number;
  totalCorrect: number;
  fastestAnswer?: {
    phrase: string;
    timeMs: number;
  };
  answers: Array<{
    phrase: string;
    timeMs: number;
  }>;
  winningTeamIndex?: number;
}

export interface LeaderboardEntry {
  id: string;
  playerName: string;
  score: number;
  rounds: number;
  averagePerRound: number;
  fastestAnswer?: {
    phrase: string;
    timeMs: number;
  };
  slowestAnswer?: {
    phrase: string;
    timeMs: number;
  };
  categories: string[];
  date: number; // timestamp
}

export interface SoloRoundResult {
  playerName: string;
  score: number;
  answers: Array<{ phrase: string; timeMs: number }>;
  fastestAnswer?: { phrase: string; timeMs: number };
  slowestAnswer?: { phrase: string; timeMs: number };
  roundNumber: number;
}

export interface AllTimeEntry {
  id: string;
  playerName: string;
  score: number;
  fastestAnswer?: { phrase: string; timeMs: number };
  slowestAnswer?: { phrase: string; timeMs: number };
  categories: string[];
  date: number;
}

interface GameState {
  // Game status
  status: GameStatus;
  gameMode: GameMode;
  
  // Phrase management
  cursor: PhraseCursor<string>;
  currentPhrase: string;
  selectedCategory: PhraseCategory | string;
  selectedCategories: string[]; // multi-select
  pinnedCategories: string[]; // favorites
  
  // Game settings
  timerDuration: number; // in seconds (60-300)
  showTimer: boolean; // whether to display timer visually (default: false)
  useRandomTimer: boolean; // whether to use random timer duration (default: true)
  timerRangeMin: number; // minimum timer duration for randomization (default: 90)
  timerRangeMax: number; // maximum timer duration for randomization (default: 180)
  actualTimerDuration: number; // actual timer duration used (randomized or fixed)
  skipLimit: number; // 0 = unlimited, 1-5 = fixed cap
  buzzerSound: BuzzerSoundType; // buzzer sound type
  gameLength: number; // points needed to win (default: 7)
  
  // Beep ramp settings (Phase 8C)
  enableBeepRamp: boolean; // enable accelerating beep system
  beepRampStart: number; // when to start beeping (in seconds before end)
  beepFirstInterval: number; // initial beep interval in ms
  beepFinalInterval: number; // final rapid beep interval in ms
  beepVolume: number; // beep volume (0-1)
  buzzerVolume: number; // buzzer volume (0-1)
  
  // Round state
  skipsUsed: number;
  skipsRemaining: number;
  
  // Timer state
  timeRemaining: number; // in seconds
  isTimerRunning: boolean;
  
  // Phrase timing and stats
  phraseStartTime: number | null; // timestamp when phrase was shown
  phraseStats: Record<string, PhraseStats>; // phrase statistics
  
  // Team-based gameplay
  teams: Team[];
  currentTeamIndex: number; // index of team currently holding device
  roundNumber: number;
  roundStats: RoundStats[];
  currentRoundAnswers: Array<{ phrase: string; timeMs: number }>;
  
  // Solo gameplay (multiplayer turn-based)
  currentSoloPlayer: string; // name of current player
  soloGameResults: SoloRoundResult[]; // results for current game
  currentSoloRound: number; // which round of the solo game
  
  // Leaderboards  
  allTimeLeaderboard: AllTimeEntry[]; // persistent all-time best rounds
  showingLeaderboard: boolean;
  showingAllTimeLeaderboard: boolean;
  
  // Category grouping (Task 3)
  expandedGroups: Set<string>; // Set of group IDs that are currently expanded
  
  // Actions
  nextPhrase: () => void;
  skipPhrase: () => void;
  setCategory: (category: PhraseCategory | string) => void;
  setSelectedCategories: (categories: string[]) => void;
  setTimerDuration: (seconds: number) => void;
  setShowTimer: (show: boolean) => void;
  setUseRandomTimer: (useRandom: boolean) => void;
  setTimerRangeMin: (min: number) => void;
  setTimerRangeMax: (max: number) => void;
  setSkipLimit: (limit: number) => void;
  setBuzzerSound: (sound: BuzzerSoundType) => void;
  setGameLength: (length: number) => void;
  
  // Beep ramp actions
  setEnableBeepRamp: (enabled: boolean) => void;
  setBeepRampStart: (seconds: number) => void;
  setBeepFirstInterval: (ms: number) => void;
  setBeepFinalInterval: (ms: number) => void;
  setBeepVolume: (volume: number) => void;
  setBuzzerVolume: (volume: number) => void;
  
  startTeamSetup: () => void;
  startSoloGame: () => void;
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  endGame: () => void;
  endRound: () => void;
  continueFromRoundEnd: () => void;
  resetRound: () => void;
  setTimeRemaining: (seconds: number) => void;
  setTimerRunning: (running: boolean) => void;
  onTimerComplete: () => void;
  onBuzzerComplete: () => void;
  // Helper function to generate random timer duration
  generateRandomTimerDuration: () => number;
  // Stats actions
  recordPhraseStart: () => void;
  recordPhraseSuccess: () => void;
  recordPhraseSkip: () => void;
  recordPhraseTimeout: () => void;
  getPhraseStats: (phraseId: string) => PhraseStats | undefined;
  // Team actions
  setTeams: (teams: Team[]) => void;
  setTeamName: (index: number, name: string) => void;
  incrementTeamScore: (index: number, delta?: number) => void;
  rotateTeam: () => void;
  resetTeams: () => void;
  setCurrentTeamIndex: (index: number) => void;
  // Solo actions
  setCurrentSoloPlayer: (name: string) => void;
  completeSoloRound: (playerName: string) => void;
  addToAllTimeLeaderboard: (entry: AllTimeEntry) => void;
  clearAllTimeLeaderboard: () => void;
  setShowingLeaderboard: (showing: boolean) => void;
  setShowingAllTimeLeaderboard: (showing: boolean) => void;
  startNewSoloGame: () => void;
  // Round stats actions
  recordAnswer: (phrase: string, timeMs: number) => void;
  completeRound: (winningTeamIndex: number) => void;
  resetCurrentRoundAnswers: () => void;
  togglePinnedCategory: (category: string) => void;
  
  // Category grouping actions (Task 3)
  toggleGroupExpanded: (groupId: string) => void;
  setGroupExpanded: (groupId: string, expanded: boolean) => void;
  expandAllGroups: () => void;
  collapseAllGroups: () => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => {
      const cursor = new PhraseCursor(phraseService.getAllPhrases());
      const initialSkipLimit = 3;
      
      // Helper function to convert category names to IDs (matches phraseService.slugify)
      const slugifyCategory = (name: string): string => {
        return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      };
      
      // Helper function to track category popularity
      const trackCategoryPopularity = async (categories: string[]) => {
        try {
          // Record each selected category as played
          for (const categoryName of categories) {
            const categoryId = slugifyCategory(categoryName);
            await categoryPopularityService.recordCategoryPlayed(categoryId);
          }
        } catch (error) {
          // Don't fail the game start if popularity tracking fails
          console.warn('Failed to track category popularity:', error);
        }
      };
      
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
      
      // Helper: default teams with fun random names
      const randomNames = getRandomTeamNames();
      const defaultTeams: Team[] = [
        { name: randomNames[0], score: 0 },
        { name: randomNames[1], score: 0 }
      ];
      
      return {
        // Initial state
        status: GameStatus.MENU,
        gameMode: GameMode.TEAM, // Default to team mode
        cursor,
        currentPhrase: '',
        selectedCategory: PhraseCategory.EVERYTHING,
        selectedCategories: [PhraseCategory.EVERYTHING],
        pinnedCategories: [],
        timerDuration: 120, // Default to 2 minutes for fixed timer
        showTimer: false,
        useRandomTimer: true,
        timerRangeMin: 90, // Default random range 90-180 seconds (1.5-3 minutes)
        timerRangeMax: 180,
        actualTimerDuration: 120,
        skipLimit: initialSkipLimit,
        buzzerSound: 'game-show',
        gameLength: 7, // Default first to 7 points
        enableBeepRamp: true,
        beepRampStart: 30,
        beepFirstInterval: 3000, // Start even slower
        beepFinalInterval: 50,   // End MUCH faster - absolutely flying
        beepVolume: 0.6,
        buzzerVolume: 0.8,
        skipsUsed: 0,
        skipsRemaining: initialSkipLimit,
        timeRemaining: 60,
        isTimerRunning: false,
        phraseStartTime: null,
        phraseStats: {},
        // Team-based gameplay
        teams: defaultTeams,
        currentTeamIndex: 0,
        roundNumber: 1,
        roundStats: [],
        currentRoundAnswers: [],
        
        // Solo gameplay (multiplayer turn-based)
        currentSoloPlayer: '',
        soloGameResults: [],
        currentSoloRound: 1,
        
        // Leaderboards
        allTimeLeaderboard: [],
        showingLeaderboard: false,
        showingAllTimeLeaderboard: false,
        
        // Category grouping (Task 3) - Default to first group expanded
        expandedGroups: new Set(['entertainment-media']),
        
        // Actions
        nextPhrase: () => set((state) => {
          if (state.currentPhrase && state.phraseStartTime) {
            const duration = Date.now() - state.phraseStartTime;
            updatePhraseStats(state.currentPhrase, true, duration);
            // Record answer for round stats
            state.recordAnswer(state.currentPhrase, duration);
            // Track Firebase analytics
            trackPhraseSuccess({
              phrase_id: state.currentPhrase,
              category: state.selectedCategory,
              time_taken_ms: duration,
              attempts_before_success: state.skipsUsed
            });
            
            // Track PostHog answer_correct event
            const phraseId = `phrase_${state.currentPhrase.replace(/\s+/g, '_').toLowerCase().substring(0, 20)}`;
            analytics.track('answer_correct', {
              phraseId,
              timeRemaining: Math.max(0, state.timeRemaining),
              teamName: state.gameMode === GameMode.SOLO ? state.currentSoloPlayer || 'Solo Player' : state.teams[state.currentTeamIndex]?.name,
              scoreAfter: state.gameMode === GameMode.SOLO ? (state.currentRoundAnswers.length + 1) : (state.currentRoundAnswers.length + 1),
              responseTimeMs: duration,
              gameMode: state.gameMode
            });
          }
          const nextPhrase = state.cursor.next();
          
          // Rotate to next team if teams are set up (hot-potato mechanics)
          const newTeamIndex = state.teams.length > 0 
            ? (state.currentTeamIndex + 1) % state.teams.length
            : state.currentTeamIndex;
          
          return {
            currentPhrase: nextPhrase,
            skipsRemaining: state.skipLimit === 0 ? Infinity : state.skipLimit,
            phraseStartTime: Date.now(),
            currentTeamIndex: newTeamIndex,
            // Increment solo score if in solo mode and we had a current phrase (success)
            // Solo score is now tracked per round in currentRoundAnswers
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
            
            // Track PostHog answer_pass event
            if (state.currentPhrase) {
              const phraseId = `phrase_${state.currentPhrase.replace(/\s+/g, '_').toLowerCase().substring(0, 20)}`;
              analytics.track('answer_pass', {
                phraseId,
                reason: nextSkipsRemaining === 0 ? 'skip_limit' : 'user_pass',
                timeRemaining: Math.max(0, state.timeRemaining),
                skipsRemaining: nextSkipsRemaining === Infinity ? 999 : nextSkipsRemaining
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
        
        setCategory: (category) => set({ 
          selectedCategory: category,
          selectedCategories: [category]
        }),
        
        setSelectedCategories: (categories) => set(()=> ({
          selectedCategories: categories,
          // keep legacy field for backward compatibility
          selectedCategory: categories.length === 1 ? categories[0] : PhraseCategory.EVERYTHING
        })),
        
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
        
        setGameLength: (length) => set({ gameLength: length }),
        
        setEnableBeepRamp: (enabled) => set({ enableBeepRamp: enabled }),
        
        setBeepRampStart: (seconds) => set({ 
          beepRampStart: Math.max(10, Math.min(40, seconds))
        }),
        
        setBeepFirstInterval: (ms) => set((state) => { 
          // Ensure first interval is >= final interval for valid range
          const validMs = Math.max(state.beepFinalInterval, Math.min(1500, ms));
          return { beepFirstInterval: validMs };
        }),
        
        setBeepFinalInterval: (ms) => set((state) => {
          // Ensure final interval is <= first interval for valid range  
          const validMs = Math.min(state.beepFirstInterval, Math.max(80, ms));
          return { beepFinalInterval: validMs };
        }),
        
        setBeepVolume: (volume) => set({ 
          beepVolume: Math.max(0, Math.min(1, volume))
        }),
        
        setBuzzerVolume: (volume) => set({ 
          buzzerVolume: Math.max(0, Math.min(1, volume))
        }),
        
        startTeamSetup: () => set({ status: GameStatus.TEAM_SETUP }),

        startSoloGame: () => set((state) => {
          // Solo mode always uses fixed timer (no randomization) for fairness
          const actualDuration = state.timerDuration;
          
          // Build phrase list based on selectedCategories
          const cats = state.selectedCategories && state.selectedCategories.length > 0
            ? state.selectedCategories
            : [state.selectedCategory];
          
          const phraseSet = new Set<string>();
          cats.forEach((cat) => {
            phraseService.getPhrasesByCategory(cat as any).forEach((p) => phraseSet.add(p));
          });

          const newCursor = new PhraseCursor(Array.from(phraseSet));
          const gameId = `solo_game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          // Track solo game start
          analytics.track('game_started', {
            categoryName: cats.join(', '),
            timerMode: state.showTimer ? 'visible' : 'hidden',
            isTeamMode: false,
            gameMode: 'solo',
            skipLimit: state.skipLimit,
            gameId,
            phraseCount: phraseSet.size
          });

          return {
            status: GameStatus.PLAYING,
            gameMode: GameMode.SOLO,
            cursor: newCursor,
            currentPhrase: newCursor.next(),
            skipsUsed: 0,
            skipsRemaining: state.skipLimit === 0 ? Infinity : state.skipLimit,
            timeRemaining: actualDuration,
            actualTimerDuration: actualDuration,
            isTimerRunning: true,
            phraseStartTime: Date.now(),
            currentRoundAnswers: [], // Reset for new round
            roundNumber: 1,
            teams: [], // Empty teams for solo mode
            currentTeamIndex: 0
          };
        }),

        startGame: () => set((state) => {
          const gameStartTime = performance.now();
          
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
          
          // Build phrase list based on selectedCategories (fallback legacy)
          const cats = state.selectedCategories && state.selectedCategories.length > 0
            ? state.selectedCategories
            : [state.selectedCategory];
          
          // Track category popularity (async, non-blocking)
          trackCategoryPopularity(cats);
          
          const phraseSet = new Set<string>();
          cats.forEach((cat)=> {
            phraseService.getPhrasesByCategory(cat as any).forEach((p)=> phraseSet.add(p));
          });

          const newCursor = new PhraseCursor(Array.from(phraseSet));
          const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          // Track PostHog game_started event
          analytics.track('game_started', {
            categoryName: cats.join(', '),
            timerMode: state.showTimer ? 'visible' : 'hidden',
            isTeamMode: state.teams.length > 0,
            teamCount: state.teams.length > 0 ? state.teams.length : undefined,
            skipLimit: state.skipLimit,
            gameId,
            phraseCount: phraseSet.size
          });

          // Track game start performance
          const gameInitTime = performance.now() - gameStartTime;
          analytics.trackPerformance('game_start_time', gameInitTime, 'ms', 'game_initialization');

          return {
            status: GameStatus.PLAYING,
            currentPhrase: newCursor.next(),
            skipsUsed: 0,
            skipsRemaining: state.skipLimit === 0 ? Infinity : state.skipLimit,
            timeRemaining: actualDuration,
            actualTimerDuration: actualDuration,
            isTimerRunning: true,
            phraseStartTime: Date.now(),
            cursor: newCursor
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
            timeRemaining: get().actualTimerDuration,
            isTimerRunning: false,
            phraseStartTime: null
          };
        }),

        endRound: () => set({
          status: GameStatus.ROUND_END,
          isTimerRunning: false
        }),

        continueFromRoundEnd: () => set((state) => {
          // Solo mode is now handled by completeSoloRound action
          if (state.gameMode === GameMode.SOLO) {
            // This shouldn't be called for solo mode anymore
            console.warn('continueFromRoundEnd called for solo mode - use completeSoloRound instead');
            return state;
          }

          // Handle team mode - check if any team has won (configurable game length)
          const winningTeam = state.teams.find(team => team.score >= state.gameLength);
          if (winningTeam) {
            return { status: GameStatus.ENDED };
          }
          
          // Continue to next round
          return {
            status: GameStatus.PLAYING,
            timeRemaining: state.actualTimerDuration,
            isTimerRunning: true,
            phraseStartTime: Date.now(),
            currentPhrase: state.cursor.next(),
            skipsUsed: 0,
            skipsRemaining: state.skipLimit === 0 ? Infinity : state.skipLimit
          };
        }),
        
        resetRound: () => set((state) => ({
          skipsUsed: 0,
          skipsRemaining: state.skipLimit === 0 ? Infinity : state.skipLimit,
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
              total_phrases_attempted: state.skipsUsed + 1
            });
          }
          
          // Immediately go to BUZZER_PLAYING state to disable UI
          return {
            status: GameStatus.BUZZER_PLAYING,
            isTimerRunning: false,
            phraseStartTime: null
          };
        }),

        // New method to handle buzzer completion and final state transition
        onBuzzerComplete: () => set((state) => {
          // Track game completion for solo games
          if (state.teams.length === 0) {
            const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            analytics.track('game_completed', {
              totalCorrect: state.currentRoundAnswers.length,
              totalPass: state.skipsUsed,
              durationMs: (state.actualTimerDuration - state.timeRemaining) * 1000,
              winningTeam: undefined,
              gameId,
              endReason: 'timer'
            });
          }
          
          // Track round-level metrics (applies to both solo and team modes)
          const roundDurationMs = (state.actualTimerDuration - state.timeRemaining) * 1000;
          analytics.track('round_completed', {
            roundNumber: state.roundNumber,
            totalCorrect: state.currentRoundAnswers.length,
            totalSkip: state.skipsUsed,
            durationMs: roundDurationMs,
            durationSec: Math.round(roundDurationMs / 1000),
            isTeamMode: state.teams.length > 0
          });
          
          // If teams are set up, go to round end; otherwise go directly to game end
          if (state.teams.length > 0) {
            return {
              status: GameStatus.ROUND_END
            };
          } else {
            return {
              status: GameStatus.ENDED
            };
          }
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
        },
        
        // Team actions
        setTeams: (teams) => set({ teams }),
        setTeamName: (index, name) => set((state) => {
          const teams = [...state.teams];
          if (teams[index]) teams[index].name = name;
          return { teams };
        }),
        incrementTeamScore: (index, delta = 1) => set((state) => {
          const teams = [...state.teams];
          if (teams[index]) teams[index].score += delta;
          return { teams };
        }),
        rotateTeam: () => set((state) => ({
          currentTeamIndex: (state.currentTeamIndex + 1) % state.teams.length
        })),
        resetTeams: () => {
          // Generate fresh random team names each time
          const freshRandomNames = getRandomTeamNames();
          const freshDefaultTeams: Team[] = [
            { name: freshRandomNames[0], score: 0 },
            { name: freshRandomNames[1], score: 0 }
          ];
          set({
            teams: freshDefaultTeams,
            currentTeamIndex: 0
          });
        },
        setCurrentTeamIndex: (index) => set({ currentTeamIndex: index }),
        
        // Solo actions
        setCurrentSoloPlayer: (name) => set({ currentSoloPlayer: name }),
        completeSoloRound: (playerName) => set((state) => {
          // Calculate stats for the current round
          const answers = state.currentRoundAnswers;
          const score = answers.length;
          const fastestAnswer = answers.length > 0 
            ? answers.reduce((fastest, answer) => answer.timeMs < fastest.timeMs ? answer : fastest)
            : undefined;
          const slowestAnswer = answers.length > 0 
            ? answers.reduce((slowest, answer) => answer.timeMs > slowest.timeMs ? answer : slowest)
            : undefined;

          const roundResult: SoloRoundResult = {
            playerName,
            score,
            answers,
            fastestAnswer,
            slowestAnswer,
            roundNumber: state.currentSoloRound
          };

          // Add to all-time leaderboard if it's a good score
          const allTimeEntry: AllTimeEntry = {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            playerName,
            score,
            fastestAnswer,
            slowestAnswer,
            categories: state.selectedCategories,
            date: Date.now()
          };

          // Update all-time leaderboard and sort
          const updatedAllTime = [...state.allTimeLeaderboard, allTimeEntry]
            .sort((a, b) => {
              if (a.score !== b.score) return b.score - a.score;
              return b.date - a.date;
            })
            .slice(0, 100); // Keep top 100

          return {
            soloGameResults: [...state.soloGameResults, roundResult],
            allTimeLeaderboard: updatedAllTime,
            currentSoloRound: state.currentSoloRound + 1,
            currentRoundAnswers: [], // Reset for next round
            status: GameStatus.ROUND_END
          };
        }),
        addToAllTimeLeaderboard: (entry) => set((state) => {
          const updated = [...state.allTimeLeaderboard, entry]
            .sort((a, b) => {
              if (a.score !== b.score) return b.score - a.score;
              return b.date - a.date;
            })
            .slice(0, 100);
          return { allTimeLeaderboard: updated };
        }),
        clearAllTimeLeaderboard: () => set({ allTimeLeaderboard: [] }),
        setShowingLeaderboard: (showing) => set({ showingLeaderboard: showing }),
        setShowingAllTimeLeaderboard: (showing) => set({ showingAllTimeLeaderboard: showing }),
        startNewSoloGame: () => set({
          soloGameResults: [],
          currentSoloRound: 1,
          currentSoloPlayer: ''
        }),
        
        // Round stats actions
        recordAnswer: (phrase, timeMs) => set((state) => ({
          currentRoundAnswers: [...state.currentRoundAnswers, { phrase, timeMs }]
        })),
        completeRound: (winningTeamIndex) => set((state) => {
          const fastest = state.currentRoundAnswers.reduce<undefined | { phrase: string; timeMs: number }>((acc, curr) => {
            if (!acc || curr.timeMs < acc.timeMs) return curr;
            return acc;
          }, undefined);
          const roundStats: RoundStats = {
            roundNumber: state.roundNumber,
            totalCorrect: state.currentRoundAnswers.length,
            fastestAnswer: fastest,
            answers: state.currentRoundAnswers,
            winningTeamIndex
          };
          // Increment score for winning team
          const teams = [...state.teams];
          if (teams[winningTeamIndex]) teams[winningTeamIndex].score += 1;
          
          // Check if this team victory ends the game (configurable game length)
          const winningTeam = teams[winningTeamIndex];
          if (winningTeam && winningTeam.score >= state.gameLength) {
            const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const totalCorrect = state.roundStats.reduce((sum, round) => sum + round.totalCorrect, 0) + state.currentRoundAnswers.length;
            const totalPass = state.roundStats.length * 10; // Rough estimate
            
            analytics.track('game_completed', {
              totalCorrect,
              totalPass,
              durationMs: (state.roundNumber * state.actualTimerDuration) * 1000, // Rough estimate
              winningTeam: winningTeam.name,
              gameId,
              endReason: 'victory'
            });
          }
          
          return {
            roundStats: [...state.roundStats, roundStats],
            roundNumber: state.roundNumber + 1,
            currentRoundAnswers: [],
            teams
          };
        }),
        resetCurrentRoundAnswers: () => set({ currentRoundAnswers: [] }),
        togglePinnedCategory: (category) => set((state)=> {
          const pinned = state.pinnedCategories.includes(category)
            ? state.pinnedCategories.filter((c)=> c!==category)
            : [...state.pinnedCategories, category];
          return { pinnedCategories: pinned };
        }),
        
        // Category grouping actions (Task 3)
        toggleGroupExpanded: (groupId) => set((state) => {
          const newExpanded = new Set(state.expandedGroups);
          if (newExpanded.has(groupId)) {
            newExpanded.delete(groupId);
          } else {
            newExpanded.add(groupId);
          }
          return { expandedGroups: newExpanded };
        }),
        
        setGroupExpanded: (groupId, expanded) => set((state) => {
          const newExpanded = new Set(state.expandedGroups);
          if (expanded) {
            newExpanded.add(groupId);
          } else {
            newExpanded.delete(groupId);
          }
          return { expandedGroups: newExpanded };
        }),
        
        expandAllGroups: () => set(() => ({
          expandedGroups: new Set(DEFAULT_CATEGORY_GROUPS.map(group => group.id))
        })),
        
        collapseAllGroups: () => set(() => ({
          expandedGroups: new Set()
        })),
      };
    },
    {
      name: 'words-on-phone-storage',
      storage: createJSONStorage(() => indexedDBStorage),
      partialize: (state) => ({
        selectedCategory: state.selectedCategory,
        selectedCategories: state.selectedCategories,
        pinnedCategories: state.pinnedCategories,
        timerDuration: state.timerDuration,
        showTimer: state.showTimer,
        useRandomTimer: state.useRandomTimer,
        timerRangeMin: state.timerRangeMin,
        timerRangeMax: state.timerRangeMax,
        skipLimit: state.skipLimit,
        buzzerSound: state.buzzerSound,
        gameLength: state.gameLength,
        enableBeepRamp: state.enableBeepRamp,
        beepRampStart: state.beepRampStart,
        beepFirstInterval: state.beepFirstInterval,
        beepFinalInterval: state.beepFinalInterval,
        beepVolume: state.beepVolume,
        buzzerVolume: state.buzzerVolume,
        phraseStats: state.phraseStats,
        teams: state.teams,
        currentTeamIndex: state.currentTeamIndex,
        roundNumber: state.roundNumber,
        roundStats: state.roundStats,
        currentRoundAnswers: state.currentRoundAnswers,
        expandedGroups: Array.from(state.expandedGroups) // Convert Set to Array for JSON serialization
      }),
      // Ensure proper merging of async storage to avoid race conditions
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<GameState> || {};
        return {
          ...currentState,
          selectedCategory: persisted.selectedCategory ?? currentState.selectedCategory,
          selectedCategories: persisted.selectedCategories ?? currentState.selectedCategories,
          pinnedCategories: persisted.pinnedCategories ?? currentState.pinnedCategories,
          timerDuration: persisted.timerDuration ?? currentState.timerDuration,
          showTimer: persisted.showTimer ?? currentState.showTimer,
          useRandomTimer: persisted.useRandomTimer ?? currentState.useRandomTimer,
          timerRangeMin: persisted.timerRangeMin ?? currentState.timerRangeMin,
          timerRangeMax: persisted.timerRangeMax ?? currentState.timerRangeMax,
          skipLimit: persisted.skipLimit ?? currentState.skipLimit,
          buzzerSound: persisted.buzzerSound ?? currentState.buzzerSound,
          gameLength: persisted.gameLength ?? currentState.gameLength,
          enableBeepRamp: persisted.enableBeepRamp ?? currentState.enableBeepRamp,
          beepRampStart: persisted.beepRampStart ?? currentState.beepRampStart,
          beepFirstInterval: persisted.beepFirstInterval ?? currentState.beepFirstInterval,
          beepFinalInterval: persisted.beepFinalInterval ?? currentState.beepFinalInterval,
          beepVolume: persisted.beepVolume ?? currentState.beepVolume,
          buzzerVolume: persisted.buzzerVolume ?? currentState.buzzerVolume,
          phraseStats: persisted.phraseStats && Object.keys(persisted.phraseStats).length > 0
            ? persisted.phraseStats
            : currentState.phraseStats,
          teams: persisted.teams && Object.keys(persisted.teams).length > 0
            ? persisted.teams
            : currentState.teams,
          currentTeamIndex: persisted.currentTeamIndex ?? currentState.currentTeamIndex,
          roundNumber: persisted.roundNumber ?? currentState.roundNumber,
          roundStats: persisted.roundStats && Object.keys(persisted.roundStats).length > 0
            ? persisted.roundStats
            : currentState.roundStats,
          currentRoundAnswers: persisted.currentRoundAnswers && Object.keys(persisted.currentRoundAnswers).length > 0
            ? persisted.currentRoundAnswers
            : currentState.currentRoundAnswers,
          expandedGroups: persisted.expandedGroups && Array.isArray(persisted.expandedGroups)
            ? new Set(persisted.expandedGroups)
            : currentState.expandedGroups
        };
      }
    }
  )
);

// Export buzzer sounds and phrase stats type for use in components
export { BUZZER_SOUNDS }; 