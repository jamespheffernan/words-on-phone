import React, { useState } from 'react';
import { vibrate, HapticsImpactStyle } from '../utils/haptics';

interface OnboardingProps {
  onComplete: () => void;
  darkMode?: boolean;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete, darkMode = false }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  // Tutorial steps content
  const steps = [
    {
      title: 'Welcome to Words on Phone!',
      content: 'A hot-potato party game where players pass the phone and act out phrases before time runs out.',
      image: '📱'
    },
    {
      title: 'How to Play',
      content: 'Pass the phone around. Each player acts out the phrase shown, then passes to the next player.',
      image: '🎭'
    },
    {
      title: 'Surprise Timer',
      content: 'A random timer counts down silently. When it buzzes, the player holding the phone loses!',
      image: '⏱️'
    },
    {
      title: 'Ready to Play?',
      content: 'Gather your friends, tap "Start Game" and have fun! You can adjust settings like timer duration and sounds.',
      image: '🎮'
    }
  ];

  // Handle next button click
  const handleNext = async () => {
    await vibrate(HapticsImpactStyle.Light);
    
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const currentStepData = steps[currentStep - 1];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl max-w-md w-full overflow-hidden`}>
        {/* Progress indicator */}
        <div className={`${darkMode ? 'bg-gray-700' : 'bg-blue-50'} px-6 py-2 text-right`}>
          <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-blue-800'}`}>{currentStep}/{totalSteps}</span>
        </div>
        
        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="text-5xl mb-4">{currentStepData.image}</div>
            <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'} mb-2`}>{currentStepData.title}</h2>
            <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{currentStepData.content}</p>
          </div>
          
          <button
            onClick={handleNext}
            className={`w-full py-3 ${darkMode 
              ? 'bg-blue-700 hover:bg-blue-800 focus:ring-blue-400' 
              : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
            } text-white font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-opacity-75`}
          >
            {currentStep < totalSteps ? 'Next' : 'Got it!'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding; 