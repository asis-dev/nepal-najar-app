import { NextRequest, NextResponse } from 'next/server';
import { bearerMatchesSecret } from '@/lib/security/request-auth';

export async function POST(req: NextRequest) {
  const secret = process.env.SCRAPE_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'SCRAPE_SECRET not configured' }, { status: 500 });
  }
  if (!bearerMatchesSecret(req, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { deduplicateSignals } = await import('@/lib/intelligence/dedup');
    const result = await deduplicateSignals();
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const secret = process.env.SCRAPE_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'SCRAPE_SECRET not configured' }, { status: 500 });
  }
  if (!bearerMatchesSecret(req, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { getDeduplicatedCount } = await import('@/lib/intelligence/dedup');
    const count = await getDeduplicatedCount();
    return NextResponse.json({ uniqueSignals: count });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
