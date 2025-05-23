import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { validateEnvironment, env } from './config/environment'

// Validate environment configuration
validateEnvironment();

// Log API configuration status in development
if (env.IS_DEVELOPMENT) {
  console.log('🚀 Words on Phone - Development Mode');
  console.log('📡 Gemini API Available:', !!env.GEMINI_API_KEY);
  if (!env.GEMINI_API_KEY) {
    console.warn('⚠️ VITE_GEMINI_API_KEY not set - custom categories will be unavailable');
    console.log('💡 Set VITE_GEMINI_API_KEY in your .env.local file for custom category features');
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
