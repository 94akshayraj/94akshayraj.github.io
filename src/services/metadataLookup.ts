import type { Reference, ReferenceType } from '../models/types';

export interface MetadataLookupResult extends Partial<Reference> {
  type?: ReferenceType;
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeIdentifier(value: string): string {
  return value
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
    .replace(/^doi:/i, '')
    .replace(/^isbn:/i, '')
    .trim();
}

function looksLikeDoi(value: string): boolean {
  return /^10\.\d{4,9}\/[\w.-]+$/i.test(value) || /^10\.[^\s/]+\/[\w.-]+$/i.test(value);
}

function looksLikeIsbn(value: string): boolean {
  const digits = value.replace(/[^0-9xX]/g, '');
  return digits.length >= 10 && digits.length <= 13;
}

function toAuthors(rawAuthors: Array<{ family?: string; given?: string; name?: string }> = []): Reference['authors'] {
  return rawAuthors
    .map((author) => {
      if (author.name) {
        const parts = author.name.split(' ');
        const lastName = parts.pop() || '';
        const firstName = parts.join(' ');
        return { firstName, lastName };
      }
      return {
        firstName: author.given || '',
        lastName: author.family || '',
      };
    })
    .filter((author) => Boolean((author as any).organization || author.lastName || author.firstName));
}

async function fetchJson<T>(url: string): Promise<T> {
  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    return response.json() as Promise<T>;
  } catch (error) {
    if (error instanceof Error && /^Request failed with status/.test(error.message)) {
      throw new Error('No metadata was found for that DOI or ISBN. Please check the value or enter it manually.');
    }
    throw new Error('Metadata lookup failed. Please check the DOI or ISBN and try again.');
  }
}

export async function lookupReferenceMetadata(input: string): Promise<MetadataLookupResult> {
  const identifier = normalizeIdentifier(input);
  if (!identifier) throw new Error('Please enter a DOI or ISBN first.');

  if (!looksLikeDoi(identifier) && !looksLikeIsbn(identifier)) {
    throw new Error('That does not look like a valid DOI or ISBN. Please check the value and try again.');
  }

  if (looksLikeDoi(identifier)) {
    const data = await fetchJson<{ message?: any }>(`https://api.crossref.org/works/${encodeURIComponent(identifier)}`);
    const message = data.message || {};
    const authors = toAuthors(message.author || []);
    const title = Array.isArray(message.title) ? message.title[0] : '';
    const year =
      message['published-print']?.['date-parts']?.[0]?.[0] ||
      message['published-online']?.['date-parts']?.[0]?.[0] ||
      message.created?.['date-parts']?.[0]?.[0] ||
      '';
    const type = (message.type || 'book') as string;

    return {
      type:
        type === 'journal-article'
          ? 'journal-article'
          : type === 'proceedings-article' || type === 'conference-paper'
            ? 'conference-paper'
            : type === 'dissertation' || type === 'thesis'
              ? 'thesis'
              : type === 'book'
                ? 'book'
                : 'other',
      title: title || '',
      authors,
      year: String(year || ''),
      publisher: message.publisher || '',
      journal: Array.isArray(message['container-title']) ? message['container-title'][0] : '',
      volume: message.volume || '',
      issue: message.issue || '',
      pages: message.page || '',
      doi: message.DOI || identifier,
      url: message.URL || '',
      abstract: stripHtml(message.abstract || ''),
    };
  }

  const isbn = identifier.replace(/[^0-9xX]/g, '');
  const googleResult = await fetchJson<{ items?: Array<{ volumeInfo?: any }> }>(`https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}`);
  const volume = googleResult.items?.[0]?.volumeInfo;
  if (volume) {
    const authors = (volume.authors || []).map((name: string) => {
      const parts = name.trim().split(' ');
      const lastName = parts[parts.length - 1] || '';
      const firstName = parts.slice(0, -1).join(' ');
      return { firstName, lastName };
    });

    return {
      type: 'book',
      title: volume.title || '',
      authors,
      year: (volume.publishedDate || '').slice(0, 4),
      publisher: volume.publisher || '',
      journal: '',
      volume: '',
      issue: '',
      pages: volume.pageCount ? String(volume.pageCount) : '',
      isbn,
      doi: '',
      url: volume.previewLink || volume.infoLink || '',
      abstract: volume.description || '',
    };
  }

  const openLibraryResult = await fetchJson<{ docs?: Array<{ title?: string; author_name?: string[]; publisher?: string[]; first_publish_year?: number; isbn?: string[] }> }>(`https://openlibrary.org/search.json?isbn=${encodeURIComponent(isbn)}`);
  const doc = openLibraryResult.docs?.[0];
  if (!doc) throw new Error('No metadata was found for that ISBN.');

  const mappedAuthors = (doc.author_name || []).map((name: string) => {
    const parts = name.trim().split(' ');
    const lastName = parts.pop() || '';
    const firstName = parts.join(' ');
    return { firstName, lastName };
  });

  return {
    type: 'book',
    title: doc.title || '',
    authors: mappedAuthors,
    year: doc.first_publish_year ? String(doc.first_publish_year) : '',
    publisher: Array.isArray(doc.publisher) ? doc.publisher[0] : '',
    journal: '',
    volume: '',
    issue: '',
    pages: '',
    isbn: Array.isArray(doc.isbn) ? doc.isbn[0] : isbn,
    doi: '',
    url: '',
    abstract: '',
  };
}
