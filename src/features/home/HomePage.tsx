import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Feather,
  BookOpen,
  ArrowRight,
  Clock,
  Sparkles,
  StickyNote,
  Plus,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext.tsx';
import { api } from '../../services/api.ts';
import type { Idea, Note } from '../../types/index.ts';
import { Button } from '../../components/ui/Button.tsx';

export function HomePage() {
  const {
    projects,
    activeProject,
    activeDocument,
    setActiveProjectId,
    setActiveDocumentId,
    documents,
  } = useWorkspace();
  const navigate = useNavigate();

  const [recentIdeas, setRecentIdeas] = useState<Idea[]>([]);
  const [recentNotes, setRecentNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadRecents() {
      try {
        const [ideas, notes] = await Promise.all([
          api.getIdeas(),
          api.getNotes(),
        ]);
        setRecentIdeas(ideas.slice(0, 3));
        setRecentNotes(notes.slice(0, 3));
      } catch (err) {
        console.error('Failed to load recent dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadRecents();
  }, []);

  const handleContinueWriting = () => {
    if (activeProject && activeDocument) {
      navigate('/workspace');
    } else if (projects.length > 0) {
      setActiveProjectId(projects[0].id);
      navigate('/workspace');
    } else {
      navigate('/projects');
    }
  };

  const currentDocContent = activeDocument?.content || '';
  const previewSnippet = currentDocContent
    ? currentDocContent.slice(0, 220) + (currentDocContent.length > 220 ? '...' : '')
    : 'Your desk is prepared. Begin typing your opening chapter or scene...';

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8 md:px-12 md:py-10 max-w-5xl mx-auto w-full space-y-10">
      {/* Workspace Header */}
      <div className="space-y-1.5 border-b border-[#E2E0D8] dark:border-[#34382F] pb-6">
        <h1 className="text-2xl md:text-3xl font-serif-literary font-semibold tracking-tight text-[#252722] dark:text-[#ECEAE4]">
          Welcome back to your desk
        </h1>
        <p className="text-xs md:text-sm text-[#696D65] dark:text-[#9FA49A]">
          Review your current manuscript, explore plot developments, and keep story notes within arm’s reach.
        </p>
      </div>

      {/* Prominent Continue Writing Card */}
      {activeProject ? (
        <div className="bg-[#FFFFFF] dark:bg-[#1E201B] border border-[#E2E0D8] dark:border-[#34382F] rounded-xl p-6 md:p-8 space-y-5 transition-shadow hover:shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-[#E2E0D8] dark:border-[#34382F]">
            <div>
              <div className="flex items-center gap-2 text-xs text-[#696D65] dark:text-[#9FA49A] mb-1">
                <span>Active Manuscript</span>
                <span aria-hidden="true">·</span>
                <span className="font-medium text-[#252722] dark:text-[#ECEAE4]">
                  {activeProject.title}
                </span>
                <span aria-hidden="true">·</span>
                <span>{activeProject.genre}</span>
              </div>
              <h2 className="text-xl md:text-2xl font-serif-literary font-semibold text-[#252722] dark:text-[#ECEAE4]">
                {activeDocument?.title || 'Manuscript Overview'}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                onClick={handleContinueWriting}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Continue Writing
              </Button>
            </div>
          </div>

          {/* Excerpt preview */}
          <div className="p-4 bg-[#F7F5EF] dark:bg-[#262923] rounded-lg border border-[#E2E0D8] dark:border-[#34382F]">
            <p className="font-serif-literary text-sm md:text-base leading-relaxed text-[#252722] dark:text-[#ECEAE4] italic opacity-90 line-clamp-3">
              "{previewSnippet}"
            </p>
          </div>

          {/* Meta strip */}
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-[#696D65] dark:text-[#9FA49A]">
            <div className="flex items-center gap-4">
              <span className="font-mono tabular-nums">
                <strong className="text-[#252722] dark:text-[#ECEAE4] font-medium">
                  {activeDocument?.word_count || 0}
                </strong>{' '}
                document words
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                <strong className="text-[#252722] dark:text-[#ECEAE4] font-medium">
                  {activeProject.word_count || 0}
                </strong>{' '}
                total novel words
              </span>
              <span aria-hidden="true">·</span>
              <span>{documents.length} document{documents.length === 1 ? '' : 's'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <Clock className="w-3.5 h-3.5" />
              <span>
                Last edited {new Date(activeDocument?.updated_at || activeProject.updated_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#FFFFFF] dark:bg-[#1E201B] border border-dashed border-[#E2E0D8] dark:border-[#34382F] rounded-xl p-8 text-center space-y-3">
          <BookOpen className="w-8 h-8 text-[#A68A5B] mx-auto" />
          <h3 className="text-base font-serif-literary font-medium text-[#252722] dark:text-[#ECEAE4]">
            No projects in workspace
          </h3>
          <p className="text-xs text-[#696D65] dark:text-[#9FA49A] max-w-sm mx-auto">
            Create your first writing project to begin drafting chapters, recording story lore, and exploring plot developments.
          </p>
          <Button
            size="sm"
            onClick={() => navigate('/projects')}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Create First Project
          </Button>
        </div>
      )}

      {/* Grid: Recent Projects & Saved Ideas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Recent Projects */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold tracking-tight text-[#252722] dark:text-[#ECEAE4]">
              Recent Projects
            </h3>
            <button
              onClick={() => navigate('/projects')}
              className="text-xs text-[#696D65] hover:text-[#252722] dark:text-[#9FA49A] dark:hover:text-[#ECEAE4] transition-colors cursor-pointer"
            >
              View all ({projects.length})
            </button>
          </div>

          <div className="space-y-2.5">
            {projects.slice(0, 3).map((p) => (
              <div
                key={p.id}
                onClick={() => {
                  setActiveProjectId(p.id);
                  navigate('/workspace');
                }}
                className="bg-[#FFFFFF] dark:bg-[#1E201B] border border-[#E2E0D8] dark:border-[#34382F] rounded-lg p-4 hover:border-[#33483A] dark:hover:border-[#4D6B57] transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-serif-literary font-medium text-sm text-[#252722] dark:text-[#ECEAE4] group-hover:text-[#33483A] dark:group-hover:text-[#C6A875] transition-colors">
                      {p.title}
                    </h4>
                    <p className="text-xs text-[#696D65] dark:text-[#9FA49A] line-clamp-1 mt-0.5">
                      {p.description || p.genre}
                    </p>
                  </div>
                  <span className="text-[11px] font-mono tabular-nums text-[#696D65] dark:text-[#9FA49A] shrink-0">
                    {p.word_count?.toLocaleString() || 0} w
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Saved Ideas */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold tracking-tight text-[#252722] dark:text-[#ECEAE4] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#A68A5B]" />
              <span>Saved Plot Ideas</span>
            </h3>
            <button
              onClick={() => navigate('/ideas')}
              className="text-xs text-[#696D65] hover:text-[#252722] dark:text-[#9FA49A] dark:hover:text-[#ECEAE4] transition-colors cursor-pointer"
            >
              View all ({recentIdeas.length})
            </button>
          </div>

          <div className="space-y-2.5">
            {recentIdeas.length === 0 ? (
              <div className="bg-[#FFFFFF] dark:bg-[#1E201B] border border-[#E2E0D8] dark:border-[#34382F] rounded-lg p-5 text-center text-xs text-[#696D65] dark:text-[#9FA49A]">
                No ideas saved yet. Use the Brainstorm panel in Workspace to generate plot developments.
              </div>
            ) : (
              recentIdeas.map((idea) => (
                <div
                  key={idea.id}
                  onClick={() => navigate('/ideas')}
                  className="bg-[#FFFFFF] dark:bg-[#1E201B] border border-[#E2E0D8] dark:border-[#34382F] rounded-lg p-4 hover:border-[#33483A] dark:hover:border-[#4D6B57] transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="font-medium text-xs text-[#252722] dark:text-[#ECEAE4] group-hover:text-[#33483A] dark:group-hover:text-[#C6A875] transition-colors">
                      {idea.title}
                    </h4>
                    {idea.project_title && (
                      <span className="text-[10px] text-[#696D65] dark:text-[#9FA49A] shrink-0">
                        {idea.project_title}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#696D65] dark:text-[#9FA49A] line-clamp-2">
                    {idea.content}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Story Notes Shelf */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold tracking-tight text-[#252722] dark:text-[#ECEAE4] flex items-center gap-1.5">
            <StickyNote className="w-3.5 h-3.5 text-[#33483A] dark:text-[#4D6B57]" />
            <span>Story Knowledge & Research Notes</span>
          </h3>
          <button
            onClick={() => navigate('/notes')}
            className="text-xs text-[#696D65] hover:text-[#252722] dark:text-[#9FA49A] dark:hover:text-[#ECEAE4] transition-colors cursor-pointer"
          >
            Manage notes ({recentNotes.length})
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {recentNotes.map((note) => (
            <div
              key={note.id}
              onClick={() => navigate('/notes')}
              className="bg-[#FFFFFF] dark:bg-[#1E201B] border border-[#E2E0D8] dark:border-[#34382F] rounded-lg p-4 hover:border-[#33483A] dark:hover:border-[#4D6B57] transition-all cursor-pointer space-y-1.5"
            >
              <div className="flex items-center justify-between text-[11px] text-[#696D65] dark:text-[#9FA49A]">
                <span className="font-medium text-[#A68A5B]">{note.category}</span>
                <span>{new Date(note.updated_at).toLocaleDateString()}</span>
              </div>
              <h4 className="font-medium text-xs text-[#252722] dark:text-[#ECEAE4] line-clamp-1">
                {note.title}
              </h4>
              <p className="text-xs text-[#696D65] dark:text-[#9FA49A] line-clamp-2 leading-relaxed">
                {note.content}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
