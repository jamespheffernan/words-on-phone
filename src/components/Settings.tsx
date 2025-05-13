import React from 'react';
import { useGameStore } from '../store/gameStore';

const Settings: React.FC = () => {
  const { timerDuration, buzzSound, setTimerDuration, setBuzzSound } = useGameStore(state => ({
    timerDuration: state.timerDuration,
    buzzSound: state.buzzSound,
    setTimerDuration: state.setTimerDuration,
    setBuzzSound: state.setBuzzSound,
  }));

  const handleTimerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDuration = parseInt(e.target.value, 10);
    setTimerDuration(newDuration);
  };

  const handleBuzzerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setBuzzSound(e.target.value);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold text-center text-gray-800 mb-4">Game Settings</h2>
      
      <div className="mb-6">
        <label htmlFor="timer-duration" className="block text-sm font-medium text-gray-700 mb-2">
          Timer Duration
        </label>
        <div className="flex items-center gap-4">
          <input
            id="timer-duration"
            type="range"
            min="30"
            max="90"
            step="10"
            value={timerDuration}
            onChange={handleTimerChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-sm font-medium text-gray-600">{timerDuration} seconds</span>
        </div>
      </div>
      
      <div className="mb-6">
        <label htmlFor="buzzer-sound" className="block text-sm font-medium text-gray-700 mb-2">
          Buzzer Sound
        </label>
        <select
          id="buzzer-sound"
          value={buzzSound}
          onChange={handleBuzzerChange}
          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="default">Default Buzzer</option>
          <option value="buzzer2">Buzzer 2</option>
          <option value="buzzer3">Buzzer 3</option>
          <option value="buzzer4">Buzzer 4</option>
        </select>
      </div>
    </div>
  );
};

export default Settings; 