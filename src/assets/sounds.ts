// This file will manage access to sound assets
const soundFiles = {
  default: '/sounds/buzzer-default.mp3',
  buzzer2: '/sounds/buzzer2.mp3',
  buzzer3: '/sounds/buzzer3.mp3',
  buzzer4: '/sounds/buzzer4.mp3',
};

/**
 * Play a buzzer sound by name
 * @param soundName Name of the sound to play
 */
export const playBuzzerSound = (soundName: string = 'default') => {
  const soundPath = soundFiles[soundName as keyof typeof soundFiles] || soundFiles.default;
  
  // Create and play audio
  const audio = new Audio(soundPath);
  
  // If the sound doesn't exist or fails to load, fall back to the default sound
  audio.onerror = () => {
    console.error(`Failed to load sound: ${soundPath}`);
    if (soundName !== 'default') {
      playBuzzerSound('default');
    }
  };
  
  // Play the sound
  audio.play().catch(error => {
    console.error('Error playing sound:', error);
  });
};

export default soundFiles; 