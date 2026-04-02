import { timingSafeEqual } from 'node:crypto';

function toHeaders(input: Headers | Request): Headers {
  if (input instanceof Headers) return input;
  return input.headers;
}

export function getBearerToken(input: Headers | Request): string | null {
  const headers = toHeaders(input);
  const header =
    headers.get('authorization') || headers.get('Authorization');
  if (!header || !header.toLowerCase().startsWith('bearer ')) {
    return null;
  }
  return header.slice(7).trim();
}

export function secretsEqual(
  provided: string | null | undefined,
  expected: string | null | undefined,
): boolean {
  if (!provided || !expected) return false;
  const providedBuf = Buffer.from(provided, 'utf8');
  const expectedBuf = Buffer.from(expected, 'utf8');
  if (providedBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(providedBuf, expectedBuf);
}

export function bearerMatchesSecret(
  input: Headers | Request,
  secret: string | null | undefined,
): boolean {
  const token = getBearerToken(input);
  return secretsEqual(token, secret);
}

/**
 * Checks whether a browser-originating request looks same-origin.
 * Used to reduce CSRF risk when auth comes from cookies/session.
 */
export function hasTrustedBrowserOrigin(request: Request): boolean {
  const requestOrigin = new URL(request.url).origin;

  const secFetchSite = request.headers.get('sec-fetch-site');
  if (secFetchSite) {
    return secFetchSite === 'same-origin';
  }

  const origin = request.headers.get('origin');
  if (origin) return origin === requestOrigin;

  const referer = request.headers.get('referer');
  if (referer) {
    try {
      return new URL(referer).origin === requestOrigin;
    } catch {
      return false;
    }
  }

  return false;
}
