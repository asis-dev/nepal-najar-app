'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Trophy,
  MapPin,
  Users,
  Mountain,
  Loader2,
  FileText,
  BarChart3,
  ThumbsUp,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { PublicPageHero } from '@/components/public/page-hero';
import {
  useLeaderboard,
  type AreaLeaderboardEntry,
  type CitizenLeaderboardEntry,
} from '@/lib/hooks/use-leaderboard';

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
      className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold border ${styles}`}
    >
      {rank}
    </span>
  );
}

/* ═══════════════════════════════════════════
   TAB BUTTON
   ═══════════════════════════════════════════ */
function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Mountain;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
        active
          ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30 shadow-[0_0_12px_rgba(59,130,246,0.1)]'
          : 'text-gray-500 hover:text-gray-300 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05]'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

/* ═══════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════ */
export default function LeaderboardPage() {
  const { locale } = useI18n();
  const isNe = locale === 'ne';
  const [activeTab, setActiveTab] = useState<'areas' | 'citizens'>('areas');

  const { data: leaderboard, isLoading } = useLeaderboard(activeTab, 20);

  return (
    <div className="public-page">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 h-[520px] w-[520px] rounded-full bg-amber-500/[0.03] blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[420px] w-[420px] rounded-full bg-primary-500/[0.04] blur-[100px]" />
      </div>

      <div className="relative z-10">
        <div className="public-shell pt-6">
          <div className="mx-auto max-w-4xl">
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-primary-400 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {isNe ? '\u092A\u091B\u093E\u0921\u093F' : 'Back'}
            </Link>
          </div>
        </div>

        <PublicPageHero
          eyebrow={isNe ? '\u0938\u0915\u094D\u0930\u093F\u092F \u0928\u093E\u0917\u0930\u093F\u0915' : 'Active Citizens'}
          title={isNe ? '\u0938\u0915\u094D\u0930\u093F\u092F \u0928\u093E\u0917\u0930\u093F\u0915 \u0932\u093F\u0921\u0930\u092C\u094B\u0930\u094D\u0921' : 'Engagement Leaderboard'}
          description={
            isNe
              ? '\u0915\u0941\u0928 \u0915\u094D\u0937\u0947\u0924\u094D\u0930 \u0930 \u0928\u093E\u0917\u0930\u093F\u0915 \u0938\u092C\u0948\u092D\u0928\u094D\u0926\u093E \u0938\u0915\u094D\u0930\u093F\u092F \u091B\u0928\u094D \u0939\u0947\u0930\u094D\u0928\u0941\u0939\u094B\u0938\u094D\u0964'
              : 'See which areas and citizens are most engaged in accountability.'
          }
          centered
        />

        {/* Tabs */}
        <section className="px-4 sm:px-6 lg:px-8 pb-4">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <TabButton
              active={activeTab === 'areas'}
              onClick={() => setActiveTab('areas')}
              icon={Mountain}
              label={isNe ? '\u0915\u094D\u0937\u0947\u0924\u094D\u0930' : 'Areas'}
            />
            <TabButton
              active={activeTab === 'citizens'}
              onClick={() => setActiveTab('citizens')}
              icon={Users}
              label={isNe ? '\u0928\u093E\u0917\u0930\u093F\u0915' : 'Citizens'}
            />
          </div>
        </section>

        {/* Leaderboard Content */}
        <section className="px-4 sm:px-6 lg:px-8 pb-16">
          <div className="max-w-4xl mx-auto">
            {isLoading ? (
              <div className="glass-card p-10 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
              </div>
            ) : !leaderboard || leaderboard.length === 0 ? (
              <div className="glass-card p-10 text-center">
                <Trophy className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500">
                  {isNe ? '\u0905\u0939\u093F\u0932\u0947\u0938\u092E\u094D\u092E \u0915\u0941\u0928\u0948 \u0921\u093E\u091F\u093E \u091B\u0948\u0928\u0964' : 'No data available yet. Be the first to contribute!'}
                </p>
              </div>
            ) : activeTab === 'areas' ? (
              <div className="glass-card overflow-hidden">
                {/* Header */}
                <div className="hidden sm:flex items-center gap-3 px-5 py-3 border-b border-white/[0.06] text-xs text-gray-500 uppercase tracking-wider">
                  <span className="w-8" />
                  <span className="flex-1">{isNe ? '\u092A\u094D\u0930\u0926\u0947\u0936' : 'Province'}</span>
                  <span className="w-20 text-right">{isNe ? '\u092A\u094D\u0930\u0938\u094D\u0924\u093E\u0935' : 'Proposals'}</span>
                  <span className="w-20 text-right">{isNe ? '\u0930\u093F\u092A\u094B\u0930\u094D\u091F' : 'Reports'}</span>
                  <span className="w-20 text-right">{isNe ? '\u092E\u0924' : 'Votes'}</span>
                  <span className="w-20 text-right">{isNe ? '\u0938\u094D\u0915\u094B\u0930' : 'Score'}</span>
                </div>

                {/* Rows */}
                {(leaderboard as AreaLeaderboardEntry[]).map((entry, i) => (
                  <div
                    key={entry.province}
                    className={`flex items-center gap-3 px-5 py-4 border-b border-white/[0.04] transition-colors hover:bg-white/[0.03] ${
                      i < 3 ? 'bg-white/[0.01]' : ''
                    }`}
                  >
                    <RankBadge rank={i + 1} />
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <span className="text-sm sm:text-base font-medium text-gray-200 truncate">
                        {entry.province}
                      </span>
                    </div>
                    <div className="hidden sm:flex items-center gap-1 w-20 justify-end">
                      <FileText className="w-3 h-3 text-gray-600" />
                      <span className="text-sm text-gray-400 tabular-nums">{entry.proposalCount}</span>
                    </div>
                    <div className="hidden sm:flex items-center gap-1 w-20 justify-end">
                      <BarChart3 className="w-3 h-3 text-gray-600" />
                      <span className="text-sm text-gray-400 tabular-nums">{entry.reportCount}</span>
                    </div>
                    <div className="hidden sm:flex items-center gap-1 w-20 justify-end">
                      <ThumbsUp className="w-3 h-3 text-gray-600" />
                      <span className="text-sm text-gray-400 tabular-nums">{entry.voteCount}</span>
                    </div>
                    <span className="text-base font-bold text-primary-400 tabular-nums w-20 text-right">
                      {entry.engagementScore}
                    </span>

                    {/* Mobile stats */}
                    <div className="sm:hidden text-right">
                      <div className="text-xs text-gray-500">
                        {entry.proposalCount}p / {entry.reportCount}r
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-card overflow-hidden">
                {/* Header */}
                <div className="hidden sm:flex items-center gap-3 px-5 py-3 border-b border-white/[0.06] text-xs text-gray-500 uppercase tracking-wider">
                  <span className="w-8" />
                  <span className="flex-1">{isNe ? '\u0928\u093E\u0917\u0930\u093F\u0915' : 'Citizen'}</span>
                  <span className="w-24 text-right">{isNe ? '\u092A\u094D\u0930\u0938\u094D\u0924\u093E\u0935 \u0938\u093F\u0930\u094D\u091C\u0928\u093E' : 'Proposals'}</span>
                  <span className="w-24 text-right">{isNe ? '\u0938\u094D\u0935\u0940\u0915\u0943\u0924' : 'Accepted'}</span>
                  <span className="w-20 text-right">{isNe ? '\u0915\u0930\u094D\u092E' : 'Karma'}</span>
                </div>

                {/* Rows */}
                {(leaderboard as CitizenLeaderboardEntry[]).map((entry, i) => (
                  <div
                    key={`${entry.displayName}-${i}`}
                    className={`flex items-center gap-3 px-5 py-4 border-b border-white/[0.04] transition-colors hover:bg-white/[0.03] ${
                      i < 3 ? 'bg-white/[0.01]' : ''
                    }`}
                  >
                    <RankBadge rank={i + 1} />
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <span className="text-sm sm:text-base font-medium text-gray-200 truncate">
                        {entry.displayName}
                      </span>
                    </div>
                    <span className="hidden sm:block text-sm text-gray-400 tabular-nums w-24 text-right">
                      {entry.proposalsCreated}
                    </span>
                    <span className="hidden sm:block text-sm text-emerald-400/80 tabular-nums w-24 text-right">
                      {entry.proposalsAccepted}
                    </span>
                    <span className="text-base font-bold text-amber-400 tabular-nums w-20 text-right">
                      {entry.karma}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Footer accent */}
        <div className="h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
      </div>
    </div>
  );
}
