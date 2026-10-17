import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lightbulb,
  Search,
  Trash2,
  Edit2,
  FolderOpen,
  ArrowRight,
  Filter,
  FilePlus,
  Copy,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext.tsx';
import { api } from '../../services/api.ts';
import { Button } from '../../components/ui/Button.tsx';
import { Modal } from '../../components/ui/Modal.tsx';
import { useToast } from '../../components/ui/Toast.tsx';
import type { Idea } from '../../types/index.ts';

export function IdeasPage() {
  const { projects, setActiveProjectId, setActiveDocumentId, refreshDocuments } = useWorkspace();
  const { success, error, info } = useToast();
  const navigate = useNavigate();

  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');

  // Modals & edit
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [ideaToDelete, setIdeaToDelete] = useState<Idea | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit fields
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formProjectId, setFormProjectId] = useState<string>('');

  const loadIdeas = useCallback(async () => {
    try {
      setIsLoading(true);
      const projFilter = selectedProjectId === 'all' ? undefined : Number(selectedProjectId);
      const list = await api.getIdeas(projFilter, searchQuery);
      setIdeas(list);
    } catch (err: any) {
      console.error('Failed to load ideas:', err);
      error(err.message || 'Failed to load ideas');
    } finally {
      setIsLoading(false);
    }
  }, [selectedProjectId, searchQuery, error]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadIdeas();
    }, 200);
    return () => clearTimeout(timer);
  }, [loadIdeas]);

  const handleOpenEdit = (idea: Idea) => {
    setEditingIdea(idea);
    setFormTitle(idea.title);
    setFormContent(idea.content);
    setFormProjectId(idea.project_id ? idea.project_id.toString() : '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIdea || !formTitle.trim() || !formContent.trim()) return;

    try {
      setIsSubmitting(true);
      const projId = formProjectId ? Number(formProjectId) : null;
      await api.updateIdea(editingIdea.id, {
        title: formTitle.trim(),
        content: formContent.trim(),
        project_id: projId,
      });
      success('Idea updated');
      setEditingIdea(null);
      loadIdeas();
    } catch (err: any) {
      error(err.message || 'Failed to update idea');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteIdea = async () => {
    if (!ideaToDelete) return;
    try {
      setIsSubmitting(true);
      await api.deleteIdea(ideaToDelete.id);
      success(`Deleted "${ideaToDelete.title}"`);
      setIdeaToDelete(null);
      loadIdeas();
    } catch (err: any) {
      error(err.message || 'Failed to delete idea');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Convert saved idea into a manuscript chapter in the project!
  const handleTurnIntoChapter = async (idea: Idea) => {
    const targetProjId = idea.project_id || (projects.length > 0 ? projects[0].id : null);
    if (!targetProjId) {
      error('No project available to attach this document to.');
      return;
    }
    try {
      const doc = await api.createDocument(
        targetProjId,
        `Scene: ${idea.title}`,
        `// Premise & Scene Spark:\n${idea.content}\n\n`
      );
      await refreshDocuments(targetProjId);
      setActiveProjectId(targetProjId);
      setActiveDocumentId(doc.id);
      success(`Created new chapter "${doc.title}" in workspace!`);
      navigate('/workspace');
    } catch (err: any) {
      error(err.message || 'Failed to create document from idea');
    }
  };

  const handleCopyIdea = (idea: Idea) => {
    navigator.clipboard.writeText(`${idea.title}\n\n${idea.content}`);
    info('Idea text copied to clipboard');
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8 md:px-12 md:py-10 max-w-5xl mx-auto w-full space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#E2E0D8] dark:border-[#34382F]">
        <div>
          <h1 className="text-2xl font-serif-literary font-semibold tracking-tight text-[#252722] dark:text-[#ECEAE4]">
            Saved Plot Ideas & Sparks
          </h1>
          <p className="text-xs text-[#696D65] dark:text-[#9FA49A] mt-1">
            Curated story developments and plot twists saved from your Gemini brainstorm sessions.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#FFFFFF] dark:bg-[#1E201B] border border-[#E2E0D8] dark:border-[#34382F] p-3 rounded-xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#696D65] dark:text-[#9FA49A] absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search saved ideas..."
            className="w-full h-10 pl-9 pr-3 text-xs rounded-lg border border-[#E2E0D8] dark:border-[#34382F] bg-transparent text-[#252722] dark:text-[#ECEAE4] focus:outline-none focus:ring-1 focus:ring-[#33483A]"
          />
        </div>

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

      {/* Ideas List */}
      {ideas.length === 0 ? (
        <div className="bg-[#FFFFFF] dark:bg-[#1E201B] border border-dashed border-[#E2E0D8] dark:border-[#34382F] rounded-xl p-12 text-center space-y-3">
          <Lightbulb className="w-8 h-8 text-[#A68A5B] mx-auto" />
          <h3 className="text-sm font-medium text-[#252722] dark:text-[#ECEAE4]">
            {searchQuery ? 'No matching ideas found' : 'No ideas saved yet'}
          </h3>
          <p className="text-xs text-[#696D65] dark:text-[#9FA49A] max-w-sm mx-auto">
            When brainstorming in the Writing Workspace, click "Save as Idea" on suggestions that intrigue you to preserve them here.
          </p>
          <Button
            size="sm"
            onClick={() => navigate('/workspace')}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Go to Workspace
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {ideas.map((idea) => (
            <div
              key={idea.id}
              className="bg-[#FFFFFF] dark:bg-[#1E201B] border border-[#E2E0D8] dark:border-[#34382F] rounded-xl p-5 hover:border-[#33483A] dark:hover:border-[#4D6B57] transition-all space-y-3"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-2 border-b border-[#E2E0D8] dark:border-[#34382F]">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-medium text-[#A68A5B]">Plot Development</span>
                  <span aria-hidden="true" className="text-[#696D65]">·</span>
                  <span className="text-[#696D65] dark:text-[#9FA49A]">
                    Source: {idea.source || 'gemini'}
                  </span>
                  {idea.project_title && (
                    <>
                      <span aria-hidden="true" className="text-[#696D65]">·</span>
                      <span className="text-[#252722] dark:text-[#ECEAE4] font-medium flex items-center gap-1">
                        <FolderOpen className="w-3 h-3 text-[#33483A]" />
                        {idea.project_title}
                      </span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs px-2.5"
                    onClick={() => handleTurnIntoChapter(idea)}
                    leftIcon={<FilePlus className="w-3.5 h-3.5" />}
                  >
                    Turn into Scene
                  </Button>
                  <button
                    onClick={() => handleCopyIdea(idea)}
                    className="p-1.5 text-[#696D65] hover:text-[#252722] dark:text-[#9FA49A] rounded cursor-pointer"
                    title="Copy idea"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleOpenEdit(idea)}
                    className="p-1.5 text-[#696D65] hover:text-[#252722] dark:text-[#9FA49A] rounded cursor-pointer"
                    title="Edit idea"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setIdeaToDelete(idea)}
                    className="p-1.5 text-[#696D65] hover:text-[#B42318] rounded cursor-pointer"
                    title="Delete idea"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-serif-literary font-medium text-base text-[#252722] dark:text-[#ECEAE4] mb-1.5">
                  {idea.title}
                </h3>
                <p className="text-xs text-[#252722] dark:text-[#ECEAE4] leading-relaxed whitespace-pre-line">
                  {idea.content}
                </p>
              </div>

              <div className="text-[10px] text-[#696D65] dark:text-[#9FA49A] pt-1">
                Saved on {new Date(idea.created_at).toLocaleDateString()} at{' '}
                {new Date(idea.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Idea Modal */}
      <Modal
        isOpen={Boolean(editingIdea)}
        onClose={() => setEditingIdea(null)}
        title="Edit Saved Idea"
        description="Refine the plot development title or description."
        maxWidth="md"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#252722] dark:text-[#ECEAE4] mb-1">
              Idea Title *
            </label>
            <input
              type="text"
              required
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="w-full h-10 px-3 text-sm rounded-lg border border-[#E2E0D8] dark:border-[#34382F] bg-[#FFFFFF] dark:bg-[#1E201B] text-[#252722] dark:text-[#ECEAE4] focus:outline-none focus:ring-2 focus:ring-[#33483A]"
            />
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
              <option value="">General (No project)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#252722] dark:text-[#ECEAE4] mb-1">
              Idea Narrative Content *
            </label>
            <textarea
              rows={6}
              required
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              className="w-full p-3 text-xs leading-relaxed rounded-lg border border-[#E2E0D8] dark:border-[#34382F] bg-[#FFFFFF] dark:bg-[#1E201B] text-[#252722] dark:text-[#ECEAE4] focus:outline-none focus:ring-2 focus:ring-[#33483A] resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditingIdea(null)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(ideaToDelete)}
        onClose={() => setIdeaToDelete(null)}
        title="Delete Plot Idea"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-[#696D65] dark:text-[#9FA49A]">
            Are you sure you want to delete idea <strong>"{ideaToDelete?.title}"</strong>?
          </p>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              variant="secondary"
              onClick={() => setIdeaToDelete(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteIdea}
              isLoading={isSubmitting}
            >
              Delete Idea
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
