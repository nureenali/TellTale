from typing import Optional, List
from pydantic import BaseModel, Field

class ProjectCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = ""
    genre: Optional[str] = "Literary Fiction"
    target_words: Optional[int] = 50000

class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    genre: Optional[str] = None
    target_words: Optional[int] = None

class ProjectResponse(BaseModel):
    id: int
    title: str
    description: str
    genre: str
    target_words: int
    word_count: Optional[int] = 0
    document_count: Optional[int] = 0
    created_at: str
    updated_at: str

class DocumentCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: Optional[str] = ""

class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    order_index: Optional[int] = None
    version: Optional[int] = None

class DocumentResponse(BaseModel):
    id: int
    project_id: int
    title: str
    content: str
    order_index: int
    version: int
    word_count: Optional[int] = 0
    created_at: str
    updated_at: str

class StoryContextUpdate(BaseModel):
    synopsis: Optional[str] = ""
    characters: Optional[str] = ""
    tone: Optional[str] = ""
    active_question: Optional[str] = ""

class StoryContextResponse(BaseModel):
    project_id: int
    synopsis: str
    characters: str
    tone: str
    active_question: str
    updated_at: str

class NoteCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: Optional[str] = ""
    project_id: Optional[int] = None
    category: Optional[str] = "General"

class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    project_id: Optional[int] = None
    category: Optional[str] = None

class NoteResponse(BaseModel):
    id: int
    project_id: Optional[int] = None
    project_title: Optional[str] = None
    title: str
    content: str
    category: str
    created_at: str
    updated_at: str

class IdeaCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1)
    project_id: Optional[int] = None
    source: Optional[str] = "gemini"

class IdeaUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    project_id: Optional[int] = None

class IdeaResponse(BaseModel):
    id: int
    project_id: Optional[int] = None
    project_title: Optional[str] = None
    title: str
    content: str
    source: str
    created_at: str
    updated_at: str

class BrainstormSuggestion(BaseModel):
    title: str
    content: str
    rationale: Optional[str] = None

class BrainstormRequest(BaseModel):
    project_id: Optional[int] = None
    story_context: Optional[str] = ""
    passage: Optional[str] = ""
    focus: Optional[str] = "Compelling plot developments that raise stakes"

class BrainstormResponse(BaseModel):
    suggestions: List[BrainstormSuggestion]
    model: Optional[str] = "gemini-3.8-flash"
