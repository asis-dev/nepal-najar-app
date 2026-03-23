import type { ReactNode } from 'react';
import { Activity, Bot, CheckCircle2, Gauge, MessageSquare, Radar, ShieldCheck, Users } from 'lucide-react';
import { getPilotTracker } from '@/lib/data/pilot-tracker';
import { PilotSummaryPanel } from '@/components/dashboard/pilot-summary-panel';

export const dynamic = 'force-dynamic';

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function StatCard({
  label,
  value,
  note,
  icon,
}: {
  label: string;
  value: string;
  note: string;
  icon: ReactNode;
}) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-gray-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
          <p className="mt-2 text-sm text-gray-400">{note}</p>
        </div>
        <div className="rounded-2xl border border-primary-500/20 bg-primary-500/10 p-3 text-primary-300">
          {icon}
        </div>
      </div>
    </div>
  );
}

export default async function PilotPage() {
  const tracker = await getPilotTracker(14);
  const maxDailyViews = Math.max(...tracker.usage.dailyActivity.map((row) => row.views), 1);
  const maxTopPageViews = Math.max(...tracker.usage.topPages.map((row) => row.views), 1);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="section-title flex items-center gap-3">
            <Gauge className="h-6 w-6 text-primary-400" />
            Pilot Tracker
          </h1>
          <p className="section-subtitle">
            Real usage, real feedback, and real engine health from the last {tracker.window.days} days.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-gray-300">
          Tracking window started {formatDateTime(tracker.window.sinceIso)}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Unique Visitors"
          value={tracker.usage.uniqueVisitors.toString()}
          note={`${tracker.usage.sessions} sessions and ${tracker.usage.returningVisitors} returning visitors`}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          label="Page Views"
          value={tracker.usage.pageViews.toString()}
          note="Captured from public and landing routes"
          icon={<Activity className="h-5 w-5" />}
        />
        <StatCard
          label="Community Signals"
          value={(tracker.engine.evidenceRows + tracker.engine.verificationRows + tracker.feedback.total).toString()}
          note={`${tracker.feedback.total} feedback, ${tracker.engine.evidenceRows} proof, ${tracker.engine.verificationRows} verification votes`}
          icon={<MessageSquare className="h-5 w-5" />}
        />
        <StatCard
          label="Engine Queue"
          value={`${tracker.engine.jobs.pending}`}
          note={`${tracker.engine.jobs.running} running, ${tracker.engine.statusRecommendations.pending} pending status recommendations`}
          icon={<Bot className="h-5 w-5" />}
        />
      </div>

      <PilotSummaryPanel days={tracker.window.days} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <div className="glass-card p-6">
          <div className="mb-5 flex items-center gap-2">
            <Radar className="h-5 w-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">Daily pilot activity</h2>
          </div>

          <div className="space-y-4">
            {tracker.usage.dailyActivity.map((row) => (
              <div key={row.day} className="grid grid-cols-[88px_1fr_auto] items-center gap-4">
                <div className="text-xs font-medium uppercase tracking-[0.16em] text-gray-500">
                  {row.day.slice(5)}
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-white/[0.05]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary-500 via-cyan-400 to-emerald-400"
                    style={{ width: `${Math.max((row.views / maxDailyViews) * 100, row.views > 0 ? 8 : 0)}%` }}
                  />
                </div>
                <div className="text-sm text-gray-300">
                  {row.views} views
                  <span className="ml-2 text-xs text-gray-500">{row.actions} actions</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="mb-5 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary-400" />
            <h2 className="text-lg font-semibold text-white">Top pages</h2>
          </div>

          <div className="space-y-4">
            {tracker.usage.topPages.length > 0 ? tracker.usage.topPages.map((page) => (
              <div key={page.path} className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-gray-200">{page.path}</span>
                  <span className="text-gray-400">{page.views} views</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
                  <div
                    className="h-full rounded-full bg-primary-500"
                    style={{ width: `${Math.max((page.views / maxTopPageViews) * 100, page.views > 0 ? 12 : 0)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500">{page.uniqueVisitors} unique visitors</p>
              </div>
            )) : (
              <p className="text-sm text-gray-400">No pilot traffic has been recorded yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="glass-card p-6">
          <div className="mb-5 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-white">Action loop</h2>
          </div>
          <div className="space-y-3 text-sm text-gray-300">
            <div className="flex items-center justify-between">
              <span>Watchlist adds</span>
              <span>{tracker.usage.actionCounts.watchlistAdds}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Watchlist removals</span>
              <span>{tracker.usage.actionCounts.watchlistRemovals}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Hometown set</span>
              <span>{tracker.usage.actionCounts.hometownSet}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Feedback submitted</span>
              <span>{tracker.usage.actionCounts.feedbackSubmits}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Proof submitted</span>
              <span>{tracker.usage.actionCounts.evidenceSubmits}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Progress verified</span>
              <span>{tracker.usage.actionCounts.verifyProgress}</span>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="mb-5 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-white">Feedback truth</h2>
          </div>
          <div className="space-y-3 text-sm text-gray-300">
            <div className="flex items-center justify-between">
              <span>Total feedback</span>
              <span>{tracker.feedback.total}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Average rating</span>
              <span>{tracker.feedback.averageRating ? tracker.feedback.averageRating.toFixed(1) : '—'}</span>
            </div>
            {tracker.feedback.byType.map((item) => (
              <div key={item.type} className="flex items-center justify-between text-gray-400">
                <span className="capitalize">{item.type}</span>
                <span>{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="mb-5 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">Trust boundary</h2>
          </div>
          <div className="space-y-3 text-sm text-gray-300">
            <div className="flex items-center justify-between">
              <span>Public commitments</span>
              <span>{tracker.trust.publicCommitments}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Candidate commitments</span>
              <span>{tracker.trust.candidateCommitments}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Reviewed commitments</span>
              <span>{tracker.trust.reviewedCommitments}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Recommendation rejection rate</span>
              <span>{formatPercent(tracker.engine.recommendationRejectionRate)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="glass-card p-6">
          <div className="mb-5 flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary-400" />
            <h2 className="text-lg font-semibold text-white">Engine health</h2>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: 'Pending jobs', value: tracker.engine.jobs.pending },
              { label: 'Running jobs', value: tracker.engine.jobs.running },
              { label: 'Completed jobs', value: tracker.engine.jobs.completed },
              { label: 'Failed jobs', value: tracker.engine.jobs.failed },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-gray-500">{item.label}</p>
                <p className="mt-2 text-2xl font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-3 text-sm text-gray-300">
            <div className="flex items-center justify-between">
              <span>Promise updates in window</span>
              <span>{tracker.engine.promiseUpdates}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Citizen evidence rows</span>
              <span>{tracker.engine.evidenceRows}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Verification rows</span>
              <span>{tracker.engine.verificationRows}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Pending status recommendations</span>
              <span>{tracker.engine.statusRecommendations.pending}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Running sweeps</span>
              <span>{tracker.engine.runningSweeps}</span>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-gray-500">
              Job mix
            </h3>
            <div className="space-y-3">
              {tracker.engine.jobTypes.length > 0 ? tracker.engine.jobTypes.map((item) => (
                <div key={item.jobType} className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">{item.jobType}</span>
                  <span className="text-gray-500">{item.count}</span>
                </div>
              )) : (
                <p className="text-sm text-gray-400">No worker jobs recorded yet.</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6">
            <div className="mb-5 flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-400" />
              <h2 className="text-lg font-semibold text-white">Latest sweep</h2>
            </div>

            {tracker.engine.latestSweep ? (
              <div className="space-y-3 text-sm text-gray-300">
                <div className="flex items-center justify-between">
                  <span>Status</span>
                  <span className="capitalize">{tracker.engine.latestSweep.status}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Sweep type</span>
                  <span className="capitalize">{tracker.engine.latestSweep.sweep_type}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Started</span>
                  <span>{formatDateTime(tracker.engine.latestSweep.started_at)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Signals discovered</span>
                  <span>{tracker.engine.latestSweep.signals_discovered ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Tier 3 analyzed</span>
                  <span>{tracker.engine.latestSweep.tier3_analyzed ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Commitments updated</span>
                  <span>{tracker.engine.latestSweep.promises_updated ?? 0}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">No sweep has been recorded yet.</p>
            )}
          </div>

          <div className="glass-card p-6">
            <div className="mb-5 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary-400" />
              <h2 className="text-lg font-semibold text-white">Recent feedback</h2>
            </div>

            <div className="space-y-4">
              {tracker.feedback.recent.length > 0 ? tracker.feedback.recent.map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.16em] text-gray-500">
                    <span>{item.feedback_type}</span>
                    <span>{formatDateTime(item.created_at)}</span>
                  </div>
                  <p className="mt-3 text-sm text-gray-200 line-clamp-3">{item.message}</p>
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                    <span>{item.page_context || 'No page context'}</span>
                    <span>{item.ai_review_status || 'pending review'}</span>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-gray-400">No feedback has been recorded in this pilot window yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
