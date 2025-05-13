import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerServiceWorker } from './serviceWorkerRegistration'
import { initAnalytics } from './services/firebase'
import { useGameStore } from './store/gameStore'
import { initDB } from './utils/storage'

// Register service worker for PWA functionality
registerServiceWorker();

// Initialize Firebase Analytics
initAnalytics();

// Initialize the application
const initializeApp = async () => {
  try {
    // Initialize IndexedDB first
    await initDB();
    
    // Then initialize the game store
    await useGameStore.getState().initialize();
    
    console.log('App initialization completed successfully');
  } catch (error) {
    console.error('App initialization failed:', error);
    // Continue rendering the app even if initialization fails
    // The app should handle fallback values gracefully
  } finally {
    // Create root and render app regardless of initialization status
    const rootElement = document.getElementById('root');
    if (rootElement) {
      createRoot(rootElement).render(
        <StrictMode>
          <App />
        </StrictMode>
      );
    }
  }
};

// Start initialization process
initializeApp();
