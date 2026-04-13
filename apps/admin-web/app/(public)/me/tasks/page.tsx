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
  collecting_docs: 'Collecting documents',
  ready: 'Ready to start',
  in_progress: 'In progress',
  booked: 'Booked',
  submitted: 'Submitted',
  completed: 'Completed',
  blocked: 'Blocked',
};

export default function MyServiceTasksPage() {
  const authReady = useAuth((s) => s._initialized);
  const user = useAuth((s) => s.user);
  const [tasks, setTasks] = useState<ServiceTaskRecord[]>([]);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
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
    return <div className="max-w-4xl mx-auto px-4 py-10 text-zinc-400">Loading tasks…</div>;
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-black text-white">My Cases</h1>
        <p className="text-zinc-400 mt-2">
          Track your service requests, review submissions, and follow up on progress.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3 mb-8">
        <StatCard label="Active" value={grouped.active.length + groupedApplications.active.length} />
        <StatCard label="Completed" value={grouped.completed.length + groupedApplications.completed.length} />
        <StatCard label="Blocked" value={grouped.active.filter((task) => task.status === 'blocked').length} />
      </div>

      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Continue where you left off</h2>
          <Link href="/services" className="text-sm text-red-400 hover:underline">Browse services</Link>
        </div>

        {grouped.active.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-zinc-400">
            No active service tasks yet. Start one from any service page.
          </div>
        ) : (
          <div className="grid gap-4">
            {grouped.active.map((task) => (
              <div key={task.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-wide text-zinc-500 mb-1">
                      {task.serviceCategory}
                    </div>
                    <h3 className="text-lg font-semibold text-zinc-100">{task.serviceTitle}</h3>
                    {task.targetMemberName && (
                      <div className="mt-1 text-xs font-medium text-cyan-300">
                        For {task.targetMemberName}
                      </div>
                    )}
                    <p className="text-sm text-zinc-400 mt-1">{task.summary}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-zinc-300">
                        {STATUS_LABELS[task.status]}
                      </span>
                      <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-zinc-300">
                        Step {task.currentStep} of {task.totalSteps}
                      </span>
                      <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-zinc-300">
                        {task.progress}% complete
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 md:items-end">
                    <Link
                      href={`/services/${task.serviceCategory}/${task.serviceSlug}`}
                      className="inline-flex items-center justify-center rounded-xl border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
                    >
                      Open service
                    </Link>
                    <button
                      onClick={() => advance(task)}
                      className="inline-flex items-center justify-center rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500"
                    >
                      {task.currentStep >= task.totalSteps ? 'Mark complete' : 'Advance step'}
                    </button>
                    <button
                      onClick={() => markBlocked(task)}
                      className="inline-flex items-center justify-center rounded-xl border border-amber-500/30 px-3 py-2 text-sm text-amber-300 hover:bg-amber-500/10"
                    >
                      Mark blocked
                    </button>
                  </div>
                </div>

                <div className="mt-4 h-2 rounded-full bg-zinc-800">
                  <div className="h-2 rounded-full bg-red-500" style={{ width: `${task.progress}%` }} />
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl bg-zinc-800/60 p-3">
                    <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Next action</div>
                    <div className="text-sm text-zinc-200">{task.nextAction || 'Continue the workflow.'}</div>
                  </div>

                  <div className="rounded-xl bg-zinc-800/60 p-3">
                    <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Documents</div>
                    <div className="text-sm text-zinc-300">
                      {task.missingDocs.length === 0
                        ? 'Required documents look ready.'
                        : `Still missing: ${task.missingDocs.map((doc) => doc.label).join(', ')}`}
                    </div>
                    <Link href="/me/vault" className="mt-2 inline-flex text-sm text-red-400 hover:underline">
                      Open vault
                    </Link>
                  </div>
                </div>

                {task.resolutionPlan && (
                  <div className="mt-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                    <div className="text-xs uppercase tracking-wide text-cyan-300 mb-2">Resolution path</div>
                    <div className="text-sm font-medium text-white">{task.resolutionPlan.headline}</div>
                    {task.resolutionPlan.citizenContext && (
                      <div className="mt-2 text-xs text-cyan-100/80">{task.resolutionPlan.citizenContext}</div>
                    )}
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-zinc-500 mb-1">Your next move</div>
                        <div className="text-sm text-zinc-200">{task.resolutionPlan.citizenAction}</div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-zinc-500 mb-1">Department side</div>
                        <div className="text-sm text-zinc-300">{task.resolutionPlan.departmentAction}</div>
                      </div>
                    </div>
                    {task.resolutionPlan.blockers.length > 0 && (
                      <div className="mt-3">
                        <div className="text-[11px] uppercase tracking-wide text-zinc-500 mb-1">What is blocking resolution</div>
                        <div className="flex flex-wrap gap-2">
                          {task.resolutionPlan.blockers.map((blocker) => (
                            <span
                              key={blocker}
                              className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200"
                            >
                              {blocker}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-4 rounded-xl bg-zinc-800/60 p-3">
                  <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Routed to</div>
                  <div className="text-sm text-zinc-200">
                    {task.assignedDepartmentName || 'Routing not assigned yet'}
                  </div>
                  <div className="mt-1 text-xs text-zinc-400">
                    {[task.assignedRoleTitle, task.assignedOfficeName, task.assignedAuthorityLevel]
                      .filter(Boolean)
                      .join(' · ') || 'The app will use this route to identify the right office or desk.'}
                  </div>
                  {task.routingReason && (
                    <div className="mt-2 text-xs text-zinc-500">
                      {task.routingReason}
                    </div>
                  )}
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl bg-zinc-800/60 p-3">
                    <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Workflow mode</div>
                    <div className="text-sm text-zinc-200">{task.workflowMode.replace('_', ' ')}</div>
                    <div className="mt-2 text-xs text-zinc-400">
                      {task.requiresAppointment ? 'Appointment required · ' : ''}
                      {task.supportsOnlinePayment ? 'Online payment supported · ' : ''}
                      {task.officeVisitRequired ? 'Office visit required' : 'No office visit required'}
                    </div>
                  </div>

                  <div className="rounded-xl bg-zinc-800/60 p-3">
                    <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Milestones</div>
                    <ul className="space-y-1 text-sm text-zinc-300">
                      {task.milestones.slice(0, 5).map((milestone) => (
                        <li key={milestone}>• {milestone}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Review & Timeline panels */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {task.status !== 'completed' && task.status !== 'intake' && (
                    <button
                      onClick={() => setReviewOpen(reviewOpen === task.id ? null : task.id)}
                      className="inline-flex items-center rounded-xl border border-cyan-500/30 px-3 py-2 text-sm font-semibold text-cyan-300 hover:bg-cyan-500/10"
                    >
                      {reviewOpen === task.id ? 'Close review' : 'Review & submit'}
                    </button>
                  )}
                  {task.status === 'submitted' && (
                    <button
                      onClick={() => setTimelineOpen(timelineOpen === task.id ? null : task.id)}
                      className="inline-flex items-center rounded-xl border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                    >
                      {timelineOpen === task.id ? 'Close timeline' : 'Track status'}
                    </button>
                  )}
                </div>

                {reviewOpen === task.id && (
                  <div className="mt-4">
                    <SubmissionReview
                      taskId={task.id}
                      serviceSlug={task.serviceSlug}
                      onApprove={() => { setReviewOpen(null); reload(); }}
                      onCancel={() => setReviewOpen(null)}
                    />
                  </div>
                )}

                {timelineOpen === task.id && (
                  <div className="mt-4">
                    <CaseTimeline taskId={task.id} serviceTitle={task.serviceTitle} />
                  </div>
                )}

                <div className="mt-4">
                  <TaskHistory taskId={task.id} />
                </div>

                <TaskConversation taskId={task.id} />

                <TaskIntegrations taskId={task.id} />

                <PortalLinkCard serviceSlug={task.serviceSlug} compact />

                {task.actions.length > 0 && (
                  <div className="mt-4 rounded-xl bg-zinc-800/60 p-3">
                    <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Quick actions</div>
                    <div className="flex flex-wrap gap-2">
                      {task.actions.map((action) => (
                        <div key={`${task.id}-${action.id}`} className="flex flex-wrap gap-2">
                          {action.href ? (
                            <a
                              href={action.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center rounded-full bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/20"
                            >
                              {action.label}
                            </a>
                          ) : (
                            <span className="inline-flex items-center rounded-full border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300">
                              {action.label}
                            </span>
                          )}

                          {action.completionLabel && !task.actionState[action.id]?.completed && (
                            <button
                              onClick={() => completeAction(task, action.id, action.placeholder)}
                              className="inline-flex items-center rounded-full border border-emerald-500/30 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/10"
                            >
                              {action.completionLabel}
                            </button>
                          )}

                          {task.actionState[action.id]?.completed && (
                            <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
                              Done{task.actionState[action.id]?.value ? ` · ${task.actionState[action.id]?.value}` : ''}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mb-10" id="tracked-applications">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">Tracked applications</h2>
            <p className="text-sm text-zinc-500 mt-1">
              Manual and reference-based cases are kept here alongside the newer workflow engine.
            </p>
          </div>
          <Link href="/me/applications" className="text-sm text-red-400 hover:underline">
            Open application editor
          </Link>
        </div>

        {applications.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-zinc-400">
            No tracked applications yet. Manual applications and portal-based follow-ups will show up here.
          </div>
        ) : (
          <div className="grid gap-3">
            {groupedApplications.active.map((app) => (
              <div key={app.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-wide text-zinc-500 mb-1">
                      Application tracker
                    </div>
                    <div className="font-semibold text-zinc-100">{app.service_title}</div>
                    <div className="mt-1 text-sm text-zinc-400">
                      {app.reference_no ? `Reference: ${app.reference_no}` : 'Reference number not added yet'}
                    </div>
                    {app.office_name && (
                      <div className="mt-1 text-sm text-zinc-500">{app.office_name}</div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300">
                      {app.status.replace(/_/g, ' ')}
                    </div>
                    {typeof app.amount_npr === 'number' && (
                      <div className="mt-2 text-xs text-zinc-500">
                        NPR {app.amount_npr.toLocaleString()}
                        {app.paid ? ' · paid' : ' · unpaid'}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-zinc-500">
                  {app.expected_on && <span>Expected: {new Date(app.expected_on).toLocaleDateString()}</span>}
                  {app.completed_on && <span>Completed: {new Date(app.completed_on).toLocaleDateString()}</span>}
                  <span>Updated: {new Date(app.updated_at).toLocaleDateString()}</span>
                </div>

                {app.notes && <div className="mt-2 text-xs text-zinc-500 italic">{app.notes}</div>}

                <div className="mt-3 flex flex-wrap gap-2">
                  {app.portal_url && (
                    <a
                      href={app.portal_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center rounded-xl border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
                    >
                      Open portal
                    </a>
                  )}
                  <Link
                    href="/me/applications"
                    className="inline-flex items-center rounded-xl bg-zinc-800 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700"
                  >
                    Edit application
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {grouped.completed.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-white mb-4">Completed</h2>
          <div className="grid gap-3">
            {grouped.completed.map((task) => (
              <div key={task.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-zinc-100">{task.serviceTitle}</div>
                    <div className="text-sm text-zinc-500">{task.completedAt ? `Completed ${new Date(task.completedAt).toLocaleDateString()}` : 'Completed'}</div>
                  </div>
                  <Link href={`/services/${task.serviceCategory}/${task.serviceSlug}`} className="text-sm text-red-400 hover:underline">
                    View service
                  </Link>
                </div>
              </div>
            ))}
            {groupedApplications.completed.map((app) => (
              <div key={app.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-zinc-100">{app.service_title}</div>
                    <div className="text-sm text-zinc-500">
                      {app.completed_on ? `Completed ${new Date(app.completed_on).toLocaleDateString()}` : `Status: ${app.status.replace(/_/g, ' ')}`}
                    </div>
                  </div>
                  <Link href="/me/applications" className="text-sm text-red-400 hover:underline">
                    View application
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-2 text-3xl font-black text-zinc-100">{value}</div>
    </div>
  );
}
