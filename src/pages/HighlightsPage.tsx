import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllReferences, getHighlightsForReference } from '../db/indexedDb';
import type { Highlight, Reference } from '../models/types';

interface HighlightsPageProps {
  references: Reference[];
  onRefresh: () => void;
}

export function HighlightsPage({ references }: HighlightsPageProps) {
  const [highlights, setHighlights] = useState<Array<{ reference: Reference; highlight: Highlight }>>([]);

  useEffect(() => {
    const load = async () => {
      const entries: Array<{ reference: Reference; highlight: Highlight }> = [];
      const refs = await getAllReferences();
      for (const ref of refs) {
        const list = await getHighlightsForReference(ref.id);
        list.forEach((highlight) => entries.push({ reference: ref, highlight }));
      }
      setHighlights(entries);
    };
    void load();
  }, [references]);

  return (
    <div className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Annotations</p>
          <h2>Highlights</h2>
        </div>
      </header>

      <section className="reference-list">
        {highlights.length ? highlights.map(({ reference, highlight }) => (
          <div className="reference-card" key={highlight.id}>
            <div className="card-header">
              <div>
                <h3>{reference.title}</h3>
                <p className="meta-line">Page {highlight.pageNumber}</p>
              </div>
              <Link to={`/read/${reference.id}`}>Open</Link>
            </div>
            <p>“{highlight.selectedText}”</p>
            {highlight.note ? <p className="muted">Note: {highlight.note}</p> : null}
          </div>
        )) : <div className="empty-state">No saved highlights yet.</div>}
      </section>
    </div>
  );
}
