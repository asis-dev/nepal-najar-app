'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bot, Loader2, Plus, Sparkles, Workflow } from 'lucide-react';
import { AI_RUN_STATUS_LABELS, AI_TRIGGER_LABELS } from '@/lib/service-ops/ai-types';

type Department = {
  key: string;
  name: string;
};

type Playbook = {
  id: string;
  department_key: string;
  service_slug?: string | null;
  playbook_key: string;
  name: string;
  description?: string | null;
  ai_role: string;
  trigger_mode: keyof typeof AI_TRIGGER_LABELS;
  priority: number;
  objective?: string | null;
  requires_human_approval: boolean;
  can_contact_citizen: boolean;
  can_contact_provider: boolean;
};

type Summary = {
  active_playbooks: number;
  automatic_playbooks: number;
  suggested_playbooks: number;
  queued_runs: number;
  running_runs: number;
  completed_runs: number;
  blocked_runs: number;
};

type AIRun = {
  id: string;
  task_id: string;
  status: string;
  summary?: string | null;
  created_at: string;
  completed_at?: string | null;
  playbook?: {
    id: string;
    name: string;
    department_key: string;
  } | null;
};

const TRIGGER_OPTIONS = Object.entries(AI_TRIGGER_LABELS);

export default function ServiceOpsAIPage() {
  const queryClient = useQueryClient();
  const [departmentKey, setDepartmentKey] = useState('all');
  const [playbookKey, setPlaybookKey] = useState('');
  const [name, setName] = useState('');
  const [serviceSlug, setServiceSlug] = useState('');
  const [objective, setObjective] = useState('');
  const [triggerMode, setTriggerMode] = useState<keyof typeof AI_TRIGGER_LABELS>('suggested');
  const [workerFeedback, setWorkerFeedback] = useState<string | null>(null);

  const { data: departmentsData } = useQuery<{ departments: Department[] }>({
    queryKey: ['service-ops-departments'],
    queryFn: async () => {
      const res = await fetch('/api/ops/service-tasks/departments');
      if (!res.ok) throw new Error('Failed to load departments');
      return res.json();
    },
  });

  const departments = departmentsData?.departments || [];
  const effectiveDepartmentKey = departmentKey !== 'all' ? departmentKey : departments[0]?.key || '';

  const { data, isLoading } = useQuery<{ playbooks: Playbook[]; summary: Summary; recent_runs: AIRun[] }>({
    queryKey: ['service-ops-ai-playbooks', departmentKey],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (departmentKey !== 'all') params.set('department_key', departmentKey);
      const res = await fetch(`/api/ops/ai/playbooks?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load AI playbooks');
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/ops/ai/playbooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department_key: effectiveDepartmentKey,
          playbook_key: playbookKey,
          name,
          service_slug: serviceSlug || undefined,
          objective: objective || undefined,
          trigger_mode: triggerMode,
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(payload.error || 'Failed to create AI playbook');
      }
      return res.json();
    },
    onSuccess: () => {
      setPlaybookKey('');
      setName('');
      setServiceSlug('');
      setObjective('');
      setTriggerMode('suggested');
      queryClient.invalidateQueries({ queryKey: ['service-ops-ai-playbooks'] });
    },
  });

  const workerMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/ops/ai/worker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 10 }),
      });
      const payload = await res.json().catch(() => ({ error: 'Worker request failed' }));
      if (!res.ok) throw new Error(payload.error || 'Failed to process queued runs');
      return payload;
    },
    onSuccess: (payload) => {
      setWorkerFeedback(
        `Scanned ${payload.scanned} queued runs. Completed ${payload.completed}, failed ${payload.failed}, blocked ${payload.blocked}.`,
      );
      queryClient.invalidateQueries({ queryKey: ['service-ops-ai-playbooks'] });
    },
  });

  const playbooks = data?.playbooks || [];
  const summary = data?.summary;
  const recentRuns = data?.recent_runs || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="section-title flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-cyan-400" />
          </div>
          Service Ops AI
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Define where AI can triage, summarize, check documents, draft follow-ups, and move cases faster without skipping human controls.
        </p>
      </div>

      {summary ? (
        <div className="grid gap-3 md:grid-cols-4">
          <MetricCard label="Playbooks" value={summary.active_playbooks} icon={<Sparkles className="w-4 h-4 text-cyan-400" />} />
          <MetricCard label="Automatic" value={summary.automatic_playbooks} icon={<Workflow className="w-4 h-4 text-emerald-400" />} />
          <MetricCard label="Queued Runs" value={summary.queued_runs} icon={<Bot className="w-4 h-4 text-amber-400" />} />
          <MetricCard label="Completed Runs" value={summary.completed_runs} icon={<Sparkles className="w-4 h-4 text-violet-400" />} />
        </div>
      ) : null}

      <div className="glass-card p-4 flex flex-wrap gap-3">
        <select className="input w-auto text-sm" value={departmentKey} onChange={(e) => setDepartmentKey(e.target.value)}>
          <option value="all">All departments</option>
          {departments.map((department) => (
            <option key={department.key} value={department.key}>{department.name}</option>
          ))}
        </select>
        <button
          onClick={() => workerMutation.mutate()}
          disabled={workerMutation.isPending}
          className="btn-primary inline-flex items-center gap-2"
        >
          {workerMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
          Process queued runs
        </button>
        {workerFeedback ? <div className="text-xs text-cyan-200/90">{workerFeedback}</div> : null}
        {workerMutation.error ? <div className="text-xs text-red-400">{(workerMutation.error as Error).message}</div> : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="glass-card p-5 space-y-4">
          <h2 className="text-base font-semibold text-white">Add AI playbook</h2>
          <input className="input text-sm" value={playbookKey} onChange={(e) => setPlaybookKey(e.target.value)} placeholder="Playbook key, e.g. document-triage" />
          <input className="input text-sm" value={name} onChange={(e) => setName(e.target.value)} placeholder="Playbook name" />
          <input className="input text-sm" value={serviceSlug} onChange={(e) => setServiceSlug(e.target.value)} placeholder="Optional service slug" />
          <select className="input text-sm" value={triggerMode} onChange={(e) => setTriggerMode(e.target.value as keyof typeof AI_TRIGGER_LABELS)}>
            {TRIGGER_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <textarea className="input min-h-28 text-sm" value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="What should this AI do, and what should it never do alone?" />

          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !effectiveDepartmentKey || !playbookKey.trim() || !name.trim()}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Save playbook
          </button>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="border-b border-white/[0.06] px-5 py-4">
            <h2 className="text-base font-semibold text-white">Active playbooks</h2>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-gray-400"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>
          ) : playbooks.length === 0 ? (
            <div className="p-8 text-sm text-gray-400">No AI playbooks configured yet.</div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {playbooks.map((playbook) => (
                <div key={playbook.id} className="px-5 py-4 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold text-white">{playbook.name}</div>
                        <span className="rounded-full border border-cyan-500/20 px-2 py-0.5 text-[10px] font-medium text-cyan-300">
                          {AI_TRIGGER_LABELS[playbook.trigger_mode]}
                        </span>
                        {playbook.requires_human_approval ? (
                          <span className="rounded-full border border-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                            human approval
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {playbook.department_key}
                        {playbook.service_slug ? ` · ${playbook.service_slug}` : ' · all services in department'}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">{playbook.ai_role}</div>
                  </div>

                  {playbook.objective ? (
                    <div className="rounded-xl bg-white/[0.03] p-3 text-sm text-gray-300">
                      {playbook.objective}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="border-b border-white/[0.06] px-5 py-4">
          <h2 className="text-base font-semibold text-white">Recent AI runs</h2>
        </div>
        {recentRuns.length === 0 ? (
          <div className="p-8 text-sm text-gray-400">No AI run history yet.</div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {recentRuns.map((run) => (
              <div key={run.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-white">{run.playbook?.name || 'AI run'}</div>
                    <div className="mt-1 text-xs text-gray-500">
                      {run.playbook?.department_key || 'unknown department'} · task {run.task_id.slice(0, 8)}
                    </div>
                  </div>
                  <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-medium text-gray-300">
                    {AI_RUN_STATUS_LABELS[run.status as keyof typeof AI_RUN_STATUS_LABELS] || run.status}
                  </span>
                </div>
                {run.summary ? (
                  <div className="mt-2 rounded-xl bg-white/[0.03] p-3 text-sm text-gray-300">
                    {run.summary}
                  </div>
                ) : null}
                <div className="mt-2 text-[11px] text-gray-500">
                  Created {new Date(run.created_at).toLocaleString()}
                  {run.completed_at ? ` · Completed ${new Date(run.completed_at).toLocaleString()}` : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
          <div className="mt-1 text-2xl font-semibold text-white">{value}</div>
        </div>
        <div>{icon}</div>
      </div>
    </div>
  );
}
