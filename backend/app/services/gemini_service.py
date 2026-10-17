import json
from google import genai
from google.genai import types
from backend.app.config import GEMINI_API_KEY, GEMINI_MODEL
from backend.app.schemas import BrainstormRequest, BrainstormResponse, BrainstormSuggestion

def generate_suggestions(req: BrainstormRequest) -> BrainstormResponse:
    if not GEMINI_API_KEY or GEMINI_API_KEY == "MY_GEMINI_API_KEY":
        raise ValueError("CONFIG_ERROR: GEMINI_API_KEY is not configured in the backend environment.")

    client = genai.Client(api_key=GEMINI_API_KEY)

    prompt = f"""You are TellTale, an elite literary fiction advisor. Propose exactly 3 distinct, compelling plot developments.

STORY CONTEXT:
{req.story_context or 'None provided.'}

CURRENT SCENE / PASSAGE:
{req.passage or 'None provided.'}

FOCUS / TENSION:
{req.focus}

Respond ONLY with valid JSON conforming to the schema."""

    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=BrainstormResponse,
            temperature=0.85
        )
    )

    if not response.text:
        raise RuntimeError("UPSTREAM_ERROR: Gemini returned an empty response.")

    data = json.loads(response.text)
    suggestions = [BrainstormSuggestion(**s) for s in data.get("suggestions", [])[:3]]
    return BrainstormResponse(suggestions=suggestions, model=GEMINI_MODEL)
