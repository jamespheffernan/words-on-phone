import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from './gameStore';
import type { GameState } from './gameStore';

describe('Game Store', () => {
  beforeEach(() => {
    // Reset the store to its initial state before each test
    useGameStore.setState({
      isGameRunning: false,
      timerDuration: 60,
      buzzSound: 'default',
      currentPhrase: null,
      phrases: [
        'Test phrase 1',
        'Test phrase 2',
        'Test phrase 3',
      ],
    } as GameState);
  });

  it('should initialize with default values', () => {
    const state = useGameStore.getState();
    expect(state.isGameRunning).toBe(false);
    expect(state.timerDuration).toBe(60);
    expect(state.buzzSound).toBe('default');
    expect(state.currentPhrase).toBe(null);
    expect(state.phrases.length).toBe(3);
  });

  it('should start the game and set a random phrase', () => {
    const { startGame } = useGameStore.getState();
    startGame();
    
    const state = useGameStore.getState();
    expect(state.isGameRunning).toBe(true);
    expect(state.currentPhrase).not.toBeNull();
    expect(['Test phrase 1', 'Test phrase 2', 'Test phrase 3']).toContain(state.currentPhrase);
  });

  it('should stop the game', () => {
    // First start the game
    const { startGame, stopGame } = useGameStore.getState();
    startGame();
    
    // Then stop it
    stopGame();
    
    const state = useGameStore.getState();
    expect(state.isGameRunning).toBe(false);
    expect(state.currentPhrase).toBeNull();
  });

  it('should set timer duration', () => {
    const { setTimerDuration } = useGameStore.getState();
    setTimerDuration(90);
    
    const state = useGameStore.getState();
    expect(state.timerDuration).toBe(90);
  });

  it('should set buzz sound', () => {
    const { setBuzzSound } = useGameStore.getState();
    setBuzzSound('buzzer2');
    
    const state = useGameStore.getState();
    expect(state.buzzSound).toBe('buzzer2');
  });

  it('should increment score', () => {
    const { incrementScore } = useGameStore.getState();
    incrementScore();
    
    const state = useGameStore.getState();
    expect(state.score).toBe(1);
  });

  it('should move to next phrase', () => {
    const { startGame, nextPhrase } = useGameStore.getState();
    startGame();
    const initialState = useGameStore.getState();
    const initialPhrase = initialState.currentPhrase;
    
    nextPhrase();
    const newState = useGameStore.getState();
    expect(newState.currentPhrase).not.toBeNull();
    expect(newState.usedPhrases).toContain(initialPhrase);
    expect(newState.usedPhrases.length).toBe(2);
  });
}); 