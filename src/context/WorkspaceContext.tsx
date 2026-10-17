import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Project, Document, StoryContext, EditorSettings } from '../types/index.ts';
import { api } from '../services/api.ts';

interface WorkspaceContextType {
  projects: Project[];
  activeProjectId: number | null;
  activeProject: Project | null;
  documents: Document[];
  activeDocumentId: number | null;
  activeDocument: Document | null;
  storyContext: StoryContext | null;
  isLoadingProjects: boolean;
  isLoadingDocuments: boolean;
  editorSettings: EditorSettings;
  setActiveProjectId: (id: number | null) => void;
  setActiveDocumentId: (id: number | null) => void;
  refreshProjects: () => Promise<void>;
  refreshDocuments: (projectId?: number) => Promise<Document[]>;
  refreshStoryContext: (projectId?: number) => Promise<StoryContext | null>;
  updateEditorSettings: (settings: Partial<EditorSettings>) => void;
}

const DEFAULT_SETTINGS: EditorSettings = {
  fontFamily: 'serif',
  fontSize: 'base',
  lineHeight: 'relaxed',
  containerWidth: 'normal',
  autosaveIntervalMs: 500,
};

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectIdState] = useState<number | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeDocumentId, setActiveDocumentIdState] = useState<number | null>(null);
  const [storyContext, setStoryContext] = useState<StoryContext | null>(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState<boolean>(true);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState<boolean>(false);

  const [editorSettings, setEditorSettings] = useState<EditorSettings>(() => {
    try {
      const saved = localStorage.getItem('telltale_editor_settings');
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {
      // fallback
    }
    return DEFAULT_SETTINGS;
  });

  const updateEditorSettings = (settings: Partial<EditorSettings>) => {
    setEditorSettings(prev => {
      const next = { ...prev, ...settings };
      localStorage.setItem('telltale_editor_settings', JSON.stringify(next));
      return next;
    });
  };

  const refreshProjects = useCallback(async () => {
    try {
      setIsLoadingProjects(true);
      const list = await api.getProjects();
      setProjects(list);
      
      // If no active project or active project no longer exists, select first
      if (list.length > 0) {
        if (!activeProjectId || !list.some(p => p.id === activeProjectId)) {
          setActiveProjectIdState(list[0].id);
        }
      } else {
        setActiveProjectIdState(null);
        setDocuments([]);
        setActiveDocumentIdState(null);
        setStoryContext(null);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setIsLoadingProjects(false);
    }
  }, [activeProjectId]);

  const refreshDocuments = useCallback(async (projId?: number): Promise<Document[]> => {
    const targetId = projId ?? activeProjectId;
    if (!targetId) {
      setDocuments([]);
      return [];
    }
    try {
      setIsLoadingDocuments(true);
      const docs = await api.getDocuments(targetId);
      setDocuments(docs);
      if (docs.length > 0) {
        if (!activeDocumentId || !docs.some(d => d.id === activeDocumentId)) {
          setActiveDocumentIdState(docs[0].id);
        }
      } else {
        setActiveDocumentIdState(null);
      }
      return docs;
    } catch (err) {
      console.error('Failed to load documents:', err);
      return [];
    } finally {
      setIsLoadingDocuments(false);
    }
  }, [activeProjectId, activeDocumentId]);

  const refreshStoryContext = useCallback(async (projId?: number): Promise<StoryContext | null> => {
    const targetId = projId ?? activeProjectId;
    if (!targetId) {
      setStoryContext(null);
      return null;
    }
    try {
      const ctx = await api.getStoryContext(targetId);
      setStoryContext(ctx);
      return ctx;
    } catch (err) {
      console.error('Failed to load story context:', err);
      return null;
    }
  }, [activeProjectId]);

  // Initial load
  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  // When activeProjectId changes, fetch documents & story context
  useEffect(() => {
    if (activeProjectId) {
      refreshDocuments(activeProjectId);
      refreshStoryContext(activeProjectId);
    }
  }, [activeProjectId, refreshDocuments, refreshStoryContext]);

  const activeProject = projects.find(p => p.id === activeProjectId) || null;
  const activeDocument = documents.find(d => d.id === activeDocumentId) || null;

  const setActiveProjectId = (id: number | null) => {
    setActiveProjectIdState(id);
    setActiveDocumentIdState(null);
  };

  const setActiveDocumentId = (id: number | null) => {
    setActiveDocumentIdState(id);
  };

  return (
    <WorkspaceContext.Provider
      value={{
        projects,
        activeProjectId,
        activeProject,
        documents,
        activeDocumentId,
        activeDocument,
        storyContext,
        isLoadingProjects,
        isLoadingDocuments,
        editorSettings,
        setActiveProjectId,
        setActiveDocumentId,
        refreshProjects,
        refreshDocuments,
        refreshStoryContext,
        updateEditorSettings,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
}
