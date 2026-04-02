'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  ThumbsUp,
  ThumbsDown,
  MapPin,
  MessageSquare,
  Share,
  Flag,
  Pencil,
  Loader2,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Circle,
  Send,
  User,
  ExternalLink,
  Link2,
  Banknote,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { shareIntentUrl, shareOrCopy } from '@/lib/utils/share';
import { useAuth } from '@/lib/hooks/use-auth';
import {
  useProposal,
  useProposalVote,
  useProposalComments,
  useProposalUpdates,
  type ProposalStatus,
  type ProposalComment,
} from '@/lib/hooks/use-proposals';

/* ═══════════════════════════════════════════
   STATUS CONFIG
   ═══════════════════════════════════════════ */
const statusStyles: Record<ProposalStatus, { bg: string; text: string; dot: string }> = {
  draft: { bg: 'bg-gray-500/15', text: 'text-gray-400', dot: 'bg-gray-400' },
  open: { bg: 'bg-gray-500/15', text: 'text-gray-400', dot: 'bg-gray-400' },
  trending: { bg: 'bg-blue-500/15', text: 'text-blue-400', dot: 'bg-blue-400' },
  under_review: { bg: 'bg-yellow-500/15', text: 'text-yellow-400', dot: 'bg-yellow-400' },
  accepted: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  rejected: { bg: 'bg-red-500/15', text: 'text-red-400', dot: 'bg-red-400' },
  in_progress: { bg: 'bg-blue-500/15', text: 'text-blue-400', dot: 'bg-blue-400' },
  completed: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  archived: { bg: 'bg-gray-500/15', text: 'text-gray-400', dot: 'bg-gray-400' },
};

const timelineIcons: Record<string, React.ElementType> = {
  general: Circle,
  status_change: CheckCircle2,
  official_response: AlertCircle,
  milestone: CheckCircle2,
};

/* ═══════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════ */
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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatNPR(n: number): string {
  if (n >= 10000000) return `NPR ${(n / 10000000).toFixed(1)} Cr`;
  if (n >= 100000) return `NPR ${(n / 100000).toFixed(1)} Lakh`;
  return `NPR ${n.toLocaleString()}`;
}

/* ═══════════════════════════════════════════
   COMMENT COMPONENT (supports threading)
   ═══════════════════════════════════════════ */
function CommentItem({
  comment,
  depth = 0,
}: {
  comment: ProposalComment;
  depth?: number;
}) {
  return (
    <div style={{ marginLeft: depth * 20 }}>
      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.04] transition-colors">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary-500/10 flex items-center justify-center">
              <User className="w-3 h-3 text-primary-400" />
            </div>
            <span className="text-xs font-medium text-gray-300">
              {comment.display_name ?? 'Anonymous'}
            </span>
          </div>
          <span className="text-[10px] text-gray-600">{relativeTime(comment.created_at)}</span>
        </div>
        <p className="text-sm text-gray-400 leading-relaxed">{comment.content}</p>
      </div>
      {comment.replies?.map((reply) => (
        <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════ */
export default function ProposalDetailPage() {
  const { t, locale } = useI18n();
  const { isAuthenticated, user } = useAuth();
  const params = useParams();
  const proposalId = params.id as string;
  const isNe = locale === 'ne';

  const { data: proposal, isLoading } = useProposal(proposalId);
  const { userVote, upvotes, downvotes, castVote, removeVote, isVoting } = useProposalVote(proposalId);
  const {
    comments,
    pending,
    isLoading: commentsLoading,
    submitComment,
    isSubmitting,
    submitError,
  } = useProposalComments(proposalId);
  const { data: updates } = useProposalUpdates(proposalId);

  const [newComment, setNewComment] = useState('');
  const [copied, setCopied] = useState(false);

  const handleVote = useCallback(
    (type: 'up' | 'down') => {
      if (userVote === type) {
        removeVote();
      } else {
        castVote(type);
      }
    },
    [userVote, castVote, removeVote],
  );

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    const result = await shareOrCopy({
      title: proposal?.title ?? 'Community Proposal',
      text: `${proposal?.title ?? 'Community Proposal'} — Nepal Republic`,
      url,
    });
    if (result === 'copied') {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [proposal?.title]);

  const handleWhatsApp = useCallback(() => {
    const url = window.location.href;
    const intent = shareIntentUrl('whatsapp', {
      title: proposal?.title ?? 'Community Proposal',
      text: `${proposal?.title ?? 'Community Proposal'} — Nepal Republic`,
      url,
    });
    window.open(intent, '_blank', 'noopener,noreferrer');
  }, [proposal?.title]);

  // Loading skeleton
  if (isLoading || !proposal) {
    return (
      <div className="public-page">
        <div className="relative z-10 public-section">
          <div className="public-shell">
            <div className="mx-auto max-w-3xl space-y-6">
              <div className="h-4 w-24 bg-white/5 rounded animate-pulse" />
              <div className="glass-card p-6 space-y-4 animate-pulse">
                <div className="h-6 bg-white/5 rounded w-3/4" />
                <div className="h-4 bg-white/5 rounded w-1/2" />
                <div className="h-20 bg-white/5 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const style = statusStyles[proposal.status] ?? statusStyles.open;
  const isAuthor = user?.id === proposal.author_id;

  return (
    <div className="public-page">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 h-[520px] w-[520px] rounded-full bg-primary-500/[0.045] blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[420px] w-[420px] rounded-full bg-cyan-500/[0.04] blur-[100px]" />
      </div>

      <div className="relative z-10">
        {/* Back link */}
        <div className="public-shell pt-6">
          <div className="mx-auto max-w-3xl">
            <Link
              href="/proposals"
              className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-primary-400 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('proposals.backToList')}
            </Link>
          </div>
        </div>

        {/* Main content */}
        <section className="public-section pt-6">
          <div className="public-shell">
            <div className="mx-auto max-w-3xl space-y-6">
              {/* Status + Category */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                  {t(`proposals.statuses.${proposal.status}`)}
                </span>
                <span className="text-xs text-gray-400">
                  {t(`proposals.categories.${proposal.category}`)}
                </span>
                {isAuthor && (
                  <Link
                    href={`/proposals/create?edit=${proposal.id}`}
                    className="ml-auto inline-flex items-center gap-1 text-xs text-gray-400 hover:text-primary-400 transition-colors"
                  >
                    <Pencil className="w-3 h-3" />
                    {t('proposals.edit')}
                  </Link>
                )}
              </div>

              {/* Title */}
              <div>
                <div className="flex items-start justify-between gap-3">
                  <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
                    {isNe && proposal.title_ne ? proposal.title_ne : proposal.title}
                  </h1>
                  <button
                    onClick={() => shareOrCopy({ title: proposal.title, text: `${proposal.title} — Community proposal on Nepal Republic. nepalrepublic.org`, url: `${window.location.origin}/proposals/${proposalId}` })}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-gray-300 bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1] hover:text-white transition-all shrink-0 mt-1"
                  >
                    <Share className="w-3.5 h-3.5" />
                    {isNe ? 'शेयर गर्नुहोस्' : 'Share'}
                  </button>
                </div>
                {((isNe && proposal.title) || (!isNe && proposal.title_ne)) && (
                  <p className="text-base text-gray-500 mt-1">
                    {isNe ? proposal.title : proposal.title_ne}
                  </p>
                )}
              </div>

              {/* Location */}
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <MapPin className="w-4 h-4 text-primary-400" />
                <span>
                  {proposal.province}
                  {proposal.district && ` · ${proposal.district}`}
                  {proposal.municipality && ` · ${proposal.municipality}`}
                </span>
              </div>

              {/* Vote widget */}
              <div className="glass-card p-5">
                <div className="flex items-center gap-3 mb-4">
                  <button
                    onClick={() => handleVote('up')}
                    disabled={isVoting}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                      userVote === 'up'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                        : 'text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/30'
                    }`}
                  >
                    {isVoting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
                    <span className="tabular-nums">{upvotes}</span>
                  </button>

                  <button
                    onClick={() => handleVote('down')}
                    disabled={isVoting}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                      userVote === 'down'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                        : 'text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30'
                    }`}
                  >
                    <ThumbsDown className="w-4 h-4" />
                    <span className="tabular-nums">{downvotes}</span>
                  </button>
                </div>

                {/* Sentiment bar */}
                {(upvotes + downvotes) > 0 && (
                  <>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-2">
                      <div
                        className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-emerald-500 to-emerald-400"
                        style={{ width: `${Math.round((upvotes / (upvotes + downvotes)) * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-500">
                      <span>{Math.round((upvotes / (upvotes + downvotes)) * 100)}% {t('voting.approve')}</span>
                      <span>{upvotes + downvotes} {t('voting.votes')}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Description */}
              <div className="glass-card p-6">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">
                  {t('proposals.description')}
                </h3>
                <div className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap">
                  {isNe && proposal.description_ne ? proposal.description_ne : proposal.description}
                </div>
                {((isNe && proposal.description) || (!isNe && proposal.description_ne)) && (
                  <div className="mt-4 pt-4 border-t border-white/[0.06] text-sm text-gray-500 leading-relaxed whitespace-pre-wrap">
                    {isNe ? proposal.description : proposal.description_ne}
                  </div>
                )}
              </div>

              {/* Estimated cost */}
              {proposal.estimated_cost_npr && (
                <div className="glass-card p-5 flex items-center gap-3">
                  <Banknote className="w-5 h-5 text-amber-400" />
                  <div>
                    <span className="text-xs text-gray-500">{t('proposals.estimatedCost')}</span>
                    <p className="text-sm font-semibold text-white">{formatNPR(proposal.estimated_cost_npr)}</p>
                  </div>
                </div>
              )}

              {/* Related promises */}
              {proposal.related_promise_ids && proposal.related_promise_ids.length > 0 && (
                <div className="glass-card p-5">
                  <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-primary-400" />
                    {t('proposals.relatedPromises')}
                  </h3>
                  <div className="space-y-2">
                    {proposal.related_promise_ids.map((promiseId) => (
                      <Link
                        key={promiseId}
                        href={`/explore/first-100-days/${promiseId}`}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors text-sm text-gray-300"
                      >
                        <ExternalLink className="w-3 h-3 text-primary-400" />
                        {t('proposals.promise')} #{promiseId}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Status timeline */}
              {updates && updates.length > 0 && (
                <div className="glass-card p-6">
                  <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary-400" />
                    {t('proposals.statusTimeline')}
                  </h3>
                  <div className="space-y-4">
                    {updates.map((update, idx) => {
                      const Icon = timelineIcons[update.update_type] ?? Circle;
                      const isLast = idx === updates.length - 1;
                      return (
                        <div key={update.id} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                              update.update_type === 'official_response'
                                ? 'bg-amber-500/15'
                                : update.update_type === 'status_change'
                                  ? 'bg-primary-500/15'
                                  : 'bg-white/[0.06]'
                            }`}>
                              <Icon className={`w-3.5 h-3.5 ${
                                update.update_type === 'official_response'
                                  ? 'text-amber-400'
                                  : update.update_type === 'status_change'
                                    ? 'text-primary-400'
                                    : 'text-gray-500'
                              }`} />
                            </div>
                            {!isLast && <div className="w-px flex-1 bg-white/[0.06] my-1" />}
                          </div>
                          <div className="flex-1 pb-4">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-300">{update.content}</span>
                              <span className="text-[10px] text-gray-600 whitespace-nowrap ml-2">
                                {formatDate(update.created_at)}
                              </span>
                            </div>
                            {update.update_type === 'status_change' && update.new_status && (
                              <span className="inline-flex mt-1 text-[10px] text-primary-400">
                                {update.old_status} → {update.new_status}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Comments */}
              <div className="glass-card p-6">
                <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary-400" />
                  {t('proposals.comments')}
                  {(comments.length > 0) && (
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
                        placeholder={t('proposals.commentPlaceholder')}
                        maxLength={2000}
                        rows={2}
                        className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/40 focus:ring-1 focus:ring-primary-500/20 resize-none transition-all"
                      />
                      <button
                        onClick={() => {
                          if (newComment.trim()) {
                            submitComment({ content: newComment.trim() });
                            setNewComment('');
                          }
                        }}
                        disabled={!newComment.trim() || isSubmitting}
                        className="self-end px-4 py-3 rounded-xl bg-primary-500/15 border border-primary-500/30 text-primary-300 hover:bg-primary-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                    {submitError && (
                      <p className="text-xs text-red-400 mt-2">{submitError}</p>
                    )}
                  </div>
                ) : (
                  <div className="mb-5 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
                    <p className="text-sm text-gray-400">
                      <Link href="/login" className="text-primary-400 hover:text-primary-300 transition-colors">
                        {t('proposals.signIn')}
                      </Link>{' '}
                      {t('proposals.toComment')}
                    </p>
                  </div>
                )}

                {/* Pending comments */}
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
                            <span className="text-xs font-medium text-amber-300">
                              {comment.display_name ?? 'You'}
                            </span>
                          </div>
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                            <Clock className="w-2.5 h-2.5" />
                            {t('proposals.awaitingApproval')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300">{comment.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Approved comments */}
                {commentsLoading ? (
                  <div className="text-center py-6">
                    <div className="w-5 h-5 border-2 border-primary-400/30 border-t-primary-400 rounded-full animate-spin mx-auto" />
                  </div>
                ) : comments.length > 0 ? (
                  <div className="space-y-3">
                    {comments.map((comment) => (
                      <CommentItem key={comment.id} comment={comment} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <MessageSquare className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">{t('proposals.noComments')}</p>
                  </div>
                )}
              </div>

              {/* Action bar: Share, WhatsApp, Flag */}
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-gray-400 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:text-gray-200 transition-all"
                >
                  <Share className="w-4 h-4" />
                  {copied ? t('common.copied') : t('common.share')}
                </button>

                <button
                  onClick={handleWhatsApp}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                >
                  <Share className="w-4 h-4" />
                  WhatsApp
                </button>

                <button
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-gray-500 bg-white/[0.03] border border-white/[0.06] hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all ml-auto"
                >
                  <Flag className="w-4 h-4" />
                  {t('proposals.flag')}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Footer accent */}
        <div className="h-px bg-gradient-to-r from-transparent via-primary-500/30 to-transparent" />
      </div>
    </div>
  );
}
