import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { DashboardPage } from './pages/DashboardPage';
import { LibraryPage } from './pages/LibraryPage';
import { ReferenceFormPage } from './pages/ReferenceFormPage';
import { ReferenceDetailPage } from './pages/ReferenceDetailPage';
import { ReadPage } from './pages/ReadPage';
import { HighlightsPage } from './pages/HighlightsPage';
import { NotesPage } from './pages/NotesPage';
import { TagsPage } from './pages/TagsPage';
import { SettingsPage } from './pages/SettingsPage';
import { getAllReferences } from './db/indexedDb';
import type { Reference } from './models/types';

function App() {
  const [references, setReferences] = useState<Reference[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const refreshReferences = async () => {
    const all = await getAllReferences();
    setReferences(all);
  };

  useEffect(() => {
    const storedTheme = window.localStorage.getItem('research-theme');
    if (storedTheme === 'dark') {
      setTheme('dark');
    }
    void refreshReferences();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('research-theme', theme);
  }, [theme]);

  const navItems = useMemo(
    () => [
      { to: '/dashboard', label: 'Dashboard' },
      { to: '/library', label: 'Library' },
      { to: '/highlights', label: 'Highlights' },
      { to: '/notes', label: 'Notes' },
      { to: '/tags', label: 'Tags' },
      { to: '/settings', label: 'Settings' },
    ],
    [],
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div>
            <p className="sidebar-kicker">Research</p>
            <h1>Library</h1>
          </div>
          <button
            className="theme-toggle"
            type="button"
            onClick={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? 'Dark' : 'Light'}
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button type="button" className="primary-button" onClick={() => window.location.hash = '#/reference/new'}>
            + Add Reference
          </button>
        </div>
      </aside>

      <main className="content-panel">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage references={references} />} />
          <Route path="/library" element={<LibraryPage references={references} onRefresh={refreshReferences} />} />
          <Route path="/reference/new" element={<ReferenceFormPage references={references} onRefresh={refreshReferences} />} />
          <Route path="/reference/:id" element={<ReferenceDetailPage references={references} onRefresh={refreshReferences} />} />
          <Route path="/reference/:id/edit" element={<ReferenceFormPage references={references} onRefresh={refreshReferences} />} />
          <Route path="/read/:id" element={<ReadPage references={references} onRefresh={refreshReferences} />} />
          <Route path="/highlights" element={<HighlightsPage references={references} onRefresh={refreshReferences} />} />
          <Route path="/notes" element={<NotesPage references={references} onRefresh={refreshReferences} />} />
          <Route path="/tags" element={<TagsPage references={references} onRefresh={refreshReferences} />} />
          <Route path="/settings" element={<SettingsPage references={references} onRefresh={refreshReferences} />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
