'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, Filter, ChevronLeft, ChevronRight, Loader2,
  FolderKanban, ArrowUpDown
} from 'lucide-react';
import { useProjects } from '@/lib/hooks/use-projects';
import { formatDate } from '@/lib/utils';

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: 'Active', className: 'badge-green' },
  draft: { label: 'Draft', className: 'badge-gray' },
  suspended: { label: 'Suspended', className: 'badge-yellow' },
  completed: { label: 'Completed', className: 'badge-blue' },
  cancelled: { label: 'Cancelled', className: 'badge-red' },
};

const priorityConfig: Record<string, { label: string; className: string }> = {
  low: { label: 'Low', className: 'text-gray-500' },
  medium: { label: 'Medium', className: 'text-blue-600' },
  high: { label: 'High', className: 'text-orange-600 font-semibold' },
  critical: { label: 'Critical', className: 'text-red-600 font-semibold' },
};

export default function ProjectsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading, isError } = useProjects({
    search: search || undefined,
    status: statusFilter || undefined,
    page,
    limit,
  });

  const projects = data?.data ?? [];
  const meta = data?.meta ?? { total: 0, page: 1, limit: 20, totalPages: 1 };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500 mt-1">
            {meta.total} government development projects
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects..."
              className="input pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            className="input w-auto min-w-[160px]"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="suspended">Suspended</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : isError ? (
          <div className="p-12 text-center text-red-500">
            Failed to load projects. Check your connection and try again.
          </div>
        ) : projects.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <FolderKanban className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            No projects found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-6 py-3 font-medium text-gray-500">Title</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Ministry / Unit</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Status</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Progress</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Priority</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Region</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {projects.map((project) => {
                  const status = statusConfig[project.status] ?? statusConfig.draft;
                  const priority = priorityConfig[project.priority] ?? priorityConfig.medium;
                  return (
                    <tr
                      key={project.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/projects/${project.id}`)}
                    >
                      <td className="px-6 py-3">
                        <span className="font-medium text-gray-900">{project.title}</span>
                      </td>
                      <td className="px-6 py-3 text-gray-600">
                        {project.government_unit?.name ?? '—'}
                      </td>
                      <td className="px-6 py-3">
                        <span className={status.className}>{status.label}</span>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${
                                project.progress >= 75
                                  ? 'bg-green-500'
                                  : project.progress >= 40
                                    ? 'bg-blue-500'
                                    : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(project.progress, 100)}%` }}
                            />
                          </div>
                          <span className="text-gray-600 tabular-nums">{project.progress}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <span className={priority.className}>{priority.label}</span>
                      </td>
                      <td className="px-6 py-3 text-gray-600">
                        {project.region?.name ?? '—'}
                      </td>
                      <td className="px-6 py-3 text-gray-500 text-xs">
                        {formatDate(project.updated_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Page {meta.page} of {meta.totalPages} ({meta.total} total)
            </p>
            <div className="flex items-center gap-2">
              <button
                className="btn-secondary !py-1.5 !px-3 text-sm flex items-center gap-1"
                disabled={meta.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-4 h-4" />
                Prev
              </button>
              <button
                className="btn-secondary !py-1.5 !px-3 text-sm flex items-center gap-1"
                disabled={meta.page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
