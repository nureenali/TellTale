import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Feather,
  FolderOpen,
  StickyNote,
  Lightbulb,
  Settings,
  Plus,
  Sun,
  Moon,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext.tsx';
import { useTheme } from '../../context/ThemeContext.tsx';
import { Button } from '../ui/Button.tsx';
import { Modal } from '../ui/Modal.tsx';
import { api } from '../../services/api.ts';
import { useToast } from '../ui/Toast.tsx';

interface ShellProps {
  children: React.ReactNode;
}

export function Shell({ children }: ShellProps) {
  const {
    projects,
    activeProjectId,
    activeProject,
    setActiveProjectId,
    refreshProjects,
  } = useWorkspace();
  const { theme, toggleTheme } = useTheme();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newGenre, setNewGenre] = useState('Literary Fiction');
  const [newTargetWords, setNewTargetWords] = useState(50000);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      setIsCreating(true);
      const created = await api.createProject({
        title: newTitle.trim(),
        description: newDescription.trim(),
        genre: newGenre.trim(),
        target_words: Number(newTargetWords) || 50000,
      });
      await refreshProjects();
      setActiveProjectId(created.id);
      setIsNewProjectModalOpen(false);
      setNewTitle('');
      setNewDescription('');
      success(`Project "${created.title}" created`);
      navigate(`/workspace`);
    } catch (err: any) {
      error(err.message || 'Failed to create project');
    } finally {
      setIsCreating(false);
    }
  };

  const navItems = [
    { to: '/', label: 'Home', icon: BookOpen },
    { to: '/workspace', label: 'Workspace', icon: Feather },
    { to: '/projects', label: 'Projects', icon: FolderOpen },
    { to: '/notes', label: 'Notes', icon: StickyNote },
    { to: '/ideas', label: 'Saved Ideas', icon: Lightbulb },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F7F5EF] dark:bg-[#141613] text-[#252722] dark:text-[#ECEAE4]">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-[#E2E0D8] dark:border-[#34382F] bg-[#FFFFFF] dark:bg-[#1E201B]">
        {/* Brand Lockup */}
        <div className="p-4 border-b border-[#E2E0D8] dark:border-[#34382F] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#33483A] dark:bg-[#4D6B57] text-white flex items-center justify-center">
              <Feather className="w-4 h-4" />
            </div>
            <div>
              <span className="font-serif-literary font-semibold text-lg tracking-tight text-[#252722] dark:text-[#ECEAE4]">
                TellTale
              </span>
              <span className="block text-[11px] text-[#696D65] dark:text-[#9FA49A] leading-none">
                Story Workspace
              </span>
            </div>
          </div>
        </div>

        {/* Active Project Selector */}
        <div className="px-3 pt-3 pb-2 border-b border-[#E2E0D8] dark:border-[#34382F]">
          <label className="text-[10px] font-semibold tracking-wider uppercase text-[#696D65] dark:text-[#9FA49A] px-2 mb-1 block">
            Active Story
          </label>
          <div className="relative">
            <select
              value={activeProjectId || ''}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : null;
                setActiveProjectId(val);
              }}
              className="w-full appearance-none bg-[#F0EEE7] dark:bg-[#262923] border border-[#E2E0D8] dark:border-[#34382F] rounded-lg py-2 pl-3 pr-8 text-xs font-medium text-[#252722] dark:text-[#ECEAE4] truncate focus:outline-none focus:ring-1 focus:ring-[#33483A] cursor-pointer"
            >
              {projects.length === 0 && <option value="">No projects</option>}
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#696D65] dark:text-[#9FA49A] absolute right-2.5 top-3 pointer-events-none" />
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-[#33483A] text-white dark:bg-[#4D6B57]'
                    : 'text-[#696D65] dark:text-[#9FA49A] hover:bg-[#F0EEE7] dark:hover:bg-[#262923] hover:text-[#252722] dark:hover:text-[#ECEAE4]'
                }`
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Quick Action & Workspace Info */}
        <div className="p-3 border-t border-[#E2E0D8] dark:border-[#34382F] space-y-2">
          <Button
            size="sm"
            variant="secondary"
            className="w-full"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setIsNewProjectModalOpen(true)}
          >
            New Project
          </Button>

          <div className="pt-2 flex items-center justify-between text-xs text-[#696D65] dark:text-[#9FA49A] px-1">
            <div className="flex items-center gap-1.5 font-mono text-[11px] tabular-nums">
              <span>{activeProject?.word_count?.toLocaleString() ?? 0}</span>
              <span className="text-[10px] text-[#959A8E]">words</span>
            </div>
            <button
              onClick={toggleTheme}
              className="p-1.5 hover:bg-[#F0EEE7] dark:hover:bg-[#262923] rounded-lg transition-colors cursor-pointer"
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} theme`}
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-[#C6A875]" />}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[#FFFFFF] dark:bg-[#1E201B] border-b border-[#E2E0D8] dark:border-[#34382F] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#33483A] text-white flex items-center justify-center">
            <Feather className="w-3.5 h-3.5" />
          </div>
          <span className="font-serif-literary font-semibold text-base text-[#252722] dark:text-[#ECEAE4]">
            TellTale
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-[#696D65] dark:text-[#9FA49A]"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg text-[#252722] dark:text-[#ECEAE4]"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex flex-col justify-end"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsMobileMenuOpen(false);
          }}
        >
          <div className="bg-[#FFFFFF] dark:bg-[#1E201B] border-t border-[#E2E0D8] dark:border-[#34382F] p-4 rounded-t-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E0D8] dark:border-[#34382F]">
              <span className="font-serif-literary font-medium text-sm">Navigation</span>
              <button onClick={() => setIsMobileMenuOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="grid grid-cols-2 gap-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium ${
                      isActive
                        ? 'bg-[#33483A] text-white dark:bg-[#4D6B57]'
                        : 'bg-[#F0EEE7] dark:bg-[#262923] text-[#252722] dark:text-[#ECEAE4]'
                    }`
                  }
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
            <Button
              className="w-full"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setIsMobileMenuOpen(false);
                setIsNewProjectModalOpen(true);
              }}
            >
              New Project
            </Button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden pt-14 md:pt-0">
        {children}
      </main>

      {/* New Project Modal */}
      <Modal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        title="Create New Writing Project"
        description="Establish the title, genre, and initial target for your new story or manuscript."
      >
        <form onSubmit={handleCreateProject} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#252722] dark:text-[#ECEAE4] mb-1">
              Project Title *
            </label>
            <input
              type="text"
              required
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g., The Northern Passage"
              className="w-full h-10 px-3 text-sm rounded-lg border border-[#E2E0D8] dark:border-[#34382F] bg-[#FFFFFF] dark:bg-[#1E201B] text-[#252722] dark:text-[#ECEAE4] focus:outline-none focus:ring-2 focus:ring-[#33483A]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#252722] dark:text-[#ECEAE4] mb-1">
              Genre or Format
            </label>
            <input
              type="text"
              value={newGenre}
              onChange={(e) => setNewGenre(e.target.value)}
              placeholder="e.g., Speculative Fiction, Novella, Academic Paper"
              className="w-full h-10 px-3 text-sm rounded-lg border border-[#E2E0D8] dark:border-[#34382F] bg-[#FFFFFF] dark:bg-[#1E201B] text-[#252722] dark:text-[#ECEAE4] focus:outline-none focus:ring-2 focus:ring-[#33483A]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#252722] dark:text-[#ECEAE4] mb-1">
              Premise or Synopsis
            </label>
            <textarea
              rows={3}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="A brief summary of the central premise or narrative arc..."
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
              value={newTargetWords}
              onChange={(e) => setNewTargetWords(Number(e.target.value))}
              className="w-full h-10 px-3 text-sm font-mono tabular-nums rounded-lg border border-[#E2E0D8] dark:border-[#34382F] bg-[#FFFFFF] dark:bg-[#1E201B] text-[#252722] dark:text-[#ECEAE4] focus:outline-none focus:ring-2 focus:ring-[#33483A]"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsNewProjectModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isCreating}>
              Create Project
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
