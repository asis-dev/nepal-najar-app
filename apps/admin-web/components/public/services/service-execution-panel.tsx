'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/use-auth';
import type { ServiceCategory } from '@/lib/services/types';
import type { ServiceTaskRecord } from '@/lib/services/task-types';

type WorkflowAction = {
  id: string;
  label: string;
  label_ne?: string;
  kind: 'official_site' | 'payment' | 'appointment' | 'call' | 'directions';
  href?: string;
  completionLabel?: string;
  placeholder?: string;
  estimatedFee?: string;
  requiredDocs?: string[];
  estimatedWait?: string;
  canSkip?: boolean;
  milestoneIndex?: number;
  aiAutoCompletable?: boolean;
  aiGuidancePrompt?: string;
};

type AccentConfig = {
  border: string;
  bg: string;
  text: string;
  button: string;
  buttonHover: string;
  label: string;
  title: string;
  description: string;
};

const ACCENTS: Record<ServiceCategory, AccentConfig> = {
  identity: {
    border: 'border-sky-500/20',
    bg: 'bg-sky-500/5',
    text: 'text-sky-300',
    button: 'bg-sky-600',
    buttonHover: 'hover:bg-sky-500',
    label: 'Identity execution',
    title: 'Keep the identity workflow moving from one case',
    description: 'Save submission references, appointment details, office visits, and issuance updates so document work does not fall out of sync.',
  },
  transport: {
    border: 'border-amber-500/20',
    bg: 'bg-amber-500/5',
    text: 'text-amber-300',
    button: 'bg-amber-600',
    buttonHover: 'hover:bg-amber-500',
    label: 'Transport execution',
    title: 'Handle the transport workflow from this case',
    description: 'Save references for booking, payment, office validation, and issuance so the whole transport flow stays in one place.',
  },
  tax: {
    border: 'border-emerald-500/20',
    bg: 'bg-emerald-500/5',
    text: 'text-emerald-300',
    button: 'bg-emerald-600',
    buttonHover: 'hover:bg-emerald-500',
    label: 'Tax execution',
    title: 'Track filing, payment, and IRD checkpoints from one case',
    description: 'Keep portal submission references, payment proofs, and office follow-up notes attached to the same tax case.',
  },
  health: {
    border: 'border-rose-500/20',
    bg: 'bg-rose-500/5',
    text: 'text-rose-300',
    button: 'bg-rose-600',
    buttonHover: 'hover:bg-rose-500',
    label: 'Health execution',
    title: 'Track the service path from one case',
    description: 'Save confirmations, references, and care steps so the service does not lose context between channels.',
  },
  utilities: {
    border: 'border-yellow-500/20',
    bg: 'bg-yellow-500/5',
    text: 'text-yellow-300',
    button: 'bg-yellow-600',
    buttonHover: 'hover:bg-yellow-500',
    label: 'Utility execution',
    title: 'Keep payment and receipt tracking attached to the case',
    description: 'Save bill references, payment confirmations, and follow-up notes so utility tasks resolve cleanly.',
  },
  business: {
    border: 'border-violet-500/20',
    bg: 'bg-violet-500/5',
    text: 'text-violet-300',
    button: 'bg-violet-600',
    buttonHover: 'hover:bg-violet-500',
    label: 'Business execution',
    title: 'Handle registration, filing, and approval checkpoints from one case',
    description: 'Keep every promoter, portal, payment, and office approval step attached to the same business workflow.',
  },
  land: {
    border: 'border-orange-500/20',
    bg: 'bg-orange-500/5',
    text: 'text-orange-300',
    button: 'bg-orange-600',
    buttonHover: 'hover:bg-orange-500',
    label: 'Land execution',
    title: 'Track land and property processing from one case',
    description: 'Save kitta references, office follow-up, payment proofs, and issuance checkpoints so property cases stay traceable.',
  },
  banking: {
    border: 'border-cyan-500/20',
    bg: 'bg-cyan-500/5',
    text: 'text-cyan-300',
    button: 'bg-cyan-600',
    buttonHover: 'hover:bg-cyan-500',
    label: 'Banking execution',
    title: 'Keep the banking workflow attached to the case',
    description: 'Track documents, compliance notes, branch visits, and approvals from one place.',
  },
  education: {
    border: 'border-indigo-500/20',
    bg: 'bg-indigo-500/5',
    text: 'text-indigo-300',
    button: 'bg-indigo-600',
    buttonHover: 'hover:bg-indigo-500',
    label: 'Education execution',
    title: 'Track enrollment and certificate processing from one case',
    description: 'Keep form submission, verification, and institution follow-up steps together.',
  },
  legal: {
    border: 'border-fuchsia-500/20',
    bg: 'bg-fuchsia-500/5',
    text: 'text-fuchsia-300',
    button: 'bg-fuchsia-600',
    buttonHover: 'hover:bg-fuchsia-500',
    label: 'Legal execution',
    title: 'Track legal and police follow-up from one case',
    description: 'Save references, complaint numbers, office notes, and status changes so legal cases keep moving.',
  },
};

export function ServiceExecutionPanel({
  serviceSlug,
  serviceTitle,
  category,
}: {
  serviceSlug: string;
  serviceTitle: string;
  category: ServiceCategory;
}) {
  const authReady = useAuth((s) => s._initialized);
  const user = useAuth((s) => s.user);
  const [task, setTask] = useState<ServiceTaskRecord | null>(null);
  const [savingActionId, setSavingActionId] = useState<string | null>(null);
  const [actionValues, setActionValues] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!authReady || !user) return;
    fetch('/api/me/service-tasks')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const match = (data?.tasks || []).find((row: ServiceTaskRecord) => row.serviceSlug === serviceSlug && row.status !== 'completed');
        setTask(match || null);
      })
      .catch(() => setTask(null));
  }, [authReady, user, serviceSlug]);

  const workflow = useMemo(() => {
    if (!task) return null;
    return {
      mode: task.workflowMode,
      nextActionReady: task.nextAction || `Continue the ${serviceTitle} workflow.`,
      milestones: task.milestones || [],
      actions: (task.actions || []) as WorkflowAction[],
    };
  }, [serviceTitle, task]);

  const accent = ACCENTS[category];

  async function completeAction(action: WorkflowAction) {
    if (!task) return;
    setSavingActionId(action.id);
    setMessage(null);
    try {
      const response = await fetch(`/api/me/service-tasks/${task.id}/actions/${action.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: actionValues[action.id] || '' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save workflow step');
      setTask(data.task || task);
      setMessage(`${action.label} saved on the case.`);
    } catch (error: any) {
      setMessage(error.message || 'Could not save workflow step');
    } finally {
      setSavingActionId(null);
    }
  }

  if (!authReady) return null;

  return (
    <div className={`rounded-2xl border p-5 mb-6 ${accent.border} ${accent.bg}`}>
      <div className={`text-xs uppercase tracking-wide font-bold mb-1 ${accent.text}`}>{accent.label}</div>
      <h3 className="text-lg font-semibold text-zinc-100">{accent.title}</h3>
      <p className="text-sm text-zinc-400 mt-1">{accent.description}</p>

      {!user ? (
        <div className="mt-4">
          <Link
            href="/login?next=/services"
            className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white ${accent.button} ${accent.buttonHover}`}
          >
            Sign in to manage this workflow
          </Link>
        </div>
      ) : !task || !workflow ? (
        <div className="mt-4 rounded-xl border border-zinc-700 bg-zinc-900/70 p-4 text-sm text-zinc-300">
          Start the {serviceTitle} workflow first, then NepalRepublic can save every checkpoint, note, and reference onto your case.
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl bg-zinc-900/70 p-4">
            <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Current path</div>
            <div className="text-sm text-zinc-100">{task.resolutionPlan?.headline || workflow.nextActionReady}</div>
            {task.serviceForm?.submitted ? (
              <div className="mt-2 text-xs text-emerald-300">
                In-app form already completed and attached to this case.
              </div>
            ) : (
              <div className="mt-2 text-xs text-zinc-500">
                You can also use the in-app form to scan documents, autofill profile details, and keep the draft attached to the same task.
              </div>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl bg-zinc-900/70 p-4">
              <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Milestones</div>
              <div className="space-y-1.5 text-sm">
                {workflow.milestones.map((milestone, idx) => {
                  // Find if any action linked to this milestone is done
                  const linkedAction = workflow.actions.find((a) => a.milestoneIndex === idx);
                  const isDone = linkedAction && task.actionState[linkedAction.id]?.completed;
                  const isCurrent = !isDone && linkedAction && idx === (task.currentStep || 1) - 1;
                  return (
                    <div
                      key={milestone}
                      className={
                        isDone
                          ? 'text-emerald-400 line-through opacity-70'
                          : isCurrent
                            ? `font-medium ${accent.text}`
                            : 'text-zinc-400'
                      }
                    >
                      {isDone ? '✓' : isCurrent ? '→' : '○'} {milestone}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="rounded-xl bg-zinc-900/70 p-4">
              <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Case status</div>
              <div className="text-sm text-zinc-200">
                {task.status.replace(/_/g, ' ')} · {task.progress}% complete
              </div>
              <div className="mt-2 text-xs text-zinc-400">
                {task.nextAction || `Continue through the ${serviceTitle} workflow.`}
              </div>
            </div>
          </div>

          {workflow.actions?.length ? (
            <div className="space-y-3">
              {workflow.actions.map((action) => {
                const done = task.actionState[action.id]?.completed;
                const hasMeta = action.estimatedFee || action.estimatedWait || action.requiredDocs?.length;
                return (
                  <div key={action.id} className={`rounded-xl border bg-zinc-900/70 p-4 ${done ? 'border-emerald-500/20 opacity-80' : 'border-zinc-700'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-zinc-100">{action.label}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-zinc-500 capitalize">{action.kind.replace('_', ' ')}</span>
                          {action.canSkip && <span className="text-[10px] text-zinc-600 border border-zinc-700 rounded px-1">optional</span>}
                          {action.aiAutoCompletable && <span className="text-[10px] text-violet-400 border border-violet-500/20 rounded px-1">AI-assisted</span>}
                        </div>
                      </div>
                      {done ? (
                        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-300">
                          Done{task.actionState[action.id]?.value ? ` · ${task.actionState[action.id]?.value}` : ''}
                        </span>
                      ) : null}
                    </div>

                    {/* Gold-standard meta: fee, wait, docs */}
                    {!done && hasMeta && (
                      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
                        {action.estimatedFee && (
                          <span title="Estimated fee">💰 {action.estimatedFee}</span>
                        )}
                        {action.estimatedWait && (
                          <span title="Estimated wait">⏱ {action.estimatedWait}</span>
                        )}
                      </div>
                    )}

                    {/* Required docs for this step */}
                    {!done && action.requiredDocs?.length ? (
                      <div className="mt-2 rounded-lg bg-zinc-950/50 px-3 py-2">
                        <div className="text-[10px] uppercase tracking-wide text-zinc-600 mb-1">Bring to this step</div>
                        <div className="flex flex-wrap gap-1.5">
                          {action.requiredDocs.map((doc) => (
                            <span key={doc} className="text-xs text-zinc-300 bg-zinc-800 rounded-md px-1.5 py-0.5">{doc}</span>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {action.href && !done && (
                      <a
                        href={action.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center justify-center rounded-xl border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
                      >
                        Open official surface ↗
                      </a>
                    )}

                    {action.completionLabel && !done && (
                      <div className="mt-3 flex flex-col gap-2 md:flex-row">
                        <input
                          value={actionValues[action.id] || ''}
                          onChange={(e) => setActionValues((current) => ({ ...current, [action.id]: e.target.value }))}
                          placeholder={action.placeholder || 'Reference / note'}
                          className="flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                        />
                        <button
                          onClick={() => completeAction(action)}
                          disabled={savingActionId === action.id}
                          className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 ${accent.button} ${accent.buttonHover}`}
                        >
                          {savingActionId === action.id ? 'Saving…' : action.completionLabel}
                        </button>
                      </div>
                    )}

                    {/* Skip button for optional steps */}
                    {action.canSkip && !done && action.completionLabel && (
                      <button
                        onClick={() => {
                          setActionValues((c) => ({ ...c, [action.id]: 'Skipped' }));
                          completeAction({ ...action });
                        }}
                        className="mt-2 text-xs text-zinc-500 hover:text-zinc-300 underline"
                      >
                        Skip this step
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}

          {message && <div className={`text-sm ${accent.text}`}>{message}</div>}
        </div>
      )}
    </div>
  );
}
