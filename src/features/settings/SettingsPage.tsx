import React, { useState, useEffect, useRef } from 'react';
import {
  Settings,
  Sun,
  Moon,
  Database,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Type,
  FileCheck,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.tsx';
import { useWorkspace } from '../../context/WorkspaceContext.tsx';
import { api } from '../../services/api.ts';
import { Button } from '../../components/ui/Button.tsx';
import { useToast } from '../../components/ui/Toast.tsx';
import type { HealthStatus } from '../../types/index.ts';

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { editorSettings, updateEditorSettings, refreshProjects } = useWorkspace();
  const { success, error, info } = useToast();

  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    async function checkHealth() {
      try {
        const h = await api.getHealth();
        setHealth(h);
      } catch (err: any) {
        console.error('Failed to get health status:', err);
      }
    }
    checkHealth();
  }, []);

  const handleExportBackup = async () => {
    try {
      setIsExporting(true);
      const blob = await api.exportBackup();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `telltale_workspace_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      success('Workspace backup exported successfully');
    } catch (err: any) {
      error(err.message || 'Failed to export backup');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const text = await file.text();
      const jsonData = JSON.parse(text);
      await api.importBackup(jsonData);
      await refreshProjects();
      success('Workspace backup successfully restored');
    } catch (err: any) {
      error(err.message || 'Failed to import backup file. Check file format.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8 md:px-12 md:py-10 max-w-4xl mx-auto w-full space-y-10">
      {/* Header */}
      <div className="pb-6 border-b border-[#E2E0D8] dark:border-[#34382F]">
        <h1 className="text-2xl font-serif-literary font-semibold tracking-tight text-[#252722] dark:text-[#ECEAE4]">
          Workspace Settings & Preferences
        </h1>
        <p className="text-xs text-[#696D65] dark:text-[#9FA49A] mt-1">
          Customize your writing atmosphere, configure typography, and manage local database backups.
        </p>
      </div>

      {/* 1. Theme and Appearance */}
      <section className="bg-[#FFFFFF] dark:bg-[#1E201B] border border-[#E2E0D8] dark:border-[#34382F] rounded-xl p-6 space-y-5">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-[#252722] dark:text-[#ECEAE4] flex items-center gap-2">
            <Sun className="w-4 h-4 text-[#A68A5B]" />
            <span>Theme & Visual Tone</span>
          </h2>
          <p className="text-xs text-[#696D65] dark:text-[#9FA49A] mt-0.5">
            Select between warm paper light mode or restful nocturnal dark mode.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => setTheme('light')}
            className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
              theme === 'light'
                ? 'border-[#33483A] bg-[#F7F5EF] text-[#252722] ring-1 ring-[#33483A]'
                : 'border-[#E2E0D8] dark:border-[#34382F] bg-[#FFFFFF] dark:bg-[#1E201B] text-[#696D65]'
            }`}
          >
            <Sun className="w-5 h-5 text-[#A68A5B] shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-[#252722] dark:text-[#ECEAE4]">Warm Parchment (Light)</div>
              <p className="text-[11px] text-[#696D65] dark:text-[#9FA49A] mt-0.5">
                Calm off-white surfaces with deep forest green brand accents.
              </p>
            </div>
          </button>

          <button
            onClick={() => setTheme('dark')}
            className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
              theme === 'dark'
                ? 'border-[#4D6B57] bg-[#262923] text-[#ECEAE4] ring-1 ring-[#4D6B57]'
                : 'border-[#E2E0D8] dark:border-[#34382F] bg-[#FFFFFF] dark:bg-[#1E201B] text-[#696D65]'
            }`}
          >
            <Moon className="w-5 h-5 text-[#C6A875] shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-[#252722] dark:text-[#ECEAE4]">Obsidian Ink (Dark)</div>
              <p className="text-[11px] text-[#696D65] dark:text-[#9FA49A] mt-0.5">
                Low-glare dark surfaces with warm brass highlights for nocturnal writing.
              </p>
            </div>
          </button>
        </div>
      </section>

      {/* 2. Editor Typography Defaults */}
      <section className="bg-[#FFFFFF] dark:bg-[#1E201B] border border-[#E2E0D8] dark:border-[#34382F] rounded-xl p-6 space-y-5">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-[#252722] dark:text-[#ECEAE4] flex items-center gap-2">
            <Type className="w-4 h-4 text-[#33483A] dark:text-[#4D6B57]" />
            <span>Manuscript Typography Defaults</span>
          </h2>
          <p className="text-xs text-[#696D65] dark:text-[#9FA49A] mt-0.5">
            Set your preferred typeface and default reading size for the writing canvas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#252722] dark:text-[#ECEAE4] mb-1.5">
              Default Font Family
            </label>
            <select
              value={editorSettings.fontFamily}
              onChange={(e) => updateEditorSettings({ fontFamily: e.target.value as 'serif' | 'sans' })}
              className="w-full h-10 px-3 text-xs rounded-lg border border-[#E2E0D8] dark:border-[#34382F] bg-[#FFFFFF] dark:bg-[#1E201B] text-[#252722] dark:text-[#ECEAE4]"
            >
              <option value="serif">Lora (Literary Serif)</option>
              <option value="sans">DM Sans (Clean Sans-Serif)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#252722] dark:text-[#ECEAE4] mb-1.5">
              Default Text Size
            </label>
            <select
              value={editorSettings.fontSize}
              onChange={(e) => updateEditorSettings({ fontSize: e.target.value as 'sm' | 'base' | 'lg' })}
              className="w-full h-10 px-3 text-xs rounded-lg border border-[#E2E0D8] dark:border-[#34382F] bg-[#FFFFFF] dark:bg-[#1E201B] text-[#252722] dark:text-[#ECEAE4]"
            >
              <option value="sm">Compact (15px)</option>
              <option value="base">Standard (17px)</option>
              <option value="lg">Expanded (19px)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#252722] dark:text-[#ECEAE4] mb-1.5">
              Autosave Interval
            </label>
            <select
              value={editorSettings.autosaveIntervalMs}
              onChange={(e) => updateEditorSettings({ autosaveIntervalMs: Number(e.target.value) })}
              className="w-full h-10 px-3 text-xs rounded-lg border border-[#E2E0D8] dark:border-[#34382F] bg-[#FFFFFF] dark:bg-[#1E201B] text-[#252722] dark:text-[#ECEAE4]"
            >
              <option value={300}>Instant (300 ms)</option>
              <option value={500}>Standard (500 ms)</option>
              <option value={1000}>Relaxed (1000 ms)</option>
            </select>
          </div>
        </div>
      </section>

      {/* 3. System & Database Health */}
      <section className="bg-[#FFFFFF] dark:bg-[#1E201B] border border-[#E2E0D8] dark:border-[#34382F] rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-[#252722] dark:text-[#ECEAE4] flex items-center gap-2">
            <Database className="w-4 h-4 text-[#287A55]" />
            <span>Zero-Config Database & Engine Status</span>
          </h2>
          <p className="text-xs text-[#696D65] dark:text-[#9FA49A] mt-0.5">
            You do not need to install or configure any database. TellTale works automatically out of the box.
          </p>
        </div>

        {/* Reassuring zero-config notice */}
        <div className="p-3.5 bg-[#287A55]/10 border border-[#287A55]/20 rounded-lg flex items-start gap-3">
          <CheckCircle2 className="w-4 h-4 text-[#287A55] shrink-0 mt-0.5" />
          <div className="text-xs text-[#252722] dark:text-[#ECEAE4] space-y-0.5">
            <p className="font-medium text-[#287A55]">No Database Setup or Connection Needed</p>
            <p className="text-[#696D65] dark:text-[#9FA49A] leading-relaxed">
              TellTale automatically manages its own embedded SQLite storage in the background. If running offline or in standalone browser mode, it seamlessly preserves all your chapters, story lore, and plot ideas directly in your browser.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3.5 bg-[#F7F5EF] dark:bg-[#262923] rounded-lg border border-[#E2E0D8] dark:border-[#34382F]">
            <div className="text-[11px] text-[#696D65] dark:text-[#9FA49A]">Storage Engine</div>
            <div className="mt-1 flex items-center gap-1.5 font-medium text-xs text-[#287A55]">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{health?.database || 'Auto-Managed (Zero Setup)'}</span>
            </div>
          </div>

          <div className="p-3.5 bg-[#F7F5EF] dark:bg-[#262923] rounded-lg border border-[#E2E0D8] dark:border-[#34382F]">
            <div className="text-[11px] text-[#696D65] dark:text-[#9FA49A]">Gemini AI Integration</div>
            <div className="mt-1 flex items-center gap-1.5 font-medium text-xs text-[#287A55]">
              <Sparkles className="w-3.5 h-3.5 text-[#A68A5B] shrink-0" />
              <span>{health?.gemini_configured ? 'Configured & Active' : 'API Key Ready'}</span>
            </div>
          </div>

          <div className="p-3.5 bg-[#F7F5EF] dark:bg-[#262923] rounded-lg border border-[#E2E0D8] dark:border-[#34382F]">
            <div className="text-[11px] text-[#696D65] dark:text-[#9FA49A]">Active Model</div>
            <div className="mt-1 font-mono text-xs text-[#252722] dark:text-[#ECEAE4]">
              {health?.model || 'gemini-3.8-flash'}
            </div>
          </div>
        </div>
      </section>

      {/* 4. Data Backup & Restore */}
      <section className="bg-[#FFFFFF] dark:bg-[#1E201B] border border-[#E2E0D8] dark:border-[#34382F] rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-[#252722] dark:text-[#ECEAE4] flex items-center gap-2">
            <Download className="w-4 h-4 text-[#A68A5B]" />
            <span>Workspace Data Management</span>
          </h2>
          <p className="text-xs text-[#696D65] dark:text-[#9FA49A] mt-0.5">
            Export your entire workspace including all novel manuscripts, story contexts, notes, and ideas as a portable JSON backup.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button
            variant="secondary"
            onClick={handleExportBackup}
            isLoading={isExporting}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export Complete Backup (.json)
          </Button>

          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            isLoading={isImporting}
            leftIcon={<Upload className="w-4 h-4" />}
          >
            Restore from Backup File
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportFile}
            className="hidden"
          />
        </div>
      </section>

      {/* 5. About TellTale */}
      <section className="pt-4 border-t border-[#E2E0D8] dark:border-[#34382F] text-xs text-[#696D65] dark:text-[#9FA49A] space-y-1">
        <p className="font-serif-literary font-medium text-sm text-[#252722] dark:text-[#ECEAE4]">
          TellTale — Story Workspace for Novelists & Storytellers
        </p>
        <p>
          Version 1.0.0 · Full-stack architecture with React, TypeScript, Express, SQLite persistence, and Gemini 3.8 Flash brainstorming.
        </p>
      </section>
    </div>
  );
}
