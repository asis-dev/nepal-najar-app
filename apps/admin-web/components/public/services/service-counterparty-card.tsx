'use client';

import { useEffect, useState } from 'react';

type CounterpartyRoute = {
  id: string;
  service_slug: string;
  submission_mode: string;
  response_capture_mode: string;
  office_name?: string | null;
  geography_scope?: string | null;
  is_primary: boolean;
  required_human_review: boolean;
  supports_document_exchange: boolean;
  supports_status_updates: boolean;
  supports_payment_confirmation: boolean;
  sla_target_hours?: number | null;
  escalation_policy?: string;
  auto_follow_up?: boolean;
  metadata?: { strategy?: string };
  counterparty?: {
    id: string;
    key: string;
    name: string;
    name_ne?: string;
    kind: string;
    authority_level: string;
    jurisdiction_scope?: string;
    adoption_stage: string;
  };
};

const MODE_LABELS: Record<string, string> = {
  direct_api: 'Direct API',
  portal_assisted: 'Portal-assisted',
  department_inbox: 'Department inbox',
  human_bridge: 'Human bridge',
  document_exchange: 'Document exchange',
  manual: 'Manual',
};

const STAGE_COLORS: Record<string, string> = {
  active: 'text-emerald-400 border-emerald-500/20',
  pilot: 'text-blue-400 border-blue-500/20',
  outreach: 'text-amber-400 border-amber-500/20',
  identified: 'text-zinc-400 border-zinc-500/20',
  blocked: 'text-red-400 border-red-500/20',
};

export function ServiceCounterpartyCard({ serviceSlug }: { serviceSlug: string }) {
  const [route, setRoute] = useState<CounterpartyRoute | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/services/${serviceSlug}/counterparty`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setRoute(data?.primary || null))
      .catch(() => setRoute(null))
      .finally(() => setLoading(false));
  }, [serviceSlug]);

  if (loading || !route?.counterparty) return null;

  const cp = route.counterparty;
  const stageColor = STAGE_COLORS[cp.adoption_stage] || STAGE_COLORS.identified;

  return (
    <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5 mb-6">
      <div className="text-xs uppercase tracking-wide font-bold mb-1 text-violet-300">
        Government integration
      </div>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-zinc-100">{cp.name}</h3>
          {cp.name_ne && <div className="text-sm text-zinc-400">{cp.name_ne}</div>}
        </div>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${stageColor}`}>
          {cp.adoption_stage}
        </span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl bg-zinc-900/70 p-3">
          <div className="text-[10px] uppercase tracking-wide text-zinc-600 mb-1">How we send</div>
          <div className="text-sm text-zinc-200">{MODE_LABELS[route.submission_mode] || route.submission_mode}</div>
        </div>
        <div className="rounded-xl bg-zinc-900/70 p-3">
          <div className="text-[10px] uppercase tracking-wide text-zinc-600 mb-1">How they respond</div>
          <div className="text-sm text-zinc-200">{MODE_LABELS[route.response_capture_mode] || route.response_capture_mode}</div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {route.supports_status_updates && (
          <span className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300">
            Status sync
          </span>
        )}
        {route.supports_payment_confirmation && (
          <span className="rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] text-amber-300">
            Payment confirmation
          </span>
        )}
        {route.supports_document_exchange && (
          <span className="rounded-md bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[10px] text-blue-300">
            Document exchange
          </span>
        )}
        {route.required_human_review && (
          <span className="rounded-md bg-zinc-500/10 border border-zinc-500/20 px-2 py-0.5 text-[10px] text-zinc-300">
            Human review required
          </span>
        )}
        {route.auto_follow_up && (
          <span className="rounded-md bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 text-[10px] text-violet-300">
            Auto follow-up
          </span>
        )}
      </div>

      {route.sla_target_hours && (
        <div className="mt-3 text-xs text-zinc-400">
          SLA target: {route.sla_target_hours < 24 ? `${route.sla_target_hours}h` : `${Math.round(route.sla_target_hours / 24)} days`}
          {route.escalation_policy && route.escalation_policy !== 'none' && (
            <span className="ml-2 text-amber-400">
              Escalation: {route.escalation_policy.replace(/_/g, ' ')}
            </span>
          )}
        </div>
      )}

      {route.metadata?.strategy && (
        <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 text-xs text-zinc-400">
          {route.metadata.strategy}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-zinc-500">
        <span>{cp.kind.replace(/_/g, ' ')}</span>
        <span>{cp.authority_level}</span>
        {cp.jurisdiction_scope && <span>{cp.jurisdiction_scope}</span>}
        {route.office_name && <span>{route.office_name}</span>}
      </div>
    </div>
  );
}
