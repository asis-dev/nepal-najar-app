export type ServiceAITriggerMode = 'manual' | 'suggested' | 'automatic';
export type ServiceAIRunStatus = 'queued' | 'running' | 'completed' | 'failed' | 'blocked' | 'cancelled';

export const AI_TRIGGER_LABELS: Record<ServiceAITriggerMode, string> = {
  manual: 'Manual',
  suggested: 'Suggested',
  automatic: 'Automatic',
};

export const AI_RUN_STATUS_LABELS: Record<ServiceAIRunStatus, string> = {
  queued: 'Queued',
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
  blocked: 'Blocked',
  cancelled: 'Cancelled',
};
