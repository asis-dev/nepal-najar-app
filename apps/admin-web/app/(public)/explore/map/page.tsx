'use client';

import { useState, useMemo } from 'react';
import {
  Map, AlertTriangle, TrendingUp,
  CheckCircle2, Eye,
  Building2, Truck, Cpu, Heart, Zap,
  GraduationCap, Leaf, Scale, Fingerprint,
  Briefcase, Users,
} from 'lucide-react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { useAllPromises, usePromiseStats } from '@/lib/hooks/use-promises';
import { SignalBadge } from '@/components/public/signal-badge';

/* ═══════════════════════════════════════════
   CATEGORY CONFIG
   ═══════════════════════════════════════════ */
const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  infrastructure: Building2,
  transport: Truck,
  technology: Cpu,
  health: Heart,
  energy: Zap,
  education: GraduationCap,
  environment: Leaf,
  governance: Scale,
  anti_corruption: Fingerprint,
  economy: Briefcase,
  social: Users,
};

const categoryColors: Record<string, string> = {
  infrastructure: 'text-amber-400 bg-amber-500/15',
  transport: 'text-blue-400 bg-blue-500/15',
  technology: 'text-cyan-400 bg-cyan-500/15',
  health: 'text-red-400 bg-red-500/15',
  energy: 'text-yellow-400 bg-yellow-500/15',
  education: 'text-purple-400 bg-purple-500/15',
  environment: 'text-emerald-400 bg-emerald-500/15',
  governance: 'text-indigo-400 bg-indigo-500/15',
  anti_corruption: 'text-pink-400 bg-pink-500/15',
  economy: 'text-orange-400 bg-orange-500/15',
  social: 'text-teal-400 bg-teal-500/15',
};

const STATUS_LABELS: Record<string, string> = {
  in_progress: 'In Progress',
  delivered: 'Delivered',
  stalled: 'Stalled',
  not_started: 'Not Started',
};

const STATUS_DOT_COLORS: Record<string, string> = {
  in_progress: 'bg-emerald-400',
  delivered: 'bg-blue-400',
  stalled: 'bg-red-400',
  not_started: 'bg-gray-400',
};

export default function PublicMapPage() {
  const { locale, t } = useI18n();
  const { data: promises, isLoading } = useAllPromises();
  const { stats } = usePromiseStats();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Build category breakdown
  type CatEntry = { name: string; total: number; inProgress: number; delivered: number; stalled: number; notStarted: number; avgProgress: number };

  const categoryBreakdown = useMemo(() => {
    if (!promises) return [] as CatEntry[];
    const record: Record<string, CatEntry> = {};

    for (const p of promises) {
      if (!record[p.category]) {
        record[p.category] = { name: p.category, total: 0, inProgress: 0, delivered: 0, stalled: 0, notStarted: 0, avgProgress: 0 };
      }
      const existing = record[p.category];
      existing.total++;
      if (p.status === 'in_progress') existing.inProgress++;
      if (p.status === 'delivered') existing.delivered++;
      if (p.status === 'stalled') existing.stalled++;
      if (p.status === 'not_started') existing.notStarted++;
      existing.avgProgress += p.progress;
    }

    return Object.values(record)
      .map((c) => ({
        ...c,
        avgProgress: c.total > 0 ? Math.round(c.avgProgress / c.total) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [promises]);

  // Filter promises by selected category
  const filteredPromises = useMemo(() => {
    if (!promises) return [];
    if (!selectedCategory) return promises;
    return promises.filter((p) => p.category === selectedCategory);
  }, [promises, selectedCategory]);

  const selectedCatData = categoryBreakdown.find((c) => c.name === selectedCategory);

  return (
    <div className="min-h-screen relative z-10 space-y-6 px-4 py-8 sm:px-6 lg:px-8 animate-fade-in">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-white flex items-center gap-3">
              <Map className="w-7 h-7 text-primary-400" />
              Promise Landscape
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Explore {stats?.total ?? '--'} government promises across {categoryBreakdown.length} sectors
            </p>
          </div>
          {selectedCategory && (
            <button
              onClick={() => setSelectedCategory(null)}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              ← All Sectors
            </button>
          )}
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="glass-card p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-500/15 flex items-center justify-center">
              <Eye className="w-4 h-4 text-primary-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Total Promises</p>
              <p className="text-xl font-bold text-white">{stats?.total ?? '--'}</p>
            </div>
          </div>
          <div className="glass-card p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">In Progress</p>
              <p className="text-xl font-bold text-white">{stats?.inProgress ?? '--'}</p>
            </div>
          </div>
          <div className="glass-card p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Delivered</p>
              <p className="text-xl font-bold text-white">{stats?.delivered ?? '--'}</p>
            </div>
          </div>
          <div className="glass-card p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Stalled</p>
              <p className="text-xl font-bold text-white">{stats?.stalled ?? '--'}</p>
            </div>
          </div>
        </div>

        {/* Main grid: Category tiles + Promise list */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Category Tiles */}
          <div className="lg:col-span-1 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">
              Sectors
            </h2>

            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="glass-card p-4 animate-pulse">
                  <div className="h-4 bg-white/5 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-white/5 rounded w-1/2" />
                </div>
              ))
            ) : (
              categoryBreakdown.map((cat) => {
                const Icon = categoryIcons[cat.name] || Building2;
                const colorClass = categoryColors[cat.name] || 'text-gray-400 bg-gray-500/15';
                const isSelected = selectedCategory === cat.name;
                const progressColor =
                  cat.avgProgress >= 60
                    ? 'bg-emerald-500'
                    : cat.avgProgress >= 30
                      ? 'bg-amber-500'
                      : 'bg-red-500';

                return (
                  <button
                    key={cat.name}
                    onClick={() => setSelectedCategory(isSelected ? null : cat.name)}
                    className={`w-full text-left glass-card p-4 transition-all duration-200 ${
                      isSelected
                        ? 'border-primary-500/40 bg-primary-500/10'
                        : 'hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${colorClass}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-sm font-medium text-gray-200 capitalize">
                          {cat.name.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">{cat.total}</span>
                    </div>

                    {/* Promises count */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500">{cat.total} promises tracked</span>
                    </div>

                    {/* Status dots */}
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500">
                      {cat.delivered > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                          {cat.delivered} done
                        </span>
                      )}
                      {cat.inProgress > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          {cat.inProgress} active
                        </span>
                      )}
                      {cat.stalled > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                          {cat.stalled} stalled
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Right: Promise List */}
          <div className="lg:col-span-2 glass-card overflow-hidden flex flex-col">
            <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary-400" />
                {selectedCategory
                  ? `${selectedCategory.replace(/_/g, ' ')} Promises`
                  : 'All Promises'}{' '}
                — {filteredPromises.length}
              </h3>
              {selectedCatData && (
                <span className="text-xs text-gray-500">
                  {selectedCatData.total} promises
                </span>
              )}
            </div>

            <div className="flex-1 divide-y divide-white/[0.04] overflow-y-auto max-h-[700px]">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="p-4 animate-pulse flex items-center gap-4">
                    <div className="h-4 bg-white/5 rounded w-3/4" />
                    <div className="h-3 bg-white/5 rounded w-16" />
                  </div>
                ))
              ) : filteredPromises.length > 0 ? (
                filteredPromises.map((promise) => {
                  const dotColor = STATUS_DOT_COLORS[promise.status] ?? 'bg-gray-400';

                  return (
                    <Link
                      key={promise.id}
                      href={`/explore/first-100-days/${promise.slug}`}
                      className="block p-4 hover:bg-white/[0.02] transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors line-clamp-1">
                            {locale === 'ne' && promise.title_ne
                              ? promise.title_ne
                              : promise.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="flex items-center gap-1 text-[10px] text-gray-500">
                              <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                              {STATUS_LABELS[promise.status] ?? promise.status}
                            </span>
                            <SignalBadge type={promise.signalType} compact />
                            <span className="text-[10px] text-gray-600 capitalize">
                              {promise.category.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {promise.evidenceCount > 0 ? (
                            <span className="text-[10px] text-cyan-500/70">{promise.evidenceCount} articles</span>
                          ) : (
                            <span className="text-[10px] text-gray-600 italic">No data</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="p-8 text-center text-gray-500 text-sm">
                  No promises found for this category.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
