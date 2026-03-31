import { NextRequest, NextResponse } from 'next/server';
import {
  getPendingCorruptionDiscoveries,
  approveCorruptionDiscovery,
  rejectCorruptionDiscovery,
} from '@/lib/intelligence/corruption-discovery';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/corruption/discoveries?status=pending|approved|rejected
 *
 * List corruption discoveries (signals flagged as potential corruption cases).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const status =
    (searchParams.get('status') as 'pending' | 'approved' | 'rejected') ||
    'pending';

  try {
    const discoveries = await getPendingCorruptionDiscoveries(status);

    return NextResponse.json(
      {
        discoveries,
        count: discoveries.length,
        status,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    console.error('[API] Corruption discoveries GET error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/corruption/discoveries
 *
 * Approve or reject a corruption discovery.
 * Body: { signalId: string, action: 'approve' | 'reject', reviewedBy?: string }
 *
 * On approve: creates corruption_case + entities + evidence linking signal_id.
 * On reject: updates metadata status to 'rejected'.
 *
 * Auth: Bearer SCRAPE_SECRET or ADMIN_SECRET
 */
export async function POST(req: NextRequest) {
  // Auth check
  const secret =
    process.env.SCRAPE_SECRET || process.env.ADMIN_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'Server secret not configured' },
      { status: 500 },
    );
  }

  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');

  if (token !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { signalId, action, reviewedBy } = body as {
      signalId: string;
      action: 'approve' | 'reject';
      reviewedBy?: string;
    };

    if (!signalId || !action) {
      return NextResponse.json(
        { error: 'signalId and action are required' },
        { status: 400 },
      );
    }

    if (action === 'approve') {
      const result = await approveCorruptionDiscovery(signalId, {
        reviewedBy,
      });
      return NextResponse.json({
        success: true,
        action: 'approved',
        caseId: result.caseId,
      });
    }

    if (action === 'reject') {
      await rejectCorruptionDiscovery(signalId);
      return NextResponse.json({
        success: true,
        action: 'rejected',
        signalId,
      });
    }

    return NextResponse.json(
      { error: 'action must be "approve" or "reject"' },
      { status: 400 },
    );
  } catch (err) {
    console.error('[API] Corruption discoveries POST error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
