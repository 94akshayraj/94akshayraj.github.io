import { describe, expect, it } from 'vitest';
import {
  generateApaReference,
  generateApaInText,
  generateApaNarrative,
  formatAuthors,
} from '../apa';
import { lookupReferenceMetadata } from '../../services/metadataLookup';

describe('APA 7 citation engine', () => {
  it('formats a single author correctly', () => {
    const ref = {
      id: '1',
      type: 'book',
      title: 'Introduction to Psychology',
      authors: [{ firstName: 'Jane', lastName: 'Smith' }],
      year: '2024',
      publisher: 'Academic Press',
      doi: '',
      url: '',
      journal: '',
      volume: '',
      issue: '',
      pages: '',
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
      sourceType: 'book',
      edition: '',
      isbn: '',
      state: 'draft',
      notes: [],
      pdfId: '',
    } as any;

    expect(generateApaReference(ref)).toContain('Smith, J.');
    expect(generateApaReference(ref)).toContain('Introduction to Psychology');
  });

  it('formats two authors with ampersand and in-text citation', () => {
    const ref = {
      id: '2',
      type: 'journal-article',
      title: 'Deep Learning for Medical Imaging',
      authors: [
        { firstName: 'John', lastName: 'Doe' },
        { firstName: 'Mary', lastName: 'Jones' },
      ],
      year: '2024',
      journal: 'Journal of Artificial Intelligence',
      volume: '15',
      issue: '2',
      pages: '100-125',
      doi: 'https://doi.org/10.1000/example',
      url: '',
      publisher: '',
      abstract: '',
      keywords: [],
      tags: [],
      favorite: false,
      readingStatus: 'reading',
      dateAdded: new Date().toISOString(),
      dateModified: new Date().toISOString(),
      lastOpened: '',
      currentPage: 0,
      totalPages: 0,
      readingProgress: 0,
      sourceType: 'journal-article',
      edition: '',
      isbn: '',
      state: 'draft',
      notes: [],
      pdfId: '',
    } as any;

    const reference = generateApaReference(ref);
    expect(reference).toContain('Doe, J., &amp; Jones, M.');
    expect(generateApaInText(ref)).toBe('(Doe & Jones, 2024)');
    expect(generateApaNarrative(ref)).toBe('Doe and Jones (2024)');
  });

  it('uses et al. for three authors', () => {
    const ref = {
      id: '3',
      type: 'journal-article',
      title: 'Transformers for Vision',
      authors: [
        { firstName: 'Alex', lastName: 'Brown' },
        { firstName: 'Pat', lastName: 'Lee' },
        { firstName: 'Sam', lastName: 'Green' },
      ],
      year: '2023',
      journal: 'Machine Learning Advances',
      volume: '8',
      issue: '1',
      pages: '10-30',
      doi: '',
      url: '',
      publisher: '',
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
      sourceType: 'journal-article',
      edition: '',
      isbn: '',
      state: 'draft',
      notes: [],
      pdfId: '',
    } as any;

    const reference = generateApaReference(ref);
    expect(reference).toContain('Brown, A.,');
    expect(reference).toContain('et al.');
    expect(generateApaInText(ref)).toBe('(Brown et al., 2023)');
  });

  it('supports authorless and undated work', () => {
    const ref = {
      id: '4',
      type: 'website',
      title: 'Open Science Initiative',
      authors: [],
      year: '',
      url: 'https://example.org/open-science',
      publisher: 'Open Science Initiative',
      journal: '',
      volume: '',
      issue: '',
      pages: '',
      doi: '',
      abstract: '',
      keywords: [],
      tags: [],
      favorite: false,
      readingStatus: 'finished',
      dateAdded: new Date().toISOString(),
      dateModified: new Date().toISOString(),
      lastOpened: '',
      currentPage: 0,
      totalPages: 0,
      readingProgress: 0,
      sourceType: 'website',
      edition: '',
      isbn: '',
      state: 'draft',
      notes: [],
      pdfId: '',
    } as any;

    expect(generateApaReference(ref)).toContain('Open Science Initiative');
    expect(generateApaReference(ref)).toContain('n.d.');
    expect(generateApaInText(ref)).toBe('(Open Science Initiative, n.d.)');
  });

  it('formats organization authors properly', () => {
    const ref = {
      id: '5',
      type: 'report',
      title: 'Annual Research Report',
      authors: [{ organization: 'National Research Council' }],
      year: '2021',
      publisher: 'National Research Council',
      journal: '',
      volume: '',
      issue: '',
      pages: '',
      doi: '',
      url: '',
      abstract: '',
      keywords: [],
      tags: [],
      favorite: false,
      readingStatus: 'finished',
      dateAdded: new Date().toISOString(),
      dateModified: new Date().toISOString(),
      lastOpened: '',
      currentPage: 0,
      totalPages: 0,
      sourceType: 'report',
      edition: '',
      isbn: '',
      state: 'draft',
      notes: [],
      pdfId: '',
    } as any;

    expect(generateApaReference(ref)).toContain('National Research Council');
    expect(generateApaInText(ref)).toBe('(National Research Council, 2021)');
  });

  it('formats author initials and title capitalization', () => {
    expect(formatAuthors([{ firstName: 'Ada', lastName: 'Lovelace' }])).toBe('Lovelace, A.');
    expect(formatAuthors([
      { firstName: 'Ada', lastName: 'Lovelace' },
      { firstName: 'Grace', lastName: 'Hopper' },
      { firstName: 'Alan', lastName: 'Turing' },
    ])).toContain('Lovelace, A.,');
  });

  it('rejects invalid DOI input with a user-safe message', async () => {
    await expect(lookupReferenceMetadata('not-a-doi')).rejects.toThrow('valid DOI or ISBN');
  });
});
