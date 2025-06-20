// Environment configuration for the app
export const env = {
  // OpenAI API configuration - API key now handled by serverless function
  OPENAI_MODEL: import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini',
  OPENAI_API_URL: import.meta.env.DEV
    ? 'http://localhost:8888/.netlify/functions/openai'  // Development: Netlify Dev on port 8888
    : '/.netlify/functions/openai', // Production: same domain
  
  // Daily quotas for API usage
  DAILY_CATEGORY_QUOTA: parseInt(import.meta.env.VITE_DAILY_CATEGORY_QUOTA || '5', 10),
  PHRASES_PER_CATEGORY: parseInt(import.meta.env.VITE_PHRASES_PER_CATEGORY || '50', 10),
  
  // App configuration
  IS_DEVELOPMENT: import.meta.env.DEV,
  IS_PRODUCTION: import.meta.env.PROD,
  BASE_URL: import.meta.env.BASE_URL,
  MODE: import.meta.env.MODE,
  
  // Feature flags
  ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  ENABLE_BACKGROUND_FETCH: import.meta.env.VITE_ENABLE_BACKGROUND_FETCH !== 'false', // Default to true
  
  // Game configuration
  GAME_DURATION: parseInt(import.meta.env.VITE_GAME_DURATION || '60', 10), // seconds
  ROUND_COUNT: parseInt(import.meta.env.VITE_ROUND_COUNT || '3', 10),
  
  // Performance settings
  MAX_PHRASES_CACHE: parseInt(import.meta.env.VITE_MAX_PHRASES_CACHE || '1000', 10),
  PHRASE_CLEANUP_INTERVAL: parseInt(import.meta.env.VITE_PHRASE_CLEANUP_INTERVAL || '86400000', 10), // 24 hours in ms
} as const;

// Type for the environment object
export type Environment = typeof env;

// Validation function to ensure required environment variables are set
export function validateEnvironment(): void {
  const requiredVars: (keyof Environment)[] = [
    'OPENAI_API_URL',
  ];

  const missingVars = requiredVars.filter(varName => {
    const value = env[varName];
    return !value || value === '';
  });

  if (missingVars.length > 0) {
    console.warn(`Missing environment variables: ${missingVars.join(', ')}`);
    console.warn('Some features may not work properly.');
  }

  // Additional validation
  if (env.DAILY_CATEGORY_QUOTA <= 0) {
    console.warn('DAILY_CATEGORY_QUOTA should be greater than 0');
  }

  if (env.PHRASES_PER_CATEGORY <= 0) {
    console.warn('PHRASES_PER_CATEGORY should be greater than 0');
  }
}

// Helper to check if OpenAI API is available (always true for serverless function)
export const isOpenAIAvailable = () => {
  return true; // Serverless function handles API key validation
};

// Export individual config values for convenience
export const {
  OPENAI_MODEL,
  OPENAI_API_URL,
  DAILY_CATEGORY_QUOTA,
  PHRASES_PER_CATEGORY,
  IS_DEVELOPMENT,
  IS_PRODUCTION,
  ENABLE_ANALYTICS,
  ENABLE_BACKGROUND_FETCH,
  GAME_DURATION,
  ROUND_COUNT,
  MAX_PHRASES_CACHE,
  PHRASE_CLEANUP_INTERVAL,
} = env; 