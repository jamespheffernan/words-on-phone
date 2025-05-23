import { initializeApp, getApps } from 'firebase/app';
import { getAnalytics, logEvent, Analytics } from 'firebase/analytics';
import { PhraseCategory } from '../data/phrases';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCFmEujw4bjwovk8IA69ZYoExlpY0lDb_0",
  authDomain: "words-on-phone.firebaseapp.com",
  projectId: "words-on-phone",
  storageBucket: "words-on-phone.firebasestorage.app",
  messagingSenderId: "106660935414",
  appId: "1:106660935414:web:80c9f7919f00a2a58d1ed7",
  measurementId: "G-BCQ5F1YP2P"
};

// Initialize Firebase only if not already initialized
let analytics: Analytics | null = null;

const initializeFirebaseAnalytics = () => {
  try {
    // Only initialize in browser environment with valid config
    if (typeof window !== 'undefined' && firebaseConfig.apiKey !== 'AIzaSyCFmEujw4bjwovk8IA69ZYoExlpY0lDb_0') {
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
  category: PhraseCategory | string;
  timer_duration: number;
  show_timer: boolean;
  use_random_timer: boolean;
  timer_range_min?: number;
  timer_range_max?: number;
  skip_limit: number;
  buzzer_sound: string;
}

export interface PhraseSuccessEvent {
  phrase_id: string;
  category: PhraseCategory | string;
  time_taken_ms: number;
  attempts_before_success: number;
}

export interface PhraseTimeoutEvent {
  phrase_id: string;
  category: PhraseCategory | string;
  time_on_phrase_ms: number;
  total_phrases_attempted: number;
}

export interface SkipLimitReachedEvent {
  phrase_id: string;
  category: PhraseCategory | string;
  skips_used: number;
  skip_limit: number;
}

export interface CategoryRequestedEvent {
  category_name: string;
  request_id: string;
  remaining_quota: number;
}

export interface CategoryConfirmedEvent {
  category_name: string;
  request_id: string;
  sample_words: string[];
}

export interface CategoryGeneratedEvent {
  category_name: string;
  request_id: string;
  phrases_generated: number;
  generation_time_ms: number;
}

export interface TimerPreferencesChangedEvent {
  show_timer: boolean;
  use_random_timer: boolean;
  timer_range_min: number;
  timer_range_max: number;
  fixed_timer_duration: number;
}

// Analytics event tracking functions
export const trackRoundStart = (data: RoundStartEvent) => {
  try {
    if (analytics) {
      logEvent(analytics, 'round_start', {
        category: data.category,
        timer_duration: data.timer_duration,
        show_timer: data.show_timer,
        use_random_timer: data.use_random_timer,
        timer_range_min: data.timer_range_min,
        timer_range_max: data.timer_range_max,
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

export const trackCategoryRequested = (data: CategoryRequestedEvent) => {
  try {
    if (analytics) {
      logEvent(analytics, 'category_requested', {
        category_name: data.category_name,
        request_id: data.request_id,
        remaining_quota: data.remaining_quota,
        custom_parameter_category_requested: true
      });
    }
  } catch (error) {
    console.warn('Failed to track category_requested event:', error);
  }
};

export const trackCategoryConfirmed = (data: CategoryConfirmedEvent) => {
  try {
    if (analytics) {
      logEvent(analytics, 'category_confirmed', {
        category_name: data.category_name,
        request_id: data.request_id,
        sample_words_count: data.sample_words.length,
        custom_parameter_category_confirmed: true
      });
    }
  } catch (error) {
    console.warn('Failed to track category_confirmed event:', error);
  }
};

export const trackCategoryGenerated = (data: CategoryGeneratedEvent) => {
  try {
    if (analytics) {
      logEvent(analytics, 'category_generated', {
        category_name: data.category_name,
        request_id: data.request_id,
        phrases_generated: data.phrases_generated,
        generation_time_ms: data.generation_time_ms,
        custom_parameter_category_generated: true
      });
    }
  } catch (error) {
    console.warn('Failed to track category_generated event:', error);
  }
};

export const trackTimerPreferencesChanged = (data: TimerPreferencesChangedEvent) => {
  try {
    if (analytics) {
      logEvent(analytics, 'timer_preferences_changed', {
        show_timer: data.show_timer,
        use_random_timer: data.use_random_timer,
        timer_range_min: data.timer_range_min,
        timer_range_max: data.timer_range_max,
        fixed_timer_duration: data.fixed_timer_duration,
        custom_parameter_timer_preferences: true
      });
    }
  } catch (error) {
    console.warn('Failed to track timer_preferences_changed event:', error);
  }
};

// General game event tracker
export const trackGameEvent = (eventName: string, parameters: Record<string, string | number | boolean> = {}) => {
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