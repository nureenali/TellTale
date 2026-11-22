import { loadAppEnv, projectRoot } from './env.ts';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import type { BrainstormRequest, BrainstormResponse, BrainstormSuggestion } from './types.ts';

const DEFAULT_MODEL = 'gemini-4-hydrogen';

export function getGeminiModel(): string {
  const envModel = (process.env.GEMINI_MODEL || '').trim();
  // Guard against accidentally placing an API key or malformed string into GEMINI_MODEL
  if (/^(models\/)?gemini-[a-z0-9.-]+$/i.test(envModel)) {
    return envModel;
  }
  return DEFAULT_MODEL;
}

export function getGeminiApiKey(): string | undefined {
  // 1. Check existing environment variables
  let rawKey = (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.API_KEY ||
    ''
  ).trim();

  // 2. If missing or empty, dynamically reload environment files
  if (!rawKey) {
    loadAppEnv();
    rawKey = (
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.API_KEY ||
      ''
    ).trim();
  }

  // 3. Fail-safe: Direct file read of .env.local if still missing
  if (!rawKey) {
    const candidateFiles = [
      path.resolve(projectRoot, '.env.local'),
      path.resolve(process.cwd(), '.env.local'),
    ];
    for (const filePath of candidateFiles) {
      if (fs.existsSync(filePath)) {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const match = content.match(/^\s*GEMINI_API_KEY\s*=\s*["']?([^"'\r\n#]+)/m);
          if (match && match[1]) {
            rawKey = match[1].trim();
            process.env.GEMINI_API_KEY = rawKey;
            break;
          }
        } catch {}
      }
    }
  }

  // Strip enclosing quotes if present (e.g. from .env files like GEMINI_API_KEY="AIzaSy...")
  const cleanKey = rawKey.replace(/^["']|["']$/g, '').trim();

  const placeholderValues = new Set([
    '',
    'MY_GEMINI_API_KEY',
    'your_gemini_api_key_here',
    'YOUR_GEMINI_API_KEY',
    'your_api_key_here',
    'your-api-key-here',
    'PLACEHOLDER',
  ]);

  if (!cleanKey || placeholderValues.has(cleanKey)) {
    return undefined;
  }
  return cleanKey;
}

export function isGeminiConfigured(): boolean {
  return Boolean(getGeminiApiKey());
}

export async function generateBrainstormSuggestions(
  request: BrainstormRequest
): Promise<BrainstormResponse> {
  const currentKey = getGeminiApiKey();
  if (!currentKey) {
    throw new Error('CONFIG_ERROR: GEMINI_API_KEY is not configured. Please set a valid Gemini API key in your .env.local file.');
  }

  const ai = new GoogleGenAI({ apiKey: currentKey });

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

  const primaryModel = getGeminiModel();
  const fallbackModels = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];
  const modelsToTry = [primaryModel, ...fallbackModels.filter(m => m !== primaryModel)];

  let lastError: any = null;
  let usedModel = primaryModel;
  let rawText: string | undefined;

  for (const candidateModel of modelsToTry) {
    try {
      usedModel = candidateModel;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('TIMEOUT: Model request timed out')), 15000);
      });

      const response = await Promise.race([
        ai.models.generateContent({
          model: candidateModel,
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
        }),
        timeoutPromise,
      ]);

      rawText = response.text;
      if (rawText) break;
    } catch (err: any) {
      lastError = err;
      const errStr = String(err?.message || err || '');
      const shouldTryNext =
        errStr.includes('503') ||
        errStr.includes('404') ||
        errStr.includes('429') ||
        errStr.includes('RESOURCE_EXHAUSTED') ||
        errStr.includes('UNAVAILABLE') ||
        errStr.includes('high demand') ||
        errStr.includes('not found') ||
        errStr.includes('no longer') ||
        errStr.includes('TIMEOUT');
      if (!shouldTryNext) {
        throw new Error(`UPSTREAM_ERROR: Gemini API call failed: ${err?.message || 'Unknown error'}`);
      }
    }
  }

  try {
    if (!rawText) {
      if (lastError) {
        throw new Error(`UPSTREAM_ERROR: Gemini API call failed: ${lastError.message || 'Service temporarily unavailable'}`);
      }
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
      model: usedModel
    };
  } catch (error: any) {
    if (error.message?.startsWith('CONFIG_ERROR:') || error.message?.startsWith('VALIDATION_ERROR:') || error.message?.startsWith('UPSTREAM_ERROR:')) {
      throw error;
    }
    throw new Error(`UPSTREAM_ERROR: Gemini API call failed: ${error.message || 'Unknown error'}`);
  }
}
