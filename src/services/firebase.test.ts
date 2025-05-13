import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initAnalytics, logAnalyticsEvent } from './firebase';

// Mock firebase modules
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => 'mock-app')
}));

vi.mock('firebase/analytics', () => ({
  getAnalytics: vi.fn(() => 'mock-analytics'),
  logEvent: vi.fn()
}));

describe('Firebase Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock environment variables
    vi.stubEnv('MODE', 'development');
  });
  
  it('should not initialize analytics in development mode', () => {
    const { getAnalytics } = require('firebase/analytics');
    
    initAnalytics();
    
    expect(getAnalytics).not.toHaveBeenCalled();
  });
  
  it('should initialize analytics in production mode', () => {
    // Mock production mode
    vi.stubEnv('MODE', 'production');
    // Reset module cache to apply new env
    vi.resetModules();
    
    const { initAnalytics: initAnalyticsProd } = require('./firebase');
    const { getAnalytics } = require('firebase/analytics');
    
    initAnalyticsProd();
    
    expect(getAnalytics).toHaveBeenCalledWith('mock-app');
  });
  
  it('should not log event if analytics is not initialized', () => {
    const { logEvent } = require('firebase/analytics');
    
    logAnalyticsEvent('test_event');
    
    expect(logEvent).not.toHaveBeenCalled();
  });
}); 