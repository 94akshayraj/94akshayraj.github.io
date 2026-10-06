import { useEffect, useState } from 'react';
import { getAllReferences, getNotesForReference } from '../db/indexedDb';
import type { LibraryNote, Reference } from '../models/types';

interface NotesPageProps {
  references: unknown[];
  onRefresh: () => void;
}

export function NotesPage({}: NotesPageProps) {
  const [items, setItems] = useState<Array<{ reference: Reference; note: LibraryNote }>>([]);

  useEffect(() => {
    const load = async () => {
      const references = await getAllReferences();
      const all: Array<{ reference: Reference; note: LibraryNote }> = [];
      for (const ref of references) {
        const notes = await getNotesForReference(ref.id);
        notes.forEach((note) => all.push({ reference: ref, note }));
      }
      setItems(all);
    };
    void load();
  }, []);

  return (
    <div className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Memory</p>
          <h2>Notes</h2>
        </div>
      </header>

      <section className="reference-list">
        {items.length ? items.map(({ reference, note }) => (
          <div key={note.id} className="reference-card">
            <h3>{reference.title}</h3>
            <p className="meta-line">{note.pageNumber ? `Page ${note.pageNumber}` : 'General note'}</p>
            <strong>{note.title}</strong>
            <p>{note.content}</p>
          </div>
        )) : <div className="empty-state">No notes saved yet.</div>}
      </section>
    </div>
  );
}
