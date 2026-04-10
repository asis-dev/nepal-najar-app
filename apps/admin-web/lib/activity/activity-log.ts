import type { SupabaseClient } from '@supabase/supabase-js';

export interface UserActivityPayload {
  owner_id: string;
  event_type: string;
  entity_type: string;
  entity_id?: string | null;
  title: string;
  summary?: string | null;
  meta?: Record<string, unknown>;
}

function isMissingTable(message?: string, table = 'user_activity_events') {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return normalized.includes(table.toLowerCase()) && (
    normalized.includes('does not exist') ||
    normalized.includes('schema cache') ||
    normalized.includes('could not find the table') ||
    normalized.includes('relation')
  );
}

export async function recordUserActivityBestEffort(
  supabase: SupabaseClient,
  payload: UserActivityPayload,
) {
  const { error } = await supabase
    .from('user_activity_events')
    .insert({
      owner_id: payload.owner_id,
      event_type: payload.event_type,
      entity_type: payload.entity_type,
      entity_id: payload.entity_id ?? null,
      title: payload.title,
      summary: payload.summary ?? null,
      meta: payload.meta ?? {},
    });

  if (!error) return;
  if (isMissingTable(error.message)) return;
  console.warn('[user-activity-events] insert failed:', error.message);
}

export async function listUserActivityBestEffort(
  supabase: SupabaseClient,
  ownerId: string,
  limit = 50,
) {
  const { data, error } = await supabase
    .from('user_activity_events')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingTable(error.message)) return [];
    throw error;
  }

  return data || [];
}
