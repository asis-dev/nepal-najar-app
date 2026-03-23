'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Clock3,
  Flame,
  Link2,
  Newspaper,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useTrending, type TrendingItem } from '@/lib/hooks/use-trending';

const TREND_STYLES: Record<
  TrendingItem['trend'],
  { icon: React.ComponentType<{ className?: string }>; label: string; tone: string }
> = {
  rising: {
    icon: TrendingUp,
    label: 'Rising',
    tone: 'text-emerald-300 border-emerald-500/20 bg-emerald-500/10',
  },
  falling: {
    icon: TrendingDown,
    label: 'Cooling',
    tone: 'text-red-300 border-red-500/20 bg-red-500/10',
  },
  stable: {
    icon: Link2,
    label: 'Steady',
    tone: 'text-slate-300 border-white/10 bg-white/[0.05]',
  },
  new: {
    icon: Sparkles,
    label: 'New',
    tone: 'text-amber-300 border-amber-500/20 bg-amber-500/10',
  },
};

function formatRelativeTime(iso: string | undefined): string {
  if (!iso) return 'Just updated';
  const diffMs = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return 'Just updated';

  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${Math.max(minutes, 1)}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function prettifySource(source: string): string {
  return source
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function LoadingCard() {
  return (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="h-4 w-16 animate-pulse rounded bg-white/[0.06]" />
          <div className="mt-4 h-5 w-4/5 animate-pulse rounded bg-white/[0.06]" />
          <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-white/[0.06]" />
        </div>
        <div className="h-8 w-20 animate-pulse rounded-full bg-white/[0.06]" />
      </div>
    </div>
  );
}

export default function TrendingPage() {
  const { trending, pulse, pulseLevel, updatedAt, isLoading } = useTrending(12);

  const platformSummary = useMemo(() => {
    const totals = new Map<string, number>();

    for (const item of trending) {
      for (const signal of item.topSignals ?? []) {
        const key = prettifySource(signal.source);
        totals.set(key, (totals.get(key) || 0) + 1);
      }
    }

    const ranked = [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({ name, count }));

    const maxCount = ranked[0]?.count || 1;
    return ranked.map((item) => ({
      ...item,
      width: Math.max(18, Math.round((item.count / maxCount) * 100)),
    }));
  }, [trending]);

  const pulseTone = {
    low: 'text-blue-300 border-blue-500/20 bg-blue-500/10',
    moderate: 'text-emerald-300 border-emerald-500/20 bg-emerald-500/10',
    high: 'text-orange-300 border-orange-500/20 bg-orange-500/10',
    very_high: 'text-red-300 border-red-500/20 bg-red-500/10',
  }[pulseLevel];

  return (
    <div className="public-page">
      <div className="public-section">
        <div className="public-shell">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
              <div className="space-y-6">
                <div className="glass-card p-6">
                  <div className="inline-flex items-center gap-2 text-orange-300">
                    <Flame className="h-5 w-5" />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em]">
                      Live pulse
                    </span>
                  </div>
                  <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
                    What Nepal Najar is hearing right now
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-400">
                    A ranked view of the commitments, people, and topics showing the
                    strongest recent signal movement across the intelligence engine.
                  </p>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500">
                        Political pulse
                      </p>
                      <div className="mt-3 flex items-end gap-3">
                        <div className="text-5xl font-bold text-white">{pulse}</div>
                        <span className={`mb-1 rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${pulseTone}`}>
                          {pulseLevel.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-gray-400">
                        {trending.length} ranked items in the last 24 hours. Updated{' '}
                        {formatRelativeTime(updatedAt)}.
                      </p>
                    </div>

                    <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500">
                        Use this page for
                      </p>
                      <div className="mt-4 space-y-3 text-sm text-gray-300">
                        <div className="flex items-start gap-2">
                          <Sparkles className="mt-0.5 h-4 w-4 text-cyan-300" />
                          Spotting sudden attention shifts before they hit the tracker.
                        </div>
                        <div className="flex items-start gap-2">
                          <Clock3 className="mt-0.5 h-4 w-4 text-amber-300" />
                          Seeing which names and issues are heating up this week.
                        </div>
                        <div className="flex items-start gap-2">
                          <ArrowRight className="mt-0.5 h-4 w-4 text-emerald-300" />
                          Jumping into daily coverage with context instead of noise.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-6">
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                    <TrendingUp className="h-5 w-5 text-primary-300" />
                    Cross-source activity
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-gray-400">
                    Where the strongest recent signals are showing up across the top-ranked items.
                  </p>

                  <div className="mt-5 space-y-3">
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <div className="h-3 w-20 animate-pulse rounded bg-white/[0.06]" />
                          <div className="h-5 flex-1 animate-pulse rounded-full bg-white/[0.06]" />
                        </div>
                      ))
                    ) : platformSummary.length > 0 ? (
                      platformSummary.map((platform) => (
                        <div key={platform.name} className="flex items-center gap-3">
                          <div className="w-24 text-xs text-gray-400">{platform.name}</div>
                          <div className="h-5 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-primary-500 to-cyan-500"
                              style={{ width: `${platform.width}%` }}
                            />
                          </div>
                          <div className="w-8 text-right text-xs font-medium text-gray-300">
                            {platform.count}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">
                        Cross-source breakdown will populate as more ranked signals come through.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {isLoading ? (
                  <>
                    <LoadingCard />
                    <LoadingCard />
                    <LoadingCard />
                  </>
                ) : trending.length > 0 ? (
                  trending.map((item, index) => {
                    const trendStyle = TREND_STYLES[item.trend];
                    const TrendIcon = trendStyle.icon;

                    return (
                      <div key={item.id} className="glass-card p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-gray-500">
                                #{index + 1}
                              </span>
                              <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-gray-400">
                                {item.type}
                              </span>
                              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ${trendStyle.tone}`}>
                                <TrendIcon className="h-3 w-3" />
                                {trendStyle.label}
                              </span>
                            </div>

                            <h2 className="mt-3 text-xl font-semibold leading-tight text-white">
                              {item.title}
                            </h2>

                            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-400">
                              <span className="inline-flex items-center gap-1.5">
                                <Flame className="h-3.5 w-3.5 text-orange-300" />
                                score {item.score}
                              </span>
                              <span className="inline-flex items-center gap-1.5">
                                <Newspaper className="h-3.5 w-3.5 text-cyan-300" />
                                {item.signalCount} recent signals
                              </span>
                              <span className="inline-flex items-center gap-1.5">
                                <Clock3 className="h-3.5 w-3.5 text-amber-300" />
                                active {formatRelativeTime(item.lastActivity)}
                              </span>
                            </div>
                          </div>

                          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-right">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-gray-500">
                              Engagement
                            </div>
                            <div className="mt-2 text-2xl font-semibold text-white">
                              {item.engagement}
                            </div>
                          </div>
                        </div>

                        {item.topSignals.length > 0 ? (
                          <div className="mt-5 rounded-3xl border border-white/[0.08] bg-black/20 p-4">
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">
                                Source trail
                              </p>
                              <Link
                                href="/daily"
                                className="text-xs font-medium text-primary-300 transition-colors hover:text-primary-200"
                              >
                                Open daily activity
                              </Link>
                            </div>
                            <div className="space-y-2">
                              {item.topSignals.slice(0, 3).map((signal) => (
                                <a
                                  key={signal.id}
                                  href={signal.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-start justify-between gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3 py-3 transition-colors hover:bg-white/[0.05]"
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-gray-200">
                                      {signal.title}
                                    </p>
                                    <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-gray-500">
                                      {prettifySource(signal.source)}
                                    </p>
                                  </div>
                                  <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
                                </a>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                ) : (
                  <div className="glass-card p-8 text-center">
                    <p className="text-lg font-semibold text-white">
                      No ranked movement yet
                    </p>
                    <p className="mt-3 text-sm leading-7 text-gray-400">
                      The trending page will fill itself as fresh reviewed signals and
                      intelligence runs accumulate.
                    </p>
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                      <Link
                        href="/daily"
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-cyan-500 px-5 py-3 text-sm font-semibold text-white"
                      >
                        Open daily activity
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                      <Link
                        href="/explore/first-100-days"
                        className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-3 text-sm font-medium text-gray-200 transition-colors hover:bg-white/[0.05]"
                      >
                        Open tracker
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
