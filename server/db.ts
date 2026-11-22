import fs from 'node:fs';
import path from 'node:path';
import type { Project, Document, StoryContext, Note, Idea } from './types.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const JSON_PATH = process.env.JSON_STORAGE_PATH
  ? path.resolve(process.cwd(), process.env.JSON_STORAGE_PATH)
  : path.join(DATA_DIR, 'telltale.json');

const LEGACY_SQLITE_PATH = process.env.DATABASE_PATH
  ? path.resolve(process.cwd(), process.env.DATABASE_PATH)
  : path.join(DATA_DIR, 'telltale.db');

export interface JsonStore {
  version: string;
  updated_at: string;
  projects: Project[];
  documents: Document[];
  story_contexts: StoryContext[];
  notes: Note[];
  ideas: Idea[];
}

if (!fs.existsSync(path.dirname(JSON_PATH))) {
  fs.mkdirSync(path.dirname(JSON_PATH), { recursive: true });
}

function countWords(text: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function buildSeedData(): JsonStore {
  const now = new Date().toISOString();
  const projectId = 1;

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

  return {
    version: '1.0',
    updated_at: now,
    projects: [
      {
        id: projectId,
        title: 'The Saltwater Clock',
        description:
          'A literary speculative novel set on a secluded North Atlantic island where tides dictate the passage of memory.',
        genre: 'Speculative Literary Fiction',
        target_words: 65000,
        created_at: now,
        updated_at: now,
      },
    ],
    documents: [
      {
        id: 1,
        project_id: projectId,
        title: 'Chapter 1: The Pendulum at Cape Vane',
        content: ch1Content,
        order_index: 0,
        version: 1,
        created_at: now,
        updated_at: now,
      },
      {
        id: 2,
        project_id: projectId,
        title: 'Chapter 2: Calder’s Slipway',
        content: ch2Content,
        order_index: 1,
        version: 1,
        created_at: now,
        updated_at: now,
      },
    ],
    story_contexts: [
      {
        project_id: projectId,
        synopsis:
          'Maren inherits her estranged grandfather’s tidal lighthouse on Cape Vane and discovers its astronomical clock is tied to periodic oceanic memory anomalies. When an unregistered vessel appears in the dead zone, she must decipher his ledgers before the winter solstice tide.',
        characters:
          'Maren: Clockmaker and cartographer, cautious, driven by unresolved grief.\nCalder: Island harbor elder, keeper of unwritten town taboos.\nElias: The missing grandfather whose ledgers contain unrecorded dates.',
        tone: 'Lyrical, quiet suspense, maritime atmosphere, philosophical.',
        active_question:
          'Why did the grandfather deliberately alter the lighthouse escapement 17 years ago, and who is signaling from the shoal?',
        updated_at: now,
      },
    ],
    notes: [
      {
        id: 1,
        project_id: projectId,
        title: 'Maritime Law & Island Customs',
        content:
          'Under the 1894 Archipelago Compact, derelict lighthouses revert to municipal timber salvage unless a direct descendant maintains continuous tidal log entries. Maren is on day 43 of her required 90-day vigil.',
        category: 'Worldbuilding',
        created_at: now,
        updated_at: now,
      },
      {
        id: 2,
        project_id: projectId,
        title: 'Clockwork Mechanism Notes',
        content:
          'Deadbeat escapement with Graham pallets. Uses mercurial compensation pendulum to counteract salt-air thermal expansion. Weight-driven with a 30-day drop.',
        category: 'Research',
        created_at: now,
        updated_at: now,
      },
      {
        id: 3,
        project_id: null,
        title: 'General Craft: Pacing in Atmospheric Fiction',
        content:
          'Ground internal monologue in tactile physical objects (brass grease, brine-soaked wool, clock ticking). Let sensory details reveal character motivation.',
        category: 'Craft Notes',
        created_at: now,
        updated_at: now,
      },
    ],
    ideas: [
      {
        id: 1,
        project_id: projectId,
        title: 'The Submerged Bell Tower',
        content:
          'The shoal on the grandfather’s chart is actually the summit of a submerged 17th-century parish church steeple that only surfaces during the extreme low spring tides of the solstice.',
        source: 'gemini',
        created_at: now,
        updated_at: now,
      },
      {
        id: 2,
        project_id: projectId,
        title: 'Calder’s True Allegiance',
        content:
          'Calder was the apprentice who helped build the clock in 1968, but made a pact with the town council to silence it when the sound began driving the livestock mad.',
        source: 'gemini',
        created_at: now,
        updated_at: now,
      },
    ],
  };
}

function tryMigrateFromLegacySqlite(): JsonStore | null {
  if (!fs.existsSync(LEGACY_SQLITE_PATH)) return null;
  try {
    // Dynamically load only if legacy .db exists during one-time migration
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sqlite = require('node:sqlite');
    const legacyDb = new sqlite.DatabaseSync(LEGACY_SQLITE_PATH);
    const projects = legacyDb.prepare('SELECT * FROM projects').all() as Project[];
    if (!projects || projects.length === 0) {
      legacyDb.close();
      return null;
    }
    const documents = legacyDb.prepare('SELECT * FROM documents').all() as Document[];
    const story_contexts = legacyDb.prepare('SELECT * FROM story_contexts').all() as StoryContext[];
    const notes = legacyDb.prepare('SELECT * FROM notes').all() as Note[];
    const ideas = legacyDb.prepare('SELECT * FROM ideas').all() as Idea[];
    legacyDb.close();

    return {
      version: '1.0',
      updated_at: new Date().toISOString(),
      projects: projects.map(p => ({ ...p })),
      documents: documents.map(d => ({ ...d })),
      story_contexts: story_contexts.map(c => ({ ...c })),
      notes: notes.map(n => ({ ...n })),
      ideas: ideas.map(i => ({ ...i })),
    };
  } catch {
    return null;
  }
}

function writeStore(data: JsonStore): void {
  data.updated_at = new Date().toISOString();
  const tmpPath = `${JSON_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmpPath, JSON_PATH);
}

let store: JsonStore;

function loadStore(): JsonStore {
  if (store) return store;

  if (fs.existsSync(JSON_PATH)) {
    const raw = fs.readFileSync(JSON_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<JsonStore>;
    store = {
      version: parsed.version || '1.0',
      updated_at: parsed.updated_at || new Date().toISOString(),
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
      documents: Array.isArray(parsed.documents) ? parsed.documents : [],
      story_contexts: Array.isArray(parsed.story_contexts) ? parsed.story_contexts : [],
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
      ideas: Array.isArray(parsed.ideas) ? parsed.ideas : [],
    };
    return store;
  }

  const migrated = tryMigrateFromLegacySqlite();
  store = migrated ?? buildSeedData();
  writeStore(store);
  return store;
}

export function initDatabase() {
  loadStore();
}

function nextId(items: { id: number }[]): number {
  return items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
}

export const dbService = {
  checkHealth(): { ok: boolean; storage: string; path: string } {
    try {
      const data = loadStore();
      return {
        ok: Array.isArray(data.projects),
        storage: 'json',
        path: JSON_PATH,
      };
    } catch {
      return {
        ok: false,
        storage: 'json',
        path: JSON_PATH,
      };
    }
  },

  // Projects
  getProjects(): Project[] {
    const data = loadStore();
    return [...data.projects]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .map(p => {
        const docs = data.documents.filter(d => d.project_id === p.id);
        const totalWords = docs.reduce((acc, d) => acc + countWords(d.content), 0);
        return {
          ...p,
          word_count: totalWords,
          document_count: docs.length,
        };
      });
  },

  getProjectById(id: number): Project | null {
    const data = loadStore();
    const project = data.projects.find(p => p.id === id);
    if (!project) return null;
    const docs = data.documents.filter(d => d.project_id === id);
    const totalWords = docs.reduce((acc, d) => acc + countWords(d.content), 0);
    return {
      ...project,
      word_count: totalWords,
      document_count: docs.length,
    };
  },

  createProject(title: string, description = '', genre = 'Literary Fiction', targetWords = 50000): Project {
    const data = loadStore();
    const now = new Date().toISOString();
    const projectId = nextId(data.projects);

    const newProject: Project = {
      id: projectId,
      title,
      description,
      genre,
      target_words: targetWords,
      created_at: now,
      updated_at: now,
    };

    const starterDoc: Document = {
      id: nextId(data.documents),
      project_id: projectId,
      title: 'Chapter 1',
      content: '',
      order_index: 0,
      version: 1,
      created_at: now,
      updated_at: now,
    };

    const emptyContext: StoryContext = {
      project_id: projectId,
      synopsis: '',
      characters: '',
      tone: '',
      active_question: '',
      updated_at: now,
    };

    data.projects.push(newProject);
    data.documents.push(starterDoc);
    data.story_contexts.push(emptyContext);
    writeStore(data);

    return this.getProjectById(projectId)!;
  },

  updateProject(id: number, updates: Partial<Pick<Project, 'title' | 'description' | 'genre' | 'target_words'>>): Project | null {
    const data = loadStore();
    const idx = data.projects.findIndex(p => p.id === id);
    if (idx === -1) return null;

    const existing = data.projects[idx];
    const now = new Date().toISOString();
    data.projects[idx] = {
      ...existing,
      title: updates.title ?? existing.title,
      description: updates.description ?? existing.description,
      genre: updates.genre ?? existing.genre,
      target_words: updates.target_words ?? existing.target_words,
      updated_at: now,
    };
    writeStore(data);
    return this.getProjectById(id);
  },

  deleteProject(id: number): boolean {
    const data = loadStore();
    const prevLen = data.projects.length;
    data.projects = data.projects.filter(p => p.id !== id);
    if (data.projects.length === prevLen) return false;

    // Cascade delete related records
    data.documents = data.documents.filter(d => d.project_id !== id);
    data.story_contexts = data.story_contexts.filter(c => c.project_id !== id);
    data.notes = data.notes.filter(n => n.project_id !== id);
    data.ideas = data.ideas.filter(i => i.project_id !== id);
    writeStore(data);
    return true;
  },

  // Documents
  getDocumentsByProject(projectId: number): Document[] {
    const data = loadStore();
    return data.documents
      .filter(d => d.project_id === projectId)
      .sort((a, b) => a.order_index - b.order_index || a.id - b.id)
      .map(d => ({
        ...d,
        word_count: countWords(d.content),
      }));
  },

  getDocumentById(id: number): Document | null {
    const data = loadStore();
    const doc = data.documents.find(d => d.id === id);
    if (!doc) return null;
    return {
      ...doc,
      word_count: countWords(doc.content),
    };
  },

  createDocument(projectId: number, title: string, content = ''): Document {
    const data = loadStore();
    const now = new Date().toISOString();
    const projectDocs = data.documents.filter(d => d.project_id === projectId);
    const maxOrder = projectDocs.length > 0 ? Math.max(...projectDocs.map(d => d.order_index)) : -1;

    const newDoc: Document = {
      id: nextId(data.documents),
      project_id: projectId,
      title,
      content,
      order_index: maxOrder + 1,
      version: 1,
      created_at: now,
      updated_at: now,
    };

    data.documents.push(newDoc);
    const project = data.projects.find(p => p.id === projectId);
    if (project) project.updated_at = now;
    writeStore(data);

    return this.getDocumentById(newDoc.id)!;
  },

  updateDocument(
    id: number,
    updates: Partial<Pick<Document, 'title' | 'content' | 'order_index'>>,
    expectedVersion?: number
  ): Document | null {
    const data = loadStore();
    const idx = data.documents.findIndex(d => d.id === id);
    if (idx === -1) return null;

    const existing = data.documents[idx];
    if (expectedVersion !== undefined && existing.version > expectedVersion) {
      throw new Error(`Conflict: Document version is ${existing.version}, expected ${expectedVersion}`);
    }

    const now = new Date().toISOString();
    data.documents[idx] = {
      ...existing,
      title: updates.title !== undefined ? updates.title : existing.title,
      content: updates.content !== undefined ? updates.content : existing.content,
      order_index: updates.order_index !== undefined ? updates.order_index : existing.order_index,
      version: existing.version + 1,
      updated_at: now,
    };

    const project = data.projects.find(p => p.id === existing.project_id);
    if (project) project.updated_at = now;
    writeStore(data);

    return this.getDocumentById(id);
  },

  deleteDocument(id: number): boolean {
    const data = loadStore();
    const existing = data.documents.find(d => d.id === id);
    if (!existing) return false;

    data.documents = data.documents.filter(d => d.id !== id);
    const project = data.projects.find(p => p.id === existing.project_id);
    if (project) project.updated_at = new Date().toISOString();
    writeStore(data);
    return true;
  },

  // Story Context
  getStoryContext(projectId: number): StoryContext {
    const data = loadStore();
    let ctx = data.story_contexts.find(c => c.project_id === projectId);
    if (!ctx) {
      ctx = {
        project_id: projectId,
        synopsis: '',
        characters: '',
        tone: '',
        active_question: '',
        updated_at: new Date().toISOString(),
      };
      data.story_contexts.push(ctx);
      writeStore(data);
    }
    return { ...ctx };
  },

  updateStoryContext(projectId: number, updates: Partial<Omit<StoryContext, 'project_id' | 'updated_at'>>): StoryContext {
    const data = loadStore();
    let idx = data.story_contexts.findIndex(c => c.project_id === projectId);
    const now = new Date().toISOString();

    if (idx === -1) {
      const created: StoryContext = {
        project_id: projectId,
        synopsis: updates.synopsis ?? '',
        characters: updates.characters ?? '',
        tone: updates.tone ?? '',
        active_question: updates.active_question ?? '',
        updated_at: now,
      };
      data.story_contexts.push(created);
      writeStore(data);
      return { ...created };
    }

    const existing = data.story_contexts[idx];
    data.story_contexts[idx] = {
      ...existing,
      synopsis: updates.synopsis !== undefined ? updates.synopsis : existing.synopsis,
      characters: updates.characters !== undefined ? updates.characters : existing.characters,
      tone: updates.tone !== undefined ? updates.tone : existing.tone,
      active_question: updates.active_question !== undefined ? updates.active_question : existing.active_question,
      updated_at: now,
    };
    writeStore(data);
    return { ...data.story_contexts[idx] };
  },

  // Notes
  getNotes(projectId?: number, search?: string): Note[] {
    const data = loadStore();
    let notes = data.notes.map(n => {
      const p = n.project_id ? data.projects.find(proj => proj.id === n.project_id) : undefined;
      return {
        ...n,
        project_title: p?.title,
      };
    });

    if (projectId !== undefined) {
      notes = notes.filter(n => n.project_id === projectId);
    }
    if (search && search.trim()) {
      const term = search.trim().toLowerCase();
      notes = notes.filter(
        n =>
          n.title.toLowerCase().includes(term) ||
          n.content.toLowerCase().includes(term) ||
          n.category.toLowerCase().includes(term)
      );
    }

    return notes.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  },

  getNoteById(id: number): Note | null {
    const data = loadStore();
    const note = data.notes.find(n => n.id === id);
    if (!note) return null;
    const p = note.project_id ? data.projects.find(proj => proj.id === note.project_id) : undefined;
    return {
      ...note,
      project_title: p?.title,
    };
  },

  createNote(title: string, content = '', projectId: number | null = null, category = 'General'): Note {
    const data = loadStore();
    const now = new Date().toISOString();
    const newNote: Note = {
      id: nextId(data.notes),
      project_id: projectId,
      title,
      content,
      category,
      created_at: now,
      updated_at: now,
    };
    data.notes.push(newNote);
    writeStore(data);
    return this.getNoteById(newNote.id)!;
  },

  updateNote(id: number, updates: Partial<Pick<Note, 'title' | 'content' | 'project_id' | 'category'>>): Note | null {
    const data = loadStore();
    const idx = data.notes.findIndex(n => n.id === id);
    if (idx === -1) return null;

    const existing = data.notes[idx];
    data.notes[idx] = {
      ...existing,
      title: updates.title !== undefined ? updates.title : existing.title,
      content: updates.content !== undefined ? updates.content : existing.content,
      project_id: updates.project_id !== undefined ? updates.project_id : existing.project_id,
      category: updates.category !== undefined ? updates.category : existing.category,
      updated_at: new Date().toISOString(),
    };
    writeStore(data);
    return this.getNoteById(id);
  },

  deleteNote(id: number): boolean {
    const data = loadStore();
    const prevLen = data.notes.length;
    data.notes = data.notes.filter(n => n.id !== id);
    if (data.notes.length === prevLen) return false;
    writeStore(data);
    return true;
  },

  // Ideas
  getIdeas(projectId?: number, search?: string): Idea[] {
    const data = loadStore();
    let ideas = data.ideas.map(i => {
      const p = i.project_id ? data.projects.find(proj => proj.id === i.project_id) : undefined;
      return {
        ...i,
        project_title: p?.title,
      };
    });

    if (projectId !== undefined) {
      ideas = ideas.filter(i => i.project_id === projectId);
    }
    if (search && search.trim()) {
      const term = search.trim().toLowerCase();
      ideas = ideas.filter(i => i.title.toLowerCase().includes(term) || i.content.toLowerCase().includes(term));
    }

    return ideas.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  getIdeaById(id: number): Idea | null {
    const data = loadStore();
    const idea = data.ideas.find(i => i.id === id);
    if (!idea) return null;
    const p = idea.project_id ? data.projects.find(proj => proj.id === idea.project_id) : undefined;
    return {
      ...idea,
      project_title: p?.title,
    };
  },

  createIdea(title: string, content: string, projectId: number | null = null, source = 'gemini'): Idea {
    const data = loadStore();
    const now = new Date().toISOString();
    const newIdea: Idea = {
      id: nextId(data.ideas),
      project_id: projectId,
      title,
      content,
      source,
      created_at: now,
      updated_at: now,
    };
    data.ideas.push(newIdea);
    writeStore(data);
    return this.getIdeaById(newIdea.id)!;
  },

  updateIdea(id: number, updates: Partial<Pick<Idea, 'title' | 'content' | 'project_id'>>): Idea | null {
    const data = loadStore();
    const idx = data.ideas.findIndex(i => i.id === id);
    if (idx === -1) return null;

    const existing = data.ideas[idx];
    data.ideas[idx] = {
      ...existing,
      title: updates.title !== undefined ? updates.title : existing.title,
      content: updates.content !== undefined ? updates.content : existing.content,
      project_id: updates.project_id !== undefined ? updates.project_id : existing.project_id,
      updated_at: new Date().toISOString(),
    };
    writeStore(data);
    return this.getIdeaById(id);
  },

  deleteIdea(id: number): boolean {
    const data = loadStore();
    const prevLen = data.ideas.length;
    data.ideas = data.ideas.filter(i => i.id !== id);
    if (data.ideas.length === prevLen) return false;
    writeStore(data);
    return true;
  },

  // Full Export and Import
  exportAll() {
    const data = loadStore();
    return {
      exported_at: new Date().toISOString(),
      version: data.version,
      projects: data.projects,
      documents: data.documents,
      story_contexts: data.story_contexts,
      notes: data.notes,
      ideas: data.ideas,
    };
  },

  importAll(rawData: any): boolean {
    if (!rawData || !Array.isArray(rawData.projects)) {
      throw new Error('Invalid backup file format.');
    }

    const nextStore: JsonStore = {
      version: '1.0',
      updated_at: new Date().toISOString(),
      projects: rawData.projects.map((p: any) => ({
        id: p.id,
        title: p.title,
        description: p.description || '',
        genre: p.genre || 'Literary Fiction',
        target_words: p.target_words || 50000,
        created_at: p.created_at,
        updated_at: p.updated_at,
      })),
      documents: Array.isArray(rawData.documents)
        ? rawData.documents.map((d: any) => ({
            id: d.id,
            project_id: d.project_id,
            title: d.title,
            content: d.content || '',
            order_index: d.order_index || 0,
            version: d.version || 1,
            created_at: d.created_at,
            updated_at: d.updated_at,
          }))
        : [],
      story_contexts: Array.isArray(rawData.story_contexts)
        ? rawData.story_contexts.map((c: any) => ({
            project_id: c.project_id,
            synopsis: c.synopsis || '',
            characters: c.characters || '',
            tone: c.tone || '',
            active_question: c.active_question || '',
            updated_at: c.updated_at,
          }))
        : [],
      notes: Array.isArray(rawData.notes)
        ? rawData.notes.map((n: any) => ({
            id: n.id,
            project_id: n.project_id ?? null,
            title: n.title,
            content: n.content || '',
            category: n.category || 'General',
            created_at: n.created_at,
            updated_at: n.updated_at,
          }))
        : [],
      ideas: Array.isArray(rawData.ideas)
        ? rawData.ideas.map((i: any) => ({
            id: i.id,
            project_id: i.project_id ?? null,
            title: i.title,
            content: i.content,
            source: i.source || 'gemini',
            created_at: i.created_at,
            updated_at: i.updated_at,
          }))
        : [],
    };

    store = nextStore;
    writeStore(store);
    return true;
  },
};

// Initialize JSON store on load
initDatabase();
