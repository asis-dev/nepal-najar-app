'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileUp, Check, X, Clock, User, AlertCircle,
  ExternalLink, MessageSquare,
} from 'lucide-react';

interface Submission {
  id: string;
  promise_id: string;
  user_id: string;
  url: string | null;
  description: string;
  type: 'evidence' | 'tip';
  status: 'pending' | 'approved' | 'rejected';
  reviewer_notes: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  display_name: string;
}

export default function SubmissionsPage() {
  const queryClient = useQueryClient();
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewerNotes, setReviewerNotes] = useState('');

  const { data, isLoading, error } = useQuery<{ submissions: Submission[] }>({
    queryKey: ['admin-submissions'],
    queryFn: async () => {
      const res = await fetch('/api/submissions');
      if (!res.ok) throw new Error('Failed to load submissions');
      return res.json();
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      const res = await fetch(`/api/submissions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reviewer_notes: reviewerNotes.trim() || undefined }),
      });
      if (!res.ok) throw new Error('Failed to update submission');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-submissions'] });
      setReviewingId(null);
      setReviewerNotes('');
    },
  });

  const submissions = data?.submissions ?? [];

  const typeConfig = {
    evidence: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20', label: 'Evidence' },
    tip: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', label: 'Tip' },
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
              <FileUp className="w-5 h-5 text-cyan-400" />
            </div>
            Evidence Submissions
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Review citizen-submitted evidence and tips
          </p>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="glass-card p-12 text-center">
          <div className="w-6 h-6 border-2 border-primary-400/30 border-t-primary-400 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500 mt-3">Loading submissions...</p>
        </div>
      ) : error ? (
        <div className="glass-card p-8 text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <p className="text-sm text-red-400">Failed to load submissions</p>
        </div>
      ) : submissions.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Check className="w-12 h-12 text-emerald-400/40 mx-auto mb-3" />
          <p className="text-base font-medium text-white mb-1">No pending submissions</p>
          <p className="text-sm text-gray-500">All evidence has been reviewed</p>
        </div>
      ) : (
        <div className="space-y-3">
          {submissions.map((sub) => {
            const tc = typeConfig[sub.type] ?? typeConfig.evidence;
            const isReviewing = reviewingId === sub.id;

            return (
              <div key={sub.id} className="glass-card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Type badge + author */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${tc.bg} ${tc.text} ${tc.border}`}>
                        {tc.label}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3 text-gray-500" />
                        <span className="text-xs text-gray-400">{sub.display_name}</span>
                      </div>
                      <span className="text-[10px] text-gray-600 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(sub.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-300 leading-relaxed mb-2">{sub.description}</p>

                    {/* URL */}
                    {sub.url && (
                      <a
                        href={sub.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-primary-400 hover:text-primary-300 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {sub.url.length > 60 ? sub.url.slice(0, 60) + '...' : sub.url}
                      </a>
                    )}

                    {/* Reviewer notes input */}
                    {isReviewing && (
                      <div className="mt-3">
                        <textarea
                          value={reviewerNotes}
                          onChange={(e) => setReviewerNotes(e.target.value)}
                          placeholder="Reviewer notes (optional)..."
                          rows={2}
                          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-primary-500/40 resize-none transition-all"
                        />
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isReviewing ? (
                      <>
                        <button
                          onClick={() => reviewMutation.mutate({ id: sub.id, status: 'approved' })}
                          disabled={reviewMutation.isPending}
                          className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs hover:bg-emerald-500/20 disabled:opacity-40 transition-all"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => reviewMutation.mutate({ id: sub.id, status: 'rejected' })}
                          disabled={reviewMutation.isPending}
                          className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs hover:bg-red-500/20 disabled:opacity-40 transition-all"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => { setReviewingId(null); setReviewerNotes(''); }}
                          className="p-2 rounded-xl text-gray-500 hover:text-gray-300 transition-all"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setReviewingId(sub.id)}
                        className="px-3 py-2 rounded-xl bg-primary-500/10 border border-primary-500/20 text-primary-400 text-xs hover:bg-primary-500/20 transition-all flex items-center gap-1.5"
                      >
                        <MessageSquare className="w-3 h-3" />
                        Review
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
