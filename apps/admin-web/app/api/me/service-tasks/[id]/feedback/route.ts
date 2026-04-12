import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth/request-user';
import { recordFeedback, recordDraftCorrection, recordRouteCorrection } from '@/lib/services/learning-loop';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: taskId } = await params;

  let body: {
    type: 'draft_edit' | 'route_correction' | 'positive' | 'answer_wrong' | 'triage_override';
    fieldKey?: string;
    aiValue?: string;
    userValue?: string;
    originalSlug?: string;
    correctedSlug?: string;
    userQuery?: string;
    comment?: string;
    serviceSlug?: string;
  };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    if (body.type === 'draft_edit' && body.fieldKey && body.aiValue !== undefined && body.userValue !== undefined) {
      await recordDraftCorrection(supabase, user.id, taskId, body.fieldKey, body.aiValue, body.userValue);
    } else if (body.type === 'route_correction' && body.originalSlug && body.correctedSlug && body.userQuery) {
      await recordRouteCorrection(supabase, user.id, body.originalSlug, body.correctedSlug, body.userQuery);
    } else {
      await recordFeedback(supabase, {
        userId: user.id,
        taskId,
        serviceSlug: body.serviceSlug,
        feedbackType: body.type,
        originalValue: body.comment || body.type,
        userComment: body.comment,
      });
    }

    return NextResponse.json({ recorded: true });
  } catch (err) {
    console.error('[feedback] error:', err);
    return NextResponse.json({ error: 'Failed to record feedback' }, { status: 500 });
  }
}
