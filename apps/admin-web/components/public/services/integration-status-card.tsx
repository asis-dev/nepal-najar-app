import { resolveServiceIntegration } from '@/lib/services/integration-registry';

const MODE_LABELS: Record<string, string> = {
  direct: 'Direct',
  assisted: 'Assisted',
  linked: 'Linked',
  planned: 'Planned',
};

export async function IntegrationStatusCard({
  serviceSlug,
  departmentKey,
}: {
  serviceSlug: string;
  departmentKey?: string | null;
}) {
  const integration = await resolveServiceIntegration(serviceSlug, departmentKey);
  if (!integration) return null;

  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 mb-6">
      <div className="text-xs font-bold uppercase tracking-wide text-emerald-300 mb-2">Integration reality</div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-sm font-semibold text-white">{integration.provider}</div>
        <span className="rounded-full border border-emerald-500/20 px-2 py-1 text-[11px] text-emerald-200">
          {MODE_LABELS[integration.mode] || integration.mode}
        </span>
      </div>
      <div className="mt-2 text-sm text-zinc-200">{integration.currentState}</div>
      {integration.channels.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {integration.channels.map((channel) => (
            <span key={channel} className="rounded-full border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300">
              {channel.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      ) : null}
      {integration.blockers.length > 0 ? (
        <div className="mt-3 space-y-1">
          {integration.blockers.slice(0, 3).map((blocker) => (
            <div key={blocker} className="text-xs text-amber-200">{blocker}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
