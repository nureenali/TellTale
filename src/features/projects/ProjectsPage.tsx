import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderOpen,
  Plus,
  Search,
  BookOpen,
  Calendar,
  MoreVertical,
  Edit2,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext.tsx';
import { api } from '../../services/api.ts';
import { Button } from '../../components/ui/Button.tsx';
import { Modal } from '../../components/ui/Modal.tsx';
import { useToast } from '../../components/ui/Toast.tsx';
import type { Project } from '../../types/index.ts';

export function ProjectsPage() {
  const {
    projects,
    activeProjectId,
    setActiveProjectId,
    refreshProjects,
  } = useWorkspace();
  const navigate = useNavigate();
  const { success, error } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editGenre, setEditGenre] = useState('');
  const [editTargetWords, setEditTargetWords] = useState(50000);

  // Filtered projects
  const filteredProjects = projects.filter((p) => {
    const term = searchQuery.toLowerCase();
    return (
      p.title.toLowerCase().includes(term) ||
      p.description?.toLowerCase().includes(term) ||
      p.genre?.toLowerCase().includes(term)
    );
  });

  const handleOpenEdit = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProject(project);
    setEditTitle(project.title);
    setEditDescription(project.description || '');
    setEditGenre(project.genre || 'Literary Fiction');
    setEditTargetWords(project.target_words || 50000);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !editTitle.trim()) return;
    try {
      setIsSavingEdit(true);
      await api.updateProject(editingProject.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        genre: editGenre.trim(),
        target_words: Number(editTargetWords) || 50000,
      });
      await refreshProjects();
      setEditingProject(null);
      success('Project updated successfully');
    } catch (err: any) {
      error(err.message || 'Failed to update project');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;
    try {
      setIsDeleting(true);
      await api.deleteProject(projectToDelete.id);
      await refreshProjects();
      if (activeProjectId === projectToDelete.id) {
        setActiveProjectId(null);
      }
      setProjectToDelete(null);
      success(`Project "${projectToDelete.title}" and its contents deleted`);
    } catch (err: any) {
      error(err.message || 'Failed to delete project');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8 md:px-12 md:py-10 max-w-5xl mx-auto w-full space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#E2E0D8] dark:border-[#34382F]">
        <div>
          <h1 className="text-2xl font-serif-literary font-semibold tracking-tight text-[#252722] dark:text-[#ECEAE4]">
            Writing Projects
          </h1>
          <p className="text-xs text-[#696D65] dark:text-[#9FA49A] mt-1">
            Manage your fiction manuscripts, novellas, and creative narratives.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-[#696D65] dark:text-[#9FA49A] absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects..."
            className="w-full h-10 pl-9 pr-3 text-xs rounded-lg border border-[#E2E0D8] dark:border-[#34382F] bg-[#FFFFFF] dark:bg-[#1E201B] text-[#252722] dark:text-[#ECEAE4] focus:outline-none focus:ring-2 focus:ring-[#33483A]"
          />
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="bg-[#FFFFFF] dark:bg-[#1E201B] border border-dashed border-[#E2E0D8] dark:border-[#34382F] rounded-xl p-12 text-center space-y-3">
          <FolderOpen className="w-8 h-8 text-[#A68A5B] mx-auto" />
          <h3 className="text-sm font-medium text-[#252722] dark:text-[#ECEAE4]">
            {searchQuery ? 'No matching projects found' : 'No writing projects yet'}
          </h3>
          <p className="text-xs text-[#696D65] dark:text-[#9FA49A] max-w-sm mx-auto">
            {searchQuery
              ? 'Try a different search term or clear the filter.'
              : 'Create a new project to start organizing chapters, characters, and ideas.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredProjects.map((project) => {
            const wordCount = project.word_count || 0;
            const targetWords = project.target_words || 50000;
            const progressPct = Math.min(Math.round((wordCount / targetWords) * 100), 100);

            return (
              <div
                key={project.id}
                onClick={() => {
                  setActiveProjectId(project.id);
                  navigate('/workspace');
                }}
                className="bg-[#FFFFFF] dark:bg-[#1E201B] border border-[#E2E0D8] dark:border-[#34382F] rounded-xl p-5 hover:border-[#33483A] dark:hover:border-[#4D6B57] transition-all cursor-pointer group flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className="text-[11px] font-medium text-[#A68A5B]">
                      {project.genre}
                    </span>
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                      <button
                        onClick={(e) => handleOpenEdit(project, e)}
                        className="p-1 text-[#696D65] hover:text-[#252722] dark:text-[#9FA49A] dark:hover:text-[#ECEAE4] rounded cursor-pointer"
                        title="Edit Project Details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setProjectToDelete(project);
                        }}
                        className="p-1 text-[#696D65] hover:text-[#B42318] dark:text-[#9FA49A] dark:hover:text-[#E5544B] rounded cursor-pointer"
                        title="Delete Project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-serif-literary font-semibold text-lg text-[#252722] dark:text-[#ECEAE4] group-hover:text-[#33483A] dark:group-hover:text-[#C6A875] transition-colors">
                    {project.title}
                  </h3>

                  <p className="text-xs text-[#696D65] dark:text-[#9FA49A] line-clamp-2 mt-1 leading-relaxed">
                    {project.description || 'No description provided.'}
                  </p>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5 pt-2 border-t border-[#E2E0D8] dark:border-[#34382F]">
                  <div className="flex items-center justify-between text-[11px] text-[#696D65] dark:text-[#9FA49A] font-mono tabular-nums">
                    <span>
                      {wordCount.toLocaleString()} / {targetWords.toLocaleString()} words
                    </span>
                    <span>{progressPct}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#F0EEE7] dark:bg-[#262923] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#33483A] dark:bg-[#4D6B57] rounded-full transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                {/* Footer metadata */}
                <div className="flex items-center justify-between text-[11px] text-[#696D65] dark:text-[#9FA49A] pt-1">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{project.document_count || 0} documents</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Updated {new Date(project.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Project Modal */}
      <Modal
        isOpen={Boolean(editingProject)}
        onClose={() => setEditingProject(null)}
        title="Edit Project Details"
        description="Update the project metadata, genre, and target word count."
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#252722] dark:text-[#ECEAE4] mb-1">
              Project Title *
            </label>
            <input
              type="text"
              required
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full h-10 px-3 text-sm rounded-lg border border-[#E2E0D8] dark:border-[#34382F] bg-[#FFFFFF] dark:bg-[#1E201B] text-[#252722] dark:text-[#ECEAE4] focus:outline-none focus:ring-2 focus:ring-[#33483A]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#252722] dark:text-[#ECEAE4] mb-1">
              Genre or Format
            </label>
            <input
              type="text"
              value={editGenre}
              onChange={(e) => setEditGenre(e.target.value)}
              className="w-full h-10 px-3 text-sm rounded-lg border border-[#E2E0D8] dark:border-[#34382F] bg-[#FFFFFF] dark:bg-[#1E201B] text-[#252722] dark:text-[#ECEAE4] focus:outline-none focus:ring-2 focus:ring-[#33483A]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#252722] dark:text-[#ECEAE4] mb-1">
              Description or Synopsis
            </label>
            <textarea
              rows={3}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full p-3 text-sm rounded-lg border border-[#E2E0D8] dark:border-[#34382F] bg-[#FFFFFF] dark:bg-[#1E201B] text-[#252722] dark:text-[#ECEAE4] focus:outline-none focus:ring-2 focus:ring-[#33483A] resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#252722] dark:text-[#ECEAE4] mb-1">
              Target Word Count
            </label>
            <input
              type="number"
              min={1000}
              step={1000}
              value={editTargetWords}
              onChange={(e) => setEditTargetWords(Number(e.target.value))}
              className="w-full h-10 px-3 text-sm font-mono tabular-nums rounded-lg border border-[#E2E0D8] dark:border-[#34382F] bg-[#FFFFFF] dark:bg-[#1E201B] text-[#252722] dark:text-[#ECEAE4] focus:outline-none focus:ring-2 focus:ring-[#33483A]"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditingProject(null)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSavingEdit}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Project Confirmation Modal */}
      <Modal
        isOpen={Boolean(projectToDelete)}
        onClose={() => setProjectToDelete(null)}
        title="Delete Project"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-[#B42318]/10 text-[#B42318] rounded-lg">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-semibold">Permanent Deletion Warning</p>
              <p>
                Deleting <strong>"{projectToDelete?.title}"</strong> will permanently erase all associated documents, chapters, story notes, and saved ideas. This action cannot be reversed.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              variant="secondary"
              onClick={() => setProjectToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              isLoading={isDeleting}
            >
              Delete Project & All Contents
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
