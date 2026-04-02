'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ArrowLeft,
  Newspaper,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Shield,
  AlertOctagon,
  RefreshCw,
  Share,
} from 'lucide-react';
import { shareOrCopy } from '@/lib/utils/share';
import { useI18n } from '@/lib/i18n';

interface ChangeItem {
  id: string;
  feed: 'national' | 'community' | 'integrity';
  type: string;
  title: string;
  title_ne?: string;
  summary: string;
  where?: string;
  affects?: string;
  source_count: number;
  confidence?: number;
  created_at: string;
  link?: string;
}

interface WhatChangedResponse {
  national: ChangeItem[];
  community: ChangeItem[];
  integrity: ChangeItem[];
  period_days: number;
  generated_at: string;
}

type FeedTab = 'national' | 'community' | 'integrity';

const DAY_OPTIONS = [1, 3, 7, 14, 30];

const TYPE_ICONS: Record<string, typeof Newspaper> = {
  news_update: Newspaper,
  news_coverage: Newspaper,
  new_issue: AlertTriangle,
  issue_resolved: CheckCircle2,
  evidence_added: FileText,
  corruption_report: Shield,
  contradiction_flag: AlertOctagon,
};

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `${diffD}d ago`;
  const diffMo = Math.floor(diffD / 30);
  return `${diffMo}mo ago`;
}

function relativeTimeNe(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'अहिले';
  if (diffMin < 60) return `${diffMin} मिनेट अगाडि`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} घण्टा अगाडि`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `${diffD} दिन अगाडि`;
  const diffMo = Math.floor(diffD / 30);
  return `${diffMo} महिना अगाडि`;
}

function useWhatChanged(days: number) {
  return useQuery<WhatChangedResponse>({
    queryKey: ['what-changed', days],
    queryFn: async () => {
      const res = await fetch(`/api/what-changed?days=${days}`);
      if (!res.ok) throw new Error('Failed to load changes');
      return res.json();
    },
    staleTime: 12 * 60 * 60_000, // 12 hours — data only changes on sweep (2x/day)
    gcTime: 24 * 60 * 60_000, // 24 hours
  });
}

function ConfidenceDot({ confidence }: { confidence?: number }) {
  if (confidence == null) return null;
  const color =
    confidence >= 0.7
      ? 'bg-emerald-400'
      : confidence >= 0.4
        ? 'bg-amber-400'
        : 'bg-red-400';
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} title={`${Math.round(confidence * 100)}%`} />;
}

function ChangeCard({ item, isNe, localizeField }: { item: ChangeItem; isNe: boolean; localizeField: (text?: string | null, textNe?: string | null, fallback?: string) => string }) {
  const Icon = TYPE_ICONS[item.type] || Newspaper;
  const title = localizeField(item.title, item.title_ne, item.summary || 'Update');
  const time = isNe ? relativeTimeNe(item.created_at) : relativeTime(item.created_at);

  const content = (
    <div className="glass-card p-3 sm:p-4 hover:bg-white/[0.02] transition-colors">
      <div className="flex gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          <Icon className="w-4 h-4 text-primary-400" />
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white leading-snug mb-1">
            {title}
          </h3>
          <p className="text-xs text-gray-400 line-clamp-2 mb-2">
            {item.summary}
          </p>

          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-1.5">
            {item.where && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-white/[0.06] text-gray-300">
                {item.where}
              </span>
            )}
            {item.affects && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-primary-500/10 text-primary-300">
                {item.affects}
              </span>
            )}
            <ConfidenceDot confidence={item.confidence} />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-gray-600">
              {item.source_count} {isNe ? 'स्रोत' : item.source_count === 1 ? 'source' : 'sources'}
            </span>
            <span className="text-[10px] text-gray-600">{time}</span>
          </div>
        </div>
      </div>
    </div>
  );

  if (item.link) {
    return (
      <Link href={item.link} className="block">
        {content}
      </Link>
    );
  }
  return content;
}

const TAB_LABELS: Record<FeedTab, { en: string; ne: string }> = {
  national: { en: 'National', ne: 'राष्ट्रिय' },
  community: { en: 'Community', ne: 'समुदाय' },
  integrity: { en: 'Integrity', ne: 'अखण्डता' },
};

export default function WhatChangedPage() {
  const { locale, localizeField } = useI18n();
  const isNe = locale === 'ne';
  const [days, setDays] = useState(7);
  const [activeTab, setActiveTab] = useState<FeedTab>('national');
  const { data, isLoading } = useWhatChanged(days);

  const counts: Record<FeedTab, number> = {
    national: data?.national?.length || 0,
    community: data?.community?.length || 0,
    integrity: data?.integrity?.length || 0,
  };

  const items = data?.[activeTab] || [];

  return (
    <div className="public-page">
      <div className="relative z-10">
        {/* Back link */}
        <div className="px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6">
          <div className="max-w-5xl mx-auto">
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 text-xs sm:text-sm text-gray-400 hover:text-primary-400 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {isNe ? 'अन्वेषण' : 'Explore'}
            </Link>
          </div>
        </div>

        {/* Header */}
        <section className="px-3 sm:px-6 lg:px-8 pt-4 pb-2">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-2 mb-1">
              <RefreshCw className="w-5 h-5 text-primary-400" />
              <h1 className="text-lg sm:text-xl font-bold text-white">
                {isNe ? 'के परिवर्तन भयो?' : 'What Changed?'}
              </h1>
              <button
                onClick={() => shareOrCopy({ title: isNe ? 'के परिवर्तन भयो?' : 'What Changed?', text: isNe ? 'हालैका अपडेट, नयाँ समस्या र प्रमाणित परिवर्तनहरू। nepalrepublic.org' : 'Recent updates, new issues, and verified changes. nepalrepublic.org', url: `${window.location.origin}/what-changed` })}
                className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-gray-300 bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1] hover:text-white transition-all"
              >
                <Share className="w-3.5 h-3.5" />
                {isNe ? 'शेयर गर्नुहोस्' : 'Share'}
              </button>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              {isNe
                ? 'हालैका अपडेट, नयाँ समस्या र प्रमाणित परिवर्तनहरू।'
                : 'Recent updates, new issues, and verified changes.'}
            </p>

            {/* Days selector */}
            <div className="flex items-center gap-1.5 mb-4">
              {DAY_OPTIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    days === d
                      ? 'bg-primary-500/20 text-primary-300 ring-1 ring-primary-500/30'
                      : 'bg-white/[0.04] text-gray-500 hover:text-gray-300 hover:bg-white/[0.06]'
                  }`}
                >
                  {d}{isNe ? ' दिन' : 'd'}
                </button>
              ))}
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 border-b border-white/[0.06] mb-4">
              {(Object.keys(TAB_LABELS) as FeedTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-2 text-xs font-medium transition-colors border-b-2 ${
                    activeTab === tab
                      ? 'border-primary-400 text-primary-300'
                      : 'border-transparent text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {isNe ? TAB_LABELS[tab].ne : TAB_LABELS[tab].en}
                  <span className="ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] bg-white/[0.06]">
                    {counts[tab]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Feed */}
        <section className="px-3 sm:px-6 lg:px-8 pb-8">
          <div className="max-w-5xl mx-auto">
            {isLoading ? (
              <div className="glass-card p-8 text-center">
                <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-400 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-500">
                  {isNe ? 'लोड हुँदैछ...' : 'Loading changes...'}
                </p>
              </div>
            ) : items.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <p className="text-sm text-gray-500">
                  {isNe
                    ? `पछिल्लो ${days} दिनमा कुनै परिवर्तन भेटिएन।`
                    : `No changes found in the last ${days} day${days === 1 ? '' : 's'}.`}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <ChangeCard key={item.id} item={item} isNe={isNe} localizeField={localizeField} />
                ))}
              </div>
            )}
          </div>
        </section>

        <div className="h-px bg-gradient-to-r from-transparent via-primary-500/30 to-transparent" />
      </div>
    </div>
  );
}
