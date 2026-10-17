import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import type { Project, Document, StoryContext, Note, Idea } from './types.ts';

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = process.env.DATABASE_PATH 
  ? path.resolve(process.cwd(), process.env.DATABASE_PATH)
  : path.join(DB_DIR, 'telltale.db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

export const db = new DatabaseSync(DB_PATH);

// Enforce foreign keys
db.exec('PRAGMA foreign_keys = ON;');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      genre TEXT DEFAULT 'Literary Fiction',
      target_words INTEGER DEFAULT 50000,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT DEFAULT '',
      order_index INTEGER DEFAULT 0,
      version INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS story_contexts (
      project_id INTEGER PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
      synopsis TEXT DEFAULT '',
      characters TEXT DEFAULT '',
      tone TEXT DEFAULT '',
      active_question TEXT DEFAULT '',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT DEFAULT '',
      category TEXT DEFAULT 'General',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ideas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      source TEXT DEFAULT 'gemini',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
    CREATE INDEX IF NOT EXISTS idx_notes_project_id ON notes(project_id);
    CREATE INDEX IF NOT EXISTS idx_ideas_project_id ON ideas(project_id);
  `);

  // Seed sample data if projects table is empty
  const projectCount = (db.prepare('SELECT COUNT(*) as count FROM projects').get() as { count: number }).count;
  if (projectCount === 0) {
    seedInitialData();
  }
}

function countWords(text: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function seedInitialData() {
  const now = new Date().toISOString();
  
  // 1. Create first project
  const insertProject = db.prepare(`
    INSERT INTO projects (title, description, genre, target_words, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const projectRes = insertProject.run(
    'The Saltwater Clock',
    'A literary speculative novel set on a secluded North Atlantic island where tides dictate the passage of memory.',
    'Speculative Literary Fiction',
    65000,
    now,
    now
  );
  const projectId = Number(projectRes.lastInsertRowid);

  // 2. Documents
  const insertDoc = db.prepare(`
    INSERT INTO documents (project_id, title, content, order_index, version, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const ch1Content = `The lighthouse at Cape Vane had stood dark for seventeen years, but every equinox at dawn, the pendulum in its basement swung three inches wider.

Maren knelt by the brass escapement, grease staining the cuffs of her wool sweater. In the quiet damp beneath the granite floor, the Atlantic did not sound like waves; it sounded like breathing through clenched teeth. Her grandfather had left thirteen ledger volumes in the desk drawer upstairs, each page filled with tidal depth recordings and solitary numbers: 04:12, 11:47, 19:03.

"The sea does not measure minutes," he used to tell her, tapping the bronze face of the tide clock. "It measures what has been washed away and what is stubbornly left behind."

She stood up and wiped her palms on her apron. Outside, the gulls banked low against the slate-gray sky, their cries cut short by the rising wind. On the horizon, where nothing should have been anchored, a thin sliver of mast trembled between the breakers.`;

  const ch2Content = `By noon, the harbor at Low Water was thick with mist.

Old Calder was mending cod nets on the slipway, his fingers warped like dried kelp. When Maren approached, he did not look up, but the rhythm of his netting needle paused.

"You were down in the lantern room again," Calder said. It was not a question.
"The escapement is slipping, Calder. The brass teeth are wearing down against the counterweight."
"Let it wear," he muttered. "Some gears are better left stopped."

Maren held out the scrap of parchment she had found slipped beneath the grandfather clock's plinth: a diagram of an offshore shoal that did not appear on any admiralty chart of the archipelago. Marked at the center was a solitary phrase in her grandfather's tight hand: 'Where the seventh bell drowns.'`;

  insertDoc.run(projectId, 'Chapter 1: The Pendulum at Cape Vane', ch1Content, 0, 1, now, now);
  insertDoc.run(projectId, 'Chapter 2: Calder’s Slipway', ch2Content, 1, 1, now, now);

  // 3. Story Context
  const insertContext = db.prepare(`
    INSERT INTO story_contexts (project_id, synopsis, characters, tone, active_question, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertContext.run(
    projectId,
    'Maren inherits her estranged grandfather’s tidal lighthouse on Cape Vane and discovers its astronomical clock is tied to periodic oceanic memory anomalies. When an unregistered vessel appears in the dead zone, she must decipher his ledgers before the winter solstice tide.',
    'Maren: Clockmaker and cartographer, cautious, driven by unresolved grief.\nCalder: Island harbor elder, keeper of unwritten town taboos.\nElias: The missing grandfather whose ledgers contain unrecorded dates.',
    'Lyrical, quiet suspense, maritime atmosphere, philosophical.',
    'Why did the grandfather deliberately alter the lighthouse escapement 17 years ago, and who is signaling from the shoal?',
    now
  );

  // 4. Notes
  const insertNote = db.prepare(`
    INSERT INTO notes (project_id, title, content, category, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertNote.run(
    projectId,
    'Maritime Law & Island Customs',
    'Under the 1894 Archipelago Compact, derelict lighthouses revert to municipal timber salvage unless a direct descendant maintains continuous tidal log entries. Maren is on day 43 of her required 90-day vigil.',
    'Worldbuilding',
    now,
    now
  );
  insertNote.run(
    projectId,
    'Clockwork Mechanism Notes',
    'Deadbeat escapement with Graham pallets. Uses mercurial compensation pendulum to counteract salt-air thermal expansion. Weight-driven with a 30-day drop.',
    'Research',
    now,
    now
  );
  insertNote.run(
    null,
    'General Craft: Pacing in Atmospheric Fiction',
    'Ground internal monologue in tactile physical objects (brass grease, brine-soaked wool, clock ticking). Let sensory details reveal character motivation.',
    'Craft Notes',
    now,
    now
  );

  // 5. Ideas
  const insertIdea = db.prepare(`
    INSERT INTO ideas (project_id, title, content, source, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertIdea.run(
    projectId,
    'The Submerged Bell Tower',
    'The shoal on the grandfather’s chart is actually the summit of a submerged 17th-century parish church steeple that only surfaces during the extreme low spring tides of the solstice.',
    'gemini',
    now,
    now
  );
  insertIdea.run(
    projectId,
    'Calder’s True Allegiance',
    'Calder was the apprentice who helped build the clock in 1968, but made a pact with the town council to silence it when the sound began driving the livestock mad.',
    'gemini',
    now,
    now
  );
}

// Database helper functions
export const dbService = {
  // Projects
  getProjects(): Project[] {
    const projects = db.prepare('SELECT * FROM projects ORDER BY updated_at DESC').all() as unknown as Project[];
    return projects.map((p) => {
      const docs = db.prepare('SELECT content FROM documents WHERE project_id = ?').all(p.id) as { content: string }[];
      const totalWords = docs.reduce((acc, d) => acc + countWords(d.content), 0);
      return {
        ...p,
        word_count: totalWords,
        document_count: docs.length,
      };
    });
  },

  getProjectById(id: number): Project | null {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as unknown as Project | undefined;
    if (!project) return null;
    const docs = db.prepare('SELECT content FROM documents WHERE project_id = ?').all(id) as { content: string }[];
    const totalWords = docs.reduce((acc, d) => acc + countWords(d.content), 0);
    return {
      ...project,
      word_count: totalWords,
      document_count: docs.length,
    };
  },

  createProject(title: string, description = '', genre = 'Literary Fiction', targetWords = 50000): Project {
    const now = new Date().toISOString();
    const res = db.prepare(`
      INSERT INTO projects (title, description, genre, target_words, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(title, description, genre, targetWords, now, now);
    const projectId = Number(res.lastInsertRowid);

    // Create a starter document
    db.prepare(`
      INSERT INTO documents (project_id, title, content, order_index, version, created_at, updated_at)
      VALUES (?, ?, ?, 0, 1, ?, ?)
    `).run(projectId, 'Chapter 1', '', now, now);

    // Create empty story context
    db.prepare(`
      INSERT INTO story_contexts (project_id, synopsis, characters, tone, active_question, updated_at)
      VALUES (?, '', '', '', '', ?)
    `).run(projectId, now);

    return this.getProjectById(projectId)!;
  },

  updateProject(id: number, data: Partial<Pick<Project, 'title' | 'description' | 'genre' | 'target_words'>>): Project | null {
    const existing = this.getProjectById(id);
    if (!existing) return null;
    const now = new Date().toISOString();
    const title = data.title ?? existing.title;
    const description = data.description ?? existing.description;
    const genre = data.genre ?? existing.genre;
    const targetWords = data.target_words ?? existing.target_words;

    db.prepare(`
      UPDATE projects SET title = ?, description = ?, genre = ?, target_words = ?, updated_at = ?
      WHERE id = ?
    `).run(title, description, genre, targetWords, now, id);

    return this.getProjectById(id);
  },

  deleteProject(id: number): boolean {
    const res = db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    return res.changes > 0;
  },

  // Documents
  getDocumentsByProject(projectId: number): Document[] {
    const docs = db.prepare('SELECT * FROM documents WHERE project_id = ? ORDER BY order_index ASC, id ASC').all(projectId) as unknown as Document[];
    return docs.map(d => ({
      ...d,
      word_count: countWords(d.content)
    }));
  },

  getDocumentById(id: number): Document | null {
    const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as unknown as Document | undefined;
    if (!doc) return null;
    return {
      ...doc,
      word_count: countWords(doc.content)
    };
  },

  createDocument(projectId: number, title: string, content = ''): Document {
    const now = new Date().toISOString();
    const maxOrder = (db.prepare('SELECT MAX(order_index) as max_order FROM documents WHERE project_id = ?').get(projectId) as { max_order: number | null }).max_order ?? -1;
    const res = db.prepare(`
      INSERT INTO documents (project_id, title, content, order_index, version, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, ?, ?)
    `).run(projectId, title, content, maxOrder + 1, now, now);

    // Touch project updated_at
    db.prepare('UPDATE projects SET updated_at = ? WHERE id = ?').run(now, projectId);

    return this.getDocumentById(Number(res.lastInsertRowid))!;
  },

  updateDocument(id: number, data: Partial<Pick<Document, 'title' | 'content' | 'order_index'>>, expectedVersion?: number): Document | null {
    const existing = this.getDocumentById(id);
    if (!existing) return null;

    if (expectedVersion !== undefined && existing.version > expectedVersion) {
      // Version mismatch, conflict
      throw new Error(`Conflict: Document version is ${existing.version}, expected ${expectedVersion}`);
    }

    const now = new Date().toISOString();
    const title = data.title !== undefined ? data.title : existing.title;
    const content = data.content !== undefined ? data.content : existing.content;
    const orderIndex = data.order_index !== undefined ? data.order_index : existing.order_index;
    const nextVersion = existing.version + 1;

    db.prepare(`
      UPDATE documents 
      SET title = ?, content = ?, order_index = ?, version = ?, updated_at = ?
      WHERE id = ?
    `).run(title, content, orderIndex, nextVersion, now, id);

    // Touch project updated_at
    db.prepare('UPDATE projects SET updated_at = ? WHERE id = ?').run(now, existing.project_id);

    return this.getDocumentById(id);
  },

  deleteDocument(id: number): boolean {
    const existing = this.getDocumentById(id);
    if (!existing) return false;
    const res = db.prepare('DELETE FROM documents WHERE id = ?').run(id);
    if (res.changes > 0) {
      const now = new Date().toISOString();
      db.prepare('UPDATE projects SET updated_at = ? WHERE id = ?').run(now, existing.project_id);
      return true;
    }
    return false;
  },

  // Story Context
  getStoryContext(projectId: number): StoryContext {
    let ctx = db.prepare('SELECT * FROM story_contexts WHERE project_id = ?').get(projectId) as unknown as StoryContext | undefined;
    if (!ctx) {
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO story_contexts (project_id, synopsis, characters, tone, active_question, updated_at)
        VALUES (?, '', '', '', '', ?)
      `).run(projectId, now);
      ctx = db.prepare('SELECT * FROM story_contexts WHERE project_id = ?').get(projectId) as unknown as StoryContext;
    }
    return ctx;
  },

  updateStoryContext(projectId: number, data: Partial<Omit<StoryContext, 'project_id' | 'updated_at'>>): StoryContext {
    const existing = this.getStoryContext(projectId);
    const now = new Date().toISOString();
    const synopsis = data.synopsis !== undefined ? data.synopsis : existing.synopsis;
    const characters = data.characters !== undefined ? data.characters : existing.characters;
    const tone = data.tone !== undefined ? data.tone : existing.tone;
    const activeQuestion = data.active_question !== undefined ? data.active_question : existing.active_question;

    db.prepare(`
      UPDATE story_contexts 
      SET synopsis = ?, characters = ?, tone = ?, active_question = ?, updated_at = ?
      WHERE project_id = ?
    `).run(synopsis, characters, tone, activeQuestion, now, projectId);

    return this.getStoryContext(projectId);
  },

  // Notes
  getNotes(projectId?: number, search?: string): Note[] {
    let query = `
      SELECT n.*, p.title as project_title 
      FROM notes n 
      LEFT JOIN projects p ON n.project_id = p.id
    `;
    const params: any[] = [];
    const conditions: string[] = [];

    if (projectId !== undefined) {
      conditions.push('n.project_id = ?');
      params.push(projectId);
    }
    if (search && search.trim()) {
      conditions.push('(n.title LIKE ? OR n.content LIKE ? OR n.category LIKE ?)');
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    query += ' ORDER BY n.updated_at DESC';

    return db.prepare(query).all(...params) as unknown as Note[];
  },

  getNoteById(id: number): Note | null {
    const query = `
      SELECT n.*, p.title as project_title 
      FROM notes n 
      LEFT JOIN projects p ON n.project_id = p.id
      WHERE n.id = ?
    `;
    const note = db.prepare(query).get(id) as unknown as Note | undefined;
    return note || null;
  },

  createNote(title: string, content = '', projectId: number | null = null, category = 'General'): Note {
    const now = new Date().toISOString();
    const res = db.prepare(`
      INSERT INTO notes (project_id, title, content, category, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(projectId, title, content, category, now, now);
    return this.getNoteById(Number(res.lastInsertRowid))!;
  },

  updateNote(id: number, data: Partial<Pick<Note, 'title' | 'content' | 'project_id' | 'category'>>): Note | null {
    const existing = this.getNoteById(id);
    if (!existing) return null;
    const now = new Date().toISOString();
    const title = data.title !== undefined ? data.title : existing.title;
    const content = data.content !== undefined ? data.content : existing.content;
    const projectId = data.project_id !== undefined ? data.project_id : existing.project_id;
    const category = data.category !== undefined ? data.category : existing.category;

    db.prepare(`
      UPDATE notes 
      SET title = ?, content = ?, project_id = ?, category = ?, updated_at = ?
      WHERE id = ?
    `).run(title, content, projectId, category, now, id);

    return this.getNoteById(id);
  },

  deleteNote(id: number): boolean {
    const res = db.prepare('DELETE FROM notes WHERE id = ?').run(id);
    return res.changes > 0;
  },

  // Ideas
  getIdeas(projectId?: number, search?: string): Idea[] {
    let query = `
      SELECT i.*, p.title as project_title 
      FROM ideas i 
      LEFT JOIN projects p ON i.project_id = p.id
    `;
    const params: any[] = [];
    const conditions: string[] = [];

    if (projectId !== undefined) {
      conditions.push('i.project_id = ?');
      params.push(projectId);
    }
    if (search && search.trim()) {
      conditions.push('(i.title LIKE ? OR i.content LIKE ?)');
      const term = `%${search.trim()}%`;
      params.push(term, term);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    query += ' ORDER BY i.created_at DESC';

    return db.prepare(query).all(...params) as unknown as Idea[];
  },

  getIdeaById(id: number): Idea | null {
    const query = `
      SELECT i.*, p.title as project_title 
      FROM ideas i 
      LEFT JOIN projects p ON i.project_id = p.id
      WHERE i.id = ?
    `;
    const idea = db.prepare(query).get(id) as unknown as Idea | undefined;
    return idea || null;
  },

  createIdea(title: string, content: string, projectId: number | null = null, source = 'gemini'): Idea {
    const now = new Date().toISOString();
    const res = db.prepare(`
      INSERT INTO ideas (project_id, title, content, source, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(projectId, title, content, source, now, now);
    return this.getIdeaById(Number(res.lastInsertRowid))!;
  },

  updateIdea(id: number, data: Partial<Pick<Idea, 'title' | 'content' | 'project_id'>>): Idea | null {
    const existing = this.getIdeaById(id);
    if (!existing) return null;
    const now = new Date().toISOString();
    const title = data.title !== undefined ? data.title : existing.title;
    const content = data.content !== undefined ? data.content : existing.content;
    const projectId = data.project_id !== undefined ? data.project_id : existing.project_id;

    db.prepare(`
      UPDATE ideas 
      SET title = ?, content = ?, project_id = ?, updated_at = ?
      WHERE id = ?
    `).run(title, content, projectId, now, id);

    return this.getIdeaById(id);
  },

  deleteIdea(id: number): boolean {
    const res = db.prepare('DELETE FROM ideas WHERE id = ?').run(id);
    return res.changes > 0;
  },

  // Full Export and Import
  exportAll() {
    return {
      exported_at: new Date().toISOString(),
      version: '1.0',
      projects: db.prepare('SELECT * FROM projects').all(),
      documents: db.prepare('SELECT * FROM documents').all(),
      story_contexts: db.prepare('SELECT * FROM story_contexts').all(),
      notes: db.prepare('SELECT * FROM notes').all(),
      ideas: db.prepare('SELECT * FROM ideas').all(),
    };
  },

  importAll(data: any): boolean {
    if (!data || !data.projects || !Array.isArray(data.projects)) {
      throw new Error('Invalid backup file format.');
    }

    db.exec('BEGIN TRANSACTION;');
    try {
      db.exec(`
        DELETE FROM ideas;
        DELETE FROM notes;
        DELETE FROM documents;
        DELETE FROM story_contexts;
        DELETE FROM projects;
      `);

      for (const p of data.projects) {
        db.prepare(`
          INSERT INTO projects (id, title, description, genre, target_words, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(p.id, p.title, p.description || '', p.genre || 'Fiction', p.target_words || 50000, p.created_at, p.updated_at);
      }

      if (data.documents) {
        for (const d of data.documents) {
          db.prepare(`
            INSERT INTO documents (id, project_id, title, content, order_index, version, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(d.id, d.project_id, d.title, d.content || '', d.order_index || 0, d.version || 1, d.created_at, d.updated_at);
        }
      }

      if (data.story_contexts) {
        for (const c of data.story_contexts) {
          db.prepare(`
            INSERT INTO story_contexts (project_id, synopsis, characters, tone, active_question, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(c.project_id, c.synopsis || '', c.characters || '', c.tone || '', c.active_question || '', c.updated_at);
        }
      }

      if (data.notes) {
        for (const n of data.notes) {
          db.prepare(`
            INSERT INTO notes (id, project_id, title, content, category, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(n.id, n.project_id ?? null, n.title, n.content || '', n.category || 'General', n.created_at, n.updated_at);
        }
      }

      if (data.ideas) {
        for (const i of data.ideas) {
          db.prepare(`
            INSERT INTO ideas (id, project_id, title, content, source, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(i.id, i.project_id ?? null, i.title, i.content, i.source || 'gemini', i.created_at, i.updated_at);
        }
      }

      db.exec('COMMIT;');
      return true;
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  }
};

// Initialize schema on load
initDatabase();
