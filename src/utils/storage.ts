import { openDB } from 'idb';
import type { IDBPDatabase } from 'idb';

const DB_NAME = 'wordsOnPhoneDB';
const DB_VERSION = 2;
const SETTINGS_STORE = 'settings';
const STATISTICS_STORE = 'statistics';
const PHRASES_STORE = 'phrases';
const GAME_SESSIONS_STORE = 'gameSessions';

interface Settings {
  timerDuration: number;
  buzzSound: string;
  darkMode?: boolean;
  hasCompletedOnboarding?: boolean;
  phraseStats?: Record<string, PhraseStats>;
}

interface GameStats {
  totalGames: number;
  phrasesPlayed: number;
  lastPlayed: Date;
  averagePhrasesPerGame?: number;
  totalPlayTime?: number;
  topPhrases?: Array<{ phrase: string; timesPlayed: number }>;
}

interface PhraseStats {
  phrase: string;
  timesPlayed: number;
  lastPlayed: Date;
}

interface GameSession {
  id: string;
  startTime: Date;
  endTime: Date;
  phrasesUsed: string[];
  timerDuration: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;
let dbInstance: IDBPDatabase | null = null;

/**
 * Initialize the IndexedDB database
 */
export const initDB = async (): Promise<IDBPDatabase> => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion) {
        console.log(`Upgrading database from version ${oldVersion} to ${newVersion}`);
        
        // Create the settings store
        if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
          db.createObjectStore(SETTINGS_STORE, { keyPath: 'id' });
        }
        
        // Create stats store
        if (!db.objectStoreNames.contains(STATISTICS_STORE)) {
          db.createObjectStore(STATISTICS_STORE, { keyPath: 'id' });
        }
        
        // Create phrases store for tracking phrase usage
        if (!db.objectStoreNames.contains(PHRASES_STORE)) {
          db.createObjectStore(PHRASES_STORE, { keyPath: 'phrase' });
        }
        
        // Add game sessions store in version 2
        if (oldVersion < 2 && !db.objectStoreNames.contains(GAME_SESSIONS_STORE)) {
          db.createObjectStore(GAME_SESSIONS_STORE, { keyPath: 'id', autoIncrement: true });
        }
      }
    }).then(async db => {
      dbInstance = db;
      
      // Initialize default data after database is opened and upgraded
      await initializeDefaultData(db);
      return db;
    });
  }
  
  return dbPromise;
};

/**
 * Initialize default data in a separate transaction after upgrade
 */
const initializeDefaultData = async (db: IDBPDatabase): Promise<void> => {
  try {
    // Initialize settings if not exists
    const settings = await db.get(SETTINGS_STORE, 'userSettings');
    if (!settings) {
      await db.put(SETTINGS_STORE, {
        id: 'userSettings',
        timerDuration: 60,
        buzzSound: 'default',
        darkMode: false,
        hasCompletedOnboarding: false
      });
    } else if (DB_VERSION >= 2) {
      // Handle migration to v2 if needed
      if (settings.darkMode === undefined || settings.hasCompletedOnboarding === undefined) {
        await db.put(SETTINGS_STORE, {
          ...settings,
          darkMode: settings.darkMode ?? false,
          hasCompletedOnboarding: settings.hasCompletedOnboarding ?? false
        });
      }
    }
    
    // Initialize stats if not exists
    const stats = await db.get(STATISTICS_STORE, 'gameStats');
    if (!stats) {
      await db.put(STATISTICS_STORE, {
        id: 'gameStats',
        totalGames: 0,
        phrasesPlayed: 0,
        lastPlayed: new Date(0) // epoch
      });
    }
  } catch (error) {
    console.error('Error initializing default data:', error);
  }
};

/**
 * Get a reference to the database
 */
export const getDB = async (): Promise<IDBPDatabase> => {
  if (dbInstance) {
    return dbInstance;
  }
  return initDB();
};

/**
 * Save user settings to IndexedDB
 */
export const saveSettings = async (settings: Settings): Promise<void> => {
  const db = await getDB();
  const currentSettings = await db.get(SETTINGS_STORE, 'userSettings') || {
    id: 'userSettings',
    timerDuration: 60,
    buzzSound: 'default',
    darkMode: false,
    hasCompletedOnboarding: false
  };
  
  await db.put(SETTINGS_STORE, {
    ...currentSettings,
    ...settings
  });
};

/**
 * Load user settings from IndexedDB
 */
export const loadSettings = async (): Promise<Settings> => {
  const db = await getDB();
  const settings = await db.get(SETTINGS_STORE, 'userSettings');
  
  return settings || {
    timerDuration: 60,
    buzzSound: 'default',
    darkMode: false,
    hasCompletedOnboarding: false
  };
};

/**
 * Mark onboarding as completed
 */
export const markOnboardingCompleted = async (): Promise<void> => {
  const settings = await loadSettings();
  await saveSettings({ 
    ...settings,
    hasCompletedOnboarding: true 
  });
};

/**
 * Check if user has completed onboarding
 */
export const hasCompletedOnboarding = async (): Promise<boolean> => {
  const settings = await loadSettings();
  return settings.hasCompletedOnboarding === true;
};

/**
 * Toggle dark mode setting
 */
export const toggleDarkMode = async (enabled: boolean): Promise<void> => {
  const settings = await loadSettings();
  await saveSettings({ 
    ...settings,
    darkMode: enabled 
  });
};

/**
 * Get dark mode setting
 */
export const getDarkMode = async (): Promise<boolean> => {
  const settings = await loadSettings();
  return settings.darkMode === true;
};

/**
 * Record game session
 */
export const recordGameSession = async (
  phrases: string[],
  startTime: Date,
  endTime: Date,
  timerDuration: number
): Promise<string> => {
  const db = await getDB();
  const gameSession: Omit<GameSession, 'id'> = {
    startTime,
    endTime,
    phrasesUsed: phrases,
    timerDuration
  };
  
  const id = await db.add(GAME_SESSIONS_STORE, gameSession);
  return id.toString();
};

/**
 * Update game statistics
 */
export const updateGameStats = async (
  phrases: string[],
  startTime?: Date,
  endTime?: Date,
  timerDuration?: number
): Promise<void> => {
  const db = await getDB();
  const tx = db.transaction([STATISTICS_STORE, PHRASES_STORE], 'readwrite');
  
  // Update global stats
  const statsStore = tx.objectStore(STATISTICS_STORE);
  const currentStats = await statsStore.get('gameStats') || {
    id: 'gameStats',
    totalGames: 0,
    phrasesPlayed: 0,
    lastPlayed: new Date(0)
  };
  
  await statsStore.put({
    ...currentStats,
    totalGames: currentStats.totalGames + 1,
    phrasesPlayed: currentStats.phrasesPlayed + phrases.length,
    lastPlayed: new Date()
  });
  
  // Record session if timing info provided
  if (startTime && endTime && timerDuration) {
    await recordGameSession(phrases, startTime, endTime, timerDuration);
  }
  
  // Update phrase stats
  const phrasesStore = tx.objectStore(PHRASES_STORE);
  for (const phrase of phrases) {
    const currentPhraseStats = await phrasesStore.get(phrase) || {
      phrase,
      timesPlayed: 0,
      lastPlayed: new Date(0)
    };
    
    await phrasesStore.put({
      ...currentPhraseStats,
      timesPlayed: currentPhraseStats.timesPlayed + 1,
      lastPlayed: new Date()
    });
  }
  
  await tx.done;
};

/**
 * Get game statistics with enhanced data
 */
export const getGameStats = async (): Promise<GameStats> => {
  const db = await getDB();
  const stats = await db.get(STATISTICS_STORE, 'gameStats') || {
    totalGames: 0,
    phrasesPlayed: 0,
    lastPlayed: new Date(0)
  };
  
  // Calculate average phrases per game
  if (stats.totalGames > 0) {
    stats.averagePhrasesPerGame = Math.round((stats.phrasesPlayed / stats.totalGames) * 10) / 10;
  }
  
  // Get top phrases
  const topPhrases = await getTopPhrases(5);
  if (topPhrases.length > 0) {
    stats.topPhrases = topPhrases;
  }
  
  // Get total play time from sessions
  const sessions = await getAllGameSessions();
  if (sessions.length > 0) {
    stats.totalPlayTime = sessions.reduce((total, session) => {
      return total + (session.endTime.getTime() - session.startTime.getTime()) / 1000;
    }, 0);
  }
  
  return stats;
};

/**
 * Get stats for a specific phrase
 */
export const getPhraseStats = async (phrase: string): Promise<PhraseStats | null> => {
  const db = await getDB();
  return db.get(PHRASES_STORE, phrase);
};

/**
 * Get all game sessions
 */
export const getAllGameSessions = async (): Promise<GameSession[]> => {
  const db = await getDB();
  return db.getAll(GAME_SESSIONS_STORE);
};

/**
 * Get the most frequently used phrases
 */
export const getTopPhrases = async (limit: number = 5): Promise<Array<{ phrase: string; timesPlayed: number }>> => {
  const db = await getDB();
  const allPhrases = await db.getAll(PHRASES_STORE);
  
  // Sort by timesPlayed in descending order
  return allPhrases
    .sort((a, b) => b.timesPlayed - a.timesPlayed)
    .slice(0, limit)
    .map(({ phrase, timesPlayed }) => ({ phrase, timesPlayed }));
}; 