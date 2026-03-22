'use client';

import Link from 'next/link';
import { Trophy, ArrowRight, MapPin, Users, Loader2 } from 'lucide-react';
import { useLeaderboard, type AreaLeaderboardEntry, type CitizenLeaderboardEntry } from '@/lib/hooks/use-leaderboard';
import { useI18n } from '@/lib/i18n';

/* ═══════════════════════════════════════════
   RANK BADGE
   ═══════════════════════════════════════════ */
function RankBadge({ rank }: { rank: number }) {
  const styles =
    rank === 1
      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
      : rank === 2
        ? 'bg-gray-400/20 text-gray-300 border-gray-400/30'
        : rank === 3
          ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
          : 'bg-white/[0.04] text-gray-500 border-white/[0.06]';

  return (
    <span
      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold border ${styles}`}
    >
      {rank}
    </span>
  );
}

/* ═══════════════════════════════════════════
   AREAS WIDGET
   ═══════════════════════════════════════════ */
interface LeaderboardWidgetProps {
  type?: 'areas' | 'citizens';
  title?: string;
  limit?: number;
  showLink?: boolean;
}

export function LeaderboardWidget({
  type = 'areas',
  title,
  limit = 5,
  showLink = true,
}: LeaderboardWidgetProps) {
  const { locale } = useI18n();
  const isNe = locale === 'ne';
  const { data: leaderboard, isLoading } = useLeaderboard(type, limit);

  const defaultTitle = type === 'areas'
    ? (isNe ? '\u0938\u092C\u0948\u092D\u0928\u094D\u0926\u093E \u0938\u0915\u094D\u0930\u093F\u092F \u0915\u094D\u0937\u0947\u0924\u094D\u0930' : 'Most Engaged Areas')
    : (isNe ? '\u0936\u0940\u0930\u094D\u0937 \u092F\u094B\u0917\u0926\u093E\u0928\u0915\u0930\u094D\u0924\u093E' : 'Top Contributors');

  if (isLoading) {
    return (
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-white">{title || defaultTitle}</h3>
        </div>
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
        </div>
      </div>
    );
  }

  const entries = leaderboard ?? [];
  if (entries.length === 0) return null;

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          {title || defaultTitle}
        </h3>
        {showLink && (
          <Link
            href="/leaderboard"
            className="text-xs text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-1"
          >
            {isNe ? '\u0938\u092C\u0948 \u0939\u0947\u0930\u094D\u0928\u0941\u0939\u094B\u0938\u094D' : 'View All'}
            <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>

      <div className="space-y-1.5">
        {type === 'areas'
          ? (entries as AreaLeaderboardEntry[]).map((entry, i) => (
              <div
                key={entry.province}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
              >
                <RankBadge rank={i + 1} />
                <MapPin className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                <span className="text-sm text-gray-300 flex-1 min-w-0 truncate">
                  {entry.province}
                </span>
                <span className="text-xs text-gray-500 tabular-nums">
                  {entry.proposalCount}p {entry.reportCount}r
                </span>
                <span className="text-sm font-bold text-primary-400 tabular-nums w-10 text-right">
                  {entry.engagementScore}
                </span>
              </div>
            ))
          : (entries as CitizenLeaderboardEntry[]).map((entry, i) => (
              <div
                key={`${entry.displayName}-${i}`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
              >
                <RankBadge rank={i + 1} />
                <Users className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                <span className="text-sm text-gray-300 flex-1 min-w-0 truncate">
                  {entry.displayName}
                </span>
                <span className="text-sm font-bold text-amber-400 tabular-nums">
                  {entry.karma}
                </span>
              </div>
            ))}
      </div>
    </div>
  );
}
