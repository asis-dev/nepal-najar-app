import type { SupabaseClient } from '@supabase/supabase-js';
import {
  updateServiceTaskWithCompatibility,
  insertTaskEventBestEffort,
} from './task-store';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CaseStatus =
  | 'draft_ready'
  | 'submitted'
  | 'acknowledged'
  | 'under_review'
  | 'action_requested'
  | 'approved'
  | 'rejected'
  | 'delivered'
  | 'completed';

export interface CaseTimeline {
  taskId: string;
  events: TimelineEvent[];
  currentStatus: CaseStatus;
  submittedAt: string | null;
  lastActivityAt: string;
  slaDeadline: string | null;
  isOverdue: boolean;
  daysInCurrentStatus: number;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  type:
    | 'status_change'
    | 'document_added'
    | 'note_added'
    | 'reminder_sent'
    | 'escalation'
    | 'user_action'
    | 'system';
  title: string;
  detail?: string;
  actor: 'user' | 'system' | 'department' | 'ai';
}

export interface SLAConfig {
  serviceSlug: string;
  expectedDays: number;
  warningDays: number; // warn X days before deadline
  criticalDays: number; // escalate X days after deadline
}

export interface ReminderRule {
  taskId: string;
  type:
    | 'document_needed'
    | 'payment_due'
    | 'appointment_upcoming'
    | 'status_check'
    | 'sla_warning'
    | 'follow_up';
  message: string;
  message_ne?: string;
  dueAt: string;
  sent: boolean;
}

export interface EscalationResult {
  escalated: boolean;
  level: number; // 1=first reminder, 2=follow-up, 3=formal complaint
  action: string;
  reason: string;
}

// ---------------------------------------------------------------------------
// SLA configurations per service
// ---------------------------------------------------------------------------

export const SLA_CONFIGS: Record<string, SLAConfig> = {
  'new-passport': {
    serviceSlug: 'new-passport',
    expectedDays: 30,
    warningDays: 25,
    criticalDays: 45,
  },
  'passport-renewal': {
    serviceSlug: 'passport-renewal',
    expectedDays: 21,
    warningDays: 18,
    criticalDays: 35,
  },
  'drivers-license-renewal': {
    serviceSlug: 'drivers-license-renewal',
    expectedDays: 14,
    warningDays: 10,
    criticalDays: 21,
  },
  'new-drivers-license': {
    serviceSlug: 'new-drivers-license',
    expectedDays: 30,
    warningDays: 25,
    criticalDays: 45,
  },
  'nea-bill-payment': {
    serviceSlug: 'nea-bill-payment',
    expectedDays: 1,
    warningDays: 0,
    criticalDays: 3,
  },
  'kukl-bill-payment': {
    serviceSlug: 'kukl-bill-payment',
    expectedDays: 1,
    warningDays: 0,
    criticalDays: 3,
  },
  'bir-hospital-opd': {
    serviceSlug: 'bir-hospital-opd',
    expectedDays: 7,
    warningDays: 5,
    criticalDays: 14,
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map granular CaseStatus to the coarser ServiceTask status used in the DB. */
function caseStatusToTaskStatus(
  cs: CaseStatus,
): 'ready' | 'submitted' | 'in_progress' | 'blocked' | 'completed' {
  switch (cs) {
    case 'draft_ready':
      return 'ready';
    case 'submitted':
      return 'submitted';
    case 'acknowledged':
    case 'under_review':
      return 'in_progress';
    case 'action_requested':
    case 'rejected':
      return 'blocked';
    case 'approved':
    case 'delivered':
    case 'completed':
      return 'completed';
  }
}

/** Calculate the number of full days between two dates. */
function daysBetween(a: Date, b: Date): number {
  const MS_PER_DAY = 86_400_000;
  return Math.floor((b.getTime() - a.getTime()) / MS_PER_DAY);
}

/** Add days to a date and return ISO string. */
function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

/** Map a raw DB event row to our TimelineEvent shape. */
function rowToTimelineEvent(row: Record<string, unknown>): TimelineEvent {
  return {
    id: (row.id as string) || crypto.randomUUID(),
    timestamp: (row.created_at as string) || new Date().toISOString(),
    type: (row.event_type as TimelineEvent['type']) || 'system',
    title: (row.title as string) || '',
    detail: (row.detail as string) || undefined,
    actor: (row.actor as TimelineEvent['actor']) || 'system',
  };
}

// ---------------------------------------------------------------------------
// Core operations
// ---------------------------------------------------------------------------

/**
 * Build a full case timeline for a given task, including SLA calculations.
 */
export async function getCaseTimeline(
  supabase: SupabaseClient,
  taskId: string,
): Promise<CaseTimeline> {
  // Fetch events from service_task_events (best-effort — table may not exist)
  let events: TimelineEvent[] = [];
  try {
    const { data, error } = await supabase
      .from('service_task_events')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (!error && data) {
      events = data.map(rowToTimelineEvent);
    }
  } catch {
    // Table may not exist yet — continue with empty events
  }

  // Fetch the task itself for status and dates
  let currentStatus: CaseStatus = 'draft_ready';
  let submittedAt: string | null = null;
  let lastActivityAt = new Date().toISOString();
  let serviceSlug: string | null = null;
  let statusUpdatedAt: string | null = null;

  try {
    const { data: task } = await supabase
      .from('service_tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (task) {
      // Map the DB status back to CaseStatus (best guess)
      const s = task.status as string;
      if (s === 'submitted') currentStatus = 'submitted';
      else if (s === 'in_progress') currentStatus = 'under_review';
      else if (s === 'blocked') currentStatus = 'action_requested';
      else if (s === 'completed') currentStatus = 'completed';
      else if (s === 'ready') currentStatus = 'draft_ready';

      // Override with the more granular case_status if stored
      if (task.case_status) currentStatus = task.case_status as CaseStatus;

      submittedAt = (task.submitted_at as string) || null;
      lastActivityAt =
        (task.updated_at as string) || (task.created_at as string) || lastActivityAt;
      serviceSlug = (task.service_slug as string) || null;
      statusUpdatedAt = (task.status_updated_at as string) || (task.updated_at as string) || null;
    }
  } catch {
    // Task table query failed — return defaults
  }

  // SLA calculation
  let slaDeadline: string | null = null;
  let isOverdue = false;

  if (submittedAt && serviceSlug && SLA_CONFIGS[serviceSlug]) {
    const config = SLA_CONFIGS[serviceSlug];
    const deadline = new Date(submittedAt);
    deadline.setDate(deadline.getDate() + config.expectedDays);
    slaDeadline = deadline.toISOString();
    isOverdue = new Date() > deadline;
  }

  // Days in current status
  const statusSince = statusUpdatedAt ? new Date(statusUpdatedAt) : new Date(lastActivityAt);
  const daysInCurrentStatus = Math.max(0, daysBetween(statusSince, new Date()));

  return {
    taskId,
    events,
    currentStatus,
    submittedAt,
    lastActivityAt,
    slaDeadline,
    isOverdue,
    daysInCurrentStatus,
  };
}

/**
 * Transition a case to a new status. Updates the service_tasks row and logs
 * a status_change event.
 */
export async function updateCaseStatus(
  supabase: SupabaseClient,
  taskId: string,
  newStatus: CaseStatus,
  detail?: string,
): Promise<boolean> {
  const taskStatus = caseStatusToTaskStatus(newStatus);

  const updates: Record<string, unknown> = {
    status: taskStatus,
    case_status: newStatus,
    status_updated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (newStatus === 'submitted') {
    updates.submitted_at = new Date().toISOString();
  }

  const { error } = await updateServiceTaskWithCompatibility(supabase, taskId, updates);
  if (error) {
    console.warn('[case-operations] updateCaseStatus failed:', error.message);
    return false;
  }

  // Log the status change event
  await insertTaskEventBestEffort(supabase, {
    task_id: taskId,
    event_type: 'status_change',
    title: `Status changed to ${newStatus.replace(/_/g, ' ')}`,
    detail: detail || undefined,
    actor: 'system',
  });

  return true;
}

/**
 * Add a custom event to the task's timeline.
 */
export async function addTimelineEvent(
  supabase: SupabaseClient,
  taskId: string,
  event: Omit<TimelineEvent, 'id' | 'timestamp'>,
): Promise<void> {
  await insertTaskEventBestEffort(supabase, {
    task_id: taskId,
    event_type: event.type,
    title: event.title,
    detail: event.detail || undefined,
    actor: event.actor,
  });
}

/**
 * Scan a user's active tasks and produce reminders for any that need attention.
 */
export async function checkReminders(
  supabase: SupabaseClient,
  userId: string,
): Promise<ReminderRule[]> {
  const reminders: ReminderRule[] = [];

  // Load user's active (non-completed) tasks
  let tasks: Record<string, unknown>[] = [];
  try {
    const { data, error } = await supabase
      .from('service_tasks')
      .select('*')
      .eq('user_id', userId)
      .not('status', 'eq', 'completed')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.warn('[case-operations] checkReminders query failed:', error.message);
      return [];
    }
    tasks = (data as Record<string, unknown>[]) || [];
  } catch {
    return [];
  }

  const now = new Date();

  for (const task of tasks) {
    const taskId = task.id as string;
    const serviceSlug = (task.service_slug as string) || '';
    const status = (task.status as string) || '';
    const submittedAt = task.submitted_at as string | null;

    // Check for documents still needed (task in collecting_docs status)
    if (status === 'collecting_docs') {
      reminders.push({
        taskId,
        type: 'document_needed',
        message: 'You have documents that still need to be uploaded.',
        message_ne: 'तपाईंसँग अपलोड गर्नुपर्ने कागजातहरू छन्।',
        dueAt: now.toISOString(),
        sent: false,
      });
    }

    // Check for upcoming appointment
    if (task.appointment_at) {
      const apptDate = new Date(task.appointment_at as string);
      const daysUntil = daysBetween(now, apptDate);
      if (daysUntil >= 0 && daysUntil <= 2) {
        reminders.push({
          taskId,
          type: 'appointment_upcoming',
          message: `Your appointment is ${daysUntil === 0 ? 'today' : `in ${daysUntil} day(s)`}.`,
          message_ne: `तपाईंको भेटघाट ${daysUntil === 0 ? 'आज' : `${daysUntil} दिनमा`} छ।`,
          dueAt: apptDate.toISOString(),
          sent: false,
        });
      }
    }

    // SLA warning: check if submission is approaching or past SLA deadline
    if (submittedAt && SLA_CONFIGS[serviceSlug]) {
      const config = SLA_CONFIGS[serviceSlug];
      const submitted = new Date(submittedAt);
      const daysSinceSubmission = daysBetween(submitted, now);

      if (daysSinceSubmission >= config.expectedDays) {
        // Past SLA
        reminders.push({
          taskId,
          type: 'sla_warning',
          message: `Your ${serviceSlug.replace(/-/g, ' ')} is past the expected ${config.expectedDays}-day timeline. Consider following up.`,
          message_ne: `तपाईंको ${serviceSlug.replace(/-/g, ' ')} अपेक्षित ${config.expectedDays} दिनको समयसीमा नाघेको छ।`,
          dueAt: addDays(submitted, config.expectedDays),
          sent: false,
        });
      } else if (daysSinceSubmission >= config.warningDays && config.warningDays > 0) {
        // Approaching SLA
        const remaining = config.expectedDays - daysSinceSubmission;
        reminders.push({
          taskId,
          type: 'sla_warning',
          message: `Your ${serviceSlug.replace(/-/g, ' ')} has ${remaining} day(s) remaining before the expected deadline.`,
          message_ne: `तपाईंको ${serviceSlug.replace(/-/g, ' ')} को अपेक्षित समयसीमामा ${remaining} दिन बाँकी छ।`,
          dueAt: addDays(submitted, config.expectedDays),
          sent: false,
        });
      }
    }

    // Generic status check: if task has been idle for 7+ days
    const updatedAt = (task.updated_at as string) || (task.created_at as string);
    if (updatedAt && status === 'in_progress') {
      const daysSinceUpdate = daysBetween(new Date(updatedAt), now);
      if (daysSinceUpdate >= 7) {
        reminders.push({
          taskId,
          type: 'status_check',
          message: `No updates for ${daysSinceUpdate} days. You may want to check on this.`,
          message_ne: `${daysSinceUpdate} दिनदेखि कुनै अपडेट छैन।`,
          dueAt: now.toISOString(),
          sent: false,
        });
      }
    }
  }

  return reminders;
}

/**
 * Check a task's SLA status and determine if escalation is warranted.
 * Returns the escalation level and suggested action.
 */
export async function checkAndEscalate(
  supabase: SupabaseClient,
  taskId: string,
  serviceSlug: string,
): Promise<EscalationResult> {
  const config = SLA_CONFIGS[serviceSlug];

  // No SLA config for this service — nothing to escalate
  if (!config) {
    return { escalated: false, level: 0, action: 'none', reason: 'No SLA configured for this service.' };
  }

  // Load the task
  let submittedAt: string | null = null;
  try {
    const { data: task } = await supabase
      .from('service_tasks')
      .select('submitted_at, status')
      .eq('id', taskId)
      .single();

    if (!task || !task.submitted_at) {
      return {
        escalated: false,
        level: 0,
        action: 'none',
        reason: 'Task has not been submitted yet.',
      };
    }

    // Already completed — no escalation needed
    if (task.status === 'completed') {
      return { escalated: false, level: 0, action: 'none', reason: 'Task already completed.' };
    }

    submittedAt = task.submitted_at as string;
  } catch {
    return { escalated: false, level: 0, action: 'none', reason: 'Failed to load task.' };
  }

  const daysSince = daysBetween(new Date(submittedAt!), new Date());

  // Level 3: past critical threshold — suggest formal complaint
  if (daysSince >= config.criticalDays) {
    await addTimelineEvent(supabase, taskId, {
      type: 'escalation',
      title: `Critical SLA breach: ${daysSince} days since submission (expected ${config.expectedDays})`,
      detail: 'Recommend filing a formal complaint with the department.',
      actor: 'system',
    });

    return {
      escalated: true,
      level: 3,
      action: 'File a formal complaint with the responsible department or use the government grievance portal.',
      reason: `${daysSince} days since submission, exceeding the critical threshold of ${config.criticalDays} days.`,
    };
  }

  // Level 2: past expected — suggest follow-up
  if (daysSince >= config.expectedDays) {
    await addTimelineEvent(supabase, taskId, {
      type: 'escalation',
      title: `SLA breached: ${daysSince} days since submission (expected ${config.expectedDays})`,
      detail: 'Recommend following up with the department.',
      actor: 'system',
    });

    return {
      escalated: true,
      level: 2,
      action: 'Follow up directly with the department. Bring your reference number and submission receipt.',
      reason: `${daysSince} days since submission, exceeding the expected ${config.expectedDays} days.`,
    };
  }

  // Level 1: approaching warning — notify user
  if (daysSince >= config.warningDays && config.warningDays > 0) {
    return {
      escalated: false,
      level: 1,
      action: 'No action needed yet, but your case is approaching the expected timeline.',
      reason: `${daysSince} days since submission. Warning threshold is ${config.warningDays} days.`,
    };
  }

  // Within normal timeframe
  return {
    escalated: false,
    level: 0,
    action: 'none',
    reason: `${daysSince} of ${config.expectedDays} expected days elapsed. On track.`,
  };
}

/**
 * Generate a human-readable summary of the case timeline.
 */
export function getCaseSummary(
  timeline: CaseTimeline,
  serviceTitle: string,
): {
  headline: string;
  headline_ne: string;
  detail: string;
  actionNeeded: string | null;
} {
  const { currentStatus, isOverdue, daysInCurrentStatus, submittedAt } = timeline;

  // Status-specific headlines
  const statusHeadlines: Record<CaseStatus, { en: string; ne: string }> = {
    draft_ready: {
      en: `Your ${serviceTitle} application is ready to submit.`,
      ne: `तपाईंको ${serviceTitle} आवेदन पेश गर्न तयार छ।`,
    },
    submitted: {
      en: `Your ${serviceTitle} has been submitted.`,
      ne: `तपाईंको ${serviceTitle} पेश गरिएको छ।`,
    },
    acknowledged: {
      en: `Your ${serviceTitle} has been received by the department.`,
      ne: `तपाईंको ${serviceTitle} विभागले प्राप्त गरेको छ।`,
    },
    under_review: {
      en: `Your ${serviceTitle} is under review.`,
      ne: `तपाईंको ${serviceTitle} समीक्षामा छ।`,
    },
    action_requested: {
      en: `Action needed on your ${serviceTitle} application.`,
      ne: `तपाईंको ${serviceTitle} आवेदनमा कारबाही आवश्यक छ।`,
    },
    approved: {
      en: `Your ${serviceTitle} has been approved!`,
      ne: `तपाईंको ${serviceTitle} स्वीकृत भएको छ!`,
    },
    rejected: {
      en: `Your ${serviceTitle} application was rejected.`,
      ne: `तपाईंको ${serviceTitle} आवेदन अस्वीकार गरिएको छ।`,
    },
    delivered: {
      en: `Your ${serviceTitle} is ready for collection.`,
      ne: `तपाईंको ${serviceTitle} संकलनको लागि तयार छ।`,
    },
    completed: {
      en: `Your ${serviceTitle} is complete.`,
      ne: `तपाईंको ${serviceTitle} पूरा भएको छ।`,
    },
  };

  const { en: headline, ne: headline_ne } = statusHeadlines[currentStatus] || {
    en: `${serviceTitle}: ${currentStatus.replace(/_/g, ' ')}`,
    ne: `${serviceTitle}: ${currentStatus.replace(/_/g, ' ')}`,
  };

  // Detail line
  let detail: string;
  if (submittedAt) {
    const daysSinceSubmission = daysBetween(new Date(submittedAt), new Date());
    detail = `Submitted ${daysSinceSubmission} day(s) ago. In current status for ${daysInCurrentStatus} day(s).`;
    if (isOverdue) {
      detail += ' This case is past the expected timeline.';
    }
  } else {
    detail = `In current status for ${daysInCurrentStatus} day(s).`;
  }

  // Action needed
  let actionNeeded: string | null = null;
  if (currentStatus === 'draft_ready') {
    actionNeeded = 'Submit your application to the department.';
  } else if (currentStatus === 'action_requested') {
    actionNeeded = 'The department has requested additional information. Please check and respond.';
  } else if (currentStatus === 'rejected') {
    actionNeeded = 'Review the rejection reason and consider re-applying or filing a complaint.';
  } else if (currentStatus === 'delivered') {
    actionNeeded = 'Visit the department to collect your document.';
  } else if (isOverdue) {
    actionNeeded = 'Consider following up with the department as your case is past the expected timeline.';
  }

  return { headline, headline_ne, detail, actionNeeded };
}

/**
 * Record a reference number (application ID, tracking number, etc.) for a task.
 */
export async function recordReference(
  supabase: SupabaseClient,
  taskId: string,
  referenceNumber: string,
  referenceType:
    | 'application_id'
    | 'tracking_number'
    | 'receipt_number'
    | 'appointment_ref',
): Promise<void> {
  // Store the reference in the task metadata
  try {
    await updateServiceTaskWithCompatibility(supabase, taskId, {
      [`ref_${referenceType}`]: referenceNumber,
      updated_at: new Date().toISOString(),
    });
  } catch {
    console.warn('[case-operations] Failed to store reference on task — column may not exist');
  }

  // Always log as an event regardless of whether the column exists
  await insertTaskEventBestEffort(supabase, {
    task_id: taskId,
    event_type: 'system',
    title: `Reference recorded: ${referenceType.replace(/_/g, ' ')}`,
    detail: referenceNumber,
    actor: 'system',
  });
}
