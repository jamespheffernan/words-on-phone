import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { validateEnvironment, env, isGeminiAvailable } from './config/environment'
import { soundService } from './services/soundService'
import { analytics } from './services/analytics'

// Validate environment configuration
validateEnvironment();

// Initialize sound service
soundService.init();

// Log API configuration status in development
if (env.IS_DEVELOPMENT) {
  console.log('🚀 Words on Phone - Development Mode');
  console.log('📡 Gemini API Available:', isGeminiAvailable());
  console.log('💡 Custom categories are handled via secure serverless functions');
}

// Track app start
analytics.trackAppStart()

// Track app exit events
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    analytics.trackAppExit('visibility_change')
  }
})

window.addEventListener('beforeunload', () => {
  analytics.trackAppExit('page_unload')
})

// Track PWA install events
// @ts-ignore - PWA install prompt variable used in event listeners
let deferredPrompt: any = null;

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  deferredPrompt = e;
  
  // Track that install prompt was shown
  analytics.track('pwa_install_prompt', {
    accepted: false,
    platform: navigator.platform
  });
});

window.addEventListener('appinstalled', () => {
  // Track successful PWA installation
  analytics.track('install', {
    platform: navigator.platform,
    appVersion: import.meta.env.VITE_APP_VERSION || '0.0.0-dev',
    referrer: document.referrer
  });
  
  deferredPrompt = null;
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
