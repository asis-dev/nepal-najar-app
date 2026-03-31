/* ═══════════════════════════════════════════
   Landing Page Types
   Shared between server & client components
   ═══════════════════════════════════════════ */

export type FeedTab = 'for-you' | 'following' | 'trending' | 'corruption';

export interface DailyBriefStory {
  title: string;
  titleNe?: string;
  summary: string;
  summaryNe?: string;
  signalCount: number;
  sources: string[];
  relatedCommitments: number[];
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
}

export interface DailyBrief {
  date: string;
  pulse: number;
  pulseLabel: string;
  summaryEn: string;
  summaryNe: string;
  topStories?: DailyBriefStory[];
  readerHighlights?: ReaderHighlight[];
  stats: {
    totalSignals24h: number;
    newSignals: number;
    sourcesActive: number;
    topSource: string;
  };
  audioUrl?: string | null;
  videoUrl?: string | null;
  audioDurationSeconds?: number | null;
}

export interface ReaderHighlight {
  commitmentId: number;
  title: string;
  titleNe: string;
  slug: string;
  direction: 'confirms' | 'contradicts' | 'new_activity';
  directionLabel: string;
  directionLabelNe: string;
  signalCount: number;
  owner: string;
  ownerNe: string;
  whyItMatters: string;
  whyItMattersNe: string;
  nextWatchpoint: string;
  nextWatchpointNe: string;
  confidenceScore: number;
  confidenceLabel: 'high' | 'medium' | 'low';
  trustLevel: string;
}

/* Status config used by multiple components */
export const STATUS_CONFIG = {
  in_progress: { labelKey: 'commitment.inProgress', color: 'bg-emerald-500', text: 'text-emerald-400', dot: '\u{1F7E2}' },
  stalled: { labelKey: 'commitment.stalled', color: 'bg-red-500', text: 'text-red-400', dot: '\u{1F534}' },
  not_started: { labelKey: 'commitment.notStarted', color: 'bg-amber-500', text: 'text-amber-400', dot: '\u{1F7E1}' },
  delivered: { labelKey: 'commitment.delivered', color: 'bg-blue-400', text: 'text-blue-400', dot: '\u2705' },
} as const;

/* Constants shared across landing sub-components */
export const FEED_TAB_STORAGE_KEY = 'feed-tab-preference';
export const LAST_FOLLOWING_VISIT_KEY = 'last-following-visit';
export const INITIAL_FEED_COUNT = 10;

/* Trust level to numeric score for sorting */
export const TRUST_SCORE: Record<string, number> = {
  verified: 5,
  high: 4,
  moderate: 3,
  low: 2,
  unverified: 1,
};
