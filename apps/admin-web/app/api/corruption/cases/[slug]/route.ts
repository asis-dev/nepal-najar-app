import { NextRequest, NextResponse } from 'next/server';
import { getCorruptionCase } from '@/lib/data/corruption-data';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const result = await getCorruptionCase(params.slug);

  if (!result.case) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 });
  }

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'public, max-age=60' },
  });
}
