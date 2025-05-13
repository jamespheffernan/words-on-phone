import { create } from 'zustand';
import phrases from './phrasesData';
import { loadSettings, saveSettings, updateGameStats } from '../utils/storage';
import { logAnalyticsEvent } from '../services/firebase';

// Game view states
export const GameView = {
  HOME: 'home',
  GAME: 'game',
  RESULTS: 'results'
} as const;

export type GameViewType = typeof GameView[keyof typeof GameView];

export interface GameState {
  // State
  isGameRunning: boolean;
  timerDuration: number;
  buzzSound: string;
  phrases: string[];
  currentPhrase: string | null;
  usedPhrases: string[];
  isInitialized: boolean;
  currentView: GameViewType;
  gameStartTime: Date | null;
  gameEndTime: Date | null;
  gameTime: number; // Total game time in seconds
  
  // Actions
  initialize: () => Promise<void>;
  startGame: () => void;
  stopGame: () => void;
  setTimerDuration: (duration: number) => void;
  setBuzzSound: (sound: string) => void;
  getRandomPhrase: () => string;
  startNewGame: () => void;
  goToHome: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  isGameRunning: false,
  timerDuration: 60, // Default timer duration in seconds
  buzzSound: 'default',
  phrases,
  currentPhrase: null,
  usedPhrases: [],
  isInitialized: false,
  currentView: GameView.HOME,
  gameStartTime: null,
  gameEndTime: null,
  gameTime: 0,
  
  initialize: async () => {
    try {
      // Load settings from local storage
      const settings = await loadSettings();
      set({ 
        timerDuration: settings.timerDuration,
        buzzSound: settings.buzzSound,
        isInitialized: true
      });
    } catch (error) {
      console.error('Failed to initialize settings:', error);
      // Use default settings if loading fails
      set({ isInitialized: true });
    }
  },
  
  startGame: () => {
    const currentPhrase = get().getRandomPhrase();
    const gameStartTime = new Date();
    
    set(() => ({
      isGameRunning: true,
      currentPhrase,
      usedPhrases: [currentPhrase], // Start with the first phrase
      currentView: GameView.GAME,
      gameStartTime,
      gameEndTime: null
    }));
    
    // Log analytics event
    logAnalyticsEvent('game_started', {
      timerDuration: get().timerDuration,
      buzzSound: get().buzzSound
    });
  },
  
  stopGame: () => {
    const { usedPhrases, gameStartTime, timerDuration } = get();
    const gameEndTime = new Date();
    let gameTime = 0;
    
    // Calculate game time
    if (gameStartTime) {
      gameTime = Math.round((gameEndTime.getTime() - gameStartTime.getTime()) / 1000);
    }
    
    // Only update stats if phrases were used
    if (usedPhrases.length > 0) {
      // Update game statistics
      updateGameStats(
        usedPhrases, 
        gameStartTime || new Date(), 
        gameEndTime,
        timerDuration
      ).catch(error => {
        console.error('Failed to update game stats:', error);
      });
      
      // Log analytics event
      logAnalyticsEvent('game_completed', {
        phrasesPlayed: usedPhrases.length,
        gameTime
      });
    }
    
    set({ 
      isGameRunning: false,
      currentPhrase: null,
      gameEndTime,
      gameTime,
      currentView: GameView.RESULTS
    });
  },
  
  startNewGame: () => {
    const currentPhrase = get().getRandomPhrase();
    const gameStartTime = new Date();
    
    set({
      isGameRunning: true,
      currentPhrase,
      usedPhrases: [currentPhrase],
      currentView: GameView.GAME,
      gameStartTime,
      gameEndTime: null
    });
    
    // Log analytics event
    logAnalyticsEvent('game_restarted', {
      timerDuration: get().timerDuration,
      buzzSound: get().buzzSound
    });
  },
  
  goToHome: () => {
    set({
      currentView: GameView.HOME,
      usedPhrases: []
    });
  },
  
  setTimerDuration: (duration) => {
    set({ timerDuration: duration });
    
    // Save settings to local storage
    saveSettings({
      timerDuration: duration,
      buzzSound: get().buzzSound
    }).catch(error => {
      console.error('Failed to save timer duration:', error);
    });
    
    // Log analytics event
    logAnalyticsEvent('settings_changed', {
      setting: 'timerDuration',
      value: duration
    });
  },
  
  setBuzzSound: (sound) => {
    set({ buzzSound: sound });
    
    // Save settings to local storage
    saveSettings({
      timerDuration: get().timerDuration,
      buzzSound: sound
    }).catch(error => {
      console.error('Failed to save buzzer sound:', error);
    });
    
    // Log analytics event
    logAnalyticsEvent('settings_changed', {
      setting: 'buzzSound',
      value: sound
    });
  },
  
  getRandomPhrase: () => {
    const { phrases, usedPhrases } = get();
    
    // Filter out phrases that have been used already
    const availablePhrases = phrases.filter(phrase => !usedPhrases.includes(phrase));
    
    // If all phrases have been used, reset to full list
    const phrasesToUse = availablePhrases.length > 0 ? availablePhrases : phrases;
    
    const randomIndex = Math.floor(Math.random() * phrasesToUse.length);
    return phrasesToUse[randomIndex];
  },
})); 