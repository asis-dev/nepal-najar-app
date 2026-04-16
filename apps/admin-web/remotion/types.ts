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
    imageUrl?: string; // AI-generated or scraped image
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

/** ═══ HYPE REEL — 15s viral format ═══ */
export interface HypeReelData {
  date: string;
  dayNumber: number;

  /** The ONE trending story — single focus for maximum impact */
  hook: {
    textNe: string;       // Provocative Nepali headline (max 20 words)
    textEn: string;       // English subtitle
    emoji: string;        // 🔴 🚨 ⚡ 🔥 💥
    faceImage?: string;   // Path to politician/person face (staticFile path)
    faceName?: string;    // Name shown on screen
    faceNameNe?: string;  // Nepali name
    faceRole?: string;    // "Prime Minister", "Minister", etc.
  };

  /** 2-3 quick facts that make the story hit hard */
  facts: Array<{
    textNe: string;
    textEn: string;
    highlight?: string;   // Key number or phrase shown HUGE
  }>;

  /** Optional grade reveal */
  grade?: string;          // A-F
  gradeChange?: 'up' | 'down' | 'same';
  previousGrade?: string;

  /** Comment bait — provocative question */
  questionNe: string;
  questionEn: string;

  /** Visual tone */
  category: 'breaking' | 'scandal' | 'progress' | 'failure' | 'milestone';
}

export const HYPE_REEL_CONFIG = {
  width: 1080,
  height: 1920,
  fps: 30,
  durationInSeconds: 15,
  durationInFrames: 450,
} as const;

/** Video config */
export const VIDEO_CONFIG = {
  width: 1080,
  height: 1920,
  fps: 30,
  durationInSeconds: 60,
} as const;
