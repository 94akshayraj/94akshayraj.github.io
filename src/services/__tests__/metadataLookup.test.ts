import { describe, expect, it, vi, beforeEach } from 'vitest';
import { lookupReferenceMetadata } from '../metadataLookup';

describe('metadata lookup', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('accepts a DOI URL and extracts metadata', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          title: ['Example Research Article'],
          author: [{ family: 'Smith', given: 'Jane' }],
          publisher: 'Academic Press',
          'container-title': ['Journal of Testing'],
          volume: '12',
          issue: '3',
          page: '45-60',
          DOI: '10.1000/example',
          URL: 'https://example.org/article',
          abstract: '<jats:p>Useful idea.</jats:p>'
        }
      })
    }));

    const result = await lookupReferenceMetadata('https://doi.org/10.1000/example');
    expect(result.title).toBe('Example Research Article');
    expect(result.doi).toBe('10.1000/example');
    expect(result.authors).toBeDefined();
    expect(result.authors?.[0]).toMatchObject({ firstName: 'Jane', lastName: 'Smith' });
  });

  it('accepts a valid Zenodo DOI with a dot in the suffix', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          title: ['Example dataset'],
          author: [{ family: 'Example', given: 'Author' }],
          publisher: 'Zenodo',
          DOI: '10.5281/zenodo.3528036',
          URL: 'https://doi.org/10.5281/zenodo.3528036',
          'container-title': ['Zenodo'],
        },
      }),
    }));

    await expect(lookupReferenceMetadata('https://doi.org/10.5281/zenodo.3528036')).resolves.toMatchObject({
      doi: '10.5281/zenodo.3528036',
      title: 'Example dataset',
    });
  });

  it('rejects invalid identifiers without hitting the network', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    await expect(lookupReferenceMetadata('not-a-doi')).rejects.toThrow(/valid DOI or ISBN/i);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
