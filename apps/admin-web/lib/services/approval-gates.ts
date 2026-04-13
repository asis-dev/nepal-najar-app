/**
 * Human Approval Gates — ensures sensitive actions require explicit user consent
 * before execution. Provides audit trail for all approval decisions.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { insertTaskEventBestEffort } from './task-store';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ApprovalGate {
  required: boolean;
  level: 'explicit' | 'confirm' | 'immediate';
  reason: string;
  description: string;
}

export interface ApprovalRecord {
  id: string;
  taskId: string;
  action: string;
  approved: boolean;
  level: string;
  reason: string;
  notes?: string;
  actor: string;
  decidedAt: string;
}

// ---------------------------------------------------------------------------
// Actions requiring human approval
// ---------------------------------------------------------------------------

const APPROVAL_REQUIRED_ACTIONS: Record<
  string,
  { reason: string; level: 'explicit' | 'confirm' | 'immediate' }
> = {
  payment_submission: {
    reason: 'Financial transaction',
    level: 'explicit',
  },
  form_submission: {
    reason: 'Government form submission',
    level: 'explicit',
  },
  data_sharing: {
    reason: 'Sharing personal data with third party',
    level: 'explicit',
  },
  health_escalation: {
    reason: 'Medical emergency escalation',
    level: 'immediate',
  },
  document_upload: {
    reason: 'Uploading identity document',
    level: 'confirm',
  },
};

/** Human-readable descriptions for each approval level */
const LEVEL_DESCRIPTIONS: Record<string, string> = {
  explicit:
    'This action requires your explicit approval before proceeding. Please review all details carefully.',
  confirm:
    'Please confirm you want to proceed with this action.',
  immediate:
    'This action is urgent and needs your immediate attention. Please respond as soon as possible.',
};

// ---------------------------------------------------------------------------
// Check if approval is required
// ---------------------------------------------------------------------------

/**
 * Determine whether a given action requires human approval and what type.
 * Context can include additional info (e.g., amount, recipient) that may
 * affect the approval requirement.
 */
export function checkApprovalRequired(
  action: string,
  context: Record<string, unknown> = {},
): ApprovalGate {
  const config = APPROVAL_REQUIRED_ACTIONS[action];

  if (!config) {
    return {
      required: false,
      level: 'confirm',
      reason: 'No approval required for this action.',
      description: '',
    };
  }

  // Build a context-aware description
  let description = LEVEL_DESCRIPTIONS[config.level] || '';

  // Add context-specific details
  if (action === 'payment_submission' && context.amount) {
    description += ` Amount: NPR ${context.amount}.`;
  }
  if (action === 'data_sharing' && context.recipient) {
    description += ` Data will be shared with: ${context.recipient}.`;
  }
  if (action === 'health_escalation' && context.condition) {
    description += ` Condition: ${context.condition}.`;
  }
  if (action === 'document_upload' && context.documentType) {
    description += ` Document type: ${context.documentType}.`;
  }

  return {
    required: true,
    level: config.level,
    reason: config.reason,
    description,
  };
}

// ---------------------------------------------------------------------------
// Record approval decision
// ---------------------------------------------------------------------------

/**
 * Store the user's approval or rejection decision in service_task_events
 * for a complete audit trail.
 */
export async function recordApproval(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
  action: string,
  approved: boolean,
  notes?: string,
): Promise<{ success: boolean; error?: string }> {
  const config = APPROVAL_REQUIRED_ACTIONS[action];
  const level = config?.level || 'confirm';
  const reason = config?.reason || action;

  const eventTitle = approved
    ? `Approved: ${reason}`
    : `Rejected: ${reason}`;

  const eventDetail = [
    `Action: ${action}`,
    `Level: ${level}`,
    `Decision: ${approved ? 'approved' : 'rejected'}`,
    `User: ${userId}`,
    notes ? `Notes: ${notes}` : null,
  ]
    .filter(Boolean)
    .join(' | ');

  try {
    await insertTaskEventBestEffort(supabase, {
      task_id: taskId,
      event_type: 'user_action',
      title: eventTitle,
      detail: eventDetail,
      actor: 'user',
    });

    return { success: true };
  } catch {
    return { success: false, error: 'Failed to record approval decision.' };
  }
}

// ---------------------------------------------------------------------------
// Get approval history
// ---------------------------------------------------------------------------

/**
 * Returns all approval decisions for a given task, extracted from
 * service_task_events where event_type is 'user_action' and title
 * starts with 'Approved:' or 'Rejected:'.
 */
export async function getApprovalHistory(
  supabase: SupabaseClient,
  taskId: string,
): Promise<ApprovalRecord[]> {
  try {
    const { data, error } = await supabase
      .from('service_task_events')
      .select('*')
      .eq('task_id', taskId)
      .eq('event_type', 'user_action')
      .order('created_at', { ascending: true })
      .limit(100);

    if (error || !data) {
      return [];
    }

    // Filter to only approval/rejection events and parse them
    return data
      .filter((row: Record<string, unknown>) => {
        const title = (row.title as string) || '';
        return title.startsWith('Approved:') || title.startsWith('Rejected:');
      })
      .map((row: Record<string, unknown>) => {
        const title = (row.title as string) || '';
        const detail = (row.detail as string) || '';
        const approved = title.startsWith('Approved:');

        // Parse structured detail string
        const detailParts = detail.split(' | ');
        const parsedDetail: Record<string, string> = {};
        for (const part of detailParts) {
          const [key, ...valueParts] = part.split(': ');
          if (key && valueParts.length > 0) {
            parsedDetail[key.trim().toLowerCase()] = valueParts.join(': ').trim();
          }
        }

        return {
          id: (row.id as string) || '',
          taskId,
          action: parsedDetail.action || 'unknown',
          approved,
          level: parsedDetail.level || 'confirm',
          reason: title.replace(/^(Approved|Rejected): /, ''),
          notes: parsedDetail.notes,
          actor: (row.actor as string) || 'user',
          decidedAt: (row.created_at as string) || new Date().toISOString(),
        };
      });
  } catch {
    return [];
  }
}
