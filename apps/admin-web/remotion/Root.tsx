import React from 'react';
import { Composition } from 'remotion';
import { DailyScorecard } from './components/DailyScorecard';
import { TopStoryDeepDive } from './components/TopStoryDeepDive';
import { CommitmentTracker } from './components/CommitmentTracker';
import { MinisterCallout } from './components/MinisterCallout';
import { WeekInReview } from './components/WeekInReview';
import { DailyScorecardEN } from './components/DailyScorecardEN';
import { DailyReel } from './components/DailyReel';
import { DailyReelEN } from './components/DailyReelEN';
import { AIDemo } from './components/AIDemo';
import { VIDEO_CONFIG } from './types';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* ═══ NEW: Unified 60s reels (replace the 5 separate videos) ═══ */}

      {/* Nepali Daily Reel — 60s, everything in one video */}
      <Composition
        id="DailyReel"
        component={DailyReel}
        durationInFrames={1800}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ data: {} as any }}
      />

      {/* English Daily Reel — 60s, everything in one video */}
      <Composition
        id="DailyReelEN"
        component={DailyReelEN}
        durationInFrames={1800}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ data: {} as any }}
      />

      {/* ═══ AI Demo — 45s marketing reel ═══ */}
      <Composition
        id="AIDemo"
        component={AIDemo}
        durationInFrames={1350}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ data: {} as any }}
      />

      {/* ═══ LEGACY: Individual videos (kept for backwards compatibility) ═══ */}

      <Composition
        id="DailyScorecard"
        component={DailyScorecard}
        durationInFrames={960}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ data: {} as any }}
      />

      <Composition
        id="TopStoryDeepDive"
        component={TopStoryDeepDive}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ data: {} as any }}
      />

      <Composition
        id="CommitmentTracker"
        component={CommitmentTracker}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ data: {} as any }}
      />

      <Composition
        id="MinisterCallout"
        component={MinisterCallout}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ data: {} as any }}
      />

      <Composition
        id="WeekInReview"
        component={WeekInReview}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ data: {} as any }}
      />

      <Composition
        id="DailyScorecardEN"
        component={DailyScorecardEN}
        durationInFrames={960}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ data: {} as any }}
      />
    </>
  );
};
