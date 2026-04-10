import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';
import {
  canAccessServiceDepartment,
  getDepartmentMembership,
  getServiceOpsAuthContext,
} from '@/lib/service-ops/access';

function canManage(
  ctx: NonNullable<Awaited<ReturnType<typeof getServiceOpsAuthContext>>>,
  membership: Awaited<ReturnType<typeof getDepartmentMembership>> | null,
) {
  if (ctx.isElevated) return true;
  if (!membership) return false;
  return ['owner', 'manager'].includes(membership.member_role);
}

async function resolveCounterparty(db: ReturnType<typeof getSupabase>, counterpartyId: string) {
  const { data } = await db
    .from('service_counterparties')
    .select('id, department_key')
    .eq('id', counterpartyId)
    .maybeSingle();
  return data;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; routeId: string } },
) {
  const ctx = await getServiceOpsAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const db = getSupabase();
  const counterparty = await resolveCounterparty(db, params.id);
  if (!counterparty) return NextResponse.json({ error: 'Counterparty not found' }, { status: 404 });
  if (!canAccessServiceDepartment(ctx, counterparty.department_key)) {
    return NextResponse.json({ error: 'Department access denied' }, { status: 403 });
  }

  const membership = !ctx.isElevated ? await getDepartmentMembership(ctx.userId, counterparty.department_key) : null;
  if (!canManage(ctx, membership)) {
    return NextResponse.json({ error: 'Permission required' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const updates: Record<string, unknown> = {};
  const stringFields = [
    'service_slug', 'submission_mode', 'response_capture_mode', 'office_name',
    'geography_scope', 'escalation_policy', 'escalation_contact',
  ];
  for (const f of stringFields) {
    if (typeof body[f] === 'string') updates[f] = String(body[f]).trim() || null;
  }
  const boolFields = [
    'is_primary', 'required_human_review', 'supports_document_exchange',
    'supports_status_updates', 'supports_payment_confirmation', 'auto_follow_up', 'is_active',
  ];
  for (const f of boolFields) {
    if (typeof body[f] === 'boolean') updates[f] = body[f];
  }
  const numFields = ['priority', 'sla_target_hours', 'sla_warning_hours', 'follow_up_interval_hours'];
  for (const f of numFields) {
    if (typeof body[f] === 'number') updates[f] = body[f];
    else if (body[f] === null) updates[f] = null;
  }
  if (typeof body.metadata === 'object' && body.metadata) updates.metadata = body.metadata;

  let nextServiceSlug: string | undefined =
    typeof updates.service_slug === 'string' ? String(updates.service_slug) : undefined;

  if (!nextServiceSlug) {
    const currentRouteResult = await db
      .from('service_counterparty_routes')
      .select('service_slug')
      .eq('id', params.routeId)
      .eq('counterparty_id', params.id)
      .maybeSingle();
    nextServiceSlug = currentRouteResult.data?.service_slug as string | undefined;
  }

  if (updates.is_primary === true) {
    if (!nextServiceSlug) {
      return NextResponse.json({ error: 'Could not resolve service slug for primary route update' }, { status: 400 });
    }

    const { error: demoteError } = await db
      .from('service_counterparty_routes')
      .update({ is_primary: false })
      .eq('service_slug', nextServiceSlug)
      .eq('department_key', counterparty.department_key)
      .eq('is_active', true)
      .neq('id', params.routeId);

    if (demoteError) return NextResponse.json({ error: demoteError.message }, { status: 500 });
  }

  const { data, error } = await db
    .from('service_counterparty_routes')
    .update(updates)
    .eq('id', params.routeId)
    .eq('counterparty_id', params.id)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ route: data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; routeId: string } },
) {
  const ctx = await getServiceOpsAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const db = getSupabase();
  const counterparty = await resolveCounterparty(db, params.id);
  if (!counterparty) return NextResponse.json({ error: 'Counterparty not found' }, { status: 404 });
  if (!canAccessServiceDepartment(ctx, counterparty.department_key)) {
    return NextResponse.json({ error: 'Department access denied' }, { status: 403 });
  }

  const membership = !ctx.isElevated ? await getDepartmentMembership(ctx.userId, counterparty.department_key) : null;
  if (!canManage(ctx, membership)) {
    return NextResponse.json({ error: 'Permission required' }, { status: 403 });
  }

  const { error } = await db
    .from('service_counterparty_routes')
    .delete()
    .eq('id', params.routeId)
    .eq('counterparty_id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
