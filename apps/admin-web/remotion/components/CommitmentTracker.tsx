import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
  Easing,
} from 'remotion';

const NEPAL_RED = '#DC143C';
const NEPAL_BLUE = '#003893';
const DARK_BG = '#0a0a0f';
const CARD_BG = '#141420';
const GOLD = '#f59e0b';
const GREEN = '#22c55e';
const RED_ACCENT = '#ef4444';
const BLUE = '#3b82f6';
const WHITE = '#ffffff';
const GRAY = '#9ca3af';

export interface CommitmentTrackerData {
  dayNumber: number;
  totalCommitments: number;
  statusBreakdown: { notStarted: number; inProgress: number; stalled: number; delivered: number };
  movedThisWeek: { title: string; titleNe: string; direction: 'confirms' | 'contradicts'; progress: number }[];
  topMovers: { titleNe: string; progress: number; status: string }[];
}

const statusColor = (s: string) =>
  s === 'delivered' ? GREEN : s === 'in_progress' ? BLUE : s === 'stalled' ? RED_ACCENT : GRAY;

/* ── Intro ── */
function TrackerIntro({ data }: { data: CommitmentTrackerData }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({ frame, fps, from: 0.6, to: 1, config: { damping: 12 } });

  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 40%, ${NEPAL_BLUE}30 0%, ${DARK_BG} 70%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
      <div style={{ opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' }), fontSize: 32, color: GOLD, fontWeight: 600 }}>
        🎯 प्रतिबद्धता ट्र्याकर
      </div>
      <div style={{ transform: `scale(${scale})`, fontSize: 140, fontWeight: 900, color: WHITE, lineHeight: 1 }}>
        {data.totalCommitments}
      </div>
      <div style={{ fontSize: 30, color: GRAY, opacity: interpolate(frame, [20, 35], [0, 1], { extrapolateRight: 'clamp' }) }}>
        सरकारका वचनबद्धता ट्र्याक गर्दैछौं
      </div>
      <div style={{ fontSize: 24, color: NEPAL_RED, opacity: interpolate(frame, [35, 45], [0, 1], { extrapolateRight: 'clamp' }) }}>
        दिन {data.dayNumber}
      </div>
    </AbsoluteFill>
  );
}

/* ── Status Breakdown with animated donut ── */
function StatusBreakdown({ data }: { data: CommitmentTrackerData }) {
  const frame = useCurrentFrame();
  const total = data.totalCommitments;
  const { notStarted, inProgress, stalled, delivered } = data.statusBreakdown;

  const bars = [
    { label: 'सुरु भएको छैन', count: notStarted, color: GRAY, icon: '⏳' },
    { label: 'प्रगतिमा', count: inProgress, color: BLUE, icon: '🔄' },
    { label: 'रोकिएको', count: stalled, color: RED_ACCENT, icon: '⚠️' },
    { label: 'पूरा भएको', count: delivered, color: GREEN, icon: '✅' },
  ];

  return (
    <AbsoluteFill style={{ background: DARK_BG, display: 'flex', flexDirection: 'column', padding: '100px 60px', justifyContent: 'center', gap: 36 }}>
      <div style={{ fontSize: 30, fontWeight: 700, color: WHITE, marginBottom: 10, opacity: interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' }) }}>
        📊 वर्तमान स्थिति
      </div>

      {bars.map((bar, i) => {
        const delay = 10 + i * 15;
        const barPercent = (bar.count / total) * 100;
        const animatedWidth = interpolate(frame, [delay, delay + 30], [0, barPercent], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
        const opacity = interpolate(frame, [delay, delay + 10], [0, 1], { extrapolateRight: 'clamp' });
        const countProgress = interpolate(frame, [delay, delay + 25], [0, 1], { extrapolateRight: 'clamp' });

        return (
          <div key={i} style={{ opacity }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 24, color: WHITE, fontWeight: 600 }}>{bar.icon} {bar.label}</span>
              <span style={{ fontSize: 28, fontWeight: 900, color: bar.color, fontVariantNumeric: 'tabular-nums' }}>
                {Math.round(countProgress * bar.count)}
              </span>
            </div>
            <div style={{ height: 24, background: '#1f1f2e', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ width: `${animatedWidth}%`, height: '100%', background: bar.color, borderRadius: 12 }} />
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

/* ── Top Movers ── */
function TopMovers({ data }: { data: CommitmentTrackerData }) {
  const frame = useCurrentFrame();
  const movers = data.topMovers.slice(0, 4);

  return (
    <AbsoluteFill style={{ background: DARK_BG, display: 'flex', flexDirection: 'column', padding: '100px 50px', justifyContent: 'center', gap: 24 }}>
      <div style={{ fontSize: 30, fontWeight: 700, color: GOLD, marginBottom: 16, opacity: interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' }) }}>
        📈 शीर्ष प्रगतिकर्ता
      </div>

      {movers.map((mover, i) => {
        const delay = 10 + i * 18;
        const slideX = interpolate(frame, [delay, delay + 12], [500, 0], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
        const opacity = interpolate(frame, [delay, delay + 8], [0, 1], { extrapolateRight: 'clamp' });
        const progressWidth = interpolate(frame, [delay + 5, delay + 30], [0, mover.progress], { extrapolateRight: 'clamp' });
        const color = statusColor(mover.status);

        return (
          <div key={i} style={{ opacity, transform: `translateX(${slideX}px)`, background: CARD_BG, borderRadius: 16, padding: '20px 28px', borderLeft: `4px solid ${color}` }}>
            <div style={{ fontSize: 24, color: WHITE, fontWeight: 600, marginBottom: 12, lineHeight: 1.3 }}>
              {mover.titleNe}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, height: 12, background: '#1f1f2e', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ width: `${progressWidth}%`, height: '100%', background: color, borderRadius: 6 }} />
              </div>
              <span style={{ fontSize: 20, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums', minWidth: 50 }}>
                {Math.round(progressWidth)}%
              </span>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

/* ── CTA ── */
function TrackerCTA() {
  const frame = useCurrentFrame();
  const glowIntensity = interpolate(Math.sin(frame * 0.15), [-1, 1], [20, 50]);

  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, ${NEPAL_RED}25 0%, ${DARK_BG} 70%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 30, opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' }) }}>
      <div style={{ fontSize: 34, color: WHITE, textAlign: 'center', fontWeight: 700, lineHeight: 1.4, maxWidth: 750 }}>
        तपाईंको सरकारले के गरिरहेको छ?
      </div>
      <div style={{ fontSize: 28, color: GRAY, textAlign: 'center' }}>
        १०९ वचनबद्धता • AI ट्र्याकिंग • वास्तविक समय
      </div>
      <div style={{ marginTop: 10, background: `${NEPAL_RED}20`, border: `2px solid ${NEPAL_RED}`, borderRadius: 20, padding: '16px 48px', fontSize: 34, fontWeight: 800, color: WHITE, boxShadow: `0 0 ${glowIntensity}px ${NEPAL_RED}60` }}>
        nepalrepublic.org
      </div>
    </AbsoluteFill>
  );
}

export const CommitmentTracker: React.FC<{ data: CommitmentTrackerData }> = ({ data }) => {
  return (
    <AbsoluteFill style={{ background: DARK_BG, fontFamily: "'Noto Sans Devanagari', 'Inter', system-ui, sans-serif" }}>
      <Sequence from={0} durationInFrames={90}><TrackerIntro data={data} /></Sequence>
      <Sequence from={90} durationInFrames={210}><StatusBreakdown data={data} /></Sequence>
      <Sequence from={300} durationInFrames={300}><TopMovers data={data} /></Sequence>
      <Sequence from={600} durationInFrames={300}><TrackerCTA /></Sequence>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 6, background: `linear-gradient(90deg, ${NEPAL_RED}, ${NEPAL_BLUE})` }} />
    </AbsoluteFill>
  );
};
