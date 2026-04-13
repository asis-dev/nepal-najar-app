'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/use-auth';
import type { ServiceTaskRecord, ServiceTaskStatus } from '@/lib/services/task-types';
import { TaskHistory } from '@/components/public/services/task-history';
import { TaskIntegrations } from '@/components/public/services/task-integrations';
import { TaskConversation } from '@/components/public/services/task-conversation';
import { PortalLinkCard } from '@/components/public/services/portal-link-card';

const SubmissionReview = dynamic(() => import('@/components/public/services/review/submission-review'), { ssr: false });
const CaseTimeline = dynamic(() => import('@/components/public/services/timeline/case-timeline').then((m) => ({ default: m.CaseTimeline })), { ssr: false });

type ApplicationRecord = {
  id: string;
  service_slug: string;
  service_title: string;
  reference_no?: string;
  office_name?: string;
  portal_url?: string;
  amount_npr?: number;
  paid?: boolean;
  expected_on?: string;
  completed_on?: string;
  status: string;
  notes?: string;
  updated_at: string;
};

const STATUS_LABELS: Record<ServiceTaskStatus, string> = {
  intake: 'Intake',
  collecting_docs: 'Collecting docs',
  ready: 'Ready',
  in_progress: 'In progress',
  booked: 'Booked',
  submitted: 'Submitted',
  completed: 'Completed',
  blocked: 'Blocked',
};

const STATUS_COLORS: Record<ServiceTaskStatus, string> = {
  intake: 'bg-zinc-500',
  collecting_docs: 'bg-amber-500',
  ready: 'bg-emerald-500',
  in_progress: 'bg-blue-500',
  booked: 'bg-cyan-500',
  submitted: 'bg-purple-500',
  completed: 'bg-emerald-500',
  blocked: 'bg-red-500',
};

export default function MyServiceTasksPage() {
  const authReady = useAuth((s) => s._initialized);
  const user = useAuth((s) => s.user);
  const [tasks, setTasks] = useState<ServiceTaskRecord[]>([]);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState<string | null>(null);
  const [timelineOpen, setTimelineOpen] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    try {
      const [taskResponse, appResponse] = await Promise.all([
        fetch('/api/me/service-tasks'),
        fetch('/api/me/applications'),
      ]);
      const taskData = await taskResponse.json();
      const appData = await appResponse.json();
      setTasks(taskData.tasks || []);
      setApplications(appData.applications || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authReady || !user) {
      setLoading(false);
      return;
    }
    reload();
  }, [authReady, user]);

  const grouped = useMemo(() => ({
    active: tasks.filter((task) => task.status !== 'completed'),
    completed: tasks.filter((task) => task.status === 'completed'),
  }), [tasks]);

  const groupedApplications = useMemo(() => ({
    active: applications.filter((app) => !['completed', 'cancelled', 'rejected'].includes(app.status)),
    completed: applications.filter((app) => ['completed', 'cancelled', 'rejected'].includes(app.status)),
  }), [applications]);

  async function advance(task: ServiceTaskRecord) {
    const nextStep = Math.min(task.totalSteps, task.currentStep + 1);
    const status: ServiceTaskStatus = nextStep >= task.totalSteps ? 'completed' : 'in_progress';
    const response = await fetch(`/api/me/service-tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentStep: nextStep, status }),
    });
    if (response.ok) reload();
  }

  async function markBlocked(task: ServiceTaskRecord) {
    const response = await fetch(`/api/me/service-tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'blocked' }),
    });
    if (response.ok) reload();
  }

  async function completeAction(task: ServiceTaskRecord, actionId: string, placeholder?: string) {
    const value = placeholder ? window.prompt(placeholder) || '' : '';
    const response = await fetch(`/api/me/service-tasks/${task.id}/actions/${actionId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    });
    if (response.ok) reload();
  }

  if (!authReady || loading) {
    return <div className="max-w-4xl mx-auto px-4 py-10 text-zinc-400">Loading cases…</div>;
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-white mb-2">My Cases</h1>
        <p className="text-zinc-400 mb-6">Sign in to track service workflows, applications, next actions, and document readiness.</p>
        <Link href="/login?next=/me/tasks" className="inline-flex rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-500">
          Sign in
        </Link>
      </div>
    );
  }

  const isExpanded = (id: string) => expandedId === id;
  const toggle = (id: string) => setExpandedId(expandedId === id ? null : id);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My Cases</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {grouped.active.length + groupedApplications.active.length} active
            {grouped.completed.length + groupedApplications.completed.length > 0 &&
              ` · ${grouped.completed.length + groupedApplications.completed.length} completed`}
          </p>
        </div>
        <Link href="/services" className="rounded-xl bg-[#DC143C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#DC143C]/90">
          + New
        </Link>
      </div>

      {/* ── Active cases — compact list ── */}
      {grouped.active.length === 0 && groupedApplications.active.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <div className="text-zinc-500 mb-3">No active cases yet</div>
          <Link href="/" className="text-sm text-[#DC143C] hover:underline">
            Ask the advisor to start one
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {grouped.active.map((task) => (
            <div key={task.id}>
              {/* ── Compact row ── */}
              <button
                onClick={() => toggle(task.id)}
                className={`w-full rounded-xl border bg-zinc-900 px-4 py-3 text-left transition-all hover:bg-zinc-800/80 ${
                  isExpanded(task.id) ? 'border-[#DC143C]/30 rounded-b-none' : 'border-zinc-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Status dot */}
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${STATUS_COLORS[task.status]}`} />

                  {/* Title & meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-zinc-100 truncate">{task.serviceTitle}</span>
                      {task.targetMemberName && (
                        <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded-full flex-shrink-0">
                          {task.targetMemberName}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5 truncate">
                      {task.nextAction || STATUS_LABELS[task.status]}
                    </div>
                  </div>

                  {/* Right side: progress + chevron */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="hidden sm:flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div className="h-full rounded-full bg-[#DC143C]" style={{ width: `${task.progress}%` }} />
                      </div>
                      <span className="text-[11px] text-zinc-500 w-8 text-right">{task.progress}%</span>
                    </div>
                    <svg
                      className={`w-4 h-4 text-zinc-500 transition-transform ${isExpanded(task.id) ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </button>

              {/* ── Expanded detail panel ── */}
              {isExpanded(task.id) && (
                <div className="border border-t-0 border-[#DC143C]/30 rounded-b-xl bg-zinc-950 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Progress bar */}
                  <div className="h-1 bg-zinc-800">
                    <div className="h-1 bg-[#DC143C] transition-all" style={{ width: `${task.progress}%` }} />
                  </div>

                  <div className="p-4 space-y-4">
                    {/* Status + Step info */}
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className={`rounded-full px-2.5 py-1 font-medium text-white ${STATUS_COLORS[task.status]}/20 border border-current/20`}
                        style={{ backgroundColor: `${STATUS_COLORS[task.status]}20` }}
                      >
                        {STATUS_LABELS[task.status]}
                      </span>
                      <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-zinc-300">
                        Step {task.currentStep} / {task.totalSteps}
                      </span>
                      <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-zinc-300">
                        {task.serviceCategory}
                      </span>
                    </div>

                    {/* Summary */}
                    {task.summary && (
                      <p className="text-sm text-zinc-300">{task.summary}</p>
                    )}

                    {/* Next action + Documents side by side */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg bg-zinc-900 p-3">
                        <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium mb-1">Next action</div>
                        <div className="text-sm text-zinc-200">{task.nextAction || 'Continue the workflow.'}</div>
                      </div>
                      <div className="rounded-lg bg-zinc-900 p-3">
                        <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium mb-1">Documents</div>
                        <div className="text-sm text-zinc-300">
                          {task.missingDocs.length === 0
                            ? '✓ All documents ready'
                            : `Missing: ${task.missingDocs.map((doc) => doc.label).join(', ')}`}
                        </div>
                      </div>
                    </div>

                    {/* Assigned to */}
                    {task.assignedDepartmentName && (
                      <div className="text-xs text-zinc-500">
                        <span className="text-zinc-400 font-medium">Routed to:</span>{' '}
                        {task.assignedDepartmentName}
                        {task.assignedOfficeName && ` · ${task.assignedOfficeName}`}
                      </div>
                    )}

                    {/* Resolution plan (compact) */}
                    {task.resolutionPlan && (
                      <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3">
                        <div className="text-sm font-medium text-white">{task.resolutionPlan.headline}</div>
                        <div className="mt-1 text-xs text-zinc-400">{task.resolutionPlan.citizenAction}</div>
                        {task.resolutionPlan.blockers.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {task.resolutionPlan.blockers.map((b) => (
                              <span key={b} className="text-[10px] rounded-full bg-amber-500/10 text-amber-300 px-2 py-0.5">{b}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Quick actions */}
                    {task.actions.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {task.actions.map((action) => (
                          <div key={`${task.id}-${action.id}`} className="flex flex-wrap gap-1.5">
                            {action.href ? (
                              <a href={action.href} target="_blank" rel="noopener noreferrer"
                                className="rounded-full bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/20">
                                {action.label}
                              </a>
                            ) : (
                              <span className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300">{action.label}</span>
                            )}
                            {action.completionLabel && !task.actionState[action.id]?.completed && (
                              <button onClick={() => completeAction(task, action.id, action.placeholder)}
                                className="rounded-full border border-emerald-500/30 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/10">
                                {action.completionLabel}
                              </button>
                            )}
                            {task.actionState[action.id]?.completed && (
                              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs text-emerald-300">
                                Done{task.actionState[action.id]?.value ? ` · ${task.actionState[action.id]?.value}` : ''}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-800">
                      <button
                        onClick={() => advance(task)}
                        className="rounded-lg bg-[#DC143C] px-4 py-2 text-xs font-semibold text-white hover:bg-[#DC143C]/90"
                      >
                        {task.currentStep >= task.totalSteps ? 'Mark complete' : 'Advance step'}
                      </button>
                      <Link
                        href={`/services/${task.serviceCategory}/${task.serviceSlug}`}
                        className="rounded-lg border border-zinc-700 px-4 py-2 text-xs text-zinc-200 hover:bg-zinc-800"
                      >
                        Open service
                      </Link>
                      <button
                        onClick={() => markBlocked(task)}
                        className="rounded-lg border border-amber-500/30 px-4 py-2 text-xs text-amber-300 hover:bg-amber-500/10"
                      >
                        Blocked
                      </button>
                      {task.status !== 'completed' && task.status !== 'intake' && (
                        <button
                          onClick={() => setReviewOpen(reviewOpen === task.id ? null : task.id)}
                          className="rounded-lg border border-cyan-500/30 px-4 py-2 text-xs text-cyan-300 hover:bg-cyan-500/10"
                        >
                          {reviewOpen === task.id ? 'Close review' : 'Review & submit'}
                        </button>
                      )}
                      {task.status === 'submitted' && (
                        <button
                          onClick={() => setTimelineOpen(timelineOpen === task.id ? null : task.id)}
                          className="rounded-lg border border-zinc-700 px-4 py-2 text-xs text-zinc-300 hover:bg-zinc-800"
                        >
                          {timelineOpen === task.id ? 'Close timeline' : 'Track status'}
                        </button>
                      )}
                    </div>

                    {/* Expandable panels */}
                    {reviewOpen === task.id && (
                      <SubmissionReview
                        taskId={task.id}
                        serviceSlug={task.serviceSlug}
                        onApprove={() => { setReviewOpen(null); reload(); }}
                        onCancel={() => setReviewOpen(null)}
                      />
                    )}
                    {timelineOpen === task.id && (
                      <CaseTimeline taskId={task.id} serviceTitle={task.serviceTitle} />
                    )}
                    <TaskHistory taskId={task.id} />
                    <TaskConversation taskId={task.id} />
                    <TaskIntegrations taskId={task.id} />
                    <PortalLinkCard serviceSlug={task.serviceSlug} compact />
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Tracked applications — compact rows */}
          {groupedApplications.active.map((app) => (
            <div key={app.id} className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-zinc-100 truncate">{app.service_title}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    {app.reference_no ? `Ref: ${app.reference_no}` : 'Application tracker'}
                    {app.office_name && ` · ${app.office_name}`}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-400">
                    {app.status.replace(/_/g, ' ')}
                  </span>
                  {app.portal_url && (
                    <a href={app.portal_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-[#DC143C] hover:underline">
                      Portal
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Completed section ── */}
      {(grouped.completed.length > 0 || groupedApplications.completed.length > 0) && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">Completed</h2>
          <div className="space-y-1.5">
            {grouped.completed.map((task) => (
              <div key={task.id} className="rounded-lg border border-zinc-800/50 bg-zinc-900/50 px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-zinc-300 truncate">{task.serviceTitle}</span>
                </div>
                <span className="text-xs text-zinc-600 flex-shrink-0">
                  {task.completedAt ? new Date(task.completedAt).toLocaleDateString() : ''}
                </span>
              </div>
            ))}
            {groupedApplications.completed.map((app) => (
              <div key={app.id} className="rounded-lg border border-zinc-800/50 bg-zinc-900/50 px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-zinc-300 truncate">{app.service_title}</span>
                </div>
                <span className="text-xs text-zinc-600 flex-shrink-0">
                  {app.completed_on ? new Date(app.completed_on).toLocaleDateString() : app.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
