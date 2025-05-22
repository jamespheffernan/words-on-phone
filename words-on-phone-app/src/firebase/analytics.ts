import { initializeApp, getApps } from 'firebase/app';
import { getAnalytics, logEvent, Analytics } from 'firebase/analytics';
import { PhraseCategory } from '../data/phrases';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || 'demo-key',
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || 'demo-project.firebaseapp.com',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'demo-project',
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || 'demo-project.appspot.com',
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: process.env.VITE_FIREBASE_APP_ID || '1:123456789:web:demo-app-id',
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-DEMO-ID'
};

// Initialize Firebase only if not already initialized
let analytics: Analytics | null = null;

const initializeFirebaseAnalytics = () => {
  try {
    // Only initialize in browser environment with valid config
    if (typeof window !== 'undefined' && firebaseConfig.apiKey !== 'demo-key') {
      const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
      analytics = getAnalytics(app);
    }
  } catch (error) {
    console.warn('Firebase analytics initialization failed:', error);
  }
};

// Initialize on module load
initializeFirebaseAnalytics();

// Analytics event types for game
export interface RoundStartEvent {
  category: PhraseCategory;
  timer_duration: number;
  skip_limit: number;
  buzzer_sound: string;
}

export interface PhraseSuccessEvent {
  phrase_id: string;
  category: PhraseCategory;
  time_taken_ms: number;
  attempts_before_success: number;
}

export interface PhraseTimeoutEvent {
  phrase_id: string;
  category: PhraseCategory;
  time_on_phrase_ms: number;
  total_phrases_attempted: number;
}

export interface SkipLimitReachedEvent {
  phrase_id: string;
  category: PhraseCategory;
  skips_used: number;
  skip_limit: number;
}

// Analytics event tracking functions
export const trackRoundStart = (data: RoundStartEvent) => {
  try {
    if (analytics) {
      logEvent(analytics, 'round_start', {
        category: data.category,
        timer_duration: data.timer_duration,
        skip_limit: data.skip_limit,
        buzzer_sound: data.buzzer_sound,
        custom_parameter_round_start: true
      });
    }
  } catch (error) {
    console.warn('Failed to track round_start event:', error);
  }
};

export const trackPhraseSuccess = (data: PhraseSuccessEvent) => {
  try {
    if (analytics) {
      logEvent(analytics, 'phrase_success', {
        phrase_id: data.phrase_id,
        category: data.category,
        time_taken_ms: data.time_taken_ms,
        attempts_before_success: data.attempts_before_success,
        custom_parameter_phrase_success: true
      });
    }
  } catch (error) {
    console.warn('Failed to track phrase_success event:', error);
  }
};

export const trackPhraseTimeout = (data: PhraseTimeoutEvent) => {
  try {
    if (analytics) {
      logEvent(analytics, 'phrase_timeout', {
        phrase_id: data.phrase_id,
        category: data.category,
        time_on_phrase_ms: data.time_on_phrase_ms,
        total_phrases_attempted: data.total_phrases_attempted,
        custom_parameter_phrase_timeout: true
      });
    }
  } catch (error) {
    console.warn('Failed to track phrase_timeout event:', error);
  }
};

export const trackSkipLimitReached = (data: SkipLimitReachedEvent) => {
  try {
    if (analytics) {
      logEvent(analytics, 'skip_limit_reached', {
        phrase_id: data.phrase_id,
        category: data.category,
        skips_used: data.skips_used,
        skip_limit: data.skip_limit,
        custom_parameter_skip_limit_reached: true
      });
    }
  } catch (error) {
    console.warn('Failed to track skip_limit_reached event:', error);
  }
};

// General game event tracker
export const trackGameEvent = (eventName: string, parameters: Record<string, any> = {}) => {
  try {
    if (analytics) {
      logEvent(analytics, eventName, parameters);
    }
  } catch (error) {
    console.warn(`Failed to track ${eventName} event:`, error);
  }
};

// Export analytics instance for advanced use cases
export { analytics }; 