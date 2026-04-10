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
    .from('service_counterparty_channels')
    .select('*')
    .eq('counterparty_id', params.id)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ channels: data || [] });
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

  const label = typeof body.label === 'string' ? body.label.trim() : '';
  const channelType = typeof body.channel_type === 'string' ? body.channel_type.trim() : '';
  if (!label || !channelType) {
    return NextResponse.json({ error: 'label and channel_type are required' }, { status: 400 });
  }

  const { data, error } = await db
    .from('service_counterparty_channels')
    .insert({
      counterparty_id: counterparty.id,
      channel_type: channelType,
      direction: typeof body.direction === 'string' ? body.direction.trim() : 'bidirectional',
      label,
      endpoint: typeof body.endpoint === 'string' ? body.endpoint.trim() : null,
      supports_status_sync: Boolean(body.supports_status_sync),
      requires_human_bridge: Boolean(body.requires_human_bridge),
      metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata : {},
      is_active: body.is_active !== false,
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ channel: data });
}
