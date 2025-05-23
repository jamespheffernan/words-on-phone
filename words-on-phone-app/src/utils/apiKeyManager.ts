// Utility functions for managing Gemini API key
export const setGeminiApiKey = (apiKey: string): void => {
  try {
    localStorage.setItem('gemini_api_key', JSON.stringify(apiKey));
    console.log('Gemini API key saved successfully');
  } catch (error) {
    console.error('Failed to save Gemini API key:', error);
  }
};

export const getGeminiApiKey = (): string | null => {
  try {
    const value = localStorage.getItem('gemini_api_key');
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

export const removeGeminiApiKey = (): void => {
  try {
    localStorage.removeItem('gemini_api_key');
    console.log('Gemini API key removed successfully');
  } catch (error) {
    console.error('Failed to remove Gemini API key:', error);
  }
};

// Immediately set the API key provided by the user
export const initializeGeminiApiKey = (): void => {
  const apiKey = 'AIzaSyB6cEczMSyF1vvmYK9QH6KN-g32n6C13pY';
  setGeminiApiKey(apiKey);
  console.log('Gemini API key initialized');
};

// Auto-initialize when module loads
initializeGeminiApiKey(); 