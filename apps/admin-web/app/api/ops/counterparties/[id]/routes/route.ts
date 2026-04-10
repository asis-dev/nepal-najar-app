import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';
import {
  canAccessServiceDepartment,
  getDepartmentMembership,
  getServiceOpsAuthContext,
} from '@/lib/service-ops/access';

function canManageCounterpartyConfig(
  ctx: NonNullable<Awaited<ReturnType<typeof getServiceOpsAuthContext>>>,
  membership: Awaited<ReturnType<typeof getDepartmentMembership>> | null,
) {
  if (ctx.isElevated) return true;
  if (!membership) return false;
  return ['owner', 'manager'].includes(membership.member_role);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await getServiceOpsAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const db = getSupabase();
  const { data: counterparty, error: counterpartyError } = await db
    .from('service_counterparties')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (counterpartyError) return NextResponse.json({ error: counterpartyError.message }, { status: 500 });
  if (!counterparty) return NextResponse.json({ error: 'Counterparty not found' }, { status: 404 });
  if (!canAccessServiceDepartment(ctx, counterparty.department_key)) {
    return NextResponse.json({ error: 'Department access denied' }, { status: 403 });
  }

  const membership = !ctx.isElevated ? await getDepartmentMembership(ctx.userId, counterparty.department_key) : null;
  if (!canManageCounterpartyConfig(ctx, membership)) {
    return NextResponse.json({ error: 'Counterparty management permission required' }, { status: 403 });
  }

  const serviceSlug = typeof body.service_slug === 'string' ? body.service_slug.trim() : '';
  if (!serviceSlug) return NextResponse.json({ error: 'service_slug is required' }, { status: 400 });
  const isPrimary = Boolean(body.is_primary);

  if (isPrimary) {
    const { error: demoteError } = await db
      .from('service_counterparty_routes')
      .update({ is_primary: false })
      .eq('service_slug', serviceSlug)
      .eq('department_key', counterparty.department_key)
      .eq('is_active', true);

    if (demoteError) return NextResponse.json({ error: demoteError.message }, { status: 500 });
  }

  const { data, error } = await db
    .from('service_counterparty_routes')
    .insert({
      service_slug: serviceSlug,
      department_key: counterparty.department_key,
      counterparty_id: counterparty.id,
      office_name: typeof body.office_name === 'string' ? body.office_name.trim() : null,
      geography_scope: typeof body.geography_scope === 'string' ? body.geography_scope.trim() : null,
      priority: typeof body.priority === 'number' ? body.priority : 100,
      is_primary: isPrimary,
      submission_mode: typeof body.submission_mode === 'string' ? body.submission_mode.trim() : 'manual',
      response_capture_mode: typeof body.response_capture_mode === 'string' ? body.response_capture_mode.trim() : 'manual',
      required_human_review: body.required_human_review !== false,
      supports_document_exchange: Boolean(body.supports_document_exchange),
      supports_status_updates: Boolean(body.supports_status_updates),
      supports_payment_confirmation: Boolean(body.supports_payment_confirmation),
      sla_target_hours: typeof body.sla_target_hours === 'number' ? body.sla_target_hours : null,
      sla_warning_hours: typeof body.sla_warning_hours === 'number' ? body.sla_warning_hours : null,
      escalation_policy: typeof body.escalation_policy === 'string' ? body.escalation_policy.trim() : 'none',
      escalation_contact: typeof body.escalation_contact === 'string' ? body.escalation_contact.trim() : null,
      auto_follow_up: Boolean(body.auto_follow_up),
      follow_up_interval_hours: typeof body.follow_up_interval_hours === 'number' ? body.follow_up_interval_hours : 48,
      metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata : {},
      is_active: body.is_active !== false,
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ route: data });
}
