import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthed } from '@/lib/auth/admin';
import {
  applyFeedbackAutopilotDecision,
  approveFeedbackReview,
  rejectFeedbackReview,
  reviewFeedbackItem,
} from '@/lib/intelligence/feedback-review';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!(await isAdminAuthed(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const action = typeof body.action === 'string' ? body.action : '';
    const notes = typeof body.notes === 'string' ? body.notes : null;

    if (action === 'review') {
      const feedback = await reviewFeedbackItem(params.id);
      return NextResponse.json({ success: true, feedback });
    }

    if (action === 'approve') {
      const feedback = await approveFeedbackReview(params.id, 'admin', notes);
      return NextResponse.json({ success: true, feedback });
    }

    if (action === 'reject') {
      const feedback = await rejectFeedbackReview(params.id, 'admin', notes);
      return NextResponse.json({ success: true, feedback });
    }

    if (action === 'apply') {
      const feedback = await applyFeedbackAutopilotDecision(params.id, 'admin');
      return NextResponse.json({ success: true, feedback });
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
            : 'Failed to update feedback autopilot state',
      },
      { status: 500 },
    );
  }
}
