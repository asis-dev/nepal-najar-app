import { NextResponse } from 'next/server';
import { getPromises } from '@/lib/data';

export const runtime = 'nodejs';
export const revalidate = 300;

export async function GET(req: Request) {
  const url = new globalThis.URL(req.url);
  const status = url.searchParams.get('status');
  const category = url.searchParams.get('category');
  const limit = Math.min(Number(url.searchParams.get('limit') || '200'), 500);

  let items = await getPromises();
  if (status) items = items.filter((p) => p.status === status);
  if (category) items = items.filter((p) => p.category === category);
  items = items.slice(0, limit);

  return NextResponse.json(
    {
      version: 'v1',
      count: items.length,
      updated_at: new Date().toISOString(),
      items: items.map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        title_ne: p.title_ne,
        summary: p.summary,
        category: p.category,
        status: p.status,
        progress: p.progress,
        deadline: p.deadline,
        evidence_count: p.evidenceCount,
        actors: p.actors,
        last_signal_at: p.lastSignalAt,
        url: `https://nepalrepublic.org/explore/first-100-days/${p.slug}`,
      })),
    },
    { headers: { 'access-control-allow-origin': '*', 'cache-control': 'public, max-age=300' } }
  );
}
