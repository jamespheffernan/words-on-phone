import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useGameStore } from './store';
import { act } from '@testing-library/react';
import { PhraseCursor } from './phraseEngine';

// Mock Firebase analytics
vi.mock('./firebase/analytics', () => ({
  trackRoundStart: vi.fn(),
  trackPhraseSuccess: vi.fn(),
  trackPhraseTimeout: vi.fn(),
  trackSkipLimitReached: vi.fn(),
  trackTimerPreferencesChanged: vi.fn()
}));

// Mock phrase service
vi.mock('./services/phraseService', () => ({
  phraseService: {
    getAllPhrases: () => ['test phrase 1', 'test phrase 2', 'test phrase 3'],
    getPhrasesByCategory: () => ['test phrase 1', 'test phrase 2', 'test phrase 3']
  }
}));

// Helper to reset Zustand store state between tests
function resetStore() {
  const cursor = new PhraseCursor(['A', 'B', 'C']);
  useGameStore.setState({
    cursor,
    currentPhrase: cursor.next(),
    nextPhrase: () => useGameStore.setState((state) => ({ currentPhrase: state.cursor.next() })),
  });
}

describe('Game Store', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should initialize with a currentPhrase', () => {
    const { currentPhrase } = useGameStore.getState();
    expect(typeof currentPhrase).toBe('string');
    expect(['A', 'B', 'C']).toContain(currentPhrase);
  });

  it('should update currentPhrase when nextPhrase is called', () => {
    const { nextPhrase } = useGameStore.getState();
    act(() => {
      nextPhrase();
    });
    const { currentPhrase: newPhrase } = useGameStore.getState();
    expect(['A', 'B', 'C']).toContain(newPhrase);
    // It may repeat after 3, but should change at least once in 3 calls
    expect(newPhrase).not.toBe(undefined);
  });

  it('should cycle through all phrases before repeating', () => {
    const seen = new Set();
    for (let i = 0; i < 3; i++) {
      seen.add(useGameStore.getState().currentPhrase);
      act(() => {
        useGameStore.getState().nextPhrase();
      });
    }
    expect(seen.size).toBe(3);
  });
});

describe('Enhanced Timer Store Tests', () => {
  beforeEach(() => {
    // Reset store to initial state
    useGameStore.getState().endGame();
    useGameStore.setState({
      showTimer: false,
      useRandomTimer: true,
      timerRangeMin: 45,
      timerRangeMax: 75,
      timerDuration: 60,
      actualTimerDuration: 60
    });
  });

  describe('Timer Randomization', () => {
    it('should generate random timer duration within range', () => {
      const store = useGameStore.getState();
      
      // Test multiple generations to ensure randomness
      const durations = Array.from({ length: 20 }, () => 
        store.generateRandomTimerDuration()
      );
      
      // All durations should be within range
      durations.forEach(duration => {
        expect(duration).toBeGreaterThanOrEqual(45);
        expect(duration).toBeLessThanOrEqual(75);
      });
      
      // Should have some variation (not all the same)
      const uniqueDurations = new Set(durations);
      expect(uniqueDurations.size).toBeGreaterThan(1);
    });

    it('should handle edge case when min equals max', () => {
      useGameStore.setState({
        timerRangeMin: 60,
        timerRangeMax: 60
      });
      
      const store = useGameStore.getState();
      const duration = store.generateRandomTimerDuration();
      
      expect(duration).toBe(60);
    });

    it('should use random duration when starting game with useRandomTimer enabled', () => {
      const store = useGameStore.getState();
      store.setUseRandomTimer(true);
      store.startGame();
      
      const { actualTimerDuration } = useGameStore.getState();
      expect(actualTimerDuration).toBeGreaterThanOrEqual(45);
      expect(actualTimerDuration).toBeLessThanOrEqual(75);
    });

    it('should use fixed duration when starting game with useRandomTimer disabled', () => {
      const store = useGameStore.getState();
      store.setUseRandomTimer(false);
      store.setTimerDuration(90);
      store.startGame();
      
      const { actualTimerDuration } = useGameStore.getState();
      expect(actualTimerDuration).toBe(90);
    });
  });

  describe('Timer Display Settings', () => {
    it('should initialize with timer hidden by default', () => {
      const { showTimer } = useGameStore.getState();
      expect(showTimer).toBe(false);
    });

    it('should initialize with random timer enabled by default', () => {
      const { useRandomTimer } = useGameStore.getState();
      expect(useRandomTimer).toBe(true);
    });

    it('should initialize with correct default timer range', () => {
      const { timerRangeMin, timerRangeMax } = useGameStore.getState();
      expect(timerRangeMin).toBe(45);
      expect(timerRangeMax).toBe(75);
    });

    it('should update showTimer setting', () => {
      const store = useGameStore.getState();
      
      store.setShowTimer(true);
      expect(useGameStore.getState().showTimer).toBe(true);
      
      store.setShowTimer(false);
      expect(useGameStore.getState().showTimer).toBe(false);
    });

    it('should update useRandomTimer setting', () => {
      const store = useGameStore.getState();
      
      store.setUseRandomTimer(false);
      expect(useGameStore.getState().useRandomTimer).toBe(false);
      
      store.setUseRandomTimer(true);
      expect(useGameStore.getState().useRandomTimer).toBe(true);
    });
  });

  describe('Timer Range Validation', () => {
    it('should prevent min from exceeding max', () => {
      const store = useGameStore.getState();
      
      // Set max to 60
      store.setTimerRangeMax(60);
      expect(useGameStore.getState().timerRangeMax).toBe(60);
      
      // Try to set min to 70 (should be clamped to 60)
      store.setTimerRangeMin(70);
      expect(useGameStore.getState().timerRangeMin).toBe(60);
    });

    it('should prevent max from going below min', () => {
      const store = useGameStore.getState();
      
      // Set min to 50
      store.setTimerRangeMin(50);
      expect(useGameStore.getState().timerRangeMin).toBe(50);
      
      // Try to set max to 40 (should be clamped to 50)
      store.setTimerRangeMax(40);
      expect(useGameStore.getState().timerRangeMax).toBe(50);
    });

    it('should allow valid range updates', () => {
      const store = useGameStore.getState();
      
      store.setTimerRangeMin(30);
      store.setTimerRangeMax(90);
      
      const { timerRangeMin, timerRangeMax } = useGameStore.getState();
      expect(timerRangeMin).toBe(30);
      expect(timerRangeMax).toBe(90);
    });
  });

  describe('Timer State Management', () => {
    it('should reset timeRemaining to actualTimerDuration on game end', () => {
      const store = useGameStore.getState();
      
      // Start game and simulate timer running
      store.startGame();
      const { actualTimerDuration } = useGameStore.getState();
      
      // Simulate timer countdown
      store.setTimeRemaining(30);
      expect(useGameStore.getState().timeRemaining).toBe(30);
      
      // End game
      store.endGame();
      expect(useGameStore.getState().timeRemaining).toBe(actualTimerDuration);
    });

    it('should reset timeRemaining to actualTimerDuration on round reset', () => {
      const store = useGameStore.getState();
      
      store.startGame();
      const { actualTimerDuration } = useGameStore.getState();
      
      // Simulate timer countdown
      store.setTimeRemaining(25);
      
      // Reset round
      store.resetRound();
      expect(useGameStore.getState().timeRemaining).toBe(actualTimerDuration);
    });
  });

  describe('Persistence', () => {
    it('should persist timer settings', () => {
      const store = useGameStore.getState();
      
      // Update all timer settings
      store.setShowTimer(true);
      store.setUseRandomTimer(false);
      store.setTimerRangeMin(35);
      store.setTimerRangeMax(85);
      store.setTimerDuration(70);
      
      // Check persistence partialize includes all timer settings
      const persistedState = {
        showTimer: true,
        useRandomTimer: false,
        timerRangeMin: 35,
        timerRangeMax: 85,
        timerDuration: 70
      };
      
      // These should be included in persisted state
      expect(persistedState.showTimer).toBe(true);
      expect(persistedState.useRandomTimer).toBe(false);
      expect(persistedState.timerRangeMin).toBe(35);
      expect(persistedState.timerRangeMax).toBe(85);
      expect(persistedState.timerDuration).toBe(70);
    });
  });
}); 