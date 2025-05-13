import { describe, it, expect, vi, beforeEach } from 'vitest';
import { playSound, previewSound, getAvailableSounds, getSoundFilename, loadSound, preloadSounds } from './soundPlayer';

// Mock the modules that get called by our functions
vi.mock('../utils/haptics', () => ({
  vibrate: vi.fn(),
  ImpactStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' }
}));

describe('Sound Player Utility', () => {
  // Mock Audio
  class MockAudio {
    src: string = '';
    currentTime: number = 0;
    paused: boolean = true;
    
    constructor(src?: string) {
      if (src) this.src = src;
    }
    
    load() {
      // Simulate loading event
      setTimeout(() => {
        const event = new Event('canplaythrough');
        this.dispatchEvent(event);
      }, 10);
    }
    
    play() {
      this.paused = false;
      return Promise.resolve();
    }
    
    pause() {
      this.paused = true;
    }
    
    addEventListener(event: string, callback: (event: Event) => void, options?: any) {
      this._eventListeners = this._eventListeners || {};
      this._eventListeners[event] = this._eventListeners[event] || [];
      this._eventListeners[event].push(callback);
    }
    
    dispatchEvent(event: Event) {
      if (this._eventListeners && this._eventListeners[event.type]) {
        this._eventListeners[event.type].forEach((callback: (event: Event) => void) => {
          callback(event);
        });
      }
    }
    
    _eventListeners: Record<string, ((event: Event) => void)[]> = {};
  }
  
  beforeEach(() => {
    // Reset the mocks
    vi.clearAllMocks();
    
    // Mock the Audio global
    global.Audio = vi.fn().mockImplementation((src) => new MockAudio(src)) as any;
    
    // Spy on our utility functions
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  it('should get the correct filename for each sound type', () => {
    expect(getSoundFilename('default')).toBe('/sounds/buzzer-default.mp3');
    expect(getSoundFilename('buzzer')).toBe('/sounds/buzzer2.mp3');
    expect(getSoundFilename('bell')).toBe('/sounds/bell.mp3');
    expect(getSoundFilename('horn')).toBe('/sounds/horn.mp3');
  });
  
  it('should return all available sounds', () => {
    const sounds = getAvailableSounds();
    expect(sounds).toEqual(['default', 'buzzer', 'bell', 'horn']);
    expect(sounds.length).toBe(4);
  });
  
  it('should load a sound', async () => {
    const audio = await loadSound('default');
    expect(audio).toBeDefined();
    expect(global.Audio).toHaveBeenCalledWith('/sounds/buzzer-default.mp3');
  });
  
  it('should play a sound', async () => {
    // Spy on the Audio.prototype.play method
    const playMock = vi.fn().mockResolvedValue(undefined);
    MockAudio.prototype.play = playMock;
    
    // Spy on the Audio.prototype.pause method
    const pauseMock = vi.fn();
    MockAudio.prototype.pause = pauseMock;
    
    await playSound('bell');
    
    // Verify the Audio constructor was called with the right sound file
    expect(global.Audio).toHaveBeenCalledWith('/sounds/bell.mp3');
    
    // Check that play and pause were called
    expect(playMock).toHaveBeenCalled();
    expect(pauseMock).toHaveBeenCalled();
  });
  
  it('should preview a sound when called', async () => {
    // Create a spy for the playSound function
    const playSoundSpy = vi.spyOn({ playSound }, 'playSound');
    
    // Replace the implementation to avoid infinite recursion
    playSoundSpy.mockImplementation(() => Promise.resolve());
    
    // Call previewSound
    await previewSound('horn');
    
    // We're directly checking if the Audio constructor is called with the right file
    expect(global.Audio).toHaveBeenCalledWith('/sounds/horn.mp3');
  });
  
  it('should attempt to preload sounds', async () => {
    // We'll verify that at least one sound is loaded
    await preloadSounds();
    
    // Check that Audio constructor was called at least once
    expect(global.Audio).toHaveBeenCalled();
    
    // Make sure at least one sound file path was passed to Audio
    expect(global.Audio).toHaveBeenCalledWith(expect.stringContaining('/sounds/'));
  });
}); 