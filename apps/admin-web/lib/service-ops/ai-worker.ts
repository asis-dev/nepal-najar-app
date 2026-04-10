import { aiComplete } from '@/lib/intelligence/ai-router';
import { getSupabase } from '@/lib/supabase/server';
import {
  insertServiceTaskMessageBestEffort,
  notifyServiceTaskUsers,
} from '@/lib/service-ops/notifications';
import { insertTaskEventBestEffort, updateServiceTaskWithCompatibility } from '@/lib/services/task-store';

type PlaybookRow = {
  id: string;
  name: string;
  playbook_key: string;
  description?: string | null;
  ai_role?: string | null;
  objective?: string | null;
  trigger_mode?: string | null;
  requires_human_approval?: boolean | null;
  can_contact_citizen?: boolean | null;
  can_contact_provider?: boolean | null;
  allowed_tools?: unknown;
};

type TaskRow = {
  id: string;
  owner_id?: string | null;
  service_slug?: string | null;
  service_title?: string | null;
  summary?: string | null;
  next_action?: string | null;
  status?: string | null;
  queue_state?: string | null;
  assigned_department_key?: string | null;
  assigned_department_name?: string | null;
  assigned_staff_user_id?: string | null;
  answers?: Record<string, unknown> | null;
};

type RunRow = {
  id: string;
  task_id: string;
  playbook_id: string;
  department_key?: string | null;
  requested_by?: string | null;
  status: string;
  summary?: string | null;
  input_context?: Record<string, unknown> | null;
  output_context?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
};

type ParsedAIResult = {
  summary: string;
  internal_note: string;
  citizen_message_draft: string | null;
  provider_message_draft: string | null;
  blockers: string[];
  fields_to_verify: string[];
  recommended_next_action: string | null;
  recommended_queue_state: string | null;
};

const TERMINAL_QUEUE_STATES = new Set(['approved', 'rejected', 'resolved', 'closed']);
const ALLOWED_QUEUE_STATES = new Set([
  'new',
  'assigned',
  'in_review',
  'waiting_on_citizen',
  'waiting_on_provider',
  'approved',
  'rejected',
  'escalated',
  'resolved',
  'closed',
]);

function buildSystemPrompt(playbook: PlaybookRow) {
  return [
    'You are an operations copilot for NepalRepublic service caseworkers.',
    'Return strict JSON only.',
    'Do not invent approvals, payments, or official government confirmations.',
    'Focus on triage, summarization, blockers, missing evidence, and the safest next human action.',
    `Playbook: ${playbook.name}`,
    playbook.description ? `Description: ${playbook.description}` : null,
    playbook.objective ? `Objective: ${playbook.objective}` : null,
    playbook.ai_role ? `Role: ${playbook.ai_role}` : null,
  ].filter(Boolean).join('\n');
}

function buildUserPrompt(task: TaskRow, playbook: PlaybookRow, inputContext: Record<string, unknown>) {
  return JSON.stringify({
    instructions: {
      output_schema: {
        summary: 'string',
        internal_note: 'string',
        citizen_message_draft: 'string|null',
        provider_message_draft: 'string|null',
        blockers: ['string'],
        fields_to_verify: ['string'],
        recommended_next_action: 'string|null',
        recommended_queue_state: 'string|null',
      },
      rules: [
        'Use concise, plain language.',
        'If there is not enough evidence, say so explicitly.',
        'Do not mark a case approved or completed unless the context already proves it.',
        'recommended_queue_state must be null if human approval is required.',
      ],
      playbook_requires_human_approval: Boolean(playbook.requires_human_approval),
    },
    task: {
      id: task.id,
      service_slug: task.service_slug,
      service_title: task.service_title,
      summary: task.summary,
      next_action: task.next_action,
      status: task.status,
      queue_state: task.queue_state,
      assigned_department_key: task.assigned_department_key,
      answers: task.answers || {},
    },
    input_context: inputContext,
  });
}

function extractJsonObject(content: string): ParsedAIResult | null {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() || trimmed;
  const firstBrace = candidate.indexOf('{');
  const lastBrace = candidate.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null;

  try {
    const parsed = JSON.parse(candidate.slice(firstBrace, lastBrace + 1)) as Partial<ParsedAIResult>;
    return {
      summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : '',
      internal_note: typeof parsed.internal_note === 'string' ? parsed.internal_note.trim() : '',
      citizen_message_draft: typeof parsed.citizen_message_draft === 'string' ? parsed.citizen_message_draft.trim() : null,
      provider_message_draft: typeof parsed.provider_message_draft === 'string' ? parsed.provider_message_draft.trim() : null,
      blockers: Array.isArray(parsed.blockers) ? parsed.blockers.filter((item): item is string => typeof item === 'string').slice(0, 8) : [],
      fields_to_verify: Array.isArray(parsed.fields_to_verify) ? parsed.fields_to_verify.filter((item): item is string => typeof item === 'string').slice(0, 8) : [],
      recommended_next_action: typeof parsed.recommended_next_action === 'string' ? parsed.recommended_next_action.trim() : null,
      recommended_queue_state: typeof parsed.recommended_queue_state === 'string' ? parsed.recommended_queue_state.trim() : null,
    };
  } catch {
    return null;
  }
}

function buildFallbackResult(content: string): ParsedAIResult {
  const summary = content.trim().slice(0, 1200) || 'AI run completed without a structured summary.';
  return {
    summary,
    internal_note: summary,
    citizen_message_draft: null,
    provider_message_draft: null,
    blockers: [],
    fields_to_verify: [],
    recommended_next_action: null,
    recommended_queue_state: null,
  };
}

async function completeRun(run: RunRow, task: TaskRow, playbook: PlaybookRow) {
  const db = getSupabase();
  const inputContext = (run.input_context || {}) as Record<string, unknown>;

  const response = await aiComplete(
    'reason',
    buildSystemPrompt(playbook),
    buildUserPrompt(task, playbook, inputContext),
  );

  const parsed = extractJsonObject(response.content) || buildFallbackResult(response.content);

  const nextAction = parsed.recommended_next_action?.slice(0, 500) || null;
  const safeQueueState =
    playbook.requires_human_approval ||
    !parsed.recommended_queue_state ||
    !ALLOWED_QUEUE_STATES.has(parsed.recommended_queue_state) ||
    TERMINAL_QUEUE_STATES.has(parsed.recommended_queue_state)
      ? null
      : parsed.recommended_queue_state;

  if (nextAction || safeQueueState) {
    await updateServiceTaskWithCompatibility(db, task.id, {
      next_action: nextAction || task.next_action || null,
      queue_state: safeQueueState || task.queue_state || null,
    });
  }

  const messageParts = [
    parsed.internal_note || parsed.summary,
    parsed.blockers.length ? `Blockers: ${parsed.blockers.join('; ')}` : null,
    parsed.fields_to_verify.length ? `Verify: ${parsed.fields_to_verify.join('; ')}` : null,
    parsed.citizen_message_draft && playbook.can_contact_citizen ? `Citizen draft: ${parsed.citizen_message_draft}` : null,
    parsed.provider_message_draft && playbook.can_contact_provider ? `Provider draft: ${parsed.provider_message_draft}` : null,
  ].filter(Boolean);

  if (task.owner_id) {
    await insertServiceTaskMessageBestEffort(db, {
      taskId: task.id,
      ownerId: task.owner_id,
      actorType: 'system',
      visibility: 'internal',
      messageType: 'note',
      body: messageParts.join('\n\n').slice(0, 4000),
      metadata: {
        source: 'service_ops_ai_worker',
        ai_run_id: run.id,
        playbook_key: playbook.playbook_key,
        raw_model_output: response.content.slice(0, 4000),
      },
    });
  }

  await insertTaskEventBestEffort(db, {
    task_id: task.id,
    owner_id: task.owner_id || null,
    actor_id: run.requested_by || null,
    event_type: 'ai_run_completed',
    note: parsed.summary,
    metadata: {
      ai_run_id: run.id,
      playbook_key: playbook.playbook_key,
      recommended_next_action: parsed.recommended_next_action,
      recommended_queue_state: parsed.recommended_queue_state,
    },
  });

  await notifyServiceTaskUsers(db, {
    taskId: task.id,
    actorUserId: run.requested_by || null,
    title: `${playbook.name} completed`,
    body: parsed.summary,
    includeAssignedStaff: true,
    includeDepartmentMembers: false,
    ownerId: task.owner_id || null,
    assignedStaffUserId: task.assigned_staff_user_id || null,
    departmentKey: task.assigned_department_key || null,
    metadata: {
      kind: 'service_task_ai_run',
      ai_run_id: run.id,
      playbook_key: playbook.playbook_key,
    },
  });

  await db
    .from('service_task_ai_runs')
    .update({
      status: 'completed',
      summary: parsed.summary || run.summary || `${playbook.name} completed`,
      output_context: {
        ...parsed,
        model_output: response.content,
      },
      completed_at: new Date().toISOString(),
    })
    .eq('id', run.id);

  return parsed;
}

export async function processQueuedServiceAIRuns(limit = 10) {
  const db = getSupabase();
  const safeLimit = Math.max(1, Math.min(50, limit));
  const startedAt = new Date().toISOString();

  const { data: queuedRuns, error } = await db
    .from('service_task_ai_runs')
    .select('*')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(safeLimit);

  if (error) throw error;

  const runs = (queuedRuns || []) as RunRow[];
  const results: Array<{ id: string; status: 'completed' | 'failed' | 'blocked'; summary: string }> = [];

  for (const run of runs) {
    const { data: claimed } = await db
      .from('service_task_ai_runs')
      .update({
        status: 'running',
        summary: run.summary || 'AI run in progress',
        metadata: {
          ...(run.metadata || {}),
          worker_started_at: startedAt,
        },
      })
      .eq('id', run.id)
      .eq('status', 'queued')
      .select('*')
      .maybeSingle();

    if (!claimed) continue;

    const [{ data: task }, { data: playbook }] = await Promise.all([
      db.from('service_tasks').select('*').eq('id', run.task_id).maybeSingle(),
      db.from('service_ai_playbooks').select('*').eq('id', run.playbook_id).maybeSingle(),
    ]);

    if (!task || !playbook) {
      await db
        .from('service_task_ai_runs')
        .update({
          status: 'blocked',
          summary: 'AI run blocked because its task or playbook could not be loaded.',
          completed_at: new Date().toISOString(),
        })
        .eq('id', run.id);
      results.push({ id: run.id, status: 'blocked', summary: 'Task or playbook missing' });
      continue;
    }

    try {
      const parsed = await completeRun(run, task as TaskRow, playbook as PlaybookRow);
      results.push({
        id: run.id,
        status: 'completed',
        summary: parsed.summary || `${playbook.name} completed`,
      });
    } catch (workerError) {
      const message = workerError instanceof Error ? workerError.message : String(workerError);
      await db
        .from('service_task_ai_runs')
        .update({
          status: 'failed',
          summary: `AI run failed: ${message}`.slice(0, 1000),
          output_context: {
            error: message,
          },
          completed_at: new Date().toISOString(),
        })
        .eq('id', run.id);

      await insertTaskEventBestEffort(db, {
        task_id: run.task_id,
        owner_id: task.owner_id || null,
        actor_id: run.requested_by || null,
        event_type: 'ai_run_failed',
        note: message.slice(0, 1000),
        metadata: {
          ai_run_id: run.id,
          playbook_id: run.playbook_id,
        },
      });

      results.push({ id: run.id, status: 'failed', summary: message });
    }
  }

  return {
    started_at: startedAt,
    scanned: runs.length,
    completed: results.filter((item) => item.status === 'completed').length,
    failed: results.filter((item) => item.status === 'failed').length,
    blocked: results.filter((item) => item.status === 'blocked').length,
    results,
  };
}
