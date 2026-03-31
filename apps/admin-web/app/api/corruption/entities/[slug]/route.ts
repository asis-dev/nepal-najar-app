import { NextRequest, NextResponse } from 'next/server';
import { getCorruptionEntity } from '@/lib/data/corruption-data';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const dossier = await getCorruptionEntity(params.slug);

  if (!dossier) {
    return NextResponse.json({ error: 'Entity not found' }, { status: 404 });
  }

  return NextResponse.json(dossier, {
    headers: { 'Cache-Control': 'public, max-age=60' },
  });
}
