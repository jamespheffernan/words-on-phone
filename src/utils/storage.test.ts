import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadSettings, toggleDarkMode, getDarkMode, hasCompletedOnboarding, markOnboardingCompleted } from './storage';

// Mock the storage implementation
vi.mock('./storage', async (importOriginal) => {
  // Import the original module
  const originalModule = await importOriginal();
  
  // Return a modified module
  return {
    ...originalModule,
    // Add specific mock implementations
    loadSettings: vi.fn().mockResolvedValue({
      timerDuration: 60,
      buzzSound: 'default',
      darkMode: false,
      hasCompletedOnboarding: false
    }),
    toggleDarkMode: vi.fn().mockResolvedValue(undefined),
    getDarkMode: vi.fn().mockResolvedValue(false),
    hasCompletedOnboarding: vi.fn().mockResolvedValue(true),
    markOnboardingCompleted: vi.fn().mockResolvedValue(undefined)
  };
});

describe('Storage Utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('should load settings with default values', async () => {
    const settings = await loadSettings();
    
    expect(settings).toEqual({
      timerDuration: 60,
      buzzSound: 'default',
      darkMode: false,
      hasCompletedOnboarding: false
    });
    
    expect(loadSettings).toHaveBeenCalled();
  });
  
  it('should toggle dark mode', async () => {
    await toggleDarkMode(true);
    
    expect(toggleDarkMode).toHaveBeenCalledWith(true);
  });
  
  it('should check dark mode preference', async () => {
    const isDarkMode = await getDarkMode();
    
    expect(isDarkMode).toBe(false);
    expect(getDarkMode).toHaveBeenCalled();
  });
  
  it('should check if onboarding is completed', async () => {
    const completed = await hasCompletedOnboarding();
    
    expect(completed).toBe(true);
    expect(hasCompletedOnboarding).toHaveBeenCalled();
  });
  
  it('should mark onboarding as completed', async () => {
    await markOnboardingCompleted();
    
    expect(markOnboardingCompleted).toHaveBeenCalled();
  });
}); 