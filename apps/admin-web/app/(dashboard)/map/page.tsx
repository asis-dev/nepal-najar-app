'use client';

import { useState, useMemo } from 'react';
import {
  Map, BarChart3, AlertTriangle, TrendingUp,
  ArrowLeft, MapPin,
} from 'lucide-react';
import { useNationalDashboard, useProjects } from '@/lib/hooks/use-projects';
import dynamic from 'next/dynamic';
import Link from 'next/link';

// Dynamic import to avoid SSR issues with Canvas
const NepalDeckMap = dynamic(
  () => import('@/components/map/nepal-deck-map').then(m => ({ default: m.NepalDeckMap })),
  { ssr: false, loading: () => <div className="w-full h-full flex items-center justify-center"><div className="skeleton w-full h-full" /></div> }
);

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: 'Active', className: 'badge-green' },
  draft: { label: 'Draft', className: 'badge-gray' },
  suspended: { label: 'Suspended', className: 'badge-yellow' },
  completed: { label: 'Completed', className: 'badge-blue' },
  cancelled: { label: 'Cancelled', className: 'badge-red' },
};

export default function MapPage() {
  const { data: national } = useNationalDashboard();
  const { data: projectsResponse } = useProjects({ limit: 100 });
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);

  const allProjects = useMemo(() => projectsResponse?.data ?? [], [projectsResponse]);

  const regionData = useMemo(() => {
    // Regional data not yet available — project tracking by province coming soon
    return [] as Array<{
      name: string;
      total: number;
      delayed: number;
      severity: string;
    }>;
  }, [national]);

  // Filter projects by selected province
  const filteredProjects = useMemo(() => {
    if (!selectedProvince) return allProjects;
    return allProjects.filter((p) =>
      p.region?.name === selectedProvince
    );
  }, [allProjects, selectedProvince]);

  const selectedData = regionData.find(r => r.name === selectedProvince);

  const totalInView = selectedProvince ? (selectedData?.total ?? 0) : regionData.reduce((s, r) => s + r.total, 0);
  const delayedInView = selectedProvince ? (selectedData?.delayed ?? 0) : regionData.reduce((s, r) => s + r.delayed, 0);

  const handleProvinceClick = (provinceName: string) => {
    setSelectedProvince(selectedProvince === provinceName ? null : provinceName);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title flex items-center gap-3">
            <Map className="w-7 h-7 text-primary-400" />
            National Development Map
          </h1>
          <p className="section-subtitle">Click any province to explore development projects</p>
        </div>
        {selectedProvince && (
          <button
            onClick={() => setSelectedProvince(null)}
            className="btn-secondary flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            All Provinces
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
            <p className="text-xs text-gray-400">Projects in View</p>
            <p className="text-xl font-bold text-white">{totalInView}</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="stat-icon !w-8 !h-8 !mb-0" style={{ background: 'rgba(16,185,129,0.15)' }}>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-gray-400">On Track</p>
            <p className="text-xl font-bold text-white">{totalInView - delayedInView}</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="stat-icon !w-8 !h-8 !mb-0" style={{ background: 'rgba(239,68,68,0.15)' }}>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Delayed</p>
            <p className="text-xl font-bold text-white">{delayedInView}</p>
          </div>
        </div>
      </div>

      {/* Map + Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2 glass-card overflow-hidden">
          <div className="relative h-[560px]">
            <NepalDeckMap
              regionData={regionData}
              selectedProvince={selectedProvince}
              onProvinceClick={handleProvinceClick}
            />

            {/* Map legend */}
            <div className="absolute bottom-4 left-4 glass-card px-4 py-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Risk Level</p>
              <div className="flex items-center gap-3 text-xs">
                {[
                  { label: 'Low', color: 'bg-emerald-500' },
                  { label: 'Medium', color: 'bg-amber-500' },
                  { label: 'High', color: 'bg-orange-500' },
                  { label: 'Critical', color: 'bg-red-500' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${item.color}`} />
                    <span className="text-gray-400">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Side Panel */}
        <div className="glass-card overflow-hidden flex flex-col">
          {/* Province detail header when selected */}
          {selectedData && selectedProvince && (
            <div className="px-4 py-4 border-b border-np-border" style={{
              background: 'linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(10,14,26,0.5) 100%)',
            }}>
              <h3 className="text-base font-bold text-white">{selectedProvince}</h3>
              <div className="grid grid-cols-3 gap-3 mt-3">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Total</p>
                  <p className="text-lg font-bold text-white tabular-nums">{selectedData.total}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Delayed</p>
                  <p className="text-lg font-bold text-red-400 tabular-nums">{selectedData.delayed}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">On Track</p>
                  <p className="text-lg font-bold text-emerald-400 tabular-nums">
                    {selectedData.total - selectedData.delayed}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  selectedData.severity === 'critical' ? 'bg-red-500' :
                  selectedData.severity === 'high' ? 'bg-orange-500' :
                  selectedData.severity === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
                }`} />
                <span className="text-[11px] text-gray-400 capitalize">{selectedData.severity} risk</span>
                <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${selectedData.total > 0 ? ((selectedData.total - selectedData.delayed) / selectedData.total) * 100 : 0}%`,
                      background: 'linear-gradient(90deg, rgba(16,185,129,0.8), rgba(59,130,246,0.8))',
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="px-4 py-3 border-b border-np-border">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary-400" />
              {selectedProvince ?? 'All Provinces'} — {filteredProjects.length} projects
            </h3>
          </div>
          <div className="flex-1 divide-y divide-np-border/50 overflow-y-auto max-h-[460px]">
            {filteredProjects.length > 0 ? filteredProjects.slice(0, 20).map((project) => {
              const status = statusConfig[project.status] ?? statusConfig.draft;
              const progress = project.progress ?? 0;
              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
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
                      {status.label}
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
                {selectedProvince ? 'No projects in this province' : 'No projects found'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
