'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Search,
  ExternalLink,
  Youtube,
  MessageCircle,
  AtSign,
  Newspaper,
  Megaphone,
  Landmark,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Filter,
  SortAsc,
  ChevronDown,
  ShieldCheck,
  Clock,
  User,
  Tag,
  Video,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { PublicPageHero } from '@/components/public/page-hero';
import { EvidenceSourceBadge, deriveSourceType } from '@/components/public/evidence-source-badge';

// ----- Types -----

interface EvidenceRow {
  id: string;
  official_name: string;
  official_title: string | null;
  quote_text: string;
  quote_summary: string | null;
  language: string;
  source_type: string;
  source_url: string;
  source_title: string | null;
  timestamp_seconds: number | null;
  timestamp_url: string | null;
  spoken_date: string | null;
  collected_at: string;
  promise_ids: number[];
  statement_type: string | null;
  verification_status: string;
  importance_score: number;
  tags: string[];
}

// ----- Constants -----

const SOURCE_ICONS: Record<string, typeof Youtube> = {
  youtube: Youtube,
  facebook: MessageCircle,
  twitter: AtSign,
  tiktok: Video,
  news_interview: Newspaper,
  press_conference: Megaphone,
  parliament: Landmark,
  official_statement: FileText,
};

const SOURCE_LABELS: Record<string, { en: string; ne: string }> = {
  youtube: { en: 'YouTube', ne: 'युट्युब' },
  facebook: { en: 'Facebook', ne: 'फेसबुक' },
  twitter: { en: 'Twitter/X', ne: 'ट्विटर' },
  tiktok: { en: 'TikTok', ne: 'टिकटक' },
  news_interview: { en: 'News', ne: 'समाचार' },
  press_conference: { en: 'Press Conference', ne: 'पत्रकार सम्मेलन' },
  parliament: { en: 'Parliament', ne: 'संसद' },
  official_statement: { en: 'Official', ne: 'आधिकारिक' },
};

const VERIFICATION_CONFIG: Record<
  string,
  { icon: typeof CheckCircle2; color: string; label: { en: string; ne: string } }
> = {
  verified: {
    icon: CheckCircle2,
    color: 'text-emerald-400',
    label: { en: 'Verified', ne: 'प्रमाणित' },
  },
  disputed: {
    icon: AlertTriangle,
    color: 'text-amber-400',
    label: { en: 'Disputed', ne: 'विवादित' },
  },
  false: {
    icon: XCircle,
    color: 'text-red-400',
    label: { en: 'False', ne: 'गलत' },
  },
  unverified: {
    icon: HelpCircle,
    color: 'text-gray-500',
    label: { en: 'Unverified', ne: 'अप्रमाणित' },
  },
};

const STATEMENT_COLORS: Record<string, string> = {
  commitment: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  claim: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  excuse: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  update: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  contradiction: 'bg-red-500/15 text-red-400 border-red-500/30',
  denial: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  deflection: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  acknowledgment: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
};

const STATEMENT_LABELS: Record<string, { en: string; ne: string }> = {
  commitment: { en: 'Commitment', ne: 'प्रतिबद्धता' },
  claim: { en: 'Claim', ne: 'दाबी' },
  excuse: { en: 'Excuse', ne: 'बहाना' },
  update: { en: 'Update', ne: 'अद्यावधिक' },
  contradiction: { en: 'Contradiction', ne: 'विरोधाभास' },
  denial: { en: 'Denial', ne: 'अस्वीकार' },
  deflection: { en: 'Deflection', ne: 'टार्ने' },
  acknowledgment: { en: 'Acknowledgment', ne: 'स्वीकृति' },
};

// Promise ID to title mapping (abbreviated)
const PROMISE_SHORT: Record<number, { en: string; ne: string }> = {
  1: { en: 'Elected Executive', ne: 'प्रत्यक्ष कार्यकारी' },
  2: { en: 'Westminster Reform', ne: 'संसदीय सुधार' },
  3: { en: 'Development Vision', ne: 'विकास दूरदृष्टि' },
  4: { en: 'Anti-Corruption', ne: 'भ्रष्टाचार विरोधी' },
  5: { en: 'Judicial Independence', ne: 'न्यायिक स्वतन्त्रता' },
  6: { en: 'Merit Bureaucracy', ne: 'योग्यता नोकरशाही' },
  7: { en: 'E-Procurement', ne: 'ई-खरिद' },
  8: { en: 'GDP Growth', ne: 'GDP वृद्धि' },
  9: { en: 'Youth Employment', ne: 'युवा रोजगार' },
  10: { en: 'Trade Deficit', ne: 'व्यापार घाटा' },
  11: { en: 'Tax Reform', ne: 'कर सुधार' },
  12: { en: '30K MW Hydro', ne: '३०K MW जलविद्युत' },
  13: { en: 'Clean Water', ne: 'खानेपानी' },
  14: { en: 'Smart City', ne: 'स्मार्ट शहर' },
  15: { en: 'Highway 4-Lane', ne: 'राजमार्ग ४ लेन' },
  16: { en: 'Federal Governance', ne: 'संघीय शासन' },
  17: { en: 'Airports', ne: 'विमानस्थल' },
  18: { en: 'Digital Nepal', ne: 'डिजिटल नेपाल' },
  19: { en: 'Broadband', ne: 'ब्रोडब्यान्ड' },
  20: { en: 'IT Park', ne: 'आईटी पार्क' },
  21: { en: 'Financial Inclusion', ne: 'वित्तीय समावेशिता' },
  22: { en: 'Health Insurance', ne: 'स्वास्थ्य बीमा' },
  23: { en: 'District Hospitals', ne: 'जिल्ला अस्पताल' },
  24: { en: 'Education Reform', ne: 'शिक्षा सुधार' },
  25: { en: 'TVET', ne: 'प्राविधिक तालिम' },
  26: { en: 'Research University', ne: 'अनुसन्धान विश्वविद्यालय' },
  27: { en: 'Agriculture', ne: 'कृषि' },
  28: { en: 'Climate Policy', ne: 'जलवायु नीति' },
  29: { en: 'Land Reform', ne: 'भूमि सुधार' },
  30: { en: 'Electoral Reform', ne: 'निर्वाचन सुधार' },
  31: { en: 'Cooperatives', ne: 'सहकारी' },
  32: { en: 'Tourism', ne: 'पर्यटन' },
  33: { en: 'Foreign Policy', ne: 'विदेश नीति' },
  34: { en: 'Social Security', ne: 'सामाजिक सुरक्षा' },
  35: { en: 'Passport Reform', ne: 'राहदानी सुधार' },
};

type SortOption = 'newest' | 'importance' | 'official';

// ----- Main Component -----

export default function EvidenceVaultPage() {
  const { locale, t } = useI18n();
  const isNe = locale === 'ne';

  // State
  const [evidence, setEvidence] = useState<EvidenceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [selectedStatement, setSelectedStatement] = useState<string>('');
  const [selectedPromise, setSelectedPromise] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Fetch evidence
  const fetchEvidence = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    setLoading(true);

    let query = supabase
      .from('evidence_vault')
      .select('*', { count: 'exact' })
      .limit(100);

    // Apply sorting
    if (sortBy === 'newest') {
      query = query.order('spoken_date', { ascending: false, nullsFirst: false });
    } else if (sortBy === 'importance') {
      query = query.order('importance_score', { ascending: false });
    } else {
      query = query.order('official_name', { ascending: true });
    }

    // Apply source filter
    if (selectedSource) {
      query = query.eq('source_type', selectedSource);
    }

    // Apply statement type filter
    if (selectedStatement) {
      query = query.eq('statement_type', selectedStatement);
    }

    // Apply promise filter
    if (selectedPromise !== null) {
      query = query.contains('promise_ids', [selectedPromise]);
    }

    // Apply search
    if (searchQuery.trim()) {
      query = query.or(
        `official_name.ilike.%${searchQuery}%,quote_text.ilike.%${searchQuery}%,source_title.ilike.%${searchQuery}%`,
      );
    }

    const { data, count, error } = await query;

    if (error) {
      console.error('Evidence fetch error:', error.message);
    }

    setEvidence((data as EvidenceRow[]) || []);
    setTotalCount(count || 0);
    setLoading(false);
  }, [searchQuery, selectedSource, selectedStatement, selectedPromise, sortBy]);

  useEffect(() => {
    fetchEvidence();
  }, [fetchEvidence]);

  // Get unique officials for display
  const uniqueOfficials = useMemo(() => {
    const names = new Set(evidence.map((e) => e.official_name));
    return Array.from(names).sort();
  }, [evidence]);

  // Format date
  function formatDate(dateStr: string | null): string {
    if (!dateStr) return t('evidencePage.dateUnknown');
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(isNe ? 'ne-NP' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  return (
    <div className="public-page">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-primary-500/[0.04] blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[420px] w-[420px] rounded-full bg-cyan-500/[0.04] blur-[100px]" />
      </div>

      <div className="relative z-10">
        {/* Back Link */}
        <div className="public-shell pt-6">
          <div className="mx-auto max-w-5xl">
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-primary-400 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('common.back')}
            </Link>
          </div>
        </div>

        {/* Hero */}
        <PublicPageHero
          eyebrow={t('evidencePage.evidenceVault')}
          title={t('evidencePage.whoSaidWhatWhen')}
          description={t('evidencePage.evidenceVaultDesc')}
          stats={
            <div className="flex items-center gap-6 mt-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{totalCount}</p>
                <p className="text-xs text-gray-500">
                  {t('evidencePage.evidenceItems')}
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">
                  {uniqueOfficials.length}
                </p>
                <p className="text-xs text-gray-500">
                  {t('evidencePage.officials')}
                </p>
              </div>
            </div>
          }
        />

        {/* Search & Filters */}
        <section className="public-section pt-0">
          <div className="public-shell">
            <div className="mx-auto max-w-5xl">
              <div className="glass-card p-4 sm:p-6 mb-6">
                {/* Search bar */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t('evidencePage.searchPlaceholder')}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/30 transition-all"
                    />
                  </div>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                      showFilters
                        ? 'bg-primary-500/20 border-primary-500/40 text-primary-400'
                        : 'bg-white/[0.04] border-white/[0.08] text-gray-400 hover:text-white hover:border-white/[0.15]'
                    }`}
                  >
                    <Filter className="w-4 h-4" />
                    {t('evidencePage.filters')}
                  </button>
                </div>

                {/* Expandable filters */}
                {showFilters && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-white/[0.06]">
                    {/* Source type */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5">
                        {t('evidencePage.source')}
                      </label>
                      <div className="relative">
                        <select
                          value={selectedSource}
                          onChange={(e) => setSelectedSource(e.target.value)}
                          className="w-full appearance-none px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-primary-500/50"
                        >
                          <option value="">{t('evidencePage.allSources')}</option>
                          {Object.entries(SOURCE_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>
                              {isNe ? label.ne : label.en}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                      </div>
                    </div>

                    {/* Statement type */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5">
                        {t('evidencePage.statementType')}
                      </label>
                      <div className="relative">
                        <select
                          value={selectedStatement}
                          onChange={(e) => setSelectedStatement(e.target.value)}
                          className="w-full appearance-none px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-primary-500/50"
                        >
                          <option value="">{t('evidencePage.allTypes')}</option>
                          {Object.entries(STATEMENT_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>
                              {isNe ? label.ne : label.en}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                      </div>
                    </div>

                    {/* Promise filter */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5">
                        {t('evidencePage.commitment')}
                      </label>
                      <div className="relative">
                        <select
                          value={selectedPromise ?? ''}
                          onChange={(e) =>
                            setSelectedPromise(
                              e.target.value ? Number(e.target.value) : null,
                            )
                          }
                          className="w-full appearance-none px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-primary-500/50"
                        >
                          <option value="">{t('evidencePage.allCommitments')}</option>
                          {Object.entries(PROMISE_SHORT).map(([id, label]) => (
                            <option key={id} value={id}>
                              #{id} {isNe ? label.ne : label.en}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                      </div>
                    </div>

                    {/* Sort */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5">
                        {t('evidencePage.sortBy')}
                      </label>
                      <div className="relative">
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as SortOption)}
                          className="w-full appearance-none px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-primary-500/50"
                        >
                          <option value="newest">{t('evidencePage.newestFirst')}</option>
                          <option value="importance">
                            {t('evidencePage.mostImportant')}
                          </option>
                          <option value="official">
                            {t('evidencePage.byOfficial')}
                          </option>
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Evidence Cards */}
        <section className="public-section pt-0 pb-24">
          <div className="public-shell">
            <div className="mx-auto max-w-5xl">
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="glass-card p-6 animate-pulse">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-white/[0.06]" />
                        <div>
                          <div className="h-4 w-32 bg-white/[0.06] rounded mb-1" />
                          <div className="h-3 w-24 bg-white/[0.04] rounded" />
                        </div>
                      </div>
                      <div className="h-16 bg-white/[0.04] rounded mb-3" />
                      <div className="flex gap-2">
                        <div className="h-6 w-20 bg-white/[0.04] rounded-full" />
                        <div className="h-6 w-20 bg-white/[0.04] rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : evidence.length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <ShieldCheck className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {t('evidencePage.noEvidenceFound')}
                  </h3>
                  <p className="text-sm text-gray-500 max-w-md mx-auto">
                    {t('evidencePage.noEvidenceFoundDesc')}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {evidence.map((item) => (
                    <EvidenceCard
                      key={item.id}
                      item={item}
                      isNe={isNe}
                      formatDate={formatDate}
                    />
                  ))}
                </div>
              )}

              {/* Result count */}
              {!loading && evidence.length > 0 && (
                <div className="mt-6 text-center">
                  <p className="text-xs text-gray-600">
                    {isNe
                      ? `${evidence.length} / ${totalCount} ${t('evidencePage.evidenceItems')}`
                      : `Showing ${evidence.length} of ${totalCount} evidence items`}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Footer accent line */}
        <div className="h-px bg-gradient-to-r from-transparent via-primary-500/30 to-transparent" />
      </div>
    </div>
  );
}

// ----- Evidence Card Component -----

function EvidenceCard({
  item,
  isNe,
  formatDate,
}: {
  item: EvidenceRow;
  isNe: boolean;
  formatDate: (d: string | null) => string;
}) {
  const { t } = useI18n();
  const SourceIcon = SOURCE_ICONS[item.source_type] || FileText;
  const sourceLabel = SOURCE_LABELS[item.source_type] || {
    en: item.source_type,
    ne: item.source_type,
  };
  const verification = VERIFICATION_CONFIG[item.verification_status] || VERIFICATION_CONFIG.unverified;
  const VerificationIcon = verification.icon;
  const statementStyle =
    STATEMENT_COLORS[item.statement_type || ''] || STATEMENT_COLORS.acknowledgment;
  const statementLabel =
    STATEMENT_LABELS[item.statement_type || ''] || STATEMENT_LABELS.acknowledgment;

  return (
    <div className="glass-card p-5 sm:p-6 group hover:border-white/[0.12] transition-all duration-200">
      {/* Header: Official + Source */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-500/15 border border-primary-500/30 flex items-center justify-center">
            <User className="w-5 h-5 text-primary-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white truncate">
              {item.official_name}
            </h3>
            {item.official_title && (
              <p className="text-xs text-gray-500 truncate">{item.official_title}</p>
            )}
          </div>
        </div>

        {/* Source badge */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08]">
            <SourceIcon className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-[10px] font-medium text-gray-400">
              {isNe ? sourceLabel.ne : sourceLabel.en}
            </span>
          </div>
        </div>
      </div>

      {/* Quote */}
      <div className="mb-4 pl-1 border-l-2 border-primary-500/30">
        <p className="text-sm text-gray-300 leading-relaxed pl-3">
          &ldquo;{item.quote_text.length > 300
            ? item.quote_text.slice(0, 300) + '...'
            : item.quote_text}&rdquo;
        </p>
      </div>

      {/* Source title */}
      {item.source_title && (
        <p className="text-xs text-gray-500 mb-3 truncate">
          {item.source_title}
        </p>
      )}

      {/* Tags row: Statement Type + Promise Tags + Verification */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {/* Statement type badge */}
        {item.statement_type && (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${statementStyle}`}
          >
            {isNe ? statementLabel.ne : statementLabel.en}
          </span>
        )}

        {/* Promise tags */}
        {item.promise_ids.slice(0, 3).map((pid) => {
          const promise = PROMISE_SHORT[pid];
          if (!promise) return null;
          return (
            <Link
              key={pid}
              href={`/explore/first-100-days/${pid}`}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[10px] text-gray-400 hover:text-primary-400 hover:border-primary-500/30 transition-colors"
            >
              <Tag className="w-2.5 h-2.5" />
              #{pid} {isNe ? promise.ne : promise.en}
            </Link>
          );
        })}
        {item.promise_ids.length > 3 && (
          <span className="text-[10px] text-gray-600">
            +{item.promise_ids.length - 3} {t('evidencePage.more')}
          </span>
        )}
      </div>

      {/* Footer: Date + Verification + View Source */}
      <div className="flex items-center justify-between pt-3 border-t border-white/[0.04]">
        <div className="flex items-center gap-4">
          {/* Date */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            {formatDate(item.spoken_date)}
          </div>

          {/* Source quality */}
          <EvidenceSourceBadge
            sourceType={deriveSourceType({
              source_type: item.source_type,
              source_name: item.source_title || undefined,
              verification_status: item.verification_status,
            })}
            isNe={isNe}
            compact
          />

          {/* Verification status */}
          <div className={`flex items-center gap-1 text-xs ${verification.color}`}>
            <VerificationIcon className="w-3 h-3" />
            {isNe ? verification.label.ne : verification.label.en}
          </div>
        </div>

        {/* View Source button */}
        <a
          href={item.timestamp_url || item.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-primary-400 bg-primary-500/10 border border-primary-500/20 hover:bg-primary-500/20 hover:border-primary-500/40 transition-all"
        >
          <ExternalLink className="w-3 h-3" />
          {t('evidencePage.viewSource')}
        </a>
      </div>
    </div>
  );
}
