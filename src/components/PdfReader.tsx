import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { db, getHighlightsForReference, getPdfRecordForReference, saveHighlight } from '../db/indexedDb';
import type { Highlight, Reference } from '../models/types';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

interface PdfReaderProps {
  reference: Reference;
  onProgressChange?: (page: number, totalPages: number) => void;
}

export function PdfReader({ reference, onProgressChange }: PdfReaderProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNumber, setPageNumber] = useState(reference.currentPage || 1);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalPages, setTotalPages] = useState(reference.totalPages || 0);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [pendingSelection, setPendingSelection] = useState<{ text: string; position: { x: number; y: number; width: number; height: number } } | null>(null);
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    const loadPdf = async () => {
      const pdfRecord = await getPdfRecordForReference(reference.id);
      if (!pdfRecord || !pdfRecord.data) {
        setPdfDoc(null);
        return;
      }

      const arrayBuffer = await pdfRecord.data.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const doc = await loadingTask.promise;
      setPdfDoc(doc);
      setTotalPages(doc.numPages);
      onProgressChange?.(pageNumber, doc.numPages);
    };

    void loadPdf();
  }, [reference.id]);

  useEffect(() => {
    const loadHighlights = async () => {
      const all = await getHighlightsForReference(reference.id);
      setHighlights(all);
    };
    void loadHighlights();
  }, [reference.id]);

  useEffect(() => {
    if (!containerRef.current) return;
    const pageCanvas = containerRef.current.querySelector('canvas');
    if (!pageCanvas) return;

    if (!pdfDoc || !pageNumber) return;

    const renderPage = async () => {
      const page = await pdfDoc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: zoom, rotation: (page.rotate + rotation + 360) % 360 });
      const canvas = pageCanvas;
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      if (context) {
        await page.render({ canvasContext: context, viewport }).promise;
      }
      onProgressChange?.(pageNumber, totalPages);
      await db.references.update(reference.id, {
        currentPage: pageNumber,
        totalPages,
        readingProgress: totalPages > 0 ? Math.round((pageNumber / totalPages) * 100) : 0,
        lastOpened: new Date().toISOString(),
      });
    };

    void renderPage();
  }, [pdfDoc, pageNumber, zoom, rotation, totalPages, onProgressChange, reference.id]);

  const handleSearch = async () => {
    if (!pdfDoc || !searchQuery.trim()) return;
    for (let pageIndex = 1; pageIndex <= pdfDoc.numPages; pageIndex += 1) {
      const page = await pdfDoc.getPage(pageIndex);
      const content = await page.getTextContent();
      const texts = content.items.map((item: any) => item.str).join(' ');
      if (texts.toLowerCase().includes(searchQuery.toLowerCase())) {
        setPageNumber(pageIndex);
        break;
      }
    }
  };

  const saveSelectionHighlight = async () => {
    if (!pendingSelection) return;
    const highlight: Highlight = {
      id: crypto.randomUUID(),
      referenceId: reference.id,
      pageNumber,
      selectedText: pendingSelection.text,
      color: '#f7d15c',
      note: noteText || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      position: pendingSelection.position,
    };
    await saveHighlight(highlight);
    setPendingSelection(null);
    setNoteText('');
    const all = await getHighlightsForReference(reference.id);
    setHighlights(all);
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.toString().trim().length < 3) return;
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;
    setPendingSelection({
      text: selection.toString().trim(),
      position: {
        x: rect.left - containerRect.left,
        y: rect.top - containerRect.top,
        width: Math.max(rect.width, 80),
        height: Math.max(rect.height, 14),
      },
    });
  };

  if (!pdfDoc) {
    return <div className="empty-state">No PDF available for this reference yet.</div>;
  }

  return (
    <div className="pdf-reader">
      <div className="reader-toolbar">
        <div className="reader-control-group page-controls">
          <button type="button" onClick={() => setPageNumber((current) => Math.max(1, current - 1))} aria-label="Previous page" title="Previous page">‹</button>
          <label className="page-counter">
            <input type="number" value={pageNumber} min={1} max={totalPages || 1} onChange={(event) => setPageNumber(Math.min(totalPages || 1, Math.max(1, Number(event.target.value))))} aria-label="Page number" />
            <span>of {totalPages}</span>
          </label>
          <button type="button" onClick={() => setPageNumber((current) => Math.min(totalPages || current, current + 1))} aria-label="Next page" title="Next page">›</button>
        </div>
        <div className="reader-control-group zoom-controls">
          <button type="button" onClick={() => setZoom((value) => Math.max(0.4, Number((value - 0.1).toFixed(2))))} aria-label="Zoom out" title="Zoom out">−</button>
          <span>{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => setZoom((value) => Math.min(2.5, Number((value + 0.1).toFixed(2))))} aria-label="Zoom in" title="Zoom in">+</button>
        </div>
        <div className="reader-control-group rotation-controls">
          <button type="button" onClick={() => setRotation((value) => (value + 270) % 360)} aria-label="Rotate counterclockwise" title="Rotate counterclockwise">↶</button>
          <button type="button" onClick={() => setRotation((value) => (value + 90) % 360)} aria-label="Rotate clockwise" title="Rotate clockwise">↷</button>
          {rotation !== 0 ? <button type="button" onClick={() => setRotation(0)} title="Reset rotation">Reset</button> : null}
        </div>
        <form className="reader-search" onSubmit={(event) => { event.preventDefault(); void handleSearch(); }}>
          <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Find in document" aria-label="Search within PDF" />
          <button type="submit" aria-label="Search PDF">Find</button>
        </form>
      </div>

      <div className="pdf-stage" ref={containerRef} onMouseUp={handleTextSelection}>
        <canvas aria-label="PDF page" />
        {highlights.filter((item) => item.pageNumber === pageNumber).map((item) => (
          <div
            key={item.id}
            className="highlight-overlay"
            style={{
              left: `${(item.position?.x || 30)}px`,
              top: `${(item.position?.y || 30)}px`,
              width: `${(item.position?.width || 120)}px`,
              height: `${(item.position?.height || 18)}px`,
              background: item.color,
            }}
            title={item.selectedText}
          />
        ))}
      </div>

      {pendingSelection ? (
        <div className="selection-panel">
          <p>Selected: “{pendingSelection.text}”</p>
          <textarea value={noteText} onChange={(event) => setNoteText(event.target.value)} placeholder="Add note to highlight" />
          <div className="toolbar-row">
            <button type="button" className="primary-button" onClick={() => void saveSelectionHighlight()}>Save Highlight</button>
            <button type="button" className="secondary-button" onClick={() => setPendingSelection(null)}>Cancel</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
