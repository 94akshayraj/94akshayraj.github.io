import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { generateApaInText, generateApaReference } from '../citation/apa';
import { db, getHighlightsForReference, getNotesForReference, getReferenceById } from '../db/indexedDb';
import type { Highlight, LibraryNote, Reference } from '../models/types';
import { formatDate } from '../utils/helpers';

interface ReferenceDetailPageProps {
  references: Reference[];
  onRefresh: () => void;
}

export function ReferenceDetailPage({ onRefresh }: ReferenceDetailPageProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [reference, setReference] = useState<Reference | null>(null);
  const [notes, setNotes] = useState<LibraryNote[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const item = await getReferenceById(id);
      setReference(item || null);
      if (item) {
        setNotes(await getNotesForReference(item.id));
        setHighlights(await getHighlightsForReference(item.id));
      }
    };
    void load();
  }, [id]);

  const removeReference = async () => {
    if (!reference) return;
    const confirmed = window.confirm('Delete this reference? This will delete the associated PDF, notes, and highlights.');
    if (!confirmed) return;
    await db.references.delete(reference.id);
    onRefresh();
    navigate('/library');
  };

  if (!reference) return <div className="empty-state">Reference not found.</div>;

  return (
    <div className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Details</p>
          <h2>{reference.title}</h2>
        </div>
        <div className="toolbar-row">
          <Link to={`/read/${reference.id}`} className="primary-button">Open PDF</Link>
          <Link to={`/reference/${reference.id}/edit`} className="secondary-button">Edit</Link>
          <button type="button" className="danger-button" onClick={() => void removeReference()}>Delete</button>
        </div>
      </header>

      <div className="detail-grid">
        <section className="panel-box">
          <h3>APA citation</h3>
          <p>{generateApaReference(reference)}</p>
          <p><strong>In-text:</strong> {generateApaInText(reference)}</p>
        </section>

        <section className="panel-box">
          <h3>Metadata</h3>
          <ul className="meta-list">
            <li><span>Type</span><strong>{reference.type}</strong></li>
            <li><span>Year</span><strong>{reference.year || 'n.d.'}</strong></li>
            <li><span>Publisher</span><strong>{reference.publisher || 'Not provided'}</strong></li>
            <li><span>Journal</span><strong>{reference.journal || 'Not provided'}</strong></li>
            <li><span>DOI</span><strong>{reference.doi || 'Not provided'}</strong></li>
            <li><span>URL</span><strong>{reference.url || 'Not provided'}</strong></li>
            <li><span>Added</span><strong>{formatDate(reference.dateAdded)}</strong></li>
          </ul>
        </section>
      </div>

      <section className="panel-box">
        <h3>Notes</h3>
        {notes.length ? notes.map((note) => (
          <div className="note-card" key={note.id}>
            <strong>{note.title || 'General note'}</strong>
            <p>{note.content}</p>
          </div>
        )) : <p>No notes yet.</p>}
      </section>

      <section className="panel-box">
        <h3>Highlights</h3>
        {highlights.length ? highlights.map((highlight) => (
          <div className="note-card" key={highlight.id}>
            <strong>Page {highlight.pageNumber}</strong>
            <p>“{highlight.selectedText}”</p>
            {highlight.note ? <small>{highlight.note}</small> : null}
          </div>
        )) : <p>No highlights yet.</p>}
      </section>
    </div>
  );
}
