import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth/request-user';
import { getAdapter } from '@/lib/services/execution-adapters';
import { recordSubmissionAttempt } from '@/lib/services/submission-review';
import { updateCaseStatus, recordReference } from '@/lib/services/case-operations';
import { learnFromFormSubmission } from '@/lib/services/profile-memory';

export async function POST(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  const { supabase, user } = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { taskId } = await params;

  let body: { serviceSlug: string; values: Record<string, string>; documents?: Array<{ type: string; vaultDocId: string }> };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const adapter = getAdapter(body.serviceSlug);
  if (!adapter) {
    return NextResponse.json({ error: 'No adapter available for this service' }, { status: 404 });
  }

  try {
    const result = await adapter.execute({
      userId: user.id,
      serviceSlug: body.serviceSlug,
      taskId,
      draftValues: body.values,
      documents: body.documents || [],
    });

    await recordSubmissionAttempt(supabase, taskId, {
      success: result.success,
      referenceNumber: result.referenceNumber,
      error: result.error,
      method: result.mode,
    });

    if (result.success && result.referenceNumber) {
      await recordReference(supabase, taskId, result.referenceNumber, 'application_id');
      await updateCaseStatus(supabase, taskId, 'submitted', `Submitted via ${result.mode}`);
    }

    // Learn from this submission to improve profile data
    // (We'd need the form schema here; skip if unavailable)

    return NextResponse.json({ result });
  } catch (err) {
    console.error('[submit] error:', err);
    return NextResponse.json({ error: 'Submission execution failed' }, { status: 500 });
  }
}
