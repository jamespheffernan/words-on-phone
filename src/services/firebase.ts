import { initializeApp } from 'firebase/app';
import { getAnalytics, logEvent } from 'firebase/analytics';
import type { FirebaseApp } from 'firebase/app';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  // These values would be replaced with actual Firebase config in production
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'demo-app.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-app',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'demo-app.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:123456789:web:abcdef123456',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-ABCDEF123'
};

// Log environment variable availability (without exposing values)
console.log('Firebase environment variables status:');
console.log('VITE_FIREBASE_API_KEY available:', !!import.meta.env.VITE_FIREBASE_API_KEY);
console.log('VITE_FIREBASE_AUTH_DOMAIN available:', !!import.meta.env.VITE_FIREBASE_AUTH_DOMAIN);
console.log('VITE_FIREBASE_PROJECT_ID available:', !!import.meta.env.VITE_FIREBASE_PROJECT_ID);
console.log('VITE_FIREBASE_STORAGE_BUCKET available:', !!import.meta.env.VITE_FIREBASE_STORAGE_BUCKET);
console.log('VITE_FIREBASE_MESSAGING_SENDER_ID available:', !!import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID);
console.log('VITE_FIREBASE_APP_ID available:', !!import.meta.env.VITE_FIREBASE_APP_ID);
console.log('VITE_FIREBASE_MEASUREMENT_ID available:', !!import.meta.env.VITE_FIREBASE_MEASUREMENT_ID);
console.log('ENV MODE:', import.meta.env.MODE);

// Initialize Firebase
let app: FirebaseApp | undefined;
try {
  console.log('Initializing Firebase app');
  app = initializeApp(firebaseConfig);
  console.log('Firebase app initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase app:', error);
  if (error instanceof Error) {
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
  }
}

// Initialize Analytics
let analytics: any = null;

// Initialize analytics only in production and if browser supports it
export const initAnalytics = () => {
  console.log('initAnalytics called, PROD mode:', import.meta.env.PROD);
  if (import.meta.env.PROD && !analytics && app) {
    try {
      console.log('Attempting to initialize Firebase Analytics');
      analytics = getAnalytics(app);
      console.log('Firebase Analytics initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Firebase Analytics:', error);
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
    }
  } else {
    console.log('Skipping Firebase Analytics initialization:', {
      isProd: import.meta.env.PROD,
      analyticsAlreadyInitialized: !!analytics,
      appInitialized: !!app
    });
  }
};

/**
 * Log an analytics event
 * @param eventName Name of the event
 * @param eventParams Optional parameters for the event
 */
export const logAnalyticsEvent = (eventName: string, eventParams?: Record<string, any>) => {
  if (analytics) {
    try {
      console.log(`Logging analytics event: ${eventName}`);
      logEvent(analytics, eventName, eventParams);
      console.log(`Event ${eventName} logged successfully`);
    } catch (error) {
      console.error(`Failed to log analytics event (${eventName}):`, error);
    }
  } else {
    console.log(`Analytics not initialized, skipping event: ${eventName}`);
  }
};

export default { initAnalytics, logAnalyticsEvent }; 