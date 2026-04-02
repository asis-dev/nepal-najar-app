/**
 * Authentication for scraping API routes.
 * Accepts either:
 * - Bearer SCRAPE_SECRET (automation)
 * - Admin Supabase session (manual dashboard usage)
 */
import { isAdminAuthed } from '@/lib/auth/admin';
import {
  bearerMatchesSecret,
  hasTrustedBrowserOrigin,
} from '@/lib/security/request-auth';

export async function validateScrapeAuth(request: Request): Promise<boolean> {
  const secret = process.env.SCRAPE_SECRET;
  if (bearerMatchesSecret(request, secret)) {
    return true;
  }

  // Allows authenticated admin users to run scraper controls from the dashboard
  // without exposing secrets to browser code.
  const adminAuthed = await isAdminAuthed(request);
  if (!adminAuthed) {
    return false;
  }

  // For cookie/session-based auth, require a same-origin browser context to
  // reduce CSRF-style trigger risk on privileged scraping endpoints.
  const enforceOriginCheck = process.env.ENFORCE_SCRAPE_ORIGIN_CHECK !== 'false';
  if (!enforceOriginCheck) {
    return true;
  }

  return hasTrustedBrowserOrigin(request);
}

/** Standard 401 response for unauthorized scrape requests */
export function unauthorizedResponse(): Response {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
