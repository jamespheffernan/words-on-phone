import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGameStore, GameStatus } from './store';
import { act } from '@testing-library/react';
import { PhraseCursor } from './phraseEngine';

// Mock Firebase analytics
vi.mock('./firebase/analytics', () => ({
  trackRoundStart: vi.fn(),
  trackPhraseSuccess: vi.fn(),
  trackPhraseTimeout: vi.fn(),
  trackSkipLimitReached: vi.fn()
}));

// Helper to reset Zustand store state between tests
function resetStore() {
  const cursor = new PhraseCursor(['Phrase A', 'Phrase B', 'Phrase C', 'Phrase D', 'Phrase E']);
  useGameStore.setState({
    status: GameStatus.MENU,
    cursor,
    currentPhrase: '',
    skipLimit: 3,
    skipsUsed: 0,
    skipsRemaining: 3,
    teams: [],
    currentTeamIndex: 0,
    roundNumber: 1,
    roundStats: [],
    currentRoundAnswers: [],
    phraseStartTime: null,
    phraseStats: {}
  });
}

describe('Skip Limit Functionality', () => {
  beforeEach(() => {
    resetStore();
  });

  describe('Initial State', () => {
    it('should initialize with default skip limit of 3', () => {
      const { skipLimit, skipsRemaining } = useGameStore.getState();
      expect(skipLimit).toBe(3);
      expect(skipsRemaining).toBe(3);
    });

    it('should allow setting skip limit to unlimited (0)', () => {
      act(() => {
        useGameStore.getState().setSkipLimit(0);
      });
      const { skipLimit, skipsRemaining } = useGameStore.getState();
      expect(skipLimit).toBe(0);
      expect(skipsRemaining).toBe(Infinity);
    });

    it('should allow setting skip limit to specific number (1-5)', () => {
      [1, 2, 3, 4, 5].forEach(limit => {
        act(() => {
          useGameStore.getState().setSkipLimit(limit);
        });
        const { skipLimit, skipsRemaining } = useGameStore.getState();
        expect(skipLimit).toBe(limit);
        expect(skipsRemaining).toBe(limit);
      });
    });
  });

  describe('Skip Limit Enforcement', () => {
    it('should allow skipping when skips remaining > 0', () => {
      // Set up game state
      act(() => {
        useGameStore.getState().setSkipLimit(2);
        useGameStore.getState().startGame();
      });

      const initialPhrase = useGameStore.getState().currentPhrase;
      
      // First skip should work
      act(() => {
        useGameStore.getState().skipPhrase();
      });
      
      const { currentPhrase, skipsUsed, skipsRemaining } = useGameStore.getState();
      expect(currentPhrase).not.toBe(initialPhrase);
      expect(skipsUsed).toBe(1);
      expect(skipsRemaining).toBe(1);
    });

    it('should prevent skipping when skip limit reached', () => {
      // Set up game with skip limit of 1
      act(() => {
        useGameStore.getState().setSkipLimit(1);
        useGameStore.getState().startGame();
      });

      // Use up the one skip
      act(() => {
        useGameStore.getState().skipPhrase();
      });

      const phraseAfterFirstSkip = useGameStore.getState().currentPhrase;
      
      // Try to skip again - should not work
      act(() => {
        useGameStore.getState().skipPhrase();
      });
      
      const { currentPhrase, skipsUsed, skipsRemaining } = useGameStore.getState();
      expect(currentPhrase).toBe(phraseAfterFirstSkip); // Should be same phrase
      expect(skipsUsed).toBe(1);
      expect(skipsRemaining).toBe(0);
    });

    it('should allow unlimited skips when skip limit is 0', () => {
      // Set up game with unlimited skips
      act(() => {
        useGameStore.getState().setSkipLimit(0);
        useGameStore.getState().startGame();
      });

      // Skip many times
      for (let i = 0; i < 10; i++) {
        act(() => {
          useGameStore.getState().skipPhrase();
        });
      }
      
      const { skipsUsed, skipsRemaining } = useGameStore.getState();
      expect(skipsUsed).toBe(10);
      expect(skipsRemaining).toBe(Infinity);
    });
  });

  describe('Skip Counter Reset on Correct Answer', () => {
    it('should reset skips used and restore remaining skips on correct answer', () => {
      // Set up game with skip limit of 3
      act(() => {
        useGameStore.getState().setSkipLimit(3);
        useGameStore.getState().startGame();
      });

      // Use 2 skips
      act(() => {
        useGameStore.getState().skipPhrase();
        useGameStore.getState().skipPhrase();
      });
      
      expect(useGameStore.getState().skipsUsed).toBe(2);
      expect(useGameStore.getState().skipsRemaining).toBe(1);

      // Get correct answer
      act(() => {
        useGameStore.getState().nextPhrase();
      });
      
      const { skipsUsed, skipsRemaining, skipLimit } = useGameStore.getState();
      expect(skipsUsed).toBe(0);
      expect(skipsRemaining).toBe(skipLimit);
    });

    it('should maintain skip limit setting across rounds', () => {
      // Set up game with skip limit of 2
      act(() => {
        useGameStore.getState().setSkipLimit(2);
        useGameStore.getState().startGame();
      });

      // Play through multiple correct answers
      for (let i = 0; i < 3; i++) {
        act(() => {
          useGameStore.getState().nextPhrase();
        });
        expect(useGameStore.getState().skipsRemaining).toBe(2);
      }
    });
  });

  describe('Skip Limit UI State', () => {
    it('should provide correct state for UI to disable skip button', () => {
      // Set up game with skip limit of 1
      act(() => {
        useGameStore.getState().setSkipLimit(1);
        useGameStore.getState().startGame();
      });

      // Initially should be able to skip
      expect(useGameStore.getState().skipsRemaining).toBeGreaterThan(0);
      
      // Use the skip
      act(() => {
        useGameStore.getState().skipPhrase();
      });
      
      // Should no longer be able to skip
      expect(useGameStore.getState().skipsRemaining).toBe(0);
    });
  });

  describe('Game End Scenarios', () => {
    it('should reset skip counters when ending game', () => {
      // Set up game and use some skips
      act(() => {
        useGameStore.getState().setSkipLimit(3);
        useGameStore.getState().startGame();
        useGameStore.getState().skipPhrase();
        useGameStore.getState().skipPhrase();
      });
      
      expect(useGameStore.getState().skipsUsed).toBe(2);
      
      // End game
      act(() => {
        useGameStore.getState().endGame();
      });
      
      const { skipsUsed, skipsRemaining, skipLimit } = useGameStore.getState();
      expect(skipsUsed).toBe(0);
      expect(skipsRemaining).toBe(skipLimit);
    });

    it('should reset skip counters when resetting round', () => {
      // Set up game and use some skips
      act(() => {
        useGameStore.getState().setSkipLimit(3);
        useGameStore.getState().startGame();
        useGameStore.getState().skipPhrase();
      });
      
      expect(useGameStore.getState().skipsUsed).toBe(1);
      
      // Reset round
      act(() => {
        useGameStore.getState().resetRound();
      });
      
      const { skipsUsed, skipsRemaining, skipLimit } = useGameStore.getState();
      expect(skipsUsed).toBe(0);
      expect(skipsRemaining).toBe(skipLimit);
    });
  });

  describe('Edge Cases', () => {
    it('should handle skip limit changes during game', () => {
      // Start game with skip limit 3
      act(() => {
        useGameStore.getState().setSkipLimit(3);
        useGameStore.getState().startGame();
      });
      
      // Use 1 skip
      act(() => {
        useGameStore.getState().skipPhrase();
      });
      
      // Change skip limit to 1 (less than currently used)
      act(() => {
        useGameStore.getState().setSkipLimit(1);
      });
      
      const { skipLimit, skipsRemaining } = useGameStore.getState();
      expect(skipLimit).toBe(1);
      expect(skipsRemaining).toBe(1); // Should be reset to new limit
    });

    it('should handle changing from limited to unlimited skips', () => {
      // Start with limited skips
      act(() => {
        useGameStore.getState().setSkipLimit(2);
        useGameStore.getState().startGame();
      });
      
      // Use all skips
      act(() => {
        useGameStore.getState().skipPhrase();
        useGameStore.getState().skipPhrase();
      });
      
      expect(useGameStore.getState().skipsRemaining).toBe(0);
      
      // Change to unlimited
      act(() => {
        useGameStore.getState().setSkipLimit(0);
      });
      
      expect(useGameStore.getState().skipsRemaining).toBe(Infinity);
      
      // Should be able to skip again
      const phraseBefore = useGameStore.getState().currentPhrase;
      act(() => {
        useGameStore.getState().skipPhrase();
      });
      expect(useGameStore.getState().currentPhrase).not.toBe(phraseBefore);
    });
  });
}); 