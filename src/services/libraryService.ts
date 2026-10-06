import JSZip from 'jszip';
import { db, getAllReferences, getHighlightsForReference, getNotesForReference, getPdfRecordForReference, saveHighlight, saveNote, savePdfRecord, saveReference } from '../db/indexedDb';
import type { Bookmark, Highlight, LibraryBackup, LibraryNote, PDFRecord, Reference } from '../models/types';

export async function updateReadingProgress(referenceId: string, page: number, totalPages: number) {
  const reference = await db.references.get(referenceId);
  if (!reference) return;

  const progress = totalPages > 0 ? Math.round((page / totalPages) * 100) : 0;
  const updated = {
    ...reference,
    currentPage: page,
    totalPages,
    readingProgress: progress,
    lastOpened: new Date().toISOString(),
    dateModified: new Date().toISOString(),
  };
  await saveReference(updated);
}

export async function addGeneralNote(referenceId: string, title: string, content: string) {
  const note: LibraryNote = {
    id: crypto.randomUUID(),
    referenceId,
    title,
    content,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await db.notes.put(note);
}

export async function addHighlight(referenceId: string, pageNumber: number, text: string, color: string, note?: string, position?: Highlight['position']) {
  const highlight: Highlight = {
    id: crypto.randomUUID(),
    referenceId,
    pageNumber,
    selectedText: text,
    color,
    note,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    position,
  };
  await saveHighlight(highlight);
}

export async function addBookmark(referenceId: string, pageNumber: number, label: string) {
  const bookmark: Bookmark = {
    id: crypto.randomUUID(),
    referenceId,
    pageNumber,
    label,
    createdAt: new Date().toISOString(),
  };
  await db.bookmarks.put(bookmark);
}

export function buildLibrarySearchText(reference: Reference): string {
  return [
    reference.title,
    reference.authors.map((author) => [author.firstName, author.lastName, author.organization].join(' ')).join(' '),
    reference.journal,
    reference.publisher,
    reference.doi,
    reference.isbn,
    reference.tags.join(' '),
    reference.abstract,
    reference.note || '',
  ]
    .join(' ')
    .toLowerCase();
}

export async function exportLibraryToZip(fileName = 'research-library-backup.zip') {
  const references = await getAllReferences();
  const backup: LibraryBackup = {
    exportedAt: new Date().toISOString(),
    version: 1,
    references,
    pdfs: await db.pdfs.toArray(),
    highlights: await db.highlights.toArray(),
    notes: await db.notes.toArray(),
    bookmarks: await db.bookmarks.toArray(),
    tags: await db.tags.toArray(),
  };

  const zip = new JSZip();
  zip.file('library.json', JSON.stringify(backup, null, 2));

  for (const pdf of backup.pdfs) {
    if (pdf.data) {
      zip.file(`pdfs/${pdf.referenceId}-${pdf.filename}`, pdf.data);
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
  return blob;
}

export async function importLibraryFromZip(file: File, mode: 'merge' | 'replace') {
  const zip = await JSZip.loadAsync(file);
  const libraryJson = await zip.file('library.json')?.async('text');

  if (!libraryJson) {
    throw new Error('Backup file does not contain library.json');
  }

  const data = JSON.parse(libraryJson) as LibraryBackup;

  if (mode === 'replace') {
    await db.transaction('rw', db.references, db.pdfs, db.highlights, db.notes, db.bookmarks, async () => {
      await db.references.clear();
      await db.pdfs.clear();
      await db.highlights.clear();
      await db.notes.clear();
      await db.bookmarks.clear();

      if (data.references?.length) await db.references.bulkPut(data.references);
      if (data.pdfs?.length) {
        for (const pdf of data.pdfs) {
          const zipEntry = zip.file(`pdfs/${pdf.referenceId}-${pdf.filename}`);
          if (zipEntry) {
            pdf.data = await zipEntry.async('blob');
          }
          await db.pdfs.put(pdf);
        }
      }
      if (data.highlights?.length) await db.highlights.bulkPut(data.highlights);
      if (data.notes?.length) await db.notes.bulkPut(data.notes);
      if (data.bookmarks?.length) await db.bookmarks.bulkPut(data.bookmarks);
    });
    await db.tags.clear();
    if (data.tags?.length) await db.tags.bulkPut(data.tags);
    return;
  }

  if (data.references?.length) {
    await db.references.bulkPut(data.references.map((ref) => ({ ...ref })));
  }
  if (data.highlights?.length) await db.highlights.bulkPut(data.highlights);
  if (data.notes?.length) await db.notes.bulkPut(data.notes);
  if (data.bookmarks?.length) await db.bookmarks.bulkPut(data.bookmarks);
  if (data.tags?.length) await db.tags.bulkPut(data.tags);

  if (data.pdfs?.length) {
    for (const pdf of data.pdfs) {
      const zipEntry = zip.file(`pdfs/${pdf.referenceId}-${pdf.filename}`);
      if (zipEntry) {
        pdf.data = await zipEntry.async('blob');
      }
      await savePdfRecord(pdf);
    }
  }
}

export async function getRecentReferences(limit = 5) {
  const refs = await getAllReferences();
  return refs.slice(0, limit);
}

export async function getHighlights() {
  const refs = await getAllReferences();
  const all: Array<{ reference: Reference; highlight: Highlight }> = [];
  for (const ref of refs) {
    const highlights = await getHighlightsForReference(ref.id);
    highlights.forEach((highlight) => all.push({ reference: ref, highlight }));
  }
  return all;
}

export async function getReferenceNotes(referenceId: string) {
  return getNotesForReference(referenceId);
}
