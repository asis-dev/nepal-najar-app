import { NextRequest, NextResponse } from 'next/server';
import { bearerMatchesSecret } from '@/lib/security/request-auth';

export async function POST(req: NextRequest) {
  const secret = process.env.SCRAPE_SECRET;
  if (!bearerMatchesSecret(req, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const {
      runStatusPipeline,
      applyStatusUpdate,
      listStatusRecommendations,
      reviewStatusRecommendation,
    } = await import('@/lib/intelligence/status-pipeline');

    if (body.async === true) {
      const { enqueueStatusPipelineJob } = await import('@/lib/intelligence/jobs');
      const job = await enqueueStatusPipelineJob(
        typeof body.trigger === 'string' ? body.trigger : 'manual',
      );
      return NextResponse.json({
        success: true,
        status: 'queued',
        job,
      });
    }

    if (body.view === 'recommendations' || body.list === true) {
      const recommendations = await listStatusRecommendations({
        reviewState:
          typeof body.review_state === 'string' ? body.review_state : undefined,
        limit:
          typeof body.limit === 'number' ? body.limit : undefined,
      });
      return NextResponse.json({
        success: true,
        count: recommendations.length,
        recommendations,
      });
    }

    if (
      typeof body.recommendationId === 'string' &&
      (body.action === 'approved' ||
        body.action === 'rejected' ||
        body.action === 'applied')
    ) {
      const recommendation = await reviewStatusRecommendation(
        body.recommendationId,
        body.action,
        typeof body.reviewedBy === 'string' ? body.reviewedBy : 'admin',
        typeof body.notes === 'string' ? body.notes : null,
      );
      return NextResponse.json({ success: true, recommendation });
    }

    // If applying a specific update
    if (body.apply && body.promiseId && body.newStatus) {
      const success = await applyStatusUpdate(
        body.promiseId,
        body.newStatus,
        body.reason || 'Manual status update via API',
        {
          recommendationId:
            typeof body.recommendationId === 'string'
              ? body.recommendationId
              : undefined,
          reviewer:
            typeof body.reviewedBy === 'string' ? body.reviewedBy : undefined,
        },
      );
      return NextResponse.json({ success, promiseId: body.promiseId, newStatus: body.newStatus });
    }

    // Otherwise run the full analysis pipeline
    const result = await runStatusPipeline();
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
  if (!bearerMatchesSecret(req, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const sp = req.nextUrl.searchParams;
    const {
      runStatusPipeline,
      listStatusRecommendations,
    } = await import('@/lib/intelligence/status-pipeline');

    if (sp.get('view') === 'recommendations') {
      const reviewState = sp.get('review_state');
      const limit = parseInt(sp.get('limit') || '100', 10);
      const recommendations = await listStatusRecommendations({
        reviewState:
          reviewState === 'pending' ||
          reviewState === 'approved' ||
          reviewState === 'rejected' ||
          reviewState === 'applied'
            ? reviewState
            : undefined,
        limit: Number.isFinite(limit) ? limit : undefined,
      });
      return NextResponse.json({
        success: true,
        count: recommendations.length,
        recommendations,
      });
    }

    const result = await runStatusPipeline();
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
