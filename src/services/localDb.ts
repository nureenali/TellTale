import type { Project, Document, StoryContext, Note, Idea } from '../types/index.ts';

const LOCAL_STORAGE_KEY = 'telltale_workspace_store_v1';

interface StoredData {
  projects: Project[];
  documents: Document[];
  story_contexts: Record<number, StoryContext>;
  notes: Note[];
  ideas: Idea[];
}

function countWords(text: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function getInitialData(): StoredData {
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
    projects: [
      {
        id: projectId,
        title: 'The Saltwater Clock',
        description: 'A literary speculative novel set on a secluded North Atlantic island where tides dictate the passage of memory.',
        genre: 'Speculative Literary Fiction',
        target_words: 65000,
        created_at: now,
        updated_at: now,
        word_count: countWords(ch1Content) + countWords(ch2Content),
        document_count: 2,
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
        word_count: countWords(ch1Content),
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
        word_count: countWords(ch2Content),
      },
    ],
    story_contexts: {
      [projectId]: {
        project_id: projectId,
        synopsis: 'Maren inherits her estranged grandfather’s tidal lighthouse on Cape Vane and discovers its astronomical clock is tied to periodic oceanic memory anomalies. When an unregistered vessel appears in the dead zone, she must decipher his ledgers before the winter solstice tide.',
        characters: 'Maren: Clockmaker and cartographer, cautious, driven by unresolved grief.\nCalder: Island harbor elder, keeper of unwritten town taboos.\nElias: The missing grandfather whose ledgers contain unrecorded dates.',
        tone: 'Lyrical, quiet suspense, maritime atmosphere, philosophical.',
        active_question: 'Why did the grandfather deliberately alter the lighthouse escapement 17 years ago, and who is signaling from the shoal?',
        updated_at: now,
      },
    },
    notes: [
      {
        id: 1,
        project_id: projectId,
        project_title: 'The Saltwater Clock',
        title: 'Maritime Law & Island Customs',
        content: 'Under the 1894 Archipelago Compact, derelict lighthouses revert to municipal timber salvage unless a direct descendant maintains continuous tidal log entries. Maren is on day 43 of her required 90-day vigil.',
        category: 'Worldbuilding',
        created_at: now,
        updated_at: now,
      },
      {
        id: 2,
        project_id: projectId,
        project_title: 'The Saltwater Clock',
        title: 'Clockwork Mechanism Notes',
        content: 'Deadbeat escapement with Graham pallets. Uses mercurial compensation pendulum to counteract salt-air thermal expansion. Weight-driven with a 30-day drop.',
        category: 'Research',
        created_at: now,
        updated_at: now,
      },
      {
        id: 3,
        project_id: null,
        title: 'General Craft: Pacing in Atmospheric Fiction',
        content: 'Ground internal monologue in tactile physical objects (brass grease, brine-soaked wool, clock ticking). Let sensory details reveal character motivation.',
        category: 'Craft Notes',
        created_at: now,
        updated_at: now,
      },
    ],
    ideas: [
      {
        id: 1,
        project_id: projectId,
        project_title: 'The Saltwater Clock',
        title: 'The Submerged Bell Tower',
        content: 'The shoal on the grandfather’s chart is actually the summit of a submerged 17th-century parish church steeple that only surfaces during the extreme low spring tides of the solstice.',
        source: 'gemini',
        created_at: now,
        updated_at: now,
      },
      {
        id: 2,
        project_id: projectId,
        project_title: 'The Saltwater Clock',
        title: 'Calder’s True Allegiance',
        content: 'Calder was the apprentice who helped build the clock in 1968, but made a pact with the town council to silence it when the sound began driving the livestock mad.',
        source: 'gemini',
        created_at: now,
        updated_at: now,
      },
    ],
  };
}

function loadData(): StoredData {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to read from localStorage:', e);
  }
  const initial = getInitialData();
  saveData(initial);
  return initial;
}

function saveData(data: StoredData): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to write to localStorage:', e);
  }
}

export const localDb = {
  getProjects(): Project[] {
    const data = loadData();
    return data.projects.map(p => {
      const pDocs = data.documents.filter(d => d.project_id === p.id);
      const totalWords = pDocs.reduce((acc, d) => acc + countWords(d.content), 0);
      return {
        ...p,
        word_count: totalWords,
        document_count: pDocs.length,
      };
    }).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  },

  getProject(id: number): Project {
    const data = loadData();
    const p = data.projects.find(x => x.id === id);
    if (!p) throw new Error('Project not found');
    const pDocs = data.documents.filter(d => d.project_id === id);
    const totalWords = pDocs.reduce((acc, d) => acc + countWords(d.content), 0);
    return {
      ...p,
      word_count: totalWords,
      document_count: pDocs.length,
    };
  },

  createProject(args: { title: string; description?: string; genre?: string; target_words?: number }): Project {
    const data = loadData();
    const now = new Date().toISOString();
    const newId = data.projects.length > 0 ? Math.max(...data.projects.map(p => p.id)) + 1 : 1;
    const newProject: Project = {
      id: newId,
      title: args.title,
      description: args.description || '',
      genre: args.genre || 'Literary Fiction',
      target_words: args.target_words || 50000,
      created_at: now,
      updated_at: now,
      word_count: 0,
      document_count: 1,
    };

    const docId = data.documents.length > 0 ? Math.max(...data.documents.map(d => d.id)) + 1 : 1;
    const starterDoc: Document = {
      id: docId,
      project_id: newId,
      title: 'Chapter 1',
      content: '',
      order_index: 0,
      version: 1,
      created_at: now,
      updated_at: now,
      word_count: 0,
    };

    data.projects.push(newProject);
    data.documents.push(starterDoc);
    data.story_contexts[newId] = {
      project_id: newId,
      synopsis: '',
      characters: '',
      tone: '',
      active_question: '',
      updated_at: now,
    };

    saveData(data);
    return newProject;
  },

  updateProject(id: number, args: Partial<Pick<Project, 'title' | 'description' | 'genre' | 'target_words'>>): Project {
    const data = loadData();
    const idx = data.projects.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Project not found');
    const now = new Date().toISOString();
    data.projects[idx] = {
      ...data.projects[idx],
      ...args,
      updated_at: now,
    };
    saveData(data);
    return this.getProject(id);
  },

  deleteProject(id: number): void {
    const data = loadData();
    data.projects = data.projects.filter(p => p.id !== id);
    data.documents = data.documents.filter(d => d.project_id !== id);
    data.notes = data.notes.filter(n => n.project_id !== id);
    data.ideas = data.ideas.filter(i => i.project_id !== id);
    delete data.story_contexts[id];
    saveData(data);
  },

  getDocuments(projectId: number): Document[] {
    const data = loadData();
    return data.documents
      .filter(d => d.project_id === projectId)
      .map(d => ({
        ...d,
        word_count: countWords(d.content),
      }))
      .sort((a, b) => a.order_index - b.order_index || a.id - b.id);
  },

  getDocument(id: number): Document {
    const data = loadData();
    const doc = data.documents.find(d => d.id === id);
    if (!doc) throw new Error('Document not found');
    return {
      ...doc,
      word_count: countWords(doc.content),
    };
  },

  createDocument(projectId: number, title: string, content = ''): Document {
    const data = loadData();
    const now = new Date().toISOString();
    const docId = data.documents.length > 0 ? Math.max(...data.documents.map(d => d.id)) + 1 : 1;
    const projectDocs = data.documents.filter(d => d.project_id === projectId);
    const maxOrder = projectDocs.length > 0 ? Math.max(...projectDocs.map(d => d.order_index)) : -1;

    const newDoc: Document = {
      id: docId,
      project_id: projectId,
      title: title.trim(),
      content,
      order_index: maxOrder + 1,
      version: 1,
      created_at: now,
      updated_at: now,
      word_count: countWords(content),
    };

    data.documents.push(newDoc);
    const projIdx = data.projects.findIndex(p => p.id === projectId);
    if (projIdx !== -1) {
      data.projects[projIdx].updated_at = now;
    }
    saveData(data);
    return newDoc;
  },

  updateDocument(id: number, args: { title?: string; content?: string; order_index?: number; version?: number }): Document {
    const data = loadData();
    const idx = data.documents.findIndex(d => d.id === id);
    if (idx === -1) throw new Error('Document not found');
    const existing = data.documents[idx];
    const now = new Date().toISOString();

    const updated: Document = {
      ...existing,
      title: args.title !== undefined ? args.title.trim() : existing.title,
      content: args.content !== undefined ? args.content : existing.content,
      order_index: args.order_index !== undefined ? args.order_index : existing.order_index,
      version: existing.version + 1,
      updated_at: now,
      word_count: countWords(args.content !== undefined ? args.content : existing.content),
    };

    data.documents[idx] = updated;
    const projIdx = data.projects.findIndex(p => p.id === existing.project_id);
    if (projIdx !== -1) {
      data.projects[projIdx].updated_at = now;
    }
    saveData(data);
    return updated;
  },

  deleteDocument(id: number): void {
    const data = loadData();
    const doc = data.documents.find(d => d.id === id);
    if (!doc) return;
    data.documents = data.documents.filter(d => d.id !== id);
    const projIdx = data.projects.findIndex(p => p.id === doc.project_id);
    if (projIdx !== -1) {
      data.projects[projIdx].updated_at = new Date().toISOString();
    }
    saveData(data);
  },

  getStoryContext(projectId: number): StoryContext {
    const data = loadData();
    if (data.story_contexts[projectId]) {
      return data.story_contexts[projectId];
    }
    const now = new Date().toISOString();
    const newCtx: StoryContext = {
      project_id: projectId,
      synopsis: '',
      characters: '',
      tone: '',
      active_question: '',
      updated_at: now,
    };
    data.story_contexts[projectId] = newCtx;
    saveData(data);
    return newCtx;
  },

  updateStoryContext(projectId: number, args: Partial<StoryContext>): StoryContext {
    const data = loadData();
    const existing = this.getStoryContext(projectId);
    const now = new Date().toISOString();
    const updated: StoryContext = {
      ...existing,
      ...args,
      updated_at: now,
    };
    data.story_contexts[projectId] = updated;
    saveData(data);
    return updated;
  },

  getNotes(projectId?: number, query?: string): Note[] {
    const data = loadData();
    let list = data.notes.map(n => {
      const p = n.project_id ? data.projects.find(x => x.id === n.project_id) : null;
      return {
        ...n,
        project_title: p?.title,
      };
    });

    if (projectId !== undefined) {
      list = list.filter(n => n.project_id === projectId);
    }
    if (query && query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.category.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  },

  createNote(args: { title: string; content?: string; project_id?: number | null; category?: string }): Note {
    const data = loadData();
    const now = new Date().toISOString();
    const id = data.notes.length > 0 ? Math.max(...data.notes.map(n => n.id)) + 1 : 1;
    const project = args.project_id ? data.projects.find(p => p.id === args.project_id) : null;

    const note: Note = {
      id,
      project_id: args.project_id ?? null,
      project_title: project?.title,
      title: args.title.trim(),
      content: args.content || '',
      category: args.category || 'General',
      created_at: now,
      updated_at: now,
    };
    data.notes.unshift(note);
    saveData(data);
    return note;
  },

  updateNote(id: number, args: Partial<Note>): Note {
    const data = loadData();
    const idx = data.notes.findIndex(n => n.id === id);
    if (idx === -1) throw new Error('Note not found');
    const now = new Date().toISOString();
    const updated: Note = {
      ...data.notes[idx],
      ...args,
      updated_at: now,
    };
    if (updated.project_id) {
      const p = data.projects.find(x => x.id === updated.project_id);
      updated.project_title = p?.title;
    } else {
      updated.project_title = undefined;
    }
    data.notes[idx] = updated;
    saveData(data);
    return updated;
  },

  deleteNote(id: number): void {
    const data = loadData();
    data.notes = data.notes.filter(n => n.id !== id);
    saveData(data);
  },

  getIdeas(projectId?: number, query?: string): Idea[] {
    const data = loadData();
    let list = data.ideas.map(i => {
      const p = i.project_id ? data.projects.find(x => x.id === i.project_id) : null;
      return {
        ...i,
        project_title: p?.title,
      };
    });

    if (projectId !== undefined) {
      list = list.filter(i => i.project_id === projectId);
    }
    if (query && query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(i =>
        i.title.toLowerCase().includes(q) ||
        i.content.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  createIdea(args: { title: string; content: string; project_id?: number | null; source?: string }): Idea {
    const data = loadData();
    const now = new Date().toISOString();
    const id = data.ideas.length > 0 ? Math.max(...data.ideas.map(i => i.id)) + 1 : 1;
    const project = args.project_id ? data.projects.find(p => p.id === args.project_id) : null;

    const idea: Idea = {
      id,
      project_id: args.project_id ?? null,
      project_title: project?.title,
      title: args.title.trim(),
      content: args.content.trim(),
      source: args.source || 'gemini',
      created_at: now,
      updated_at: now,
    };
    data.ideas.unshift(idea);
    saveData(data);
    return idea;
  },

  updateIdea(id: number, args: Partial<Idea>): Idea {
    const data = loadData();
    const idx = data.ideas.findIndex(i => i.id === id);
    if (idx === -1) throw new Error('Idea not found');
    const now = new Date().toISOString();
    const updated: Idea = {
      ...data.ideas[idx],
      ...args,
      updated_at: now,
    };
    if (updated.project_id) {
      const p = data.projects.find(x => x.id === updated.project_id);
      updated.project_title = p?.title;
    } else {
      updated.project_title = undefined;
    }
    data.ideas[idx] = updated;
    saveData(data);
    return updated;
  },

  deleteIdea(id: number): void {
    const data = loadData();
    data.ideas = data.ideas.filter(i => i.id !== id);
    saveData(data);
  },

  exportAll() {
    return loadData();
  },

  importAll(data: any): void {
    if (!data || !Array.isArray(data.projects)) {
      throw new Error('Invalid backup file');
    }
    saveData(data);
  },
};
