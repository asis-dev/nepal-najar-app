'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  LogIn,
  Loader2,
  FileText,
  ChevronUp,
  MessageSquare,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/hooks/use-auth';
import { useMyProposals, useDeleteProposal, type Proposal, type ProposalStatus } from '@/lib/hooks/use-proposals';

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

export default function MyProposalsPage() {
  const { t, locale } = useI18n();
  const { isAuthenticated } = useAuth();
  const isNe = locale === 'ne';

  const { data: proposals, isLoading } = useMyProposals();
  const deleteMutation = useDeleteProposal();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm(t('proposals.confirmDelete'))) return;
    setDeletingId(id);
    try {
      await deleteMutation.mutateAsync(id);
    } finally {
      setDeletingId(null);
    }
  };

  // Auth gate
  if (!isAuthenticated) {
    return (
      <div className="public-page">
        <div className="relative z-10 public-section">
          <div className="public-shell">
            <div className="mx-auto max-w-lg">
              <div className="glass-card p-12 text-center">
                <LogIn className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-300 mb-2">
                  {t('proposals.signInRequired')}
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                  {t('proposals.signInToViewMy')}
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-primary-500/20 border border-primary-500/40 hover:bg-primary-500/30 transition-all"
                >
                  <LogIn className="w-4 h-4" />
                  {t('proposals.signIn')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="public-page">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 h-[520px] w-[520px] rounded-full bg-primary-500/[0.045] blur-[120px]" />
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

        {/* Header */}
        <section className="public-section pb-0 pt-6">
          <div className="public-shell">
            <div className="mx-auto max-w-3xl flex items-center justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">
                  {t('proposals.myProposals')}
                </h1>
                <p className="text-gray-400 text-sm mt-1">
                  {proposals?.length ?? 0} {t('proposals.proposalsCount')}
                </p>
              </div>
              <Link
                href="/proposals/create"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-primary-300 bg-primary-500/10 border border-primary-500/20 hover:bg-primary-500/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                {t('proposals.newProposal')}
              </Link>
            </div>
          </div>
        </section>

        {/* Proposals list */}
        <section className="public-section pt-6">
          <div className="public-shell">
            <div className="mx-auto max-w-3xl">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="glass-card p-5 animate-pulse">
                      <div className="h-4 bg-white/5 rounded w-3/4 mb-3" />
                      <div className="h-3 bg-white/5 rounded w-1/2 mb-3" />
                      <div className="h-3 bg-white/5 rounded w-1/3" />
                    </div>
                  ))}
                </div>
              ) : proposals && proposals.length > 0 ? (
                <div className="space-y-3">
                  {proposals.map((proposal) => {
                    const style = statusStyles[proposal.status] ?? statusStyles.open;
                    const netVotes = proposal.upvote_count - proposal.downvote_count;

                    return (
                      <div
                        key={proposal.id}
                        className="glass-card p-5 group"
                      >
                        <div className="flex items-start gap-4">
                          {/* Main content */}
                          <Link
                            href={`/proposals/${proposal.id}`}
                            className="flex-1 min-w-0"
                          >
                            {/* Status */}
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                                {t(`proposals.statuses.${proposal.status}`)}
                              </span>
                              <span className="text-xs text-gray-500">
                                {relativeTime(proposal.created_at)}
                              </span>
                            </div>

                            {/* Title */}
                            <h3 className="text-sm sm:text-base font-semibold text-white group-hover:text-primary-300 transition-colors">
                              {isNe && proposal.title_ne ? proposal.title_ne : proposal.title}
                            </h3>

                            {/* Meta */}
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <span className="inline-flex items-center gap-1">
                                <ChevronUp className="w-3 h-3" />
                                {netVotes} {t('proposals.votes')}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" />
                                {proposal.comment_count} {t('proposals.comments')}
                              </span>
                            </div>
                          </Link>

                          {/* Actions */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Link
                              href={`/proposals/create?edit=${proposal.id}`}
                              className="p-2 rounded-lg text-gray-500 hover:text-primary-400 hover:bg-primary-500/10 transition-all"
                              title={t('proposals.edit')}
                            >
                              <Pencil className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => handleDelete(proposal.id)}
                              disabled={deletingId === proposal.id}
                              className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40"
                              title={t('proposals.delete')}
                            >
                              {deletingId === proposal.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="glass-card p-12 text-center">
                  <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-gray-300 mb-2">
                    {t('proposals.noProposals')}
                  </h2>
                  <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">
                    {t('proposals.noProposalsDesc')}
                  </p>
                  <Link
                    href="/proposals/create"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-primary-500/20 border border-primary-500/40 hover:bg-primary-500/30 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    {t('proposals.createProposal')}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="h-px bg-gradient-to-r from-transparent via-primary-500/30 to-transparent" />
      </div>
    </div>
  );
}
