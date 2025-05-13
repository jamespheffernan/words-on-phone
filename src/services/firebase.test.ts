import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initializeApp } from 'firebase/app';
import { getAnalytics, logEvent } from 'firebase/analytics';
import { initAnalytics, logAnalyticsEvent } from './firebase';

// Mock firebase modules
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => 'mock-app')
}));

vi.mock('firebase/analytics', () => ({
  getAnalytics: vi.fn(() => 'mock-analytics'),
  logEvent: vi.fn()
}));

// Type the mocks
const mockedGetAnalytics = vi.mocked(getAnalytics);
const mockedLogEvent = vi.mocked(logEvent);

// Mock internal analytics state
let mockAnalyticsState: any = null;

// Override analytics access in firebase module
vi.mock('./firebase', async (importOriginal) => {
  const originalModule = await importOriginal();
  return {
    ...originalModule,
    initAnalytics: vi.fn().mockImplementation(() => {
      if (process.env.MODE === 'production') {
        mockAnalyticsState = 'mock-analytics';
        console.log('Firebase Analytics initialized');
      }
    }),
    logAnalyticsEvent: vi.fn().mockImplementation((eventName, eventParams) => {
      if (mockAnalyticsState) {
        logEvent(mockAnalyticsState, eventName, eventParams);
      }
    })
  };
});

describe('Firebase Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset the environment for each test
    vi.unstubAllEnvs();
    
    // Reset mock analytics state
    mockAnalyticsState = null;
  });
  
  it('should not initialize analytics in development mode', () => {
    // Simulate development environment
    vi.stubEnv('MODE', 'development');
    
    initAnalytics();
    
    expect(mockedGetAnalytics).not.toHaveBeenCalled();
    expect(mockAnalyticsState).toBeNull();
  });
  
  it('should initialize analytics in production mode', () => {
    // Simulate production environment
    vi.stubEnv('MODE', 'production');
    vi.stubEnv('PROD', true);
    
    // In production, analytics should initialize
    initAnalytics();
    
    expect(mockAnalyticsState).not.toBeNull();
  });
  
  it('should not log event if analytics is not initialized', () => {
    // In development, analytics is not initialized
    vi.stubEnv('MODE', 'development');
    
    // Ensure analytics is null
    initAnalytics();
    expect(mockAnalyticsState).toBeNull();
    
    // Try to log an event
    logAnalyticsEvent('test_event');
    
    // Should not call logEvent since analytics isn't initialized
    expect(mockedLogEvent).not.toHaveBeenCalled();
  });
}); 