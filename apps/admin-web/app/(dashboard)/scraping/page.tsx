'use client';

import { useState } from 'react';
import {
  Radar, Play, Clock, CheckCircle2, XCircle,
  Activity, ExternalLink, AlertTriangle, FileSearch,
  Loader2, RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import {
  useScrapingStatus,
  useScrapingFindings,
  usePotentialProjects,
  useTriggerScraping,
} from '@/lib/hooks/use-scraping';

export default function ScrapingPage() {
  const { data: status, isLoading: statusLoading } = useScrapingStatus();
  const { data: findings = [], isLoading: findingsLoading } = useScrapingFindings({ limit: 20 });
  const { data: potential = [], isLoading: potentialLoading } = usePotentialProjects({ limit: 10 });
  const triggerMutation = useTriggerScraping();
  const [activeTab, setActiveTab] = useState<'findings' | 'potential'>('findings');

  const handleTrigger = () => {
    triggerMutation.mutate({ source: 'kathmandu-post' });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title flex items-center gap-3">
            <Radar className="w-7 h-7 text-primary-400" />
            Data Scanner
          </h1>
          <p className="section-subtitle">
            Automated intelligence gathering from Nepal development sources
          </p>
        </div>
        <button
          onClick={handleTrigger}
          disabled={triggerMutation.isPending}
          className="btn-primary flex items-center gap-2"
        >
          {triggerMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          {triggerMutation.isPending ? 'Scanning...' : 'Run Scan Now'}
        </button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard
          icon={<Activity className="w-4 h-4 text-primary-400" />}
          label="Total Jobs"
          value={status?.total ?? 0}
          loading={statusLoading}
        />
        <StatusCard
          icon={<RefreshCw className="w-4 h-4 text-amber-400" />}
          label="In Progress"
          value={status?.in_progress ?? 0}
          loading={statusLoading}
          accent="amber"
        />
        <StatusCard
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          label="Completed"
          value={status?.completed ?? 0}
          loading={statusLoading}
          accent="emerald"
        />
        <StatusCard
          icon={<XCircle className="w-4 h-4 text-red-400" />}
          label="Failed"
          value={status?.failed ?? 0}
          loading={statusLoading}
          accent="red"
        />
      </div>

      {/* Last Run */}
      {status?.last_run_at && (
        <div className="glass-card px-4 py-3 flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className="text-gray-400">Last scan:</span>
          <span className="text-gray-200">
            {new Date(status.last_run_at).toLocaleString()}
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 glass-card p-1 w-fit">
        <button
          onClick={() => setActiveTab('findings')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'findings'
              ? 'bg-primary-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <FileSearch className="w-4 h-4 inline mr-2" />
          Findings ({findings.length})
        </button>
        <button
          onClick={() => setActiveTab('potential')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'potential'
              ? 'bg-primary-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <AlertTriangle className="w-4 h-4 inline mr-2" />
          Potential Projects ({potential.length})
        </button>
      </div>

      {/* Content */}
      {activeTab === 'findings' ? (
        <FindingsTable findings={findings} loading={findingsLoading} />
      ) : (
        <PotentialTable potential={potential} loading={potentialLoading} />
      )}
    </div>
  );
}

function StatusCard({
  icon, label, value, loading, accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  loading: boolean;
  accent?: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-icon !w-8 !h-8 !mb-0"
        style={accent ? { background: `rgba(${
          accent === 'amber' ? '245,158,11' : accent === 'emerald' ? '16,185,129' : '239,68,68'
        },0.15)` } : undefined}
      >
        {icon}
      </div>
      <div className="mt-3">
        {loading ? (
          <div className="skeleton h-8 w-16 rounded" />
        ) : (
          <p className="stat-value">{value}</p>
        )}
        <p className="stat-label">{label}</p>
      </div>
    </div>
  );
}

function FindingsTable({ findings, loading }: { findings: any[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="glass-card p-8">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton h-16 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (findings.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <FileSearch className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400 text-sm">No findings yet. Run a scan to discover development updates.</p>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <table className="table-dark">
        <thead>
          <tr>
            <th>Title</th>
            <th>Type</th>
            <th>Confidence</th>
            <th>Source</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {findings.map((f: any) => (
            <tr key={f.id}>
              <td>
                <div className="max-w-[300px]">
                  <p className="text-gray-200 font-medium truncate">{f.title}</p>
                  {f.body && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">{f.body}</p>
                  )}
                </div>
              </td>
              <td>
                <span className="badge-blue text-[10px]">{f.finding_type ?? 'general'}</span>
              </td>
              <td>
                <div className="flex items-center gap-2">
                  <div className="progress-bar w-16">
                    <div
                      className={`progress-bar-fill ${
                        (f.confidence ?? 0) >= 0.7 ? 'success' :
                        (f.confidence ?? 0) >= 0.4 ? 'warning' : 'danger'
                      }`}
                      style={{ width: `${(f.confidence ?? 0) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400">{Math.round((f.confidence ?? 0) * 100)}%</span>
                </div>
              </td>
              <td>
                {f.source_url ? (
                  <a
                    href={f.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-400 hover:text-primary-300 text-xs flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Source
                  </a>
                ) : (
                  <span className="text-gray-500 text-xs">—</span>
                )}
              </td>
              <td className="text-xs text-gray-500">
                {f.created_at ? new Date(f.created_at).toLocaleDateString() : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PotentialTable({ potential, loading }: { potential: any[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="glass-card p-8">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (potential.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <AlertTriangle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400 text-sm">No potential projects discovered yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {potential.map((p: any) => (
        <div key={p.id} className="glass-card-hover p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-bold text-white truncate">{p.title}</h3>
                <span className={`text-[10px] ${
                  p.status === 'linked' ? 'badge-green' :
                  p.status === 'dismissed' ? 'badge-gray' : 'badge-yellow'
                }`}>
                  {p.status ?? 'pending'}
                </span>
              </div>
              {p.description && (
                <p className="text-xs text-gray-400 line-clamp-2">{p.description}</p>
              )}
              <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-500">
                {p.region_name && (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-400" />
                    {p.region_name}
                  </span>
                )}
                {p.source_url && (
                  <a href={p.source_url} target="_blank" rel="noopener noreferrer"
                    className="text-primary-400 hover:text-primary-300 flex items-center gap-1"
                  >
                    <ExternalLink className="w-2.5 h-2.5" />
                    Source
                  </a>
                )}
                {p.created_at && (
                  <span>{new Date(p.created_at).toLocaleDateString()}</span>
                )}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-xs text-gray-400">Confidence</div>
              <div className="text-lg font-bold text-white">
                {Math.round((p.confidence ?? 0) * 100)}%
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
