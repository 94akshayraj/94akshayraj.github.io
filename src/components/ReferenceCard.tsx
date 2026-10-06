import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { generateApaInText, generateApaReference } from '../citation/apa';
import { saveReference } from '../db/indexedDb';
import type { Reference } from '../models/types';

const coverCache = new Map<string, Promise<string>>();

async function getBookCover(reference: Reference): Promise<string> {
  if (reference.type !== 'book') return '';
  const author = reference.authors.map((item) => item.lastName || item.organization || '').filter(Boolean).join(' ');
  const query = reference.isbn
    ? `isbn:${reference.isbn.replace(/[^0-9xX]/g, '')}`
    : `${reference.title} ${author}`.trim();
  if (!query) return '';

  let request = coverCache.get(query);
  if (!request) {
    request = fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=1`)
      .then(async (response) => {
        if (!response.ok) return '';
        const result = await response.json() as { items?: Array<{ volumeInfo?: { imageLinks?: { thumbnail?: string } } }> };
        const thumbnail = result.items?.[0]?.volumeInfo?.imageLinks?.thumbnail;
        return typeof thumbnail === 'string' ? thumbnail.replace(/^http:/, 'https:') : '';
      })
      .catch(() => '');
    coverCache.set(query, request);
  }
  return request;
}

function BookCover({ reference }: { reference: Reference }) {
  const [coverUrl, setCoverUrl] = useState('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setCoverUrl('');
    setFailed(false);
    void getBookCover(reference).then((url) => {
      if (active) setCoverUrl(url);
    });
    return () => { active = false; };
  }, [reference.id, reference.isbn, reference.title, reference.type]);

  const title = reference.title || 'Untitled';
  const author = reference.authors.map((item) => item.lastName || item.organization || '').filter(Boolean).join(', ');

  return (
    <div className={`reference-cover${coverUrl && !failed ? ' has-cover' : ''}`} aria-label={`Cover for ${title}`}>
      {coverUrl && !failed ? (
        <img src={coverUrl} alt={`Cover of ${title}`} loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <div className="cover-placeholder">
          <span className="cover-mark">{reference.type === 'book' ? 'BOOK' : reference.type.replace('-', ' ')}</span>
          <strong>{title}</strong>
          <span>{author || reference.publisher || 'Research library'}</span>
        </div>
      )}
    </div>
  );
}

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
      <BookCover reference={reference} />
      <div className="reference-card-content">
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
      </div>
    </article>
  );
}
