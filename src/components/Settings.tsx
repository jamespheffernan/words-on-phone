import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { vibrate, ImpactStyle } from '../utils/haptics';

interface SettingsProps {
  darkMode: boolean;
  onToggleDarkMode: (enabled: boolean) => void;
}

const Settings: React.FC<SettingsProps> = ({ darkMode, onToggleDarkMode }) => {
  const [timerValue, setTimerValue] = useState(60);
  const [selectedSound, setSelectedSound] = useState('default');
  const { timerDuration, buzzSound, setTimerDuration, setBuzzSound } = useGameStore(state => ({
    timerDuration: state.timerDuration,
    buzzSound: state.buzzSound,
    setTimerDuration: state.setTimerDuration,
    setBuzzSound: state.setBuzzSound
  }));
  
  useEffect(() => {
    // Initialize local state with store values
    setTimerValue(timerDuration);
    setSelectedSound(buzzSound);
  }, [timerDuration, buzzSound]);
  
  // Handle timer slider change
  const handleTimerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setTimerValue(value);
  };
  
  // Handle buzzer sound selection
  const handleSoundChange = (sound: string) => {
    setSelectedSound(sound);
    setBuzzSound(sound);
    
    // Provide haptic feedback
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
          <button
            onClick={() => handleSoundChange('default')}
            className={`py-2 px-4 text-sm rounded-lg border ${
              selectedSound === 'default' 
                ? darkMode ? 'bg-blue-800 border-blue-700 text-white' : 'bg-blue-100 border-blue-300 text-blue-700'
                : darkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-white border-gray-300 text-gray-700'
            }`}
          >
            Default
          </button>
          <button
            onClick={() => handleSoundChange('buzzer')}
            className={`py-2 px-4 text-sm rounded-lg border ${
              selectedSound === 'buzzer' 
                ? darkMode ? 'bg-blue-800 border-blue-700 text-white' : 'bg-blue-100 border-blue-300 text-blue-700'
                : darkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-white border-gray-300 text-gray-700'
            }`}
          >
            Buzzer
          </button>
          <button
            onClick={() => handleSoundChange('bell')}
            className={`py-2 px-4 text-sm rounded-lg border ${
              selectedSound === 'bell' 
                ? darkMode ? 'bg-blue-800 border-blue-700 text-white' : 'bg-blue-100 border-blue-300 text-blue-700'
                : darkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-white border-gray-300 text-gray-700'
            }`}
          >
            Bell
          </button>
          <button
            onClick={() => handleSoundChange('horn')}
            className={`py-2 px-4 text-sm rounded-lg border ${
              selectedSound === 'horn' 
                ? darkMode ? 'bg-blue-800 border-blue-700 text-white' : 'bg-blue-100 border-blue-300 text-blue-700'
                : darkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-white border-gray-300 text-gray-700'
            }`}
          >
            Horn
          </button>
        </div>
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
      
      {/* Reset to Defaults Button */}
      <button
        onClick={() => {
          setTimerDuration(60);
          setBuzzSound('default');
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
    </div>
  );
};

export default Settings; 