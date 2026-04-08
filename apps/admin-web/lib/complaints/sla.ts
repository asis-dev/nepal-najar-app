import type { SupabaseClient } from '@supabase/supabase-js';
import type { ComplaintCase, ComplaintSlaPolicy, ComplaintStatus } from '@/lib/complaints/types';

const TERMINAL_STATUSES: ComplaintStatus[] = ['resolved', 'closed', 'rejected', 'duplicate'];
const PRE_ACK_STATUSES: ComplaintStatus[] = ['submitted', 'triaged', 'routed', 'reopened'];

export type ComplaintSlaState = 'not_applicable' | 'on_track' | 'due_soon' | 'breached' | 'paused';

export function isTerminalComplaintStatus(status: ComplaintStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

function parseIsoToMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

function addHours(baseIso: string, hours: number): string {
  const base = new Date(baseIso).getTime();
  const dueMs = base + hours * 60 * 60 * 1000;
  return new Date(dueMs).toISOString();
}

function addMinutes(baseIso: string, minutes: number): string {
  if (minutes <= 0) return baseIso;
  const base = new Date(baseIso).getTime();
  const dueMs = base + minutes * 60 * 1000;
  return new Date(dueMs).toISOString();
}

function policySpecificityScore(
  policy: ComplaintSlaPolicy,
  complaint: Pick<ComplaintCase, 'issue_type' | 'severity' | 'assigned_department_key' | 'department_key'>,
): number {
  let score = policy.priority || 0;
  if (policy.issue_type && policy.issue_type === complaint.issue_type) score += 100;
  if (policy.severity && policy.severity === complaint.severity) score += 60;

  const effectiveDepartment = complaint.assigned_department_key || complaint.department_key;
  if (policy.department_key && policy.department_key === effectiveDepartment) score += 80;
  return score;
}

export async function resolveComplaintSlaPolicy(
  db: SupabaseClient,
  complaint: Pick<ComplaintCase, 'issue_type' | 'severity' | 'assigned_department_key' | 'department_key'>,
): Promise<ComplaintSlaPolicy | null> {
  const { data, error } = await db
    .from('complaint_sla_policies')
    .select('*')
    .eq('is_active', true);

  if (error || !data || data.length === 0) return null;

  const effectiveDepartment = complaint.assigned_department_key || complaint.department_key;
  const candidates = (data as ComplaintSlaPolicy[]).filter((policy) => {
    if (policy.issue_type && policy.issue_type !== complaint.issue_type) return false;
    if (policy.severity && policy.severity !== complaint.severity) return false;
    if (policy.department_key && effectiveDepartment && policy.department_key !== effectiveDepartment) return false;
    if (policy.department_key && !effectiveDepartment) return false;
    return true;
  });

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => policySpecificityScore(b, complaint) - policySpecificityScore(a, complaint));
  return candidates[0];
}

export function computeComplaintSlaDueAt(
  complaint: Pick<
    ComplaintCase,
    'status' | 'created_at' | 'first_acknowledged_at' | 'sla_total_paused_minutes' | 'sla_paused_at'
  >,
  policy: Pick<ComplaintSlaPolicy, 'ack_hours' | 'resolve_hours'>,
): { dueAt: string | null; targetHours: number | null } {
  if (isTerminalComplaintStatus(complaint.status)) {
    return { dueAt: null, targetHours: null };
  }

  const nowMs = Date.now();
  const pausedNowMs = parseIsoToMs(complaint.sla_paused_at);
  const totalPausedMinutes =
    Math.max(0, complaint.sla_total_paused_minutes || 0)
    + (pausedNowMs ? Math.max(0, Math.floor((nowMs - pausedNowMs) / 60000)) : 0);

  if (PRE_ACK_STATUSES.includes(complaint.status) && !complaint.first_acknowledged_at) {
    const baseDue = addHours(complaint.created_at, policy.ack_hours);
    return {
      dueAt: addMinutes(baseDue, totalPausedMinutes),
      targetHours: policy.ack_hours,
    };
  }

  const base = complaint.first_acknowledged_at || complaint.created_at;
  const baseDue = addHours(base, policy.resolve_hours);
  return {
    dueAt: addMinutes(baseDue, totalPausedMinutes),
    targetHours: policy.resolve_hours,
  };
}

export function getComplaintSlaState(
  complaint: Pick<ComplaintCase, 'status' | 'sla_due_at'>,
  nowMs = Date.now(),
): { state: ComplaintSlaState; minutesToDue: number | null } {
  if (isTerminalComplaintStatus(complaint.status)) {
    return { state: 'not_applicable', minutesToDue: null };
  }
  if (complaint.status === 'needs_info') {
    return { state: 'paused', minutesToDue: null };
  }

  const dueMs = parseIsoToMs(complaint.sla_due_at);
  if (!dueMs) {
    return { state: 'not_applicable', minutesToDue: null };
  }

  const deltaMinutes = Math.round((dueMs - nowMs) / 60000);
  if (deltaMinutes < 0) {
    return { state: 'breached', minutesToDue: deltaMinutes };
  }
  if (deltaMinutes <= 6 * 60) {
    return { state: 'due_soon', minutesToDue: deltaMinutes };
  }
  return { state: 'on_track', minutesToDue: deltaMinutes };
}

export async function refreshComplaintSla(
  db: SupabaseClient,
  complaint: ComplaintCase,
): Promise<ComplaintCase> {
  const policy = await resolveComplaintSlaPolicy(db, complaint);
  if (!policy) return complaint;

  const { dueAt, targetHours } = computeComplaintSlaDueAt(complaint, policy);
  const nowIso = new Date().toISOString();
  const nowMs = Date.now();
  const dueMs = parseIsoToMs(dueAt);
  const shouldMarkBreach =
    Boolean(dueMs && dueMs < nowMs) && !isTerminalComplaintStatus(complaint.status);

  const updates: Record<string, unknown> = {
    sla_policy_key: policy.key,
    sla_target_hours: targetHours,
    sla_due_at: dueAt,
  };

  if (shouldMarkBreach && !complaint.sla_breached_at) {
    updates.sla_breached_at = nowIso;
  }
  if (!shouldMarkBreach) {
    updates.sla_breached_at = null;
  }

  const { data, error } = await db
    .from('civic_complaints')
    .update(updates)
    .eq('id', complaint.id)
    .select('*')
    .single();

  if (error || !data) return complaint;
  return data as ComplaintCase;
}
