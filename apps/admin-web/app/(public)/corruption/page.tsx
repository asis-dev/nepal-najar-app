'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Shield,
  Search,
  SlidersHorizontal,
  AlertTriangle,
  Users,
  FileText,
  Clock,
  Scale,
} from 'lucide-react';
import { PublicPageHero } from '@/components/public/page-hero';
import { useCorruptionCases, useCorruptionStats } from '@/lib/hooks/use-corruption';
import {
  CORRUPTION_TYPE_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
  SEVERITY_LABELS,
  SEVERITY_COLORS,
  TIMELINE_EVENT_TYPE_LABELS,
  formatAmountNpr,
  formatNprWithUsd,
  type CorruptionType,
  type CaseStatus,
  type Severity,
  type CorruptionCase,
} from '@/lib/data/corruption-types';

/* ═══════════════════════════════════════════════
   CORRUPTION TRACKER — Dashboard
   ═══════════════════════════════════════════════ */

export default function CorruptionPage() {
  const [typeFilter, setTypeFilter] = useState<CorruptionType | ''>('');
  const [statusFilter, setStatusFilter] = useState<CaseStatus | ''>('');
  const [severityFilter, setSeverityFilter] = useState<Severity | ''>('');
  const [search, setSearch] = useState('');

  const { data: stats, isLoading: statsLoading } = useCorruptionStats();
  const { data: casesResult, isLoading: casesLoading } = useCorruptionCases({
    corruption_type: typeFilter || undefined,
    status: statusFilter || undefined,
    severity: severityFilter || undefined,
    search: search || undefined,
    pageSize: 50,
  });

  const cases = casesResult?.cases ?? [];
  const isLoading = casesLoading;

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

      <PublicPageHero
        eyebrow={
          <span className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            Corruption Tracker
          </span>
        }
        title="Corruption Tracker"
        description="Tracking corruption cases, investigations, and accountability across Nepal's government"
      />

      {/* ── Summary Stats Banner ── */}
      <section className="public-section pt-0 pb-2">
        <div className="public-shell">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-center">
              <FileText className="mx-auto h-5 w-5 text-gray-500 mb-1" />
              <div className="text-2xl font-bold text-white">
                {statsLoading ? '...' : stats?.totalCases ?? 0}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500">Cases Tracked</div>
            </div>
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center">
              <span className="mx-auto block text-lg text-red-400 mb-1 font-bold">रू</span>
              <div className="text-2xl font-bold text-red-400">
                {statsLoading ? '...' : formatAmountNpr(stats?.totalAmountNpr ?? 0)}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-red-400/60">
                {statsLoading ? '' : `≈ ${formatNprWithUsd(stats?.totalAmountNpr ?? 0).usd}`}
              </div>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-center">
              <Search className="mx-auto h-5 w-5 text-amber-400 mb-1" />
              <div className="text-2xl font-bold text-amber-400">
                {statsLoading ? '...' : stats?.activeInvestigations ?? 0}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-amber-400/60">Active Investigations</div>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-center">
              <Scale className="mx-auto h-5 w-5 text-gray-500 mb-1" />
              <div className="text-2xl font-bold text-white">
                {statsLoading ? '...' : `${stats?.convictionRate ?? 0}%`}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500">Conviction Rate</div>
            </div>
          </div>
        </div>
      </section>

      <section className="public-section">
        <div className="public-shell">
          {/* ── Filter Bar ── */}
          <div className="flex flex-col gap-3 mb-6">
            <div className="flex flex-wrap gap-2">
              {/* Type dropdown */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as CorruptionType | '')}
                className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-white/[0.12] appearance-none cursor-pointer"
              >
                <option value="">All Types</option>
                {(Object.keys(CORRUPTION_TYPE_LABELS) as CorruptionType[]).map((t) => (
                  <option key={t} value={t}>
                    {CORRUPTION_TYPE_LABELS[t].en}
                  </option>
                ))}
              </select>

              {/* Status dropdown */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as CaseStatus | '')}
                className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-white/[0.12] appearance-none cursor-pointer"
              >
                <option value="">All Statuses</option>
                {(Object.keys(STATUS_LABELS) as CaseStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s].en}
                  </option>
                ))}
              </select>

              {/* Severity dropdown */}
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value as Severity | '')}
                className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-white/[0.12] appearance-none cursor-pointer"
              >
                <option value="">All Severity</option>
                {(Object.keys(SEVERITY_LABELS) as Severity[]).map((s) => (
                  <option key={s} value={s}>
                    {SEVERITY_LABELS[s].en}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search cases, entities, tags..."
                className="w-full pl-10 pr-4 py-2 rounded-lg text-sm bg-white/[0.03] border border-white/[0.06] text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-white/[0.12]"
              />
            </div>
          </div>

          {/* ── Entities link ── */}
          <div className="mb-4">
            <Link
              href="/corruption/entities"
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-xs font-medium text-gray-400 transition-colors hover:bg-white/[0.06] hover:text-gray-200"
            >
              <Users className="h-3.5 w-3.5" />
              View All Entities &amp; Persons of Interest
            </Link>
          </div>

          {/* ── Loading ── */}
          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="glass-card p-4 animate-pulse">
                  <div className="flex gap-1.5 mb-2">
                    <div className="h-4 bg-white/[0.04] rounded w-20" />
                    <div className="h-4 bg-white/[0.04] rounded w-16" />
                  </div>
                  <div className="h-5 bg-white/[0.04] rounded w-3/4 mb-2" />
                  <div className="h-4 bg-white/[0.04] rounded w-24 mb-2" />
                  <div className="h-3 bg-white/[0.04] rounded w-1/2" />
                </div>
              ))}
            </div>
          )}

          {/* ── Case Cards Grid ── */}
          {!isLoading && cases.length === 0 && (
            <div className="text-center py-12 text-gray-500 text-sm">
              No cases match your filters.
            </div>
          )}

          {!isLoading && cases.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {cases.map((c) => (
                <CaseCard key={c.slug} caseData={c} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

/* ── Case Card ── */

function CaseCard({ caseData }: { caseData: CorruptionCase }) {
  const statusColor = STATUS_COLORS[caseData.status];
  const severityColor = caseData.severity ? SEVERITY_COLORS[caseData.severity] : null;

  return (
    <Link
      href={`/corruption/${caseData.slug}`}
      className="glass-card p-4 transition-colors hover:bg-white/[0.04] block"
    >
      {/* Badges row */}
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ${statusColor.bg} ${statusColor.text}`}
        >
          {STATUS_LABELS[caseData.status].en}
        </span>
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-white/[0.05] text-gray-400">
          {CORRUPTION_TYPE_LABELS[caseData.corruption_type].en}
        </span>
        {severityColor && caseData.severity && (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium ${severityColor.bg} ${severityColor.text}`}
          >
            {SEVERITY_LABELS[caseData.severity].en}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-white mb-1 line-clamp-2">{caseData.title}</h3>

      {/* Amount */}
      {caseData.estimated_amount_npr != null && caseData.estimated_amount_npr > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-red-400 font-medium mb-2">
          <span>रू {formatAmountNpr(caseData.estimated_amount_npr)}</span>
          <span className="text-[10px] text-gray-500">(≈ {formatNprWithUsd(caseData.estimated_amount_npr).usd})</span>
        </div>
      )}

      {/* Summary snippet */}
      {caseData.summary && (
        <p className="text-[11px] text-gray-500 line-clamp-2 mb-2">{caseData.summary}</p>
      )}

      {/* Updated date */}
      <div className="flex items-center gap-1.5 text-[10px] text-gray-600 border-t border-white/[0.06] pt-2">
        <Clock className="h-3 w-3" />
        <span>Updated {new Date(caseData.updated_at).toLocaleDateString()}</span>
      </div>
    </Link>
  );
}

/* ── Stat Box ── */

function StatBox({
  label,
  value,
  icon: Icon,
  highlight,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
}) {
  return (
    <div
      className={`px-3 py-2 rounded-lg border ${
        highlight
          ? 'bg-red-500/5 border-red-500/15'
          : 'bg-white/[0.02] border-white/[0.06]'
      }`}
    >
      <div className="flex items-center gap-1 mb-0.5">
        <Icon className="h-3 w-3 text-gray-600" />
        <span className="text-[10px] text-gray-600 uppercase tracking-wider">{label}</span>
      </div>
      <div
        className={`text-sm font-semibold ${highlight ? 'text-red-400' : 'text-gray-200'} truncate max-w-[160px]`}
      >
        {value}
      </div>
    </div>
  );
}
