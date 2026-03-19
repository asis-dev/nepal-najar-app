import { NextRequest, NextResponse } from 'next/server';

/**
 * Nepal Najar — Route Protection Middleware
 *
 * Dashboard routes require admin authentication via cookie.
 * Public routes and API scrape routes (Bearer token auth) pass through.
 */

// Routes that are always public (no auth required)
const PUBLIC_PREFIXES = [
  '/explore',
  '/daily',
  '/mero-ward',
  '/report-card',
  '/watchlist',
  '/admin-login',
  '/_next',
  '/favicon',
  '/manifest',
  '/api/scrape',      // Protected by Bearer SCRAPE_SECRET in route handlers
  '/api/revalidate',  // Protected by Bearer SCRAPE_SECRET in route handler
  '/api/admin-auth',  // Login endpoint itself must be public
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
  '/evidence',
  '/budget',
  '/verification',
  '/audit',
  '/users',
  '/notifications',
  '/settings',
  '/tasks',
  '/leadership',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let public routes pass through
  if (
    pathname === '/' ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    return NextResponse.next();
  }

  // Check if this is a dashboard route
  const isDashboardRoute = DASHBOARD_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (!isDashboardRoute) {
    // Not a known dashboard route — let it pass (static files, etc.)
    return NextResponse.next();
  }

  // Dashboard route — check admin cookie
  const adminToken = request.cookies.get('np-admin-token')?.value;
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret) {
    // ADMIN_SECRET not configured — block all dashboard access
    const loginUrl = new URL('/admin-login', request.url);
    loginUrl.searchParams.set('error', 'not-configured');
    return NextResponse.redirect(loginUrl);
  }

  if (!adminToken || adminToken !== adminSecret) {
    // Not authenticated — redirect to login
    const loginUrl = new URL('/admin-login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$).*)',
  ],
};
