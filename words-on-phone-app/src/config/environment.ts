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

// AI Service type
export type AIService = 'openai' | 'gemini' | 'none';

// Cache for service detection to avoid repeated checks
let cachedActiveService: AIService | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Detect which AI service is currently active and working
export const detectActiveAIService = async (): Promise<AIService> => {
  // Return cached result if still valid
  const now = Date.now();
  if (cachedActiveService && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedActiveService;
  }

  // Test OpenAI first (preferred service)
  try {
    const openaiResponse = await fetch(env.OPENAI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: 'test',
        batchSize: 1,
        phraseIds: ['test-id']
      })
    });
    
    if (openaiResponse.ok) {
      const data = await openaiResponse.json();
      // Check if it's not an error response
      if (!data.error) {
        cachedActiveService = 'openai';
        cacheTimestamp = now;
        return 'openai';
      }
    }
  } catch (error) {
    console.debug('OpenAI service test failed:', error);
  }

  // Test Gemini as fallback
  try {
    const geminiResponse = await fetch(env.GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'test',
        category: 'test'
      })
    });
    
    if (geminiResponse.ok) {
      const data = await geminiResponse.json();
      // Check if it's not an error response
      if (!data.error) {
        cachedActiveService = 'gemini';
        cacheTimestamp = now;
        return 'gemini';
      }
    }
  } catch (error) {
    console.debug('Gemini service test failed:', error);
  }

  // Neither service is working
  cachedActiveService = 'none';
  cacheTimestamp = now;
  return 'none';
};

// Get display name for AI service
export const getAIServiceDisplayName = (service: AIService): string => {
  switch (service) {
    case 'openai':
      return 'OpenAI GPT-4o-mini';
    case 'gemini':
      return 'Google Gemini';
    case 'none':
      return 'No AI Service';
    default:
      return 'Unknown Service';
  }
};

// Get emoji for AI service
export const getAIServiceEmoji = (service: AIService): string => {
  switch (service) {
    case 'openai':
      return '🤖';
    case 'gemini':
      return '✨';
    case 'none':
      return '❌';
    default:
      return '❓';
  }
};

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