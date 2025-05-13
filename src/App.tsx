import React, { useState, useEffect } from 'react';
import './App.css';
import './index.css';
import Layout from './components/Layout';
import TimerProvider from './components/TimerProvider';
import Onboarding from './components/Onboarding';
import { hasCompletedOnboarding, markOnboardingCompleted, getDarkMode, toggleDarkMode } from './utils/storage';

function App() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user has completed onboarding and get dark mode preference
  useEffect(() => {
    const initApp = async () => {
      try {
        // Check for onboarding completion
        const completed = await hasCompletedOnboarding();
        setShowOnboarding(!completed);
        
        // Check dark mode preference
        const isDarkMode = await getDarkMode();
        setDarkMode(isDarkMode);
        
        if (isDarkMode) {
          document.documentElement.classList.add('dark');
        }
      } catch (error) {
        console.error('Error initializing app:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    initApp();
  }, []);
  
  // Handle onboarding completion
  const handleOnboardingComplete = async () => {
    await markOnboardingCompleted();
    setShowOnboarding(false);
  };
  
  // Handle dark mode toggle
  const handleToggleDarkMode = async (enabled: boolean) => {
    setDarkMode(enabled);
    await toggleDarkMode(enabled);
    
    if (enabled) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-pulse text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <TimerProvider>
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'} flex flex-col items-center justify-center transition-colors duration-200`}>
        <h1 className={`text-3xl font-bold text-center ${darkMode ? 'text-white' : 'text-gray-800'} mb-6`}>Words on Phone</h1>
        <Layout darkMode={darkMode} onToggleDarkMode={handleToggleDarkMode} />
        
        {/* Show onboarding for first-time users */}
        {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}
      </div>
    </TimerProvider>
  );
}

export default App;
