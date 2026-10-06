import { Link } from 'react-router-dom';
import { formatDate } from '../utils/helpers';
import type { Reference } from '../models/types';

interface DashboardPageProps {
  references: Reference[];
}

export function DashboardPage({ references }: DashboardPageProps) {
  const total = references.length;
  const books = references.filter((item) => item.type === 'book').length;
  const papers = references.filter((item) => ['journal-article', 'conference-paper', 'thesis', 'report'].includes(item.type)).length;
  const withPdf = references.filter((item) => Boolean(item.pdfId)).length;
  const highlights = references.reduce((sum, ref) => sum + (ref.tags.length || 0), 0);
  const notes = references.filter((item) => Boolean(item.note)).length;
  const toRead = references.filter((item) => item.readingStatus === 'to-read').length;
  const reading = references.filter((item) => item.readingStatus === 'reading').length;
  const finished = references.filter((item) => item.readingStatus === 'finished').length;
  const favorite = references.filter((item) => item.favorite).length;
  const recent = [...references].sort((a, b) => (b.dateAdded || '').localeCompare(a.dateAdded || '')).slice(0, 5);

  return (
    <div className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Overview</p>
          <h2>Dashboard</h2>
        </div>
        <Link to="/library" className="secondary-button">Open library</Link>
      </header>

      <section className="stats-grid">
        <div className="stat-card"><span>Total references</span><strong>{total}</strong></div>
        <div className="stat-card"><span>Total books</span><strong>{books}</strong></div>
        <div className="stat-card"><span>Research papers</span><strong>{papers}</strong></div>
        <div className="stat-card"><span>With PDFs</span><strong>{withPdf}</strong></div>
        <div className="stat-card"><span>Highlights</span><strong>{highlights}</strong></div>
        <div className="stat-card"><span>Notes</span><strong>{notes}</strong></div>
        <div className="stat-card"><span>To read</span><strong>{toRead}</strong></div>
        <div className="stat-card"><span>Reading</span><strong>{reading}</strong></div>
        <div className="stat-card"><span>Finished</span><strong>{finished}</strong></div>
        <div className="stat-card"><span>Favorites</span><strong>{favorite}</strong></div>
      </section>

      <section className="panel-grid">
        <div className="panel-box">
          <h3>Recently added</h3>
          <ul className="simple-list">
            {recent.length ? recent.map((ref) => (
              <li key={ref.id}><Link to={`/reference/${ref.id}`}>{ref.title}</Link><span>{formatDate(ref.dateAdded)}</span></li>
            )) : <li>No references yet.</li>}
          </ul>
        </div>

        <div className="panel-box">
          <h3>Most used tags</h3>
          <div className="tag-cloud">
            {Array.from(new Set(references.flatMap((ref) => ref.tags))).slice(0, 10).map((tag) => (
              <span key={tag} className="tag-pill">{tag}</span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
