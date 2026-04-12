import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth/request-user';
import { loadDraft } from '@/lib/services/form-drafter';
import { getAdapter } from '@/lib/services/execution-adapters';
import { buildReviewPackage, validateApproval, processApprovedSubmission } from '@/lib/services/submission-review';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: taskId } = await params;

  try {
    const draft = await loadDraft(supabase, user.id, taskId);
    if (!draft) return NextResponse.json({ error: 'No draft found — generate a draft first' }, { status: 404 });

    const adapter = getAdapter(draft.serviceSlug);
    // Get attached docs from vault (simplified - just check task)
    const attachedDocs: string[] = []; // TODO: load from vault

    const pkg = buildReviewPackage(draft, adapter, attachedDocs);
    return NextResponse.json({ review: pkg });
  } catch (err) {
    console.error('[review GET] error:', err);
    return NextResponse.json({ error: 'Failed to build review' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: taskId } = await params;

  let body: { approved: boolean; editedFields?: Record<string, string>; declarationsAccepted?: boolean; userNotes?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    const draft = await loadDraft(supabase, user.id, taskId);
    if (!draft) return NextResponse.json({ error: 'No draft found' }, { status: 404 });

    const adapter = getAdapter(draft.serviceSlug);
    const pkg = buildReviewPackage(draft, adapter, []);

    const decision = {
      approved: body.approved,
      editedFields: body.editedFields || {},
      declarationsAccepted: body.declarationsAccepted || false,
      userNotes: body.userNotes,
    };

    const validation = validateApproval(pkg, decision);
    if (!validation.valid) {
      return NextResponse.json({ error: 'Approval validation failed', issues: validation.issues }, { status: 400 });
    }

    const result = await processApprovedSubmission(supabase, user.id, taskId, pkg, decision);
    return NextResponse.json({ submission: result });
  } catch (err) {
    console.error('[review POST] error:', err);
    return NextResponse.json({ error: 'Submission failed' }, { status: 500 });
  }
}
