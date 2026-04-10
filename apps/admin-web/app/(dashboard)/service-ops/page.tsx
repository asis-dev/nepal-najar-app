'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Bot,
  Clock3,
  FolderKanban,
  Loader2,
  MessageSquare,
  ShieldCheck,
  UserCheck,
  UserRound,
} from 'lucide-react';

type QueueState =
  | 'new'
  | 'assigned'
  | 'in_review'
  | 'waiting_on_citizen'
  | 'waiting_on_provider'
  | 'approved'
  | 'rejected'
  | 'escalated'
  | 'resolved'
  | 'closed';

type InboxTask = {
  id: string;
  service_title: string;
  service_slug: string;
  service_category: string;
  summary?: string | null;
  next_action?: string | null;
  queue_state: QueueState;
  status: string;
  assigned_department_key?: string | null;
  assigned_department_name?: string | null;
  assigned_office_name?: string | null;
  assigned_staff_user_id?: string | null;
  target_member_name?: string | null;
  first_response_due_at?: string | null;
  resolution_due_at?: string | null;
  waiting_on_party?: string | null;
  escalation_level?: number | null;
  updated_at: string;
  progress: number;
  owner_id: string;
  resolution_plan?: {
    status: 'needs_citizen' | 'needs_department' | 'needs_provider' | 'resolved';
    headline: string;
    citizenAction: string;
    departmentAction: string;
    providerAction: string;
    blockers: string[];
    citizenContext?: string | null;
  };
};

type Department = {
  key: string;
  name: string;
  authority_level: string;
  default_queue_label?: string | null;
};

type TaskDetail = {
  task: InboxTask & Record<string, any>;
  assignments: Record<string, any>[];
  messages: Record<string, any>[];
  decisions: Record<string, any>[];
  events: Record<string, any>[];
  ai_runs?: Record<string, any>[];
  partner_replies?: Record<string, any>[];
};

type AIPlaybook = {
  id: string;
  name: string;
  playbook_key: string;
  trigger_mode: string;
  service_slug?: string | null;
  requires_human_approval: boolean;
};

const QUEUE_LABELS: Record<QueueState, string> = {
  new: 'New',
  assigned: 'Assigned',
  in_review: 'In review',
  waiting_on_citizen: 'Waiting on citizen',
  waiting_on_provider: 'Waiting on provider',
  approved: 'Approved',
  rejected: 'Rejected',
  escalated: 'Escalated',
  resolved: 'Resolved',
  closed: 'Closed',
};

const ACTION_OPTIONS = [
  { value: 'accept', label: 'Accept case', tone: 'border-blue-500/30 text-blue-300' },
  { value: 'request_info', label: 'Request info', tone: 'border-amber-500/30 text-amber-300' },
  { value: 'approve', label: 'Approve', tone: 'border-emerald-500/30 text-emerald-300' },
  { value: 'reject', label: 'Reject', tone: 'border-red-500/30 text-red-300' },
  { value: 'escalate', label: 'Escalate', tone: 'border-fuchsia-500/30 text-fuchsia-300' },
  { value: 'resolve', label: 'Resolve', tone: 'border-cyan-500/30 text-cyan-300' },
  { value: 'close', label: 'Close', tone: 'border-zinc-500/30 text-zinc-300' },
];

export default function ServiceOpsPage() {
  const queryClient = useQueryClient();
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [queueFilter, setQueueFilter] = useState<string>('all');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [publicNote, setPublicNote] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [action, setAction] = useState<string>('accept');
  const [selectedPlaybookId, setSelectedPlaybookId] = useState<string>('');

  const { data: departmentsData } = useQuery<{ departments: Department[] }>({
    queryKey: ['service-ops-departments'],
    queryFn: async () => {
      const res = await fetch('/api/ops/service-tasks/departments');
      if (!res.ok) throw new Error('Failed to load departments');
      return res.json();
    },
  });

  const { data: inboxData, isLoading, error } = useQuery<{ tasks: InboxTask[]; summary: Record<string, number> }>({
    queryKey: ['service-ops-inbox', departmentFilter, queueFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (departmentFilter !== 'all') params.set('department_key', departmentFilter);
      if (queueFilter !== 'all') params.set('queue_state', queueFilter);
      const res = await fetch(`/api/ops/service-tasks/inbox?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load service inbox');
      return res.json();
    },
  });

  const selectedTask = useMemo(
    () => (inboxData?.tasks || []).find((task) => task.id === selectedTaskId) || (inboxData?.tasks || [])[0] || null,
    [inboxData?.tasks, selectedTaskId],
  );

  const { data: detailData, isLoading: detailLoading } = useQuery<TaskDetail>({
    queryKey: ['service-ops-task', selectedTask?.id],
    enabled: Boolean(selectedTask?.id),
    queryFn: async () => {
      const res = await fetch(`/api/ops/service-tasks/${selectedTask?.id}`);
      if (!res.ok) throw new Error('Failed to load case details');
      return res.json();
    },
  });

  const { data: playbooksData } = useQuery<{ playbooks: AIPlaybook[] }>({
    queryKey: ['service-ops-task-playbooks', selectedTask?.id, selectedTask?.assigned_department_key, selectedTask?.service_slug],
    enabled: Boolean(selectedTask?.id && selectedTask?.assigned_department_key),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedTask?.assigned_department_key) params.set('department_key', selectedTask.assigned_department_key);
      if (selectedTask?.service_slug) params.set('service_slug', selectedTask.service_slug);
      const res = await fetch(`/api/ops/ai/playbooks?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load AI playbooks');
      return res.json();
    },
  });

  const actionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTask?.id) throw new Error('No case selected');
      const res = await fetch(`/api/ops/service-tasks/${selectedTask.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          public_note: publicNote.trim() || undefined,
          note: internalNote.trim() || undefined,
          department_key:
            departmentFilter !== 'all'
              ? departmentFilter
              : selectedTask.assigned_department_key || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(data.error || 'Failed to apply case action');
      }
      return res.json();
    },
    onSuccess: () => {
      setPublicNote('');
      setInternalNote('');
      queryClient.invalidateQueries({ queryKey: ['service-ops-inbox'] });
      queryClient.invalidateQueries({ queryKey: ['service-ops-task'] });
    },
  });

  const aiRunMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTask?.id || !selectedPlaybookId) throw new Error('Choose an AI playbook first');
      const res = await fetch(`/api/ops/service-tasks/${selectedTask.id}/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playbook_id: selectedPlaybookId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(data.error || 'Failed to queue AI run');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-ops-task'] });
    },
  });

  const departments = departmentsData?.departments || [];
  const tasks = inboxData?.tasks || [];
  const playbooks = useMemo(() => playbooksData?.playbooks || [], [playbooksData?.playbooks]);
  const summary = inboxData?.summary || {
    total_open: 0,
    unassigned_open: 0,
    waiting_on_citizen: 0,
    escalated: 0,
    assigned_to_me: 0,
  };

  useEffect(() => {
    setSelectedPlaybookId('');
  }, [selectedTask?.id]);

  useEffect(() => {
    if (!selectedPlaybookId) return;
    if (!playbooks.some((playbook) => playbook.id === selectedPlaybookId)) {
      setSelectedPlaybookId('');
    }
  }, [playbooks, selectedPlaybookId]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="section-title flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <FolderKanban className="w-5 h-5 text-blue-400" />
            </div>
            Service Operations
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Department queues for service cases, approvals, follow-ups, and resolution.
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <MetricCard label="Open" value={summary.total_open} icon={<Clock3 className="w-4 h-4 text-blue-400" />} />
        <MetricCard label="Unassigned" value={summary.unassigned_open} icon={<UserRound className="w-4 h-4 text-amber-400" />} />
        <MetricCard label="Waiting on Citizen" value={summary.waiting_on_citizen} icon={<MessageSquare className="w-4 h-4 text-cyan-400" />} />
        <MetricCard label="Escalated" value={summary.escalated} icon={<AlertTriangle className="w-4 h-4 text-fuchsia-400" />} />
        <MetricCard label="Assigned to Me" value={summary.assigned_to_me} icon={<UserCheck className="w-4 h-4 text-emerald-400" />} />
      </div>

      <div className="glass-card p-4 flex flex-wrap gap-3">
        <select
          className="input w-auto text-sm"
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
        >
          <option value="all">All departments</option>
          {departments.map((dept) => (
            <option key={dept.key} value={dept.key}>
              {dept.name}
            </option>
          ))}
        </select>

        <select
          className="input w-auto text-sm"
          value={queueFilter}
          onChange={(e) => setQueueFilter(e.target.value)}
        >
          <option value="all">All queue states</option>
          {Object.entries(QUEUE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-card overflow-hidden">
          <div className="border-b border-white/[0.06] px-5 py-4">
            <h2 className="text-base font-semibold text-white">Department inbox</h2>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-gray-400">
              <Loader2 className="mx-auto h-5 w-5 animate-spin" />
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-400">Failed to load service inbox.</div>
          ) : tasks.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No service cases match this queue right now.</div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {tasks.map((task) => {
                const isSelected = selectedTask?.id === task.id;
                return (
                  <button
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className={`w-full text-left px-5 py-4 transition-colors ${isSelected ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-white">{task.service_title}</span>
                          <QueueBadge state={task.queue_state} />
                          {task.escalation_level ? (
                            <span className="rounded-full border border-fuchsia-500/30 px-2 py-0.5 text-[10px] font-medium text-fuchsia-300">
                              Escalation {task.escalation_level}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {task.assigned_department_name || 'Unrouted'}{task.assigned_office_name ? ` · ${task.assigned_office_name}` : ''}
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm text-gray-300">
                          {task.summary || task.next_action || 'No summary yet.'}
                        </p>
                        {task.resolution_plan?.headline ? (
                          <p className="mt-2 line-clamp-2 text-xs text-cyan-200/90">
                            {task.resolution_plan.headline}
                          </p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-gray-500">
                          <span>{task.status.replace(/_/g, ' ')}</span>
                          <span>{task.progress}% progress</span>
                          {task.target_member_name ? <span>For {task.target_member_name}</span> : null}
                          {task.waiting_on_party ? <span>Waiting on {task.waiting_on_party}</span> : null}
                        </div>
                      </div>
                      <div className="text-right text-[11px] text-gray-500">
                        <div>Updated</div>
                        <div className="text-gray-300">{formatDate(task.updated_at)}</div>
                        {task.resolution_due_at ? (
                          <>
                            <div className="mt-2">Due</div>
                            <div className="text-gray-300">{formatDate(task.resolution_due_at)}</div>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="glass-card p-5">
          {!selectedTask ? (
            <div className="text-sm text-gray-400">Select a case to work it.</div>
          ) : detailLoading ? (
            <div className="text-center text-gray-400">
              <Loader2 className="mx-auto h-5 w-5 animate-spin" />
            </div>
          ) : !detailData ? (
            <div className="text-sm text-red-400">Failed to load case details.</div>
          ) : (
            <div className="space-y-5">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-white">{detailData.task.service_title}</h2>
                  <QueueBadge state={detailData.task.queue_state} />
                </div>
                <p className="mt-1 text-sm text-gray-400">
                  {detailData.task.assigned_department_name || 'Unassigned department'}{detailData.task.assigned_office_name ? ` · ${detailData.task.assigned_office_name}` : ''}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <InfoCard label="Next action" value={detailData.task.next_action || 'No next action set'} />
                <InfoCard label="Routing" value={detailData.task.routing_reason || 'No routing note'} />
                <InfoCard label="Waiting on" value={detailData.task.waiting_on_party || 'No wait state'} />
                <InfoCard label="Resolution due" value={detailData.task.resolution_due_at ? formatDate(detailData.task.resolution_due_at) : 'No due date'} />
              </div>

              {detailData.task.counterparty_route?.counterparty ? (
                <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-violet-300">Mapped counterparty</div>
                  <div className="text-sm font-medium text-white">{detailData.task.counterparty_route.counterparty.name}</div>
                  <div className="mt-1 text-xs text-violet-100/80">
                    {detailData.task.counterparty_route.submission_mode} → {detailData.task.counterparty_route.response_capture_mode}
                  </div>
                  {detailData.task.counterparty_route.metadata?.strategy ? (
                    <div className="mt-3 text-sm text-gray-300">
                      {detailData.task.counterparty_route.metadata.strategy}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {detailData.task.resolution_plan ? (
                <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-cyan-300">Resolution plan</div>
                  <div className="text-sm font-medium text-white">{detailData.task.resolution_plan.headline}</div>
                  {detailData.task.resolution_plan.citizenContext ? (
                    <div className="mt-2 text-xs text-cyan-100/80">{detailData.task.resolution_plan.citizenContext}</div>
                  ) : null}
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <InfoCard label="Citizen action" value={detailData.task.resolution_plan.citizenAction} />
                    <InfoCard label="Department action" value={detailData.task.resolution_plan.departmentAction} />
                    <InfoCard label="Provider action" value={detailData.task.resolution_plan.providerAction} />
                    <InfoCard label="Resolution owner" value={detailData.task.resolution_plan.status.replace(/_/g, ' ')} />
                  </div>
                  {detailData.task.resolution_plan.blockers?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {detailData.task.resolution_plan.blockers.map((blocker: string) => (
                        <span
                          key={blocker}
                          className="rounded-full border border-amber-500/30 px-2 py-1 text-[11px] text-amber-300"
                        >
                          {blocker}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="space-y-3">
                {playbooks.length > 0 && (
                  <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-cyan-300">AI assistance</div>
                    <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                      <select
                        value={selectedPlaybookId}
                        onChange={(e) => setSelectedPlaybookId(e.target.value)}
                        className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white"
                      >
                        <option value="">Choose AI playbook</option>
                        {playbooks.map((playbook) => (
                          <option key={playbook.id} value={playbook.id}>
                            {playbook.name}{playbook.service_slug ? ' · service-specific' : ' · department-wide'}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => aiRunMutation.mutate()}
                        disabled={aiRunMutation.isPending || !selectedPlaybookId}
                        className="inline-flex items-center justify-center rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-60"
                      >
                        {aiRunMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                        <span className="ml-2">Run AI</span>
                      </button>
                    </div>
                    {selectedPlaybookId ? (
                      <div className="mt-2 text-xs text-cyan-100/80">
                        {playbooks.find((playbook) => playbook.id === selectedPlaybookId)?.requires_human_approval
                          ? 'This playbook still requires human approval before any final decision.'
                          : 'This playbook can operate without human approval for its configured scope.'}
                      </div>
                    ) : null}
                    {aiRunMutation.error ? (
                      <div className="mt-2 text-sm text-red-400">{(aiRunMutation.error as Error).message}</div>
                    ) : null}
                  </div>
                )}

                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Department action
                </label>
                <div className="flex flex-wrap gap-2">
                  {ACTION_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setAction(option.value)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        action === option.value ? option.tone + ' bg-white/[0.04]' : 'border-white/[0.08] text-gray-400 hover:text-white'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                  <button
                    onClick={() => setAction('transfer')}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      action === 'transfer' ? 'border-violet-500/30 bg-white/[0.04] text-violet-300' : 'border-white/[0.08] text-gray-400 hover:text-white'
                    }`}
                  >
                    Transfer
                  </button>
                </div>

                <textarea
                  value={publicNote}
                  onChange={(e) => setPublicNote(e.target.value)}
                  rows={3}
                  placeholder="Public update for the citizen"
                  className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-primary-500/40"
                />

                <textarea
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  rows={3}
                  placeholder="Internal note for staff only"
                  className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-primary-500/40"
                />

                <button
                  onClick={() => actionMutation.mutate()}
                  disabled={actionMutation.isPending}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {actionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  Apply action
                </button>
                {actionMutation.error ? (
                  <div className="text-sm text-red-400">{(actionMutation.error as Error).message}</div>
                ) : null}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <TimelineBlock
                  title="Public / internal thread"
                  items={detailData.messages.map((message) => ({
                    id: message.id,
                    title: `${message.visibility} · ${message.message_type}`,
                    body: message.body,
                    meta: message.actor_type,
                    at: message.created_at,
                  }))}
                  empty="No thread messages yet."
                />

                <TimelineBlock
                  title="Decisions and events"
                  items={[
                    ...detailData.decisions.map((decision) => ({
                      id: decision.id,
                      title: decision.decision_type,
                      body: decision.public_note || decision.internal_note || 'Decision recorded',
                      meta: decision.next_queue_state,
                      at: decision.created_at,
                    })),
                    ...detailData.events.map((event) => ({
                      id: event.id,
                      title: event.event_type,
                      body: event.note || 'System event',
                      meta: '',
                      at: event.created_at,
                    })),
                  ].sort((a, b) => +new Date(b.at) - +new Date(a.at))}
                  empty="No decision history yet."
                />
              </div>

              <TimelineBlock
                title="AI runs"
                items={(detailData.ai_runs || []).map((run) => ({
                  id: run.id,
                  title: run.playbook?.name || run.summary || 'AI run',
                  body: run.summary || run.playbook?.playbook_key || 'AI run queued',
                  meta: run.status,
                  at: run.created_at,
                }))}
                empty="No AI runs yet."
              />

              <TimelineBlock
                title="Partner replies"
                items={(detailData.partner_replies || []).map((reply) => ({
                  id: reply.id,
                  title: reply.counterparty?.name || reply.reply_type || 'Partner reply',
                  body: reply.content || reply.new_status || 'Partner reply recorded',
                  meta: [reply.reply_type, reply.new_status].filter(Boolean).join(' · '),
                  at: reply.created_at,
                }))}
                empty="No partner replies yet."
              />

              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Assignment history</div>
                <div className="space-y-2">
                  {detailData.assignments.length === 0 ? (
                    <div className="text-sm text-gray-400">No assignment history yet.</div>
                  ) : (
                    detailData.assignments.map((assignment) => (
                      <div key={assignment.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] px-3 py-2 text-sm">
                        <div className="text-gray-200">
                          {assignment.department_key}
                          {assignment.assignee_user_id ? ` · ${assignment.assignee_user_id}` : ' · unassigned'}
                        </div>
                        <div className="text-xs text-gray-500">{formatDate(assignment.created_at)}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
        {icon}
      </div>
      <div className="mt-2 text-3xl font-black text-white">{value}</div>
    </div>
  );
}

function QueueBadge({ state }: { state: QueueState }) {
  const color =
    state === 'approved' || state === 'resolved' || state === 'closed'
      ? 'border-emerald-500/30 text-emerald-300'
      : state === 'rejected'
        ? 'border-red-500/30 text-red-300'
        : state === 'escalated'
          ? 'border-fuchsia-500/30 text-fuchsia-300'
          : state === 'waiting_on_citizen'
            ? 'border-amber-500/30 text-amber-300'
            : 'border-blue-500/30 text-blue-300';
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${color}`}>
      {QUEUE_LABELS[state]}
    </span>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-2 text-sm text-gray-200">{value}</div>
    </div>
  );
}

function TimelineBlock({
  title,
  items,
  empty,
}: {
  title: string;
  items: { id: string; title: string; body: string; meta?: string; at: string }[];
  empty: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</div>
      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="text-sm text-gray-400">{empty}</div>
        ) : (
          items.slice(0, 12).map((item) => (
            <div key={item.id} className="rounded-xl bg-white/[0.03] p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white">{item.title}</div>
                  {item.meta ? <div className="mt-1 text-[11px] text-gray-500">{item.meta}</div> : null}
                </div>
                <div className="text-[11px] text-gray-500">{formatDate(item.at)}</div>
              </div>
              <div className="mt-2 text-sm text-gray-300">{item.body}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}
