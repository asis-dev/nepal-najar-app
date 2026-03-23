'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Bot,
  Check,
  Clock3,
  Loader2,
  MessageSquarePlus,
  Play,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';

type FeedbackStatus = 'new' | 'reviewed' | 'resolved' | 'archived';
type FeedbackReviewStatus =
  | 'pending'
  | 'reviewed'
  | 'approved'
  | 'rejected'
  | 'applied';

interface FeedbackAction {
  type: string;
  target: string;
  summary: string;
  requiresApproval: boolean;
  confidence: number;
}

interface FeedbackItem {
  id: string;
  feedback_type: 'bug' | 'feature' | 'content' | 'general';
  message: string;
  rating: number | null;
  page_context: string | null;
  status: FeedbackStatus;
  admin_notes: string | null;
  created_at: string;
  ai_summary: string | null;
  ai_confidence: number | null;
  ai_usefulness_score: number | null;
  ai_validity_score: number | null;
  ai_actionability_score: number | null;
  ai_priority: 'low' | 'medium' | 'high' | null;
  ai_recommendation: string | null;
  ai_review_status: FeedbackReviewStatus;
  ai_proposed_actions: FeedbackAction[] | null;
  ai_handoff_prompt: string | null;
  ai_review_provider: string | null;
  ai_review_model: string | null;
  ai_reviewed_at: string | null;
  ai_approved_at: string | null;
  ai_applied_at: string | null;
}

interface FeedbackResponse {
  feedback: FeedbackItem[];
  counts: {
    total: number;
    new: number;
    reviewed: number;
    resolved: number;
    archived: number;
    aiPending: number;
    aiReviewed: number;
    aiApproved: number;
    aiRejected: number;
    aiApplied: number;
  };
  total: number;
}

const TYPE_STYLES: Record<string, string> = {
  bug: 'bg-red-500/10 text-red-300 border-red-500/20',
  feature: 'bg-primary-500/10 text-primary-300 border-primary-500/20',
  content: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  general: 'bg-white/5 text-gray-300 border-white/10',
};

const PRIORITY_STYLES: Record<string, string> = {
  low: 'text-gray-400',
  medium: 'text-amber-300',
  high: 'text-red-300',
};

const REVIEW_STYLES: Record<FeedbackReviewStatus, string> = {
  pending: 'bg-white/5 text-gray-300 border-white/10',
  reviewed: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
  approved: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-300 border-red-500/20',
  applied: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
};

async function jsonOrThrow(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export default function FeedbackReviewPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | FeedbackReviewStatus>('all');
  const [notes, setNotes] = useState<Record<string, string>>({});

  const query = useQuery<FeedbackResponse>({
    queryKey: ['admin-feedback-review', filter],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '60' });
      if (filter !== 'all') params.set('ai_review_status', filter);
      const res = await fetch(`/api/admin/feedback?${params.toString()}`);
      return jsonOrThrow(res);
    },
  });

  const batchMutation = useMutation({
    mutationFn: async (action: 'run' | 'queue') => {
      const res = await fetch('/api/admin/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, limit: 10 }),
      });
      return jsonOrThrow(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-feedback-review'] });
    },
  });

  const itemMutation = useMutation({
    mutationFn: async ({
      id,
      action,
    }: {
      id: string;
      action: 'review' | 'approve' | 'reject' | 'apply';
    }) => {
      const res = await fetch(`/api/admin/feedback/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes: notes[id]?.trim() || undefined }),
      });
      return jsonOrThrow(res);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-feedback-review'] });
      if (variables.action !== 'review') {
        setNotes((prev) => ({ ...prev, [variables.id]: '' }));
      }
    },
  });

  const feedback = query.data?.feedback ?? [];
  const counts = query.data?.counts;
  const activeCount = useMemo(
    () => (filter === 'all' ? feedback.length : feedback.filter((item) => item.ai_review_status === filter).length),
    [feedback, filter],
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="section-title flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
              <MessageSquarePlus className="w-5 h-5 text-primary-300" />
            </div>
            Feedback Autopilot
          </h1>
          <p className="section-subtitle">
            OpenClaw reviews citizen feedback, drafts next actions, and waits for your approval.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => batchMutation.mutate('queue')}
            disabled={batchMutation.isPending}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            Queue Reviews
          </button>
          <button
            onClick={() => batchMutation.mutate('run')}
            disabled={batchMutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-500 disabled:opacity-50"
          >
            {batchMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Run OpenClaw Review
          </button>
        </div>
      </div>

      {counts && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            { label: 'AI Pending', value: counts.aiPending },
            { label: 'AI Reviewed', value: counts.aiReviewed },
            { label: 'Approved', value: counts.aiApproved },
            { label: 'Applied', value: counts.aiApplied },
            { label: 'New Feedback', value: counts.new },
          ].map((item) => (
            <div key={item.label} className="glass-card p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{item.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-1 w-fit">
        {(['all', 'pending', 'reviewed', 'approved', 'rejected', 'applied'] as const).map((value) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`rounded-lg px-3 py-2 text-sm transition-colors ${
              filter === value
                ? 'bg-primary-500/15 text-primary-300'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {value === 'all' ? 'All' : value}
          </button>
        ))}
        <span className="px-2 text-xs text-gray-500">{activeCount} shown</span>
      </div>

      {query.isLoading ? (
        <div className="glass-card p-12 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary-300" />
          <p className="mt-3 text-sm text-gray-500">Loading feedback autopilot queue...</p>
        </div>
      ) : query.error ? (
        <div className="glass-card p-8 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-red-400" />
          <p className="mt-3 text-sm text-red-300">
            {query.error instanceof Error ? query.error.message : 'Failed to load feedback'}
          </p>
        </div>
      ) : feedback.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-emerald-400/60" />
          <p className="mt-3 text-base font-medium text-white">No feedback waiting here</p>
          <p className="mt-1 text-sm text-gray-500">Run the autopilot when new citizen feedback arrives.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {feedback.map((item) => {
            const busy = itemMutation.isPending && itemMutation.variables?.id === item.id;
            const reviewStyle = REVIEW_STYLES[item.ai_review_status];
            const typeStyle = TYPE_STYLES[item.feedback_type] || TYPE_STYLES.general;
            const priorityStyle =
              item.ai_priority ? PRIORITY_STYLES[item.ai_priority] : 'text-gray-500';

            return (
              <div key={item.id} className="glass-card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${typeStyle}`}>
                        {item.feedback_type}
                      </span>
                      <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${reviewStyle}`}>
                        {item.ai_review_status}
                      </span>
                      {item.ai_priority && (
                        <span className={`text-xs font-medium capitalize ${priorityStyle}`}>
                          {item.ai_priority} priority
                        </span>
                      )}
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock3 className="h-3 w-3" />
                        {new Date(item.created_at).toLocaleString()}
                      </span>
                    </div>

                    <p className="mt-3 text-sm leading-relaxed text-gray-200">{item.message}</p>

                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
                      {item.page_context && <span>Page: {item.page_context}</span>}
                      {item.rating && <span>Rating: {item.rating}/5</span>}
                      {item.ai_recommendation && <span>Recommendation: {item.ai_recommendation}</span>}
                      {item.ai_review_provider && item.ai_review_model && (
                        <span>Model: {item.ai_review_provider}/{item.ai_review_model}</span>
                      )}
                    </div>

                    {item.ai_summary && (
                      <div className="mt-4 rounded-2xl border border-primary-500/15 bg-primary-500/5 p-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-primary-200">
                          <Bot className="h-4 w-4" />
                          OpenClaw review
                        </div>
                        <p className="mt-2 text-sm text-gray-200">{item.ai_summary}</p>
                        <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-400">
                          <span>Useful: {Math.round((item.ai_usefulness_score ?? 0) * 100)}%</span>
                          <span>Valid: {Math.round((item.ai_validity_score ?? 0) * 100)}%</span>
                          <span>Actionable: {Math.round((item.ai_actionability_score ?? 0) * 100)}%</span>
                          <span>Confidence: {Math.round((item.ai_confidence ?? 0) * 100)}%</span>
                        </div>
                      </div>
                    )}

                    {item.ai_proposed_actions && item.ai_proposed_actions.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">
                          Proposed actions
                        </p>
                        {item.ai_proposed_actions.map((action, index) => (
                          <div key={`${item.id}-${index}`} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                            <p className="text-sm text-gray-200">{action.summary}</p>
                            <p className="mt-1 text-xs text-gray-500">
                              {action.type} · {action.target} · {Math.round(action.confidence * 100)}%
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {item.ai_handoff_prompt && (
                      <div className="mt-4 rounded-xl border border-white/10 bg-black/10 p-3">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">
                          Handoff prompt
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-gray-300">
                          {item.ai_handoff_prompt}
                        </p>
                      </div>
                    )}

                    <textarea
                      value={notes[item.id] ?? ''}
                      onChange={(event) =>
                        setNotes((prev) => ({ ...prev, [item.id]: event.target.value }))
                      }
                      placeholder="Optional operator note..."
                      rows={2}
                      className="mt-4 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-gray-600 outline-none transition-colors focus:border-primary-500/40"
                    />

                    {item.admin_notes && (
                      <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-gray-400">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Admin notes</p>
                        <p className="mt-2 whitespace-pre-wrap">{item.admin_notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    {item.ai_review_status === 'pending' && (
                      <button
                        onClick={() => itemMutation.mutate({ id: item.id, action: 'review' })}
                        disabled={busy}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-500 disabled:opacity-50"
                      >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        Review
                      </button>
                    )}

                    {item.ai_review_status === 'reviewed' && (
                      <>
                        <button
                          onClick={() => itemMutation.mutate({ id: item.id, action: 'approve' })}
                          disabled={busy}
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/15 px-3 py-2 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-500/25 disabled:opacity-50"
                        >
                          <Check className="h-4 w-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => itemMutation.mutate({ id: item.id, action: 'reject' })}
                          disabled={busy}
                          className="inline-flex items-center gap-2 rounded-xl bg-red-500/15 px-3 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/25 disabled:opacity-50"
                        >
                          <X className="h-4 w-4" />
                          Reject
                        </button>
                      </>
                    )}

                    {item.ai_review_status === 'approved' && (
                      <button
                        onClick={() => itemMutation.mutate({ id: item.id, action: 'apply' })}
                        disabled={busy}
                        className="inline-flex items-center gap-2 rounded-xl bg-cyan-500/15 px-3 py-2 text-sm font-medium text-cyan-300 transition-colors hover:bg-cyan-500/25 disabled:opacity-50"
                      >
                        <Play className="h-4 w-4" />
                        Apply Triage
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
