'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Loader2, AlertTriangle, Filter } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface BlockerItem {
  id: string;
  title: string;
  blocker_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'escalated' | 'resolved';
  project?: { id: string; title: string };
  owner_unit?: { id: string; name: string };
  created_at: string;
  resolved_at?: string;
}

const severityConfig: Record<string, { label: string; className: string; order: number }> = {
  critical: { label: 'Critical', className: 'badge-red', order: 0 },
  high: { label: 'High', className: 'bg-orange-100 text-orange-800 badge', order: 1 },
  medium: { label: 'Medium', className: 'badge-yellow', order: 2 },
  low: { label: 'Low', className: 'badge-green', order: 3 },
};

const statusConfig: Record<string, { label: string; className: string }> = {
  open: { label: 'Open', className: 'badge-red' },
  in_progress: { label: 'In Progress', className: 'badge-yellow' },
  escalated: { label: 'Escalated', className: 'bg-orange-100 text-orange-800 badge' },
  resolved: { label: 'Resolved', className: 'badge-green' },
};

export default function BlockersPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');

  // Fetch all blockers from the global endpoint
  const { data: blockersRaw, isLoading, isError } = useQuery({
    queryKey: ['blockers', statusFilter, severityFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (severityFilter) params.severity = severityFilter;
      const { data } = await api.get('/blockers', { params });
      return data as any[];
    },
  });

  // Map API response fields to what the UI expects
  const filtered: BlockerItem[] = (blockersRaw ?? [])
    .map((b: any) => ({
      id: b.id,
      title: b.title,
      blocker_type: b.type,
      severity: b.severity,
      status: b.status,
      project: b.project ? { id: b.project.id, title: b.project.title } : undefined,
      owner_unit: b.owner_government_unit ? { id: b.owner_government_unit.id, name: b.owner_government_unit.name } : undefined,
      created_at: b.opened_at || b.updated_at,
      resolved_at: b.resolved_at,
    }))
    .sort((a: BlockerItem, b: BlockerItem) => {
      const aOrder = severityConfig[a.severity]?.order ?? 9;
      const bOrder = severityConfig[b.severity]?.order ?? 9;
      return aOrder - bOrder;
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Blockers</h1>
        <p className="text-gray-500 mt-1">
          {filtered.length} blocker{filtered.length !== 1 ? 's' : ''} across all projects
        </p>
      </div>

      {/* Filter Bar */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            className="input w-auto min-w-[160px]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="escalated">Escalated</option>
            <option value="resolved">Resolved</option>
          </select>
          <select
            className="input w-auto min-w-[160px]"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
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
            Failed to load blockers. Check your connection and try again.
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <AlertTriangle className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            No blockers found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-6 py-3 font-medium text-gray-500">Title</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Project</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Severity</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Status</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Type</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Owner Unit</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Opened</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((b) => {
                  const sev = severityConfig[b.severity] ?? severityConfig.medium;
                  const bStatus = statusConfig[b.status] ?? statusConfig.open;
                  return (
                    <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 font-medium text-gray-900">{b.title}</td>
                      <td className="px-6 py-3 text-gray-600">
                        {b.project?.title ?? '—'}
                      </td>
                      <td className="px-6 py-3">
                        <span className={sev.className}>{sev.label}</span>
                      </td>
                      <td className="px-6 py-3">
                        <span className={bStatus.className}>{bStatus.label}</span>
                      </td>
                      <td className="px-6 py-3 text-gray-600 capitalize">
                        {b.blocker_type?.replace(/_/g, ' ') ?? '—'}
                      </td>
                      <td className="px-6 py-3 text-gray-600">
                        {b.owner_unit?.name ?? '—'}
                      </td>
                      <td className="px-6 py-3 text-gray-500 text-xs">
                        {formatDate(b.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
