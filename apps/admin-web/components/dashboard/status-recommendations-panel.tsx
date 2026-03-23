'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  PlayCircle,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface StatusRecommendation {
  id?: string;
  promiseId: number;
  promiseTitle?: string;
  currentStatus: string;
  recommendedStatus: string;
  confidence: number;
  reason: string;
  signalCount: number;
  confirmsCount: number;
  contradictsCount: number;
  reviewState?: 'pending' | 'approved' | 'rejected' | 'applied';
  createdAt?: string;
}

interface RecommendationPayload {
  recommendations: StatusRecommendation[];
  counts: {
    pending: number;
    approved: number;
    rejected: number;
    applied: number;
  };
  total: number;
}

const STATUS_LABELS: Record<string, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  delivered: 'Delivered',
  stalled: 'Stalled',
};

const REVIEW_FILTERS = ['pending', 'approved', 'applied', 'rejected'] as const;

function prettifyStatus(status: string): string {
  return STATUS_LABELS[status] || status.replace(/_/g, ' ');
}

export function StatusRecommendationsPanel() {
  const [filter, setFilter] = useState<(typeof REVIEW_FILTERS)[number]>('pending');
  const [data, setData] = useState<RecommendationPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/status-recommendations?review_state=${filter}&limit=40`,
      );
      if (!res.ok) {
        throw new Error('Failed to load status recommendations');
      }
      const payload = (await res.json()) as RecommendationPayload;
      setData(payload);
    } catch (err) {
      setMessage({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'Failed to load status recommendations',
      });
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const counts = data?.counts || {
    pending: 0,
    approved: 0,
    rejected: 0,
    applied: 0,
  };

  const topRecommendation = useMemo(
    () => data?.recommendations?.[0] || null,
    [data],
  );

  async function act(
    action: 'queue' | 'approve' | 'reject' | 'apply',
    recommendationId?: string,
    submitKey?: string,
  ) {
    setSubmitting(submitKey || recommendationId || action);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/status-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          recommendationId,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error || `Failed to ${action}`);
      }

      setMessage({
        type: 'success',
        text:
          action === 'queue'
            ? 'Status recommendation refresh queued.'
            : action === 'apply'
              ? 'Recommendation applied to the commitment.'
              : `Recommendation ${action}d.`,
      });
      await fetchRecommendations();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : `Failed to ${action}`,
      });
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="glass-card p-6 space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-primary-400" />
            <h2 className="text-lg font-semibold text-white">
              AI Status Recommendations
            </h2>
          </div>
          <p className="text-sm text-gray-400 max-w-2xl">
            Review the engine’s suggested status changes before they become public
            truth. This is where the human-in-the-loop system really earns trust.
          </p>
        </div>

        <button
          onClick={() => act('queue')}
          disabled={submitting === 'queue'}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary-500/20 bg-primary-500/10 px-4 py-2 text-sm font-medium text-primary-300 transition-colors hover:bg-primary-500/20 disabled:opacity-60"
        >
          {submitting === 'queue' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Queue Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {REVIEW_FILTERS.map((state) => (
          <button
            key={state}
            onClick={() => setFilter(state)}
            className={`rounded-2xl border px-4 py-3 text-left transition-all ${
              filter === state
                ? 'border-primary-500/40 bg-primary-500/10'
                : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]'
            }`}
          >
            <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
              {state}
            </p>
            <p className="mt-1 text-2xl font-semibold text-white">
              {counts[state]}
            </p>
          </button>
        ))}
      </div>

      {message && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
              : 'border-red-500/20 bg-red-500/10 text-red-300'
          }`}
        >
          {message.text}
        </div>
      )}

      {topRecommendation && filter === 'pending' && (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-amber-300/70">
            Highest Priority Right Now
          </p>
          <div className="mt-2 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-base font-medium text-white">
                {topRecommendation.promiseTitle || `Commitment #${topRecommendation.promiseId}`}
              </p>
              <p className="text-sm text-gray-400">
                {prettifyStatus(topRecommendation.currentStatus)}
                <ArrowRight className="mx-2 inline-block h-3.5 w-3.5 text-gray-500" />
                {prettifyStatus(topRecommendation.recommendedStatus)}
                <span className="ml-2 text-amber-300">
                  {Math.round(topRecommendation.confidence * 100)}% confidence
                </span>
              </p>
            </div>
            <p className="max-w-xl text-sm text-gray-300">
              {topRecommendation.reason}
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-7 h-7 animate-spin text-primary-400" />
        </div>
      ) : data && data.recommendations.length > 0 ? (
        <div className="space-y-3">
          {data.recommendations.map((recommendation) => (
            <div
              key={recommendation.id || `${recommendation.promiseId}-${recommendation.recommendedStatus}`}
              className="rounded-2xl border border-white/8 bg-white/[0.02] p-4"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-medium text-white">
                      {recommendation.promiseTitle || `Commitment #${recommendation.promiseId}`}
                    </p>
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-gray-400">
                      #{recommendation.promiseId}
                    </span>
                    <span className="rounded-full bg-primary-500/10 px-2 py-0.5 text-xs text-primary-300">
                      {Math.round(recommendation.confidence * 100)}% confidence
                    </span>
                  </div>
                  <p className="text-sm text-gray-300">
                    {prettifyStatus(recommendation.currentStatus)}
                    <ArrowRight className="mx-2 inline-block h-3.5 w-3.5 text-gray-500" />
                    {prettifyStatus(recommendation.recommendedStatus)}
                  </p>
                  <p className="text-sm text-gray-400">{recommendation.reason}</p>
                  <p className="text-xs text-gray-500">
                    {recommendation.signalCount} signals, {recommendation.confirmsCount} confirms,{' '}
                    {recommendation.contradictsCount} contradicts
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  {(recommendation.reviewState === 'pending' ||
                    recommendation.reviewState === undefined) && (
                    <>
                      <ActionButton
                        label="Approve"
                        icon={<CheckCircle2 className="w-4 h-4" />}
                        tone="success"
                        loading={submitting === `approve-${recommendation.id}`}
                        onClick={() =>
                          act('approve', recommendation.id, `approve-${recommendation.id}`)
                        }
                      />
                      <ActionButton
                        label="Reject"
                        icon={<XCircle className="w-4 h-4" />}
                        tone="danger"
                        loading={submitting === `reject-${recommendation.id}`}
                        onClick={() =>
                          act('reject', recommendation.id, `reject-${recommendation.id}`)
                        }
                      />
                    </>
                  )}
                  {recommendation.reviewState !== 'rejected' &&
                    recommendation.reviewState !== 'applied' && (
                      <ActionButton
                        label="Apply Now"
                        icon={<PlayCircle className="w-4 h-4" />}
                        tone="primary"
                        loading={submitting === `apply-${recommendation.id}`}
                        onClick={() =>
                          act('apply', recommendation.id, `apply-${recommendation.id}`)
                        }
                      />
                    )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-10 text-center text-sm text-gray-500">
          No status recommendations in this bucket right now.
        </div>
      )}
    </div>
  );
}

function ActionButton({
  label,
  icon,
  tone,
  loading,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  tone: 'success' | 'danger' | 'primary';
  loading?: boolean;
  onClick: () => void;
}) {
  const classes =
    tone === 'success'
      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
      : tone === 'danger'
        ? 'border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/20'
        : 'border-primary-500/20 bg-primary-500/10 text-primary-300 hover:bg-primary-500/20';

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${classes}`}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {label}
    </button>
  );
}
