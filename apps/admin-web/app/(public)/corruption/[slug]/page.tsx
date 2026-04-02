'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  AlertTriangle,
  Users,
  DollarSign,
  FileText,
  Clock,
  Scale,
  Search,
  Newspaper,
  UserX,
  ExternalLink,
  ArrowRight,
  CheckCircle,
  HelpCircle,
  Share,
} from 'lucide-react';
import { shareOrCopy, corruptionShareText } from '@/lib/utils/share';
import { useCorruptionCase } from '@/lib/hooks/use-corruption';
import { ReactionBar } from '@/components/public/reaction-bar';
import { CorruptionComments } from '@/components/public/corruption-comments';
import {
  CORRUPTION_TYPE_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
  SEVERITY_LABELS,
  SEVERITY_COLORS,
  ENTITY_TYPE_LABELS,
  ROLE_LABELS,
  EVIDENCE_TYPE_LABELS,
  TIMELINE_EVENT_TYPE_LABELS,
  MONEY_FLOW_TYPE_LABELS,
  formatAmountNpr,
  formatNprWithUsd,
  type TimelineEvent,
  type TimelineEventType,
  type CorruptionEvidence,
  type MoneyFlow,
  type CorruptionEntity,
  type CaseEntity,
  type VerificationStatus,
  type EntityRole,
  type InvolvementStatus,
} from '@/lib/data/corruption-types';

/* ═══════════════════════════════════════════════
   CORRUPTION CASE DETAIL
   ═══════════════════════════════════════════════ */

const TIMELINE_ICONS: Partial<Record<TimelineEventType, React.ComponentType<{ className?: string }>>> = {
  allegation: AlertTriangle,
  complaint_filed: FileText,
  investigation_started: Search,
  fir_registered: FileText,
  arrested: UserX,
  charge_sheet_filed: FileText,
  trial_started: Scale,
  verdict: Scale,
  appeal: Scale,
  asset_frozen: DollarSign,
  asset_recovered: DollarSign,
  other: Clock,
};

const INVOLVEMENT_COLORS: Record<string, { bg: string; text: string }> = {
  alleged: { bg: 'bg-slate-500/15', text: 'text-slate-400' },
  charged: { bg: 'bg-orange-500/15', text: 'text-orange-400' },
  convicted: { bg: 'bg-red-500/15', text: 'text-red-400' },
  acquitted: { bg: 'bg-green-500/15', text: 'text-green-400' },
  cooperating: { bg: 'bg-cyan-500/15', text: 'text-cyan-400' },
  fugitive: { bg: 'bg-purple-500/15', text: 'text-purple-400' },
};

const VERIFICATION_ICON: Record<VerificationStatus, React.ComponentType<{ className?: string }>> = {
  confirmed: CheckCircle,
  reported: Clock,
  alleged: HelpCircle,
};

const VERIFICATION_COLOR: Record<VerificationStatus, string> = {
  confirmed: 'text-green-400',
  reported: 'text-yellow-400',
  alleged: 'text-gray-400',
};

export default function CaseDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { data, isLoading } = useCorruptionCase(slug);

  if (isLoading) {
    return (
      <section className="public-section pt-8">
        <div className="public-shell">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-white/[0.04] rounded w-32" />
            <div className="h-6 bg-white/[0.04] rounded w-48" />
            <div className="h-8 bg-white/[0.04] rounded w-96" />
            <div className="h-40 bg-white/[0.04] rounded" />
          </div>
        </div>
      </section>
    );
  }

  if (!data || !data.case) {
    return (
      <section className="public-section pt-8">
        <div className="public-shell text-center py-16">
          <p className="text-gray-500 mb-4">Case not found.</p>
          <Link href="/corruption" className="text-sm text-blue-400 hover:text-blue-300">
            Back to All Cases
          </Link>
        </div>
      </section>
    );
  }

  const caseData = data.case;
  const statusColor = STATUS_COLORS[caseData.status];
  const severityColor = caseData.severity ? SEVERITY_COLORS[caseData.severity] : null;

  return (
    <>
      {/* ── Legal Disclaimer ── */}
      <section className="public-section pt-4 pb-0">
        <div className="public-shell">
          <div className="flex items-start gap-2 rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 text-yellow-500 mt-0.5" />
            <p className="text-xs text-yellow-400/80">
              All information reflects publicly available records. &quot;Alleged&quot; means no
              conviction has occurred. Inclusion here does not imply guilt.
            </p>
          </div>
        </div>
      </section>

      {/* ── Hero ── */}
      <section className="public-section pt-6 sm:pt-8 pb-0">
        <div className="public-shell">
          <Link
            href="/corruption"
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to All Cases
          </Link>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${statusColor.bg} ${statusColor.text}`}
            >
              {STATUS_LABELS[caseData.status].en}
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-white/[0.05] text-gray-400">
              {CORRUPTION_TYPE_LABELS[caseData.corruption_type].en}
            </span>
            {severityColor && caseData.severity && (
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${severityColor.bg} ${severityColor.text}`}
              >
                {SEVERITY_LABELS[caseData.severity].en} Severity
              </span>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">{caseData.title}</h1>
          {caseData.title_ne && (
            <p className="text-sm text-gray-500 mb-3">{caseData.title_ne}</p>
          )}

          {caseData.estimated_amount_npr != null && caseData.estimated_amount_npr > 0 && (
            <div className="flex items-center gap-2 text-lg font-bold text-red-400 mb-4">
              <span>रू {formatAmountNpr(caseData.estimated_amount_npr)}</span>
              <span className="text-xs font-normal text-gray-500">(≈ {formatNprWithUsd(caseData.estimated_amount_npr).usd})</span>
              <span className="text-xs font-normal text-gray-500">(estimated)</span>
            </div>
          )}

          <div className="flex items-center gap-4 text-xs text-gray-500 mb-6">
            <span>Created: {new Date(caseData.created_at).toLocaleDateString()}</span>
            <span>Updated: {new Date(caseData.updated_at).toLocaleDateString()}</span>
            <button
              onClick={() => shareOrCopy({ title: caseData.title, text: corruptionShareText({ title: caseData.title }), url: `${window.location.origin}/corruption/${slug}` })}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-gray-300 bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1] hover:text-white transition-all"
            >
              <Share className="w-3.5 h-3.5" />
              Share
            </button>
          </div>
        </div>
      </section>

      {/* ── Summary ── */}
      {caseData.summary && (
        <section className="public-section pt-0 pb-0">
          <div className="public-shell">
            <div className="glass-card p-5 mb-4">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Summary
              </h2>
              <p className="text-sm text-gray-300 leading-relaxed">{caseData.summary}</p>
              {caseData.summary_ne && (
                <p className="text-sm text-gray-500 leading-relaxed mt-2">{caseData.summary_ne}</p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Timeline ── */}
      {data.timeline.length > 0 && (
        <section className="public-section pt-0 pb-0">
          <div className="public-shell">
            <div className="glass-card p-5 mb-4">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                <Clock className="inline h-3.5 w-3.5 mr-1.5" />
                Timeline ({data.timeline.length})
              </h2>
              <div className="relative pl-6 space-y-4">
                <div className="absolute left-2 top-1 bottom-1 w-px bg-white/[0.08]" />
                {data.timeline.map((event) => {
                  const EventIcon = TIMELINE_ICONS[event.event_type] || Clock;
                  return (
                    <div key={event.id} className="relative">
                      <div className="absolute -left-6 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-np-surface border border-white/[0.12]">
                        <EventIcon className="h-2.5 w-2.5 text-gray-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] text-gray-600 font-mono">{event.event_date}</span>
                          <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">
                            {TIMELINE_EVENT_TYPE_LABELS[event.event_type]?.en || event.event_type}
                          </span>
                        </div>
                        <h4 className="text-sm font-medium text-gray-200">{event.title}</h4>
                        {event.description && (
                          <p className="text-xs text-gray-500 mt-0.5">{event.description}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Involved Entities ── */}
      {data.entities.length > 0 && (
        <section className="public-section pt-0 pb-0">
          <div className="public-shell">
            <div className="glass-card p-5 mb-4">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                <Users className="inline h-3.5 w-3.5 mr-1.5" />
                Involved Entities ({data.entities.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.entities.map((ce) => (
                  <EntityCard key={ce.id} caseEntity={ce} entity={ce.entity} />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Money Trail ── */}
      {data.moneyFlows.length > 0 && (
        <section className="public-section pt-0 pb-0">
          <div className="public-shell">
            <div className="glass-card p-5 mb-4">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                <DollarSign className="inline h-3.5 w-3.5 mr-1.5" />
                Money Trail ({data.moneyFlows.length})
              </h2>
              <div className="space-y-3">
                {data.moneyFlows.map((flow) => (
                  <MoneyFlowRow key={flow.id} flow={flow} />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Evidence ── */}
      {data.evidence.length > 0 && (
        <section className="public-section pt-0 pb-0">
          <div className="public-shell">
            <div className="glass-card p-5 mb-4">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                <FileText className="inline h-3.5 w-3.5 mr-1.5" />
                Evidence ({data.evidence.length})
              </h2>
              <div className="space-y-2">
                {data.evidence.map((ev) => (
                  <EvidenceRow key={ev.id} evidence={ev} />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Related Commitments ── */}
      {caseData.related_commitment_ids && caseData.related_commitment_ids.length > 0 && (
        <section className="public-section pt-0 pb-0">
          <div className="public-shell">
            <div className="glass-card p-5 mb-4">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Related Government Commitments
              </h2>
              <div className="space-y-2">
                {caseData.related_commitment_ids.map((id) => (
                  <Link
                    key={id}
                    href={`/explore/first-100-days/${id}`}
                    className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm text-gray-300 hover:bg-white/[0.04] transition-colors"
                  >
                    <span>Commitment #{id}</span>
                    <ArrowRight className="ml-auto h-3.5 w-3.5 text-gray-600" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Reactions ── */}
      <section className="public-section pt-0 pb-0">
        <div className="public-shell">
          <div className="mb-4">
            <ReactionBar caseSlug={slug} />
          </div>
        </div>
      </section>

      {/* ── Comments ── */}
      <section className="public-section pt-0">
        <div className="public-shell">
          <CorruptionComments caseSlug={slug} />
        </div>
      </section>
    </>
  );
}

/* ── Entity Card ── */

function EntityCard({
  caseEntity,
  entity,
}: {
  caseEntity: CaseEntity;
  entity: CorruptionEntity;
}) {
  const invColors = caseEntity.involvement_status
    ? INVOLVEMENT_COLORS[caseEntity.involvement_status] || { bg: 'bg-white/[0.05]', text: 'text-gray-400' }
    : { bg: 'bg-white/[0.05]', text: 'text-gray-400' };
  const typeLabel = ENTITY_TYPE_LABELS[entity.entity_type]?.en || entity.entity_type;
  const roleLabel = ROLE_LABELS[caseEntity.role]?.en || caseEntity.role;

  return (
    <Link
      href={`/corruption/entities/${entity.slug}`}
      className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 hover:bg-white/[0.04] transition-colors"
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-gray-500">
        {entity.photo_url ? (
          <img src={entity.photo_url} alt={entity.name} className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <Users className="h-5 w-5" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-medium text-gray-200 truncate">{entity.name}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mb-1">
          <span className="text-[10px] text-gray-600 uppercase tracking-wider">{typeLabel}</span>
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold ${invColors.bg} ${invColors.text}`}
          >
            {roleLabel}
          </span>
          {caseEntity.involvement_status && (
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold ${invColors.bg} ${invColors.text}`}
            >
              {caseEntity.involvement_status.replace('_', ' ')}
            </span>
          )}
        </div>
        {caseEntity.description && (
          <p className="text-xs text-gray-500 line-clamp-2">{caseEntity.description}</p>
        )}
      </div>
    </Link>
  );
}

/* ── Money Flow Row ── */

function MoneyFlowRow({
  flow,
}: {
  flow: MoneyFlow & { from_entity?: CorruptionEntity; to_entity?: CorruptionEntity };
}) {
  const VIcon = VERIFICATION_ICON[flow.verification_status];
  const vColor = VERIFICATION_COLOR[flow.verification_status];
  const fromName = flow.from_entity?.name || 'Unknown';
  const toName = flow.to_entity?.name || 'Unknown';
  const flowTypeLabel = flow.flow_type ? MONEY_FLOW_TYPE_LABELS[flow.flow_type]?.en : null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-xs text-gray-300 font-medium truncate">{fromName}</span>
        <ArrowRight className="h-3 w-3 text-gray-600 flex-shrink-0" />
        <span className="text-xs text-gray-300 font-medium truncate">{toName}</span>
      </div>
      <div className="flex items-center gap-3">
        {flow.amount_npr != null && (
          <span className="text-sm font-semibold text-red-400">
            रू {formatAmountNpr(flow.amount_npr)} <span className="text-xs font-normal text-gray-500">(≈ {formatNprWithUsd(flow.amount_npr).usd})</span>
          </span>
        )}
        {flowTypeLabel && (
          <span className="text-[10px] text-gray-500">{flowTypeLabel}</span>
        )}
        {flow.purpose && (
          <span className="text-[10px] text-gray-500 truncate max-w-[120px]">{flow.purpose}</span>
        )}
        <VIcon className={`h-3.5 w-3.5 flex-shrink-0 ${vColor}`} />
      </div>
    </div>
  );
}

/* ── Evidence Row ── */

function EvidenceRow({ evidence }: { evidence: CorruptionEvidence }) {
  const reliabilityColors: Record<string, string> = {
    high: 'text-green-400 bg-green-500/15',
    medium: 'text-yellow-400 bg-yellow-500/15',
    low: 'text-red-400 bg-red-500/15',
  };
  const relColor = reliabilityColors[evidence.reliability] || 'text-gray-400 bg-white/[0.05]';

  return (
    <div className="flex items-start gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
      <FileText className="h-4 w-4 flex-shrink-0 text-gray-500 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-medium text-gray-200 truncate">
            {evidence.title || 'Untitled Evidence'}
          </span>
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold ${relColor}`}
          >
            {evidence.reliability}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-gray-500">
          <span>{EVIDENCE_TYPE_LABELS[evidence.evidence_type]?.en || evidence.evidence_type}</span>
          {evidence.source_name && (
            <>
              <span>&middot;</span>
              <span>{evidence.source_name}</span>
            </>
          )}
          {evidence.published_at && (
            <>
              <span>&middot;</span>
              <span>{new Date(evidence.published_at).toLocaleDateString()}</span>
            </>
          )}
        </div>
      </div>
      {evidence.url && (
        <a
          href={evidence.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 text-gray-600 hover:text-gray-300 transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}
