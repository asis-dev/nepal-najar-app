/**
 * Authentication for scraping API routes.
 * All scrape endpoints require a bearer token matching SCRAPE_SECRET.
 */

export function validateScrapeAuth(request: Request): boolean {
  const secret = process.env.SCRAPE_SECRET;
  if (!secret) {
    console.warn('[scrape-auth] SCRAPE_SECRET not set — rejecting all requests');
    return false;
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return false;

  const token = authHeader.replace('Bearer ', '');
  return token === secret;
}

/** Standard 401 response for unauthorized scrape requests */
export function unauthorizedResponse(): Response {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}
