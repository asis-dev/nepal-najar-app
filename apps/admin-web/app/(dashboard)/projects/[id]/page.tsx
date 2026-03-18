'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Calendar, MapPin, Building2, User, Loader2,
  CheckCircle2, Clock, AlertTriangle, CircleDot, Target
} from 'lucide-react';
import { useProject, useProjectMilestones, useProjectBlockers } from '@/lib/hooks/use-projects';
import { formatDate } from '@/lib/utils';

const statusConfig: Record<string, { label: string; className: string }> = {
  on_track: { label: 'On Track', className: 'badge-green' },
  delayed: { label: 'Delayed', className: 'badge-yellow' },
  blocked: { label: 'Blocked', className: 'badge-red' },
  completed: { label: 'Completed', className: 'badge-blue' },
  not_started: { label: 'Not Started', className: 'badge-gray' },
};

const milestoneStatusConfig: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  completed: { label: 'Completed', icon: CheckCircle2, className: 'text-green-600' },
  in_progress: { label: 'In Progress', icon: Clock, className: 'text-blue-600' },
  overdue: { label: 'Overdue', icon: AlertTriangle, className: 'text-red-600' },
  not_started: { label: 'Not Started', icon: CircleDot, className: 'text-gray-400' },
};

const severityConfig: Record<string, { label: string; className: string }> = {
  low: { label: 'Low', className: 'badge-green' },
  medium: { label: 'Medium', className: 'badge-yellow' },
  high: { label: 'High', className: 'bg-orange-100 text-orange-800 badge' },
  critical: { label: 'Critical', className: 'badge-red' },
};

const blockerStatusConfig: Record<string, { label: string; className: string }> = {
  open: { label: 'Open', className: 'badge-red' },
  in_progress: { label: 'In Progress', className: 'badge-yellow' },
  escalated: { label: 'Escalated', className: 'bg-orange-100 text-orange-800 badge' },
  resolved: { label: 'Resolved', className: 'badge-green' },
};

type TabKey = 'milestones' | 'blockers' | 'budget';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const [activeTab, setActiveTab] = useState<TabKey>('milestones');

  const { data: project, isLoading, isError } = useProject(projectId);
  const { data: milestones, isLoading: milestonesLoading } = useProjectMilestones(projectId);
  const { data: blockers, isLoading: blockersLoading } = useProjectBlockers(projectId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => router.push('/projects')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Projects
        </button>
        <div className="card p-12 text-center text-red-500">
          Failed to load project. It may not exist or you may not have access.
        </div>
      </div>
    );
  }

  const status = statusConfig[project.status] ?? statusConfig.not_started;

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: 'milestones', label: 'Milestones', count: milestones?.length ?? project.milestones?.length },
    { key: 'blockers', label: 'Blockers', count: blockers?.length ?? project.blockers?.length },
    { key: 'budget', label: 'Budget' },
  ];

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => router.push('/projects')}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Projects
      </button>

      {/* Project Header */}
      <div className="card p-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
              <span className={status.className}>{status.label}</span>
            </div>
            {project.description && (
              <p className="text-gray-600 mb-4 max-w-2xl">{project.description}</p>
            )}
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                <span className="text-sm font-semibold text-gray-900">{project.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full transition-all ${
                    project.progress >= 75
                      ? 'bg-green-500'
                      : project.progress >= 40
                        ? 'bg-blue-500'
                        : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(project.progress, 100)}%` }}
                />
              </div>
            </div>
            {/* Meta Info */}
            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              {project.start_date && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {formatDate(project.start_date)} — {project.target_end_date ? formatDate(project.target_end_date) : 'Ongoing'}
                </div>
              )}
              {project.region && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {project.region.name}
                </div>
              )}
              {project.government_unit && (
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" />
                  {project.government_unit.name}
                </div>
              )}
              {(project as any).created_by && (
                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  {(project as any).created_by.name}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Stats */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Priority</span>
                <span className="font-medium capitalize">{project.priority}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Budget Allocated</span>
                <span className="font-medium">
                  {(project as any).budget_allocated != null
                    ? `NPR ${((project as any).budget_allocated / 1_000_000).toFixed(1)}M`
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Budget Spent</span>
                <span className="font-medium">
                  {(project as any).budget_spent != null
                    ? `NPR ${((project as any).budget_spent / 1_000_000).toFixed(1)}M`
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Created</span>
                <span className="font-medium">{formatDate(project.created_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tab.count != null && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-gray-100 text-xs text-gray-600">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'milestones' && (
        <MilestonesTab milestones={milestones ?? project.milestones ?? []} loading={milestonesLoading} />
      )}
      {activeTab === 'blockers' && (
        <BlockersTab blockers={blockers ?? project.blockers ?? []} loading={blockersLoading} />
      )}
      {activeTab === 'budget' && <BudgetTab project={project} />}
    </div>
  );
}

function MilestonesTab({ milestones, loading }: { milestones: any[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="card p-12 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (milestones.length === 0) {
    return (
      <div className="card p-12 text-center text-gray-400">
        <Target className="w-10 h-10 mx-auto mb-2 text-gray-300" />
        No milestones defined
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-left">
            <th className="px-6 py-3 font-medium text-gray-500 w-8">#</th>
            <th className="px-6 py-3 font-medium text-gray-500">Title</th>
            <th className="px-6 py-3 font-medium text-gray-500">Status</th>
            <th className="px-6 py-3 font-medium text-gray-500">Weight</th>
            <th className="px-6 py-3 font-medium text-gray-500">Due Date</th>
            <th className="px-6 py-3 font-medium text-gray-500">Completed</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {milestones.map((ms, idx) => {
            const msStatus = milestoneStatusConfig[ms.status] ?? milestoneStatusConfig.not_started;
            const Icon = msStatus.icon;
            return (
              <tr key={ms.id} className="hover:bg-gray-50">
                <td className="px-6 py-3 text-gray-400">{ms.sequence ?? idx + 1}</td>
                <td className="px-6 py-3 font-medium text-gray-900">{ms.title}</td>
                <td className="px-6 py-3">
                  <div className={`flex items-center gap-1.5 ${msStatus.className}`}>
                    <Icon className="w-4 h-4" />
                    {msStatus.label}
                  </div>
                </td>
                <td className="px-6 py-3 text-gray-600">{ms.weight}%</td>
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
  );
}

function BlockersTab({ blockers, loading }: { blockers: any[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="card p-12 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (blockers.length === 0) {
    return (
      <div className="card p-12 text-center text-gray-400">
        <AlertTriangle className="w-10 h-10 mx-auto mb-2 text-gray-300" />
        No blockers reported
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-left">
            <th className="px-6 py-3 font-medium text-gray-500">Title</th>
            <th className="px-6 py-3 font-medium text-gray-500">Severity</th>
            <th className="px-6 py-3 font-medium text-gray-500">Status</th>
            <th className="px-6 py-3 font-medium text-gray-500">Type</th>
            <th className="px-6 py-3 font-medium text-gray-500">Owner Unit</th>
            <th className="px-6 py-3 font-medium text-gray-500">Opened</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {blockers.map((b) => {
            const sev = severityConfig[b.severity] ?? severityConfig.medium;
            const bStatus = blockerStatusConfig[b.status] ?? blockerStatusConfig.open;
            return (
              <tr key={b.id} className="hover:bg-gray-50">
                <td className="px-6 py-3 font-medium text-gray-900">{b.title}</td>
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
  );
}

function BudgetTab({ project }: { project: any }) {
  const allocated = project.budget_allocated ?? 0;
  const spent = project.budget_spent ?? 0;
  const remaining = allocated - spent;
  const spentPercent = allocated > 0 ? Math.round((spent / allocated) * 100) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="card p-5">
        <p className="text-sm text-gray-500">Budget Allocated</p>
        <p className="text-2xl font-bold mt-1">
          NPR {(allocated / 1_000_000).toFixed(1)}M
        </p>
      </div>
      <div className="card p-5">
        <p className="text-sm text-gray-500">Budget Spent</p>
        <p className="text-2xl font-bold mt-1 text-blue-600">
          NPR {(spent / 1_000_000).toFixed(1)}M
        </p>
        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
          <div
            className={`h-1.5 rounded-full ${spentPercent > 90 ? 'bg-red-500' : 'bg-blue-500'}`}
            style={{ width: `${Math.min(spentPercent, 100)}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">{spentPercent}% of allocated</p>
      </div>
      <div className="card p-5">
        <p className="text-sm text-gray-500">Remaining</p>
        <p className={`text-2xl font-bold mt-1 ${remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
          NPR {(remaining / 1_000_000).toFixed(1)}M
        </p>
      </div>
    </div>
  );
}
