'use client';

import { useDashboardOverview, useNationalDashboard, useProjects } from '@/lib/hooks/use-projects';
import Link from 'next/link';
import {
  Search,
  TrendingUp,
  Activity,
  MapPin,
  Building2,
  ArrowRight,
  Clock,
  CalendarDays,
  AlertTriangle,
  CheckCircle2,
  Milestone,
  Wrench,
  Star,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { NajarIndexDial } from '@/components/public/najar-index-dial';
import { DailyStreak } from '@/components/public/daily-streak';
import { MeroWardCard } from '@/components/public/mero-ward-card';

/* ═══════════════════════════════════════════════
   STATUS BADGE CONFIG
   ═══════════════════════════════════════════════ */
const statusStyles: Record<string, { bg: string; text: string; dot: string }> = {
  active:    { bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  completed: { bg: 'bg-blue-500/15',    text: 'text-blue-400',    dot: 'bg-blue-400' },
  suspended: { bg: 'bg-amber-500/15',   text: 'text-amber-400',   dot: 'bg-amber-400' },
  draft:     { bg: 'bg-gray-500/15',    text: 'text-gray-400',    dot: 'bg-gray-400' },
  cancelled: { bg: 'bg-red-500/15',     text: 'text-red-400',     dot: 'bg-red-400' },
};

/* ═══════════════════════════════════════════════
   PROVINCE EMOJI MAP
   ═══════════════════════════════════════════════ */
const provinceEmoji: Record<string, string> = {
  'Koshi': '\u{1F3D4}',
  'Madhesh': '\u{1F33E}',
  'Bagmati': '\u{1F3DB}',
  'Gandaki': '\u{1F3DE}',
  'Lumbini': '\u{1F549}',
  'Karnali': '\u{1F985}',
  'Sudurpashchim': '\u{1F304}',
};

/* ═══════════════════════════════════════════════
   MOCK "WHAT CHANGED TODAY" DATA
   ═══════════════════════════════════════════════ */
const recentUpdates = [
  {
    id: '1',
    icon: CheckCircle2,
    iconColor: 'text-emerald-400',
    action: 'Milestone completed',
    project: 'Kathmandu Ring Road Expansion',
    detail: 'Phase 2 construction reached 100%',
    time: '2 hours ago',
  },
  {
    id: '2',
    icon: AlertTriangle,
    iconColor: 'text-amber-400',
    action: 'Blocker resolved',
    project: 'Pokhara International Airport',
    detail: 'Land acquisition dispute settled',
    time: '4 hours ago',
  },
  {
    id: '3',
    icon: TrendingUp,
    iconColor: 'text-cyan-400',
    action: 'Progress updated',
    project: 'Melamchi Water Supply',
    detail: 'Progress increased from 78% to 84%',
    time: '5 hours ago',
  },
  {
    id: '4',
    icon: Milestone,
    iconColor: 'text-blue-400',
    action: 'New milestone added',
    project: 'Nijgadh Smart City',
    detail: 'Environmental impact assessment scheduled',
    time: '8 hours ago',
  },
  {
    id: '5',
    icon: Wrench,
    iconColor: 'text-purple-400',
    action: 'Status changed to Active',
    project: 'East-West Railway Phase 1',
    detail: 'Project resumed after budget approval',
    time: '12 hours ago',
  },
  {
    id: '6',
    icon: Star,
    iconColor: 'text-yellow-400',
    action: 'Project launched',
    project: 'Digital Nepal Framework',
    detail: 'National digital infrastructure initiative begins',
    time: '1 day ago',
  },
];

/* ═══════════════════════════════════════════════
   PROGRESS RING COMPONENT
   ═══════════════════════════════════════════════ */
function ProgressRing({ progress, size = 56 }: { progress: number; size?: number }) {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-semibold text-gray-200">{Math.round(progress)}%</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   STAT PILL COMPONENT
   ═══════════════════════════════════════════════ */
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
  accent?: 'emerald' | 'cyan' | 'purple';
}) {
  const accentColor =
    accent === 'emerald'
      ? 'text-emerald-400'
      : accent === 'cyan'
        ? 'text-cyan-400'
        : accent === 'purple'
          ? 'text-purple-400'
          : 'text-primary-400';

  return (
    <div className="glass-card px-4 py-3 flex flex-col items-center gap-1">
      <div className={`${accentColor} mb-0.5`}>{icon}</div>
      {loading ? (
        <div className="h-6 w-12 bg-white/5 rounded animate-pulse" />
      ) : (
        <span className="text-xl font-bold text-white animate-count-up">{value ?? '--'}</span>
      )}
      <span className="text-[10px] uppercase tracking-wider text-gray-500">{label}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════ */
export default function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const { locale, t } = useI18n();

  // Data hooks
  const { data: overview, isLoading: overviewLoading } = useDashboardOverview();
  const { data: projectsData, isLoading: projectsLoading } = useProjects({ limit: 6 });
  const { data: nationalData, isLoading: nationalLoading } = useNationalDashboard();

  // Balen countdown
  const inaugurationDate = new Date('2026-04-01');
  const today = new Date();
  const diffTime = inaugurationDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const isBeforeInauguration = diffDays > 0;

  const regionBreakdown = (nationalData as any)?.regionBreakdown ?? [];
  const projects = projectsData?.data ?? [];

  // Helper to get province display name
  const getProvinceName = (shortName: string) => {
    if (locale === 'ne') {
      return t(`province.${shortName}`);
    }
    return shortName;
  };

  // Helper to get status label
  const getStatusLabel = (status: string) => {
    return t(`status.${status}`);
  };

  return (
    <div className="min-h-screen bg-np-base">
      {/* Ambient glow effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary-500/[0.05] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-500/[0.05] rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-primary-600/[0.03] rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10">
        {/* ═══════════════════════════════════════
           SECTION 1: HERO
           ═══════════════════════════════════════ */}
        <section className="relative pt-16 pb-12 px-4 sm:px-6 lg:px-8">
          {/* Hero glow */}
          <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-primary-500/[0.08] via-transparent to-transparent" />

          <div className="relative max-w-6xl mx-auto text-center">
            {/* Title */}
            <div className="animate-fade-in">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-4">
                <span className="bg-gradient-to-r from-primary-400 via-cyan-400 to-primary-300 bg-clip-text text-transparent">
                  {t('hero.title')}
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10">
                {t('hero.tagline')}
              </p>
            </div>

            {/* Search bar */}
            <div className="animate-slide-up max-w-2xl mx-auto mb-12">
              <div className="glass-card group relative flex items-center px-5 py-4 transition-all duration-300 hover:border-primary-500/30 focus-within:border-primary-500/40 focus-within:shadow-glow-sm">
                <Search className="w-5 h-5 text-gray-500 group-focus-within:text-primary-400 transition-colors mr-3 flex-shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('hero.searchPlaceholder')}
                  className="w-full bg-transparent text-gray-200 placeholder-gray-500 outline-none text-base"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-gray-500 hover:text-gray-300 ml-2 text-sm"
                  >
                    {t('common.clear')}
                  </button>
                )}
              </div>
            </div>

            {/* Live stats row */}
            <div className="animate-slide-up grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
              <StatPill
                icon={<Layers className="w-4 h-4" />}
                label={t('stats.totalProjects')}
                value={overview?.totalProjects}
                loading={overviewLoading}
              />
              <StatPill
                icon={<Activity className="w-4 h-4" />}
                label={t('stats.active')}
                value={overview?.totalActive}
                loading={overviewLoading}
                accent="emerald"
              />
              <StatPill
                icon={<TrendingUp className="w-4 h-4" />}
                label={t('stats.avgProgress')}
                value={overview ? `${Math.round(overview.overallProgress)}%` : undefined}
                loading={overviewLoading}
                accent="cyan"
              />
              <StatPill
                icon={<MapPin className="w-4 h-4" />}
                label={t('stats.provinces')}
                value={7}
                loading={false}
                accent="purple"
              />
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════
           SECTION 2: BALEN'S FIRST 100 DAYS
           ═══════════════════════════════════════ */}
        <section className="px-4 sm:px-6 lg:px-8 pb-16">
          <div className="max-w-6xl mx-auto">
            <Link href="/explore/first-100-days" className="block group">
              <div className="relative rounded-2xl overflow-hidden">
                {/* Animated gradient border */}
                <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-primary-500 via-cyan-400 to-primary-600 opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
                <div
                  className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-cyan-400 via-primary-500 to-cyan-400 opacity-30 animate-shimmer"
                  style={{ backgroundSize: '200% 100%' }}
                />

                <div className="relative bg-np-surface/95 backdrop-blur-xl rounded-2xl p-8 sm:p-10">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-cyan-500 flex items-center justify-center shadow-glow-sm">
                          <CalendarDays className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xs font-semibold tracking-widest uppercase text-primary-400">
                          {t('commitment.trackerLabel')}
                        </span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                        {t('commitment.first100Days')}
                      </h2>
                      <p className="text-gray-400 text-sm sm:text-base max-w-lg">
                        {t('commitment.first100DaysDesc')}
                      </p>
                    </div>

                    <div className="flex items-center gap-6">
                      {/* Countdown */}
                      <div className="text-center">
                        <div className="text-4xl sm:text-5xl font-bold bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
                          {Math.abs(diffDays)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider">
                          {isBeforeInauguration ? t('commitment.daysUntil') : t('commitment.daysSince')}
                        </div>
                        <div className="text-[10px] text-gray-600 mt-0.5">{t('commitment.inauguration')}</div>
                      </div>

                      {/* Arrow */}
                      <div className="w-10 h-10 rounded-full bg-primary-500/10 border border-primary-500/20 flex items-center justify-center group-hover:bg-primary-500/20 group-hover:border-primary-500/40 transition-all duration-300">
                        <ArrowRight className="w-5 h-5 text-primary-400 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* ═══════════════════════════════════════
           ENGAGEMENT STRIP: Index + Streak + Ward
           ═══════════════════════════════════════ */}
        <section className="px-4 sm:px-6 lg:px-8 pb-12">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <NajarIndexDial variant="compact" />
              <DailyStreak />
              <MeroWardCard />
            </div>

            {/* Report Card CTA */}
            <div className="mt-4">
              <Link
                href="/report-card"
                className="glass-card-hover flex items-center justify-between p-4 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                    <Star className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-white">{t('reportCard.weeklyReport')}</span>
                    <span className="text-xs text-gray-500 block">{t('reportCard.shareDesc')}</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-primary-400 transition-colors" />
              </Link>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════
           SECTION 3: FEATURED PROJECTS
           ═══════════════════════════════════════ */}
        <section className="px-4 sm:px-6 lg:px-8 pb-16">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary-400" />
                  {t('section.featuredProjects')}
                </h2>
                <p className="text-sm text-gray-500 mt-1">{t('section.featuredProjectsDesc')}</p>
              </div>
              <Link
                href="/explore/projects"
                className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors"
              >
                {t('section.viewAll')}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {projectsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="glass-card p-6 animate-pulse">
                    <div className="h-4 bg-white/5 rounded w-3/4 mb-4" />
                    <div className="h-3 bg-white/5 rounded w-1/2 mb-3" />
                    <div className="h-2 bg-white/5 rounded w-full mb-2" />
                    <div className="h-3 bg-white/5 rounded w-1/3" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {projects.map((project, idx) => {
                  const style = statusStyles[project.status] ?? statusStyles.draft;
                  return (
                    <Link
                      key={project.id}
                      href={`/explore/projects/${project.slug || project.id}`}
                      className="glass-card-hover group p-6 flex flex-col"
                      style={{ animationDelay: `${idx * 80}ms` }}
                    >
                      {/* Status badge */}
                      <div className="flex items-center justify-between mb-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                          {getStatusLabel(project.status)}
                        </span>
                        <span className="text-xs text-gray-600">
                          {Math.round(project.progress)}%
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-base font-semibold text-gray-100 group-hover:text-white transition-colors mb-3 line-clamp-2">
                        {project.title}
                      </h3>

                      {/* Progress bar */}
                      <div className="mb-4">
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full animate-progress-fill"
                            style={{
                              width: `${project.progress}%`,
                              background: 'linear-gradient(90deg, #3b82f6, #22d3ee)',
                            }}
                          />
                        </div>
                      </div>

                      {/* Meta info */}
                      <div className="mt-auto flex items-center gap-4 text-xs text-gray-500">
                        {project.region && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {project.region.name}
                          </span>
                        )}
                        {project.government_unit && (
                          <span className="flex items-center gap-1 truncate">
                            <Building2 className="w-3 h-3" />
                            {project.government_unit.name}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ═══════════════════════════════════════
           SECTION 4: PROVINCE QUICK CARDS
           ═══════════════════════════════════════ */}
        <section className="px-4 sm:px-6 lg:px-8 pb-16">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-cyan-400" />
                  {t('section.developmentByProvince')}
                </h2>
                <p className="text-sm text-gray-500 mt-1">{t('section.developmentByProvinceDesc')}</p>
              </div>
              <Link
                href="/explore/map"
                className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors"
              >
                {t('section.viewMap')}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {nationalLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="glass-card p-5 animate-pulse">
                    <div className="h-4 bg-white/5 rounded w-2/3 mb-3" />
                    <div className="h-8 bg-white/5 rounded-full w-8 mb-2" />
                    <div className="h-3 bg-white/5 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {regionBreakdown.map(
                  (
                    province: {
                      name: string;
                      total: number;
                      delayed: number;
                      severity: string;
                    },
                    idx: number,
                  ) => {
                    // Strip " Province" suffix for display and emoji lookup
                    const shortName = province.name.replace(' Province', '');
                    const severityColors: Record<string, { bg: string; text: string; border: string }> = {
                      low:      { bg: 'rgba(16,185,129,0.08)', text: 'text-emerald-400', border: 'rgba(16,185,129,0.2)' },
                      medium:   { bg: 'rgba(245,158,11,0.08)', text: 'text-amber-400',   border: 'rgba(245,158,11,0.2)' },
                      high:     { bg: 'rgba(249,115,22,0.08)', text: 'text-orange-400',  border: 'rgba(249,115,22,0.2)' },
                      critical: { bg: 'rgba(239,68,68,0.1)',   text: 'text-red-400',     border: 'rgba(239,68,68,0.3)' },
                    };
                    const sev = severityColors[province.severity] ?? severityColors.low;

                    return (
                      <Link
                        key={province.name}
                        href="/explore/map"
                        className="glass-card-interactive p-5 flex flex-col items-center text-center"
                        style={{ animationDelay: `${idx * 60}ms` }}
                      >
                        {/* Province emoji */}
                        <span className="text-2xl mb-2">
                          {provinceEmoji[shortName] ?? '\u{1F3D4}'}
                        </span>

                        {/* Name */}
                        <h3 className="text-sm font-semibold text-gray-200 mb-3">
                          {getProvinceName(shortName)}
                        </h3>

                        {/* Severity indicator */}
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center mb-2"
                          style={{
                            background: sev.bg,
                            border: `2px solid ${sev.border}`,
                          }}
                        >
                          <span className={`text-lg font-bold ${sev.text}`}>{province.total}</span>
                        </div>

                        {/* Stats */}
                        <div className="mt-2 space-y-1 w-full">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">{t('province.projects')}</span>
                            <span className="text-gray-300 font-medium">{province.total}</span>
                          </div>
                          {province.delayed > 0 && (
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-500">{t('province.delayed')}</span>
                              <span className="text-amber-400 font-medium">{province.delayed}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">{t('province.status')}</span>
                            <span className={`font-medium capitalize ${sev.text}`}>{t(`map.${province.severity}`)}</span>
                          </div>
                        </div>
                      </Link>
                    );
                  },
                )}
              </div>
            )}
          </div>
        </section>

        {/* ═══════════════════════════════════════
           SECTION 5: WHAT CHANGED TODAY
           ═══════════════════════════════════════ */}
        <section className="px-4 sm:px-6 lg:px-8 pb-20">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary-400" />
                {t('section.latestUpdates')}
              </h2>
              <p className="text-sm text-gray-500 mt-1">{t('section.latestUpdatesDesc')}</p>
            </div>

            <div className="glass-card divide-y divide-white/[0.04]">
              {recentUpdates.map((update, idx) => {
                const Icon = update.icon;
                return (
                  <div
                    key={update.id}
                    className="flex items-start gap-4 p-5 hover:bg-white/[0.02] transition-colors duration-200"
                    style={{ animationDelay: `${idx * 60}ms` }}
                  >
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center">
                        <Icon className={`w-4 h-4 ${update.iconColor}`} />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="text-sm font-medium text-gray-200">
                            {update.action}
                          </span>
                          <span className="text-sm text-gray-500 mx-1.5">&middot;</span>
                          <span className="text-sm text-primary-400">{update.project}</span>
                        </div>
                        <span className="text-xs text-gray-600 whitespace-nowrap flex-shrink-0">
                          {update.time}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{update.detail}</p>
                    </div>
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
