import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseMiddlewareClient } from '@/lib/supabase/middleware';

/**
 * Edge-compatible constant-time string comparison.
 * Cannot use node:crypto in Edge runtime, so we do it manually.
 */
function secretsEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Nepal Republic — Route Protection Middleware
 *
 * Dashboard routes require Supabase auth + admin role.
 * Public routes pass through freely.
 * Legacy ADMIN_SECRET fallback is opt-in via ENABLE_LEGACY_ADMIN_SECRET=true.
 */

// Routes that are always public (no auth required)
const PUBLIC_PREFIXES = [
  '/explore',
  '/daily',
  '/mero-ward',
  '/report-card',
  '/watchlist',
  '/evidence',
  '/login',
  '/signup',
  '/verify',
  '/forgot-password',
  '/reset-password',
  '/admin-login',
  '/auth/callback',
  '/_next',
  '/favicon',
  '/manifest',
  '/api/scrape',
  '/api/revalidate',
  '/api/admin-auth',
  '/api/votes',
  '/api/comments',
  '/api/og',
  '/api/v1',
  '/api/intelligence',
  '/api/proposals',
  '/api/evidence',
  '/api/verify',
  '/api/ward-reports',
  '/api/leaderboard',
  '/api/notifications',
  '/api/promises',
  '/search',
  '/proposals',
  '/affects-me',
  '/leaderboard',
  '/notifications',
  '/verify-evidence',
  '/apply-verifier',
  '/reputation',
  '/api/reputation',
  '/api/verifier-applications',
  '/api/complaints',
  '/api/daily-brief',
  '/api/report-card',
  '/api/social-post',
  '/complaints',
];

// Dashboard routes that require admin auth
const DASHBOARD_PREFIXES = [
  '/home',
  '/projects',
  '/map',
  '/milestones',
  '/blockers',
  '/organizations',
  '/chat',
  '/scraping',
  '/scraper-health',
  '/budget',
  '/verification',
  '/audit',
  '/users',
  '/notifications',
  '/settings',
  '/tasks',
  '/leadership',
  '/moderation',
  '/submissions',
];

function applySecurityHeaders(response: NextResponse, request: NextRequest): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(self), interest-cohort=()'
  );
  if (request.nextUrl.protocol === 'https:') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const allowLegacyAdminSecret = process.env.ENABLE_LEGACY_ADMIN_SECRET === 'true';

  // Let public routes pass through
  if (
    pathname === '/' ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    // Still refresh Supabase session on public routes (keeps session alive)
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      try {
        const { supabase, response } = createSupabaseMiddlewareClient(request);
        await supabase.auth.getUser();
        return applySecurityHeaders(response, request);
      } catch {
        return applySecurityHeaders(NextResponse.next(), request);
      }
    }
    return applySecurityHeaders(NextResponse.next(), request);
  }

  // Check if this is a dashboard route
  const isDashboardRoute = DASHBOARD_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (!isDashboardRoute) {
    return applySecurityHeaders(NextResponse.next(), request);
  }

  // Dashboard route — require Supabase auth by default.
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const { supabase, response } = createSupabaseMiddlewareClient(request);
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        const loginUrl = new URL('/admin-login', request.url);
        loginUrl.searchParams.set('from', pathname);
        return applySecurityHeaders(NextResponse.redirect(loginUrl), request);
      }

      // Check admin role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || profile.role !== 'admin') {
        const loginUrl = new URL('/admin-login', request.url);
        loginUrl.searchParams.set('error', 'not-admin');
        return applySecurityHeaders(NextResponse.redirect(loginUrl), request);
      }

      return applySecurityHeaders(response, request);
    } catch {
      if (!allowLegacyAdminSecret) {
        const loginUrl = new URL('/admin-login', request.url);
        loginUrl.searchParams.set('error', 'auth-unavailable');
        loginUrl.searchParams.set('from', pathname);
        return applySecurityHeaders(NextResponse.redirect(loginUrl), request);
      }
    }
  }

  if (!allowLegacyAdminSecret) {
    const loginUrl = new URL('/admin-login', request.url);
    loginUrl.searchParams.set('error', 'not-configured');
    loginUrl.searchParams.set('from', pathname);
    return applySecurityHeaders(NextResponse.redirect(loginUrl), request);
  }

  // Legacy fallback (explicitly enabled): ADMIN_SECRET cookie check
  const adminToken =
    request.cookies.get('admin_session')?.value ||
    request.cookies.get('np-admin-token')?.value;
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret) {
    const loginUrl = new URL('/admin-login', request.url);
    loginUrl.searchParams.set('error', 'not-configured');
    return applySecurityHeaders(NextResponse.redirect(loginUrl), request);
  }

  if (!adminToken || !secretsEqual(adminToken, adminSecret)) {
    const loginUrl = new URL('/admin-login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return applySecurityHeaders(NextResponse.redirect(loginUrl), request);
  }

  return applySecurityHeaders(NextResponse.next(), request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$).*)',
  ],
};
