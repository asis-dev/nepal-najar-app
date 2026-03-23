import { NextRequest, NextResponse } from 'next/server';
import {
  getPendingDiscoveries,
  approveDiscovery,
  rejectDiscovery,
} from '@/lib/intelligence/commitment-discovery';

// ---------------------------------------------------------------------------
// Auth helper — same pattern as other intelligence routes
// ---------------------------------------------------------------------------

function isAuthorized(request: NextRequest): boolean {
  const auth = request.headers.get('Authorization');
  const secret = process.env.SCRAPE_SECRET;
  return !!secret && auth === `Bearer ${secret}`;
}

// ---------------------------------------------------------------------------
// GET /api/intelligence/discoveries
// Returns all pending commitment discoveries for human review.
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const discoveries = await getPendingDiscoveries();

    return NextResponse.json({
      count: discoveries.length,
      discoveries,
    });
  } catch (err) {
    console.error('[Discoveries API] GET error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/intelligence/discoveries
// Approve or reject a discovery.
//
// Body: { signalId: string, action: "approve" | "reject" }
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { signalId, action, mode, targetCommitmentId, publish, reviewedBy } = body as {
      signalId?: string;
      action?: string;
      mode?: 'create' | 'merge';
      targetCommitmentId?: string;
      publish?: boolean;
      reviewedBy?: string;
    };

    if (!signalId || typeof signalId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid signalId' },
        { status: 400 },
      );
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { error: 'action must be "approve" or "reject"' },
        { status: 400 },
      );
    }

    if (action === 'approve') {
      const result = await approveDiscovery(signalId, {
        mode,
        targetCommitmentId,
        publish,
        reviewedBy,
      });

      return NextResponse.json({
        success: true,
        signalId,
        action,
        ...result,
      });
    } else {
      await rejectDiscovery(signalId);
    }

    return NextResponse.json({
      success: true,
      signalId,
      action,
    });
  } catch (err) {
    console.error('[Discoveries API] POST error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}
