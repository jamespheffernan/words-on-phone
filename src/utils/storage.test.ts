import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initDB, saveSettings, loadSettings, updateGameStats, getGameStats, getPhraseStats } from './storage';

// Mock IndexedDB
vi.mock('fake-indexeddb', () => {
  return {
    indexedDB: window.indexedDB
  };
}, { virtual: true });

// Mock IDB
vi.mock('idb', () => {
  // Create mock stores
  const mockSettingsStore = {
    get: vi.fn(),
    put: vi.fn()
  };
  
  const mockStatsStore = {
    get: vi.fn(),
    put: vi.fn()
  };
  
  const mockPhrasesStore = {
    get: vi.fn(),
    put: vi.fn()
  };
  
  // Mock transaction
  const mockTransaction = {
    objectStore: vi.fn((storeName) => {
      if (storeName === 'settings') return mockSettingsStore;
      if (storeName === 'statistics') return mockStatsStore;
      if (storeName === 'phrases') return mockPhrasesStore;
      return {};
    }),
    done: Promise.resolve()
  };
  
  // Mock database
  const mockDB = {
    transaction: vi.fn(() => mockTransaction),
    objectStoreNames: {
      contains: vi.fn().mockReturnValue(false)
    },
    createObjectStore: vi.fn().mockImplementation(() => ({
      put: vi.fn()
    })),
    put: vi.fn(),
    get: vi.fn()
  };
  
  return {
    openDB: vi.fn().mockResolvedValue(mockDB)
  };
});

describe('Storage Utility', () => {
  let idb: any;
  
  beforeEach(() => {
    vi.clearAllMocks();
    // Import the mocked module
    idb = require('idb');
  });
  
  it('should initialize the database', async () => {
    await initDB();
    expect(idb.openDB).toHaveBeenCalledWith('wordsOnPhoneDB', 1, expect.anything());
  });
  
  it('should save settings', async () => {
    const mockDB = await idb.openDB();
    
    await saveSettings({
      timerDuration: 90,
      buzzSound: 'buzzer2'
    });
    
    expect(mockDB.put).toHaveBeenCalledWith('settings', {
      id: 'userSettings',
      timerDuration: 90,
      buzzSound: 'buzzer2'
    });
  });
  
  it('should load settings with default fallback', async () => {
    const mockDB = await idb.openDB();
    mockDB.get.mockResolvedValueOnce(null); // No settings found
    
    const settings = await loadSettings();
    
    expect(mockDB.get).toHaveBeenCalledWith('settings', 'userSettings');
    expect(settings).toEqual({
      timerDuration: 60,
      buzzSound: 'default'
    });
  });
  
  it('should update game stats', async () => {
    const mockDB = await idb.openDB();
    const mockTx = mockDB.transaction();
    const statsStore = mockTx.objectStore('statistics');
    const phrasesStore = mockTx.objectStore('phrases');
    
    // Mock existing stats
    statsStore.get.mockResolvedValueOnce({
      id: 'gameStats',
      totalGames: 5,
      phrasesPlayed: 20,
      lastPlayed: new Date(2023, 0, 1)
    });
    
    // Mock phrase stats
    phrasesStore.get.mockResolvedValueOnce({
      phrase: 'Test phrase',
      timesPlayed: 2,
      lastPlayed: new Date(2023, 0, 1)
    });
    
    await updateGameStats(['Test phrase']);
    
    // Should update game stats
    expect(statsStore.put).toHaveBeenCalledWith(expect.objectContaining({
      totalGames: 6,
      phrasesPlayed: 21
    }));
    
    // Should update phrase stats
    expect(phrasesStore.put).toHaveBeenCalledWith(expect.objectContaining({
      phrase: 'Test phrase',
      timesPlayed: 3
    }));
  });
}); 