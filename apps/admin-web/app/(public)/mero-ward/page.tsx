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
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import {
  getProvinceScores,
  getDistrictScores,
  getNationalAverage,
  type RegionScore,
} from '@/lib/data/ward-scores';
import { usePreferencesStore } from '@/lib/stores/preferences';
import { formatNPR } from '@/lib/data/promises';
import { NEPAL_PROVINCES } from '@/lib/stores/preferences';

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
   MAIN PAGE COMPONENT
   =================================================== */
export default function MeroWardPage() {
  const { locale, t } = useI18n();
  const isNe = locale === 'ne';

  const { province: userProvince } = usePreferencesStore();
  const [expandedProvince, setExpandedProvince] = useState<string | null>(null);

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
    <div className="min-h-screen bg-np-base">
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

        <section className="public-section pt-6">
          <div className="public-shell">
            <div className="mx-auto max-w-4xl text-center">
              <div className="section-kicker mb-4">{isNe ? 'मेरो क्षेत्र' : 'My area'}</div>
              <h1 className="mb-2 text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
                {t('meroWard.title')}
              </h1>
              <p className="mb-6 text-sm text-gray-400 sm:text-base">
                {isNe
                  ? 'प्रदेश र जिल्लाको शासन स्कोर'
                  : 'Province & district governance scores'}
              </p>

              {userScore && (
                <div className="mb-6 inline-flex items-center gap-3 glass-card px-6 py-3">
                  <MapPin className="w-4 h-4 text-primary-400" />
                  <span className="text-sm text-gray-300">
                    {isNe ? userScore.province_ne : userScore.province}
                  </span>
                  <span className={`text-2xl font-bold ${getScoreColor(userScore.score)}`}>
                    {userScore.score}
                  </span>
                  <span className="text-xs text-gray-500">
                    #{userScore.rank}
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>

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
                  {isNe ? 'राष्ट्रिय औसत' : 'National Avg'}
                </div>
              </div>

              {/* Top Province */}
              <div className="glass-card p-4 text-center">
                <Trophy className="w-5 h-5 text-amber-400 mx-auto mb-2" />
                <div className="text-sm font-semibold text-white truncate">
                  {isNe ? provinceScores[0]?.province_ne : provinceScores[0]?.province}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {isNe ? 'शीर्ष प्रदेश' : 'Top Province'}
                </div>
              </div>

              {/* Total Projects */}
              <div className="glass-card p-4 text-center">
                <MapPin className="w-5 h-5 text-cyan-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">
                  {provinceScores.reduce((s, p) => s + p.projectCount, 0)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {isNe ? 'कुल परियोजना' : 'Total Projects'}
                </div>
              </div>

              {/* Total Delayed */}
              <div className="glass-card p-4 text-center">
                <AlertTriangle className="w-5 h-5 text-amber-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-amber-400">
                  {provinceScores.reduce((s, p) => s + p.delayedCount, 0)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {isNe ? 'ढिला भएका' : 'Delayed'}
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
                <span className="flex-1">{isNe ? 'प्रदेश' : 'Province'}</span>
                <span className="w-12 text-right">{isNe ? 'स्कोर' : 'Score'}</span>
                <span className="w-28">{isNe ? 'प्रगति' : 'Progress'}</span>
                <span className="w-16 text-right">{isNe ? 'परियोजना' : 'Projects'}</span>
                <span className="w-14 text-right">{isNe ? 'ढिला' : 'Delayed'}</span>
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
                              {isNe ? 'मेरो' : 'Mine'}
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
                          {province.projectCount} {isNe ? 'परियोजना' : 'projects'}
                        </span>
                        {province.delayedCount > 0 && (
                          <span className="text-xs text-amber-400/70">
                            {province.delayedCount} {isNe ? 'ढिला' : 'delayed'}
                          </span>
                        )}
                      </div>
                    )}

                    {/* District Drill-Down */}
                    {isExpanded && (
                      <div className="border-b border-white/[0.06] bg-white/[0.01]">
                        <div className="px-5 py-2 flex items-center gap-2 border-b border-white/[0.04]">
                          <span className="text-[10px] uppercase tracking-widest text-gray-600">
                            {isNe ? 'जिल्लाहरू' : 'Districts'}
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

        {/* Footer accent line */}
        <div className="h-px bg-gradient-to-r from-transparent via-primary-500/30 to-transparent" />
      </div>
    </div>
  );
}
