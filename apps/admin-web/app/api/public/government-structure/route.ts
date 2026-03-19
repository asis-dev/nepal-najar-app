import { NextResponse } from 'next/server';
import { getGovernmentStructureSnapshot } from '@/lib/org-structure/engine';

export const revalidate = 3600;

export async function GET() {
  try {
    const units = await getGovernmentStructureSnapshot();
    const checkedAt = units.reduce<string>(
      (latest, unit) =>
        unit.sourceMeta.checkedAt > latest ? unit.sourceMeta.checkedAt : latest,
      ''
    );

    return NextResponse.json({
      checkedAt: checkedAt || new Date().toISOString(),
      units,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load government structure' },
      { status: 500 }
    );
  }
}
