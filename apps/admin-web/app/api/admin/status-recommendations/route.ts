import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';
import {
  applyStatusUpdate,
  getStatusRecommendationById,
  listStatusRecommendations,
  reviewStatusRecommendation,
  runStatusPipeline,
} from '@/lib/intelligence/status-pipeline';
import { enqueueStatusPipelineJob } from '@/lib/intelligence/jobs';

function isAuthed(request: NextRequest): boolean {
  const adminCookie = request.cookies.get('admin_session')?.value;
  const authHeader = request.headers.get('authorization');
  const adminSecret = process.env.ADMIN_SECRET;

  return !!(
    (adminCookie && adminSecret && adminCookie === adminSecret) ||
    (authHeader && adminSecret && authHeader === `Bearer ${adminSecret}`)
  );
}

async function getCounts() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('intelligence_status_recommendations')
    .select('review_state');

  if (error) {
    throw new Error(error.message);
  }

  const counts = {
    pending: 0,
    approved: 0,
    rejected: 0,
    applied: 0,
  };

  for (const row of data || []) {
    const state = String(row.review_state || 'pending') as keyof typeof counts;
    if (state in counts) counts[state]++;
  }

  return counts;
}

export async function GET(request: NextRequest) {
  if (!isAuthed(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const reviewState = searchParams.get('review_state');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const recommendations = await listStatusRecommendations({
      reviewState:
        reviewState === 'pending' ||
        reviewState === 'approved' ||
        reviewState === 'rejected' ||
        reviewState === 'applied'
          ? reviewState
          : undefined,
      limit: Number.isFinite(limit) ? limit : 50,
    });

    const counts = await getCounts();

    return NextResponse.json({
      recommendations,
      counts,
      total: recommendations.length,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Failed to load status recommendations',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthed(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const action = typeof body.action === 'string' ? body.action : '';

    if (action === 'queue') {
      const job = await enqueueStatusPipelineJob('admin');
      return NextResponse.json({ success: true, status: 'queued', job });
    }

    if (action === 'run') {
      const result = await runStatusPipeline();
      return NextResponse.json({ success: true, ...result });
    }

    if (
      (action === 'approve' || action === 'reject') &&
      typeof body.recommendationId === 'string'
    ) {
      const recommendation = await reviewStatusRecommendation(
        body.recommendationId,
        action === 'approve' ? 'approved' : 'rejected',
        'admin',
        typeof body.notes === 'string' ? body.notes : null,
      );
      return NextResponse.json({ success: true, recommendation });
    }

    if (action === 'apply' && typeof body.recommendationId === 'string') {
      const recommendation = await getStatusRecommendationById(body.recommendationId);
      if (!recommendation) {
        return NextResponse.json(
          { error: 'Recommendation not found' },
          { status: 404 },
        );
      }

      const success = await applyStatusUpdate(
        recommendation.promiseId,
        recommendation.recommendedStatus,
        typeof body.reason === 'string' && body.reason.trim().length > 0
          ? body.reason.trim()
          : recommendation.reason,
        {
          recommendationId: body.recommendationId,
          reviewer: 'admin',
        },
      );

      return NextResponse.json({ success, recommendationId: body.recommendationId });
    }

    return NextResponse.json(
      { error: 'Unsupported action' },
      { status: 400 },
    );
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Failed to update status recommendations',
      },
      { status: 500 },
    );
  }
}
