import { Handler } from '@netlify/functions';

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

export const handler: Handler = async (event, context) => {
  // Only allow POST requests
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
    const { prompt, category, phraseCount = 20 } = body;

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
    const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const response = await fetch(`${apiUrl}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 500,
        },
      }),
    });

    if (!response.ok) {
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
          body: JSON.stringify({ error: `Gemini API error: ${response.status} ${response.statusText}` }),
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