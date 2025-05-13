import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerServiceWorker } from './serviceWorkerRegistration'
import { initAnalytics } from './services/firebase'
import { useGameStore } from './store/gameStore'
import { initDB } from './utils/storage'

console.log('Application starting - main.tsx loaded');

// Register service worker for PWA functionality
registerServiceWorker();

// Initialize Firebase Analytics
try {
  console.log('Initializing Firebase Analytics');
  initAnalytics();
  console.log('Firebase Analytics initialization complete');
} catch (error) {
  console.error('Firebase Analytics initialization error:', error);
}

// Initialize the application
const initializeApp = async () => {
  console.log('Application initialization starting');
  try {
    // Initialize IndexedDB first
    console.log('Initializing IndexedDB');
    await initDB();
    console.log('IndexedDB initialization successful');
    
    // Then initialize the game store
    console.log('Initializing game store');
    await useGameStore.getState().initialize();
    console.log('Game store initialization successful');
    
    console.log('App initialization completed successfully');
  } catch (error) {
    console.error('App initialization failed with error:', error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    // Continue rendering the app even if initialization fails
    // The app should handle fallback values gracefully
  } finally {
    // Create root and render app regardless of initialization status
    console.log('Rendering application to DOM');
    const rootElement = document.getElementById('root');
    if (rootElement) {
      createRoot(rootElement).render(
        <StrictMode>
          <App />
        </StrictMode>
      );
      console.log('Application rendered successfully');
    } else {
      console.error('Failed to find root element for mounting app');
    }
  }
};

// Start initialization process
initializeApp();
