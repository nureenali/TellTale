import { GoogleGenAI, Type } from '@google/genai';
import type { BrainstormRequest, BrainstormResponse, BrainstormSuggestion } from './types.ts';

const apiKey = process.env.GEMINI_API_KEY;
const modelName = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

let ai: GoogleGenAI | null = null;
if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
  ai = new GoogleGenAI({ apiKey });
}

export function isGeminiConfigured(): boolean {
  const currentKey = process.env.GEMINI_API_KEY;
  return Boolean(currentKey && currentKey !== 'MY_GEMINI_API_KEY');
}

export async function generateBrainstormSuggestions(
  request: BrainstormRequest
): Promise<BrainstormResponse> {
  const currentKey = process.env.GEMINI_API_KEY;
  if (!currentKey || currentKey === 'MY_GEMINI_API_KEY') {
    throw new Error('CONFIG_ERROR: GEMINI_API_KEY is not configured. Please set a valid Gemini API key in the environment or Secrets panel.');
  }

  // Refresh instance if key changed or newly provided
  if (!ai) {
    ai = new GoogleGenAI({ apiKey: currentKey });
  }

  const storyContext = (request.story_context || '').trim();
  const passage = (request.passage || '').trim();
  const focus = (request.focus || 'Compelling plot developments that raise narrative stakes').trim();

  if (!storyContext && !passage) {
    throw new Error('VALIDATION_ERROR: Please provide story context (synopsis, characters, tone) or a manuscript passage to brainstorm.');
  }

  if (storyContext.length > 10000) {
    throw new Error('VALIDATION_ERROR: Story context exceeds maximum length of 10,000 characters.');
  }

  if (passage.length > 20000) {
    throw new Error('VALIDATION_ERROR: Manuscript passage exceeds maximum length of 20,000 characters.');
  }

  const prompt = `You are an expert creative writing story consultant assisting a novelist.
Analyze the author's story context and manuscript passage, and propose exactly 3 distinct, compelling plot developments.

CRITICAL PRINCIPLES:
1. The author remains the creator. Do not overwrite or contradict established rules without dramatic justification.
2. Ground ideas in tactile physical consequences, character motivations, and thematic tension.
3. Offer 3 contrasting angles (e.g., one unexpected secret revealed, one immediate external complication, one profound character choice).

STORY CONTEXT:
${storyContext || 'No overall story context provided.'}

CURRENT PASSAGE / SCENE:
${passage || 'No specific passage provided.'}

BRAINSTORM FOCUS / DESIRED DIRECTION:
${focus}

Generate exactly 3 suggestions adhering strictly to the JSON schema.`;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction: 'You are TellTale, an elite literary fiction advisor. Always output strictly valid JSON conforming to the requested schema. Provide thoughtful, non-cliché story developments.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestions: {
              type: Type.ARRAY,
              description: 'Exactly 3 distinct creative plot development suggestions',
              items: {
                type: Type.OBJECT,
                properties: {
                  title: {
                    type: Type.STRING,
                    description: 'A concise, evocative title for the plot development (3-7 words)'
                  },
                  content: {
                    type: Type.STRING,
                    description: 'Detailed plot development description (2-4 rich narrative sentences)'
                  },
                  rationale: {
                    type: Type.STRING,
                    description: 'Brief explanation of how this ties to the established context or character dilemma'
                  }
                },
                required: ['title', 'content']
              }
            }
          },
          required: ['suggestions']
        },
        temperature: 0.85
      }
    });

    const rawText = response.text;
    if (!rawText) {
      throw new Error('UPSTREAM_ERROR: Gemini returned an empty response. Please retry.');
    }

    let parsed: any;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      throw new Error('PARSE_ERROR: Failed to parse Gemini response as JSON.');
    }

    if (!parsed || !Array.isArray(parsed.suggestions) || parsed.suggestions.length === 0) {
      throw new Error('VALIDATION_ERROR: Gemini did not produce valid suggestions list.');
    }

    const suggestions: BrainstormSuggestion[] = parsed.suggestions.slice(0, 3).map((s: any, idx: number) => ({
      title: typeof s.title === 'string' && s.title.trim() ? s.title.trim() : `Plot Exploration ${idx + 1}`,
      content: typeof s.content === 'string' ? s.content.trim() : '',
      rationale: typeof s.rationale === 'string' ? s.rationale.trim() : undefined,
    })).filter((s: BrainstormSuggestion) => s.content.length > 0);

    if (suggestions.length === 0) {
      throw new Error('VALIDATION_ERROR: Gemini suggestions contained empty content.');
    }

    return {
      suggestions,
      model: modelName
    };
  } catch (error: any) {
    if (error.message?.startsWith('CONFIG_ERROR:') || error.message?.startsWith('VALIDATION_ERROR:') || error.message?.startsWith('UPSTREAM_ERROR:')) {
      throw error;
    }
    // Upstream API error
    throw new Error(`UPSTREAM_ERROR: Gemini API call failed: ${error.message || 'Unknown error'}`);
  }
}
