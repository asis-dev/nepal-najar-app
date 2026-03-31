import type { NextRequest } from 'next/server';

const ADMIN_COOKIE_NAMES = ['admin_session', 'np-admin-token'] as const;

export function isAdminAuthed(request: NextRequest): boolean {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) return false;

  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${adminSecret}`) {
    return true;
  }

  return ADMIN_COOKIE_NAMES.some(
    (cookieName) => request.cookies.get(cookieName)?.value === adminSecret,
  );
}

