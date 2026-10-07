import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getReferenceById, saveReferenceWithPdf } from '../db/indexedDb';
import type { PDFRecord, Reference, ReferenceType } from '../models/types';
import { parseApaBookCitation } from '../citation/apa';
import { lookupReferenceMetadata } from '../services/metadataLookup';
import { randomId } from '../utils/helpers';

interface ReferenceFormPageProps {
  references: Reference[];
  onRefresh: () => void;
}

const defaultReference = (): Reference => ({
  id: randomId('ref'),
  type: 'journal-article',
  title: '',
  authors: [],
  year: '',
  publisher: '',
  journal: '',
  volume: '',
  issue: '',
  pages: '',
  doi: '',
  isbn: '',
  url: '',
  abstract: '',
  keywords: [],
  tags: [],
  favorite: false,
  readingStatus: 'to-read',
  dateAdded: new Date().toISOString(),
  dateModified: new Date().toISOString(),
  lastOpened: '',
  currentPage: 0,
  totalPages: 0,
  readingProgress: 0,
  edition: '',
  sourceType: 'journal-article',
  note: '',
});

export function ReferenceFormPage({ onRefresh }: ReferenceFormPageProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [reference, setReference] = useState<Reference>(defaultReference());
  const [file, setFile] = useState<File | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isCitationDialogOpen, setIsCitationDialogOpen] = useState(false);
  const [citationText, setCitationText] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!id || id === 'new') {
        setReference(defaultReference());
        return;
      }
      const existing = await getReferenceById(id);
      if (existing) {
        setReference(existing);
      }
    };
    void load();
  }, [id]);

  const typeFields = useMemo(() => ({
    book: ['title', 'authors', 'year', 'publisher', 'edition', 'doi', 'isbn', 'url'],
    'journal-article': ['title', 'authors', 'year', 'journal', 'volume', 'issue', 'pages', 'doi', 'url'],
    'conference-paper': ['title', 'authors', 'year', 'journal', 'pages', 'doi', 'url'],
    thesis: ['title', 'authors', 'year', 'publisher', 'url'],
    website: ['title', 'authors', 'year', 'publisher', 'url'],
    report: ['title', 'authors', 'year', 'publisher', 'doi', 'url'],
    other: ['title', 'authors', 'year', 'publisher', 'url'],
  } as Record<ReferenceType, string[]>), []);

  const visibleFields = typeFields[reference.type] || typeFields.book;

  const handleChange = (field: keyof Reference, value: any) => {
    setReference((current) => ({ ...current, [field]: value }));
  };

  const parseAuthors = (input: string): { firstName?: string; lastName?: string; organization?: string }[] => {
    const separated = input
      .split(/;|\n|,\s*(?=[A-Z][a-z]+\s+[A-Z][a-z]+)/)
      .map((item) => item.trim())
      .filter(Boolean);

    return separated.map((entry) => {
      if (entry.includes(',') && !entry.includes(' ')) {
        return { organization: entry };
      }
      const [first, ...rest] = entry.split(' ');
      if (!rest.length) return { organization: entry };
      return { firstName: first, lastName: rest.join(' ') };
    });
  };

  const handleLookup = async () => {
    const identifier = (reference.doi || reference.isbn || '').trim();
    if (!identifier) {
      setStatusMessage('Enter a DOI or ISBN to auto-fill metadata.');
      return;
    }

    try {
      setIsLookingUp(true);
      setStatusMessage('Looking up metadata…');
      const result = await lookupReferenceMetadata(identifier);
      setReference((current) => ({
        ...current,
        ...result,
        title: result.title || current.title,
        authors: result.authors && result.authors.length ? result.authors : current.authors,
        year: result.year || current.year,
        publisher: result.publisher || current.publisher,
        journal: result.journal || current.journal,
        volume: result.volume || current.volume,
        issue: result.issue || current.issue,
        pages: result.pages || current.pages,
        doi: result.doi || current.doi,
        isbn: result.isbn || current.isbn,
        url: result.url || current.url,
        abstract: result.abstract || current.abstract,
        type: result.type || current.type,
        sourceType: result.type || current.sourceType,
      }));
      setStatusMessage('Metadata populated successfully.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Metadata lookup failed.');
    } finally {
      setIsLookingUp(false);
    }
  };

  const applyParsedCitation = () => {
    if (!citationText.trim()) {
      setStatusMessage('Paste a full APA 7 book citation first.');
      return;
    }

    try {
      const parsed = parseApaBookCitation(citationText);
      setReference((current) => ({
        ...current,
        type: 'book',
        sourceType: 'book',
        title: parsed.title || current.title,
        authors: parsed.authors && parsed.authors.length ? parsed.authors : current.authors,
        year: parsed.year || current.year,
        publisher: parsed.publisher || current.publisher,
        doi: parsed.doi || current.doi,
        url: parsed.url || current.url,
        edition: parsed.edition || current.edition,
      }));
      setStatusMessage('Book metadata filled from the APA 7 citation.');
      setIsCitationDialogOpen(false);
      setCitationText('');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Please paste a valid APA 7 book citation.');
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const finalReference: Reference = {
      ...reference,
      authors: reference.authors.length ? reference.authors : parseAuthors((document.getElementById('authors-input') as HTMLInputElement)?.value || ''),
      keywords: reference.keywords.length ? reference.keywords : (reference.abstract || '').split(/[,;\n]+/).map((word) => word.trim()).filter(Boolean),
      dateModified: new Date().toISOString(),
      readingProgress: Math.min(Math.max(reference.readingProgress || 0, 0), 100),
      sourceType: reference.type,
    };

    if (!finalReference.id) {
      finalReference.id = randomId('ref');
    }
    if (!finalReference.dateAdded) {
      finalReference.dateAdded = new Date().toISOString();
    }

    let pdfRecord: PDFRecord | undefined;
    if (file) {
      pdfRecord = {
        id: randomId('pdf'),
        referenceId: finalReference.id,
        filename: file.name,
        mimeType: file.type || 'application/pdf',
        size: file.size,
        uploadedAt: new Date().toISOString(),
        data: file,
      };
      finalReference.pdfId = pdfRecord.id;
    }

    try {
      setIsSaving(true);
      await saveReferenceWithPdf(finalReference, pdfRecord);
      setStatusMessage('Reference saved successfully.');
      onRefresh();
      navigate(`/reference/${finalReference.id}`);
    } catch (error) {
      setStatusMessage(`Unable to save reference: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Reference</p>
          <h2>{id && id !== 'new' ? 'Edit reference' : 'Add reference'}</h2>
        </div>
      </header>

      <form className="reference-form" onSubmit={handleSubmit}>
        <div className="toolbar-row" style={{ marginBottom: '18px' }}>
          <button type="button" className="secondary-button" onClick={() => setIsCitationDialogOpen(true)}>
            Paste APA 7 citation
          </button>
        </div>

        <div className="form-grid">
          <label>
            Type
            <select value={reference.type} onChange={(event) => handleChange('type', event.target.value as ReferenceType)}>
              <option value="book">Book</option>
              <option value="journal-article">Journal Article</option>
              <option value="conference-paper">Conference Paper</option>
              <option value="thesis">Thesis</option>
              <option value="website">Website</option>
              <option value="report">Report</option>
              <option value="other">Other</option>
            </select>
          </label>

          <label>
            Title
            <input value={reference.title} onChange={(event) => handleChange('title', event.target.value)} />
          </label>

          <label className="full-width">
            Authors
            <input id="authors-input" value={reference.authors.map((author) => (author.organization || `${author.firstName || ''} ${author.lastName || ''}`.trim())).join('; ')} onChange={(event) => handleChange('authors', parseAuthors(event.target.value))} />
          </label>

          {visibleFields.includes('year') && (
            <label>
              Year
              <input value={reference.year} onChange={(event) => handleChange('year', event.target.value)} />
            </label>
          )}

          {visibleFields.includes('publisher') && (
            <label>
              Publisher
              <input value={reference.publisher} onChange={(event) => handleChange('publisher', event.target.value)} />
            </label>
          )}

          {visibleFields.includes('journal') && (
            <label>
              Journal
              <input value={reference.journal} onChange={(event) => handleChange('journal', event.target.value)} />
            </label>
          )}

          {visibleFields.includes('volume') && (
            <label>
              Volume
              <input value={reference.volume} onChange={(event) => handleChange('volume', event.target.value)} />
            </label>
          )}

          {visibleFields.includes('issue') && (
            <label>
              Issue
              <input value={reference.issue} onChange={(event) => handleChange('issue', event.target.value)} />
            </label>
          )}

          {visibleFields.includes('pages') && (
            <label>
              Pages
              <input value={reference.pages} onChange={(event) => handleChange('pages', event.target.value)} />
            </label>
          )}

          {visibleFields.includes('doi') && (
            <label>
              DOI
              <div className="lookup-row">
                <input value={reference.doi} onChange={(event) => handleChange('doi', event.target.value)} />
                <button type="button" className="secondary-button" onClick={() => void handleLookup()} disabled={isLookingUp}>
                  {isLookingUp ? 'Looking up…' : 'Autofill'}
                </button>
              </div>
            </label>
          )}

          {visibleFields.includes('isbn') && (
            <label>
              ISBN
              <div className="lookup-row">
                <input value={reference.isbn} onChange={(event) => handleChange('isbn', event.target.value)} />
                <button type="button" className="secondary-button" onClick={() => void handleLookup()} disabled={isLookingUp}>
                  {isLookingUp ? 'Looking up…' : 'Autofill'}
                </button>
              </div>
            </label>
          )}

          {visibleFields.includes('url') && (
            <label>
              URL
              <input value={reference.url} onChange={(event) => handleChange('url', event.target.value)} />
            </label>
          )}

          <label className="full-width">
            Abstract
            <textarea value={reference.abstract} onChange={(event) => handleChange('abstract', event.target.value)} rows={4} />
          </label>

          <label className="full-width">
            Tags (comma separated)
            <input value={reference.tags.join(', ')} onChange={(event) => handleChange('tags', event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean))} />
          </label>

          <label className="full-width">
            Attach PDF
            <input type="file" accept="application/pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} />
          </label>
        </div>

        <div className="toolbar-row">
          <button type="submit" className="primary-button" disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save reference'}
          </button>
          <button type="button" className="secondary-button" onClick={() => navigate(-1)}>Cancel</button>
        </div>

        {statusMessage ? <p className="status-box">{statusMessage}</p> : null}
      </form>

      {isCitationDialogOpen ? (
        <div className="citation-dialog-overlay" onClick={() => setIsCitationDialogOpen(false)}>
          <div className="citation-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="dialog-header">
              <h3>Paste APA 7 book citation</h3>
              <button type="button" className="secondary-button" onClick={() => setIsCitationDialogOpen(false)}>
                Close
              </button>
            </div>
            <textarea
              value={citationText}
              onChange={(event) => setCitationText(event.target.value)}
              rows={8}
              placeholder="Miller, A. L. (2013). The social web: How the internet is transforming society. Penguin."
            />
            <div className="toolbar-row">
              <button type="button" className="primary-button" onClick={applyParsedCitation}>
                Fill book details
              </button>
              <button type="button" className="secondary-button" onClick={() => setIsCitationDialogOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
