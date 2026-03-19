'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Clock,
  CalendarDays,
  Sparkles,
  MapPin,
  Eye,
  Users,
  Newspaper,
  ExternalLink,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { SignalBadge } from '@/components/public/signal-badge';
import { TrustLanes } from '@/components/public/trust-lanes';
import { usePreferencesStore } from '@/lib/stores/preferences';
import {
  useAllPromises,
  usePromiseStats,
  useLatestArticles,
  useArticleCount,
} from '@/lib/hooks/use-promises';

/* ═══════════════════════════════════════════
   STATUS BADGE CONFIG
   ═══════════════════════════════════════════ */
const statusStyles: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  not_started: { bg: 'bg-gray-500/15', text: 'text-gray-400', dot: 'bg-gray-400', label: 'Not Started' },
  in_progress: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-400', label: 'In Progress' },
  delivered:   { bg: 'bg-blue-500/15', text: 'text-blue-400', dot: 'bg-blue-400', label: 'Delivered' },
  stalled:     { bg: 'bg-red-500/15', text: 'text-red-400', dot: 'bg-red-400', label: 'Stalled' },
};

/* ═══════════════════════════════════════════
   SIGNAL TYPE → LANE NAME
   ═══════════════════════════════════════════ */
const signalToLane: Record<string, string> = {
  official: 'Official',
  discovered: 'Discovered',
  reported: 'Public',
  inferred: 'Inferred',
};

const laneBadgeStyles: Record<string, string> = {
  Official: 'border-red-500/20 bg-red-500/10 text-red-300',
  Discovered: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-300',
  Public: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
  Inferred: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
};

/* ═══════════════════════════════════════════
   STAT PILL COMPONENT
   ═══════════════════════════════════════════ */
function StatPill({
  icon,
  label,
  value,
  loading,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | number;
  loading: boolean;
  accent?: 'emerald' | 'cyan' | 'crimson';
}) {
  const accentColor =
    accent === 'emerald'
      ? 'text-emerald-400'
      : accent === 'cyan'
        ? 'text-cyan-400'
        : accent === 'crimson'
          ? 'text-nepal-red'
          : 'text-primary-400';

  return (
    <div className="glass-card px-4 py-3 flex flex-col items-center gap-1">
      <div className={`${accentColor} mb-0.5`}>{icon}</div>
      {loading ? (
        <div className="h-6 w-12 bg-white/5 rounded animate-pulse" />
      ) : (
        <span className="text-xl font-bold text-white">{value ?? '--'}</span>
      )}
      <span className="text-[10px] uppercase tracking-wider text-gray-500">{label}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════
   TIME AGO HELPER
   ═══════════════════════════════════════════ */
function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ═══════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════ */
export default function ExplorePage() {
  const { locale, t } = useI18n();
  const { stats, isLoading: statsLoading } = usePromiseStats();
  const { data: allPromises, isLoading: promisesLoading } = useAllPromises();
  const { data: articles, isLoading: articlesLoading } = useLatestArticles(10);
  const { data: articleCount } = useArticleCount();
  const province = usePreferencesStore((s) => s.province);
  const district = usePreferencesStore((s) => s.district);
  const setShowPicker = usePreferencesStore((s) => s.setShowPicker);

  // Balen countdown
  const inaugurationDate = new Date('2026-04-01');
  const today = new Date();
  const diffTime = inaugurationDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const isBeforeInauguration = diffDays > 0;

  // Featured promises — pick 4 with most evidence (real article matches)
  const featuredPromises = (allPromises ?? [])
    .sort((a, b) => b.evidenceCount - a.evidenceCount)
    .slice(0, 4);

  // Category summary for "sectors" section
  const catRecord: Record<string, { total: number; inProgress: number; stalled: number }> = {};
  for (const p of allPromises ?? []) {
    if (!catRecord[p.category]) catRecord[p.category] = { total: 0, inProgress: 0, stalled: 0 };
    catRecord[p.category].total++;
    if (p.status === 'in_progress') catRecord[p.category].inProgress++;
    if (p.status === 'stalled') catRecord[p.category].stalled++;
  }
  const categories = Object.entries(catRecord)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.total - a.total);

  return (
    <div className="min-h-screen relative z-10">
      <div className="mountain-ridge opacity-50" />
      <div className="mountain-ridge-soft opacity-60" />

      {/* ═══════════════════════════════════════
         SECTION 1: HERO
         ═══════════════════════════════════════ */}
      <section className="relative pt-16 pb-10 px-4 sm:px-6 lg:px-8">
        <div className="relative max-w-5xl mx-auto text-center">
          <div className="animate-fade-in">
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs uppercase tracking-[0.18em] text-gray-300 backdrop-blur-md">
              Nepal Najar
              <span className="h-1 w-1 rounded-full bg-white/40" />
              <span className="text-gray-500">Track promises, projects, and updates</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold tracking-tight mb-4 text-white">
              Nepal{' '}
              <span className="text-white/90">Najar</span>
              <span className="text-gray-500 font-nepali text-2xl sm:text-3xl ml-2">नजर</span>
            </h1>

            <p className="text-base sm:text-lg text-gray-400 max-w-xl mx-auto mb-8 leading-relaxed">
              A clearer way to follow what is being promised, what is moving, and what is stalled.
            </p>
          </div>

          <div className="mb-8">
            <TrustLanes />
          </div>

          {/* Live stats row — REAL DATA */}
          <div className="animate-slide-up grid grid-cols-3 gap-4 max-w-lg mx-auto">
            <StatPill
              icon={<Eye className="w-4 h-4" />}
              label="Promises"
              value={stats?.total ?? '--'}
              loading={statsLoading}
            />
            <StatPill
              icon={<Newspaper className="w-4 h-4" />}
              label="Articles Scanned"
              value={articleCount ?? 0}
              loading={false}
              accent="cyan"
            />
            <StatPill
              icon={<Users className="w-4 h-4" />}
              label="Delivered"
              value={stats?.delivered ?? '--'}
              loading={statsLoading}
              accent="emerald"
            />
          </div>
        </div>
      </section>

      <div className="mx-8 h-px bg-white/[0.06] sm:mx-16 lg:mx-32" />

      {/* ═══════════════════════════════════════
         SECTION 2: LATEST SCRAPED ARTICLES (real data)
         ═══════════════════════════════════════ */}
      <section className="px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary-400" />
                {t('section.latestUpdates')}
              </h2>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-white/10 bg-white/[0.04]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-300">Latest</span>
              </span>
            </div>
          </div>

          <div className="glass-card divide-y divide-white/[0.04]">
            {articlesLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 animate-pulse flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-white/5" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-white/5 rounded w-3/4" />
                    <div className="h-3 bg-white/5 rounded w-1/2" />
                  </div>
                </div>
              ))
            ) : articles && articles.length > 0 ? (
              articles.map((article, idx) => {
                const lane =
                  article.source_type === 'government' ? 'Official' : 'Discovered';
                const classLabel =
                  article.classification === 'confirms'
                    ? 'Confirms'
                    : article.classification === 'contradicts'
                      ? 'Contradicts'
                      : 'Related';

                return (
                  <div
                    key={article.id}
                    className="flex items-start gap-4 p-4 hover:bg-white/[0.02] transition-colors duration-200"
                    style={{ animationDelay: `${idx * 60}ms` }}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
                        <Newspaper className={`w-4 h-4 ${lane === 'Official' ? 'text-red-400' : 'text-cyan-400'}`} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <a
                            href={article.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-gray-200 hover:text-white transition-colors inline-flex items-center gap-1"
                          >
                            <span className="line-clamp-1">{article.headline}</span>
                            <ExternalLink className="w-3 h-3 flex-shrink-0 text-gray-500" />
                          </a>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500">{article.source_name}</span>
                            <span className={`rounded-full border px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider ${laneBadgeStyles[lane]}`}>
                              {lane}
                            </span>
                            {article.confidence > 0 && (
                              <span className="text-[10px] text-gray-600">
                                {Math.round(article.confidence * 100)}% match
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-gray-600 whitespace-nowrap flex-shrink-0">
                          {timeAgo(article.scraped_at)}
                        </span>
                      </div>
                      {article.content_excerpt && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                          {article.content_excerpt}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-gray-500 text-sm">
                No articles scraped yet. Run the scraper from the admin panel to populate real data.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
         SECTION 3: FIRST 100 DAYS CTA
         ═══════════════════════════════════════ */}
      <section className="px-4 sm:px-6 lg:px-8 pb-12">
        <div className="max-w-5xl mx-auto">
          <Link href="/explore/first-100-days" className="block group">
            <div className="relative rounded-2xl overflow-hidden">
              <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-nepal-red/60 via-primary-500/40 to-nepal-red/60 opacity-60 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative bg-np-surface/95 backdrop-blur-xl rounded-2xl p-8 sm:p-10">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-nepal-red/20 to-primary-500/20 flex items-center justify-center">
                        <CalendarDays className="w-5 h-5 text-nepal-red" />
                      </div>
                      <span className="text-xs font-semibold tracking-widest uppercase text-nepal-red/80">
                        {t('commitment.trackerLabel')}
                      </span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-display font-bold text-white mb-2">
                      {t('commitment.first100Days')}
                    </h2>
                    <p className="text-gray-400 text-sm sm:text-base max-w-lg">
                      {t('commitment.first100DaysDesc')}
                    </p>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-4xl sm:text-5xl font-bold bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
                        {Math.abs(diffDays)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider">
                        {isBeforeInauguration ? t('commitment.daysUntil') : t('commitment.daysSince')}
                      </div>
                      <div className="text-[10px] text-gray-600 mt-0.5">{t('commitment.inauguration')}</div>
                    </div>

                    <div className="w-10 h-10 rounded-full bg-nepal-red/10 border border-nepal-red/20 flex items-center justify-center group-hover:bg-nepal-red/20 group-hover:border-nepal-red/40 transition-all duration-300">
                      <ArrowRight className="w-5 h-5 text-nepal-red group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* ═══════════════════════════════════════
         SECTION 4: MY AREA
         ═══════════════════════════════════════ */}
      <section className="px-4 sm:px-6 lg:px-8 pb-12">
        <div className="max-w-5xl mx-auto">
          {province ? (
            <Link href="/mero-ward" className="block group">
              <div className="glass-card-hover p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/15 to-cyan-500/15 flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-primary-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">
                      {district || province}
                    </h3>
                    <p className="text-sm text-gray-500">
                      See what&apos;s happening in your area
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-primary-400 transition-colors" />
              </div>
            </Link>
          ) : (
            <button onClick={() => setShowPicker(true)} className="w-full text-left">
              <div className="glass-card-hover p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/15 to-cyan-500/15 flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-primary-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">
                      What&apos;s happening in your district?
                    </h3>
                    <p className="text-sm text-gray-500">
                      Set your hometown to see local updates
                    </p>
                  </div>
                </div>
                <span className="text-xs font-medium text-primary-400 border border-primary-500/20 rounded-lg px-3 py-1.5">
                  Set Location
                </span>
              </div>
            </button>
          )}
        </div>
      </section>

      {/* Crimson divider */}
      <div className="accent-crimson mx-8 sm:mx-16 lg:mx-32" />

      {/* ═══════════════════════════════════════
         SECTION 5: FEATURED PROMISES (real data)
         ═══════════════════════════════════════ */}
      <section className="px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary-400" />
                {t('section.featuredProjects')}
              </h2>
              <p className="text-sm text-gray-500 mt-1">{t('section.featuredProjectsDesc')}</p>
            </div>
            <Link
              href="/explore/first-100-days"
              className="text-sm text-nepal-red hover:text-nepal-red/80 flex items-center gap-1 transition-colors"
            >
              {t('section.viewAll')}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {promisesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="glass-card p-6 animate-pulse">
                  <div className="h-4 bg-white/5 rounded w-3/4 mb-4" />
                  <div className="h-3 bg-white/5 rounded w-1/2 mb-3" />
                  <div className="h-2 bg-white/5 rounded w-full mb-2" />
                  <div className="h-3 bg-white/5 rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {featuredPromises.map((promise, idx) => {
                const style = statusStyles[promise.status] ?? statusStyles.not_started;
                return (
                  <Link
                    key={promise.id}
                    href={`/explore/first-100-days/${promise.slug}`}
                    className="glass-card-hover group p-6 flex flex-col"
                    style={{ animationDelay: `${idx * 80}ms` }}
                  >
                    {/* Status + signal badges */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                          {style.label}
                        </span>
                        <SignalBadge type={promise.signalType} compact />
                      </div>
                      {promise.evidenceCount > 0 && (
                        <span className="text-xs text-cyan-500/70">
                          {promise.evidenceCount} articles
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-semibold text-gray-100 group-hover:text-white transition-colors mb-1 line-clamp-2">
                      {locale === 'ne' && promise.title_ne ? promise.title_ne : promise.title}
                    </h3>

                    {/* Category */}
                    <p className="text-xs text-gray-500 mb-3">{promise.category}</p>

                    {/* Evidence indicator (replaces fake progress bar) */}
                    {promise.evidenceCount > 0 ? (
                      <div className="mb-4">
                        <div className="flex items-center gap-1.5 text-[10px] text-cyan-500/60">
                          <div className="w-1.5 h-1.5 rounded-full bg-cyan-500/40" />
                          {promise.evidenceCount} article{promise.evidenceCount !== 1 ? 's' : ''} matched
                        </div>
                      </div>
                    ) : (
                      <div className="mb-4">
                        <span className="text-[10px] text-gray-600 italic">Awaiting evidence</span>
                      </div>
                    )}

                    {/* Meta */}
                    <div className="mt-auto flex items-center justify-between text-xs text-gray-500">
                      <span>{promise.category}</span>
                      <span className={promise.status === 'not_started' ? 'text-gray-600 italic' : ''}>
                        {promise.status === 'not_started' ? 'Not yet tracked' : style.label}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════
         SECTION 6: PROMISE CATEGORIES (replaces province breakdown)
         ═══════════════════════════════════════ */}
      <section className="px-4 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-cyan-400" />
              Promises by Sector
            </h2>
            <Link
              href="/explore/first-100-days"
              className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors"
            >
              View All
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {promisesLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="glass-card p-4 animate-pulse flex items-center gap-4">
                  <div className="h-4 bg-white/5 rounded w-32" />
                  <div className="h-3 bg-white/5 rounded w-20" />
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-card divide-y divide-white/[0.04]">
              {categories.map((cat) => {
                const severityColor =
                  cat.stalled > 0 ? 'border-l-red-500'
                  : cat.inProgress > 2 ? 'border-l-emerald-500'
                  : 'border-l-amber-500';

                return (
                  <Link
                    key={cat.name}
                    href={`/explore/first-100-days?category=${cat.name}`}
                    className={`flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors border-l-2 ${severityColor}`}
                  >
                    <span className="text-sm font-medium text-gray-200 capitalize">
                      {cat.name.replace(/_/g, ' ')}
                    </span>
                    <div className="flex items-center gap-6 text-xs">
                      <span className="text-gray-400">
                        {cat.total} promises
                      </span>
                      {cat.inProgress > 0 && (
                        <span className="text-emerald-400">
                          {cat.inProgress} active
                        </span>
                      )}
                      {cat.stalled > 0 && (
                        <span className="text-red-400">
                          {cat.stalled} stalled
                        </span>
                      )}
                      <ArrowRight className="w-3.5 h-3.5 text-gray-600" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Footer accent line */}
      <div className="accent-crimson" />
    </div>
  );
}
