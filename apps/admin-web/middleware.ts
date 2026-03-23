import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseMiddlewareClient } from '@/lib/supabase/middleware';

/**
 * Nepal Najar — Route Protection Middleware
 *
 * Dashboard routes require Supabase auth + admin role.
 * Public routes pass through freely.
 * Falls back to legacy ADMIN_SECRET cookie if Supabase is not configured.
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
        return response;
      } catch {
        return NextResponse.next();
      }
    }
    return NextResponse.next();
  }

  // Check if this is a dashboard route
  const isDashboardRoute = DASHBOARD_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (!isDashboardRoute) {
    return NextResponse.next();
  }

  // Dashboard route — try Supabase auth first, fall back to legacy cookie
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const { supabase, response } = createSupabaseMiddlewareClient(request);
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        const loginUrl = new URL('/admin-login', request.url);
        loginUrl.searchParams.set('from', pathname);
        return NextResponse.redirect(loginUrl);
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
        return NextResponse.redirect(loginUrl);
      }

      return response;
    } catch {
      // Supabase auth failed — fall through to legacy check
    }
  }

  // Legacy fallback: ADMIN_SECRET cookie check
  const adminToken = request.cookies.get('np-admin-token')?.value;
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret) {
    const loginUrl = new URL('/admin-login', request.url);
    loginUrl.searchParams.set('error', 'not-configured');
    return NextResponse.redirect(loginUrl);
  }

  if (!adminToken || adminToken !== adminSecret) {
    const loginUrl = new URL('/admin-login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$).*)',
  ],
};
