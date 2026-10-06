import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PdfReader } from '../components/PdfReader';
import { getPdfRecordForReference, getReferenceById, saveReference } from '../db/indexedDb';
import type { Reference } from '../models/types';

interface ReadPageProps {
  references: Reference[];
  onRefresh: () => void;
}

export function ReadPage({ references, onRefresh }: ReadPageProps) {
  const { id } = useParams();
  const [reference, setReference] = useState<Reference | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const current = await getReferenceById(id);
      setReference(current || null);
    };
    void load();
  }, [id, references]);

  const handleProgress = async (page: number, total: number) => {
    if (!reference) return;
    await saveReference({ ...reference, currentPage: page, totalPages: total, readingProgress: total > 0 ? Math.round((page / total) * 100) : 0, lastOpened: new Date().toISOString() });
    onRefresh();
  };

  const pdfRecord = reference ? getPdfRecordForReference(reference.id) : Promise.resolve(undefined);
  if (!reference) return <div className="empty-state">Reference not found.</div>;

  return (
    <div className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Reader</p>
          <h2>{reference.title}</h2>
        </div>
        <div className="toolbar-row">
          <button type="button" className="secondary-button" onClick={() => window.history.back()}>Back</button>
        </div>
      </header>

      {!reference.pdfId && !pdfRecord ? <div className="empty-state">No PDF attached to this reference.</div> : null}
      <PdfReader reference={reference} onProgressChange={handleProgress} />
    </div>
  );
}
