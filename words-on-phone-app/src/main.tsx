import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { validateEnvironment, env, isOpenAIAvailable } from './config/environment'
import './index.css'

// Validate environment on startup
validateEnvironment();

console.log('🚀 Words on Phone starting up...');
console.log('📊 Environment:', env);
console.log('📡 OpenAI API Available:', isOpenAIAvailable());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
