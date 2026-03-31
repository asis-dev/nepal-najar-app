'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Users,
  FileText,
  Shield,
  Clock,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';
import { useCorruptionEntity } from '@/lib/hooks/use-corruption';
import {
  ENTITY_TYPE_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
  ROLE_LABELS,
  RELATIONSHIP_TYPE_LABELS,
  CORRUPTION_TYPE_LABELS,
  formatAmountNpr,
  formatNprWithUsd,
} from '@/lib/data/corruption-types';

/* ═══════════════════════════════════════════════
   ENTITY DOSSIER PAGE
   ═══════════════════════════════════════════════ */

export default function EntityDossierPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { data: dossier, isLoading } = useCorruptionEntity(slug);

  if (isLoading) {
    return (
      <section className="public-section pt-8">
        <div className="public-shell">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-white/[0.04] rounded w-32" />
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 bg-white/[0.04] rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-6 bg-white/[0.04] rounded w-48" />
                <div className="h-4 bg-white/[0.04] rounded w-32" />
              </div>
            </div>
            <div className="h-40 bg-white/[0.04] rounded" />
          </div>
        </div>
      </section>
    );
  }

  if (!dossier) {
    return (
      <section className="public-section pt-8">
        <div className="public-shell text-center py-16">
          <p className="text-gray-500 mb-4">Entity not found.</p>
          <Link href="/corruption/entities" className="text-sm text-blue-400 hover:text-blue-300">
            Back to Entities
          </Link>
        </div>
      </section>
    );
  }

  const { entity, cases, relationships, totalAmountNpr } = dossier;
  const typeLabel = ENTITY_TYPE_LABELS[entity.entity_type]?.en || entity.entity_type;

  return (
    <>
      {/* ── Header ── */}
      <section className="public-section pt-6 sm:pt-8 pb-0">
        <div className="public-shell">
          <Link
            href="/corruption/entities"
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Entities
          </Link>

          <div className="flex items-start gap-4 mb-6">
            {/* Avatar */}
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-gray-500">
              {entity.photo_url ? (
                <img
                  src={entity.photo_url}
                  alt={entity.name}
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <Users className="h-8 w-8" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-white mb-0.5">{entity.name}</h1>
              {entity.name_ne && (
                <p className="text-sm text-gray-500 mb-1">{entity.name_ne}</p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] text-gray-600 uppercase tracking-wider">{typeLabel}</span>
                {entity.title && (
                  <span className="text-xs text-gray-400">{entity.title}</span>
                )}
                {entity.party_affiliation && (
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Shield className="h-3 w-3" />
                    {entity.party_affiliation}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="px-3 py-2 rounded-lg border border-white/[0.06] bg-white/[0.02]">
              <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-0.5">Cases</div>
              <div className="text-sm font-semibold text-gray-200">{entity.total_cases}</div>
            </div>
            <div className="px-3 py-2 rounded-lg border border-red-500/15 bg-red-500/5">
              <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-0.5">Total Amount</div>
              <div className="text-sm font-semibold text-red-400">
                रू {formatAmountNpr(totalAmountNpr)} <span className="text-xs font-normal text-gray-500">(≈ {formatNprWithUsd(totalAmountNpr).usd})</span>
              </div>
            </div>
            {relationships.length > 0 && (
              <div className="px-3 py-2 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-0.5">Connections</div>
                <div className="text-sm font-semibold text-gray-200">{relationships.length}</div>
              </div>
            )}
          </div>

          {/* Bio */}
          {entity.bio && (
            <div className="glass-card p-4 mb-4">
              <p className="text-sm text-gray-300 leading-relaxed">{entity.bio}</p>
            </div>
          )}
        </div>
      </section>

      {/* ── Cases ── */}
      {cases.length > 0 && (
        <section className="public-section pt-0 pb-0">
          <div className="public-shell">
            <div className="glass-card p-5 mb-4">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                <FileText className="inline h-3.5 w-3.5 mr-1.5" />
                Involvement in Cases ({cases.length})
              </h2>
              <div className="space-y-3">
                {cases.map((entry) => {
                  const statusColor = STATUS_COLORS[entry.case.status];
                  const roleLabel = ROLE_LABELS[entry.role]?.en || entry.role;

                  return (
                    <Link
                      key={entry.case.id}
                      href={`/corruption/${entry.case.slug}`}
                      className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3 hover:bg-white/[0.04] transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-200 truncate">{entry.case.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold ${statusColor.bg} ${statusColor.text}`}
                          >
                            {STATUS_LABELS[entry.case.status].en}
                          </span>
                          <span className="text-[10px] text-gray-500">
                            {CORRUPTION_TYPE_LABELS[entry.case.corruption_type].en}
                          </span>
                          <span className="text-[10px] text-gray-600">
                            Role: {roleLabel}
                          </span>
                          {entry.involvement_status && (
                            <span className="text-[10px] text-gray-600">
                              ({entry.involvement_status.replace('_', ' ')})
                            </span>
                          )}
                        </div>
                      </div>
                      {entry.case.estimated_amount_npr != null && entry.case.estimated_amount_npr > 0 && (
                        <div className="flex items-center gap-1 text-xs text-red-400 font-medium">
                          रू {formatAmountNpr(entry.case.estimated_amount_npr)} <span className="text-gray-500 font-normal">(≈ {formatNprWithUsd(entry.case.estimated_amount_npr).usd})</span>
                        </div>
                      )}
                      <ArrowRight className="h-3.5 w-3.5 text-gray-600 flex-shrink-0 hidden sm:block" />
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Relationships ── */}
      {relationships.length > 0 && (
        <section className="public-section pt-0">
          <div className="public-shell">
            <div className="glass-card p-5">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                <Users className="inline h-3.5 w-3.5 mr-1.5" />
                Connections ({relationships.length})
              </h2>
              <div className="space-y-2">
                {relationships.map((rel) => {
                  const relLabel = RELATIONSHIP_TYPE_LABELS[rel.relationship.relationship_type]?.en
                    || rel.relationship.relationship_type.replace(/_/g, ' ');
                  const otherTypeLabel = ENTITY_TYPE_LABELS[rel.otherEntity.entity_type]?.en || '';

                  return (
                    <Link
                      key={rel.relationship.id}
                      href={`/corruption/entities/${rel.otherEntity.slug}`}
                      className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3 hover:bg-white/[0.04] transition-colors"
                    >
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-gray-500">
                        <Users className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-200 truncate block">
                          {rel.otherEntity.name}
                        </span>
                        <span className="text-[10px] text-gray-500">{otherTypeLabel}</span>
                      </div>
                      <span className="text-xs text-gray-400 bg-white/[0.05] px-2 py-0.5 rounded">
                        {relLabel}
                      </span>
                      {rel.relationship.strength && (
                        <span className="text-[10px] text-gray-600">
                          {rel.relationship.strength}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
