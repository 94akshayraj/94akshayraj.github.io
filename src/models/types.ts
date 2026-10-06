export type ReferenceType = 'book' | 'journal-article' | 'conference-paper' | 'thesis' | 'website' | 'report' | 'other';
export type ReadingStatus = 'to-read' | 'reading' | 'finished';

export interface Author {
  firstName?: string;
  lastName?: string;
  organization?: string;
}

export interface Reference {
  id: string;
  type: ReferenceType;
  title: string;
  authors: Author[];
  year: string;
  publisher: string;
  journal: string;
  volume: string;
  issue: string;
  pages: string;
  doi: string;
  isbn: string;
  url: string;
  abstract: string;
  keywords: string[];
  tags: string[];
  favorite: boolean;
  readingStatus: ReadingStatus;
  dateAdded: string;
  dateModified: string;
  lastOpened: string;
  currentPage: number;
  totalPages: number;
  readingProgress: number;
  edition: string;
  sourceType: string;
  pdfId?: string;
  note?: string;
}

export interface PDFRecord {
  id: string;
  referenceId: string;
  filename: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  data?: Blob;
}

export interface Highlight {
  id: string;
  referenceId: string;
  pageNumber: number;
  selectedText: string;
  color: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface LibraryNote {
  id: string;
  referenceId: string;
  pageNumber?: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Bookmark {
  id: string;
  referenceId: string;
  pageNumber: number;
  label: string;
  createdAt: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface LibrarySettings {
  key: string;
  value: string;
}

export interface LibraryBackup {
  exportedAt: string;
  version: number;
  references: Reference[];
  pdfs: PDFRecord[];
  highlights: Highlight[];
  notes: LibraryNote[];
  bookmarks: Bookmark[];
  tags: Tag[];
}
