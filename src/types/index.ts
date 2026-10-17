export interface Project {
  id: number;
  title: string;
  description: string;
  genre: string;
  target_words: number;
  word_count?: number;
  document_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: number;
  project_id: number;
  title: string;
  content: string;
  order_index: number;
  version: number;
  word_count?: number;
  created_at: string;
  updated_at: string;
}

export interface StoryContext {
  project_id: number;
  synopsis: string;
  characters: string;
  tone: string;
  active_question: string;
  updated_at: string;
}

export interface Note {
  id: number;
  project_id: number | null;
  project_title?: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
  updated_at: string;
}

export interface Idea {
  id: number;
  project_id: number | null;
  project_title?: string;
  title: string;
  content: string;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface BrainstormSuggestion {
  title: string;
  content: string;
  rationale?: string;
}

export interface BrainstormResponse {
  suggestions: BrainstormSuggestion[];
  model?: string;
}

export interface HealthStatus {
  status: string;
  service: string;
  database: string;
  gemini_configured: boolean;
  model: string;
  timestamp: string;
}

export type SaveStatus = 'saved' | 'saving' | 'error' | 'idle';

export interface EditorSettings {
  fontFamily: 'serif' | 'sans';
  fontSize: 'sm' | 'base' | 'lg';
  lineHeight: 'normal' | 'relaxed' | 'loose';
  containerWidth: 'normal' | 'wide' | 'fluid';
  autosaveIntervalMs: number;
}
