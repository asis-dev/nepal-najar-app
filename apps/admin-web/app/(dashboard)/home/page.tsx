'use client';

import {
  BarChart3, Eye, AlertTriangle, TrendingUp, Loader2,
  Newspaper, Clock, CheckCircle2,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid,
} from 'recharts';
import { usePromiseStats, useAllPromises } from '@/lib/hooks/use-promises';
import { useScrapingStatus } from '@/lib/hooks/use-scraping';

const STATUS_COLORS: Record<string, string> = {
  not_started: '#6b7280',
  in_progress: '#10b981',
  delivered: '#3b82f6',
  stalled: '#ef4444',
};

const STATUS_LABELS: Record<string, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  delivered: 'Delivered',
  stalled: 'Stalled',
};

export default function DashboardPage() {
  const { stats, isLoading: statsLoading } = usePromiseStats();
  const { data: allPromises, isLoading: promisesLoading } = useAllPromises();
  const { data: scrapingStatus } = useScrapingStatus();

  const isLoading = statsLoading || promisesLoading;

  // Compute status pie data from real stats
  const statusData = stats
    ? [
        { name: 'Not Started', value: stats.notStarted, color: STATUS_COLORS.not_started },
        { name: 'In Progress', value: stats.inProgress, color: STATUS_COLORS.in_progress },
        { name: 'Delivered', value: stats.delivered, color: STATUS_COLORS.delivered },
        { name: 'Stalled', value: stats.stalled, color: STATUS_COLORS.stalled },
      ].filter((d) => d.value > 0)
    : [];

  // Compute category breakdown from real promises
  const categoryData = (() => {
    if (!allPromises) return [];
    const cats: Record<string, number> = {};
    for (const p of allPromises) {
      const cat = p.category?.replace(/_/g, ' ') || 'uncategorized';
      cats[cat] = (cats[cat] || 0) + 1;
    }
    return Object.entries(cats)
      .map(([name, count]) => ({ name, promises: count }))
      .sort((a, b) => b.promises - a.promises)
      .slice(0, 8);
  })();

  // Count promises with real evidence
  const promisesWithEvidence = allPromises
    ? allPromises.filter((p) => p.evidenceCount > 0).length
    : 0;
  const totalArticles = allPromises
    ? allPromises.reduce((sum, p) => sum + p.evidenceCount, 0)
    : 0;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="section-title">Dashboard</h1>
          <p className="section-subtitle">Promise tracking overview</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="section-title">Dashboard</h1>
        <p className="section-subtitle">Promise tracking overview — all data from verified sources</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Eye className="w-5 h-5 text-primary-400" />}
          label="Total Promises"
          value={stats?.total?.toString() ?? '—'}
          accentColor="blue"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5 text-emerald-400" />}
          label="In Progress"
          value={stats?.inProgress?.toString() ?? '—'}
          accentColor="emerald"
        />
        <StatCard
          icon={<Newspaper className="w-5 h-5 text-cyan-400" />}
          label="Articles Matched"
          value={totalArticles.toString()}
          accentColor="cyan"
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
          label="Stalled"
          value={stats?.stalled?.toString() ?? '—'}
          accentColor="red"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Promises by Status Pie */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Promises by Status</h2>
          {statusData.length > 0 ? (
            <>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="rgba(0,0,0,0.3)"
                      strokeWidth={1}
                    >
                      {statusData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [`${value} promises`, name]}
                      contentStyle={{
                        background: '#151d35',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        color: '#e5e7eb',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-4 mt-2 justify-center">
                {statusData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2 text-xs">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        backgroundColor: item.color,
                        boxShadow: `0 0 8px ${item.color}40`,
                      }}
                    />
                    <span className="text-gray-400">{item.name}</span>
                    <span className="font-bold text-gray-200">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No status data available
            </div>
          )}
        </div>

        {/* Promises by Category */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Promises by Sector</h2>
          {categoryData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="rgba(255,255,255,0.05)"
                  />
                  <XAxis
                    type="number"
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value}`, 'Promises']}
                    contentStyle={{
                      background: '#151d35',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      color: '#e5e7eb',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    }}
                  />
                  <Bar dataKey="promises" radius={[0, 6, 6, 0]} barSize={16}>
                    {categoryData.map((_, idx) => (
                      <Cell key={idx} fill="url(#blueGradient)" />
                    ))}
                  </Bar>
                  <defs>
                    <linearGradient id="blueGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#2563eb" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-gray-500">
              No category data available
            </div>
          )}
        </div>
      </div>

      {/* Data Health Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evidence Coverage */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-cyan-400" />
            Evidence Coverage
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Promises with article matches</span>
              <span className="text-sm font-bold text-white">
                {promisesWithEvidence} / {stats?.total ?? 0}
              </span>
            </div>
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                style={{
                  width: `${stats?.total ? Math.round((promisesWithEvidence / stats.total) * 100) : 0}%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{totalArticles} total articles matched</span>
              <span>
                {stats?.total
                  ? `${Math.round((promisesWithEvidence / stats.total) * 100)}% coverage`
                  : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Scraping Health */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            Scraping Status
          </h2>
          {scrapingStatus ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Total articles scraped</span>
                <span className="text-sm font-bold text-white">
                  {scrapingStatus.total ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Completed runs</span>
                <span className="text-sm font-bold text-white">
                  {scrapingStatus.completed ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Last scrape</span>
                <span className="text-sm text-gray-300">
                  {scrapingStatus.last_run_at
                    ? new Date(scrapingStatus.last_run_at).toLocaleString()
                    : 'Never'}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-emerald-400">Cron: every 6 hours</span>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              Scraping status unavailable
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accentColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accentColor: string;
}) {
  const glowColors: Record<string, string> = {
    blue: 'rgba(59,130,246,0.08)',
    emerald: 'rgba(16,185,129,0.08)',
    cyan: 'rgba(6,182,212,0.08)',
    red: 'rgba(239,68,68,0.08)',
  };

  return (
    <div className="stat-card animate-slide-up">
      <div
        className="stat-icon"
        style={{
          background: `radial-gradient(circle, ${glowColors[accentColor] ?? glowColors.blue} 0%, transparent 70%)`,
        }}
      >
        {icon}
      </div>
      <p className="stat-value">{value}</p>
      <p className="stat-label">{label}</p>
    </div>
  );
}
