import { Router, json } from 'express';
import { dbService, db } from './db.ts';
import { generateBrainstormSuggestions, isGeminiConfigured } from './gemini.ts';

export const apiRouter = Router();

apiRouter.use(json({ limit: '10mb' }));

// Health Check
apiRouter.get('/health', (req, res) => {
  try {
    const row = db.prepare('SELECT 1 as alive').get() as { alive: number } | undefined;
    const dbAlive = row?.alive === 1;
    res.json({
      status: 'ok',
      service: 'TellTale API',
      database: dbAlive ? 'connected' : 'unhealthy',
      gemini_configured: isGeminiConfigured(),
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      error: error.message || 'Database error'
    });
  }
});

// Projects
apiRouter.get('/projects', (req, res) => {
  try {
    const projects = dbService.getProjects();
    res.json(projects);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch projects' });
  }
});

apiRouter.post('/projects', (req, res) => {
  try {
    const { title, description, genre, target_words } = req.body;
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Project title is required' });
    }
    const targetWords = typeof target_words === 'number' && target_words > 0 ? target_words : 50000;
    const project = dbService.createProject(
      title.trim(),
      typeof description === 'string' ? description.trim() : '',
      typeof genre === 'string' && genre.trim() ? genre.trim() : 'Literary Fiction',
      targetWords
    );
    res.status(201).json(project);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create project' });
  }
});

apiRouter.get('/projects/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid project ID' });
    const project = dbService.getProjectById(id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get project' });
  }
});

apiRouter.patch('/projects/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid project ID' });
    const { title, description, genre, target_words } = req.body;
    const updated = dbService.updateProject(id, {
      title: typeof title === 'string' ? title.trim() : undefined,
      description: typeof description === 'string' ? description.trim() : undefined,
      genre: typeof genre === 'string' ? genre.trim() : undefined,
      target_words: typeof target_words === 'number' ? target_words : undefined,
    });
    if (!updated) return res.status(404).json({ error: 'Project not found' });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update project' });
  }
});

apiRouter.delete('/projects/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid project ID' });
    const deleted = dbService.deleteProject(id);
    if (!deleted) return res.status(404).json({ error: 'Project not found' });
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete project' });
  }
});

// Documents within a project
apiRouter.get('/projects/:id/documents', (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    if (isNaN(projectId)) return res.status(400).json({ error: 'Invalid project ID' });
    const docs = dbService.getDocumentsByProject(projectId);
    res.json(docs);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch documents' });
  }
});

apiRouter.post('/projects/:id/documents', (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    if (isNaN(projectId)) return res.status(400).json({ error: 'Invalid project ID' });
    const project = dbService.getProjectById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const { title, content } = req.body;
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Document title is required' });
    }
    const doc = dbService.createDocument(projectId, title.trim(), typeof content === 'string' ? content : '');
    res.status(201).json(doc);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create document' });
  }
});

// Document detail & Autosave
apiRouter.get('/documents/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid document ID' });
    const doc = dbService.getDocumentById(id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json(doc);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get document' });
  }
});

apiRouter.patch('/documents/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid document ID' });

    const { title, content, order_index, version } = req.body;
    const doc = dbService.updateDocument(
      id,
      {
        title: typeof title === 'string' ? title.trim() : undefined,
        content: typeof content === 'string' ? content : undefined,
        order_index: typeof order_index === 'number' ? order_index : undefined,
      },
      typeof version === 'number' ? version : undefined
    );
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json(doc);
  } catch (error: any) {
    if (error.message?.includes('Conflict:')) {
      return res.status(409).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Failed to update document' });
  }
});

apiRouter.delete('/documents/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid document ID' });
    const deleted = dbService.deleteDocument(id);
    if (!deleted) return res.status(404).json({ error: 'Document not found' });
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete document' });
  }
});

// Story Context
apiRouter.get('/projects/:id/context', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid project ID' });
    const project = dbService.getProjectById(id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const context = dbService.getStoryContext(id);
    res.json(context);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get story context' });
  }
});

apiRouter.put('/projects/:id/context', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid project ID' });
    const project = dbService.getProjectById(id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const { synopsis, characters, tone, active_question } = req.body;
    const context = dbService.updateStoryContext(id, {
      synopsis: typeof synopsis === 'string' ? synopsis : '',
      characters: typeof characters === 'string' ? characters : '',
      tone: typeof tone === 'string' ? tone : '',
      active_question: typeof active_question === 'string' ? active_question : '',
    });
    res.json(context);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update story context' });
  }
});

// Notes
apiRouter.get('/notes', (req, res) => {
  try {
    const projectId = req.query.project_id ? parseInt(req.query.project_id as string, 10) : undefined;
    const search = req.query.q as string | undefined;
    const notes = dbService.getNotes(projectId, search);
    res.json(notes);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get notes' });
  }
});

apiRouter.post('/notes', (req, res) => {
  try {
    const { title, content, project_id, category } = req.body;
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Note title is required' });
    }
    const note = dbService.createNote(
      title.trim(),
      typeof content === 'string' ? content : '',
      typeof project_id === 'number' ? project_id : null,
      typeof category === 'string' && category.trim() ? category.trim() : 'General'
    );
    res.status(201).json(note);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create note' });
  }
});

apiRouter.get('/notes/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid note ID' });
    const note = dbService.getNoteById(id);
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json(note);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get note' });
  }
});

apiRouter.patch('/notes/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid note ID' });
    const { title, content, project_id, category } = req.body;
    const updated = dbService.updateNote(id, {
      title: typeof title === 'string' ? title.trim() : undefined,
      content: typeof content === 'string' ? content : undefined,
      project_id: project_id === null || typeof project_id === 'number' ? project_id : undefined,
      category: typeof category === 'string' ? category.trim() : undefined,
    });
    if (!updated) return res.status(404).json({ error: 'Note not found' });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update note' });
  }
});

apiRouter.delete('/notes/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid note ID' });
    const deleted = dbService.deleteNote(id);
    if (!deleted) return res.status(404).json({ error: 'Note not found' });
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete note' });
  }
});

// Ideas
apiRouter.get('/ideas', (req, res) => {
  try {
    const projectId = req.query.project_id ? parseInt(req.query.project_id as string, 10) : undefined;
    const search = req.query.q as string | undefined;
    const ideas = dbService.getIdeas(projectId, search);
    res.json(ideas);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get ideas' });
  }
});

apiRouter.post('/ideas', (req, res) => {
  try {
    const { title, content, project_id, source } = req.body;
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Idea title is required' });
    }
    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Idea content is required' });
    }
    const idea = dbService.createIdea(
      title.trim(),
      content.trim(),
      typeof project_id === 'number' ? project_id : null,
      typeof source === 'string' && source.trim() ? source.trim() : 'gemini'
    );
    res.status(201).json(idea);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to save idea' });
  }
});

apiRouter.patch('/ideas/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid idea ID' });
    const { title, content, project_id } = req.body;
    const updated = dbService.updateIdea(id, {
      title: typeof title === 'string' ? title.trim() : undefined,
      content: typeof content === 'string' ? content.trim() : undefined,
      project_id: project_id === null || typeof project_id === 'number' ? project_id : undefined,
    });
    if (!updated) return res.status(404).json({ error: 'Idea not found' });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update idea' });
  }
});

apiRouter.delete('/ideas/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid idea ID' });
    const deleted = dbService.deleteIdea(id);
    if (!deleted) return res.status(404).json({ error: 'Idea not found' });
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete idea' });
  }
});

// AI Brainstorming with Gemini
apiRouter.post('/brainstorm', async (req, res) => {
  try {
    const { story_context, passage, focus, project_id } = req.body;
    
    // Optional: if story_context not provided, try to fetch from project_id
    let effectiveContext = typeof story_context === 'string' ? story_context : '';
    if (!effectiveContext && typeof project_id === 'number') {
      const ctx = dbService.getStoryContext(project_id);
      if (ctx) {
        effectiveContext = [
          ctx.synopsis ? `Synopsis: ${ctx.synopsis}` : '',
          ctx.characters ? `Characters: ${ctx.characters}` : '',
          ctx.tone ? `Tone: ${ctx.tone}` : '',
          ctx.active_question ? `Active Story Question: ${ctx.active_question}` : '',
        ].filter(Boolean).join('\n\n');
      }
    }

    const suggestions = await generateBrainstormSuggestions({
      story_context: effectiveContext,
      passage: typeof passage === 'string' ? passage : '',
      focus: typeof focus === 'string' ? focus : undefined,
    });

    res.json(suggestions);
  } catch (error: any) {
    const msg = error.message || 'Brainstorming failed';
    if (msg.startsWith('CONFIG_ERROR:')) {
      return res.status(400).json({ 
        error: msg.replace('CONFIG_ERROR:', '').trim(),
        code: 'CONFIG_ERROR'
      });
    }
    if (msg.startsWith('VALIDATION_ERROR:')) {
      return res.status(400).json({ 
        error: msg.replace('VALIDATION_ERROR:', '').trim(),
        code: 'VALIDATION_ERROR'
      });
    }
    if (msg.startsWith('UPSTREAM_ERROR:')) {
      return res.status(502).json({ 
        error: msg.replace('UPSTREAM_ERROR:', '').trim(),
        code: 'UPSTREAM_ERROR'
      });
    }
    res.status(500).json({ error: msg, code: 'INTERNAL_ERROR' });
  }
});

// Workspace Export & Import
apiRouter.get('/export', (req, res) => {
  try {
    const data = dbService.exportAll();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=telltale_backup_${Date.now()}.json`);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to export workspace' });
  }
});

apiRouter.post('/import', (req, res) => {
  try {
    const data = req.body;
    dbService.importAll(data);
    res.json({ message: 'Workspace successfully restored' });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to import backup data' });
  }
});
