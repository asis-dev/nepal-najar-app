'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  MapPin,
  BarChart3,
  AlertTriangle,
  Trophy,
  Megaphone,
  ArrowRight,
  ChevronUp,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  ClipboardList,
  Star,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import {
  getProvinceScores,
  getDistrictScores,
  getNationalAverage,
  type RegionScore,
} from '@/lib/data/ward-scores';
import { PublicPageHero } from '@/components/public/page-hero';
import { usePreferencesStore } from '@/lib/stores/preferences';
import { formatNPR } from '@/lib/data/promises';
import { NEPAL_PROVINCES } from '@/lib/stores/preferences';
import { useTrendingProposals } from '@/lib/hooks/use-proposals';
import { WardScorecard } from '@/components/public/ward-scorecard';
import { WardReportForm } from '@/components/public/ward-report-form';
import { LeaderboardWidget } from '@/components/public/leaderboard-widget';
import { useWardReports, type WardReport } from '@/lib/hooks/use-ward-reports';
import { useAuth } from '@/lib/hooks/use-auth';

/* ===================================================
   TREND ICON
   =================================================== */
function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
  if (trend === 'down') return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
  return <Minus className="w-3.5 h-3.5 text-gray-500" />;
}

/* ===================================================
   SCORE COLOR
   =================================================== */
function getScoreColor(score: number): string {
  if (score >= 70) return 'text-emerald-400';
  if (score >= 50) return 'text-cyan-400';
  if (score >= 35) return 'text-amber-400';
  return 'text-red-400';
}

function getBarGradient(score: number): string {
  if (score >= 70) return 'from-emerald-500 to-emerald-400';
  if (score >= 50) return 'from-cyan-500 to-cyan-400';
  if (score >= 35) return 'from-amber-500 to-amber-400';
  return 'from-red-500 to-red-400';
}

/* ===================================================
   RANK BADGE
   =================================================== */
function RankBadge({ rank }: { rank: number }) {
  const styles =
    rank === 1
      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
      : rank === 2
        ? 'bg-gray-400/20 text-gray-300 border-gray-400/30'
        : rank === 3
          ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
          : 'bg-white/[0.04] text-gray-500 border-white/[0.06]';

  return (
    <span
      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border ${styles}`}
    >
      {rank}
    </span>
  );
}

/* ===================================================
   DISTRICT ROW
   =================================================== */
function DistrictRow({ district, isNe }: { district: RegionScore; isNe: boolean }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
      {/* Indent + rank */}
      <div className="w-4" />
      <span className="text-xs text-gray-600 w-5 text-right tabular-nums">{district.rank}</span>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <span className="text-sm text-gray-300 truncate block">
          {district.district}
        </span>
      </div>

      {/* Score */}
      <span className={`text-sm font-bold tabular-nums ${getScoreColor(district.score)}`}>
        {district.score}
      </span>

      {/* Mini progress bar */}
      <div className="hidden sm:block w-20">
        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${getBarGradient(district.score)}`}
            style={{ width: `${district.score}%` }}
          />
        </div>
      </div>

      {/* Projects */}
      <span className="text-xs text-gray-500 w-8 text-right tabular-nums">{district.projectCount}</span>

      {/* Delayed */}
      <span className="text-xs text-amber-400/70 w-6 text-right tabular-nums">
        {district.delayedCount > 0 ? district.delayedCount : '-'}
      </span>

      {/* Trend */}
      <TrendIcon trend={district.trend} />
    </div>
  );
}

/* ===================================================
   COMMUNITY PROPOSALS SECTION
   =================================================== */
function CommunityProposalsSection({ province, isNe }: { province: string | null; isNe: boolean }) {
  const { data: proposals, isLoading } = useTrendingProposals(3);

  // Filter to user's province if set
  const filtered = province
    ? (proposals ?? []).filter((p) => p.province === province)
    : (proposals ?? []);
  const display = filtered.length > 0 ? filtered.slice(0, 3) : (proposals ?? []).slice(0, 3);

  if (isLoading || display.length === 0) return null;

  return (
    <section className="px-4 sm:px-6 lg:px-8 pb-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-primary-400" />
            Community Proposals
          </h2>
          <Link
            href="/proposals"
            className="text-xs text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-1"
          >
            View All <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="space-y-2">
          {display.map((proposal) => {
            const netVotes = proposal.upvote_count - proposal.downvote_count;
            return (
              <Link
                key={proposal.id}
                href={`/proposals/${proposal.id}`}
                className="block glass-card p-4 hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                    <span className={`text-xs font-bold tabular-nums ${netVotes > 0 ? 'text-emerald-400' : 'text-gray-500'}`}>
                      {netVotes}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">
                      {isNe && proposal.title_ne ? proposal.title_ne : proposal.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {proposal.province}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {proposal.comment_count}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ===================================================
   RECENT REPORTS SECTION
   =================================================== */
function RecentReportsSection({ province, district, isNe }: { province: string | null; district: string | null; isNe: boolean }) {
  const { t } = useI18n();
  const { data: reports, isLoading } = useWardReports(province, district);

  if (isLoading || !reports || reports.length === 0) return null;

  const TOPIC_ICONS: Record<string, string> = {
    roads: '\u{1F6E3}\uFE0F', water: '\u{1F4A7}', electricity: '\u26A1',
    health: '\u{1F3E5}', education: '\u{1F4DA}', sanitation: '\u{1F6BF}',
    internet: '\u{1F4F6}', safety: '\u{1F512}', employment: '\u{1F4BC}',
    other: '\u{1F4E6}',
  };

  return (
    <section className="px-4 sm:px-6 lg:px-8 pb-8">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
          <ClipboardList className="w-4 h-4 text-primary-400" />
          {t('ward.recentReports')}
        </h2>
        <div className="space-y-2">
          {reports.slice(0, 5).map((report: WardReport) => (
            <div key={report.id} className="glass-card p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0 mt-0.5">
                  {TOPIC_ICONS[report.topic] || '\u{1F4E6}'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-200 capitalize">
                      {report.topic}
                    </span>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3 h-3 ${
                            s <= report.rating
                              ? report.rating >= 4 ? 'text-emerald-400 fill-emerald-400' : report.rating >= 3 ? 'text-amber-400 fill-amber-400' : 'text-red-400 fill-red-400'
                              : 'text-gray-700'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  {report.description && (
                    <p className="text-sm text-gray-400 line-clamp-2 mb-1.5">
                      {report.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{report.author_name || 'Anonymous'}</span>
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3" />
                      {report.agree_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <ThumbsDown className="w-3 h-3" />
                      {report.disagree_count}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ===================================================
   MAIN PAGE COMPONENT
   =================================================== */
export default function MeroWardPage() {
  const { locale, t } = useI18n();
  const isNe = locale === 'ne';

  const { province: userProvince, district: userDistrict } = usePreferencesStore();
  const { isAuthenticated } = useAuth();
  const [expandedProvince, setExpandedProvince] = useState<string | null>(null);
  const [showReportForm, setShowReportForm] = useState(false);

  const provinceScores = useMemo(() => getProvinceScores(), []);
  const nationalAvg = useMemo(() => getNationalAverage(), []);

  const expandedDistricts = useMemo(() => {
    if (!expandedProvince) return [];
    return getDistrictScores(expandedProvince);
  }, [expandedProvince]);

  function toggleProvince(name: string) {
    setExpandedProvince((prev) => (prev === name ? null : name));
  }

  // Get the user's province score
  const userScore = userProvince
    ? provinceScores.find((p) => p.province === userProvince)
    : null;

  return (
    <div className="public-page">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 h-[520px] w-[520px] rounded-full bg-primary-500/[0.045] blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[420px] w-[420px] rounded-full bg-cyan-500/[0.04] blur-[100px]" />
      </div>

      <div className="relative z-10">
        <div className="public-shell pt-6">
          <div className="mx-auto max-w-4xl">
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-primary-400 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('common.back')}
            </Link>
          </div>
        </div>

        <PublicPageHero
          eyebrow={t('meroWard.myArea')}
          title={t('meroWard.title')}
          description={t('meroWard.pageDesc')}
          centered
          stats={
            userScore ? (
              <div className="glass-card mx-auto flex w-full max-w-sm items-center justify-center gap-3 px-5 py-3">
                <MapPin className="h-4 w-4 text-primary-400" />
                <span className="text-sm text-gray-300">
                  {isNe ? userScore.province_ne : userScore.province}
                </span>
                <span className={`text-2xl font-bold ${getScoreColor(userScore.score)}`}>
                  {userScore.score}
                </span>
                <span className="text-xs text-gray-500">#{userScore.rank}</span>
              </div>
            ) : null
          }
        />

        <section className="public-section pt-0">
          <div className="public-shell">
            <div className="mx-auto max-w-4xl">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {/* National Average */}
              <div className="glass-card p-4 text-center">
                <BarChart3 className="w-5 h-5 text-primary-400 mx-auto mb-2" />
                <div className={`text-2xl font-bold ${getScoreColor(nationalAvg)}`}>
                  {nationalAvg}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {t('meroWard.nationalAverage')}
                </div>
              </div>

              {/* Top Province */}
              <div className="glass-card p-4 text-center">
                <Trophy className="w-5 h-5 text-amber-400 mx-auto mb-2" />
                <div className="text-sm font-semibold text-white truncate">
                  {isNe ? provinceScores[0]?.province_ne : provinceScores[0]?.province}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {t('meroWard.topProvince')}
                </div>
              </div>

              {/* Total Projects */}
              <div className="glass-card p-4 text-center">
                <MapPin className="w-5 h-5 text-cyan-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">
                  {provinceScores.reduce((s, p) => s + p.projectCount, 0)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {t('meroWard.totalProjects')}
                </div>
              </div>

              {/* Total Delayed */}
              <div className="glass-card p-4 text-center">
                <AlertTriangle className="w-5 h-5 text-amber-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-amber-400">
                  {provinceScores.reduce((s, p) => s + p.delayedCount, 0)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {t('meroWard.delayed')}
                </div>
              </div>
              </div>
            </div>
          </div>
        </section>

        {/* Province Leaderboard */}
        <section className="px-4 sm:px-6 lg:px-8 pb-16">
          <div className="max-w-4xl mx-auto">
            <div className="glass-card overflow-hidden">
              {/* Table header */}
              <div className="hidden sm:flex items-center gap-3 px-5 py-3 border-b border-white/[0.06] text-xs text-gray-500 uppercase tracking-wider">
                <span className="w-7" />
                <span className="flex-1">{t('meroWard.province')}</span>
                <span className="w-12 text-right">{t('meroWard.score')}</span>
                <span className="w-28">{t('meroWard.progress')}</span>
                <span className="w-16 text-right">{t('meroWard.totalProjects')}</span>
                <span className="w-14 text-right">{t('meroWard.delayed')}</span>
                <span className="w-6" />
                <span className="w-6" />
              </div>

              {/* Province Rows */}
              {provinceScores.map((province) => {
                const isExpanded = expandedProvince === province.province;
                const isUserProvince = userProvince === province.province;

                return (
                  <div key={province.province}>
                    {/* Province Row */}
                    <button
                      onClick={() => toggleProvince(province.province)}
                      className={`w-full flex items-center gap-3 px-5 py-4 border-b border-white/[0.04] transition-all duration-200 hover:bg-white/[0.03] text-left ${
                        isUserProvince
                          ? 'bg-primary-500/[0.06] border-l-2 border-l-primary-500/50 shadow-[inset_0_0_30px_rgba(59,130,246,0.04)]'
                          : ''
                      } ${isExpanded ? 'bg-white/[0.02]' : ''}`}
                    >
                      {/* Rank */}
                      <RankBadge rank={province.rank} />

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm sm:text-base font-semibold text-gray-100 truncate">
                            {isNe ? province.province_ne : province.province}
                          </span>
                          {isUserProvince && (
                            <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded text-[9px] font-medium bg-primary-500/20 text-primary-400 border border-primary-500/30">
                              {t('meroWard.mine')}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 sm:hidden">
                          {isNe ? province.province : province.province_ne}
                        </span>
                      </div>

                      {/* Score */}
                      <span className={`text-lg sm:text-xl font-bold tabular-nums ${getScoreColor(province.score)}`}>
                        {province.score}
                      </span>

                      {/* Progress bar */}
                      <div className="hidden sm:block w-28">
                        <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${getBarGradient(province.score)} transition-all duration-700`}
                            style={{ width: `${province.score}%` }}
                          />
                        </div>
                      </div>

                      {/* Projects */}
                      <span className="hidden sm:block text-sm text-gray-300 w-16 text-right tabular-nums">
                        {province.projectCount}
                      </span>

                      {/* Delayed */}
                      <span className="hidden sm:block text-sm text-amber-400/70 w-14 text-right tabular-nums">
                        {province.delayedCount}
                      </span>

                      {/* Trend */}
                      <TrendIcon trend={province.trend} />

                      {/* Expand icon */}
                      <div className="w-5 flex-shrink-0">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-500" />
                        )}
                      </div>
                    </button>

                    {/* Mobile: extra stats row */}
                    {!isExpanded && (
                      <div className="sm:hidden flex items-center gap-4 px-5 pb-3 -mt-1 border-b border-white/[0.04]">
                        <div className="flex-1">
                          <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${getBarGradient(province.score)}`}
                              style={{ width: `${province.score}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-xs text-gray-500">
                          {province.projectCount} {t('meroWard.projects')}
                        </span>
                        {province.delayedCount > 0 && (
                          <span className="text-xs text-amber-400/70">
                            {province.delayedCount} {t('meroWard.delayed')}
                          </span>
                        )}
                      </div>
                    )}

                    {/* District Drill-Down */}
                    {isExpanded && (
                      <div className="border-b border-white/[0.06] bg-white/[0.01]">
                        <div className="px-5 py-2 flex items-center gap-2 border-b border-white/[0.04]">
                          <span className="text-[10px] uppercase tracking-widest text-gray-600">
                            {t('meroWard.districts')}
                          </span>
                          <span className="text-[10px] text-gray-600">
                            ({expandedDistricts.length})
                          </span>
                        </div>
                        {expandedDistricts.map((district) => (
                          <DistrictRow
                            key={district.district}
                            district={district}
                            isNe={isNe}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Ward Scorecard + Report Form */}
        <section className="px-4 sm:px-6 lg:px-8 pb-8">
          <div className="max-w-4xl mx-auto">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Scorecard */}
              <WardScorecard
                province={userProvince}
                district={userDistrict}
                onRateClick={() => setShowReportForm(true)}
              />

              {/* Report Form or CTA */}
              {showReportForm ? (
                <WardReportForm
                  onClose={() => setShowReportForm(false)}
                  onSuccess={() => {
                    // Keep form open for success message
                  }}
                />
              ) : (
                <div className="glass-card p-6 flex flex-col items-center justify-center text-center">
                  <ClipboardList className="w-10 h-10 text-primary-400 mb-3" />
                  <h3 className="text-base font-semibold text-white mb-2">
                    {t('ward.reportFromMyWard')}
                  </h3>
                  <p className="text-sm text-gray-400 mb-4">
                    {t('ward.shareRealSituation')}
                  </p>
                  <button
                    onClick={() => setShowReportForm(true)}
                    className="px-6 py-3 rounded-xl text-sm font-semibold bg-primary-500/20 text-primary-300 border border-primary-500/30 hover:bg-primary-500/30 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] transition-all duration-300"
                  >
                    {t('ward.submitAReport')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Recent Reports */}
        <RecentReportsSection province={userProvince} district={userDistrict} isNe={isNe} />

        {/* Leaderboard Widget — How your area compares */}
        <section className="px-4 sm:px-6 lg:px-8 pb-8">
          <div className="max-w-4xl mx-auto">
            <LeaderboardWidget
              type="areas"
              title={t('ward.howYourAreaCompares')}
              limit={5}
            />
          </div>
        </section>

        {/* Community Proposals Section */}
        <CommunityProposalsSection province={userProvince} isNe={isNe} />

        {/* Footer accent line */}
        <div className="h-px bg-gradient-to-r from-transparent via-primary-500/30 to-transparent" />
      </div>
    </div>
  );
}
