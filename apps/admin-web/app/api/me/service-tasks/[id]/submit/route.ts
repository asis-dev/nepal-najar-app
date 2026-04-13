import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth/request-user';
import { getAdapter } from '@/lib/services/execution-adapters';
import { loadDraft } from '@/lib/services/form-drafter';
import {
  buildReviewPackage,
  recordSubmissionAttempt,
  validateApproval,
} from '@/lib/services/submission-review';
import { listOwnerVaultDocs } from '@/lib/services/vault-docs';
import { updateCaseStatus, recordReference } from '@/lib/services/case-operations';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: taskId } = await params;

  let body: {
    serviceSlug: string;
    values?: Record<string, string>;
    editedFields?: Record<string, string>;
    declarationsAccepted?: boolean;
    approved?: boolean;
    userNotes?: string;
    documents?: Array<{ type: string; vaultDocId: string }>;
  };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const adapter = getAdapter(body.serviceSlug);
  if (!adapter) {
    return NextResponse.json({ error: 'No adapter available for this service' }, { status: 404 });
  }

  try {
    const draft = await loadDraft(supabase, user.id, taskId);
    if (!draft) {
      return NextResponse.json(
        { error: 'No draft found — generate and review a draft before submission' },
        { status: 404 },
      );
    }

    let attachedDocTypes: string[] = [];
    try {
      const vaultDocs = await listOwnerVaultDocs(supabase, user.id);
      attachedDocTypes = vaultDocs.map((d) => d.docType);
    } catch {
      // Non-critical: validation will rely on the current draft state.
    }

    const pkg = buildReviewPackage(draft, adapter, attachedDocTypes);
    const decision = {
      approved: body.approved === true,
      editedFields: {
        ...(body.values || {}),
        ...(body.editedFields || {}),
      },
      declarationsAccepted: body.declarationsAccepted === true,
      userNotes: body.userNotes,
    };

    const validation = validateApproval(pkg, decision);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Submission requires completed review approval',
          issues: validation.issues,
        },
        { status: 400 },
      );
    }

    const result = await adapter.execute({
      userId: user.id,
      serviceSlug: body.serviceSlug,
      taskId,
      draftValues: {
        ...Object.fromEntries(
          draft.fields
            .filter((field) => field.value !== null && field.value !== '')
            .map((field) => [field.key, String(field.value)]),
        ),
        ...decision.editedFields,
      },
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

    return NextResponse.json({ result });
  } catch (err) {
    console.error('[submit] error:', err);
    return NextResponse.json({ error: 'Submission execution failed' }, { status: 500 });
  }
}
