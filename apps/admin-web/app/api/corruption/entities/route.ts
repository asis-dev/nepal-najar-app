import { NextRequest, NextResponse } from 'next/server';
import { getCorruptionEntities } from '@/lib/data/corruption-data';
import type { EntityFilters } from '@/lib/data/corruption-data';
import type { EntityType } from '@/lib/data/corruption-types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const filters: EntityFilters = {};
  if (searchParams.get('entity_type')) filters.entity_type = searchParams.get('entity_type') as EntityType;
  if (searchParams.get('search')) filters.search = searchParams.get('search')!;
  if (searchParams.get('page')) filters.page = Number(searchParams.get('page'));
  if (searchParams.get('pageSize')) filters.pageSize = Number(searchParams.get('pageSize'));

  const result = await getCorruptionEntities(filters);

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'public, max-age=60' },
  });
}
