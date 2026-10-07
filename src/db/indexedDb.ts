import Dexie, { Table } from 'dexie';
import type { Bookmark, Highlight, LibraryNote, LibrarySettings, PDFRecord, Reference, Tag } from '../models/types';

class ResearchDb extends Dexie {
  references!: Table<Reference, string>;
  pdfs!: Table<PDFRecord, string>;
  highlights!: Table<Highlight, string>;
  notes!: Table<LibraryNote, string>;
  bookmarks!: Table<Bookmark, string>;
  tags!: Table<Tag, string>;
  settings!: Table<LibrarySettings, string>;

  constructor() {
    super('research-library-db');
    this.version(1).stores({
      references: 'id, type, year, title, readingStatus, favorite, dateAdded, dateModified, lastOpened',
      pdfs: 'id, referenceId, uploadedAt',
      highlights: 'id, referenceId, pageNumber, createdAt',
      notes: 'id, referenceId, pageNumber, createdAt',
      bookmarks: 'id, referenceId, pageNumber, createdAt',
      tags: 'id, name',
      settings: 'key',
    });
  }
}

export const db = new ResearchDb();

export async function getAllReferences(): Promise<Reference[]> {
  return db.references.orderBy('dateModified').reverse().toArray();
}

export async function getReferenceById(id: string): Promise<Reference | undefined> {
  return db.references.get(id);
}

export async function saveReference(reference: Reference): Promise<void> {
  await db.references.put(reference);
}

export async function saveReferenceWithPdf(reference: Reference, pdf?: PDFRecord): Promise<void> {
  await db.transaction('rw', db.references, db.pdfs, async () => {
    if (pdf) {
      await db.pdfs.where('referenceId').equals(reference.id).delete();
      await db.pdfs.put(pdf);
    }
    await db.references.put(reference);
  });
}

export async function deleteReference(referenceId: string): Promise<void> {
  await db.references.delete(referenceId);
  await db.pdfs.where('referenceId').equals(referenceId).delete();
  await db.highlights.where('referenceId').equals(referenceId).delete();
  await db.notes.where('referenceId').equals(referenceId).delete();
  await db.bookmarks.where('referenceId').equals(referenceId).delete();
}

export async function getHighlightsForReference(referenceId: string): Promise<Highlight[]> {
  return db.highlights.where('referenceId').equals(referenceId).sortBy('pageNumber');
}

export async function saveHighlight(highlight: Highlight): Promise<void> {
  await db.highlights.put(highlight);
}

export async function getNotesForReference(referenceId: string): Promise<LibraryNote[]> {
  return db.notes.where('referenceId').equals(referenceId).sortBy('createdAt');
}

export async function saveNote(note: LibraryNote): Promise<void> {
  await db.notes.put(note);
}

export async function saveBookmark(bookmark: Bookmark): Promise<void> {
  await db.bookmarks.put(bookmark);
}

export async function savePdfRecord(pdf: PDFRecord): Promise<void> {
  await db.pdfs.put(pdf);
}

export async function getPdfRecordForReference(referenceId: string, pdfId?: string): Promise<PDFRecord | undefined> {
  if (pdfId) {
    const preferred = await db.pdfs.get(pdfId);
    if (preferred?.referenceId === referenceId) return preferred;
  }
  return db.pdfs.where('referenceId').equals(referenceId).first();
}

export async function getAllTags(): Promise<Tag[]> {
  return db.tags.orderBy('name').toArray();
}

export async function saveTag(tag: Tag): Promise<void> {
  await db.tags.put(tag);
}

export async function clearAllLibrary(): Promise<void> {
  await db.transaction('rw', db.references, db.pdfs, db.highlights, db.notes, db.bookmarks, async () => {
    await db.references.clear();
    await db.pdfs.clear();
    await db.highlights.clear();
    await db.notes.clear();
    await db.bookmarks.clear();
  });
  await db.tags.clear();
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.settings.put({ key, value });
}

export async function getSetting(key: string): Promise<string | undefined> {
  const entry = await db.settings.get(key);
  return entry?.value;
}
