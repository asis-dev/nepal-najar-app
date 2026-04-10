import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';
import {
  canAccessServiceDepartment,
  getDepartmentMembership,
  getServiceOpsAuthContext,
} from '@/lib/service-ops/access';

function canManageMembers(
  ctx: NonNullable<Awaited<ReturnType<typeof getServiceOpsAuthContext>>>,
  membership: Awaited<ReturnType<typeof getDepartmentMembership>> | null,
) {
  if (ctx.isElevated) return true;
  if (!membership) return false;
  return ['owner', 'manager'].includes(membership.member_role);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } },
) {
  const ctx = await getServiceOpsAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const departmentKey = typeof body.department_key === 'string' ? body.department_key.trim() : '';
  if (!departmentKey) {
    return NextResponse.json({ error: 'department_key is required' }, { status: 400 });
  }

  if (!canAccessServiceDepartment(ctx, departmentKey)) {
    return NextResponse.json({ error: 'Department access denied' }, { status: 403 });
  }

  const membership = !ctx.isElevated ? await getDepartmentMembership(ctx.userId, departmentKey) : null;
  if (!canManageMembers(ctx, membership)) {
    return NextResponse.json({ error: 'Member management permission required' }, { status: 403 });
  }

  const updates: Record<string, unknown> = {};
  if (typeof body.member_role === 'string') updates.member_role = body.member_role.trim();
  if ('can_assign' in body) updates.can_assign = Boolean(body.can_assign);
  if ('can_approve' in body) updates.can_approve = Boolean(body.can_approve);
  if ('can_escalate' in body) updates.can_escalate = Boolean(body.can_escalate);
  if ('is_active' in body) updates.is_active = Boolean(body.is_active);

  const db = getSupabase();
  const { data, error } = await db
    .from('service_department_members')
    .update(updates)
    .eq('department_key', departmentKey)
    .eq('user_id', params.userId)
    .select('department_key, user_id, member_role, can_assign, can_approve, can_escalate, is_active')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ member: data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } },
) {
  const ctx = await getServiceOpsAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const departmentKey = request.nextUrl.searchParams.get('department_key')?.trim() || '';
  if (!departmentKey) {
    return NextResponse.json({ error: 'department_key is required' }, { status: 400 });
  }

  if (!canAccessServiceDepartment(ctx, departmentKey)) {
    return NextResponse.json({ error: 'Department access denied' }, { status: 403 });
  }

  const membership = !ctx.isElevated ? await getDepartmentMembership(ctx.userId, departmentKey) : null;
  if (!canManageMembers(ctx, membership)) {
    return NextResponse.json({ error: 'Member management permission required' }, { status: 403 });
  }

  const db = getSupabase();
  const { error } = await db
    .from('service_department_members')
    .delete()
    .eq('department_key', departmentKey)
    .eq('user_id', params.userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
