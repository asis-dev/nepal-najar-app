'use client';

import Link from 'next/link';
import { ChevronUp, MessageSquare, MapPin, TrendingUp } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { CardActions } from '@/components/public/card-actions';
import type { Proposal, ProposalStatus, ProposalCategory } from '@/lib/hooks/use-proposals';

/* ═══════════════════════════════════════════
   STATUS / CATEGORY CONFIG
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

const categoryColors: Record<ProposalCategory, string> = {
  infrastructure: 'text-blue-400',
  health: 'text-rose-400',
  education: 'text-purple-400',
  environment: 'text-emerald-400',
  transport: 'text-amber-400',
  technology: 'text-cyan-400',
  water_sanitation: 'text-sky-400',
  agriculture: 'text-lime-400',
  tourism: 'text-orange-400',
  governance: 'text-indigo-400',
  social: 'text-pink-400',
  energy: 'text-yellow-400',
  other: 'text-gray-400',
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
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  return `${months}mo`;
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

/* ═══════════════════════════════════════════
   PROPOSAL CARD COMPONENT
   ═══════════════════════════════════════════ */
interface ProposalCardProps {
  proposal: Proposal;
}

export function ProposalCard({ proposal }: ProposalCardProps) {
  const { locale, t } = useI18n();
  const isNe = locale === 'ne';

  const netVotes = proposal.upvote_count - proposal.downvote_count;
  const style = statusStyles[proposal.status] ?? statusStyles.open;
  const catColor = categoryColors[proposal.category] ?? 'text-gray-400';

  return (
    <Link href={`/proposals/${proposal.id}`} className="block group">
      <div className="glass-card p-4 sm:p-5 transition-all duration-200 hover:bg-white/[0.04] hover:border-white/[0.14]">
        <div className="flex gap-3 sm:gap-4">
          {/* Vote column */}
          <div className="flex flex-col items-center gap-1 pt-0.5 flex-shrink-0">
            <ChevronUp className="w-5 h-5 text-gray-500 group-hover:text-primary-400 transition-colors" />
            <span className={`text-sm font-bold tabular-nums ${netVotes > 0 ? 'text-emerald-400' : netVotes < 0 ? 'text-red-400' : 'text-gray-400'}`}>
              {formatCount(netVotes)}
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Title */}
            <h3 className="text-sm sm:text-base font-semibold text-white group-hover:text-primary-300 transition-colors line-clamp-2">
              {isNe && proposal.title_ne ? proposal.title_ne : proposal.title}
            </h3>
            {((isNe && proposal.title) || (!isNe && proposal.title_ne)) && (
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                {isNe ? proposal.title : proposal.title_ne}
              </p>
            )}

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {/* Location */}
              <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                <MapPin className="w-3 h-3" />
                {proposal.province}
                {proposal.district && ` · ${proposal.district}`}
              </span>

              {/* Category */}
              <span className={`text-xs ${catColor}`}>
                {t(`proposals.categories.${proposal.category}`)}
              </span>

              {/* Status badge */}
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${style.bg} ${style.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                {t(`proposals.statuses.${proposal.status}`)}
              </span>

              {/* Trending indicator */}
              {proposal.status === 'trending' && (
                <TrendingUp className="w-3 h-3 text-blue-400" />
              )}
            </div>

            {/* Bottom row */}
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="inline-flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {proposal.comment_count}
                </span>
                <span>{relativeTime(proposal.created_at)}</span>
              </div>
              <CardActions
                shareTitle={isNe && proposal.title_ne ? proposal.title_ne : proposal.title}
                shareUrl={`/proposals/${proposal.id}`}
                size="sm"
              />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
