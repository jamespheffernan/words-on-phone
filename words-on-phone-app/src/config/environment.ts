// Environment configuration for the app
export const env = {
  // Gemini API configuration - API key now handled by serverless function
  GEMINI_MODEL: import.meta.env.VITE_GEMINI_MODEL || 'gemini-1.5-flash',
  GEMINI_API_URL: import.meta.env.DEV 
    ? 'http://localhost:8888/.netlify/functions/gemini'  // Development: Netlify Dev on port 8888
    : '/.netlify/functions/gemini', // Production: same domain
  
  // OpenAI API configuration - API key handled by serverless function
  OPENAI_MODEL: 'gpt-4o-mini', // Cost-efficient model
  OPENAI_API_URL: import.meta.env.DEV
    ? 'http://localhost:8888/.netlify/functions/openai'  // Development: Netlify Dev on port 8888
    : '/.netlify/functions/openai', // Production: same domain
  
  // Development/production flags
  IS_DEVELOPMENT: import.meta.env.DEV,
  IS_PRODUCTION: import.meta.env.PROD,
  
  // API quotas and limits
  DAILY_PHRASE_QUOTA: 1000,
  DAILY_CATEGORY_QUOTA: 5,
  PHRASES_PER_REQUEST: 20,
  PHRASES_PER_CATEGORY: 50,
  
  // OpenAI specific limits
  OPENAI_MAX_BATCH_SIZE: 100,
  OPENAI_MIN_BATCH_SIZE: 20,
} as const;

// Validation function to check if required environment variables are set
export const validateEnvironment = () => {
  const errors: string[] = [];
  
  // No client-side validation needed for API key since it's handled server-side
  // The serverless function will handle API key validation
  
  if (errors.length > 0) {
    console.error('Environment validation failed:', errors);
    return false;
  }
  
  return true;
};

// Helper to check if Gemini API is available (always true for serverless function)
export const isGeminiAvailable = () => {
  return true; // Serverless function handles availability
};

// Helper to check if OpenAI API is available (always true for serverless function)
export const isOpenAIAvailable = () => {
  return true; // Serverless function handles availability
}; 