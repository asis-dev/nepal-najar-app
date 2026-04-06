/** Data shape for the daily scorecard reel */
export interface DailyScorecardData {
  date: string;
  dayNumber: number;
  pulse: number;
  pulseLabel: string;
  grade?: string; // A-F or null if early phase
  score?: number;
  phase: 'early' | 'ramp' | 'delivery';
  topStories: {
    title: string;
    titleNe?: string;
    sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
    signalCount: number;
  }[];
  stats: {
    totalSignals: number;
    newSignals: number;
    sourcesActive: number;
    commitmentsTracked: number;
  };
  commitmentsMoved: {
    confirms: number;
    contradicts: number;
  };
}

/** Unified daily reel — all content in one 60s video */
export interface DailyReelData {
  date: string;
  dayNumber: number;
  pulse: number;
  pulseLabel: string;
  grade?: string;
  score?: number;
  phase: 'early' | 'ramp' | 'delivery';
  topStories: {
    title: string;
    titleNe?: string;
    summary?: string;
    summaryNe?: string;
    sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
    signalCount: number;
  }[];
  stats: {
    totalSignals: number;
    newSignals: number;
    sourcesActive: number;
    commitmentsTracked: number;
  };
  commitmentsMoved: {
    confirms: number;
    contradicts: number;
  };
  statusBreakdown: {
    notStarted: number;
    inProgress: number;
    stalled: number;
    delivered: number;
  };
  topMovers: {
    titleNe: string;
    title?: string;
    progress: number;
    status: string;
  }[];
  minister: {
    name: string;
    nameNe: string;
    role: string;
    roleNe: string;
  };
}

/** Video config */
export const VIDEO_CONFIG = {
  width: 1080,
  height: 1920,
  fps: 30,
  durationInSeconds: 60,
} as const;
