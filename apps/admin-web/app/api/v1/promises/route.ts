import { NextRequest, NextResponse } from 'next/server';
import { promises as allPromises } from '@/lib/data/promises';
import { rateLimit, getClientIp } from '@/lib/middleware/rate-limit';

/**
 * GET /api/v1/promises
 * Public read-only API for promise data.
 * Supports filtering by status, category, search query, and pagination.
 * Rate limited: 100 requests/min per IP.
 */
export async function GET(request: NextRequest) {
  // Rate limit: 100/min per IP
  const ip = getClientIp(request);
  const { success, remaining } = rateLimit(`api:${ip}`, 100, 60000);
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      {
        status: 429,
        headers: { 'X-RateLimit-Remaining': '0', 'Retry-After': '60' },
      }
    );
  }

  // Query params
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const category = searchParams.get('category');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
  const q = searchParams.get('q')?.toLowerCase();

  let filtered = [...allPromises];
  if (status) filtered = filtered.filter((p) => p.status === status);
  if (category) filtered = filtered.filter((p) => p.category === category);
  if (q)
    filtered = filtered.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.title_ne.includes(q) ||
        p.description.toLowerCase().includes(q)
    );

  const total = filtered.length;
  const offset = (page - 1) * limit;
  const paginated = filtered.slice(offset, offset + limit);

  // Return clean public shape (no internal fields)
  const data = paginated.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    title_ne: p.title_ne,
    category: p.category,
    status: p.status,
    progress: p.progress,
    evidenceCount: p.evidenceCount,
    lastUpdate: p.lastUpdate,
    description: p.description,
    description_ne: p.description_ne,
  }));

  return NextResponse.json(
    {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
    {
      headers: {
        'X-RateLimit-Remaining': String(remaining),
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300',
      },
    }
  );
}
