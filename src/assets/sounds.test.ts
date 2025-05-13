import { describe, it, expect, vi, beforeEach } from 'vitest';
import { playBuzzerSound } from './sounds';
import soundFiles from './sounds';

// Mock the Audio API
const mockPlay = vi.fn().mockResolvedValue(undefined);
const MockAudio = vi.fn().mockImplementation((src) => ({
  src,
  onerror: null,
  play: mockPlay
}));

// Replace global Audio with mock
global.Audio = MockAudio as any;

describe('Sound Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  it('should have sound file paths defined', () => {
    expect(soundFiles.default).toBeDefined();
    expect(soundFiles.buzzer2).toBeDefined();
    expect(soundFiles.buzzer3).toBeDefined();
    expect(soundFiles.buzzer4).toBeDefined();
  });
  
  it('should create an Audio object with the correct path when playing a sound', () => {
    playBuzzerSound('buzzer2');
    expect(MockAudio).toHaveBeenCalledWith(soundFiles.buzzer2);
    expect(mockPlay).toHaveBeenCalled();
  });
  
  it('should use default sound when an invalid sound name is provided', () => {
    playBuzzerSound('non-existent-sound' as any);
    expect(MockAudio).toHaveBeenCalledWith(soundFiles.default);
  });
  
  it('should use default sound when no sound name is provided', () => {
    playBuzzerSound();
    expect(MockAudio).toHaveBeenCalledWith(soundFiles.default);
  });
  
  it('should handle errors when playing sound', async () => {
    mockPlay.mockRejectedValueOnce(new Error('Play error'));
    
    playBuzzerSound('default');
    
    // Use flushPromises to wait for async operations
    await Promise.resolve();
    
    expect(console.error).toHaveBeenCalledWith('Error playing sound:', expect.any(Error));
  });
}); 