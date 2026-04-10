/**
 * GET /api/payments/esewa/success
 *
 * Legacy eSewa success callback — redirects to the canonical callback route.
 * Kept for backward compatibility with any in-flight payments using the old URL.
 */

import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://nepalrepublic.org';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // Forward all params to the canonical callback route
  const params = new URLSearchParams();
  params.set('status', 'success');

  const data = searchParams.get('data');
  if (data) params.set('data', data);

  const service = searchParams.get('service');
  if (service) params.set('service', service);

  const task = searchParams.get('task');
  if (task) params.set('task', task);

  return NextResponse.redirect(
    `${BASE_URL}/api/payments/esewa/callback?${params.toString()}`,
  );
}
