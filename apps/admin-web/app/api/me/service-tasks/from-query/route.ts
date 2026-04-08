import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ask } from '@/lib/services/ai';
import { getTaskStatus, mapTaskRow } from '@/lib/services/task-engine';
import { getWorkflowDefinition } from '@/lib/services/workflow-definitions';
import type { VaultDoc } from '@/lib/vault/types';

async function getAuthedContext() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

async function listVaultDocs(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>): Promise<VaultDoc[]> {
  const { data } = await supabase.from('vault_documents').select('*').order('created_at', { ascending: false });
  return (data || []).map((row: any) => ({
    id: row.id,
    ownerId: row.owner_id,
    docType: row.doc_type,
    title: row.title,
    number: row.number || undefined,
    issuedOn: row.issued_on || undefined,
    expiresOn: row.expires_on || undefined,
    storagePath: row.storage_path || undefined,
    fileName: row.file_name || undefined,
    fileSize: row.file_size || undefined,
    mimeType: row.mime_type || undefined,
    notes: row.notes || undefined,
    tags: row.tags || [],
    linkedServiceSlugs: row.linked_service_slugs || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function POST(request: NextRequest) {
  const { supabase, user } = await getAuthedContext();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const question = typeof body.question === 'string' ? body.question.trim().slice(0, 500) : '';
  const locale = body.locale === 'ne' ? 'ne' : 'en';
  if (!question) return NextResponse.json({ error: 'question required' }, { status: 400 });

  const result = await ask(question, locale);
  const service = result.topService;
  if (!service) {
    return NextResponse.json({ error: 'No matching service found' }, { status: 404 });
  }

  if (!user) {
    return NextResponse.json({
      requiresAuth: true,
      service: {
        slug: service.slug,
        category: service.category,
        title: service.title,
        providerName: service.providerName,
      },
    });
  }

  const { data: existing } = await supabase
    .from('service_tasks')
    .select('*')
    .eq('service_slug', service.slug)
    .neq('status', 'completed')
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      task: mapTaskRow(existing),
      service: {
        slug: service.slug,
        category: service.category,
        title: service.title,
      },
      reused: true,
    });
  }

  const vaultDocs = await listVaultDocs(supabase);
  const state = getTaskStatus(service, vaultDocs);
  const workflow = getWorkflowDefinition(service);

  const { data, error } = await supabase.from('service_tasks').insert({
    owner_id: user.id,
    service_slug: service.slug,
    service_title: service.title.en,
    service_category: service.category,
    locale,
    status: state.status,
    progress: state.progress,
    current_step: state.currentStep,
    total_steps: state.totalSteps,
    summary: state.summary,
    next_action: state.nextAction,
    workflow_mode: workflow.mode,
    requires_appointment: workflow.requiresAppointment ?? false,
    supports_online_payment: workflow.supportsOnlinePayment ?? false,
    office_visit_required: workflow.officeVisitRequired ?? false,
    milestones: workflow.milestones,
    actions: workflow.actions || [],
    missing_docs: state.missingDocs,
    ready_docs: state.readyDocs,
    answers: { source_query: question },
  }).select('*').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    task: mapTaskRow(data),
    service: {
      slug: service.slug,
      category: service.category,
      title: service.title,
    },
    reused: false,
  });
}
