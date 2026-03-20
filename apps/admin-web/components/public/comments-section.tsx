'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Send, Clock, User } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/use-auth';

interface Comment {
  id: string;
  promise_id: string;
  user_id: string;
  content: string;
  is_approved: boolean;
  created_at: string;
  display_name: string;
}

interface CommentsResponse {
  comments: Comment[];
  pending: Comment[];
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function CommentsSection({ promiseId }: { promiseId: string }) {
  const { isAuthenticated } = useAuth();
  const [newComment, setNewComment] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<CommentsResponse>({
    queryKey: ['comments', promiseId],
    queryFn: async () => {
      const res = await fetch(`/api/comments?promise_id=${promiseId}`);
      if (!res.ok) throw new Error('Failed to load comments');
      return res.json();
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promise_id: promiseId, content }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit comment');
      }
      return res.json();
    },
    onSuccess: () => {
      setNewComment('');
      queryClient.invalidateQueries({ queryKey: ['comments', promiseId] });
    },
  });

  const comments = data?.comments ?? [];
  const pending = data?.pending ?? [];

  return (
    <div className="glass-card p-6">
      <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-primary-400" />
        Comments
        {comments.length > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 font-medium">
            {comments.length}
          </span>
        )}
      </h3>

      {/* Comment input */}
      {isAuthenticated ? (
        <div className="mb-5">
          <div className="flex gap-3">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Share your thoughts..."
              maxLength={2000}
              rows={2}
              className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/40 focus:ring-1 focus:ring-primary-500/20 resize-none transition-all"
            />
            <button
              onClick={() => {
                if (newComment.trim()) submitMutation.mutate(newComment.trim());
              }}
              disabled={!newComment.trim() || submitMutation.isPending}
              className="self-end px-4 py-3 rounded-xl bg-primary-500/15 border border-primary-500/30 text-primary-300 hover:bg-primary-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          {submitMutation.isError && (
            <p className="text-xs text-red-400 mt-2">
              {submitMutation.error?.message || 'Failed to submit'}
            </p>
          )}
        </div>
      ) : (
        <div className="mb-5 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
          <p className="text-sm text-gray-400">
            <Link href="/login" className="text-primary-400 hover:text-primary-300 transition-colors">
              Sign in
            </Link>{' '}
            to leave a comment
          </p>
        </div>
      )}

      {/* User's pending comments */}
      {pending.length > 0 && (
        <div className="mb-4 space-y-3">
          {pending.map((comment) => (
            <div
              key={comment.id}
              className="p-4 rounded-xl bg-amber-500/[0.04] border border-amber-500/[0.12]"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-amber-500/15 flex items-center justify-center">
                    <User className="w-3 h-3 text-amber-400" />
                  </div>
                  <span className="text-xs font-medium text-amber-300">{comment.display_name}</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  <Clock className="w-2.5 h-2.5" />
                  Awaiting approval
                </span>
              </div>
              <p className="text-sm text-gray-300">{comment.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* Approved comments */}
      {isLoading ? (
        <div className="text-center py-6">
          <div className="w-5 h-5 border-2 border-primary-400/30 border-t-primary-400 rounded-full animate-spin mx-auto" />
        </div>
      ) : comments.length > 0 ? (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.04] transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary-500/10 flex items-center justify-center">
                    <User className="w-3 h-3 text-primary-400" />
                  </div>
                  <span className="text-xs font-medium text-gray-300">{comment.display_name}</span>
                </div>
                <span className="text-[10px] text-gray-600">{relativeTime(comment.created_at)}</span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">{comment.content}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6">
          <MessageSquare className="w-8 h-8 text-gray-700 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No comments yet</p>
          <p className="text-xs text-gray-600 mt-1">Be the first to share your thoughts</p>
        </div>
      )}
    </div>
  );
}
