import { getSupabase } from '@/lib/supabase/server';

export type { ServiceAITriggerMode, ServiceAIRunStatus } from './ai-types';
export { AI_TRIGGER_LABELS, AI_RUN_STATUS_LABELS } from './ai-types';

export async function getServiceAISummary() {
  const db = getSupabase();
  const [{ data: playbooks }, { data: runs }] = await Promise.all([
    db.from('service_ai_playbooks').select('id, trigger_mode, is_active').eq('is_active', true),
    db.from('service_task_ai_runs').select('id, status').order('created_at', { ascending: false }).limit(1000),
  ]);

  const playbookRows = playbooks || [];
  const runRows = runs || [];

  return {
    active_playbooks: playbookRows.length,
    automatic_playbooks: playbookRows.filter((row: any) => row.trigger_mode === 'automatic').length,
    suggested_playbooks: playbookRows.filter((row: any) => row.trigger_mode === 'suggested').length,
    queued_runs: runRows.filter((row: any) => row.status === 'queued').length,
    running_runs: runRows.filter((row: any) => row.status === 'running').length,
    completed_runs: runRows.filter((row: any) => row.status === 'completed').length,
    blocked_runs: runRows.filter((row: any) => row.status === 'blocked').length,
  };
}
