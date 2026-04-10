import { getSupabase } from '@/lib/supabase/server';
import type { ServiceTaskQueueState } from './types';

export async function getServiceWorkflowPolicy(
  departmentKey: string,
  serviceSlug: string,
) {
  const db = getSupabase();
  const { data } = await db
    .from('service_workflow_policies')
    .select('*')
    .eq('department_key', departmentKey)
    .eq('is_active', true)
    .or(`service_slug.eq.${serviceSlug},service_slug.is.null`)
    .order('priority', { ascending: false });

  return (data || []).find((row: any) => row.service_slug === serviceSlug) || (data || [])[0] || null;
}

export function buildOpsDeadlines(policy: {
  first_response_hours?: number | null;
  resolution_hours?: number | null;
}) {
  const now = Date.now();
  return {
    firstResponseDueAt: policy.first_response_hours
      ? new Date(now + policy.first_response_hours * 60 * 60 * 1000).toISOString()
      : null,
    resolutionDueAt: policy.resolution_hours
      ? new Date(now + policy.resolution_hours * 60 * 60 * 1000).toISOString()
      : null,
  };
}

export async function getAssignableMembers(departmentKey: string) {
  const db = getSupabase();
  const { data } = await db
    .from('service_department_members')
    .select('user_id, member_role, can_assign, can_approve, can_escalate')
    .eq('department_key', departmentKey)
    .eq('is_active', true)
    .in('member_role', ['owner', 'manager', 'case_worker', 'reviewer', 'approver']);

  return (data || []).filter((row: any) => Boolean(row.user_id));
}

export async function chooseLeastLoadedServiceAssignee(
  departmentKey: string,
  candidateUserIds: string[],
): Promise<string | null> {
  if (candidateUserIds.length === 0) return null;

  const db = getSupabase();
  const { data } = await db
    .from('service_task_assignments')
    .select('assignee_user_id')
    .eq('department_key', departmentKey)
    .eq('is_active', true)
    .in('assignee_user_id', candidateUserIds);

  const loadMap = new Map<string, number>();
  for (const userId of candidateUserIds) loadMap.set(userId, 0);
  for (const row of data || []) {
    const userId = row.assignee_user_id as string | null;
    if (!userId || !loadMap.has(userId)) continue;
    loadMap.set(userId, (loadMap.get(userId) || 0) + 1);
  }

  let bestUserId: string | null = null;
  let bestLoad = Number.POSITIVE_INFINITY;
  for (const userId of candidateUserIds) {
    const load = loadMap.get(userId) || 0;
    if (load < bestLoad) {
      bestLoad = load;
      bestUserId = userId;
    }
  }

  return bestUserId;
}

export function mapDecisionToQueueState(
  decision: string,
  fallback: ServiceTaskQueueState,
): ServiceTaskQueueState {
  switch (decision) {
    case 'accepted':
      return 'assigned';
    case 'requested_info':
      return 'waiting_on_citizen';
    case 'approved':
      return 'approved';
    case 'rejected':
      return 'rejected';
    case 'escalated':
      return 'escalated';
    case 'resolved':
      return 'resolved';
    case 'closed':
      return 'closed';
    default:
      return fallback;
  }
}
