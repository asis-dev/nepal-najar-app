'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Target,
  Share2,
  Calendar,
  Building2,
  Truck,
  Cpu,
  Heart,
  Zap,
  GraduationCap,
  Leaf,
  Scale,
  Fingerprint,
  FileText,
  Link2,
  Briefcase,
  Users,
  ExternalLink,
  Bookmark,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { VoteWidget } from '@/components/public/vote-widget';
import { BudgetBreakdownCard } from '@/components/budget/budget-breakdown-card';
import { SignalBadge } from '@/components/public/signal-badge';
import { useWatchlistStore } from '@/lib/stores/preferences';
import {
  getPromiseBySlug,
  getPromiseById,
  timelineEvents,
  type PromiseStatus,
  type TrustLevel,
  type GovernmentPromise,
} from '@/lib/data/promises';
import { useLatestArticles } from '@/lib/hooks/use-promises';

/* ═══════════════════════════════════════════════
   STATUS CONFIG
   ═══════════════════════════════════════════════ */
const statusStyleConfig: Record<PromiseStatus, { bg: string; text: string; dot: string; glow?: string }> = {
  not_started: { bg: 'bg-gray-500/15', text: 'text-gray-400', dot: 'bg-gray-400' },
  in_progress: { bg: 'bg-blue-500/15', text: 'text-blue-400', dot: 'bg-blue-400', glow: 'shadow-[0_0_8px_rgba(59,130,246,0.2)]' },
  delivered: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-400', glow: 'shadow-[0_0_12px_rgba(16,185,129,0.3)]' },
  stalled: { bg: 'bg-red-500/15', text: 'text-red-400', dot: 'bg-red-400', glow: 'shadow-[0_0_8px_rgba(239,68,68,0.2)]' },
};

const statusLabelKeys: Record<PromiseStatus, string> = {
  not_started: 'commitment.notStarted',
  in_progress: 'commitment.inProgress',
  delivered: 'commitment.delivered',
  stalled: 'commitment.stalled',
};

/* ═══════════════════════════════════════════════
   TRUST LEVEL CONFIG
   ═══════════════════════════════════════════════ */
const trustStyleConfig: Record<TrustLevel, { labelKey: string; color: string; bg: string; border: string; glow: string; Icon: React.ElementType }> = {
  verified: { labelKey: 'trust.verified', color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', glow: 'shadow-[0_0_8px_rgba(16,185,129,0.25)]', Icon: ShieldCheck },
  partial: { labelKey: 'trust.partial', color: 'text-yellow-400', bg: 'bg-yellow-500/15', border: 'border-yellow-500/30', glow: 'shadow-[0_0_8px_rgba(234,179,8,0.25)]', Icon: Shield },
  unverified: { labelKey: 'trust.unverified', color: 'text-gray-400', bg: 'bg-gray-500/15', border: 'border-gray-500/30', glow: '', Icon: ShieldAlert },
  disputed: { labelKey: 'trust.disputed', color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/30', glow: 'shadow-[0_0_8px_rgba(239,68,68,0.25)]', Icon: ShieldX },
};

/* ═══════════════════════════════════════════════
   CATEGORY CONFIG
   ═══════════════════════════════════════════════ */
const categoryIcons: Record<string, React.ElementType> = {
  Infrastructure: Building2,
  Transport: Truck,
  Technology: Cpu,
  Health: Heart,
  Environment: Leaf,
  Energy: Zap,
  Education: GraduationCap,
  'Anti-Corruption': Fingerprint,
  Governance: Scale,
  Economy: Briefcase,
  Social: Users,
};

const categoryColors: Record<string, string> = {
  Infrastructure: 'text-blue-400',
  Transport: 'text-amber-400',
  Technology: 'text-cyan-400',
  Health: 'text-rose-400',
  Environment: 'text-emerald-400',
  Energy: 'text-yellow-400',
  Education: 'text-purple-400',
  'Anti-Corruption': 'text-orange-400',
  Governance: 'text-indigo-400',
  Economy: 'text-teal-400',
  Social: 'text-pink-400',
};

/* ═══════════════════════════════════════════════
   EVENT CATEGORY CONFIG
   ═══════════════════════════════════════════════ */
const eventCategoryConfig: Record<string, { bg: string; text: string }> = {
  election: { bg: 'bg-amber-500/15', text: 'text-amber-400' },
  ceremony: { bg: 'bg-purple-500/15', text: 'text-purple-400' },
  governance: { bg: 'bg-blue-500/15', text: 'text-blue-400' },
  policy: { bg: 'bg-cyan-500/15', text: 'text-cyan-400' },
  finance: { bg: 'bg-amber-500/15', text: 'text-amber-400' },
  milestone: { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
};

/* ═══════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════ */
export default function PromiseDetailPage() {
  const params = useParams();
  const { t, locale } = useI18n();
  const [copied, setCopied] = useState(false);
  const { toggleWatch, isWatched } = useWatchlistStore();

  const isNe = locale === 'ne';
  const idParam = params.id as string;

  // Try slug first, fall back to ID lookup
  const promise = useMemo(() => {
    return getPromiseBySlug(idParam) ?? getPromiseById(idParam);
  }, [idParam]);

  // Get REAL related articles from Supabase (not mock data)
  const { data: realArticles } = useLatestArticles(10, promise?.id);

  // Get related timeline events (by category match)
  const relatedEvents = useMemo(() => {
    if (!promise) return [];
    return timelineEvents.filter(
      (e) => e.category.toLowerCase() === promise.category.toLowerCase() || e.category === 'governance'
    );
  }, [promise]);

  const now = new Date();

  // Share handlers
  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';

  function handleCopyLink() {
    navigator.clipboard.writeText(pageUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Not found
  if (!promise) {
    return (
      <div className="min-h-screen bg-np-base flex items-center justify-center">
        <div className="text-center">
          <Target className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">
            {isNe ? 'वचन फेला परेन' : 'Promise Not Found'}
          </h1>
          <p className="text-gray-500 mb-6">
            {isNe ? 'यो वचन अवस्थित छैन।' : 'This promise could not be located.'}
          </p>
          <Link
            href="/explore/first-100-days"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-primary-300 bg-primary-500/15 border border-primary-500/30 hover:bg-primary-500/25 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            {isNe ? 'वचन ट्र्याकरमा फर्कनुहोस्' : 'Back to Commitment Tracker'}
          </Link>
        </div>
      </div>
    );
  }

  const style = statusStyleConfig[promise.status];
  const trust = trustStyleConfig[promise.trustLevel];
  const TrustIcon = trust.Icon;
  const CatIcon = categoryIcons[promise.category] ?? Building2;
  const catColor = categoryColors[promise.category] ?? 'text-gray-400';

  const whatsappText = `${promise.title_ne}\n${promise.title}\n\nStatus: ${t(statusLabelKeys[promise.status])}${promise.evidenceCount > 0 ? ` | ${promise.evidenceCount} articles` : ''}\n\n${pageUrl}`;

  return (
    <div className="min-h-screen bg-np-base">
      {/* Ambient glow effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary-500/[0.05] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-500/[0.05] rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10">
        {/* ═══════════════════════════════════════
           BACK LINK
           ═══════════════════════════════════════ */}
        <section className="px-4 sm:px-6 lg:px-8 pt-8">
          <div className="max-w-4xl mx-auto">
            <Link
              href="/explore/first-100-days"
              className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-primary-300 transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              {isNe ? 'वचन ट्र्याकरमा फर्कनुहोस्' : 'Back to Commitment Tracker'}
            </Link>
          </div>
        </section>

        {/* ═══════════════════════════════════════
           PROMISE HEADER
           ═══════════════════════════════════════ */}
        <section className="px-4 sm:px-6 lg:px-8 pb-8">
          <div className="max-w-4xl mx-auto">
            <div className="glass-card p-6 sm:p-8">
              {/* Status + Trust + Signal badges */}
              <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${style.bg} ${style.text} ${style.glow ?? ''}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                    {t(statusLabelKeys[promise.status])}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border ${trust.bg} ${trust.color} ${trust.border} ${trust.glow}`}
                  >
                    <TrustIcon className="w-3.5 h-3.5" />
                    {t(trust.labelKey)}
                  </span>
                  {promise.signalType && (
                    <SignalBadge type={promise.signalType} locale={locale as 'en' | 'ne'} />
                  )}
                </div>

                <button
                  onClick={() => toggleWatch(promise.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
                    isWatched(promise.id)
                      ? 'bg-primary-500/15 text-primary-300 border-primary-500/30'
                      : 'bg-white/[0.04] text-gray-400 border-white/[0.08] hover:border-primary-500/30 hover:text-primary-300'
                  }`}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${isWatched(promise.id) ? 'fill-primary-400' : ''}`} />
                  {isWatched(promise.id)
                    ? (locale === 'ne' ? 'हेरिरहेको' : 'Watching')
                    : (locale === 'ne' ? 'हेर्नुहोस्' : 'Watch')}
                </button>
              </div>

              {/* Title (bilingual, editorial) */}
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-white mb-1 tracking-tight">
                {isNe ? promise.title_ne : promise.title}
              </h1>
              <p className="text-base sm:text-lg font-nepali text-gray-500 mb-4">
                {isNe ? promise.title : promise.title_ne}
              </p>

              {/* Category */}
              <div className="mb-6">
                <span className={`inline-flex items-center gap-2 text-sm ${catColor}`}>
                  <CatIcon className="w-4 h-4" />
                  {isNe ? `${promise.category_ne} / ${promise.category}` : `${promise.category} / ${promise.category_ne}`}
                </span>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-400 leading-relaxed mb-6">
                {isNe ? promise.description_ne : promise.description}
              </p>
              <p className="text-xs text-gray-600 leading-relaxed mb-6">
                {isNe ? promise.description : promise.description_ne}
              </p>

              {/* Progress — honest display */}
              <div className="mb-4">
                {promise.progress > 0 ? (
                  <>
                    <p className="text-sm text-gray-300 mb-2">
                      <span className="text-white font-semibold">{promise.progress}% complete</span>
                      <span className="text-gray-500"> as of {new Date(promise.lastUpdate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                    </p>
                    <div className="h-4 rounded-full overflow-hidden bg-white/[0.06]">
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{
                          width: `${promise.progress}%`,
                          background: 'linear-gradient(90deg, #2563eb, #06b6d4)',
                          boxShadow: '0 0 12px rgba(59, 130, 246, 0.3)',
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <p className="text-sm text-gray-400">
                      {isNe ? 'प्रगति अझै प्रमाणित गरिएको छैन' : 'No verified progress data yet'}
                    </p>
                    {promise.evidenceCount > 0 && (
                      <p className="text-xs text-cyan-500/60 mt-1">
                        {promise.evidenceCount} article{promise.evidenceCount !== 1 ? 's' : ''} mention this promise
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Meta row */}
              <div className="flex items-center gap-4 text-xs text-gray-500 pt-3 border-t border-white/[0.04]">
                <span className="inline-flex items-center gap-1">
                  <Link2 className="w-3 h-3" />
                  {promise.linkedProjects} {promise.linkedProjects !== 1 ? t('commitment.projectsPlural') : t('commitment.projects')}
                </span>
                {promise.evidenceCount > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {promise.evidenceCount} {t('commitment.evidence')}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {isNe ? 'अन्तिम अपडेट' : 'Last updated'}: {promise.lastUpdate}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════
           VOTE WIDGET (full) — above the fold
           ═══════════════════════════════════════ */}
        <section className="px-4 sm:px-6 lg:px-8 pb-8">
          <div className="max-w-4xl mx-auto">
            <VoteWidget promiseId={promise.id} variant="full" />
          </div>
        </section>

        {/* ═══════════════════════════════════════
           BUDGET SECTION — only if data available
           ═══════════════════════════════════════ */}
        {promise.estimatedBudgetNPR && promise.estimatedBudgetNPR > 0 ? (
          <section className="px-4 sm:px-6 lg:px-8 pb-8">
            <div className="max-w-4xl mx-auto">
              <BudgetBreakdownCard
                estimatedNPR={promise.estimatedBudgetNPR}
                spentNPR={promise.spentNPR}
                fundingSource={promise.fundingSource}
                fundingSource_ne={promise.fundingSource_ne}
              />
            </div>
          </section>
        ) : null}

        {/* ═══════════════════════════════════════
           REAL SCRAPED ARTICLES
           ═══════════════════════════════════════ */}
        <section className="px-4 sm:px-6 lg:px-8 pb-8">
          <div className="max-w-4xl mx-auto">
            <div className="glass-card p-6">
              <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                {isNe ? 'सम्बन्धित समाचार कभरेज' : 'Related News Coverage'}
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-semibold uppercase tracking-wider">
                  Live
                </span>
              </h3>
              {realArticles && realArticles.length > 0 ? (
                <div className="divide-y divide-white/[0.04]">
                  {realArticles.map((article) => (
                    <a
                      key={article.id}
                      href={article.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 py-3 hover:bg-white/[0.02] transition-colors -mx-2 px-2 rounded-lg group"
                    >
                      <div className="w-6 h-6 rounded-md bg-white/[0.04] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <ExternalLink className="w-3 h-3 text-gray-500 group-hover:text-cyan-400 transition-colors" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-200 group-hover:text-white transition-colors line-clamp-2">
                          {article.headline}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-gray-500">{article.source_name}</span>
                          {article.published_at && (
                            <span className="text-[10px] text-gray-600">
                              {new Date(article.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                          {article.confidence > 0.5 && (
                            <span className="text-[9px] text-cyan-600">
                              {Math.round(article.confidence * 100)}% match
                            </span>
                          )}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
                  <p className="text-sm text-gray-500">
                    {isNe ? 'यो वचनसँग सम्बन्धित कुनै समाचार छैन।' : 'No news coverage found yet for this promise.'}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {isNe ? 'स्क्र्यापर चलिरहेको छ।' : 'Our scraper checks news sources regularly.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════
           LINKED PROJECTS
           ═══════════════════════════════════════ */}
        <section className="px-4 sm:px-6 lg:px-8 pb-8">
          <div className="max-w-4xl mx-auto">
            <div className="glass-card p-6">
              <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                <Link2 className="w-4 h-4 text-primary-400" />
                {isNe ? 'सम्बन्धित परियोजनाहरू' : 'Linked Projects'}
              </h3>
              {promise.linkedProjects > 0 ? (
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
                  <div className="text-3xl font-bold text-primary-400 mb-1">{promise.linkedProjects}</div>
                  <div className="text-sm text-gray-500">
                    {isNe
                      ? `${promise.linkedProjects} सम्बन्धित परियोजनाहरू`
                      : `${promise.linkedProjects} linked ${promise.linkedProjects !== 1 ? 'projects' : 'project'}`}
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    {isNe ? 'विस्तृत परियोजना ट्र्याकिङ चाँडै आउँदैछ।' : 'Detailed project tracking coming soon.'}
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
                  <p className="text-sm text-gray-500">
                    {isNe ? 'कुनै सम्बन्धित परियोजना छैन।' : 'No linked projects yet.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════
           RELATED TIMELINE
           ═══════════════════════════════════════ */}
        {relatedEvents.length > 0 && (
          <section className="px-4 sm:px-6 lg:px-8 pb-8">
            <div className="max-w-4xl mx-auto">
              <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                {isNe ? 'सम्बन्धित घटनाक्रम' : 'Related Timeline'}
              </h3>

              <div className="relative ml-4">
                {/* Vertical line */}
                <div className="absolute left-[7px] top-3 bottom-3 w-px bg-gradient-to-b from-primary-500/40 via-cyan-500/30 to-transparent" />

                <div className="space-y-4">
                  {relatedEvents.map((event, idx) => {
                    const config = eventCategoryConfig[event.type] ?? eventCategoryConfig[event.category] ?? { bg: 'bg-gray-500/15', text: 'text-gray-400' };
                    const eventDate = new Date(event.date + 'T00:00:00+05:45');
                    const isPast = now >= eventDate;

                    return (
                      <div key={idx} className="relative flex items-start gap-4 group">
                        {/* Timeline dot */}
                        <div className="relative z-10 flex-shrink-0">
                          <div
                            className={`w-[15px] h-[15px] rounded-full border-2 transition-all duration-300 ${
                              isPast
                                ? 'border-cyan-400 bg-cyan-400/30 shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                                : 'border-gray-600 bg-np-surface group-hover:border-primary-400'
                            }`}
                          />
                        </div>

                        {/* Event card */}
                        <div className="glass-card-hover flex-1 p-4 -mt-1">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div>
                              <h4 className="text-sm font-semibold text-white">
                                {isNe ? event.title_ne : event.title}
                              </h4>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {isNe ? event.title : event.title_ne}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Calendar className="w-3 h-3 text-gray-500" />
                                <span className="text-xs text-gray-500">
                                  {eventDate.toLocaleDateString(isNe ? 'ne-NP' : 'en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                  })}
                                </span>
                              </div>
                            </div>
                            <span
                              className={`inline-flex items-center self-start px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${config.bg} ${config.text}`}
                            >
                              {event.category}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════
           SHARE SECTION
           ═══════════════════════════════════════ */}
        <section className="px-4 sm:px-6 lg:px-8 pb-20">
          <div className="max-w-4xl mx-auto">
            <div className="glass-card p-6 sm:p-8 text-center">
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center shadow-[0_0_20px_rgba(37,211,102,0.3)]">
                  <Share2 className="w-5 h-5 text-white" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">
                {isNe ? 'यो वचन साझा गर्नुहोस्' : 'Share This Promise'}
              </h3>
              <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
                {isNe ? 'नेताहरूलाई जवाफदेही बनाउन मद्दत गर्नुहोस्' : 'Help hold leaders accountable'}
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                {/* WhatsApp */}
                <button
                  onClick={() =>
                    window.open(
                      `https://wa.me/?text=${encodeURIComponent(whatsappText)}`,
                      '_blank',
                      'noopener,noreferrer'
                    )
                  }
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#25D366]/20 border border-[#25D366]/40 hover:bg-[#25D366]/30 transition-all duration-200 shadow-[0_0_15px_rgba(37,211,102,0.15)]"
                >
                  {isNe ? 'WhatsApp मा साझा गर्नुहोस्' : 'Share on WhatsApp'}
                </button>

                {/* Facebook */}
                <button
                  onClick={() =>
                    window.open(
                      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`,
                      '_blank',
                      'noopener,noreferrer'
                    )
                  }
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-[#1877F2]/20 border border-[#1877F2]/30 hover:bg-[#1877F2]/30 transition-all duration-200"
                >
                  Facebook
                </button>

                {/* X / Twitter */}
                <button
                  onClick={() =>
                    window.open(
                      `https://twitter.com/intent/tweet?text=${encodeURIComponent(whatsappText)}`,
                      '_blank',
                      'noopener,noreferrer'
                    )
                  }
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-white/[0.08] border border-white/[0.12] hover:bg-white/[0.14] transition-all duration-200"
                >
                  X / Twitter
                </button>

                {/* Copy Link */}
                <button
                  onClick={handleCopyLink}
                  className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    copied
                      ? 'text-emerald-300 bg-emerald-500/20 border border-emerald-500/30'
                      : 'text-gray-300 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08]'
                  }`}
                >
                  {copied ? (isNe ? 'कपी भयो!' : 'Copied!') : (isNe ? 'लिंक कपी गर्नुहोस्' : 'Copy Link')}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Footer accent line */}
        <div className="h-px bg-gradient-to-r from-transparent via-primary-500/30 to-transparent" />
      </div>
    </div>
  );
}
