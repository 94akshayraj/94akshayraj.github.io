import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getPdfRecordForReference, getReferenceById, saveReference } from '../db/indexedDb';
import type { Reference } from '../models/types';

interface ReadPageProps {
  references: Reference[];
  onRefresh: () => void;
}

export function ReadPage({ references, onRefresh }: ReadPageProps) {
  const { id } = useParams();
  const [reference, setReference] = useState<Reference | null>(null);
  const [pdfFile, setPdfFile] = useState<{ blob: Blob; filename: string } | null>(null);
  const [readerLoaded, setReaderLoaded] = useState(false);
  const readerFrame = useRef<HTMLIFrameElement | null>(null);
  const currentReference = useRef<Reference | null>(null);

  useEffect(() => {
    currentReference.current = reference;
  }, [reference]);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const current = await getReferenceById(id);
      setReference(current || null);
    };
    void load();
  }, [id, references]);

  useEffect(() => {
    let active = true;
    setPdfFile(null);
    setReaderLoaded(false);
    if (!reference) return () => { active = false; };

    void getPdfRecordForReference(reference.id, reference.pdfId).then((record) => {
      if (active && record?.data) setPdfFile({ blob: record.data, filename: record.filename });
    });
    return () => { active = false; };
  }, [reference?.id]);

  useEffect(() => {
    if (!readerLoaded || !pdfFile || !readerFrame.current?.contentWindow) return;
    readerFrame.current.contentWindow.postMessage({
      type: 'library-reader-open-pdf',
      blob: pdfFile.blob,
      filename: pdfFile.filename,
      startPage: reference?.currentPage || 1,
    }, window.location.origin);
  }, [readerLoaded, pdfFile, reference?.currentPage]);

  useEffect(() => {
    const handleReaderMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== readerFrame.current?.contentWindow) return;
      if (event.data?.type !== 'library-reader-progress') return;

      const current = currentReference.current;
      const page = Number(event.data.page);
      const total = Number(event.data.total);
      if (!current || !Number.isFinite(page) || !Number.isFinite(total) || page < 1 || total < 1) return;
      if (current.currentPage === page && current.totalPages === total) return;

      const updated = {
        ...current,
        currentPage: page,
        totalPages: total,
        readingProgress: Math.round((page / total) * 100),
        lastOpened: new Date().toISOString(),
      };
      currentReference.current = updated;
      setReference(updated);
      void saveReference(updated).then(onRefresh);
    };

    window.addEventListener('message', handleReaderMessage);
    return () => window.removeEventListener('message', handleReaderMessage);
  }, [onRefresh]);

  if (!reference) return <div className="empty-state">Reference not found.</div>;

  const toggleFullScreen = async () => {
    const shell = document.getElementById('library-reader-shell');
    if (!shell) return;

    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    await shell.requestFullscreen();
  };

  return (
    <div className="page-shell library-reader-page">
      <div className="library-reader-shell" id="library-reader-shell">
        <div className="library-reader-toolbar">
          <button type="button" className="secondary-button" onClick={() => window.history.back()}>Back</button>
          <button type="button" className="primary-button" onClick={() => void toggleFullScreen()}>Fullscreen</button>
        </div>

        {!pdfFile ? (
          <div className="empty-state">No PDF is attached to this reference yet.</div>
        ) : (
          <iframe
            ref={readerFrame}
            className="ai-reader-frame"
            src="../reader/?embedded=library"
            title={`AI PDF reader: ${reference.title}`}
            onLoad={() => setReaderLoaded(true)}
          />
        )}
      </div>
    </div>
  );
}
