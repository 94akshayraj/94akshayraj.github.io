import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ReferenceCard } from '../components/ReferenceCard';
import type { Reference } from '../models/types';

interface LibraryPageProps {
  references: Reference[];
  onRefresh: () => void;
}

export function LibraryPage({ references, onRefresh }: LibraryPageProps) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredReferences = useMemo(() => {
    return references.filter((reference) => {
      const haystack = [
        reference.title,
        reference.journal,
        reference.publisher,
        reference.doi,
        reference.url,
        reference.tags.join(' '),
        reference.authors.map((author) => `${author.firstName || ''} ${author.lastName || author.organization || ''}`.trim()).join(' '),
      ]
        .join(' ')
        .toLowerCase();

      const matchesSearch = haystack.includes(search.toLowerCase());
      const matchesType = filterType === 'all' || reference.type === filterType;
      const matchesStatus = filterStatus === 'all' || reference.readingStatus === filterStatus;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [filterStatus, filterType, references, search]);

  return (
    <div className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Collection</p>
          <h2>Library</h2>
        </div>
        <Link to="/reference/new" className="primary-button">+ Add Reference</Link>
      </header>

      <div className="toolbar-row filter-row">
        <input type="search" value={search} placeholder="Search references" onChange={(event) => setSearch(event.target.value)} aria-label="Search references" />
        <select value={filterType} onChange={(event) => setFilterType(event.target.value)} aria-label="Filter by type">
          <option value="all">All types</option>
          <option value="book">Book</option>
          <option value="journal-article">Journal Article</option>
          <option value="conference-paper">Conference Paper</option>
          <option value="thesis">Thesis</option>
          <option value="website">Website</option>
          <option value="report">Report</option>
          <option value="other">Other</option>
        </select>
        <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)} aria-label="Filter by reading status">
          <option value="all">All statuses</option>
          <option value="to-read">To Read</option>
          <option value="reading">Reading</option>
          <option value="finished">Finished</option>
        </select>
      </div>

      <section className="reference-list">
        {filteredReferences.length ? filteredReferences.map((reference) => (
          <ReferenceCard key={reference.id} reference={reference} onRefresh={onRefresh} />
        )) : <div className="empty-state">No references match your filters.</div>}
      </section>
    </div>
  );
}
