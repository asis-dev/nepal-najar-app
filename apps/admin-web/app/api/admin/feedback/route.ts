import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthed } from '@/lib/auth/admin';
import {
  getFeedbackCounts,
  getPendingFeedbackIds,
  listFeedbackForAdmin,
  runFeedbackAutopilot,
} from '@/lib/intelligence/feedback-review';
import { enqueueFeedbackReviewJobs } from '@/lib/intelligence/jobs';

export async function GET(request: NextRequest) {
  if (!(await isAdminAuthed(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const aiReviewStatus = searchParams.get('ai_review_status');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const feedback = await listFeedbackForAdmin({
      status:
        status === 'new' ||
        status === 'reviewed' ||
        status === 'resolved' ||
        status === 'archived'
          ? status
          : undefined,
      aiReviewStatus:
        aiReviewStatus === 'pending' ||
        aiReviewStatus === 'reviewed' ||
        aiReviewStatus === 'approved' ||
        aiReviewStatus === 'rejected' ||
        aiReviewStatus === 'applied'
          ? aiReviewStatus
          : undefined,
      limit: Number.isFinite(limit) ? limit : 50,
    });

    const counts = await getFeedbackCounts();

    return NextResponse.json({
      feedback,
      counts,
      total: feedback.length,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Failed to load feedback review queue',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthed(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const action = typeof body.action === 'string' ? body.action : '';
    const limit =
      typeof body.limit === 'number' ? Math.max(1, Math.min(body.limit, 25)) : 10;

    if (action === 'queue') {
      const ids = await getPendingFeedbackIds(limit);
      const jobs = await enqueueFeedbackReviewJobs(ids);
      return NextResponse.json({
        success: true,
        queued: jobs.length,
        jobs: jobs.map((job) => ({
          id: job.id,
          feedbackId: job.payload.feedbackId,
          status: job.status,
        })),
      });
    }

    if (action === 'run') {
      const reviewed = await runFeedbackAutopilot(limit);
      return NextResponse.json({
        success: true,
        reviewed: reviewed.length,
        feedback: reviewed,
      });
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
            : 'Failed to run feedback autopilot',
      },
      { status: 500 },
    );
  }
}
