// Environment configuration for the app
export const env = {
  // Gemini API configuration
  GEMINI_API_KEY: import.meta.env.VITE_GEMINI_API_KEY || '',
  GEMINI_MODEL: import.meta.env.VITE_GEMINI_MODEL || 'gemini-1.5-flash',
  GEMINI_API_URL: 'https://generativelanguage.googleapis.com/v1beta/models',
  
  // Development/production flags
  IS_DEVELOPMENT: import.meta.env.DEV,
  IS_PRODUCTION: import.meta.env.PROD,
  
  // API quotas and limits
  DAILY_PHRASE_QUOTA: 1000,
  DAILY_CATEGORY_QUOTA: 5,
  PHRASES_PER_REQUEST: 20,
  PHRASES_PER_CATEGORY: 50,
} as const;

// Validation function to check if required environment variables are set
export const validateEnvironment = () => {
  const errors: string[] = [];
  
  if (!env.GEMINI_API_KEY && env.IS_PRODUCTION) {
    errors.push('VITE_GEMINI_API_KEY is required in production');
  }
  
  if (errors.length > 0) {
    console.error('Environment validation failed:', errors);
    return false;
  }
  
  return true;
};

// Helper to check if Gemini API is available
export const isGeminiAvailable = () => {
  return !!env.GEMINI_API_KEY;
}; 