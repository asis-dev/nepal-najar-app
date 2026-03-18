'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Target, CheckCircle2, Clock, AlertTriangle, CircleDot, Ban } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface MilestoneItem {
  id: string;
  title: string;
  status: string;
  weight_percent: number;
  sequence_number: number;
  due_date: string;
  completion_date?: string;
  project?: { id: string; title: string };
}

const milestoneStatusConfig: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  completed: { label: 'Completed', icon: CheckCircle2, className: 'text-green-600' },
  in_progress: { label: 'In Progress', icon: Clock, className: 'text-blue-600' },
  pending: { label: 'Pending', icon: CircleDot, className: 'text-gray-400' },
  not_started: { label: 'Not Started', icon: CircleDot, className: 'text-gray-400' },
  blocked: { label: 'Blocked', icon: AlertTriangle, className: 'text-red-600' },
  cancelled: { label: 'Cancelled', icon: Ban, className: 'text-gray-400' },
};

export default function MilestonesPage() {
  const [statusFilter, setStatusFilter] = useState('');

  const { data: milestones, isLoading, isError } = useQuery({
    queryKey: ['milestones', statusFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/milestones', { params });
      return data as MilestoneItem[];
    },
  });

  const filtered = milestones ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Milestones</h1>
        <p className="text-gray-500 mt-1">
          {filtered.length} milestone{filtered.length !== 1 ? 's' : ''} across all projects
        </p>
      </div>

      {/* Filter Bar */}
      <div className="card p-4">
        <div className="flex gap-3">
          <select
            className="input w-auto min-w-[160px]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="not_started">Not Started</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="blocked">Blocked</option>
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
            Failed to load milestones. Check your connection and try again.
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Target className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            No milestones found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-6 py-3 font-medium text-gray-500">Title</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Project</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Status</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Weight</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Due Date</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((ms) => {
                  const msStatus = milestoneStatusConfig[ms.status] ?? milestoneStatusConfig.pending;
                  const Icon = msStatus.icon;
                  const weight = Number(ms.weight_percent ?? 0);
                  return (
                    <tr key={ms.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 font-medium text-gray-900">{ms.title}</td>
                      <td className="px-6 py-3 text-gray-600">{ms.project?.title ?? '—'}</td>
                      <td className="px-6 py-3">
                        <div className={`flex items-center gap-1.5 ${msStatus.className}`}>
                          <Icon className="w-4 h-4" />
                          {msStatus.label}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-12 bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-blue-500 h-1.5 rounded-full"
                              style={{ width: `${Math.min(weight, 100)}%` }}
                            />
                          </div>
                          <span className="text-gray-600 tabular-nums">{weight}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-gray-600">
                        {ms.due_date ? formatDate(ms.due_date) : '—'}
                      </td>
                      <td className="px-6 py-3 text-gray-600">
                        {ms.completion_date ? formatDate(ms.completion_date) : '—'}
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
