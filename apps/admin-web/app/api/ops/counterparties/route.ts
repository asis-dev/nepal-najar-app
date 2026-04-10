import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';
import {
  canAccessServiceDepartment,
  getDepartmentMembership,
  getServiceOpsAuthContext,
} from '@/lib/service-ops/access';
import { getCounterpartySummary } from '@/lib/service-ops/counterparties';

function canManageCounterparties(
  ctx: NonNullable<Awaited<ReturnType<typeof getServiceOpsAuthContext>>>,
  membership: Awaited<ReturnType<typeof getDepartmentMembership>> | null,
) {
  if (ctx.isElevated) return true;
  if (!membership) return false;
  return ['owner', 'manager'].includes(membership.member_role);
}

export async function GET(request: NextRequest) {
  const ctx = await getServiceOpsAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const searchParams = request.nextUrl.searchParams;
  const departmentKey = searchParams.get('department_key')?.trim() || null;
  const stage = searchParams.get('adoption_stage')?.trim() || null;

  if (departmentKey && !canAccessServiceDepartment(ctx, departmentKey)) {
    return NextResponse.json({ error: 'Department access denied' }, { status: 403 });
  }

  const db = getSupabase();
  let query = db
    .from('service_counterparties')
    .select(`
      *,
      route_count:service_counterparty_routes(count),
      channel_count:service_counterparty_channels(count)
    `)
    .eq('is_active', true)
    .order('adoption_stage', { ascending: true })
    .order('name', { ascending: true });

  if (departmentKey) query = query.eq('department_key', departmentKey);
  if (stage) query = query.eq('adoption_stage', stage);
  if (!ctx.isElevated && ctx.departmentsScope && ctx.departmentsScope.length > 0) {
    query = query.in('department_key', ctx.departmentsScope);
  }

  if (!ctx.isElevated && (!ctx.departmentsScope || ctx.departmentsScope.length === 0)) {
    return NextResponse.json({ counterparties: [], summary: await getCounterpartySummary() });
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    counterparties: (data || []).map((row: any) => ({
      ...row,
      route_count: row.route_count?.[0]?.count || 0,
      channel_count: row.channel_count?.[0]?.count || 0,
    })),
    summary: await getCounterpartySummary(),
  });
}

export async function POST(request: NextRequest) {
  const ctx = await getServiceOpsAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const departmentKey = typeof body.department_key === 'string' ? body.department_key.trim() : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const key = typeof body.key === 'string' ? body.key.trim() : '';
  if (!departmentKey || !name || !key) {
    return NextResponse.json({ error: 'department_key, key, and name are required' }, { status: 400 });
  }

  if (!canAccessServiceDepartment(ctx, departmentKey)) {
    return NextResponse.json({ error: 'Department access denied' }, { status: 403 });
  }

  const membership = !ctx.isElevated ? await getDepartmentMembership(ctx.userId, departmentKey) : null;
  if (!canManageCounterparties(ctx, membership)) {
    return NextResponse.json({ error: 'Counterparty management permission required' }, { status: 403 });
  }

  const db = getSupabase();
  const payload = {
    key,
    name,
    name_ne: typeof body.name_ne === 'string' ? body.name_ne.trim() : null,
    department_key: departmentKey,
    kind: typeof body.kind === 'string' ? body.kind.trim() : 'government',
    authority_level: typeof body.authority_level === 'string' ? body.authority_level.trim() : 'provider',
    jurisdiction_scope: typeof body.jurisdiction_scope === 'string' ? body.jurisdiction_scope.trim() : null,
    service_category: typeof body.service_category === 'string' ? body.service_category.trim() : null,
    adoption_stage: typeof body.adoption_stage === 'string' ? body.adoption_stage.trim() : 'identified',
    default_submission_mode: typeof body.default_submission_mode === 'string' ? body.default_submission_mode.trim() : 'manual',
    default_response_mode: typeof body.default_response_mode === 'string' ? body.default_response_mode.trim() : 'manual',
    contact_email: typeof body.contact_email === 'string' ? body.contact_email.trim() : null,
    contact_phone: typeof body.contact_phone === 'string' ? body.contact_phone.trim() : null,
    notes: typeof body.notes === 'string' ? body.notes.trim() : null,
    metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata : {},
    is_active: body.is_active !== false,
  };

  const { data, error } = await db
    .from('service_counterparties')
    .upsert(payload, { onConflict: 'key' })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ counterparty: data });
}
