// Environment configuration for the app
export const env = {
  // Gemini API configuration - API key now handled by serverless function
  GEMINI_MODEL: import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash',
  GEMINI_API_URL: import.meta.env.DEV 
    ? 'http://localhost:8888/.netlify/functions/gemini'  // Development: Netlify Dev on port 8888
    : '/api/gemini', // Production: uses _redirects to route to /.netlify/functions/gemini
  
  // OpenAI API configuration - API key handled by serverless function
  OPENAI_MODEL: 'gpt-4o', // Full GPT-4o for better quality and larger batch handling
  OPENAI_API_URL: import.meta.env.DEV
    ? 'http://localhost:8888/.netlify/functions/openai'  // Development: Netlify Dev on port 8888
    : '/api/openai', // Production: uses _redirects to route to /.netlify/functions/openai
  
  // Development/production flags
  IS_DEVELOPMENT: import.meta.env.DEV,
  IS_PRODUCTION: import.meta.env.PROD,
  
  // API quotas and limits
  DAILY_PHRASE_QUOTA: 1000,
  DAILY_CATEGORY_QUOTA: 5,
  PHRASES_PER_REQUEST: 15,
  PHRASES_PER_CATEGORY: 15, // Reduced from 20 to avoid Netlify 10s timeout
  TOTAL_PHRASES_PER_CATEGORY: 45, // Target total phrases (3 parallel batches of 15)
  
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

// Function to clear detection cache (for debugging)
export const clearServiceDetectionCache = () => {
  cachedActiveService = null;
  cacheTimestamp = 0;
  console.log('Service detection cache cleared');
};

// Detect which AI service is currently active and working
export const detectActiveAIService = async (): Promise<AIService> => {
  // Return cached result if still valid
  const now = Date.now();
  if (cachedActiveService && (now - cacheTimestamp) < CACHE_DURATION) {
    console.log(`🔄 Using cached AI service: ${cachedActiveService}`);
    return cachedActiveService;
  }

  console.log('🔍 Testing AI services...');

  // Test OpenAI first (now PRIMARY service)
  try {
    console.log('🧪 Testing OpenAI service (PRIMARY)...');
    const openaiResponse = await fetch(env.OPENAI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: 'test',
        batchSize: 1,
        phraseIds: ['test-id']
      })
    });
    
    console.log(`📡 OpenAI response status: ${openaiResponse.status} (ok: ${openaiResponse.ok})`);
    
    if (openaiResponse.ok) {
      const data = await openaiResponse.json();
      console.log('📊 OpenAI response data type:', typeof data, Array.isArray(data) ? '(array)' : '(object)');
      console.log('📊 OpenAI response sample:', JSON.stringify(data).substring(0, 100));
      console.log('📊 OpenAI has error field:', 'error' in data);
      console.log('📊 OpenAI !data.error:', !data.error);
      
      // Check if it's not an error response
      if (!data.error) {
        console.log('✅ OpenAI service detected as working (PRIMARY)!');
        cachedActiveService = 'openai';
        cacheTimestamp = now;
        return 'openai';
      } else {
        console.log('❌ OpenAI returned error response');
      }
    } else {
      console.log('❌ OpenAI response not ok');
    }
  } catch (error) {
    console.log('❌ OpenAI service test failed:', error);
  }

  // Test Gemini as fallback (now SECONDARY service)
  try {
    console.log('🧪 Testing Gemini service (FALLBACK)...');
    const geminiResponse = await fetch(env.GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'test',
        category: 'test'
      })
    });
    
    console.log(`📡 Gemini response status: ${geminiResponse.status} (ok: ${geminiResponse.ok})`);
    
    if (geminiResponse.ok) {
      const data = await geminiResponse.json();
      console.log('📊 Gemini response data type:', typeof data);
      console.log('📊 Gemini response sample:', JSON.stringify(data).substring(0, 100));
      console.log('📊 Gemini has error field:', 'error' in data);
      console.log('📊 Gemini !data.error:', !data.error);
      
      // Check if it's not an error response
      if (!data.error) {
        console.log('✅ Gemini service detected as working (fallback)');
        cachedActiveService = 'gemini';
        cacheTimestamp = now;
        return 'gemini';
      } else {
        console.log('❌ Gemini returned error response');
      }
    } else {
      console.log('❌ Gemini response not ok');
    }
  } catch (error) {
    console.log('❌ Gemini service test failed:', error);
  }

  // Neither service is working
  console.log('❌ No AI services detected as working');
  cachedActiveService = 'none';
  cacheTimestamp = now;
  return 'none';
};

// Get display name for AI service
export const getAIServiceDisplayName = (service: AIService): string => {
  switch (service) {
    case 'openai':
      return 'OpenAI GPT-4o';
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