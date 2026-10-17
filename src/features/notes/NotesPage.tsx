import React, { useState, useEffect, useCallback } from 'react';
import {
  StickyNote,
  Search,
  Plus,
  Trash2,
  Edit2,
  FolderOpen,
  Filter,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext.tsx';
import { api } from '../../services/api.ts';
import { Button } from '../../components/ui/Button.tsx';
import { Modal } from '../../components/ui/Modal.tsx';
import { useToast } from '../../components/ui/Toast.tsx';
import type { Note } from '../../types/index.ts';

const CATEGORIES = [
  'All',
  'Worldbuilding',
  'Character',
  'Research',
  'Plot Hook',
  'Craft Notes',
  'General',
];

export function NotesPage() {
  const { projects } = useWorkspace();
  const { success, error } = useToast();

  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');

  // Modals & form state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form fields
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState('General');
  const [formProjectId, setFormProjectId] = useState<string>('');

  const loadNotes = useCallback(async () => {
    try {
      setIsLoading(true);
      const projFilter = selectedProjectId === 'all' ? undefined : Number(selectedProjectId);
      const list = await api.getNotes(projFilter, searchQuery);
      setNotes(list);
    } catch (err: any) {
      console.error('Failed to load notes:', err);
      error(err.message || 'Failed to load notes');
    } finally {
      setIsLoading(false);
    }
  }, [selectedProjectId, searchQuery, error]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadNotes();
    }, 200);
    return () => clearTimeout(timer);
  }, [loadNotes]);

  const handleOpenCreate = () => {
    setFormTitle('');
    setFormContent('');
    setFormCategory('General');
    setFormProjectId(projects[0]?.id.toString() || '');
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (note: Note) => {
    setEditingNote(note);
    setFormTitle(note.title);
    setFormContent(note.content);
    setFormCategory(note.category || 'General');
    setFormProjectId(note.project_id ? note.project_id.toString() : '');
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    try {
      setIsSubmitting(true);
      const projId = formProjectId ? Number(formProjectId) : null;

      if (editingNote) {
        await api.updateNote(editingNote.id, {
          title: formTitle.trim(),
          content: formContent.trim(),
          category: formCategory,
          project_id: projId,
        });
        success('Note updated');
        setEditingNote(null);
      } else {
        await api.createNote({
          title: formTitle.trim(),
          content: formContent.trim(),
          category: formCategory,
          project_id: projId,
        });
        success('Note created');
        setIsCreateModalOpen(false);
      }
      loadNotes();
    } catch (err: any) {
      error(err.message || 'Failed to save note');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNote = async () => {
    if (!noteToDelete) return;
    try {
      setIsSubmitting(true);
      await api.deleteNote(noteToDelete.id);
      success(`Deleted "${noteToDelete.title}"`);
      setNoteToDelete(null);
      loadNotes();
    } catch (err: any) {
      error(err.message || 'Failed to delete note');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredNotes = notes.filter((n) => {
    if (selectedCategory === 'All') return true;
    return n.category === selectedCategory;
  });

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8 md:px-12 md:py-10 max-w-5xl mx-auto w-full space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#E2E0D8] dark:border-[#34382F]">
        <div>
          <h1 className="text-2xl font-serif-literary font-semibold tracking-tight text-[#252722] dark:text-[#ECEAE4]">
            Story Notes & Research
          </h1>
          <p className="text-xs text-[#696D65] dark:text-[#9FA49A] mt-1">
            Store worldbuilding rules, character profiles, research findings, and narrative craft ideas.
          </p>
        </div>

        <Button
          onClick={handleOpenCreate}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
        >
          New Note
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#FFFFFF] dark:bg-[#1E201B] border border-[#E2E0D8] dark:border-[#34382F] p-3 rounded-xl">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#696D65] dark:text-[#9FA49A] absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes by keyword or subject..."
            className="w-full h-10 pl-9 pr-3 text-xs rounded-lg border border-[#E2E0D8] dark:border-[#34382F] bg-transparent text-[#252722] dark:text-[#ECEAE4] focus:outline-none focus:ring-1 focus:ring-[#33483A]"
          />
        </div>

        {/* Project Selector Filter */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="h-10 px-3 pr-8 text-xs rounded-lg border border-[#E2E0D8] dark:border-[#34382F] bg-[#FFFFFF] dark:bg-[#1E201B] text-[#252722] dark:text-[#ECEAE4] appearance-none focus:outline-none focus:ring-1 focus:ring-[#33483A] cursor-pointer"
            >
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            <Filter className="w-3.5 h-3.5 text-[#696D65] dark:text-[#9FA49A] absolute right-2.5 top-3.5 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Category Pills (Interactive Filter Tabs) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer shrink-0 ${
              selectedCategory === cat
                ? 'bg-[#33483A] text-white dark:bg-[#4D6B57]'
                : 'bg-[#FFFFFF] dark:bg-[#1E201B] border border-[#E2E0D8] dark:border-[#34382F] text-[#696D65] dark:text-[#9FA49A] hover:text-[#252722]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Notes Grid */}
      {filteredNotes.length === 0 ? (
        <div className="bg-[#FFFFFF] dark:bg-[#1E201B] border border-dashed border-[#E2E0D8] dark:border-[#34382F] rounded-xl p-12 text-center space-y-3">
          <StickyNote className="w-8 h-8 text-[#A68A5B] mx-auto" />
          <h3 className="text-sm font-medium text-[#252722] dark:text-[#ECEAE4]">
            {searchQuery ? 'No matching notes found' : 'No notes recorded'}
          </h3>
          <p className="text-xs text-[#696D65] dark:text-[#9FA49A] max-w-sm mx-auto">
            Record research tidbits, character profiles, and scene details to consult while writing.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              className="bg-[#FFFFFF] dark:bg-[#1E201B] border border-[#E2E0D8] dark:border-[#34382F] rounded-xl p-5 hover:border-[#33483A] dark:hover:border-[#4D6B57] transition-all flex flex-col justify-between space-y-3 group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-[#696D65] dark:text-[#9FA49A]">
                  <span className="font-medium text-[#A68A5B]">{note.category}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenEdit(note)}
                      className="p-1 hover:text-[#252722] dark:hover:text-[#ECEAE4] rounded cursor-pointer"
                      title="Edit note"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setNoteToDelete(note)}
                      className="p-1 hover:text-[#B42318] rounded cursor-pointer"
                      title="Delete note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="font-serif-literary font-medium text-base text-[#252722] dark:text-[#ECEAE4] leading-snug">
                  {note.title}
                </h3>

                <p className="text-xs text-[#696D65] dark:text-[#9FA49A] leading-relaxed whitespace-pre-line line-clamp-6">
                  {note.content}
                </p>
              </div>

              <div className="pt-2 border-t border-[#E2E0D8] dark:border-[#34382F] flex items-center justify-between text-[10px] text-[#696D65] dark:text-[#9FA49A]">
                <div className="flex items-center gap-1 truncate max-w-[150px]">
                  {note.project_title ? (
                    <>
                      <FolderOpen className="w-3 h-3 shrink-0" />
                      <span className="truncate">{note.project_title}</span>
                    </>
                  ) : (
                    <span>General Note</span>
                  )}
                </div>
                <span>{new Date(note.updated_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Note Modal */}
      <Modal
        isOpen={isCreateModalOpen || Boolean(editingNote)}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingNote(null);
        }}
        title={editingNote ? 'Edit Story Note' : 'Create New Story Note'}
        description="Preserve character sketches, worldbuilding lore, and historical research."
        maxWidth="lg"
      >
        <form onSubmit={handleSaveNote} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#252722] dark:text-[#ECEAE4] mb-1">
              Note Title *
            </label>
            <input
              type="text"
              required
              autoFocus
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="e.g. Cape Vane Lighthouse Architecture & Mechanics"
              className="w-full h-10 px-3 text-sm rounded-lg border border-[#E2E0D8] dark:border-[#34382F] bg-[#FFFFFF] dark:bg-[#1E201B] text-[#252722] dark:text-[#ECEAE4] focus:outline-none focus:ring-2 focus:ring-[#33483A]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#252722] dark:text-[#ECEAE4] mb-1">
                Category
              </label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full h-10 px-3 text-xs rounded-lg border border-[#E2E0D8] dark:border-[#34382F] bg-[#FFFFFF] dark:bg-[#1E201B] text-[#252722] dark:text-[#ECEAE4] focus:outline-none focus:ring-2 focus:ring-[#33483A]"
              >
                {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#252722] dark:text-[#ECEAE4] mb-1">
                Associated Project
              </label>
              <select
                value={formProjectId}
                onChange={(e) => setFormProjectId(e.target.value)}
                className="w-full h-10 px-3 text-xs rounded-lg border border-[#E2E0D8] dark:border-[#34382F] bg-[#FFFFFF] dark:bg-[#1E201B] text-[#252722] dark:text-[#ECEAE4] focus:outline-none focus:ring-2 focus:ring-[#33483A]"
              >
                <option value="">None (General Desk Note)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#252722] dark:text-[#ECEAE4] mb-1">
              Note Content
            </label>
            <textarea
              rows={8}
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              placeholder="Record details, dialect phrases, dates, or narrative reminders..."
              className="w-full p-3 text-xs leading-relaxed rounded-lg border border-[#E2E0D8] dark:border-[#34382F] bg-[#FFFFFF] dark:bg-[#1E201B] text-[#252722] dark:text-[#ECEAE4] focus:outline-none focus:ring-2 focus:ring-[#33483A] resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsCreateModalOpen(false);
                setEditingNote(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {editingNote ? 'Save Note' : 'Create Note'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(noteToDelete)}
        onClose={() => setNoteToDelete(null)}
        title="Delete Story Note"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-[#696D65] dark:text-[#9FA49A]">
            Are you sure you want to delete note <strong>"{noteToDelete?.title}"</strong>? This action cannot be reversed.
          </p>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              variant="secondary"
              onClick={() => setNoteToDelete(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteNote}
              isLoading={isSubmitting}
            >
              Delete Note
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
