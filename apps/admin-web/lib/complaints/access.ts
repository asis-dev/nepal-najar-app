import type { User } from '@supabase/supabase-js';
import { createSupabaseServerClient, getSupabase } from '@/lib/supabase/server';
import type { ComplaintCase, ComplaintStatus } from '@/lib/complaints/types';
import { isElevatedRole } from '@/lib/auth/roles';

export interface ComplaintAuthContext {
  user: User | null;
  role: string | null;
  isElevated: boolean;
}

export async function getComplaintAuthContext(): Promise<ComplaintAuthContext> {
  let user: User | null = null;
  try {
    const ssr = await createSupabaseServerClient();
    const {
      data: { user: authUser },
    } = await ssr.auth.getUser();
    user = authUser ?? null;
  } catch {
    user = null;
  }

  let role: string | null = null;
  if (user?.id) {
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
  }

  const isElevated = isElevatedRole(role);
  return { user, role, isElevated };
}

export function isComplaintOwner(
  complaint: Pick<ComplaintCase, 'user_id'>,
  userId: string | null,
): boolean {
  return Boolean(userId && complaint.user_id === userId);
}

export function canViewComplaint(
  complaint: Pick<ComplaintCase, 'is_public' | 'user_id'>,
  context: ComplaintAuthContext,
): boolean {
  if (complaint.is_public) return true;
  if (context.isElevated) return true;
  return isComplaintOwner(complaint, context.user?.id ?? null);
}

const STATUS_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  submitted: ['triaged', 'routed', 'acknowledged', 'rejected', 'duplicate'],
  triaged: ['routed', 'acknowledged', 'needs_info', 'rejected', 'duplicate'],
  routed: ['acknowledged', 'in_progress', 'needs_info', 'rejected', 'duplicate'],
  acknowledged: ['in_progress', 'needs_info', 'resolved', 'rejected'],
  in_progress: ['resolved', 'needs_info', 'rejected'],
  resolved: ['closed', 'reopened'],
  closed: ['reopened'],
  needs_info: ['triaged', 'routed', 'acknowledged', 'in_progress', 'rejected'],
  rejected: ['reopened'],
  duplicate: ['reopened'],
  reopened: ['triaged', 'routed', 'acknowledged', 'in_progress', 'resolved'],
};

export function canTransitionComplaintStatus(
  from: ComplaintStatus,
  to: ComplaintStatus,
): boolean {
  if (from === to) return true;
  const allowed = STATUS_TRANSITIONS[from] ?? [];
  return allowed.includes(to);
}

export async function getAccessibleDepartmentKeysForUser(
  userId: string | null,
  isElevated: boolean,
): Promise<string[] | null> {
  if (!userId) return [];
  if (isElevated) return null;

  const db = getSupabase();
  const { data } = await db
    .from('complaint_department_members')
    .select('department_key')
    .eq('user_id', userId)
    .eq('is_active', true);

  return (data || [])
    .map((row) => row.department_key as string)
    .filter(Boolean);
}
