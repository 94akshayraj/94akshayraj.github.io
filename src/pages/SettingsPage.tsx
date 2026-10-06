import { useRef, useState } from 'react';
import { exportLibraryToZip, importLibraryFromZip } from '../services/libraryService';
import type { Reference } from '../models/types';

interface SettingsPageProps {
  references: Reference[];
  onRefresh: () => void;
}

export function SettingsPage({ references, onRefresh }: SettingsPageProps) {
  const [statusMessage, setStatusMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleExport = async () => {
    try {
      await exportLibraryToZip();
      setStatusMessage(`Exported ${references.length} references.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Export failed.');
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const mode = window.confirm('Replace existing library? Choose Cancel to merge instead.') ? 'replace' : 'merge';
      await importLibraryFromZip(file, mode);
      setStatusMessage('Library imported successfully.');
      onRefresh();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Import failed.');
    }
  };

  return (
    <div className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">System</p>
          <h2>Settings</h2>
        </div>
      </header>

      <section className="panel-box settings-panel">
        <button type="button" className="primary-button" onClick={() => void handleExport()}>Export Library</button>
        <button type="button" className="secondary-button" onClick={() => fileInputRef.current?.click()}>Import Library</button>
        <input ref={fileInputRef} type="file" accept=".zip,application/zip" hidden onChange={(event) => void handleImport(event)} />
      </section>

      {statusMessage ? <p className="status-box">{statusMessage}</p> : null}
    </div>
  );
}
