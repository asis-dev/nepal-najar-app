'use client';

import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { BarChart3, TrendingUp, Eye, FileText } from 'lucide-react';
import { Breadcrumb } from '@/components/public/breadcrumb';
import { useAllPromises, usePromiseStats } from '@/lib/hooks/use-promises';
import { useI18n } from '@/lib/i18n';
import { CATEGORY_NE, type PromiseCategory, type PromiseStatus } from '@/lib/data/promises';

/* ═══════════════════════════════════════════
   CHART COLORS
   ═══════════════════════════════════════════ */
const STATUS_COLORS: Record<PromiseStatus, string> = {
  not_started: '#6b7280',
  in_progress: '#10b981',
  delivered: '#3b82f6',
  stalled: '#ef4444',
};

const STATUS_LABELS: Record<PromiseStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  delivered: 'Delivered',
  stalled: 'Stalled',
};

/* ═══════════════════════════════════════════
   CUSTOM TOOLTIP
   ═══════════════════════════════════════════ */
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ color: string; name: string; value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card px-3 py-2 text-xs border border-white/10">
      <p className="text-white font-medium mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   PROVINCE DATA (hardcoded — no province field on promises)
   ═══════════════════════════════════════════ */
const PROVINCES = [
  { name: 'Koshi', name_ne: 'कोशी', promises: 5, progress: 12, delivered: 0, stalled: 0 },
  { name: 'Madhesh', name_ne: 'मधेश', promises: 4, progress: 8, delivered: 0, stalled: 0 },
  { name: 'Bagmati', name_ne: 'बागमती', promises: 8, progress: 18, delivered: 0, stalled: 1 },
  { name: 'Gandaki', name_ne: 'गण्डकी', promises: 4, progress: 10, delivered: 0, stalled: 0 },
  { name: 'Lumbini', name_ne: 'लुम्बिनी', promises: 4, progress: 6, delivered: 0, stalled: 0 },
  { name: 'Karnali', name_ne: 'कर्णाली', promises: 3, progress: 5, delivered: 0, stalled: 0 },
  { name: 'Sudurpashchim', name_ne: 'सुदूरपश्चिम', promises: 3, progress: 4, delivered: 0, stalled: 0 },
];

/* ═══════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════ */
export default function AnalyticsPage() {
  const { locale } = useI18n();
  const { data: promises, isLoading } = useAllPromises();
  const { stats } = usePromiseStats();

  /* ── Computed chart data ── */

  // Status distribution for pie chart
  const statusData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: 'Not Started', value: stats.notStarted, color: STATUS_COLORS.not_started },
      { name: 'In Progress', value: stats.inProgress, color: STATUS_COLORS.in_progress },
      { name: 'Delivered', value: stats.delivered, color: STATUS_COLORS.delivered },
      { name: 'Stalled', value: stats.stalled, color: STATUS_COLORS.stalled },
    ].filter((d) => d.value > 0);
  }, [stats]);

  // Category breakdown with stacked status
  const categoryStatusData = useMemo(() => {
    if (!promises) return [];
    const map: Record<string, Record<PromiseStatus, number>> = {};
    for (const p of promises) {
      if (!map[p.category]) {
        map[p.category] = { not_started: 0, in_progress: 0, delivered: 0, stalled: 0 };
      }
      map[p.category][p.status]++;
    }
    return Object.entries(map)
      .map(([category, statuses]) => ({
        category: locale === 'ne' ? (CATEGORY_NE[category as PromiseCategory] || category) : category,
        ...statuses,
      }))
      .sort((a, b) => {
        const totalA = a.not_started + a.in_progress + a.delivered + a.stalled;
        const totalB = b.not_started + b.in_progress + b.delivered + b.stalled;
        return totalB - totalA;
      });
  }, [promises, locale]);

  // Average progress by category
  const categoryProgressData = useMemo(() => {
    if (!promises) return [];
    const map: Record<string, { sum: number; count: number }> = {};
    for (const p of promises) {
      if (!map[p.category]) map[p.category] = { sum: 0, count: 0 };
      map[p.category].sum += p.progress;
      map[p.category].count++;
    }
    return Object.entries(map)
      .map(([category, { sum, count }]) => ({
        category: locale === 'ne' ? (CATEGORY_NE[category as PromiseCategory] || category) : category,
        progress: Math.round(sum / count),
      }))
      .sort((a, b) => b.progress - a.progress);
  }, [promises, locale]);

  // Evidence per promise
  const evidenceData = useMemo(() => {
    if (!promises) return [];
    return promises
      .filter((p) => p.evidenceCount > 0)
      .sort((a, b) => b.evidenceCount - a.evidenceCount)
      .slice(0, 15)
      .map((p) => ({
        name: locale === 'ne' ? p.title_ne.slice(0, 25) : p.title.slice(0, 25),
        evidence: p.evidenceCount,
      }));
  }, [promises, locale]);

  if (isLoading) {
    return (
      <section className="public-section">
        <div className="public-shell">
          <div className="flex justify-center py-24">
            <div className="w-10 h-10 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
          </div>
        </div>
      </section>
    );
  }

  const totalPromises = stats?.total || 0;
  const avgProgress = stats?.avgProgress || 0;

  return (
    <section className="public-section">
      <div className="public-shell">
        <Breadcrumb
          items={[
            { label: locale === 'ne' ? 'अन्वेषण' : 'Explore', href: '/explore' },
            { label: locale === 'ne' ? 'एनालिटिक्स' : 'Analytics' },
          ]}
        />

        {/* ── Hero Section ── */}
        <div className="glass-card p-6 sm:p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-blue-500/15">
              <BarChart3 className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                {locale === 'ne' ? 'एनालिटिक्स ड्यासबोर्ड' : 'Analytics Dashboard'}
              </h1>
              <p className="text-sm text-gray-400">
                {locale === 'ne'
                  ? 'सरकारी वाचाहरूको विश्लेषण'
                  : 'Analysis of government promises'}
              </p>
            </div>
          </div>

          {/* Key Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              label={locale === 'ne' ? 'जम्मा वाचा' : 'Total Promises'}
              value={totalPromises}
              icon={<FileText className="w-4 h-4" />}
              color="text-white"
            />
            <StatCard
              label={locale === 'ne' ? 'औसत प्रगति' : 'Avg Progress'}
              value={`${avgProgress}%`}
              icon={<TrendingUp className="w-4 h-4" />}
              color="text-emerald-400"
            />
            <StatCard
              label={locale === 'ne' ? 'सम्पन्न' : 'Delivered'}
              value={stats?.delivered || 0}
              icon={<Eye className="w-4 h-4" />}
              color="text-blue-400"
            />
            <StatCard
              label={locale === 'ne' ? 'रोकिएको' : 'Stalled'}
              value={stats?.stalled || 0}
              icon={<BarChart3 className="w-4 h-4" />}
              color="text-red-400"
            />
          </div>

          {/* Overall Progress Ring */}
          <div className="flex justify-center mt-6">
            <div className="relative w-32 h-32">
              <svg viewBox="0 0 100 100" className="w-32 h-32 -rotate-90">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="8"
                  strokeDasharray={`${(avgProgress / 100) * 263.9} 263.9`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-white">{avgProgress}%</span>
                <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                  {locale === 'ne' ? 'प्रगति' : 'Progress'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Charts Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Chart 1: Status Distribution Pie */}
          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
              {locale === 'ne' ? 'स्थिति वितरण' : 'Status Distribution'}
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={800}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value: string) => (
                      <span className="text-xs text-gray-400">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Center label overlay */}
            <div className="relative -mt-[180px] mb-[116px] flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <span className="text-2xl font-bold text-white">{totalPromises}</span>
                <br />
                <span className="text-[10px] text-gray-400 uppercase">
                  {locale === 'ne' ? 'जम्मा' : 'Total'}
                </span>
              </div>
            </div>
          </div>

          {/* Chart 2: Promises by Category (Stacked Horizontal Bar) */}
          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
              {locale === 'ne' ? 'विषय अनुसार वाचा' : 'Promises by Category'}
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryStatusData} layout="vertical" margin={{ left: 10, right: 10, top: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <YAxis
                    dataKey="category"
                    type="category"
                    tick={{ fill: '#9ca3af', fontSize: 10 }}
                    width={90}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={30}
                    formatter={(value: string) => (
                      <span className="text-xs text-gray-400">
                        {STATUS_LABELS[value as PromiseStatus] || value}
                      </span>
                    )}
                  />
                  <Bar dataKey="not_started" stackId="a" fill={STATUS_COLORS.not_started} name="not_started" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="in_progress" stackId="a" fill={STATUS_COLORS.in_progress} name="in_progress" />
                  <Bar dataKey="delivered" stackId="a" fill={STATUS_COLORS.delivered} name="delivered" />
                  <Bar dataKey="stalled" stackId="a" fill={STATUS_COLORS.stalled} name="stalled" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Average Progress by Category */}
          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
              {locale === 'ne' ? 'विषय अनुसार औसत प्रगति' : 'Avg Progress by Category'}
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryProgressData} layout="vertical" margin={{ left: 10, right: 10, top: 0, bottom: 0 }}>
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    tickFormatter={(v: number) => `${v}%`}
                  />
                  <YAxis
                    dataKey="category"
                    type="category"
                    tick={{ fill: '#9ca3af', fontSize: 10 }}
                    width={90}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="progress" name="Progress" radius={[0, 4, 4, 0]}>
                    {categoryProgressData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.progress >= 60
                            ? '#10b981'
                            : entry.progress >= 30
                              ? '#f59e0b'
                              : '#ef4444'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 4: Evidence Coverage */}
          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
              {locale === 'ne' ? 'प्रमाण कभरेज' : 'Evidence Coverage'}
            </h2>
            <div className="h-64">
              {evidenceData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={evidenceData} layout="vertical" margin={{ left: 10, right: 10, top: 0, bottom: 0 }}>
                    <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tick={{ fill: '#9ca3af', fontSize: 9 }}
                      width={110}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="evidence" name="Evidence" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                  {locale === 'ne'
                    ? 'अहिलेसम्म कुनै प्रमाण सङ्कलन गरिएको छैन'
                    : 'No evidence collected yet'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Province Comparison ── */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
            {locale === 'ne' ? 'प्रदेश तुलना' : 'Province Comparison'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {PROVINCES.map((prov) => (
              <div key={prov.name} className="glass-card p-4">
                <h3 className="text-white font-medium text-sm mb-1">
                  {locale === 'ne' ? prov.name_ne : prov.name}
                </h3>
                <div className="space-y-2 mt-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">
                      {locale === 'ne' ? 'वाचा' : 'Promises'}
                    </span>
                    <span className="text-white font-medium">{prov.promises}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">
                      {locale === 'ne' ? 'प्रगति' : 'Progress'}
                    </span>
                    <span className="text-white font-medium">{prov.progress}%</span>
                  </div>
                  {/* Mini progress bar */}
                  <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all duration-500"
                      style={{ width: `${prov.progress}%` }}
                    />
                  </div>
                  <div className="flex gap-3 pt-1">
                    <span className="text-[10px] text-blue-400">
                      {prov.delivered} {locale === 'ne' ? 'सम्पन्न' : 'delivered'}
                    </span>
                    <span className="text-[10px] text-red-400">
                      {prov.stalled} {locale === 'ne' ? 'रोकिएको' : 'stalled'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   STAT CARD
   ═══════════════════════════════════════════ */
function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
      <div className={`flex items-center gap-1.5 mb-1 ${color}`}>
        {icon}
        <span className="text-[10px] uppercase tracking-wider text-gray-400">{label}</span>
      </div>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
