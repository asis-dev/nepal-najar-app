import { NextResponse } from 'next/server';
import { validateScrapeAuth, unauthorizedResponse } from '@/lib/scraper/auth';
import { buildGovernmentStructureSnapshot } from '@/lib/org-structure/engine';

export async function POST(request: Request) {
  if (!validateScrapeAuth(request)) {
    return unauthorizedResponse();
  }

  try {
    const units = await buildGovernmentStructureSnapshot();

    return NextResponse.json({
      success: true,
      checkedAt: new Date().toISOString(),
      unitsChecked: units.length,
      verifiedSources: units.filter((unit) => unit.sourceMeta.sourceStatus === 'verified').length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Government structure refresh failed' },
      { status: 500 }
    );
  }
}
