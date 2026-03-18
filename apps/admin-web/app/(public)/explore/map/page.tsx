'use client';

import { useState, useMemo } from 'react';
import {
  Map, BarChart3, AlertTriangle, TrendingUp,
  ArrowLeft, MapPin
} from 'lucide-react';
import { useNationalDashboard, useProjects } from '@/lib/hooks/use-projects';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';

const NepalDeckMap = dynamic(
  () => import('@/components/map/nepal-deck-map').then(m => ({ default: m.NepalDeckMap })),
  { ssr: false, loading: () => <div className="w-full h-full flex items-center justify-center"><div className="skeleton w-full h-full" /></div> }
);

const statusConfig: Record<string, { labelKey: string; className: string }> = {
  active: { labelKey: 'status.active', className: 'badge-green' },
  draft: { labelKey: 'status.draft', className: 'badge-gray' },
  suspended: { labelKey: 'status.suspended', className: 'badge-yellow' },
  completed: { labelKey: 'status.completed', className: 'badge-blue' },
  cancelled: { labelKey: 'status.cancelled', className: 'badge-red' },
};

export default function PublicMapPage() {
  const { data: national } = useNationalDashboard();
  const { data: projectsResponse } = useProjects({ limit: 100 });
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const { t } = useI18n();

  const allProjects = useMemo(() => projectsResponse?.data ?? [], [projectsResponse]);

  const regionData = useMemo(() => {
    return Array.isArray(national?.regionBreakdown)
      ? (national.regionBreakdown as Array<{
          name: string;
          total: number;
          delayed: number;
          severity: string;
        }>)
      : [];
  }, [national]);

  const filteredProjects = useMemo(() => {
    if (!selectedProvince) return allProjects;
    return allProjects.filter((p) => p.region?.name === selectedProvince);
  }, [allProjects, selectedProvince]);

  const selectedData = regionData.find(r => r.name === selectedProvince);

  const totalInView = selectedProvince ? (selectedData?.total ?? 0) : regionData.reduce((s, r) => s + r.total, 0);
  const delayedInView = selectedProvince ? (selectedData?.delayed ?? 0) : regionData.reduce((s, r) => s + r.delayed, 0);

  const riskLevels = [
    { labelKey: 'map.low', color: 'bg-emerald-500' },
    { labelKey: 'map.medium', color: 'bg-amber-500' },
    { labelKey: 'map.high', color: 'bg-orange-500' },
    { labelKey: 'map.critical', color: 'bg-red-500' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-white flex items-center gap-3">
            <Map className="w-7 h-7 text-primary-400" />
            {t('map.nationalMap')}
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {t('map.mapDesc')}
          </p>
        </div>
        {selectedProvince && (
          <button
            onClick={() => setSelectedProvince(null)}
            className="btn-secondary flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('map.allProvinces')}
          </button>
        )}
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="stat-icon !w-8 !h-8 !mb-0">
            <BarChart3 className="w-4 h-4 text-primary-400" />
          </div>
          <div>
            <p className="text-xs text-gray-400">{t('map.projectsInView')}</p>
            <p className="text-xl font-bold text-white">{totalInView}</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="stat-icon !w-8 !h-8 !mb-0" style={{ background: 'rgba(16,185,129,0.15)' }}>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-gray-400">{t('map.onTrack')}</p>
            <p className="text-xl font-bold text-white">{totalInView - delayedInView}</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="stat-icon !w-8 !h-8 !mb-0" style={{ background: 'rgba(239,68,68,0.15)' }}>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <p className="text-xs text-gray-400">{t('map.delayed')}</p>
            <p className="text-xl font-bold text-white">{delayedInView}</p>
          </div>
        </div>
      </div>

      {/* Map + Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2 glass-card overflow-hidden">
          <div
            className="relative h-[560px]"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(15,22,41,1) 0%, rgba(10,14,26,1) 100%)',
            }}
          >
            <NepalDeckMap
              regionData={regionData}
              selectedProvince={selectedProvince}
              onProvinceClick={(name) => setSelectedProvince(name === selectedProvince ? null : name)}
            />

            {/* Map legend */}
            <div className="absolute bottom-4 left-4 glass-card px-4 py-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{t('map.riskLevel')}</p>
              <div className="flex items-center gap-3 text-xs">
                {riskLevels.map(item => (
                  <div key={item.labelKey} className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${item.color}`} />
                    <span className="text-gray-400">{t(item.labelKey)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Side Panel — Province Projects */}
        <div className="glass-card overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-np-border">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary-400" />
              {selectedProvince ?? t('map.allProvinces')} — {filteredProjects.length} {t('province.projects')}
            </h3>
          </div>
          <div className="flex-1 divide-y divide-np-border/50 overflow-y-auto max-h-[460px]">
            {filteredProjects.length > 0 ? filteredProjects.slice(0, 20).map((project) => {
              const status = statusConfig[project.status] ?? statusConfig.draft;
              const progress = project.progress ?? 0;
              return (
                <Link
                  key={project.id}
                  href={`/explore/projects/${project.id}`}
                  className="block p-4 hover:bg-white/[0.02] transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-200 truncate group-hover:text-white transition-colors">
                        {project.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {project.region?.name ?? 'Unknown'} · {project.government_unit?.name ?? ''}
                      </p>
                    </div>
                    <span className={`${status.className} flex-shrink-0 text-[10px]`}>
                      {t(status.labelKey)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="progress-bar flex-1">
                      <div
                        className={`progress-bar-fill ${
                          progress >= 70 ? 'success' : progress >= 40 ? 'warning' : 'danger'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-8 text-right">{progress}%</span>
                  </div>
                </Link>
              );
            }) : (
              <div className="p-8 text-center text-gray-500 text-sm">
                {selectedProvince ? t('map.noProjectsProvince') : t('map.noProjects')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
