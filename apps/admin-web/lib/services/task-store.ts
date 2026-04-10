import type { SupabaseClient } from '@supabase/supabase-js';
import type { IntakeSlots, IntakeState } from './ai';

const OPTIONAL_SERVICE_TASK_COLUMNS = new Set([
  'workflow_mode',
  'target_member_id',
  'target_member_name',
  'requires_appointment',
  'supports_online_payment',
  'office_visit_required',
  'milestones',
  'actions',
  'action_state',
  'notes',
  'assigned_department_key',
  'assigned_department_name',
  'assigned_office_name',
  'assigned_authority_level',
  'assigned_role_title',
  'routing_reason',
  'routing_confidence',
  'queue_state',
  'assigned_staff_user_id',
  'first_response_due_at',
  'resolution_due_at',
  'first_staff_response_at',
  'last_public_update_at',
  'waiting_on_party',
  'escalated_at',
  'escalation_level',
  'resolution_summary',
]);

function parseMissingColumn(message?: string, table = 'service_tasks') {
  if (!message) return null;
  const match = message.match(new RegExp(`'([^']+)' column of '${table}'`, 'i'));
  return match?.[1] || null;
}

function isMissingTable(message?: string, table?: string) {
  if (!message) return false;
  const normalized = message.toLowerCase();
  if (table && !normalized.includes(table.toLowerCase())) return false;
  return (
    normalized.includes('does not exist') ||
    normalized.includes('schema cache') ||
    normalized.includes('could not find the table') ||
    normalized.includes('relation')
  );
}

function compactAssistantValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    const items = value
      .map((item) => compactAssistantValue(item))
      .filter((item) => item !== undefined);
    return items.length > 0 ? items : undefined;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value)
      .map(([key, item]) => [key, compactAssistantValue(item)] as const)
      .filter(([, item]) => item !== undefined);

    return entries.length > 0 ? Object.fromEntries(entries) : undefined;
  }

  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string' && (!value.trim() || value === 'unknown')) return undefined;
  return value;
}

export function buildAssistantTaskAnswers({
  sourceQuery,
  intakeState,
  intakeSlots,
  sessionId,
}: {
  sourceQuery: string;
  intakeState?: IntakeState | null;
  intakeSlots?: IntakeSlots | null;
  sessionId?: string | null;
}) {
  const normalizedQuery = sourceQuery.trim();
  const domain = intakeState?.domain || 'general';
  const assistantIntake =
    domain === 'health'
      ? {
          domain,
          subject: intakeState?.subject,
          urgency: intakeState?.urgency,
          care_need: intakeState?.careNeed,
          health: intakeSlots?.health,
        }
      : domain === 'utilities'
        ? {
            domain,
            subject: intakeState?.subject,
            utilities: intakeSlots?.utilities,
          }
        : domain === 'license'
          ? {
              domain,
              license: intakeSlots?.license,
            }
          : domain === 'citizenship'
            ? {
                domain,
                citizenship: intakeSlots?.citizenship,
              }
            : domain === 'passport'
              ? {
                  domain,
                  passport: intakeSlots?.passport,
                }
              : {
                  domain,
                };

  return {
    source_query: normalizedQuery,
    assistant_session_id: sessionId?.trim() || undefined,
    assistant_intake_version: 1,
    assistant_intake: compactAssistantValue(assistantIntake) || { domain },
  };
}

export async function insertServiceTaskWithCompatibility(
  supabase: SupabaseClient,
  payload: Record<string, unknown>,
) {
  let candidate = { ...payload };

  for (let attempt = 0; attempt < OPTIONAL_SERVICE_TASK_COLUMNS.size; attempt += 1) {
    const query = await supabase.from('service_tasks').insert(candidate).select('*').single();
    if (!query.error) return query;

    const missingColumn = parseMissingColumn(query.error.message, 'service_tasks');
    if (!missingColumn || !OPTIONAL_SERVICE_TASK_COLUMNS.has(missingColumn)) {
      return query;
    }

    delete candidate[missingColumn];
  }

  return supabase.from('service_tasks').insert(candidate).select('*').single();
}

export async function updateServiceTaskWithCompatibility(
  supabase: SupabaseClient,
  taskId: string,
  updates: Record<string, unknown>,
) {
  let candidate = { ...updates };

  for (let attempt = 0; attempt < OPTIONAL_SERVICE_TASK_COLUMNS.size; attempt += 1) {
    const query = await supabase
      .from('service_tasks')
      .update(candidate)
      .eq('id', taskId)
      .select('*')
      .single();

    if (!query.error) return query;

    const missingColumn = parseMissingColumn(query.error.message, 'service_tasks');
    if (!missingColumn || !OPTIONAL_SERVICE_TASK_COLUMNS.has(missingColumn)) {
      return query;
    }

    delete candidate[missingColumn];
  }

  return supabase
    .from('service_tasks')
    .update(candidate)
    .eq('id', taskId)
    .select('*')
    .single();
}

export async function insertTaskEventBestEffort(
  supabase: SupabaseClient,
  payload: Record<string, unknown>,
) {
  const { error } = await supabase.from('service_task_events').insert(payload);
  if (!error) return;

  if (isMissingTable(error.message, 'service_task_events')) return;
  console.warn('[service-task-events] insert failed:', error.message);
}

export async function listTaskEventsBestEffort(supabase: SupabaseClient, taskId: string) {
  const { data, error } = await supabase
    .from('service_task_events')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    if (isMissingTable(error.message, 'service_task_events')) return [];
    throw error;
  }

  return data || [];
}

export async function getHouseholdMemberBestEffort(
  supabase: SupabaseClient,
  targetMemberId: string | undefined,
) {
  if (!targetMemberId) return null;
  const { data, error } = await supabase
    .from('household_members')
    .select('*')
    .eq('id', targetMemberId)
    .is('archived_at', null)
    .maybeSingle();

  if (error) {
    if (isMissingTable(error.message, 'household_members')) return null;
    throw error;
  }

  return data || null;
}
