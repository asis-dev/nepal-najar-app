'use client';

import {
  BarChart3, FolderKanban, AlertTriangle, TrendingUp, Loader2
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid
} from 'recharts';
import { useDashboardOverview, useNationalDashboard } from '@/lib/hooks/use-projects';

const statusColorMap: Record<string, string> = {
  active: '#10b981',
  draft: '#6b7280',
  suspended: '#f59e0b',
  completed: '#3b82f6',
  cancelled: '#ef4444',
};

const statusLabelMap: Record<string, string> = {
  active: 'Active',
  draft: 'Draft',
  suspended: 'Suspended',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const severityConfig: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  low: {
    bg: 'rgba(16,185,129,0.08)',
    border: 'rgba(16,185,129,0.2)',
    text: 'text-emerald-400',
    glow: '0 0 15px rgba(16,185,129,0.1)',
  },
  medium: {
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.2)',
    text: 'text-amber-400',
    glow: '0 0 15px rgba(245,158,11,0.1)',
  },
  high: {
    bg: 'rgba(249,115,22,0.08)',
    border: 'rgba(249,115,22,0.2)',
    text: 'text-orange-400',
    glow: '0 0 15px rgba(249,115,22,0.1)',
  },
  critical: {
    bg: 'rgba(239,68,68,0.1)',
    border: 'rgba(239,68,68,0.3)',
    text: 'text-red-400',
    glow: '0 0 20px rgba(239,68,68,0.15)',
  },
};

export default function DashboardPage() {
  const { data: overview, isLoading: overviewLoading } = useDashboardOverview();
  const { data: national, isLoading: nationalLoading } = useNationalDashboard();

  const isLoading = overviewLoading || nationalLoading;

  const statusData = national?.statusBreakdown
    ? Object.entries(national.statusBreakdown).map(([key, value]) => ({
        name: statusLabelMap[key] || key,
        value: value as number,
        color: statusColorMap[key] || '#6b7280',
      }))
    : [];

  const ministryData = Array.isArray(national?.ministryBreakdown)
    ? (national.ministryBreakdown as Array<{ name: string; projects: number; progress: number }>).slice(0, 8)
    : [];

  const delayedProjects = Array.isArray(national?.delayedProjects)
    ? (national.delayedProjects as Array<{
        id: string;
        title: string;
        government_unit?: { name: string };
        progress: number;
        days_delayed: number;
      }>).slice(0, 5)
    : [];

  const provinceData = Array.isArray(national?.regionBreakdown)
    ? (national.regionBreakdown as Array<{
        name: string;
        total: number;
        delayed: number;
        severity: string;
      }>)
    : [];

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="section-title">Dashboard</h1>
          <p className="section-subtitle">National development overview</p>
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
        <p className="section-subtitle">National development overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<FolderKanban className="w-5 h-5 text-primary-400" />}
          label="Total Projects"
          value={overview?.totalProjects?.toString() ?? '—'}
          accentColor="blue"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5 text-emerald-400" />}
          label="Active Projects"
          value={overview?.totalActive?.toString() ?? '—'}
          accentColor="emerald"
        />
        <StatCard
          icon={<BarChart3 className="w-5 h-5 text-cyan-400" />}
          label="Overall Progress"
          value={overview?.overallProgress != null ? `${Math.round(overview.overallProgress)}%` : '—'}
          accentColor="cyan"
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
          label="Open Blockers"
          value={overview?.totalBlockers?.toString() ?? '—'}
          accentColor="red"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Projects by Status Donut */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Projects by Status</h2>
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
                      formatter={(value: number, name: string) => [`${value} projects`, name]}
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

        {/* Ministry Comparison */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Ministry Comparison</h2>
          {ministryData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ministryData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="rgba(255,255,255,0.05)"
                  />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={140}
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value}%`, 'Avg Progress']}
                    contentStyle={{
                      background: '#151d35',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      color: '#e5e7eb',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    }}
                  />
                  <Bar dataKey="progress" radius={[0, 6, 6, 0]} barSize={16}>
                    {ministryData.map((_, idx) => (
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
              No ministry data available
            </div>
          )}
        </div>
      </div>

      {/* Delayed Projects */}
      <div className="glass-card overflow-hidden">
        <div className="px-6 py-4 border-b border-np-border">
          <h2 className="text-lg font-semibold text-white">Top Delayed Projects</h2>
        </div>
        {delayedProjects.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table-dark">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Ministry</th>
                  <th>Progress</th>
                  <th>Days Delayed</th>
                </tr>
              </thead>
              <tbody>
                {delayedProjects.map((p) => (
                  <tr key={p.id}>
                    <td className="font-medium text-gray-200">{p.title}</td>
                    <td>{p.government_unit?.name ?? '—'}</td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="progress-bar w-20">
                          <div
                            className="progress-bar-fill danger"
                            style={{ width: `${p.progress}%` }}
                          />
                        </div>
                        <span className="text-gray-400 text-xs">{p.progress}%</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge-red">{p.days_delayed}d</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-gray-500">No delayed projects</div>
        )}
      </div>

      {/* Province Heatmap */}
      {provinceData.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-5">Region Delay Heatmap</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {provinceData.map((prov) => {
              const sev = severityConfig[prov.severity] ?? severityConfig.low;
              return (
                <div
                  key={prov.name}
                  className="rounded-xl p-4 text-center transition-all duration-300 cursor-pointer hover:-translate-y-1"
                  style={{
                    background: sev.bg,
                    border: `1px solid ${sev.border}`,
                    boxShadow: sev.glow,
                  }}
                >
                  <p className={`font-semibold text-sm ${sev.text}`}>{prov.name}</p>
                  <p className={`text-2xl font-bold mt-1 ${sev.text}`}>{prov.delayed}</p>
                  <p className="text-xs text-gray-500 mt-0.5">of {prov.total} delayed</p>
                  <p className={`text-xs font-semibold mt-1 capitalize ${sev.text}`}>{prov.severity}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
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
