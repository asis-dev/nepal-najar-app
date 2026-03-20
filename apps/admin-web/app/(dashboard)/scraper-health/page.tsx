'use client';

import {
  HeartPulse, Database, Activity, FileText, Clock,
  CheckCircle2, XCircle, AlertTriangle, Loader2,
} from 'lucide-react';
import { useScraperHealth } from '@/lib/hooks/use-scraping';

function relativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function healthColor(source: any): 'green' | 'yellow' | 'red' {
  if (source.failures > 0) return 'red';
  if (!source.lastSuccess) return 'yellow';
  const hoursSince = (Date.now() - new Date(source.lastSuccess).getTime()) / 3_600_000;
  if (hoursSince > 24) return 'yellow';
  return 'green';
}

const dotColors = {
  green: 'bg-emerald-400 shadow-emerald-400/40',
  yellow: 'bg-amber-400 shadow-amber-400/40',
  red: 'bg-red-400 shadow-red-400/40',
};

export default function ScraperHealthPage() {
  const { data, isLoading, isError } = useScraperHealth();

  const sources = data?.sources ?? [];
  const recentRuns = (data?.recentRuns ?? []).slice(0, 10);
  const stats = data?.stats ?? {};

  const totalSources = sources.length;
  const activeSources = sources.filter((s: any) => s.active !== false).length;
  const totalArticles = stats.totalArticles ?? 0;
  const unprocessedArticles = stats.unprocessedArticles ?? 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="section-title flex items-center gap-3">
          <HeartPulse className="w-7 h-7 text-primary-400" />
          Scraper Health
        </h1>
        <p className="section-subtitle">
          Real-time monitoring of data collection sources and scrape runs
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={<Database className="w-4 h-4 text-primary-400" />}
          label="Total Sources"
          value={totalSources}
          loading={isLoading}
        />
        <SummaryCard
          icon={<Activity className="w-4 h-4 text-emerald-400" />}
          label="Active Sources"
          value={activeSources}
          loading={isLoading}
          accent="emerald"
        />
        <SummaryCard
          icon={<FileText className="w-4 h-4 text-cyan-400" />}
          label="Total Articles"
          value={totalArticles}
          loading={isLoading}
          accent="cyan"
        />
        <SummaryCard
          icon={<AlertTriangle className="w-4 h-4 text-amber-400" />}
          label="Unprocessed"
          value={unprocessedArticles}
          loading={isLoading}
          accent="amber"
        />
      </div>

      {/* Error state */}
      {isError && (
        <div className="glass-card p-4 border border-red-500/20 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-300 text-sm">Failed to fetch scraper health data. Will retry automatically.</p>
        </div>
      )}

      {/* Source Health Table */}
      <div>
        <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-3">Source Health</h2>
        {isLoading ? (
          <div className="glass-card p-8">
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton h-12 rounded-xl" />
              ))}
            </div>
          </div>
        ) : sources.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Database className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-sm">No sources configured yet.</p>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <table className="table-dark">
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Last Success</th>
                  <th>Failures</th>
                  <th>Avg Response</th>
                  <th>Health</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((source: any, idx: number) => {
                  const color = healthColor(source);
                  return (
                    <tr key={source.id ?? idx}>
                      <td>
                        <span className="text-gray-200 font-medium text-sm">
                          {source.name ?? source.slug ?? `Source ${idx + 1}`}
                        </span>
                      </td>
                      <td className="text-xs text-gray-400">
                        {relativeTime(source.lastSuccess ?? source.last_success_at)}
                      </td>
                      <td>
                        <span className={`text-sm font-semibold ${
                          (source.failures ?? 0) > 0 ? 'text-red-400' : 'text-gray-500'
                        }`}>
                          {source.failures ?? 0}
                        </span>
                      </td>
                      <td className="text-xs text-gray-400">
                        {source.avgResponseMs ?? source.avg_response_ms
                          ? `${Math.round(source.avgResponseMs ?? source.avg_response_ms)}ms`
                          : '—'}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full shadow-sm ${dotColors[color]}`} />
                          <span className={`text-xs font-medium capitalize ${
                            color === 'green' ? 'text-emerald-400' :
                            color === 'yellow' ? 'text-amber-400' : 'text-red-400'
                          }`}>
                            {color === 'green' ? 'Healthy' : color === 'yellow' ? 'Stale' : 'Failing'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Runs Timeline */}
      <div>
        <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-3">Recent Runs</h2>
        {isLoading ? (
          <div className="glass-card p-8">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="skeleton h-14 rounded-xl" />
              ))}
            </div>
          </div>
        ) : recentRuns.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Clock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-sm">No scrape runs recorded yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentRuns.map((run: any, idx: number) => {
              const isSuccess = run.status === 'completed' || run.status === 'success';
              const isFailed = run.status === 'failed' || run.status === 'error';
              const isRunning = run.status === 'running';

              return (
                <div key={run.id ?? idx} className="glass-card-hover px-5 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Status icon */}
                      <div className="flex-shrink-0">
                        {isRunning ? (
                          <Loader2 className="w-4 h-4 text-primary-400 animate-spin" />
                        ) : isSuccess ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : isFailed ? (
                          <XCircle className="w-4 h-4 text-red-400" />
                        ) : (
                          <Clock className="w-4 h-4 text-gray-500" />
                        )}
                      </div>

                      {/* Timestamp */}
                      <div className="min-w-0">
                        <p className="text-sm text-gray-200 font-medium">
                          {run.started_at || run.startedAt
                            ? new Date(run.started_at ?? run.startedAt).toLocaleString()
                            : 'Unknown time'}
                        </p>
                        <div className="flex items-center gap-4 mt-0.5 text-[11px] text-gray-500">
                          {(run.sourcesAttempted !== undefined || run.sources_attempted !== undefined) && (
                            <span>
                              Sources: {run.sourcesSucceeded ?? run.sources_succeeded ?? '?'}/{run.sourcesAttempted ?? run.sources_attempted ?? '?'}
                            </span>
                          )}
                          {(run.articlesFound !== undefined || run.articles_found !== undefined) && (
                            <span>
                              Articles: {run.articlesNew ?? run.articles_new ?? '?'} new / {run.articlesFound ?? run.articles_found ?? '?'} found
                            </span>
                          )}
                          {(run.duration !== undefined || run.duration_ms !== undefined) && (
                            <span>
                              {((run.duration ?? run.duration_ms) / 1000).toFixed(1)}s
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status badge */}
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full flex-shrink-0 ${
                      isSuccess
                        ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20'
                        : isFailed
                        ? 'bg-red-400/10 text-red-400 border border-red-400/20'
                        : isRunning
                        ? 'bg-primary-400/10 text-primary-400 border border-primary-400/20'
                        : 'bg-gray-400/10 text-gray-400 border border-gray-400/20'
                    }`}>
                      {run.status ?? 'unknown'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
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
          accent === 'emerald' ? '16,185,129' :
          accent === 'cyan' ? '6,182,212' :
          accent === 'amber' ? '245,158,11' : '59,130,246'
        },0.15)` } : undefined}
      >
        {icon}
      </div>
      <div className="mt-3">
        {loading ? (
          <div className="skeleton h-8 w-16 rounded" />
        ) : (
          <p className="stat-value">{value.toLocaleString()}</p>
        )}
        <p className="stat-label">{label}</p>
      </div>
    </div>
  );
}
