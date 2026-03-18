'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, MapPin, Building2 } from 'lucide-react';
import { useProjects, type Project } from '@/lib/hooks/use-projects';
import { useI18n } from '@/lib/i18n';

const STATUS_FILTERS = ['all', 'active', 'completed', 'suspended', 'cancelled'] as const;

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  completed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  suspended: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
  draft: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const PROGRESS_COLORS: Record<string, string> = {
  active: 'bg-emerald-500',
  completed: 'bg-blue-500',
  suspended: 'bg-amber-500',
  cancelled: 'bg-red-500',
  draft: 'bg-gray-500',
};

function ProjectCard({ project, t }: { project: Project; t: (key: string) => string }) {
  const progress = Math.round(project.progress ?? 0);

  return (
    <Link
      href={`/explore/projects/${project.id}`}
      className="glass-card-hover group block rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md transition-all duration-300 hover:border-cyan-500/30 hover:bg-white/[0.08]"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
          {project.title}
        </h3>
        <span
          className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${STATUS_COLORS[project.status] ?? STATUS_COLORS.draft}`}
        >
          {t(`status.${project.status}`)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="text-white/50">{t('project.progress')}</span>
          <span className="font-mono font-semibold text-white">{progress}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full transition-all duration-700 ${PROGRESS_COLORS[project.status] ?? PROGRESS_COLORS.draft}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Meta info */}
      <div className="space-y-2 text-sm text-white/60">
        {project.region && (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-cyan-400/60" />
            <span>{project.region.name}</span>
          </div>
        )}
        {project.government_unit && (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-cyan-400/60" />
            <span>{project.government_unit.name}</span>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-white/5 text-sm font-medium text-cyan-400 group-hover:text-cyan-300 transition-colors">
        {t('project.viewDetails')} &rarr;
      </div>
    </Link>
  );
}

export default function ExploreProjectsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const limit = 12;
  const { t } = useI18n();

  const { data, isLoading, isError } = useProjects({
    search: search || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter,
    page,
    limit,
  });

  const projects = data?.data ?? [];
  const meta = data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  const getStatusFilterLabel = (s: string) => {
    if (s === 'all') return t('explore.all');
    return t(`status.${s}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e1a] via-[#0d1225] to-[#0a0e1a] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            {t('explore.title')}
          </h1>
          <p className="mt-3 text-lg text-white/50">
            {t('explore.subtitle')}
          </p>
        </div>

        {/* Search */}
        <div className="relative mx-auto mb-8 max-w-xl">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder={t('explore.searchPlaceholder')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-12 pr-4 text-white placeholder-white/30 backdrop-blur-md transition-colors focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
          />
        </div>

        {/* Status filter pills */}
        <div className="mb-8 flex flex-wrap justify-center gap-2">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(s);
                setPage(1);
              }}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-all duration-200 ${
                statusFilter === s
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                  : 'border border-white/10 text-white/50 hover:border-white/20 hover:text-white/70'
              }`}
            >
              {getStatusFilterLabel(s)}
            </button>
          ))}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500/30 border-t-cyan-400" />
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center text-red-300">
            {t('explore.failedToLoad')}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && projects.length === 0 && (
          <div className="py-20 text-center text-white/40">
            {t('explore.noResults')}
          </div>
        )}

        {/* Project grid */}
        {!isLoading && projects.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} t={t} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-12 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/60 transition-colors hover:border-white/20 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {t('explore.previous')}
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
              .map((p, idx, arr) => {
                const prev = arr[idx - 1];
                const showEllipsis = prev !== undefined && p - prev > 1;
                return (
                  <span key={p} className="flex items-center gap-1">
                    {showEllipsis && <span className="px-1 text-white/30">...</span>}
                    <button
                      onClick={() => setPage(p)}
                      className={`h-10 w-10 rounded-lg text-sm font-medium transition-all ${
                        p === page
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'border border-white/10 text-white/50 hover:border-white/20 hover:text-white'
                      }`}
                    >
                      {p}
                    </button>
                  </span>
                );
              })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/60 transition-colors hover:border-white/20 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {t('explore.next')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
