from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from typing import List, Optional
import sqlite3

from backend.app.config import FRONTEND_ORIGIN, GEMINI_MODEL, GEMINI_API_KEY
from backend.app.database import get_db_connection, init_db, count_words
from backend.app.schemas import (
    ProjectCreate, ProjectUpdate, ProjectResponse,
    DocumentCreate, DocumentUpdate, DocumentResponse,
    StoryContextUpdate, StoryContextResponse,
    NoteCreate, NoteUpdate, NoteResponse,
    IdeaCreate, IdeaUpdate, IdeaResponse,
    BrainstormRequest, BrainstormResponse
)
from backend.app.services.gemini_service import generate_suggestions

app = FastAPI(title="TellTale API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    init_db()

@app.get("/api/health")
def health_check():
    try:
        conn = get_db_connection()
        conn.execute("SELECT 1;").fetchone()
        conn.close()
        db_status = "connected"
    except Exception:
        db_status = "disconnected"

    return {
        "status": "ok",
        "service": "TellTale Python API",
        "database": db_status,
        "gemini_configured": bool(GEMINI_API_KEY and GEMINI_API_KEY != "MY_GEMINI_API_KEY"),
        "model": GEMINI_MODEL,
        "timestamp": datetime.utcnow().isoformat()
    }

# Projects
@app.get("/api/projects", response_model=List[ProjectResponse])
def list_projects():
    conn = get_db_connection()
    projects = conn.execute("SELECT * FROM projects ORDER BY updated_at DESC").fetchall()
    result = []
    for p in projects:
        docs = conn.execute("SELECT content FROM documents WHERE project_id = ?", (p["id"],)).fetchall()
        total_words = sum(count_words(d["content"]) for d in docs)
        result.append(ProjectResponse(
            id=p["id"],
            title=p["title"],
            description=p["description"],
            genre=p["genre"],
            target_words=p["target_words"],
            word_count=total_words,
            document_count=len(docs),
            created_at=p["created_at"],
            updated_at=p["updated_at"]
        ))
    conn.close()
    return result

@app.post("/api/projects", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(data: ProjectCreate):
    conn = get_db_connection()
    now = datetime.utcnow().isoformat()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO projects (title, description, genre, target_words, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        (data.title, data.description or "", data.genre or "Literary Fiction", data.target_words or 50000, now, now)
    )
    proj_id = cur.lastrowid
    cur.execute(
        "INSERT INTO documents (project_id, title, content, order_index, version, created_at, updated_at) VALUES (?, 'Chapter 1', '', 0, 1, ?, ?)",
        (proj_id, now, now)
    )
    cur.execute(
        "INSERT INTO story_contexts (project_id, synopsis, characters, tone, active_question, updated_at) VALUES (?, '', '', '', '', ?)",
        (proj_id, now)
    )
    conn.commit()
    conn.close()
    return ProjectResponse(
        id=proj_id,
        title=data.title,
        description=data.description or "",
        genre=data.genre or "Literary Fiction",
        target_words=data.target_words or 50000,
        word_count=0,
        document_count=1,
        created_at=now,
        updated_at=now
    )

@app.delete("/api/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: int):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM projects WHERE id = ?", (project_id,))
    conn.commit()
    deleted = cur.rowcount > 0
    conn.close()
    if not deleted:
        raise HTTPException(status_code=404, detail="Project not found")
    return None

# Brainstorm
@app.post("/api/brainstorm", response_model=BrainstormResponse)
def brainstorm(req: BrainstormRequest):
    try:
        return generate_suggestions(req)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
