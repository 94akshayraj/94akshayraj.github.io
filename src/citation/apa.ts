export interface AuthorLike {
  firstName?: string;
  lastName?: string;
  organization?: string;
}

export interface ApaReferenceInput {
  id?: string;
  type?: string;
  title?: string;
  authors?: AuthorLike[];
  year?: string;
  publisher?: string;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  isbn?: string;
  url?: string;
  edition?: string;
  sourceType?: string;
}

function toInitials(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => (part[0] || '').toUpperCase() + '.')
    .join(' ');
}

export function formatAuthors(authors: AuthorLike[] = []): string {
  if (!authors.length) return 'Anonymous';
  const formatted = authors.map((author) => {
    if (author.organization) return author.organization;
    const given = author.firstName ? toInitials(author.firstName) : '';
    const family = author.lastName || '';
    if (!family) return given || 'Anonymous';
    if (!given) return family;
    return `${family}, ${given}`;
  });

  if (formatted.length === 1) return formatted[0];
  if (formatted.length === 2) return `${formatted[0]}, &amp; ${formatted[1]}`;
  return `${formatted[0]}, ${formatted[1]}, &amp; ${formatted[2]}`;
}

export function generateApaReference(reference: ApaReferenceInput): string {
  const title = reference.title || 'Untitled';
  const authors = reference.authors || [];
  const authorText = authors.length > 0 ? formatAuthors(authors) : reference.publisher || 'Author';
  const yearText = reference.year || 'n.d.';
  const doiText = reference.doi ? `https://doi.org/${reference.doi.replace(/^https?:\/\/doi.org\//i, '').replace(/^doi:/i, '')}` : reference.url || '';

  if (reference.type === 'journal-article' || reference.sourceType === 'journal-article') {
    const journal = reference.journal || 'Journal';
    const volume = reference.volume ? `${reference.volume}` : '';
    const issue = reference.issue ? `(${reference.issue})` : '';
    const pages = reference.pages || '';
    const articleTitle = title;
    const authorsRef = authors.length > 2 ? `${authors[0]?.lastName || authors[0]?.organization || 'Author'}, ${toInitials(authors[0]?.firstName || '')}, et al.` : authorText;
    const suffix = [volume, issue, pages].filter(Boolean).join(', ');
    return `${authorsRef}. (${yearText}). ${articleTitle}. ${journal}${suffix ? ', ' + suffix : ''}${doiText ? '. ' + doiText : ''}`;
  }

  if (reference.type === 'book' || reference.sourceType === 'book') {
    const publisher = reference.publisher || 'Publisher';
    const edition = reference.edition ? ` (${reference.edition})` : '';
    return `${authorText}. (${yearText}). ${title}${edition}. ${publisher}${doiText ? '. ' + doiText : ''}`;
  }

  if (reference.type === 'website' || reference.sourceType === 'website') {
    return `${authorText}. (${yearText}). ${title}. ${reference.publisher || ''}${doiText ? '. ' + doiText : ''}`.replace(/\s+\.$/, '.');
  }

  if (reference.type === 'report' || reference.sourceType === 'report') {
    return `${authorText}. (${yearText}). ${title}. ${reference.publisher || 'Publisher'}${doiText ? '. ' + doiText : ''}`;
  }

  return `${authorText}. (${yearText}). ${title}${reference.publisher ? '. ' + reference.publisher : ''}${doiText ? '. ' + doiText : ''}`;
}

export function generateApaInText(reference: ApaReferenceInput): string {
  const authors = reference.authors || [];
  const year = reference.year || 'n.d.';

  if (!authors.length) {
    const org = reference.publisher || 'Anonymous';
    return `(${org}, ${year})`;
  }

  if (authors.length === 1) {
    const author = authors[0];
    const family = author.organization || author.lastName || 'Author';
    return `(${family}, ${year})`;
  }

  if (authors.length === 2) {
    const first = authors[0].organization || authors[0].lastName || 'Author';
    const second = authors[1].organization || authors[1].lastName || 'Author';
    return `(${first} & ${second}, ${year})`;
  }

  const first = authors[0].organization || authors[0].lastName || 'Author';
  return `(${first} et al., ${year})`;
}

export function generateApaNarrative(reference: ApaReferenceInput): string {
  const authors = reference.authors || [];
  const year = reference.year || 'n.d.';

  if (!authors.length) {
    const org = reference.publisher || 'Anonymous';
    return `${org} (${year})`;
  }

  if (authors.length === 1) {
    const family = authors[0].organization || authors[0].lastName || 'Author';
    return `${family} (${year})`;
  }

  if (authors.length === 2) {
    const first = authors[0].organization || authors[0].lastName || 'Author';
    const second = authors[1].organization || authors[1].lastName || 'Author';
    return `${first} and ${second} (${year})`;
  }

  const first = authors[0].organization || authors[0].lastName || 'Author';
  return `${first} et al. (${year})`;
}
