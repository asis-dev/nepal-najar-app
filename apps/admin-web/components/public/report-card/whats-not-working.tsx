'use client';

import { AlertTriangle, Globe, XCircle, Clock, AlertOctagon } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { DownSource, SilentPromise } from '@/lib/hooks/use-accountability';

interface WhatsNotWorkingProps {
  downSources: DownSource[];
  silentPromises: SilentPromise[];
}

function statusLabelKey(status: DownSource['status']): string {
  const map: Record<string, string> = {
    down: 'accountability.down',
    blocked: 'accountability.blocked',
    stale: 'accountability.stale',
    unreachable: 'accountability.unreachable',
  };
  return map[status] ?? 'accountability.down';
}

function statusDot(status: DownSource['status']): string {
  switch (status) {
    case 'down': return 'bg-red-500';
    case 'blocked': return 'bg-orange-500';
    case 'stale': return 'bg-amber-500';
    case 'unreachable': return 'bg-red-500';
  }
}

function statusColors(status: DownSource['status']): string {
  switch (status) {
    case 'down': return 'bg-red-500/15 text-red-400';
    case 'blocked': return 'bg-orange-500/15 text-orange-400';
    case 'stale': return 'bg-amber-500/15 text-amber-400';
    case 'unreachable': return 'bg-red-500/15 text-red-400';
  }
}

export function WhatsNotWorkingSection({ downSources, silentPromises }: WhatsNotWorkingProps) {
  const { locale, t } = useI18n();
  const isNe = locale === 'ne';

  function timeAgo(date: string | null): string {
    if (!date) return t('accountability.neverChecked');
    const diff = Date.now() - new Date(date).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return t('accountability.checkedJustNow');
    if (hours < 24) return t('accountability.checkedHoursAgo').replace('{hours}', String(hours));
    const days = Math.floor(hours / 24);
    return t('accountability.checkedDaysAgo').replace('{days}', String(days));
  }

  const govPortals = downSources.filter((s) => s.type === 'government_portal');
  const failedSources = downSources.filter((s) => s.type === 'data_source');
  const totalIssues = downSources.length + silentPromises.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-5 h-5 text-red-400" />
        <h3 className="text-lg font-semibold text-white">
          {t('accountability.whatsNotWorking')}
        </h3>
        <span className="text-xs text-red-400/70 ml-auto">
          {totalIssues} {t('accountability.issues')}
        </span>
      </div>

      {/* Government portals down */}
      {govPortals.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-gray-500" />
            <h4 className="text-sm font-medium text-gray-400">
              {t('accountability.govPortalsDown')}
            </h4>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/20 font-semibold">
              {govPortals.length}
            </span>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {govPortals.map((source) => (
              <div
                key={source.url}
                className="glass-card p-3 border-l-2 border-red-500/40"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`w-2 h-2 rounded-full ${statusDot(source.status)} animate-pulse`} />
                  <span className="text-sm font-medium text-gray-200 truncate flex-1">
                    {source.name}
                  </span>
                  <span className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border border-current/20 ${statusColors(source.status)}`}>
                    {t(statusLabelKey(source.status))}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-gray-600">
                  <span className="truncate">{source.url}</span>
                  <span className="ml-auto whitespace-nowrap">
                    <Clock className="w-2.5 h-2.5 inline mr-0.5" />
                    {timeAgo(source.lastChecked)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Failed data sources */}
      {failedSources.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <XCircle className="w-4 h-4 text-gray-500" />
            <h4 className="text-sm font-medium text-gray-400">
              {t('accountability.failedDataSources')}
            </h4>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20 font-semibold">
              {failedSources.length}
            </span>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {failedSources.map((source) => (
              <div
                key={source.url}
                className="glass-card p-3 border-l-2 border-amber-500/30"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${statusDot(source.status)}`} />
                  <span className="text-xs font-medium text-gray-300 truncate">
                    {source.name}
                  </span>
                </div>
                <span className="text-[10px] text-gray-600">
                  {timeAgo(source.lastChecked)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Silent promises */}
      {silentPromises.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertOctagon className="w-4 h-4 text-gray-500" />
            <h4 className="text-sm font-medium text-gray-400">
              {t('accountability.zeroEvidence')}
            </h4>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-500/15 text-gray-400 border border-gray-500/20 font-semibold">
              {silentPromises.length}
            </span>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {silentPromises.map((p) => (
              <div
                key={p.id}
                className="glass-card p-3 border-l-2 border-gray-500/20"
              >
                <span className="text-xs font-medium text-gray-400 line-clamp-2">
                  {isNe && p.title_ne ? p.title_ne : p.title}
                </span>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-gray-600">
                    {t(`categoryName.${p.category}`)}
                  </span>
                  <span className="text-[10px] text-amber-500/60 ml-auto">
                    {t('accountability.noUpdates')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
