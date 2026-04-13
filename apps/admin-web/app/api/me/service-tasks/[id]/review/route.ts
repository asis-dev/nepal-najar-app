import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth/request-user';
import { loadDraft } from '@/lib/services/form-drafter';
import { getAdapter } from '@/lib/services/execution-adapters';
import { buildReviewPackage, validateApproval, processApprovedSubmission } from '@/lib/services/submission-review';
import { listOwnerVaultDocs } from '@/lib/services/vault-docs';
import { learnFromFormSubmission } from '@/lib/services/profile-memory';
import { recordSubmissionAttempt } from '@/lib/services/submission-review';

function toLegacyReviewShape(pkg: ReturnType<typeof buildReviewPackage>) {
  return {
    serviceTitle: pkg.serviceTitle,
    target: {
      office: pkg.submissionTarget,
      method: pkg.submissionMethod,
    },
    fields: pkg.items.map((item) => ({
      key: item.fieldKey,
      label: item.label,
      value: item.value,
      source: item.source,
      confidence: Math.round(item.confidence * 100),
      requiresApproval: item.requiresExplicitApproval,
      approved: !item.requiresExplicitApproval,
    })),
    documents: pkg.documents.map((doc) => ({
      name: doc.label,
      required: true,
      attached: doc.attached,
    })),
    declarations: pkg.legalDeclarations.map((text, index) => ({
      id: `decl-${index + 1}`,
      text,
    })),
    warnings: pkg.warnings.map((message) => ({ message })),
    blockingReasons: pkg.blockingReasons,
    feeEstimate: pkg.estimatedFee
      ? { min: 0, max: 0, currency: pkg.estimatedFee }
      : null,
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: taskId } = await params;

  try {
    const draft = await loadDraft(supabase, user.id, taskId);
    if (!draft) return NextResponse.json({ error: 'No draft found — generate a draft first' }, { status: 404 });

    const adapter = getAdapter(draft.serviceSlug);

    // Load real vault documents for this user
    let attachedDocTypes: string[] = [];
    try {
      const vaultDocs = await listOwnerVaultDocs(supabase, user.id);
      attachedDocTypes = vaultDocs.map((d) => d.docType);
    } catch {
      // vault_documents table may not exist — proceed with empty
    }

    const pkg = buildReviewPackage(draft, adapter, attachedDocTypes);

    // Also load task-level doc status if available
    try {
      const { data: task } = await supabase
        .from('service_tasks')
        .select('missing_docs, ready_docs')
        .eq('id', taskId)
        .maybeSingle();
      if (task) {
        // Enrich the package with task-level doc info
        const readyDocs = (task.ready_docs || []).map((d: any) =>
          typeof d === 'string' ? d : d.docType || d.label || String(d),
        );
        // Mark documents as attached if they appear in ready_docs
        for (const doc of pkg.documents) {
          if (readyDocs.some((rd: string) => doc.type.includes(rd) || rd.includes(doc.type))) {
            doc.attached = true;
          }
        }
      }
    } catch {
      // Non-critical
    }

    return NextResponse.json({
      ...toLegacyReviewShape(pkg),
      review: pkg,
    });
  } catch (err) {
    console.error('[review GET] error:', err);
    return NextResponse.json({ error: 'Failed to build review' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: taskId } = await params;

  let body: {
    approved: boolean;
    editedFields?: Record<string, string>;
    declarationsAccepted?: boolean;
    userNotes?: string;
    fields?: Array<{ key: string; value: string; approved?: boolean }>;
    declarations?: Array<{ id: string; checked: boolean }>;
  };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    const draft = await loadDraft(supabase, user.id, taskId);
    if (!draft) return NextResponse.json({ error: 'No draft found' }, { status: 404 });

    const adapter = getAdapter(draft.serviceSlug);

    // Load real vault docs for validation
    let attachedDocTypes: string[] = [];
    try {
      const vaultDocs = await listOwnerVaultDocs(supabase, user.id);
      attachedDocTypes = vaultDocs.map((d) => d.docType);
    } catch { /* non-critical */ }

    const pkg = buildReviewPackage(draft, adapter, attachedDocTypes);

    const editedFields =
      body.editedFields ||
      Object.fromEntries(
        (body.fields || []).map((field) => [field.key, field.value]),
      );
    const declarationsAccepted =
      body.declarationsAccepted ??
      (body.declarations ? body.declarations.every((decl) => decl.checked) : false);

    const decision = {
      approved: body.approved,
      editedFields,
      declarationsAccepted,
      userNotes: body.userNotes,
    };

    const validation = validateApproval(pkg, decision);
    if (!validation.valid) {
      return NextResponse.json({ error: 'Approval validation failed', issues: validation.issues }, { status: 400 });
    }

    const result = await processApprovedSubmission(supabase, user.id, taskId, pkg, decision);

    // Record attempt for audit trail
    await recordSubmissionAttempt(supabase, taskId, {
      success: result.success,
      referenceNumber: result.referenceNumber,
      error: result.error,
      method: pkg.submissionMethod,
    });

    // Learn profile fields from the approved submission (fire-and-forget)
    if (result.success) {
      const formValues: Record<string, string> = {};
      for (const item of pkg.items) {
        const finalValue = decision.editedFields[item.fieldKey] ?? item.value;
        if (finalValue) formValues[item.fieldKey] = finalValue;
      }
      // We don't have the schema here but can pass a minimal one
      const minimalSchema = {
        sections: [{ fields: draft.fields.map((f) => ({ key: f.key, profileKey: f.source === 'profile' ? f.key : undefined })) }],
      };
      learnFromFormSubmission(supabase, user.id, draft.serviceSlug, formValues, minimalSchema).catch(() => {});
    }

    return NextResponse.json({ submission: result });
  } catch (err) {
    console.error('[review POST] error:', err);
    return NextResponse.json({ error: 'Submission failed' }, { status: 500 });
  }
}
