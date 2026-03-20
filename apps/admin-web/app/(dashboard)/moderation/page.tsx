'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Check, X, Clock, User, AlertCircle } from 'lucide-react';

interface PendingComment {
  id: string;
  promise_id: string;
  user_id: string;
  content: string;
  is_approved: boolean;
  created_at: string;
  display_name: string;
  promise_title?: string;
}

export default function ModerationPage() {
  const queryClient = useQueryClient();
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Fetch all pending comments (admin endpoint returns all unapproved)
  const { data: comments, isLoading, error } = useQuery<PendingComment[]>({
    queryKey: ['moderation-comments'],
    queryFn: async () => {
      // We fetch comments without a promise_id filter to get all pending
      // The API returns pending comments for the logged-in user, but admin sees all via service role
      const res = await fetch('/api/comments?promise_id=_all_pending');
      if (!res.ok) throw new Error('Failed to load comments');
      const data = await res.json();
      return [...(data.pending ?? []), ...(data.comments ?? [])].filter(
        (c: PendingComment) => !c.is_approved,
      );
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (commentId: string) => {
      setActionInProgress(commentId);
      const res = await fetch(`/api/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_approved: true }),
      });
      if (!res.ok) throw new Error('Failed to approve');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderation-comments'] });
      setActionInProgress(null);
    },
    onError: () => setActionInProgress(null),
  });

  const rejectMutation = useMutation({
    mutationFn: async (commentId: string) => {
      setActionInProgress(commentId);
      const res = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderation-comments'] });
      setActionInProgress(null);
    },
    onError: () => setActionInProgress(null),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary-400" />
            </div>
            Comment Moderation
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Review and approve citizen comments before they appear publicly
          </p>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="glass-card p-12 text-center">
          <div className="w-6 h-6 border-2 border-primary-400/30 border-t-primary-400 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500 mt-3">Loading pending comments...</p>
        </div>
      ) : error ? (
        <div className="glass-card p-8 text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <p className="text-sm text-red-400">Failed to load comments</p>
        </div>
      ) : !comments || comments.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Check className="w-12 h-12 text-emerald-400/40 mx-auto mb-3" />
          <p className="text-base font-medium text-white mb-1">All clear</p>
          <p className="text-sm text-gray-500">No comments awaiting moderation</p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="glass-card p-5 hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Author + time */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-primary-500/10 flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-primary-400" />
                    </div>
                    <span className="text-sm font-medium text-gray-300">
                      {comment.display_name}
                    </span>
                    <span className="text-[10px] text-gray-600 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(comment.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Promise reference */}
                  {comment.promise_title && (
                    <p className="text-[10px] text-gray-600 mb-1.5 uppercase tracking-wider">
                      Re: {comment.promise_title}
                    </p>
                  )}

                  {/* Comment content */}
                  <p className="text-sm text-gray-400 leading-relaxed">{comment.content}</p>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => approveMutation.mutate(comment.id)}
                    disabled={actionInProgress === comment.id}
                    className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-40 transition-all"
                    title="Approve"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => rejectMutation.mutate(comment.id)}
                    disabled={actionInProgress === comment.id}
                    className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 disabled:opacity-40 transition-all"
                    title="Reject"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
