import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { validateEnvironment, env, isGeminiAvailable } from './config/environment'
import { soundService } from './services/soundService'

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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
