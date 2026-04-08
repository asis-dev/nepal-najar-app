import { NextResponse } from 'next/server';
import { getPromises } from '@/lib/data';
import { PROMISES_KNOWLEDGE } from '@/lib/intelligence/knowledge-base';

export const runtime = 'nodejs';
export const revalidate = 600;

const kb = new Map(PROMISES_KNOWLEDGE.map((k) => [k.id, k]));

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
}
function gradeFor(avg: number): string {
  if (avg >= 85) return 'A';
  if (avg >= 70) return 'B';
  if (avg >= 55) return 'C';
  if (avg >= 40) return 'D';
  return 'F';
}

export async function GET() {
  const promises = await getPromises();
  type Bucket = {
    slug: string;
    name: string;
    commitment_count: number;
    progress_sum: number;
    status: Record<string, number>;
    commitment_ids: string[];
  };
  const map = new Map<string, Bucket>();

  for (const p of promises) {
    const entry = kb.get(Number(p.id));
    const ministry = entry?.keyMinistries?.[0] || 'Unassigned';
    const slug = slugify(ministry);
    if (!map.has(slug)) {
      map.set(slug, { slug, name: ministry, commitment_count: 0, progress_sum: 0, status: {}, commitment_ids: [] });
    }
    const b = map.get(slug)!;
    b.commitment_count++;
    b.progress_sum += p.progress || 0;
    b.status[p.status] = (b.status[p.status] || 0) + 1;
    b.commitment_ids.push(p.id);
  }

  const ministries = Array.from(map.values())
    .map((b) => {
      const avg = b.commitment_count ? b.progress_sum / b.commitment_count : 0;
      return {
        slug: b.slug,
        name: b.name,
        commitment_count: b.commitment_count,
        avg_progress: Math.round(avg * 10) / 10,
        grade: gradeFor(avg),
        status_breakdown: b.status,
        commitment_ids: b.commitment_ids,
      };
    })
    .sort((a, b) => b.commitment_count - a.commitment_count);

  return NextResponse.json(
    { version: 'v1', updated_at: new Date().toISOString(), count: ministries.length, ministries },
    { headers: { 'access-control-allow-origin': '*', 'cache-control': 'public, max-age=600' } }
  );
}
