import { NextResponse } from 'next/server';
import { getCorruptionStats } from '@/lib/data/corruption-data';

export const dynamic = 'force-dynamic';

export async function GET() {
  const stats = await getCorruptionStats();

  return NextResponse.json(stats, {
    headers: { 'Cache-Control': 'public, max-age=120' },
  });
}
