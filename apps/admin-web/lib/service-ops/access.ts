import { createSupabaseServerClient, getSupabase } from '@/lib/supabase/server';
import { isElevatedRole } from '@/lib/auth/roles';
import type { ServiceDepartmentMemberRole, ServiceTaskOpsContext } from './types';

export async function getServiceOpsAuthContext(): Promise<ServiceTaskOpsContext | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  let role: string | null = null;
  try {
    const db = getSupabase();
    const { data } = await db
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    role = (data?.role as string | undefined) ?? null;
  } catch {
    role = null;
  }

  const isElevated = isElevatedRole(role);
  const departmentsScope = await getAccessibleServiceDepartmentKeysForUser(user.id, isElevated);
  return {
    userId: user.id,
    role,
    isElevated,
    departmentsScope,
  };
}

export async function getAccessibleServiceDepartmentKeysForUser(
  userId: string,
  isElevated: boolean,
): Promise<string[] | null> {
  if (isElevated) return null;

  const db = getSupabase();
  const { data } = await db
    .from('service_department_members')
    .select('department_key')
    .eq('user_id', userId)
    .eq('is_active', true);

  return (data || [])
    .map((row) => row.department_key as string)
    .filter(Boolean);
}

export function canAccessServiceDepartment(
  ctx: ServiceTaskOpsContext,
  departmentKey: string | null | undefined,
): boolean {
  if (ctx.isElevated) return true;
  if (!departmentKey) return false;
  return (ctx.departmentsScope || []).includes(departmentKey);
}

export async function getDepartmentMembership(
  userId: string,
  departmentKey: string,
): Promise<{
  department_key: string;
  user_id: string;
  member_role: ServiceDepartmentMemberRole;
  can_assign: boolean;
  can_approve: boolean;
  can_escalate: boolean;
  is_active: boolean;
} | null> {
  const db = getSupabase();
  const { data } = await db
    .from('service_department_members')
    .select('*')
    .eq('user_id', userId)
    .eq('department_key', departmentKey)
    .eq('is_active', true)
    .maybeSingle();

  return (data as any) || null;
}

export async function requireDepartmentAccess(
  ctx: ServiceTaskOpsContext,
  departmentKey: string | null | undefined,
) {
  if (canAccessServiceDepartment(ctx, departmentKey)) return true;
  return false;
}
