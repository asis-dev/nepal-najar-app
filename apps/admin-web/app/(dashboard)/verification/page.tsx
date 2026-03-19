'use client';

import { useState } from 'react';
import {
  Shield, CheckCircle2, AlertTriangle, ExternalLink,
  Loader2, Newspaper, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useAllPromises } from '@/lib/hooks/use-promises';

const STATUS_OPTIONS = ['not_started', 'in_progress', 'delivered', 'stalled'] as const;
const STATUS_LABELS: Record<string, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  delivered: 'Delivered',
  stalled: 'Stalled',
};

const STATUS_COLORS: Record<string, string> = {
  not_started: 'text-gray-400',
  in_progress: 'text-emerald-400',
  delivered: 'text-blue-400',
  stalled: 'text-red-400',
};

const TRUST_BADGES: Record<string, { color: string; label: string }> = {
  verified: { color: 'badge-green', label: 'Verified' },
  unverified: { color: 'badge-yellow', label: 'Unverified' },
  disputed: { color: 'badge-red', label: 'Disputed' },
};

export default function VerificationPage() {
  const { data: promises, isLoading, refetch } = useAllPromises();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unverified' | 'verified'>('all');
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state per promise
  const [formState, setFormState] = useState<Record<string, {
    status: string;
    progress: string;
    source_url: string;
    reason: string;
  }>>({});

  const getForm = (id: string) =>
    formState[id] || { status: '', progress: '', source_url: '', reason: '' };

  const setForm = (id: string, updates: Partial<typeof formState[string]>) => {
    setFormState((prev) => ({
      ...prev,
      [id]: { ...getForm(id), ...updates },
    }));
  };

  const filtered = (promises ?? []).filter((p) => {
    if (filter === 'unverified') return p.trustLevel !== 'verified';
    if (filter === 'verified') return p.trustLevel === 'verified';
    return true;
  });

  const handleVerify = async (promiseId: string) => {
    const form = getForm(promiseId);
    if (!form.source_url || !form.reason) {
      setMessage({ type: 'error', text: 'Source URL and reason are required.' });
      return;
    }

    setSubmitting(promiseId);
    setMessage(null);

    try {
      const body: Record<string, unknown> = {
        source_url: form.source_url,
        reason: form.reason,
      };
      if (form.status) body.status = form.status;
      if (form.progress) body.progress = parseInt(form.progress, 10);

      const res = await fetch(`/api/admin/promises/${promiseId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to verify');
      }

      setMessage({ type: 'success', text: 'Promise verified successfully.' });
      setExpandedId(null);
      setFormState((prev) => {
        const next = { ...prev };
        delete next[promiseId];
        return next;
      });
      refetch();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Verification failed',
      });
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary-400" />
            Promise Verification
          </h1>
          <p className="section-subtitle">
            Verify promise status with source URLs — all changes are audited
          </p>
        </div>
        <div className="text-sm text-gray-400">
          {promises?.length ?? 0} promises total
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 rounded-lg p-1 w-fit border border-white/10 bg-white/5">
        {(['all', 'unverified', 'verified'] as const).map((t) => (
          <button
            key={t}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
              filter === t
                ? 'bg-primary-500/20 text-primary-300'
                : 'text-gray-500 hover:text-gray-300'
            }`}
            onClick={() => setFilter(t)}
          >
            {t}
            <span className="ml-1.5 text-xs opacity-60">
              ({(promises ?? []).filter((p) =>
                t === 'all' ? true :
                t === 'unverified' ? p.trustLevel !== 'verified' :
                p.trustLevel === 'verified'
              ).length})
            </span>
          </button>
        ))}
      </div>

      {/* Status message */}
      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Promise list */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((promise) => {
            const isExpanded = expandedId === promise.id;
            const trustBadge = TRUST_BADGES[promise.trustLevel] ?? TRUST_BADGES.unverified;
            const form = getForm(promise.id);

            return (
              <div key={promise.id} className="glass-card overflow-hidden">
                {/* Header row */}
                <button
                  className="w-full text-left p-4 hover:bg-white/[0.02] transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : promise.id)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-200 line-clamp-1">
                        {promise.title}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs">
                        <span className={STATUS_COLORS[promise.status] ?? 'text-gray-400'}>
                          {STATUS_LABELS[promise.status] ?? promise.status}
                        </span>
                        <span className="text-gray-600 capitalize">
                          {promise.category.replace(/_/g, ' ')}
                        </span>
                        {promise.evidenceCount > 0 && (
                          <span className="flex items-center gap-1 text-cyan-500/70">
                            <Newspaper className="w-3 h-3" />
                            {promise.evidenceCount} articles
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={trustBadge.color}>{trustBadge.label}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded verification form */}
                {isExpanded && (
                  <div className="border-t border-white/[0.06] p-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Status select */}
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">
                          New Status (optional)
                        </label>
                        <select
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200"
                          value={form.status}
                          onChange={(e) => setForm(promise.id, { status: e.target.value })}
                        >
                          <option value="">Keep current ({STATUS_LABELS[promise.status]})</option>
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                          ))}
                        </select>
                      </div>

                      {/* Progress */}
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">
                          Progress % (optional)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200"
                          placeholder={`Current: ${promise.progress}%`}
                          value={form.progress}
                          onChange={(e) => setForm(promise.id, { progress: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Source URL — required */}
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">
                        Source URL <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="url"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200"
                        placeholder="https://... (official gazette, news article, government report)"
                        value={form.source_url}
                        onChange={(e) => setForm(promise.id, { source_url: e.target.value })}
                      />
                    </div>

                    {/* Reason — required */}
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">
                        Reason / Notes <span className="text-red-400">*</span>
                      </label>
                      <textarea
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 min-h-[80px]"
                        placeholder="Why is this status change being made? What evidence supports it?"
                        value={form.reason}
                        onChange={(e) => setForm(promise.id, { reason: e.target.value })}
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        className="flex items-center gap-2 px-4 py-2 bg-primary-500/20 text-primary-300 rounded-lg text-sm font-medium hover:bg-primary-500/30 transition-colors disabled:opacity-50"
                        disabled={submitting === promise.id}
                        onClick={() => handleVerify(promise.id)}
                      >
                        {submitting === promise.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                        Verify & Update
                      </button>
                      <button
                        className="px-4 py-2 text-gray-500 text-sm hover:text-gray-300 transition-colors"
                        onClick={() => setExpandedId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="glass-card p-12 text-center text-gray-500">
              No promises match this filter.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
