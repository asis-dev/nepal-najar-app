import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getServiceBySlug } from '@/lib/services/catalog';
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

export async function GET() {
  const { supabase, user } = await getAuthedContext();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('service_tasks')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    tasks: (data || []).map(mapTaskRow),
  });
}

export async function POST(request: NextRequest) {
  const { supabase, user } = await getAuthedContext();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const serviceSlug = typeof body.serviceSlug === 'string' ? body.serviceSlug.trim() : '';
  const locale = body.locale === 'ne' ? 'ne' : 'en';
  if (!serviceSlug) return NextResponse.json({ error: 'serviceSlug required' }, { status: 400 });

  const service = await getServiceBySlug(serviceSlug);
  if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 });

  const { data: existing } = await supabase
    .from('service_tasks')
    .select('*')
    .eq('service_slug', serviceSlug)
    .neq('status', 'completed')
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ task: mapTaskRow(existing), reused: true });
  }

  const vaultDocs = await listVaultDocs(supabase);
  const state = getTaskStatus(service, vaultDocs);
  const workflow = getWorkflowDefinition(service);

  const insertPayload = {
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
    answers: {},
  };

  const { data, error } = await supabase.from('service_tasks').insert(insertPayload).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('service_task_events').insert({
    task_id: data.id,
    owner_id: user.id,
    event_type: 'task_started',
    note: `Started ${service.title.en}`,
    meta: { service_slug: service.slug, status: state.status },
  });

  return NextResponse.json({ task: mapTaskRow(data), reused: false });
}
