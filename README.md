# TellTale — Creative Writing & Story Workspace

TellTale is an AI-assisted creative writing and story-organization workspace designed specifically for fiction writers, novelists, and students working on creative prose.

It unites the distraction-free focus of a dedicated manuscript editor, the structured metadata organization of Notion, and the interconnected narrative lore approach of Obsidian.

---

## 1. Core Principles

1. **The Writer Remains the Author**: AI is a consultative thought partner, never an intrusive ghostwriter. Suggestions never overwrite manuscript text automatically.
2. **Deterministic Data Persistence**: All projects, documents, story contexts, notes, and saved ideas are stored in persistent SQLite storage.
3. **Contextual Story Grounding**: Creative brainstorming with Gemini draws directly from the author's established characters, synopsis, tone, and active scene passages.
4. **Calm Literary Interface**: Restrained typography using Lora (serif) and DM Sans (sans-serif), warm parchment surfaces, and high functional density without clutter or fake metrics.

---

## 2. Implemented Features

- **Project Management**:
  - Create, edit, and delete fiction projects with target word counts and genre classifications.
  - Safe deletion with explicit confirmation explaining cascade removal of all chapters, notes, and ideas.
  - Automatic aggregate word count and document counting.
- **Focused Writing Canvas**:
  - Multi-chapter organization within projects.
  - Reliable debounced autosave (500 ms) with version concurrency tracking and manual retry capability.
  - Real-time word count, character count, and estimated reading time.
  - Zen Focus Mode to collapse all sidebars for distraction-free prose generation.
  - Typography toolbar: Toggle between Literary Serif (Lora) and Clean UI (DM Sans), adjust font sizes (15px, 17px, 19px), and customize reading line-height.
- **Story Context Panel**:
  - Live editable fields for Premise/Synopsis, Characters & Motivations, Tone & Atmosphere, and Active Story Question.
  - Saved directly to the database and fed into Gemini prompts.
- **AI Brainstorming (Powered by Gemini 3.8 Flash)**:
  - Generates exactly 3 distinct, creative plot developments with structured rationale.
  - One-click "Save as Idea" button to store suggestions permanently in the project library.
  - "Turn into Scene" action to convert a brainstormed idea directly into a new chapter.
  - "Add to Notes" and "Copy to Clipboard" actions.
- **Story Notes & Research**:
  - Tagged categories: Worldbuilding, Character, Research, Plot Hook, Craft Notes, General.
  - Live full-text search across titles and note contents.
  - Project-specific or general desk notes.
- **Saved Ideas Repository**:
  - Library of all captured sparks and brainstormed suggestions.
  - Filter by project or keyword search.
- **Workspace Data Management**:
  - Complete workspace JSON backup export.
  - Restore / import workspace from JSON backup with database transaction safety.
  - Health check endpoint verifying SQLite connectivity and Gemini API configuration.

---

## 3. Technology Stack

- **Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide React, React Router 7.
- **Full-Stack Runtime**: Node.js 22 with native `node:sqlite` (`DatabaseSync`), Express middleware.
- **AI Integration**: `@google/genai` TypeScript SDK utilizing `gemini-3.8-flash` with structured JSON schema output.
- **Alternative Python Backend**: Python 3.10+, FastAPI, Pydantic, Uvicorn, and Pytest (located in `backend/`).

---

## 4. Local Development Setup

### System Requirements
- Node.js 20+ (Node 22 recommended)
- npm 9+
- Python 3.10+ (if running the Python FastAPI backend)

### Installation (Node.js Full-Stack)

1. Clone or open the repository.
2. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```
3. Copy environment configuration:
   ```bash
   cp .env.example .env
   ```
4. Set your `GEMINI_API_KEY` in `.env` (or through the AI Studio Secrets panel).
5. Start the development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

## 5. Windows & PowerShell Quick Start

```powershell
# In PowerShell:
Copy-Item .env.example .env
npm install --legacy-peer-deps
npm run dev
```

---

## 6. Running Tests

### Automated API & Persistence Test Suite (Node.js)
```bash
node tests/api_verification.js
```
Verifies:
- Service health & database connectivity
- Projects listing and creation
- Document creation and autosave version bumping
- Story note creation and category classification
- Plot idea saving and project association
- Cascade deletion verification
- Complete workspace backup export

### Production Build Verification
```bash
npm run build
npm run lint
```

---

## 7. REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service status, database connectivity, and Gemini configuration check |
| `GET` | `/api/projects` | List all projects with word counts and document totals |
| `POST` | `/api/projects` | Create a new project (`title`, `description`, `genre`, `target_words`) |
| `GET` | `/api/projects/:id` | Get single project details |
| `PATCH` | `/api/projects/:id` | Update project metadata |
| `DELETE` | `/api/projects/:id` | Delete project and cascade-delete documents, notes, and ideas |
| `GET` | `/api/projects/:id/documents` | List documents in a project |
| `POST` | `/api/projects/:id/documents` | Create document in a project |
| `GET` | `/api/documents/:id` | Get document manuscript content |
| `PATCH` | `/api/documents/:id` | Autosave document (`title`, `content`, `version`) |
| `DELETE` | `/api/documents/:id` | Delete document |
| `GET` | `/api/projects/:id/context` | Get story context (synopsis, characters, tone, active question) |
| `PUT` | `/api/projects/:id/context` | Update story context |
| `GET` | `/api/notes` | List notes (supports `?project_id=` and `?q=`) |
| `POST` | `/api/notes` | Create note (`title`, `content`, `category`, `project_id`) |
| `DELETE` | `/api/notes/:id` | Delete note |
| `GET` | `/api/ideas` | List saved ideas (supports `?project_id=` and `?q=`) |
| `POST` | `/api/ideas` | Save idea (`title`, `content`, `project_id`, `source`) |
| `DELETE` | `/api/ideas/:id` | Delete idea |
| `POST` | `/api/brainstorm` | Generate 3 Gemini plot development suggestions |
| `GET` | `/api/export` | Download full workspace database as JSON backup |
| `POST` | `/api/import` | Restore workspace from JSON backup |

---

## 8. Database Architecture

The SQLite database schema resides at `./data/telltale.db` (configured via `DATABASE_PATH`). Foreign keys are enforced via `PRAGMA foreign_keys = ON;`.

### Tables
- **`projects`**: Top-level fiction manuscripts with word count targets and timestamps.
- **`documents`**: Chapters and scenes referencing `projects(id)` with `ON DELETE CASCADE`. Tracks `version` for optimistic lock verification during autosaves.
- **`story_contexts`**: 1-to-1 narrative lore attached to `projects(id)`.
- **`notes`**: Story lore, research tidbits, and character profiles referencing `projects(id)` (nullable for general notes).
- **`ideas`**: Plot suggestions saved from Gemini brainstorm sessions or author notes.

---

## 9. Troubleshooting & Known Limitations

- **Gemini API Key Missing**: If `GEMINI_API_KEY` is not provided, the rest of TellTale (writing canvas, autosave, notes, projects, backup export) remains completely functional. The Brainstorm tab displays an actionable banner guiding you to configure your key.
- **Concurrent Single-Instance Design**: The MVP uses SQLite, which is ideal for single-user local development and container deployments with a persistent writable disk volume. If deploying for multi-user horizontal scaling across multiple instances, transition to PostgreSQL as outlined in the architecture specifications.
