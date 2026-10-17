import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Sparkles,
  BookOpen,
  StickyNote,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Check,
  AlertCircle,
  Copy,
  RotateCcw,
  Clock,
  Type,
  Bookmark,
  Compass,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext.tsx';
import { api } from '../../services/api.ts';
import { Button } from '../../components/ui/Button.tsx';
import { Modal } from '../../components/ui/Modal.tsx';
import { useToast } from '../../components/ui/Toast.tsx';
import type { Document, BrainstormSuggestion, Note } from '../../types/index.ts';

type ContextTab = 'brainstorm' | 'context' | 'notes';

export function WorkspacePage() {
  const {
    activeProject,
    documents,
    activeDocument,
    activeDocumentId,
    setActiveDocumentId,
    refreshDocuments,
    storyContext,
    refreshStoryContext,
    editorSettings,
    updateEditorSettings,
  } = useWorkspace();

  const { success, error, info } = useToast();

  // Local document state for instant responsiveness and autosave
  const [docTitle, setDocTitle] = useState('');
  const [docContent, setDocContent] = useState('');
  const [docVersion, setDocVersion] = useState(1);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'idle'>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Layout states
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isDocsSidebarOpen, setIsDocsSidebarOpen] = useState(true);
  const [isContextSidebarOpen, setIsContextSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<ContextTab>('brainstorm');

  // Modals
  const [isNewDocModalOpen, setIsNewDocModalOpen] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [isCreatingDoc, setIsCreatingDoc] = useState(false);
  const [docToDelete, setDocToDelete] = useState<Document | null>(null);
  const [isDeletingDoc, setIsDeletingDoc] = useState(false);

  // Story Context form state
  const [synopsis, setSynopsis] = useState('');
  const [characters, setCharacters] = useState('');
  const [tone, setTone] = useState('');
  const [activeQuestion, setActiveQuestion] = useState('');
  const [isSavingContext, setIsSavingContext] = useState(false);

  // Gemini Brainstorming state
  const [brainstormFocus, setBrainstormFocus] = useState('An unexpected reveal or complication that raises stakes');
  const [suggestions, setSuggestions] = useState<BrainstormSuggestion[]>([]);
  const [isBrainstorming, setIsBrainstorming] = useState(false);
  const [brainstormError, setBrainstormError] = useState<string | null>(null);
  const [savedSuggestionTitles, setSavedSuggestionTitles] = useState<Set<string>>(new Set());

  // Project Notes in workspace
  const [projectNotes, setProjectNotes] = useState<Note[]>([]);
  const [isNewNoteInlineOpen, setIsNewNoteInlineOpen] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteCategory, setNewNoteCategory] = useState('Worldbuilding');
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Autosave timer ref
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeDocIdRef = useRef<number | null>(activeDocumentId);
  activeDocIdRef.current = activeDocumentId;

  // Sync active document into local editor state
  useEffect(() => {
    if (activeDocument) {
      setDocTitle(activeDocument.title);
      setDocContent(activeDocument.content || '');
      setDocVersion(activeDocument.version || 1);
      setSaveStatus('saved');
      setLastSavedAt(new Date(activeDocument.updated_at));
    } else {
      setDocTitle('');
      setDocContent('');
      setSaveStatus('idle');
    }
  }, [activeDocument]);

  // Sync story context
  useEffect(() => {
    if (storyContext) {
      setSynopsis(storyContext.synopsis || '');
      setCharacters(storyContext.characters || '');
      setTone(storyContext.tone || '');
      setActiveQuestion(storyContext.active_question || '');
    }
  }, [storyContext]);

  // Load project notes when activeProject changes
  const loadProjectNotes = useCallback(async () => {
    if (!activeProject) {
      setProjectNotes([]);
      return;
    }
    try {
      const list = await api.getNotes(activeProject.id);
      setProjectNotes(list);
    } catch (err) {
      console.error('Failed to load project notes:', err);
    }
  }, [activeProject]);

  useEffect(() => {
    loadProjectNotes();
  }, [loadProjectNotes]);

  // Autosave execution
  const performAutosave = useCallback(async (contentToSave: string, titleToSave: string) => {
    const docId = activeDocIdRef.current;
    if (!docId) return;

    try {
      setSaveStatus('saving');
      const updated = await api.updateDocument(docId, {
        title: titleToSave,
        content: contentToSave,
        version: docVersion,
      });
      setDocVersion(updated.version);
      setSaveStatus('saved');
      setLastSavedAt(new Date());
    } catch (err: any) {
      console.error('Autosave failed:', err);
      setSaveStatus('error');
    }
  }, [docVersion]);

  // Handle typing in editor with debounce
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextContent = e.target.value;
    setDocContent(nextContent);
    setSaveStatus('saving');

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      performAutosave(nextContent, docTitle);
    }, editorSettings.autosaveIntervalMs || 500);
  };

  // Handle title change
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextTitle = e.target.value;
    setDocTitle(nextTitle);
    setSaveStatus('saving');

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      performAutosave(docContent, nextTitle);
    }, 600);
  };

  // Manual save retry
  const handleManualRetry = () => {
    performAutosave(docContent, docTitle);
  };

  // Save story context
  const handleSaveStoryContext = async () => {
    if (!activeProject) return;
    try {
      setIsSavingContext(true);
      await api.updateStoryContext(activeProject.id, {
        synopsis,
        characters,
        tone,
        active_question: activeQuestion,
      });
      await refreshStoryContext(activeProject.id);
      success('Story context saved');
    } catch (err: any) {
      error(err.message || 'Failed to save story context');
    } finally {
      setIsSavingContext(false);
    }
  };

  // Brainstorm with Gemini
  const handleBrainstorm = async () => {
    if (!activeProject) return;
    try {
      setIsBrainstorming(true);
      setBrainstormError(null);

      // Context compilation
      const combinedContext = [
        synopsis ? `Synopsis: ${synopsis}` : '',
        characters ? `Characters: ${characters}` : '',
        tone ? `Tone: ${tone}` : '',
        activeQuestion ? `Active Plot Question: ${activeQuestion}` : '',
      ].filter(Boolean).join('\n\n');

      const response = await api.brainstorm({
        project_id: activeProject.id,
        story_context: combinedContext,
        passage: docContent.slice(0, 5000), // pass current passage
        focus: brainstormFocus,
      });

      setSuggestions(response.suggestions || []);
      setSavedSuggestionTitles(new Set());
      if (response.suggestions?.length === 0) {
        setBrainstormError('Gemini did not return any suggestions. Try adjusting your focus.');
      }
    } catch (err: any) {
      console.error('Brainstorm failed:', err);
      setBrainstormError(err.message || 'Gemini brainstorming failed. Check API configuration.');
    } finally {
      setIsBrainstorming(false);
    }
  };

  // Save suggestion as story idea
  const handleSaveSuggestionAsIdea = async (suggestion: BrainstormSuggestion) => {
    if (!activeProject) return;
    try {
      await api.createIdea({
        title: suggestion.title,
        content: suggestion.content + (suggestion.rationale ? `\n\n[Rationale: ${suggestion.rationale}]` : ''),
        project_id: activeProject.id,
        source: 'gemini',
      });
      setSavedSuggestionTitles(prev => new Set(prev).add(suggestion.title));
      success(`Saved "${suggestion.title}" to project ideas`);
    } catch (err: any) {
      error(err.message || 'Failed to save idea');
    }
  };

  // Add suggestion as note
  const handleAddSuggestionAsNote = async (suggestion: BrainstormSuggestion) => {
    if (!activeProject) return;
    try {
      await api.createNote({
        title: `Brainstorm: ${suggestion.title}`,
        content: suggestion.content + (suggestion.rationale ? `\n\nRationale:\n${suggestion.rationale}` : ''),
        project_id: activeProject.id,
        category: 'Plot Hook',
      });
      await loadProjectNotes();
      success(`Added "${suggestion.title}" to project notes`);
    } catch (err: any) {
      error(err.message || 'Failed to add note');
    }
  };

  // Copy text to clipboard
  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    info(`${label} copied to clipboard`);
  };

  // Document creation
  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !newDocTitle.trim()) return;
    try {
      setIsCreatingDoc(true);
      const doc = await api.createDocument(activeProject.id, newDocTitle.trim());
      await refreshDocuments(activeProject.id);
      setActiveDocumentId(doc.id);
      setIsNewDocModalOpen(false);
      setNewDocTitle('');
      success(`Created "${doc.title}"`);
    } catch (err: any) {
      error(err.message || 'Failed to create document');
    } finally {
      setIsCreatingDoc(false);
    }
  };

  // Document deletion
  const handleDeleteDocument = async () => {
    if (!docToDelete) return;
    try {
      setIsDeletingDoc(true);
      await api.deleteDocument(docToDelete.id);
      if (activeProject) {
        const remaining = await refreshDocuments(activeProject.id);
        if (remaining.length > 0) {
          setActiveDocumentId(remaining[0].id);
        } else {
          setActiveDocumentId(null);
        }
      }
      setDocToDelete(null);
      success(`Deleted "${docToDelete.title}"`);
    } catch (err: any) {
      error(err.message || 'Failed to delete document');
    } finally {
      setIsDeletingDoc(false);
    }
  };

  // Create inline note
  const handleCreateInlineNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !newNoteTitle.trim()) return;
    try {
      setIsSavingNote(true);
      await api.createNote({
        title: newNoteTitle.trim(),
        content: newNoteContent.trim(),
        project_id: activeProject.id,
        category: newNoteCategory,
      });
      await loadProjectNotes();
      setIsNewNoteInlineOpen(false);
      setNewNoteTitle('');
      setNewNoteContent('');
      success('Note created');
    } catch (err: any) {
      error(err.message || 'Failed to create note');
    } finally {
      setIsSavingNote(false);
    }
  };

  // Statistics calculation
  const wordCount = docContent.trim() ? docContent.trim().split(/\s+/).filter(Boolean).length : 0;
  const charCount = docContent.length;
  const readingTimeMin = Math.max(1, Math.ceil(wordCount / 220));

  // Typography styles
  const fontStyleClass = editorSettings.fontFamily === 'serif' ? 'font-serif-literary' : 'font-sans-ui';
  const fontSizeClass = {
    sm: 'text-sm leading-relaxed',
    base: 'text-base leading-[1.75]',
    lg: 'text-lg leading-[1.85]',
  }[editorSettings.fontSize || 'base'];

  if (!activeProject) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <div className="max-w-md space-y-3 bg-[#FFFFFF] dark:bg-[#1E201B] border border-[#E2E0D8] dark:border-[#34382F] rounded-xl p-8">
          <BookOpen className="w-8 h-8 text-[#A68A5B] mx-auto" />
          <h2 className="text-lg font-serif-literary font-medium text-[#252722] dark:text-[#ECEAE4]">
            No Active Writing Project
          </h2>
          <p className="text-xs text-[#696D65] dark:text-[#9FA49A]">
            Select or create a project from the sidebar to open the writing desk and AI brainstorm canvas.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex h-full overflow-hidden relative">
      {/* 1. Documents Shelf (Collapsible Left) */}
      {!isFocusMode && isDocsSidebarOpen && (
        <aside className="w-56 shrink-0 border-r border-[#E2E0D8] dark:border-[#34382F] bg-[#FFFFFF] dark:bg-[#1E201B] flex flex-col h-full">
          {/* Header */}
          <div className="p-3 border-b border-[#E2E0D8] dark:border-[#34382F] flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#696D65] dark:text-[#9FA49A]">
              Manuscript
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={() => setIsNewDocModalOpen(true)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add
            </Button>
          </div>

          {/* Documents list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {documents.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#696D65] dark:text-[#9FA49A]">
                No documents in project. Click Add to create Chapter 1.
              </div>
            ) : (
              documents.map((doc, idx) => {
                const isActive = doc.id === activeDocumentId;
                return (
                  <div
                    key={doc.id}
                    onClick={() => setActiveDocumentId(doc.id)}
                    className={`group flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#33483A] text-white dark:bg-[#4D6B57]'
                        : 'text-[#252722] dark:text-[#ECEAE4] hover:bg-[#F0EEE7] dark:hover:bg-[#262923]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-[#696D65] dark:text-[#9FA49A]'}`} />
                      <span className="truncate font-medium">{doc.title}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[10px] font-mono tabular-nums ${isActive ? 'text-white/80' : 'text-[#696D65] dark:text-[#9FA49A]'}`}>
                        {doc.word_count || 0}
                      </span>
                      {documents.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDocToDelete(doc);
                          }}
                          className={`opacity-0 group-hover:opacity-100 p-0.5 rounded transition-opacity ${
                            isActive ? 'text-white/80 hover:text-white' : 'text-[#696D65] hover:text-[#B42318]'
                          }`}
                          title="Delete chapter"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Toggle sidebar button */}
          <div className="p-2 border-t border-[#E2E0D8] dark:border-[#34382F] flex justify-end">
            <button
              onClick={() => setIsDocsSidebarOpen(false)}
              className="p-1 text-[#696D65] hover:text-[#252722] dark:text-[#9FA49A] dark:hover:text-[#ECEAE4] rounded cursor-pointer"
              title="Collapse document tree"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </aside>
      )}

      {/* 2. Main Writing Canvas (Center) */}
      <section className="flex-1 flex flex-col h-full overflow-hidden bg-[#F7F5EF] dark:bg-[#141613]">
        {/* Editor Toolbar */}
        <header className="h-12 border-b border-[#E2E0D8] dark:border-[#34382F] bg-[#FFFFFF] dark:bg-[#1E201B] px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {/* Sidebar unfold toggles */}
            {!isFocusMode && !isDocsSidebarOpen && (
              <button
                onClick={() => setIsDocsSidebarOpen(true)}
                className="p-1.5 text-[#696D65] hover:text-[#252722] dark:text-[#9FA49A] hover:bg-[#F0EEE7] dark:hover:bg-[#262923] rounded cursor-pointer"
                title="Expand documents list"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {/* Document title input */}
            <input
              type="text"
              value={docTitle}
              onChange={handleTitleChange}
              placeholder="Untitled Document..."
              className="font-serif-literary font-semibold text-sm md:text-base text-[#252722] dark:text-[#ECEAE4] bg-transparent border-none focus:outline-none focus:ring-0 max-w-xs md:max-w-md truncate"
            />
          </div>

          {/* Center / Right controls */}
          <div className="flex items-center gap-3">
            {/* Save Status */}
            <div className="flex items-center gap-1.5 text-xs">
              {saveStatus === 'saved' && (
                <span className="text-[#287A55] flex items-center gap-1 text-[11px] font-medium">
                  <Check className="w-3.5 h-3.5" />
                  <span>Saved</span>
                </span>
              )}
              {saveStatus === 'saving' && (
                <span className="text-[#A68A5B] flex items-center gap-1 text-[11px] font-medium animate-pulse">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Saving...</span>
                </span>
              )}
              {saveStatus === 'error' && (
                <button
                  onClick={handleManualRetry}
                  className="text-[#B42318] flex items-center gap-1 text-[11px] font-medium hover:underline cursor-pointer"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Save failed (Retry)</span>
                </button>
              )}
            </div>

            <div className="h-4 w-px bg-[#E2E0D8] dark:border-[#34382F]" />

            {/* Typography toggle */}
            <div className="hidden sm:flex items-center gap-1 bg-[#F0EEE7] dark:bg-[#262923] p-0.5 rounded-lg border border-[#E2E0D8] dark:border-[#34382F]">
              <button
                onClick={() => updateEditorSettings({ fontFamily: 'serif' })}
                className={`px-2 py-0.5 text-xs font-serif-literary rounded ${
                  editorSettings.fontFamily === 'serif' ? 'bg-[#FFFFFF] dark:bg-[#1E201B] shadow-xs text-[#252722] dark:text-[#ECEAE4]' : 'text-[#696D65] dark:text-[#9FA49A]'
                }`}
                title="Serif typography (Lora)"
              >
                Serif
              </button>
              <button
                onClick={() => updateEditorSettings({ fontFamily: 'sans' })}
                className={`px-2 py-0.5 text-xs font-sans-ui rounded ${
                  editorSettings.fontFamily === 'sans' ? 'bg-[#FFFFFF] dark:bg-[#1E201B] shadow-xs text-[#252722] dark:text-[#ECEAE4]' : 'text-[#696D65] dark:text-[#9FA49A]'
                }`}
                title="Sans-serif typography (DM Sans)"
              >
                Sans
              </button>
            </div>

            {/* Font size picker */}
            <div className="hidden sm:flex items-center gap-1 bg-[#F0EEE7] dark:bg-[#262923] p-0.5 rounded-lg border border-[#E2E0D8] dark:border-[#34382F]">
              <button
                onClick={() => updateEditorSettings({ fontSize: 'sm' })}
                className={`px-1.5 py-0.5 text-[11px] rounded ${
                  editorSettings.fontSize === 'sm' ? 'bg-[#FFFFFF] dark:bg-[#1E201B] shadow-xs' : 'text-[#696D65] dark:text-[#9FA49A]'
                }`}
                title="Small font"
              >
                A-
              </button>
              <button
                onClick={() => updateEditorSettings({ fontSize: 'base' })}
                className={`px-1.5 py-0.5 text-[11px] rounded ${
                  editorSettings.fontSize === 'base' ? 'bg-[#FFFFFF] dark:bg-[#1E201B] shadow-xs' : 'text-[#696D65] dark:text-[#9FA49A]'
                }`}
                title="Standard font"
              >
                A
              </button>
              <button
                onClick={() => updateEditorSettings({ fontSize: 'lg' })}
                className={`px-1.5 py-0.5 text-[11px] rounded ${
                  editorSettings.fontSize === 'lg' ? 'bg-[#FFFFFF] dark:bg-[#1E201B] shadow-xs' : 'text-[#696D65] dark:text-[#9FA49A]'
                }`}
                title="Large font"
              >
                A+
              </button>
            </div>

            {/* Focus Mode */}
            <button
              onClick={() => setIsFocusMode(!isFocusMode)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isFocusMode
                  ? 'bg-[#33483A] text-white dark:bg-[#4D6B57]'
                  : 'text-[#696D65] hover:text-[#252722] dark:text-[#9FA49A] hover:bg-[#F0EEE7] dark:hover:bg-[#262923]'
              }`}
              title={isFocusMode ? 'Exit Zen Mode (Esc)' : 'Zen Focus Mode'}
            >
              {isFocusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Context Sidebar Toggle */}
            {!isFocusMode && (
              <button
                onClick={() => setIsContextSidebarOpen(!isContextSidebarOpen)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isContextSidebarOpen
                    ? 'bg-[#F0EEE7] text-[#252722] dark:bg-[#262923] dark:text-[#ECEAE4]'
                    : 'text-[#696D65] hover:text-[#252722] dark:text-[#9FA49A] hover:bg-[#F0EEE7] dark:hover:bg-[#262923]'
                }`}
                title="Toggle Story Context & AI Panel"
              >
                <Compass className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>

        {/* Text Canvas Area */}
        <div className="flex-1 overflow-y-auto px-6 py-8 md:px-12 flex justify-center">
          <div className="w-full max-w-2xl flex flex-col h-full">
            <textarea
              value={docContent}
              onChange={handleContentChange}
              placeholder="Begin drafting your prose here..."
              className={`w-full flex-1 bg-transparent border-none resize-none focus:outline-none focus:ring-0 text-[#252722] dark:text-[#ECEAE4] ${fontStyleClass} ${fontSizeClass} selection:bg-[#33483A] selection:text-white placeholder:text-[#959A8E] placeholder:italic`}
              style={{ minHeight: '600px' }}
            />
          </div>
        </div>

        {/* Bottom Status & Metrics Bar */}
        <footer className="h-8 border-t border-[#E2E0D8] dark:border-[#34382F] bg-[#FFFFFF] dark:bg-[#1E201B] px-6 flex items-center justify-between text-[11px] text-[#696D65] dark:text-[#9FA49A] font-mono tabular-nums shrink-0">
          <div className="flex items-center gap-4">
            <span>
              <strong className="text-[#252722] dark:text-[#ECEAE4]">{wordCount}</strong> words
            </span>
            <span aria-hidden="true">·</span>
            <span>
              <strong className="text-[#252722] dark:text-[#ECEAE4]">{charCount}</strong> chars
            </span>
            <span aria-hidden="true">·</span>
            <span>{readingTimeMin} min read</span>
          </div>

          <div>
            <span>{activeProject.title}</span>
          </div>
        </footer>
      </section>

      {/* 3. Right Contextual Sidebar (Story Context & Gemini Brainstorming) */}
      {!isFocusMode && isContextSidebarOpen && (
        <aside className="w-80 md:w-96 shrink-0 border-l border-[#E2E0D8] dark:border-[#34382F] bg-[#FFFFFF] dark:bg-[#1E201B] flex flex-col h-full">
          {/* Tabs */}
          <div className="flex items-center border-b border-[#E2E0D8] dark:border-[#34382F] bg-[#F7F5EF] dark:bg-[#141613] p-1 gap-1">
            <button
              onClick={() => setActiveTab('brainstorm')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                activeTab === 'brainstorm'
                  ? 'bg-[#FFFFFF] dark:bg-[#1E201B] text-[#252722] dark:text-[#ECEAE4] shadow-xs'
                  : 'text-[#696D65] dark:text-[#9FA49A] hover:text-[#252722]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#A68A5B]" />
              <span>Brainstorm</span>
            </button>
            <button
              onClick={() => setActiveTab('context')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                activeTab === 'context'
                  ? 'bg-[#FFFFFF] dark:bg-[#1E201B] text-[#252722] dark:text-[#ECEAE4] shadow-xs'
                  : 'text-[#696D65] dark:text-[#9FA49A] hover:text-[#252722]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Story Context</span>
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                activeTab === 'notes'
                  ? 'bg-[#FFFFFF] dark:bg-[#1E201B] text-[#252722] dark:text-[#ECEAE4] shadow-xs'
                  : 'text-[#696D65] dark:text-[#9FA49A] hover:text-[#252722]'
              }`}
            >
              <StickyNote className="w-3.5 h-3.5" />
              <span>Notes</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* TAB 1: BRAINSTORMING */}
            {activeTab === 'brainstorm' && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="font-serif-literary font-medium text-sm text-[#252722] dark:text-[#ECEAE4]">
                    AI Plot Exploration (Gemini)
                  </h3>
                  <p className="text-[11px] text-[#696D65] dark:text-[#9FA49A]">
                    TellTale proposes 3 distinct narrative developments based on your established story context and current scene.
                  </p>
                </div>

                {/* Prompt focus input */}
                <div>
                  <label className="block text-[11px] font-medium text-[#252722] dark:text-[#ECEAE4] mb-1">
                    Direction or Tension Focus
                  </label>
                  <input
                    type="text"
                    value={brainstormFocus}
                    onChange={(e) => setBrainstormFocus(e.target.value)}
                    placeholder="e.g. Unexpected character secret, rising sea tide..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E0D8] dark:border-[#34382F] bg-[#FFFFFF] dark:bg-[#1E201B] text-[#252722] dark:text-[#ECEAE4] focus:outline-none focus:ring-1 focus:ring-[#33483A]"
                  />
                </div>

                {/* Brainstorm Action Button */}
                <Button
                  onClick={handleBrainstorm}
                  isLoading={isBrainstorming}
                  className="w-full"
                  size="sm"
                  leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                >
                  Brainstorm 3 Ideas
                </Button>

                {/* Error Banner */}
                {brainstormError && (
                  <div className="p-3 bg-[#B42318]/10 border border-[#B42318]/20 rounded-lg text-xs text-[#B42318] space-y-1">
                    <div className="flex items-center gap-1.5 font-medium">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Brainstorming Notice</span>
                    </div>
                    <p>{brainstormError}</p>
                  </div>
                )}

                {/* Suggestions List */}
                <div className="space-y-3 pt-2">
                  {suggestions.map((suggestion, idx) => {
                    const isSaved = savedSuggestionTitles.has(suggestion.title);

                    return (
                      <div
                        key={idx}
                        className="p-3.5 bg-[#F7F5EF] dark:bg-[#262923] border border-[#E2E0D8] dark:border-[#34382F] rounded-lg space-y-2.5 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-serif-literary font-medium text-xs text-[#252722] dark:text-[#ECEAE4]">
                            {idx + 1}. {suggestion.title}
                          </h4>
                        </div>

                        <p className="text-xs text-[#252722] dark:text-[#ECEAE4] leading-relaxed">
                          {suggestion.content}
                        </p>

                        {suggestion.rationale && (
                          <div className="p-2 bg-[#FFFFFF] dark:bg-[#1E201B] rounded border border-[#E2E0D8] dark:border-[#34382F] text-[11px] text-[#696D65] dark:text-[#9FA49A] italic">
                            <strong className="not-italic text-[#A68A5B]">Tie-in: </strong>
                            {suggestion.rationale}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1 text-xs">
                          <Button
                            size="sm"
                            variant={isSaved ? 'outline' : 'primary'}
                            className="h-7 text-[11px] px-2.5"
                            onClick={() => handleSaveSuggestionAsIdea(suggestion)}
                            disabled={isSaved}
                            leftIcon={isSaved ? <Check className="w-3 h-3 text-[#287A55]" /> : <Bookmark className="w-3 h-3" />}
                          >
                            {isSaved ? 'Saved to Ideas' : 'Save as Idea'}
                          </Button>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleAddSuggestionAsNote(suggestion)}
                              className="p-1.5 text-[#696D65] hover:text-[#252722] dark:text-[#9FA49A] rounded cursor-pointer"
                              title="Add to project notes"
                            >
                              <StickyNote className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleCopyText(`${suggestion.title}\n\n${suggestion.content}`, 'Suggestion')}
                              className="p-1.5 text-[#696D65] hover:text-[#252722] dark:text-[#9FA49A] rounded cursor-pointer"
                              title="Copy suggestion"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: STORY CONTEXT */}
            {activeTab === 'context' && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="font-serif-literary font-medium text-sm text-[#252722] dark:text-[#ECEAE4]">
                    Story Context & Lore
                  </h3>
                  <p className="text-[11px] text-[#696D65] dark:text-[#9FA49A]">
                    These details guide Gemini to generate suggestions consistent with your narrative rules.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#252722] dark:text-[#ECEAE4] mb-1">
                    Synopsis / Narrative Premise
                  </label>
                  <textarea
                    rows={4}
                    value={synopsis}
                    onChange={(e) => setSynopsis(e.target.value)}
                    placeholder="Core premise, setting, and stakes..."
                    className="w-full p-2.5 text-xs rounded-lg border border-[#E2E0D8] dark:border-[#34382F] bg-[#FFFFFF] dark:bg-[#1E201B] text-[#252722] dark:text-[#ECEAE4] focus:outline-none focus:ring-1 focus:ring-[#33483A] resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#252722] dark:text-[#ECEAE4] mb-1">
                    Key Characters & Motivations
                  </label>
                  <textarea
                    rows={4}
                    value={characters}
                    onChange={(e) => setCharacters(e.target.value)}
                    placeholder="e.g. Maren: Cartographer seeking truth about Cape Vane..."
                    className="w-full p-2.5 text-xs rounded-lg border border-[#E2E0D8] dark:border-[#34382F] bg-[#FFFFFF] dark:bg-[#1E201B] text-[#252722] dark:text-[#ECEAE4] focus:outline-none focus:ring-1 focus:ring-[#33483A] resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#252722] dark:text-[#ECEAE4] mb-1">
                    Tone & Aesthetic
                  </label>
                  <input
                    type="text"
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    placeholder="e.g. Lyrical, maritime, atmospheric, suspenseful"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E0D8] dark:border-[#34382F] bg-[#FFFFFF] dark:bg-[#1E201B] text-[#252722] dark:text-[#ECEAE4] focus:outline-none focus:ring-1 focus:ring-[#33483A]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#252722] dark:text-[#ECEAE4] mb-1">
                    Active Story Question / Narrative Dilemma
                  </label>
                  <textarea
                    rows={2}
                    value={activeQuestion}
                    onChange={(e) => setActiveQuestion(e.target.value)}
                    placeholder="What question is this scene or act attempting to answer?"
                    className="w-full p-2.5 text-xs rounded-lg border border-[#E2E0D8] dark:border-[#34382F] bg-[#FFFFFF] dark:bg-[#1E201B] text-[#252722] dark:text-[#ECEAE4] focus:outline-none focus:ring-1 focus:ring-[#33483A] resize-none"
                  />
                </div>

                <Button
                  onClick={handleSaveStoryContext}
                  isLoading={isSavingContext}
                  className="w-full"
                  size="sm"
                >
                  Save Story Context
                </Button>
              </div>
            )}

            {/* TAB 3: PROJECT NOTES */}
            {activeTab === 'notes' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif-literary font-medium text-sm text-[#252722] dark:text-[#ECEAE4]">
                    Project Notes ({projectNotes.length})
                  </h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() => setIsNewNoteInlineOpen(!isNewNoteInlineOpen)}
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Add Note
                  </Button>
                </div>

                {isNewNoteInlineOpen && (
                  <form onSubmit={handleCreateInlineNote} className="p-3 bg-[#F7F5EF] dark:bg-[#262923] border border-[#E2E0D8] dark:border-[#34382F] rounded-lg space-y-2.5">
                    <input
                      type="text"
                      required
                      value={newNoteTitle}
                      onChange={(e) => setNewNoteTitle(e.target.value)}
                      placeholder="Note Title..."
                      className="w-full px-2.5 py-1.5 text-xs rounded border border-[#E2E0D8] dark:border-[#34382F] bg-[#FFFFFF] dark:bg-[#1E201B]"
                    />
                    <select
                      value={newNoteCategory}
                      onChange={(e) => setNewNoteCategory(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded border border-[#E2E0D8] dark:border-[#34382F] bg-[#FFFFFF] dark:bg-[#1E201B]"
                    >
                      <option value="Worldbuilding">Worldbuilding</option>
                      <option value="Character">Character</option>
                      <option value="Research">Research</option>
                      <option value="Plot Hook">Plot Hook</option>
                    </select>
                    <textarea
                      rows={3}
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                      placeholder="Content or observations..."
                      className="w-full p-2 text-xs rounded border border-[#E2E0D8] dark:border-[#34382F] bg-[#FFFFFF] dark:bg-[#1E201B] resize-none"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsNewNoteInlineOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" size="sm" isLoading={isSavingNote}>
                        Save Note
                      </Button>
                    </div>
                  </form>
                )}

                <div className="space-y-2.5">
                  {projectNotes.length === 0 ? (
                    <p className="text-xs text-[#696D65] dark:text-[#9FA49A] text-center py-4">
                      No notes recorded for this story yet.
                    </p>
                  ) : (
                    projectNotes.map((note) => (
                      <div
                        key={note.id}
                        className="p-3 bg-[#F7F5EF] dark:bg-[#262923] border border-[#E2E0D8] dark:border-[#34382F] rounded-lg space-y-1"
                      >
                        <div className="flex items-center justify-between text-[10px] text-[#A68A5B] font-medium">
                          <span>{note.category}</span>
                          <span className="text-[#696D65] dark:text-[#9FA49A]">
                            {new Date(note.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="font-medium text-xs text-[#252722] dark:text-[#ECEAE4]">
                          {note.title}
                        </h4>
                        <p className="text-xs text-[#696D65] dark:text-[#9FA49A] line-clamp-3 leading-relaxed">
                          {note.content}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>
      )}

      {/* New Document Modal */}
      <Modal
        isOpen={isNewDocModalOpen}
        onClose={() => setIsNewDocModalOpen(false)}
        title="Add New Document or Chapter"
        description="Create a new chapter or passage inside this project."
        maxWidth="sm"
      >
        <form onSubmit={handleCreateDocument} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#252722] dark:text-[#ECEAE4] mb-1">
              Document Title *
            </label>
            <input
              type="text"
              required
              autoFocus
              value={newDocTitle}
              onChange={(e) => setNewDocTitle(e.target.value)}
              placeholder="e.g., Chapter 3: The Low Water Shoal"
              className="w-full h-10 px-3 text-sm rounded-lg border border-[#E2E0D8] dark:border-[#34382F] bg-[#FFFFFF] dark:bg-[#1E201B] text-[#252722] dark:text-[#ECEAE4] focus:outline-none focus:ring-2 focus:ring-[#33483A]"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsNewDocModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isCreatingDoc}>
              Create Document
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Document Confirmation Modal */}
      <Modal
        isOpen={Boolean(docToDelete)}
        onClose={() => setDocToDelete(null)}
        title="Delete Document"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-[#696D65] dark:text-[#9FA49A]">
            Are you sure you want to permanently delete <strong>"{docToDelete?.title}"</strong>? The manuscript text inside this chapter will be discarded.
          </p>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              variant="secondary"
              onClick={() => setDocToDelete(null)}
              disabled={isDeletingDoc}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteDocument}
              isLoading={isDeletingDoc}
            >
              Delete Chapter
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
