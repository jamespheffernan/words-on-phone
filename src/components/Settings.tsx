import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { vibrate, ImpactStyle } from '../utils/haptics';
import QRShare from './QRShare';
import { previewSound, getAvailableSounds } from '../utils/soundPlayer';

interface SettingsProps {
  darkMode: boolean;
  onToggleDarkMode: (enabled: boolean) => void;
}

const Settings: React.FC<SettingsProps> = ({ darkMode, onToggleDarkMode }) => {
  const [timerValue, setTimerValue] = useState(60);
  const [selectedSound, setSelectedSound] = useState('default');
  const [showQRModal, setShowQRModal] = useState(false);
  const { timerDuration, buzzSound, setTimerDuration, setBuzzSound } = useGameStore(state => ({
    timerDuration: state.timerDuration,
    buzzSound: state.buzzSound,
    setTimerDuration: state.setTimerDuration,
    setBuzzSound: state.setBuzzSound
  }));
  
  // Initialize local state with store values only once on mount
  useEffect(() => {
    setTimerValue(timerDuration);
    setSelectedSound(buzzSound);
  }, []);
  
  // Handle timer slider change
  const handleTimerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setTimerValue(value);
  };
  
  // Handle buzzer sound selection
  const handleSoundChange = async (sound: string) => {
    setSelectedSound(sound);
    setBuzzSound(sound);
    
    // Play a preview of the selected sound
    await previewSound(sound as any);
    
    // Provide haptic feedback
    vibrate(ImpactStyle.Light);
  };
  
  // Preview current sound without changing selection
  const handlePreviewSound = async () => {
    await previewSound(selectedSound as any);
    vibrate(ImpactStyle.Light);
  };
  
  // Save timer duration when slider is released
  const handleTimerChangeComplete = () => {
    setTimerDuration(timerValue);
    
    // Provide haptic feedback
    vibrate(ImpactStyle.Medium);
  };
  
  // Handle dark mode toggle
  const handleDarkModeToggle = () => {
    onToggleDarkMode(!darkMode);
    
    // Provide haptic feedback
    vibrate(ImpactStyle.Medium);
  };
  
  // Handle sharing app
  const handleShareApp = async () => {
    vibrate(ImpactStyle.Light);
    setShowQRModal(true);
  };

  return (
    <div className={`p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md max-w-md w-full`}>
      <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'} mb-6`}>Game Settings</h2>
      
      {/* Timer Duration */}
      <div className="mb-6">
        <label htmlFor="timer-duration" className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
          Timer Duration: {timerValue} seconds
        </label>
        <input 
          type="range" 
          id="timer-duration"
          min="30" 
          max="90" 
          step="5"
          value={timerValue}
          onChange={handleTimerChange}
          onMouseUp={handleTimerChangeComplete}
          onTouchEnd={handleTimerChangeComplete}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>30s</span>
          <span>60s</span>
          <span>90s</span>
        </div>
      </div>
      
      {/* Buzzer Sound */}
      <div className="mb-6">
        <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Buzzer Sound</p>
        <div className="grid grid-cols-2 gap-3">
          {getAvailableSounds().map((sound) => (
            <button
              key={sound}
              onClick={() => handleSoundChange(sound)}
              className={`py-2 px-4 text-sm rounded-lg border ${
                selectedSound === sound 
                  ? darkMode ? 'bg-blue-800 border-blue-700 text-white' : 'bg-blue-100 border-blue-300 text-blue-700'
                  : darkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-white border-gray-300 text-gray-700'
              } flex items-center justify-center`}
            >
              <span>{sound.charAt(0).toUpperCase() + sound.slice(1)}</span>
              {selectedSound === sound && (
                <span className="ml-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={handlePreviewSound}
          className={`mt-3 py-2 px-4 text-sm rounded-lg border w-full ${
            darkMode 
              ? 'bg-gray-700 border-gray-600 text-gray-300' 
              : 'bg-white border-gray-300 text-gray-700'
          } flex items-center justify-center`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.465a5 5 0 01-.732-6.34m-.732-6.34a9 9 0 0112.728 0" />
          </svg>
          Preview Sound
        </button>
      </div>
      
      {/* Dark Mode Toggle */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Dark Mode</span>
          <button
            onClick={handleDarkModeToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full ${darkMode ? 'bg-blue-600' : 'bg-gray-300'}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${darkMode ? 'translate-x-6' : 'translate-x-1'}`}
            />
          </button>
        </div>
      </div>
      
      {/* Share App Button */}
      <button
        onClick={handleShareApp}
        className={`w-full py-2 px-4 mb-4 text-center rounded-lg border flex items-center justify-center ${
          darkMode 
            ? 'bg-purple-700 text-white hover:bg-purple-600 border-purple-600' 
            : 'bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200'
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        Share App
      </button>
      
      {/* Reset to Defaults Button */}
      <button
        onClick={() => {
          setTimerDuration(60);
          setBuzzSound('default');
          setTimerValue(60);
          setSelectedSound('default');
          vibrate(ImpactStyle.Medium);
        }}
        className={`w-full py-2 px-4 text-center text-sm rounded-lg border ${
          darkMode 
            ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600' 
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
        }`}
      >
        Reset to Defaults
      </button>
      
      {/* QR Code Modal */}
      {showQRModal && (
        <QRShare 
          darkMode={darkMode} 
          onClose={() => setShowQRModal(false)} 
        />
      )}
    </div>
  );
};

export default Settings; 