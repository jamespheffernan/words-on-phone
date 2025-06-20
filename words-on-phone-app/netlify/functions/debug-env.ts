import { Handler, HandlerEvent, HandlerResponse } from '@netlify/functions';

// Node.js process global for environment variables
declare const process: {
  env: Record<string, string | undefined>;
};

export const handler: Handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  // Handle CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      body: '',
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    };
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  const allEnvKeys = Object.keys(process.env);
  const openaiKeys = allEnvKeys.filter(key => key.toLowerCase().includes('openai'));
  
  return {
    statusCode: 200,
    body: JSON.stringify({
      hasOpenAIKey: !!openaiKey,
      openAIKeyLength: openaiKey ? openaiKey.length : 0,
      openAIKeyPrefix: openaiKey ? openaiKey.substring(0, 10) + '...' : 'undefined',
      allOpenAIKeys: openaiKeys,
      totalEnvVars: allEnvKeys.length,
      nodeEnv: process.env.NODE_ENV,
      netlifyContext: process.env.CONTEXT,
      netlifyBuildId: process.env.BUILD_ID,
      timestamp: new Date().toISOString()
    }, null, 2),
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  };
}; 