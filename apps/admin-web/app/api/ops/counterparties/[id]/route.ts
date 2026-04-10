import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';
import {
  canAccessServiceDepartment,
  getDepartmentMembership,
  getServiceOpsAuthContext,
} from '@/lib/service-ops/access';
import { getCounterpartyRouteHealth } from '@/lib/service-ops/route-health';

function canManageCounterparties(
  ctx: NonNullable<Awaited<ReturnType<typeof getServiceOpsAuthContext>>>,
  membership: Awaited<ReturnType<typeof getDepartmentMembership>> | null,
) {
  if (ctx.isElevated) return true;
  if (!membership) return false;
  return ['owner', 'manager'].includes(membership.member_role);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await getServiceOpsAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const db = getSupabase();
  const [{ data, error }, { data: recentReplies }] = await Promise.all([
    db
      .from('service_counterparties')
      .select(`
        *,
        channels:service_counterparty_channels(*),
        routes:service_counterparty_routes(*)
      `)
      .eq('id', params.id)
      .maybeSingle(),
    db
      .from('service_partner_replies')
      .select('id, task_id, reply_type, content, new_status, created_at')
      .eq('counterparty_id', params.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Counterparty not found' }, { status: 404 });
  if (!canAccessServiceDepartment(ctx, data.department_key)) {
    return NextResponse.json({ error: 'Department access denied' }, { status: 403 });
  }

  const health = await getCounterpartyRouteHealth(params.id);

  return NextResponse.json({
    counterparty: data,
    route_health: health.routeHealth,
    route_health_summary: health.summary,
    reply_token_stats: health.tokenStats,
    recent_partner_replies: recentReplies || [],
  });
}

export async function PATCH(
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
  const { data: current, error: currentError } = await db
    .from('service_counterparties')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (currentError) return NextResponse.json({ error: currentError.message }, { status: 500 });
  if (!current) return NextResponse.json({ error: 'Counterparty not found' }, { status: 404 });
  if (!canAccessServiceDepartment(ctx, current.department_key)) {
    return NextResponse.json({ error: 'Department access denied' }, { status: 403 });
  }

  const membership = !ctx.isElevated ? await getDepartmentMembership(ctx.userId, current.department_key) : null;
  if (!canManageCounterparties(ctx, membership)) {
    return NextResponse.json({ error: 'Counterparty management permission required' }, { status: 403 });
  }

  const updates: Record<string, unknown> = {};
  for (const field of [
    'name',
    'name_ne',
    'kind',
    'authority_level',
    'jurisdiction_scope',
    'service_category',
    'adoption_stage',
    'default_submission_mode',
    'default_response_mode',
    'contact_email',
    'contact_phone',
    'notes',
  ]) {
    if (typeof body[field] === 'string') updates[field] = String(body[field]).trim() || null;
  }
  if (typeof body.is_active === 'boolean') updates.is_active = body.is_active;
  if (typeof body.metadata === 'object' && body.metadata) updates.metadata = body.metadata;

  const { data, error } = await db
    .from('service_counterparties')
    .update(updates)
    .eq('id', params.id)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ counterparty: data });
}
