const LEADING_ARTICLE = /^(a|an|the)\s+/;

/**
 * Normalise a written answer for comparison: trim, NFKD with diacritics
 * stripped, lowercase, collapse whitespace, optionally drop a leading a/an/the.
 */
export function normalizeAnswer(s: string, stripLeadingArticles: boolean): string {
  let out = s
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  if (stripLeadingArticles) out = out.replace(LEADING_ARTICLE, '');
  return out;
}

/** Key used to detect duplicate questions on import. */
export function normalizeQuestion(s: string): string {
  return normalizeAnswer(s, false);
}
