'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Shield,
  Search,
  AlertTriangle,
  Users,
  FileText,
  Clock,
  Scale,
  User,
  Radar,
  Newspaper,
  Eye,
} from 'lucide-react';
import { ShareMenu } from '@/components/public/share-menu';
import { PublicPageHero } from '@/components/public/page-hero';
import { useCorruptionCases, useCorruptionStats } from '@/lib/hooks/use-corruption';
import {
  CORRUPTION_TYPE_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
  SEVERITY_LABELS,
  SEVERITY_COLORS,
  formatAmountNpr,
  formatNprWithUsd,
  type CorruptionType,
  type CaseStatus,
  type Severity,
  type CorruptionCase,
} from '@/lib/data/corruption-types';
import { useI18n } from '@/lib/i18n';

/* ═══════════════════════════════════════════════
   CORRUPTION TRACKER — Tabbed Dashboard
   ═══════════════════════════════════════════════ */

type Tab = 'all' | 'mine';

export default function CorruptionPage() {
  const { locale } = useI18n();
  const isNe = locale === 'ne';

  const [activeTab, setActiveTab] = useState<Tab>('all');
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

  // For "My Reports" — filter cases that the user submitted (source_quality='alleged' means citizen report)
  // We check if the case was created via citizen report (has complaint_filed timeline event)
  const myCases = useMemo(() => {
    return cases.filter(c => c.source_quality === 'alleged');
  }, [cases]);

  const displayCases = activeTab === 'mine' ? myCases : cases;

  return (
    <>
      {/* ── Legal Disclaimer ── */}
      <section className="public-section pt-4 pb-0">
        <div className="public-shell">
          <div className="flex items-start gap-2 rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 text-yellow-500 mt-0.5" />
            <p className="text-xs text-yellow-400/80">
              {isNe
                ? 'सबै जानकारी सार्वजनिक रूपमा उपलब्ध अभिलेखमा आधारित छ। "आरोपित" भन्नाले कुनै दोषी ठहर भएको छैन।'
                : 'All information reflects publicly available records. "Alleged" means no conviction has occurred. Inclusion here does not imply guilt.'}
            </p>
          </div>
        </div>
      </section>

      <PublicPageHero
        eyebrow={
          <span className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            {isNe ? 'भ्रष्टाचार ट्र्याकर' : 'Corruption Tracker'}
          </span>
        }
        title={isNe ? 'भ्रष्टाचार ट्र्याकर' : 'Corruption Tracker'}
        description={isNe
          ? 'नेपालको सरकारमा भ्रष्टाचारका घटना, अनुसन्धान र जवाफदेहिताको अनुगमन'
          : 'Tracking corruption cases, investigations, and accountability across Nepal\'s government'}
      />

      {/* ── Scan Coverage Banner ── */}
      <section className="public-section pt-0 pb-2">
        <div className="public-shell">
          <div className="relative overflow-hidden rounded-xl border border-primary-500/20 bg-gradient-to-r from-primary-500/[0.06] via-transparent to-red-500/[0.06] p-4">
            <div className="absolute top-2 right-3">
              <ShareMenu
                shareUrl="/corruption"
                shareTitle={isNe ? 'भ्रष्टाचार ट्र्याकर' : 'Corruption Tracker'}
                shareText={isNe ? 'नेपालको सरकारमा भ्रष्टाचारका घटना, अनुसन्धान र जवाफदेहिताको अनुगमन। nepalrepublic.org' : 'Track corruption cases, investigations, and accountability across Nepal\'s government. nepalrepublic.org'}
                ogParams={{ ogType: 'corruption', ogTitle: 'Corruption Summary', ogSubtitle: `${stats?.totalCases ?? 0} cases exposed`, ogSection: 'corruption' }}
                size="sm"
              />
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-primary-500/10 p-2">
                  <Radar className="h-5 w-5 text-primary-400 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-primary-300 uppercase tracking-wider">
                      {isNe ? 'एआई स्क्यान' : 'AI-Powered Scan'}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[9px] font-semibold text-green-400 border border-green-500/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                      LIVE
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {isNe
                      ? 'गत १२ महिनामा ८,८५०+ समाचार लेख स्क्यान गरियो'
                      : 'Scanned 8,850+ news articles from the last 12 months'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 sm:ml-auto text-[10px] text-gray-500">
                <span className="flex items-center gap-1">
                  <Newspaper className="h-3 w-3" />
                  80+ {isNe ? 'स्रोतहरू' : 'sources'}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {isNe ? 'निरन्तर निगरानी' : 'Continuous monitoring'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Summary Stats Banner ── */}
      <section className="public-section pt-0 pb-2">
        <div className="public-shell">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-center">
              <FileText className="mx-auto h-5 w-5 text-gray-500 mb-1" />
              <div className="text-2xl font-bold text-white">
                {statsLoading ? '...' : stats?.totalCases ?? 0}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500">
                {isNe ? 'ट्र्याक गरिएको' : 'Cases Tracked'}
              </div>
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
              <div className="text-[10px] uppercase tracking-wider text-amber-400/60">
                {isNe ? 'सक्रिय अनुसन्धान' : 'Active Investigations'}
              </div>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-center">
              <Scale className="mx-auto h-5 w-5 text-gray-500 mb-1" />
              <div className="text-2xl font-bold text-white">
                {statsLoading ? '...' : `${stats?.convictionRate ?? 0}%`}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500">
                {isNe ? 'दोषी दर' : 'Conviction Rate'}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="public-section">
        <div className="public-shell">
          {/* ── Tab Bar ── */}
          <div className="flex items-center gap-1 border-b border-white/[0.06] mb-4">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'all'
                  ? 'border-primary-400 text-primary-300'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              {isNe ? 'सबै घटनाहरू' : 'All Cases'}
              <span className="ml-1 rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[10px]">
                {cases.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('mine')}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'mine'
                  ? 'border-primary-400 text-primary-300'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <User className="h-3.5 w-3.5" />
              {isNe ? 'मेरा रिपोर्टहरू' : 'My Reports'}
              <span className="ml-1 rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[10px]">
                {myCases.length}
              </span>
            </button>
          </div>

          {/* ── Filter Bar ── */}
          <div className="flex flex-col gap-3 mb-6">
            <div className="flex flex-wrap gap-2">
              {/* Type dropdown */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as CorruptionType | '')}
                className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-white/[0.12] appearance-none cursor-pointer"
              >
                <option value="">{isNe ? 'सबै प्रकार' : 'All Types'}</option>
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
                <option value="">{isNe ? 'सबै स्थिति' : 'All Statuses'}</option>
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
                <option value="">{isNe ? 'सबै गम्भीरता' : 'All Severity'}</option>
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
                placeholder={isNe ? 'घटना, व्यक्ति खोज्नुहोस्...' : 'Search cases, entities, tags...'}
                className="w-full pl-10 pr-4 py-2 rounded-lg text-sm bg-white/[0.03] border border-white/[0.06] text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-white/[0.12]"
              />
            </div>
          </div>

          {/* ── Entities link ── */}
          <div className="mb-4">
            <Link
              href="/corruption/entities"
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-xs font-medium text-gray-400 transition-colors hover:bg-white/[0.06] hover:text-gray-200"
            >
              <Users className="h-4 w-4" />
              {isNe ? 'सम्पूर्ण संलग्न व्यक्ति हेर्नुहोस्' : 'View All Entities & Persons of Interest →'}
            </Link>
          </div>

          {/* ── Sources footnote ── */}
          <div className="mb-4 text-[10px] text-gray-600">
            {isNe ? 'स्रोतहरू' : 'Sources'}: Kathmandu Post, MyRepublica, Ekantipur, The Diplomat, Nepali Times, The Rising Nepal, BBC Nepali, Online Khabar, Ratopati, Setopati, Himalayan Times, CIAA Reports, Parliament Records, Google News &amp; more
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

          {/* ── Empty state ── */}
          {!isLoading && displayCases.length === 0 && (
            <div className="text-center py-12">
              {activeTab === 'mine' ? (
                <>
                  <User className="mx-auto h-8 w-8 text-gray-600 mb-3" />
                  <p className="text-sm text-gray-400 mb-1">
                    {isNe ? 'तपाईंले अहिलेसम्म कुनै रिपोर्ट गर्नुभएको छैन।' : 'You haven\'t reported any cases yet.'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {isNe
                      ? 'भ्रष्टाचार रिपोर्ट गर्न "नागरिक समस्या" ट्याबबाट सुरु गर्नुहोस्।'
                      : 'Use the Civic Issues tab on the home page to report corruption.'}
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-500">
                  {isNe ? 'तपाईंको फिल्टरसँग मिल्ने कुनै घटना छैन।' : 'No cases match your filters.'}
                </p>
              )}
            </div>
          )}

          {/* ── Case Cards Grid ── */}
          {!isLoading && displayCases.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {displayCases.map((c) => (
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
  const { locale } = useI18n();
  const isNe = locale === 'ne';
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
        {caseData.source_quality === 'alleged' && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-blue-500/10 text-blue-400">
            Citizen Report
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

      {/* Footer: date + actions */}
      <div className="flex items-center justify-between border-t border-white/[0.06] pt-2">
        <span className="flex items-center gap-1.5 text-[10px] text-gray-600">
          <Clock className="h-3 w-3" />
          Updated {new Date(caseData.updated_at).toLocaleDateString()}
        </span>
        <ShareMenu
          shareTitle={isNe && caseData.title_ne ? caseData.title_ne : caseData.title}
          shareUrl={`/corruption/${caseData.slug}`}
          shareText={caseData.summary || caseData.title}
          size="sm"
          ogParams={{
            ogType: 'corruption',
            ogSlug: caseData.slug,
            ogTitle: isNe && caseData.title_ne ? caseData.title_ne : caseData.title,
            ogSubtitle: caseData.estimated_amount_npr
              ? `रू ${formatAmountNpr(caseData.estimated_amount_npr)} · ${STATUS_LABELS[caseData.status][isNe ? 'ne' : 'en']}`
              : STATUS_LABELS[caseData.status][isNe ? 'ne' : 'en'],
            ogSection: 'corruption',
            ogStatus: caseData.status,
            ogLocale: locale,
            ogFacts: isNe ? [
              caseData.estimated_amount_npr ? `रू ${formatAmountNpr(caseData.estimated_amount_npr)}` : null,
              `स्थिति: ${STATUS_LABELS[caseData.status].ne}`,
              caseData.severity ? `गम्भीरता: ${SEVERITY_LABELS[caseData.severity].en}` : null,
            ].filter(Boolean).join('|') : [
              caseData.estimated_amount_npr ? `NPR ${formatAmountNpr(caseData.estimated_amount_npr)} estimated` : null,
              `Status: ${STATUS_LABELS[caseData.status].en}`,
              caseData.severity ? `${SEVERITY_LABELS[caseData.severity].en} severity` : null,
            ].filter(Boolean).join('|'),
          }}
        />
      </div>
    </Link>
  );
}
