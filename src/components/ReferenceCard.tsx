import { Link } from 'react-router-dom';
import { generateApaInText, generateApaReference } from '../citation/apa';
import { saveReference } from '../db/indexedDb';
import type { Reference } from '../models/types';

interface ReferenceCardProps {
  reference: Reference;
  onRefresh: () => void;
}

export function ReferenceCard({ reference, onRefresh }: ReferenceCardProps) {
  const copyToClipboard = async (value: string) => {
    await navigator.clipboard.writeText(value);
  };

  const updateStatus = async (status: Reference['readingStatus']) => {
    await saveReference({ ...reference, readingStatus: status, dateModified: new Date().toISOString() });
    onRefresh();
  };

  const toggleFavorite = async () => {
    await saveReference({ ...reference, favorite: !reference.favorite, dateModified: new Date().toISOString() });
    onRefresh();
  };

  return (
    <article className="reference-card">
      <div className="card-header">
        <div>
          <h3>{reference.title}</h3>
          <p className="meta-line">{reference.authors.map((author) => `${author.firstName || ''} ${author.lastName || author.organization || ''}`.trim()).join(', ') || 'Unknown author'} · {reference.year || 'n.d.'} · {reference.type}</p>
        </div>
        <button type="button" className="favorite-button" onClick={toggleFavorite} aria-label="Toggle favorite">
          {reference.favorite ? '★' : '☆'}
        </button>
      </div>

      <div className="tag-row">
        {reference.tags.map((tag) => (
          <span key={tag} className="tag-pill">{tag}</span>
        ))}
      </div>

      <div className="status-row">
        <select value={reference.readingStatus} onChange={(event) => void updateStatus(event.target.value as Reference['readingStatus'])} aria-label="Reading status">
          <option value="to-read">To Read</option>
          <option value="reading">Reading</option>
          <option value="finished">Finished</option>
        </select>
        <span className="progress-pill">{reference.readingProgress || 0}%</span>
      </div>

      <p className="citation-preview">{generateApaReference(reference)}</p>

      <div className="card-actions">
        <button type="button" onClick={() => void copyToClipboard(generateApaReference(reference))}>Copy APA</button>
        <button type="button" onClick={() => void copyToClipboard(generateApaInText(reference))}>Copy In-Text</button>
        {reference.pdfId ? <Link to={`/read/${reference.id}`}>Open PDF</Link> : <span className="muted">No PDF</span>}
        <Link to={`/reference/${reference.id}`}>Notes</Link>
        <Link to={`/reference/${reference.id}/edit`}>Edit</Link>
      </div>
    </article>
  );
}
