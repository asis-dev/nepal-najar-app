/**
 * Status Sync — tracks submission status and synchronizes updates
 * from external sources (manual checks, webhooks, periodic polling).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { insertTaskEventBestEffort } from './task-store';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StatusSyncResult {
  currentStatus: string;
  lastChecked: string;
  externalRef: string | null;
  rejectionReason?: string;
  nextAction?: string;
}

export interface TimelineEntry {
  id: string;
  taskId: string;
  eventType: string;
  title: string;
  detail?: string;
  actor: 'user' | 'system' | 'department' | 'ai';
  createdAt: string;
}

export type StatusUpdateSource = 'manual' | 'webhook' | 'polling' | 'sms' | 'email';

// ---------------------------------------------------------------------------
// Sync submission status
// ---------------------------------------------------------------------------

/**
 * Check the service_tasks table for the current status of a submission
 * and return structured info including any rejection reason or next action.
 */
export async function syncSubmissionStatus(
  supabase: SupabaseClient,
  taskId: string,
): Promise<StatusSyncResult> {
  const now = new Date().toISOString();

  // Default result if task not found
  const defaultResult: StatusSyncResult = {
    currentStatus: 'unknown',
    lastChecked: now,
    externalRef: null,
    nextAction: 'Task not found. Please verify the task ID.',
  };

  try {
    const { data: task, error } = await supabase
      .from('service_tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (error || !task) {
      return defaultResult;
    }

    const status = (task.case_status as string) || (task.status as string) || 'unknown';
    const externalRef =
      (task.submission_ref as string) ||
      (task.ref_tracking_number as string) ||
      null;

    // Determine next action based on status
    let nextAction: string | undefined;
    let rejectionReason: string | undefined;

    switch (status) {
      case 'draft_ready':
      case 'ready':
        nextAction = 'Submit your application to proceed.';
        break;
      case 'submitted':
        nextAction = 'Waiting for acknowledgement from the department. No action needed.';
        break;
      case 'acknowledged':
        nextAction = 'Your application has been received. Processing will begin soon.';
        break;
      case 'under_review':
      case 'in_progress':
        nextAction = 'Your application is being reviewed. No action needed at this time.';
        break;
      case 'action_requested':
      case 'blocked':
        nextAction = 'The department has requested additional information. Please check and respond.';
        break;
      case 'rejected':
        rejectionReason = (task.rejection_reason as string) || 'No reason provided.';
        nextAction = 'Review the rejection reason and consider re-applying or filing a grievance.';
        break;
      case 'approved':
        nextAction = 'Your application has been approved. Await delivery or collection instructions.';
        break;
      case 'delivered':
        nextAction = 'Visit the department to collect your document.';
        break;
      case 'completed':
        nextAction = 'This task is complete. No further action needed.';
        break;
    }

    return {
      currentStatus: status,
      lastChecked: now,
      externalRef,
      rejectionReason,
      nextAction,
    };
  } catch {
    return defaultResult;
  }
}

// ---------------------------------------------------------------------------
// Record status update from external source
// ---------------------------------------------------------------------------

/**
 * Update a task's status from an external source (manual check, webhook, etc.).
 * Logs an event in the task timeline for audit purposes.
 */
export async function recordStatusUpdate(
  supabase: SupabaseClient,
  taskId: string,
  newStatus: string,
  source: StatusUpdateSource,
  detail?: string,
): Promise<{ success: boolean; error?: string }> {
  const now = new Date().toISOString();

  // Map incoming status to DB-compatible task status
  const taskStatusMap: Record<string, string> = {
    draft_ready: 'ready',
    submitted: 'submitted',
    acknowledged: 'in_progress',
    under_review: 'in_progress',
    action_requested: 'blocked',
    rejected: 'blocked',
    approved: 'completed',
    delivered: 'completed',
    completed: 'completed',
  };

  const dbStatus = taskStatusMap[newStatus] || newStatus;

  try {
    const { error } = await supabase
      .from('service_tasks')
      .update({
        status: dbStatus,
        case_status: newStatus,
        status_updated_at: now,
        updated_at: now,
      })
      .eq('id', taskId);

    if (error) {
      return { success: false, error: error.message };
    }
  } catch (err) {
    return { success: false, error: 'Failed to update task status.' };
  }

  // Log the status change event
  await insertTaskEventBestEffort(supabase, {
    task_id: taskId,
    event_type: 'status_change',
    title: `Status updated to ${newStatus.replace(/_/g, ' ')} (via ${source})`,
    detail: detail || undefined,
    actor: source === 'manual' ? 'user' : 'system',
  });

  return { success: true };
}

// ---------------------------------------------------------------------------
// Get submission timeline
// ---------------------------------------------------------------------------

/**
 * Returns ordered events from service_task_events for a given task,
 * providing a full audit trail of the submission lifecycle.
 */
export async function getSubmissionTimeline(
  supabase: SupabaseClient,
  taskId: string,
): Promise<TimelineEntry[]> {
  try {
    const { data, error } = await supabase
      .from('service_task_events')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })
      .limit(200);

    if (error || !data) {
      return [];
    }

    return data.map((row: Record<string, unknown>) => ({
      id: (row.id as string) || '',
      taskId: (row.task_id as string) || taskId,
      eventType: (row.event_type as string) || 'system',
      title: (row.title as string) || '',
      detail: (row.detail as string) || undefined,
      actor: ((row.actor as string) || 'system') as TimelineEntry['actor'],
      createdAt: (row.created_at as string) || new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}
