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
const WHITE = '#ffffff';
const GRAY = '#9ca3af';

export interface WeekInReviewData {
  weekNumber: number;
  dayRange: string; // "Day 4-10"
  dateRange: string; // "Mar 29 - Apr 4"
  weeklyStats: {
    totalSignals: number;
    articlesScanned: number;
    newCommitments: number;
    sourcesActive: number;
  };
  topMoments: {
    day: number;
    titleNe: string;
    sentiment: string;
  }[];
  weeklyScore: { confirms: number; contradicts: number; unchanged: number };
}

/* ── Intro with week number ── */
function WeekIntro({ data }: { data: WeekInReviewData }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const weekScale = spring({ frame: Math.max(0, frame - 10), fps, from: 0.3, to: 1, config: { damping: 10 } });

  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 30%, ${NEPAL_BLUE}40 0%, ${DARK_BG} 70%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={{ opacity: interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' }), fontSize: 30, color: GOLD, fontWeight: 600, letterSpacing: 4 }}>
        📅 साप्ताहिक समीक्षा
      </div>
      <div style={{ transform: `scale(${weekScale})`, display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <span style={{ fontSize: 120, fontWeight: 900, color: WHITE, lineHeight: 1 }}>W{data.weekNumber}</span>
      </div>
      <div style={{ opacity: interpolate(frame, [30, 42], [0, 1], { extrapolateRight: 'clamp' }), fontSize: 28, color: GRAY }}>
        {data.dayRange} • {data.dateRange}
      </div>
      <div style={{ opacity: interpolate(frame, [45, 55], [0, 1], { extrapolateRight: 'clamp' }), fontSize: 42, fontWeight: 800, color: WHITE, marginTop: 20 }}>
        <span style={{ color: NEPAL_RED }}>नेपाल</span> रिपब्लिक
      </div>
    </AbsoluteFill>
  );
}

/* ── Weekly Stats Counter ── */
function WeeklyStats({ data }: { data: WeekInReviewData }) {
  const frame = useCurrentFrame();

  const stats = [
    { label: 'संकेत ट्र्याक', value: data.weeklyStats.totalSignals, icon: '📡', color: NEPAL_RED },
    { label: 'समाचार स्क्यान', value: data.weeklyStats.articlesScanned, icon: '📰', color: NEPAL_BLUE },
    { label: 'स्रोत सक्रिय', value: data.weeklyStats.sourcesActive, icon: '🌐', color: GREEN },
  ];

  return (
    <AbsoluteFill style={{ background: DARK_BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 60px', gap: 36 }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: GOLD, marginBottom: 10, opacity: interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' }) }}>
        📊 यो हप्ताको तथ्यांक
      </div>

      {stats.map((stat, i) => {
        const delay = 10 + i * 12;
        const opacity = interpolate(frame, [delay, delay + 10], [0, 1], { extrapolateRight: 'clamp' });
        const countProgress = interpolate(frame, [delay + 5, delay + 40], [0, 1], { extrapolateRight: 'clamp' });
        const displayValue = Math.round(countProgress * stat.value);

        return (
          <div key={i} style={{ opacity, background: CARD_BG, borderRadius: 20, padding: '28px 36px', width: '100%', display: 'flex', alignItems: 'center', gap: 24, borderLeft: `5px solid ${stat.color}` }}>
            <div style={{ fontSize: 48 }}>{stat.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 20, color: GRAY }}>{stat.label}</div>
              <div style={{ fontSize: 52, fontWeight: 900, color: WHITE, fontVariantNumeric: 'tabular-nums' }}>
                {displayValue.toLocaleString()}
              </div>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

/* ── Timeline — day by day highlights ── */
function Timeline({ data }: { data: WeekInReviewData }) {
  const frame = useCurrentFrame();
  const moments = data.topMoments.slice(0, 7);

  const sentColor = (s: string) => s === 'positive' ? GREEN : s === 'negative' ? RED_ACCENT : GOLD;

  return (
    <AbsoluteFill style={{ background: DARK_BG, display: 'flex', flexDirection: 'column', padding: '80px 50px', gap: 0 }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: WHITE, marginBottom: 24, opacity: interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' }) }}>
        🗓️ दिनदिनै
      </div>

      {moments.map((moment, i) => {
        const delay = 10 + i * 18;
        const opacity = interpolate(frame, [delay, delay + 10], [0, 1], { extrapolateRight: 'clamp' });
        const slideX = interpolate(frame, [delay, delay + 12], [300, 0], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
        const color = sentColor(moment.sentiment);

        return (
          <div key={i} style={{ opacity, transform: `translateX(${slideX}px)`, display: 'flex', gap: 16, marginBottom: 16 }}>
            {/* Day dot + line */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 50 }}>
              <div style={{ width: 14, height: 14, borderRadius: 7, background: color, flexShrink: 0 }} />
              {i < moments.length - 1 && <div style={{ width: 2, flex: 1, background: '#1f1f2e', marginTop: 4 }} />}
            </div>
            {/* Content */}
            <div style={{ flex: 1, paddingBottom: 8 }}>
              <div style={{ fontSize: 18, color: GRAY, fontWeight: 600, marginBottom: 4 }}>दिन {moment.day}</div>
              <div style={{ fontSize: 24, color: WHITE, fontWeight: 600, lineHeight: 1.3 }}>
                {moment.titleNe}
              </div>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

/* ── Weekly Verdict ── */
function WeeklyVerdict({ data }: { data: WeekInReviewData }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const glowIntensity = interpolate(Math.sin(frame * 0.15), [-1, 1], [20, 50]);

  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, ${NEPAL_RED}25 0%, ${DARK_BG} 70%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: '0 60px' }}>
      {/* Score boxes */}
      <div style={{ display: 'flex', gap: 20, opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' }) }}>
        <div style={{ textAlign: 'center', background: `${GREEN}15`, border: `2px solid ${GREEN}50`, borderRadius: 16, padding: '16px 24px' }}>
          <div style={{ fontSize: 56, fontWeight: 900, color: GREEN }}>{data.weeklyScore.confirms}</div>
          <div style={{ fontSize: 18, color: GRAY }}>प्रगति</div>
        </div>
        <div style={{ textAlign: 'center', background: `${RED_ACCENT}15`, border: `2px solid ${RED_ACCENT}50`, borderRadius: 16, padding: '16px 24px' }}>
          <div style={{ fontSize: 56, fontWeight: 900, color: RED_ACCENT }}>{data.weeklyScore.contradicts}</div>
          <div style={{ fontSize: 18, color: GRAY }}>चिन्ता</div>
        </div>
        <div style={{ textAlign: 'center', background: `${GRAY}15`, border: `2px solid ${GRAY}50`, borderRadius: 16, padding: '16px 24px' }}>
          <div style={{ fontSize: 56, fontWeight: 900, color: GRAY }}>{data.weeklyScore.unchanged}</div>
          <div style={{ fontSize: 18, color: GRAY }}>यथावत</div>
        </div>
      </div>

      <div style={{ opacity: interpolate(frame, [25, 38], [0, 1], { extrapolateRight: 'clamp' }), fontSize: 32, fontWeight: 700, color: WHITE, textAlign: 'center', lineHeight: 1.4, marginTop: 10 }}>
        अर्को हप्ता फेरि भेटौंला 🇳🇵
      </div>

      <div style={{ marginTop: 20, background: `${NEPAL_RED}20`, border: `2px solid ${NEPAL_RED}`, borderRadius: 20, padding: '14px 40px', fontSize: 30, fontWeight: 800, color: WHITE, boxShadow: `0 0 ${glowIntensity}px ${NEPAL_RED}60`, opacity: interpolate(frame, [40, 50], [0, 1], { extrapolateRight: 'clamp' }) }}>
        nepalrepublic.org
      </div>
    </AbsoluteFill>
  );
}

export const WeekInReview: React.FC<{ data: WeekInReviewData }> = ({ data }) => {
  return (
    <AbsoluteFill style={{ background: DARK_BG, fontFamily: "'Noto Sans Devanagari', 'Inter', system-ui, sans-serif" }}>
      <Sequence from={0} durationInFrames={90}><WeekIntro data={data} /></Sequence>
      <Sequence from={90} durationInFrames={150}><WeeklyStats data={data} /></Sequence>
      <Sequence from={240} durationInFrames={390}><Timeline data={data} /></Sequence>
      <Sequence from={630} durationInFrames={270}><WeeklyVerdict data={data} /></Sequence>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 6, background: `linear-gradient(90deg, ${NEPAL_RED}, ${NEPAL_BLUE})` }} />
    </AbsoluteFill>
  );
};
