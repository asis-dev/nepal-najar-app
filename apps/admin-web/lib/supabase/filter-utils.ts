/**
 * Helpers for building safe PostgREST filter strings.
 * Prevents unsafe tokens from being interpolated into `.or(...)` expressions.
 */

export function sanitizeSearchTerm(raw: string, maxLength = 120): string {
  return raw
    .normalize('NFKC')
    .replace(/[%_,().'"`;]/g, ' ')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function buildOrIlikeClause(columns: string[], raw: string): string | null {
  const term = sanitizeSearchTerm(raw);
  if (!term) return null;
  return columns.map((column) => `${column}.ilike.%${term}%`).join(',');
}

export function sanitizeEqToken(raw: string): string | null {
  const token = raw
    .normalize('NFKC')
    .trim()
    .replace(/[^A-Za-z0-9_-]/g, '');
  return token.length > 0 ? token : null;
}
