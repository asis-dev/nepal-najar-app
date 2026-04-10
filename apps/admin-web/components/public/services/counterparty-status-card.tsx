import { resolveServiceCounterpartyRoute } from '@/lib/service-ops/counterparty-routing';

const MODE_LABELS: Record<string, string> = {
  direct_api: 'Direct API',
  portal_assisted: 'Portal-assisted',
  department_inbox: 'Department inbox',
  human_bridge: 'Human bridge',
  document_exchange: 'Document exchange',
  manual: 'Manual',
};

export async function CounterpartyStatusCard({ serviceSlug }: { serviceSlug: string }) {
  const route = await resolveServiceCounterpartyRoute(serviceSlug);
  if (!route?.counterparty) return null;

  return (
    <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-5 mb-6">
      <div className="text-xs font-bold uppercase tracking-wide text-sky-300 mb-2">Government / provider path</div>
      <div className="text-sm font-semibold text-white">{route.counterparty.name}</div>
      <div className="mt-1 text-sm text-zinc-300">
        Submission: {MODE_LABELS[route.submission_mode] || route.submission_mode}
        {' · '}
        Response: {MODE_LABELS[route.response_capture_mode] || route.response_capture_mode}
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl bg-zinc-900/60 p-3">
          <div className="text-[11px] uppercase tracking-wide text-zinc-500 mb-1">How this moves</div>
          <div className="text-sm text-zinc-200">
            {route.metadata?.strategy || 'This service is mapped to a counterparty route so the case can move through the right authority and stay traceable.'}
          </div>
        </div>
        <div className="rounded-xl bg-zinc-900/60 p-3">
          <div className="text-[11px] uppercase tracking-wide text-zinc-500 mb-1">Capabilities</div>
          <div className="flex flex-wrap gap-2">
            {route.supports_document_exchange ? <span className="rounded-full border border-sky-500/20 px-2 py-1 text-[11px] text-sky-200">document exchange</span> : null}
            {route.supports_status_updates ? <span className="rounded-full border border-emerald-500/20 px-2 py-1 text-[11px] text-emerald-200">status updates</span> : null}
            {route.supports_payment_confirmation ? <span className="rounded-full border border-amber-500/20 px-2 py-1 text-[11px] text-amber-200">payment confirmation</span> : null}
            {route.required_human_review ? <span className="rounded-full border border-fuchsia-500/20 px-2 py-1 text-[11px] text-fuchsia-200">human review</span> : null}
            {route.auto_follow_up ? <span className="rounded-full border border-violet-500/20 px-2 py-1 text-[11px] text-violet-200">auto follow-up</span> : null}
          </div>
        </div>
      </div>
      {route.sla_target_hours ? (
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-zinc-400">
          <span>SLA target: {route.sla_target_hours < 24 ? `${route.sla_target_hours}h` : `${Math.round(route.sla_target_hours / 24)} days`}</span>
          {route.escalation_policy && route.escalation_policy !== 'none' && (
            <span className="text-amber-400">Escalation: {route.escalation_policy.replace(/_/g, ' ')}</span>
          )}
          {route.auto_follow_up && route.follow_up_interval_hours && (
            <span className="text-violet-400">Follow-up every {route.follow_up_interval_hours}h</span>
          )}
        </div>
      ) : null}
    </div>
  );
}
