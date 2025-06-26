import { Handler, HandlerEvent, HandlerResponse } from '@netlify/functions';

// Node.js process global for environment variables
declare const process: {
  env: Record<string, string | undefined>;
};

// Request interface for OpenAI function
interface OpenAIRequest {
  topic?: string;
  batchSize: number;
  phraseIds: string[];
}

// CustomTerm interface matching the JSON schema
interface CustomTerm {
  id: string;
  topic?: string;
  phrase: string;
  difficulty?: "easy" | "medium" | "hard";
}

// Error response interface
interface ErrorResponse {
  error: string;
}

// OpenAI API response structure
interface OpenAIAPIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

// The PhraseMachine prompt template - Enhanced for party game quality
const PHRASE_MACHINE_PROMPT = `You are PhraseMachine, an expert generator of party game phrases for "Words on Phone" - a charades-style game where players act out, draw, or describe phrases for their team to guess.

# GAME CONTEXT
- Players have 60 seconds to get their team to guess as many phrases as possible
- Phrases must be ACTABLE (can be mimed/gestured), DRAWABLE (can be sketched), or DESCRIBABLE (can be explained without saying the words)
- Good phrases are instantly recognizable when acted out or described
- Players range from teens to adults at parties, family gatherings, game nights

# QUALITY CRITERIA
✅ GOOD EXAMPLES:
- "Pizza Delivery" (easy to act out - pretend to drive, carry box, ring doorbell)
- "Taylor Swift" (widely known, easy to describe/act)
- "Brushing Teeth" (clear physical action)
- "Harry Potter" (universally recognized, easy to describe)

❌ BAD EXAMPLES:
- "Quantum Physics" (too technical, hard to act)
- "Municipal Governance" (boring, not party-friendly)
- "Existential Dread" (abstract, not fun)
- "Obscure 1970s Band" (too niche)

# CONTENT RULES

1. **Party Game Suitability**: Every phrase must pass the test "Could a teenager easily act this out at a party?"

2. **Instant Recognition**: Must be recognizable to 80%+ of people - prioritize pop culture, common activities, famous people/places

3. **Actability**: Phrases should have clear physical actions, visual elements, or be easily describable

4. **Length**: 2-4 words maximum (shorter = better for gameplay)

5. **Family-Friendly**: No profanity, politics, or adult themes

6. **Category Match**: If a topic is specified, ensure each phrase clearly belongs to that category

7. **Avoid Technical Terms**: No academic, scientific, or overly specialized language

8. **Cultural Relevance**: Prioritize current, well-known references over obscure ones

# JSON SCHEMA

**Response Object:**
- \`phrases\`: CustomTerm[] - Array with 1–100 items per call.

**Interface CustomTerm:**
- \`id\`: string - echo back the client-supplied UUID unchanged.
- \`topic?\`: string - OPTIONAL; echo verbatim if a topic/theme/category name was provided in the request.
- \`phrase\`: string - 2–4 English words, Title-case where appropriate.
- \`difficulty?\`: "easy" | "medium" | "hard" - OPTIONAL; provide the model's best guess.

# OUTPUT FORMAT

Return a JSON object with a "phrases" array containing CustomTerm objects. No markdown fences, extra keys, or commentary.

Example successful response:
\`\`\`json
{
  "phrases": [
    {"id": "uuid1", "phrase": "Pizza Delivery", "topic": "Jobs", "difficulty": "easy"},
    {"id": "uuid2", "phrase": "Taylor Swift", "topic": "Music", "difficulty": "easy"}
  ]
}
\`\`\`

# FAILURE HANDLING

If unable to satisfy the constraints, respond with:
\`{ "error": "<short reason>" }\`

# QUALITY REMINDER
Every phrase must be perfect for a party game - instantly recognizable, easily actable, and fun to guess!`;

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

  // Check for API key in environment
  const apiKey = process.env.OpenAI_API_KEY; // Note: Capital O in OpenAI_API_KEY to match Netlify env var
  
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
    console.log('🔍 OpenAI function called:', {
      httpMethod: event.httpMethod,
      headers: event.headers,
      bodyLength: event.body?.length || 0,
      bodyPreview: event.body?.substring(0, 100) || 'empty'
    });

    const body = JSON.parse(event.body || '{}') as OpenAIRequest;
    const { topic, batchSize, phraseIds } = body;

    console.log('📊 Parsed request body:', {
      topic,
      batchSize,
      phraseIds: phraseIds?.length || 'undefined',
      bodyType: typeof body
    });

    // Validate request
    if (!batchSize || !phraseIds || phraseIds.length === 0) {
      console.log('❌ Validation failed: Missing required fields');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: batchSize and phraseIds' }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      };
    }

    // Validate batch size
    if (batchSize < 1 || batchSize > 100) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Batch size must be between 1 and 100' }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      };
    }

    // Validate phraseIds count matches batchSize
    if (phraseIds.length !== batchSize) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Number of phraseIds must match batchSize' }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      };
    }

    // Build the user message with specific instructions
    let userMessage = `Generate exactly ${batchSize} phrases.`;
    if (topic) {
      userMessage += ` Topic: "${topic}". All phrases must clearly relate to this topic.`;
    }
    userMessage += `\n\nUse these exact IDs in order:\n${phraseIds.map((id, i) => `${i + 1}. ${id}`).join('\n')}`;

    // Prepare OpenAI API request
    const openAIRequest = {
      model: 'gpt-4o', // Upgraded to full GPT-4o for better quality and larger batch handling
      messages: [
        {
          role: 'system',
          content: PHRASE_MACHINE_PROMPT
        },
        {
          role: 'user',
          content: userMessage
        }
      ],
      temperature: 0.8,
      max_tokens: 4000, // Increased for large batch requests (50+ phrases)
      response_format: { type: 'json_object' }
    };

    console.log('Making request to OpenAI API:', {
      model: 'gpt-4o',
      topic,
      batchSize,
      phraseIdCount: phraseIds.length
    });

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(openAIRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      
      if (response.status === 401) {
        return {
          statusCode: 401,
          body: JSON.stringify({ error: 'Invalid OpenAI API key' }),
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        };
      } else if (response.status === 429) {
        return {
          statusCode: 429,
          body: JSON.stringify({ error: 'OpenAI API rate limit exceeded. Please try again later.' }),
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        };
      } else {
        return {
          statusCode: 500,
          body: JSON.stringify({ 
            error: `OpenAI API error: ${response.status} ${response.statusText}`,
            details: errorText 
          }),
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        };
      }
    }

    const data: OpenAIAPIResponse = await response.json();
    
    // Extract the content from OpenAI response
    const content = data.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    console.log('OpenAI raw response content:', content);

    // Parse the JSON response
    let parsedResponse: { phrases: CustomTerm[] } | ErrorResponse;
    try {
      parsedResponse = JSON.parse(content);
      console.log('Parsed OpenAI response:', parsedResponse);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      throw new Error('Invalid JSON in OpenAI response');
    }

    // Check if it's an error response
    if ('error' in parsedResponse) {
      return {
        statusCode: 400,
        body: JSON.stringify(parsedResponse),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      };
    }

    // Validate the response has a phrases array
    if (!parsedResponse.phrases || !Array.isArray(parsedResponse.phrases)) {
      console.error('OpenAI response missing phrases array:', typeof parsedResponse, parsedResponse);
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'OpenAI response missing phrases array',
          debug: {
            type: typeof parsedResponse,
            content: content.substring(0, 200) + '...',
            parsed: parsedResponse
          }
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      };
    }

    // Return the phrases array
    return {
      statusCode: 200,
      body: JSON.stringify(parsedResponse.phrases),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    };

  } catch (error) {
    console.error('❌ OpenAI function error:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      eventBody: event.body,
      eventMethod: event.httpMethod
    });
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error',
        debug: {
          eventMethod: event.httpMethod,
          bodyLength: event.body?.length || 0
        }
      }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    };
  }
}; 