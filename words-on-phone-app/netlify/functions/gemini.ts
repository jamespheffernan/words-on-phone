import { Handler, HandlerEvent, HandlerResponse } from '@netlify/functions';

// Node.js process global for environment variables
declare const process: {
  env: Record<string, string | undefined>;
};

interface GeminiRequest {
  prompt: string;
  category: string;
  phraseCount?: number;
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

export const handler: Handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  // Handle CORS preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      body: '',
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    };
  }

  // Only allow POST requests for actual API calls
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    };
  }

  // Check for API key in environment (without VITE_ prefix)
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'API key not configured' }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    };
  }

  try {
    const body = JSON.parse(event.body || '{}') as GeminiRequest;
    const { prompt, category } = body;

    if (!prompt || !category) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: prompt and category' }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      };
    }

    // Use the provided model or default
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const requestBody = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 500,
      },
    };

    console.log('Making request to Gemini API:', {
      url: `${apiUrl}?key=${apiKey.substring(0, 10)}...`,
      model,
      promptLength: prompt.length
    });

    const response = await fetch(`${apiUrl}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      
      if (response.status === 401) {
        return {
          statusCode: 401,
          body: JSON.stringify({ error: 'Invalid Gemini API key' }),
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        };
      } else if (response.status === 429) {
        return {
          statusCode: 429,
          body: JSON.stringify({ error: 'Gemini API rate limit exceeded. Please try again later.' }),
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        };
      } else {
        return {
          statusCode: 500,
          body: JSON.stringify({ 
            error: `Gemini API error: ${response.status} ${response.statusText}`,
            details: errorText 
          }),
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        };
      }
    }

    const data: GeminiResponse = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    };

  } catch (error) {
    console.error('Gemini function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    };
  }
}; 