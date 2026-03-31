'use client';

import { useState, useMemo, useCallback, Suspense } from 'react';
import dynamic from 'next/dynamic';
import {
  Map, AlertTriangle, TrendingUp,
  CheckCircle2, Eye,
  Building2, Truck, Cpu, Heart, Zap,
  GraduationCap, Leaf, Scale, Fingerprint,
  Briefcase, Users, X,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { useAllPromises, usePromiseStats } from '@/lib/hooks/use-promises';
import { SignalBadge } from '@/components/public/signal-badge';

const MapFallback = dynamic(
  () => import('@/components/map/map-fallback').then((m) => ({ default: m.MapFallback })),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full rounded-2xl bg-white/[0.03] animate-pulse flex items-center justify-center">
        <Map className="w-8 h-8 text-gray-600" />
      </div>
    ),
  },
);

/* ═══════════════════════════════════════════
   PROVINCE DATA
   ═══════════════════════════════════════════ */
type ProvinceOverview = {
  name: string;
  label: string;
  total: number;
  delayed: number;
  progress: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  summary: string;
  focus: string[];
};

const provinceOverview: ProvinceOverview[] = [
  {
    name: 'Koshi Province',
    label: 'Koshi',
    total: 31,
    delayed: 4,
    progress: 56,
    severity: 'medium',
    summary: 'Roads, hydropower, and district-level health upgrades are the strongest visible workstreams.',
    focus: ['Transport', 'Energy', 'Health'],
  },
  {
    name: 'Madhesh Province',
    label: 'Madhesh',
    total: 28,
    delayed: 7,
    progress: 44,
    severity: 'high',
    summary: 'Border connectivity, local services, and governance delivery remain the key public pressure points.',
    focus: ['Transport', 'Social', 'Governance'],
  },
  {
    name: 'Bagmati Province',
    label: 'Bagmati',
    total: 42,
    delayed: 6,
    progress: 63,
    severity: 'medium',
    summary: 'Kathmandu valley reforms, digital governance, and anti-corruption commitments are driving the most attention.',
    focus: ['Technology', 'Governance', 'Anti-Corruption'],
  },
  {
    name: 'Gandaki Province',
    label: 'Gandaki',
    total: 24,
    delayed: 3,
    progress: 58,
    severity: 'low',
    summary: 'Tourism-linked infrastructure, local roads, and environmental resilience projects are advancing steadily.',
    focus: ['Environment', 'Infrastructure', 'Transport'],
  },
  {
    name: 'Lumbini Province',
    label: 'Lumbini',
    total: 29,
    delayed: 5,
    progress: 49,
    severity: 'medium',
    summary: 'Education, logistics, and industrial growth commitments are highly watched across the province.',
    focus: ['Education', 'Economy', 'Transport'],
  },
  {
    name: 'Karnali Province',
    label: 'Karnali',
    total: 18,
    delayed: 5,
    progress: 37,
    severity: 'high',
    summary: 'Basic infrastructure and service delivery remain the biggest test for visible progress in Karnali.',
    focus: ['Infrastructure', 'Health', 'Energy'],
  },
  {
    name: 'Sudurpashchim Province',
    label: 'Sudurpashchim',
    total: 20,
    delayed: 6,
    progress: 34,
    severity: 'critical',
    summary: 'Transport gaps and slower follow-through are keeping this province under closer public scrutiny.',
    focus: ['Transport', 'Infrastructure', 'Social'],
  },
];

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

const STATUS_KEYS: Record<string, string> = {
  in_progress: 'commitment.inProgress',
  delivered: 'commitment.delivered',
  stalled: 'commitment.stalled',
  not_started: 'commitment.notStarted',
};

const STATUS_DOT_COLORS: Record<string, string> = {
  in_progress: 'bg-emerald-400',
  delivered: 'bg-blue-400',
  stalled: 'bg-red-400',
  not_started: 'bg-gray-400',
};

const severityTone: Record<string, string> = {
  low: 'text-emerald-300 bg-emerald-500/12 border-emerald-500/25',
  medium: 'text-amber-300 bg-amber-500/12 border-amber-500/25',
  high: 'text-orange-300 bg-orange-500/12 border-orange-500/25',
  critical: 'text-red-300 bg-red-500/12 border-red-500/25',
};

export default function PublicMapPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-np-base animate-pulse" />}>
      <PublicMapPage />
    </Suspense>
  );
}

function PublicMapPage() {
  const { locale, t } = useI18n();
  const { data: promises, isLoading } = useAllPromises();
  const { stats } = usePromiseStats();
  const searchParams = useSearchParams();

  const initialProvince = searchParams.get('province') || null;
  const [selectedProvince, setSelectedProvince] = useState<string | null>(initialProvince);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const selectedProvinceData = useMemo(
    () => provinceOverview.find((p) => p.name === selectedProvince) ?? null,
    [selectedProvince],
  );

  const handleProvinceClick = useCallback((name: string) => {
    setSelectedProvince((prev) => (prev === name ? null : name));
    setSelectedCategory(null);
  }, []);

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

  return (
    <div className="min-h-screen relative z-10 space-y-6 px-4 py-6 sm:px-6 lg:px-8 animate-fade-in">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-white flex items-center gap-3">
              <Map className="w-7 h-7 text-primary-400" />
              {t('map.promiseLandscape')}
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              {t('map.explorePromises')}
            </p>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="glass-card p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-500/15 flex items-center justify-center">
              <Eye className="w-4 h-4 text-primary-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">{t('map.totalPromises')}</p>
              <p className="text-xl font-bold text-white">{stats?.total ?? '--'}</p>
            </div>
          </div>
          <div className="glass-card p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">{t('commitment.inProgress')}</p>
              <p className="text-xl font-bold text-white">{stats?.inProgress ?? '--'}</p>
            </div>
          </div>
          <div className="glass-card p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">{t('commitment.delivered')}</p>
              <p className="text-xl font-bold text-white">{stats?.delivered ?? '--'}</p>
            </div>
          </div>
          <div className="glass-card p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">{t('commitment.stalled')}</p>
              <p className="text-xl font-bold text-white">{stats?.stalled ?? '--'}</p>
            </div>
          </div>
        </div>

        {/* MAP — primary element */}
        <div className="glass-card overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Map className="w-4 h-4 text-cyan-400" />
                Nepal Province Map
              </h2>
              <p className="mt-1 text-[10px] text-amber-300/90">
                Province totals are estimated while geo-tagged commitment coverage is expanding.
              </p>
            </div>
            {selectedProvince && (
              <button
                onClick={() => {
                  setSelectedProvince(null);
                  setSelectedCategory(null);
                }}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-3 h-3" />
                Clear selection
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px]">
            {/* Map container */}
            <div className="h-[500px] lg:h-[560px] w-full">
              <MapFallback
                regionData={provinceOverview.map((province) => ({
                  name: province.name,
                  total: province.total,
                  delayed: province.delayed,
                  severity: province.severity,
                  progress: province.progress,
                }))}
                selectedProvince={selectedProvince}
                onProvinceClick={handleProvinceClick}
              />
            </div>

            {/* Province detail sidebar */}
            <div className="border-t lg:border-t-0 lg:border-l border-white/[0.06] p-4 space-y-4 overflow-y-auto max-h-[560px]">
              {selectedProvinceData ? (
                <>
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-lg font-semibold text-white">{selectedProvinceData.label}</h3>
                      <span className={`rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-[0.15em] ${severityTone[selectedProvinceData.severity]}`}>
                        {selectedProvinceData.severity}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mt-2 leading-relaxed">
                      {selectedProvinceData.summary}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-center">
                      <p className="text-[10px] uppercase tracking-wider text-gray-500">Tracked</p>
                      <p className="text-xl font-semibold text-white mt-1">{selectedProvinceData.total}</p>
                    </div>
                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-center">
                      <p className="text-[10px] uppercase tracking-wider text-gray-500">Delayed</p>
                      <p className="text-xl font-semibold text-red-400 mt-1">{selectedProvinceData.delayed}</p>
                    </div>
                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-center">
                      <p className="text-[10px] uppercase tracking-wider text-gray-500">Progress</p>
                      <p className="text-xl font-semibold text-white mt-1">{selectedProvinceData.progress}%</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Key sectors</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedProvinceData.focus.map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs text-gray-300"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Province list for quick switching */}
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">All provinces</p>
                    <div className="space-y-1.5">
                      {provinceOverview.map((p) => (
                        <button
                          key={p.name}
                          onClick={() => handleProvinceClick(p.name)}
                          className={`w-full text-left rounded-lg px-3 py-2 text-xs transition-colors flex items-center justify-between ${
                            selectedProvince === p.name
                              ? 'bg-primary-500/15 text-white border border-primary-500/30'
                              : 'text-gray-400 hover:bg-white/[0.04] hover:text-gray-200'
                          }`}
                        >
                          <span>{p.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-500">{p.progress}%</span>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              p.severity === 'critical' ? 'bg-red-500' :
                              p.severity === 'high' ? 'bg-orange-500' :
                              p.severity === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
                            }`} />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                  <Map className="w-10 h-10 text-gray-600 mb-3" />
                  <p className="text-sm text-gray-400">Click a province on the map</p>
                  <p className="text-xs text-gray-500 mt-1">to see delivery details</p>

                  <div className="mt-6 space-y-1.5 w-full">
                    {provinceOverview.map((p) => (
                      <button
                        key={p.name}
                        onClick={() => handleProvinceClick(p.name)}
                        className="w-full text-left rounded-lg px-3 py-2 text-xs text-gray-400 hover:bg-white/[0.04] hover:text-gray-200 transition-colors flex items-center justify-between"
                      >
                        <span>{p.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-500">{p.progress}%</span>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            p.severity === 'critical' ? 'bg-red-500' :
                            p.severity === 'high' ? 'bg-orange-500' :
                            p.severity === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
                          }`} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sector breakdown + Promise list */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Category Tiles */}
          <div className="lg:col-span-1 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                {t('map.sectors')}
              </h2>
              {selectedCategory && (
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors"
                >
                  <X className="w-3 h-3" />
                  {t('map.allSectors')}
                </button>
              )}
            </div>

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
                          {t(`categoryName.${cat.name}`)}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">{cat.total}</span>
                    </div>

                    <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500">
                      {cat.delivered > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                          {cat.delivered} {t('map.done')}
                        </span>
                      )}
                      {cat.inProgress > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          {cat.inProgress} {t('map.active')}
                        </span>
                      )}
                      {cat.stalled > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                          {cat.stalled} {t('map.stalled')}
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
                  ? `${t(`categoryName.${selectedCategory}`)} ${t('map.promises')}`
                  : t('map.allPromises')}{' '}
                — {filteredPromises.length}
              </h3>
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
                              {STATUS_KEYS[promise.status] ? t(STATUS_KEYS[promise.status]) : promise.status}
                            </span>
                            <SignalBadge type={promise.signalType} compact />
                            <span className="text-[10px] text-gray-600 capitalize">
                              {t(`categoryName.${promise.category}`)}
                            </span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {promise.evidenceCount > 0 ? (
                            <span className="text-[10px] text-cyan-500/70">{promise.evidenceCount} {t('map.articles')}</span>
                          ) : (
                            <span className="text-[10px] text-gray-600 italic">{t('map.noData')}</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="p-8 text-center text-gray-500 text-sm">
                  {t('map.noPromisesCategory')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
