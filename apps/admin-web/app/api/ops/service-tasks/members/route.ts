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

export async function GET(request: NextRequest) {
  const ctx = await getServiceOpsAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const departmentKey = request.nextUrl.searchParams.get('department_key')?.trim() || null;
  if (!departmentKey) {
    return NextResponse.json({ error: 'department_key is required' }, { status: 400 });
  }

  if (!canAccessServiceDepartment(ctx, departmentKey)) {
    return NextResponse.json({ error: 'Department access denied' }, { status: 403 });
  }

  const db = getSupabase();
  const { data: members, error: memberError } = await db
    .from('service_department_members')
    .select('department_key, user_id, member_role, can_assign, can_approve, can_escalate, is_active')
    .eq('department_key', departmentKey)
    .order('created_at', { ascending: true });

  if (memberError) return NextResponse.json({ error: memberError.message }, { status: 500 });

  const userIds = (members || []).map((row) => row.user_id as string).filter(Boolean);
  const { data: profiles } = userIds.length
    ? await db
        .from('profiles')
        .select('id, display_name, email, role')
        .in('id', userIds)
    : { data: [] as any[] };

  const profileMap = new Map((profiles || []).map((profile: any) => [profile.id, profile]));

  return NextResponse.json({
    members: (members || []).map((member: any) => ({
      ...member,
      profile: profileMap.get(member.user_id) || null,
    })),
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
  const userId = typeof body.user_id === 'string' ? body.user_id.trim() : '';
  const memberRole = typeof body.member_role === 'string' ? body.member_role.trim() : 'case_worker';

  if (!departmentKey || !userId) {
    return NextResponse.json({ error: 'department_key and user_id are required' }, { status: 400 });
  }

  if (!canAccessServiceDepartment(ctx, departmentKey)) {
    return NextResponse.json({ error: 'Department access denied' }, { status: 403 });
  }

  const membership = !ctx.isElevated ? await getDepartmentMembership(ctx.userId, departmentKey) : null;
  if (!canManageMembers(ctx, membership)) {
    return NextResponse.json({ error: 'Member management permission required' }, { status: 403 });
  }

  const db = getSupabase();
  const { data: profile } = await db
    .from('profiles')
    .select('id, display_name, email, role')
    .eq('id', userId)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: 'Target user not found' }, { status: 400 });
  }

  const payload = {
    department_key: departmentKey,
    user_id: userId,
    member_role: memberRole,
    can_assign: Boolean(body.can_assign),
    can_approve: Boolean(body.can_approve),
    can_escalate: Boolean(body.can_escalate),
    is_active: body.is_active !== false,
  };

  const { data, error } = await db
    .from('service_department_members')
    .upsert(payload)
    .select('department_key, user_id, member_role, can_assign, can_approve, can_escalate, is_active')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    member: {
      ...data,
      profile,
    },
  });
}
