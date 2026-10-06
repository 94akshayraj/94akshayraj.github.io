import { useEffect, useState } from 'react';
import type { Reference } from '../models/types';
import { getAllReferences, getAllTags } from '../db/indexedDb';

interface TagsPageProps {
  references: Reference[];
  onRefresh: () => void;
}

export function TagsPage({ references }: TagsPageProps) {
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      const allTags = await getAllTags();
      setTags(allTags.map((tag) => tag.name));
    };
    void load();
  }, [references]);

  return (
    <div className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Organization</p>
          <h2>Tags</h2>
        </div>
      </header>

      <div className="tag-cloud">
        {tags.length ? tags.map((tag) => (
          <span key={tag} className="tag-pill">{tag}</span>
        )) : <span className="muted">No tags yet.</span>}
      </div>
    </div>
  );
}
