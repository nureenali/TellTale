/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { WorkspaceProvider } from './context/WorkspaceContext.tsx';
import { ToastProvider } from './components/ui/Toast.tsx';
import { Shell } from './components/layout/Shell.tsx';
import { HomePage } from './features/home/HomePage.tsx';
import { WorkspacePage } from './features/workspace/WorkspacePage.tsx';
import { ProjectsPage } from './features/projects/ProjectsPage.tsx';
import { NotesPage } from './features/notes/NotesPage.tsx';
import { IdeasPage } from './features/ideas/IdeasPage.tsx';
import { SettingsPage } from './features/settings/SettingsPage.tsx';

export default function App() {
  return (
    <ThemeProvider>
      <WorkspaceProvider>
        <ToastProvider>
          <BrowserRouter>
            <Shell>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/workspace" element={<WorkspacePage />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/notes" element={<NotesPage />} />
                <Route path="/ideas" element={<IdeasPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Shell>
          </BrowserRouter>
        </ToastProvider>
      </WorkspaceProvider>
    </ThemeProvider>
  );
}
