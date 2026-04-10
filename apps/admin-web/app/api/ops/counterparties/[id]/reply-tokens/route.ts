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

/** GET — list active tokens for this counterparty */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await getServiceOpsAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const db = getSupabase();
  const { data: counterparty } = await db
    .from('service_counterparties')
    .select('department_key')
    .eq('id', params.id)
    .maybeSingle();

  if (!counterparty) return NextResponse.json({ error: 'Counterparty not found' }, { status: 404 });
  if (!canAccessServiceDepartment(ctx, counterparty.department_key)) {
    return NextResponse.json({ error: 'Department access denied' }, { status: 403 });
  }

  const { data, error } = await db
    .from('service_partner_reply_tokens')
    .select(`
      *,
      task:service_tasks(id, service_slug, service_title, status)
    `)
    .eq('counterparty_id', params.id)
    .eq('is_revoked', false)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tokens: data || [] });
}

/** POST — create a reply token for a specific task */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await getServiceOpsAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const db = getSupabase();
  const { data: counterparty } = await db
    .from('service_counterparties')
    .select('id, department_key')
    .eq('id', params.id)
    .maybeSingle();

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

  const taskId = typeof body.task_id === 'string' ? body.task_id.trim() : '';
  if (!taskId) return NextResponse.json({ error: 'task_id is required' }, { status: 400 });

  const scope = typeof body.scope === 'string' ? body.scope.trim() : 'reply';
  const expiryDays = typeof body.expiry_days === 'number' ? body.expiry_days : 7;
  const maxUses = typeof body.max_uses === 'number' ? body.max_uses : 5;

  // Look up route if one exists for this task
  const { data: task } = await db
    .from('service_tasks')
    .select('service_slug')
    .eq('id', taskId)
    .maybeSingle();

  let routeId: string | null = null;
  if (task?.service_slug) {
    const { data: route } = await db
      .from('service_counterparty_routes')
      .select('id')
      .eq('counterparty_id', params.id)
      .eq('service_slug', task.service_slug)
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .limit(1)
      .maybeSingle();
    routeId = route?.id || null;
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiryDays);

  const { data, error } = await db
    .from('service_partner_reply_tokens')
    .insert({
      counterparty_id: params.id,
      task_id: taskId,
      route_id: routeId,
      scope,
      expires_at: expiresAt.toISOString(),
      max_uses: maxUses,
      created_by: ctx.userId,
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const replyUrl = `${request.nextUrl.origin}/partner/reply?token=${data.token}`;

  return NextResponse.json({ token: data, reply_url: replyUrl });
}
