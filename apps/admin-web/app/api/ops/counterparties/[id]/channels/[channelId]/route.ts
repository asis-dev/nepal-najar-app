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
  { params }: { params: { id: string; channelId: string } },
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
  if (typeof body.label === 'string') updates.label = body.label.trim();
  if (typeof body.channel_type === 'string') updates.channel_type = body.channel_type.trim();
  if (typeof body.direction === 'string') updates.direction = body.direction.trim();
  if (typeof body.endpoint === 'string') updates.endpoint = body.endpoint.trim() || null;
  if (typeof body.supports_status_sync === 'boolean') updates.supports_status_sync = body.supports_status_sync;
  if (typeof body.requires_human_bridge === 'boolean') updates.requires_human_bridge = body.requires_human_bridge;
  if (typeof body.is_active === 'boolean') updates.is_active = body.is_active;
  if (typeof body.metadata === 'object' && body.metadata) updates.metadata = body.metadata;

  const { data, error } = await db
    .from('service_counterparty_channels')
    .update(updates)
    .eq('id', params.channelId)
    .eq('counterparty_id', params.id)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ channel: data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; channelId: string } },
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
    .from('service_counterparty_channels')
    .delete()
    .eq('id', params.channelId)
    .eq('counterparty_id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
