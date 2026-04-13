'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/use-auth';

interface DeptTask {
  id: string;
  owner_id: string;
  service_slug: string;
  service_title: string;
  service_category: string;
  status: string;
  progress: number;
  current_step: number;
  total_steps: number;
  summary: string;
  next_action: string;
  queue_state: string;
  waiting_on_party: string | null;
  assigned_department_key: string;
  assigned_department_name: string;
  assigned_office_name: string | null;
  assigned_role_title: string | null;
  assigned_staff_user_id: string | null;
  routing_reason: string | null;
  escalation_level: number;
  first_response_due_at: string | null;
  resolution_due_at: string | null;
  missing_docs: any[];
  ready_docs: any[];
  target_member_name: string | null;
  resolution_plan: any | null;
  created_at: string;
  updated_at: string;
}

interface InboxSummary {
  total_open: number;
  unassigned_open: number;
  waiting_on_citizen: number;
  escalated: number;
  assigned_to_me: number;
}

const QUEUE_FILTERS = [
  { key: '', label: 'All open' },
  { key: 'new', label: 'New' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'waiting_on_citizen', label: 'Waiting on citizen' },
  { key: 'escalated', label: 'Escalated' },
  { key: 'resolved', label: 'Resolved' },
];

const QUEUE_STATE_COLORS: Record<string, string> = {
  new: 'bg-blue-500',
  assigned: 'bg-cyan-500',
  in_progress: 'bg-amber-500',
  waiting_on_citizen: 'bg-purple-500',
  escalated: 'bg-red-500',
  resolved: 'bg-emerald-500',
  approved: 'bg-emerald-500',
  rejected: 'bg-red-500',
  closed: 'bg-zinc-500',
};

function DepartmentTasksContent() {
  const searchParams = useSearchParams();
  const deptKey = searchParams.get('dept') || '';
  const authReady = useAuth((s) => s._initialized);
  const user = useAuth((s) => s.user);

  const [tasks, setTasks] = useState<DeptTask[]>([]);
  const [summary, setSummary] = useState<InboxSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queueFilter, setQueueFilter] = useState('');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (deptKey) params.set('department_key', deptKey);
      if (queueFilter) params.set('queue_state', queueFilter);
      if (search.trim()) params.set('q', search.trim());
      params.set('limit', '100');

      const res = await fetch(`/api/ops/service-tasks/inbox?${params}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Access denied (${res.status})`);
      }
      const data = await res.json();
      setTasks(data.tasks || []);
      setSummary(data.summary || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [deptKey, queueFilter, search]);

  useEffect(() => {
    if (!authReady || !user) {
      setLoading(false);
      return;
    }
    fetchTasks();
  }, [authReady, user, fetchTasks]);

  async function performAction(taskId: string, action: string, note?: string) {
    setActionLoading(taskId);
    try {
      const res = await fetch(`/api/ops/service-tasks/${taskId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          note: note || undefined,
          public_note: note || undefined,
        }),
      });
      if (res.ok) await fetchTasks();
    } catch { /* ignore */ }
    setActionLoading(null);
  }

  if (!authReady || loading) {
    return <div className="max-w-5xl mx-auto px-4 py-10 text-zinc-400">Loading task queue…</div>;
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Department Tasks</h1>
        <p className="text-zinc-400 mb-6">Sign in with a department or admin account.</p>
        <Link href="/login?next=/department/tasks" className="inline-flex rounded-xl bg-[#DC143C] px-5 py-3 text-sm font-semibold text-white hover:bg-[#DC143C]/90">
          Sign in
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Department Tasks</h1>
        <p className="text-red-400 mb-4">{error}</p>
        <Link href="/department" className="text-sm text-zinc-400 hover:underline">Back to dashboard</Link>
      </div>
    );
  }

  const deptName = tasks[0]?.assigned_department_name || deptKey || 'All Departments';
  const isOverdue = (task: DeptTask) => task.resolution_due_at && new Date(task.resolution_due_at).getTime() < Date.now();

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-6">
        <Link href="/department" className="text-xs text-zinc-500 hover:text-zinc-300 mb-2 inline-flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-white">{deptName}</h1>
        {summary && (
          <div className="flex gap-4 mt-2 text-xs text-zinc-500">
            <span>{summary.total_open} open</span>
            <span>{summary.unassigned_open} unassigned</span>
            {summary.escalated > 0 && <span className="text-red-400">{summary.escalated} escalated</span>}
            {summary.assigned_to_me > 0 && <span className="text-cyan-400">{summary.assigned_to_me} assigned to me</span>}
          </div>
        )}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {QUEUE_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setQueueFilter(f.key)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
              queueFilter === f.key
                ? 'bg-[#DC143C] text-white'
                : 'border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
          >
            {f.label}
          </button>
        ))}
        <div className="flex-1" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') fetchTasks(); }}
          placeholder="Search cases…"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:border-[#DC143C]/50 w-48"
        />
      </div>

      {/* Task list */}
      {tasks.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center text-zinc-500">
          No tasks match this filter.
        </div>
      ) : (
        <div className="space-y-1.5">
          {tasks.map((task) => {
            const overdue = isOverdue(task);
            const expanded = expandedId === task.id;

            return (
              <div key={task.id}>
                {/* Compact row */}
                <button
                  onClick={() => setExpandedId(expanded ? null : task.id)}
                  className={`w-full rounded-xl border bg-zinc-900 px-4 py-3 text-left transition-all hover:bg-zinc-800/80 ${
                    expanded ? 'border-[#DC143C]/30 rounded-b-none' : overdue ? 'border-red-500/30' : 'border-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Queue state dot */}
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${QUEUE_STATE_COLORS[task.queue_state] || 'bg-zinc-500'}`} />

                    {/* Service title + citizen info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-zinc-100 truncate">{task.service_title}</span>
                        {overdue && (
                          <span className="text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-full flex-shrink-0">
                            OVERDUE
                          </span>
                        )}
                        {task.escalation_level > 0 && (
                          <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full flex-shrink-0">
                            L{task.escalation_level}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-500 mt-0.5 truncate">
                        {task.queue_state.replace(/_/g, ' ')}
                        {task.target_member_name && ` · for ${task.target_member_name}`}
                        {task.assigned_role_title && ` · ${task.assigned_role_title}`}
                      </div>
                    </div>

                    {/* Right side */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-[11px] text-zinc-600 hidden sm:block">
                        {new Date(task.updated_at).toLocaleDateString()}
                      </span>
                      <svg
                        className={`w-4 h-4 text-zinc-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </button>

                {/* Expanded detail */}
                {expanded && (
                  <div className="border border-t-0 border-[#DC143C]/30 rounded-b-xl bg-zinc-950 p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Summary */}
                    {task.summary && <p className="text-sm text-zinc-300">{task.summary}</p>}

                    {/* Key info grid */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <InfoBlock label="Next action" value={task.next_action || 'Continue workflow'} />
                      <InfoBlock label="Documents" value={
                        task.missing_docs?.length
                          ? `Missing: ${task.missing_docs.map((d: any) => d.label || d).join(', ')}`
                          : 'All documents ready'
                      } />
                      <InfoBlock label="Office" value={task.assigned_office_name || 'Not assigned'} />
                      <InfoBlock label="Category" value={task.service_category} />
                    </div>

                    {/* SLA info */}
                    {(task.first_response_due_at || task.resolution_due_at) && (
                      <div className="flex flex-wrap gap-4 text-xs">
                        {task.first_response_due_at && (
                          <div>
                            <span className="text-zinc-500">First response due: </span>
                            <span className={new Date(task.first_response_due_at).getTime() < Date.now() ? 'text-red-400' : 'text-zinc-300'}>
                              {new Date(task.first_response_due_at).toLocaleString()}
                            </span>
                          </div>
                        )}
                        {task.resolution_due_at && (
                          <div>
                            <span className="text-zinc-500">Resolution due: </span>
                            <span className={new Date(task.resolution_due_at).getTime() < Date.now() ? 'text-red-400' : 'text-zinc-300'}>
                              {new Date(task.resolution_due_at).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Resolution plan */}
                    {task.resolution_plan && (
                      <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3">
                        <div className="text-xs uppercase tracking-wider text-cyan-400 font-medium mb-1">Resolution Plan</div>
                        <div className="text-sm text-white">{task.resolution_plan.headline}</div>
                        <div className="mt-1 text-xs text-zinc-400">{task.resolution_plan.departmentAction}</div>
                      </div>
                    )}

                    {/* Routing reason */}
                    {task.routing_reason && (
                      <div className="text-xs text-zinc-500">
                        <span className="text-zinc-400 font-medium">Why routed here:</span> {task.routing_reason}
                      </div>
                    )}

                    {/* Department actions */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-800">
                      {task.queue_state === 'new' && (
                        <button
                          onClick={() => performAction(task.id, 'accept')}
                          disabled={actionLoading === task.id}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                        >
                          Accept & assign to me
                        </button>
                      )}
                      {task.queue_state !== 'waiting_on_citizen' && !['resolved', 'approved', 'closed'].includes(task.queue_state) && (
                        <button
                          onClick={() => {
                            const note = window.prompt('What information do you need from the citizen?');
                            if (note) performAction(task.id, 'request_info', note);
                          }}
                          disabled={actionLoading === task.id}
                          className="rounded-lg border border-purple-500/30 px-4 py-2 text-xs text-purple-300 hover:bg-purple-500/10 disabled:opacity-50"
                        >
                          Request info from citizen
                        </button>
                      )}
                      {!['resolved', 'approved', 'closed'].includes(task.queue_state) && (
                        <button
                          onClick={() => performAction(task.id, 'resolve')}
                          disabled={actionLoading === task.id}
                          className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                        >
                          Resolve
                        </button>
                      )}
                      {!['approved', 'closed'].includes(task.queue_state) && task.queue_state === 'resolved' && (
                        <button
                          onClick={() => performAction(task.id, 'approve')}
                          disabled={actionLoading === task.id}
                          className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                        >
                          Approve
                        </button>
                      )}
                      {!['rejected', 'resolved', 'approved', 'closed'].includes(task.queue_state) && (
                        <button
                          onClick={() => {
                            const note = window.prompt('Reason for rejection?');
                            if (note) performAction(task.id, 'reject', note);
                          }}
                          disabled={actionLoading === task.id}
                          className="rounded-lg border border-red-500/30 px-4 py-2 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      )}
                      {!['escalated', 'resolved', 'approved', 'closed'].includes(task.queue_state) && (
                        <button
                          onClick={() => performAction(task.id, 'escalate')}
                          disabled={actionLoading === task.id}
                          className="rounded-lg border border-amber-500/30 px-4 py-2 text-xs text-amber-300 hover:bg-amber-500/10 disabled:opacity-50"
                        >
                          Escalate
                        </button>
                      )}
                      <button
                        onClick={() => {
                          const note = window.prompt('Public update for the citizen:');
                          if (note) performAction(task.id, 'public_update', note);
                        }}
                        disabled={actionLoading === task.id}
                        className="rounded-lg border border-zinc-700 px-4 py-2 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                      >
                        Send update to citizen
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-zinc-900 p-3">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium mb-1">{label}</div>
      <div className="text-sm text-zinc-200">{value}</div>
    </div>
  );
}

export default function DepartmentTasksPage() {
  return (
    <Suspense fallback={<div className="max-w-5xl mx-auto px-4 py-10 text-zinc-400">Loading…</div>}>
      <DepartmentTasksContent />
    </Suspense>
  );
}
