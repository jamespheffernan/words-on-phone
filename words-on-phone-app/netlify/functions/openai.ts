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

// The PhraseMachine prompt template
const PHRASE_MACHINE_PROMPT = `Provide a batch of new phrases in a JSON payload following the specified schema without any markdown fences, extra keys, or commentary.

When generating phrases, adhere to the content rules and address failure scenarios as specified.

# JSON Schema

**Response Object:**
- \`phrases\`: CustomTerm[] - Array with 1–100 items per call.

**Interface CustomTerm:**
- \`id\`: string - echo back the client-supplied UUID unchanged.
- \`topic?\`: string - OPTIONAL; echo verbatim if a topic/theme/category name was provided in the request.
- \`phrase\`: string - 1–4 English words, Title-case where appropriate.
- \`difficulty?\`: "easy" | "medium" | "hard" - OPTIONAL; provide the model's best guess.

# Content Rules

1. **Match the Request**  
   - If a topic is specified (e.g. "'90s Movies", "German Foods"), ensure each phrase relates clearly to that topic.
   - If no topic is given, select any suitable and varied phrases.

2. **Family-Friendly**: No profanity, slurs, trademarked titles, or copyrighted lyrics.

3. **Describable**: Use common idioms or nouns that can be clued without taboo words.

4. **Unique**: Avoid duplicate phrases within the response or those mentioned in the prompt context.

5. **Length**: Ensure phrases are 1–4 words consisting of alphabetic characters only (apostrophes allowed in contractions).

6. **Language**: Use U.S. English spelling.

7. **Quantity**: Ensure the return of at least the requested number of terms.

# Failure Handling

If unable to satisfy the constraints for the requested batch size, respond with:

- \`{ "error": "<short reason>" }\`

No other content should appear in the response.

# Output Format

- The response should be a JSON object with a "phrases" array containing CustomTerm objects if successful.
- If a failure, only return the error JSON object with an "error" field.

Example successful response:
\`\`\`json
{
  "phrases": [
    {"id": "uuid1", "phrase": "Golden Retriever", "topic": "Animals", "difficulty": "easy"},
    {"id": "uuid2", "phrase": "Elephant Trunk", "topic": "Animals", "difficulty": "medium"}
  ]
}
\`\`\`

# Notes

- Ensure adherence to all content rules even if no specific topic is provided.
- Carefully consider phrase uniqueness and descriptiveness to align with the content rules.`;

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
    const body = JSON.parse(event.body || '{}') as OpenAIRequest;
    const { topic, batchSize, phraseIds } = body;

    // Validate request
    if (!batchSize || !phraseIds || phraseIds.length === 0) {
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
    console.error('OpenAI function error:', error);
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