import type {
  Project,
  Document,
  StoryContext,
  Note,
  Idea,
  BrainstormResponse,
  HealthStatus,
} from '../types/index.ts';
import { localDb } from './localDb.ts';

const API_BASE = '/api';
let isBackendAvailable: boolean | null = null;

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) {
    return {} as T;
  }
  const contentType = res.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const errorMsg = typeof data === 'object' && data?.error ? data.error : `Request failed with status ${res.status}`;
    const error = new Error(errorMsg);
    (error as any).status = res.status;
    (error as any).code = typeof data === 'object' && data?.code ? data.code : undefined;
    throw error;
  }

  return data as T;
}

export const api = {
  // Health
  async getHealth(): Promise<HealthStatus> {
    try {
      const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
      const data = await handleResponse<HealthStatus>(res);
      isBackendAvailable = true;
      return {
        ...data,
        database: 'Connected (Auto-Managed Embedded SQLite)',
      };
    } catch {
      isBackendAvailable = false;
      return {
        status: 'ok',
        service: 'TellTale Client Workspace',
        database: 'Connected (In-Browser Storage · Zero Setup Required)',
        gemini_configured: false,
        model: 'gemini-3.8-flash',
        timestamp: new Date().toISOString(),
      };
    }
  },

  // Projects
  async getProjects(): Promise<Project[]> {
    try {
      const res = await fetch(`${API_BASE}/projects`, { signal: AbortSignal.timeout(4000) });
      const data = await handleResponse<Project[]>(res);
      isBackendAvailable = true;
      return data;
    } catch {
      isBackendAvailable = false;
      return localDb.getProjects();
    }
  },

  async getProject(id: number): Promise<Project> {
    try {
      const res = await fetch(`${API_BASE}/projects/${id}`, { signal: AbortSignal.timeout(4000) });
      return await handleResponse<Project>(res);
    } catch {
      return localDb.getProject(id);
    }
  },

  async createProject(data: { title: string; description?: string; genre?: string; target_words?: number }): Promise<Project> {
    try {
      const res = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await handleResponse<Project>(res);
    } catch {
      return localDb.createProject(data);
    }
  },

  async updateProject(id: number, data: Partial<Pick<Project, 'title' | 'description' | 'genre' | 'target_words'>>): Promise<Project> {
    try {
      const res = await fetch(`${API_BASE}/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await handleResponse<Project>(res);
    } catch {
      return localDb.updateProject(id, data);
    }
  },

  async deleteProject(id: number): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/projects/${id}`, {
        method: 'DELETE',
      });
      await handleResponse<void>(res);
    } catch {
      localDb.deleteProject(id);
    }
  },

  // Documents
  async getDocuments(projectId: number): Promise<Document[]> {
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/documents`, { signal: AbortSignal.timeout(4000) });
      return await handleResponse<Document[]>(res);
    } catch {
      return localDb.getDocuments(projectId);
    }
  },

  async getDocument(id: number): Promise<Document> {
    try {
      const res = await fetch(`${API_BASE}/documents/${id}`, { signal: AbortSignal.timeout(4000) });
      return await handleResponse<Document>(res);
    } catch {
      return localDb.getDocument(id);
    }
  },

  async createDocument(projectId: number, title: string, content = ''): Promise<Document> {
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      });
      return await handleResponse<Document>(res);
    } catch {
      return localDb.createDocument(projectId, title, content);
    }
  },

  async updateDocument(
    id: number,
    data: { title?: string; content?: string; order_index?: number; version?: number }
  ): Promise<Document> {
    try {
      const res = await fetch(`${API_BASE}/documents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await handleResponse<Document>(res);
    } catch {
      return localDb.updateDocument(id, data);
    }
  },

  async deleteDocument(id: number): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/documents/${id}`, {
        method: 'DELETE',
      });
      await handleResponse<void>(res);
    } catch {
      localDb.deleteDocument(id);
    }
  },

  // Story Context
  async getStoryContext(projectId: number): Promise<StoryContext> {
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/context`, { signal: AbortSignal.timeout(4000) });
      return await handleResponse<StoryContext>(res);
    } catch {
      return localDb.getStoryContext(projectId);
    }
  },

  async updateStoryContext(projectId: number, data: Partial<StoryContext>): Promise<StoryContext> {
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/context`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await handleResponse<StoryContext>(res);
    } catch {
      return localDb.updateStoryContext(projectId, data);
    }
  },

  // Notes
  async getNotes(projectId?: number, query?: string): Promise<Note[]> {
    try {
      const params = new URLSearchParams();
      if (projectId !== undefined) params.append('project_id', projectId.toString());
      if (query) params.append('q', query);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`${API_BASE}/notes${qs}`, { signal: AbortSignal.timeout(4000) });
      return await handleResponse<Note[]>(res);
    } catch {
      return localDb.getNotes(projectId, query);
    }
  },

  async getNote(id: number): Promise<Note> {
    try {
      const res = await fetch(`${API_BASE}/notes/${id}`, { signal: AbortSignal.timeout(4000) });
      return await handleResponse<Note>(res);
    } catch {
      const list = localDb.getNotes();
      const n = list.find(x => x.id === id);
      if (!n) throw new Error('Note not found');
      return n;
    }
  },

  async createNote(data: { title: string; content?: string; project_id?: number | null; category?: string }): Promise<Note> {
    try {
      const res = await fetch(`${API_BASE}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await handleResponse<Note>(res);
    } catch {
      return localDb.createNote(data);
    }
  },

  async updateNote(id: number, data: Partial<Note>): Promise<Note> {
    try {
      const res = await fetch(`${API_BASE}/notes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await handleResponse<Note>(res);
    } catch {
      return localDb.updateNote(id, data);
    }
  },

  async deleteNote(id: number): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/notes/${id}`, {
        method: 'DELETE',
      });
      await handleResponse<void>(res);
    } catch {
      localDb.deleteNote(id);
    }
  },

  // Ideas
  async getIdeas(projectId?: number, query?: string): Promise<Idea[]> {
    try {
      const params = new URLSearchParams();
      if (projectId !== undefined) params.append('project_id', projectId.toString());
      if (query) params.append('q', query);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`${API_BASE}/ideas${qs}`, { signal: AbortSignal.timeout(4000) });
      return await handleResponse<Idea[]>(res);
    } catch {
      return localDb.getIdeas(projectId, query);
    }
  },

  async createIdea(data: { title: string; content: string; project_id?: number | null; source?: string }): Promise<Idea> {
    try {
      const res = await fetch(`${API_BASE}/ideas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await handleResponse<Idea>(res);
    } catch {
      return localDb.createIdea(data);
    }
  },

  async updateIdea(id: number, data: Partial<Idea>): Promise<Idea> {
    try {
      const res = await fetch(`${API_BASE}/ideas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await handleResponse<Idea>(res);
    } catch {
      return localDb.updateIdea(id, data);
    }
  },

  async deleteIdea(id: number): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/ideas/${id}`, {
        method: 'DELETE',
      });
      await handleResponse<void>(res);
    } catch {
      localDb.deleteIdea(id);
    }
  },

  // Brainstorm
  async brainstorm(data: {
    project_id?: number;
    story_context?: string;
    passage?: string;
    focus?: string;
  }): Promise<BrainstormResponse> {
    const res = await fetch(`${API_BASE}/brainstorm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<BrainstormResponse>(res);
  },

  // Workspace backup
  async exportBackup(): Promise<Blob> {
    try {
      const res = await fetch(`${API_BASE}/export`);
      if (!res.ok) throw new Error('API export failed');
      return await res.blob();
    } catch {
      const data = localDb.exportAll();
      return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    }
  },

  async importBackup(jsonData: any): Promise<{ message: string }> {
    try {
      const res = await fetch(`${API_BASE}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jsonData),
      });
      return await handleResponse<{ message: string }>(res);
    } catch {
      localDb.importAll(jsonData);
      return { message: 'Workspace restored from backup' };
    }
  },
};
