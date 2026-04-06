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

export interface TopStoryData {
  date: string;
  dayNumber: number;
  story: {
    title: string;
    titleNe: string;
    summary: string;
    summaryNe: string;
    sentiment: string;
    signalCount: number;
    sources: string[];
  };
  relatedCommitments: { title: string; status: string }[];
}

/* ── Breaking Banner ── */
function BreakingBanner({ data }: { data: TopStoryData }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const barWidth = interpolate(frame, [0, 20], [0, 100], { extrapolateRight: 'clamp' });
  const textOpacity = interpolate(frame, [15, 25], [0, 1], { extrapolateRight: 'clamp' });
  const flash = Math.sin(frame * 0.3) > 0 ? 1 : 0.7;

  return (
    <AbsoluteFill style={{ background: DARK_BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      {/* Red bar expanding */}
      <div style={{ width: `${barWidth}%`, height: 80, background: NEPAL_RED, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}>
        <div style={{ opacity: textOpacity * flash, fontSize: 36, fontWeight: 900, color: WHITE, letterSpacing: 6, textTransform: 'uppercase' }}>
          🔴 मुख्य कथा
        </div>
      </div>

      {/* Day badge */}
      <div style={{ marginTop: 30, opacity: interpolate(frame, [30, 40], [0, 1], { extrapolateRight: 'clamp' }), fontSize: 24, color: GRAY }}>
        दिन {data.dayNumber} • {data.date}
      </div>
    </AbsoluteFill>
  );
}

/* ── Headline Reveal ── */
function HeadlineReveal({ data }: { data: TopStoryData }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleScale = spring({ frame: Math.max(0, frame - 5), fps, from: 1.3, to: 1, config: { damping: 10 } });
  const titleOpacity = interpolate(frame, [5, 20], [0, 1], { extrapolateRight: 'clamp' });

  const sentColor = data.story.sentiment === 'positive' ? GREEN : data.story.sentiment === 'negative' ? RED_ACCENT : GOLD;
  const sentLabel = data.story.sentiment === 'positive' ? 'सकारात्मक' : data.story.sentiment === 'negative' ? 'नकारात्मक' : 'तटस्थ';
  const badgeOpacity = interpolate(frame, [40, 50], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: DARK_BG, display: 'flex', flexDirection: 'column', padding: '120px 60px', justifyContent: 'center' }}>
      {/* Headline */}
      <div style={{ opacity: titleOpacity, transform: `scale(${titleScale})`, fontSize: 52, fontWeight: 900, color: WHITE, lineHeight: 1.25, marginBottom: 30 }}>
        {data.story.titleNe || data.story.title}
      </div>

      {/* Decorative line */}
      <div style={{ width: interpolate(frame, [20, 40], [0, 300], { extrapolateRight: 'clamp' }), height: 4, background: NEPAL_RED, borderRadius: 2, marginBottom: 30 }} />

      {/* Sentiment + source count */}
      <div style={{ opacity: badgeOpacity, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ background: `${sentColor}20`, border: `2px solid ${sentColor}`, borderRadius: 14, padding: '10px 24px', fontSize: 24, fontWeight: 700, color: sentColor }}>
          {sentLabel}
        </div>
        <div style={{ background: `${WHITE}10`, borderRadius: 14, padding: '10px 24px', fontSize: 24, color: GRAY }}>
          📡 {data.story.signalCount} स्रोतबाट
        </div>
      </div>
    </AbsoluteFill>
  );
}

/* ── Summary Detail ── */
function SummaryDetail({ data }: { data: TopStoryData }) {
  const frame = useCurrentFrame();

  const summaryText = data.story.summaryNe || data.story.summary;
  // Split into sentences for animated reveal
  const sentences = summaryText.split(/(?<=[।.!?])\s+/).filter(Boolean).slice(0, 4);

  return (
    <AbsoluteFill style={{ background: DARK_BG, display: 'flex', flexDirection: 'column', padding: '100px 60px', justifyContent: 'center', gap: 24 }}>
      <div style={{ fontSize: 26, fontWeight: 700, color: GOLD, marginBottom: 10, opacity: interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' }) }}>
        📝 विस्तृत विवरण
      </div>

      {sentences.map((sentence, i) => {
        const delay = 10 + i * 20;
        const opacity = interpolate(frame, [delay, delay + 12], [0, 1], { extrapolateRight: 'clamp' });
        const slideY = interpolate(frame, [delay, delay + 12], [20, 0], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });

        return (
          <div key={i} style={{ opacity, transform: `translateY(${slideY}px)`, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={{ fontSize: 20, color: NEPAL_RED, marginTop: 4, flexShrink: 0 }}>●</div>
            <div style={{ fontSize: 30, color: WHITE, lineHeight: 1.5, fontWeight: 500 }}>
              {sentence}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

/* ── CTA ── */
function StoryCTA() {
  const frame = useCurrentFrame();
  const glowIntensity = interpolate(Math.sin(frame * 0.15), [-1, 1], [20, 50]);

  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, ${NEPAL_RED}25 0%, ${DARK_BG} 70%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 30, opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' }) }}>
      <div style={{ fontSize: 48, fontWeight: 900, color: WHITE }}>
        <span style={{ color: NEPAL_RED }}>नेपाल</span> रिपब्लिक
      </div>
      <div style={{ fontSize: 26, color: GRAY, textAlign: 'center', maxWidth: 700, lineHeight: 1.5 }}>
        सरकारको हरेक कदम ट्र्याक गर्दैछौं।
      </div>
      <div style={{ background: `${NEPAL_RED}20`, border: `2px solid ${NEPAL_RED}`, borderRadius: 20, padding: '16px 48px', fontSize: 34, fontWeight: 800, color: WHITE, boxShadow: `0 0 ${glowIntensity}px ${NEPAL_RED}60` }}>
        nepalrepublic.org
      </div>
      <div style={{ fontSize: 22, color: GOLD }}>🔔 फलो गर्नुहोस्</div>
    </AbsoluteFill>
  );
}

/* ── Main ── */
export const TopStoryDeepDive: React.FC<{ data: TopStoryData }> = ({ data }) => {
  return (
    <AbsoluteFill style={{ background: DARK_BG, fontFamily: "'Noto Sans Devanagari', 'Inter', system-ui, sans-serif" }}>
      <Sequence from={0} durationInFrames={75}><BreakingBanner data={data} /></Sequence>
      <Sequence from={75} durationInFrames={120}><HeadlineReveal data={data} /></Sequence>
      <Sequence from={195} durationInFrames={150}><SummaryDetail data={data} /></Sequence>
      <Sequence from={345} durationInFrames={90}><StoryCTA /></Sequence>
      {/* 435 frames ÷ 30fps ≈ 14.5s — pad to exactly 900 frames = 30s */}
      <Sequence from={435} durationInFrames={465}><StoryCTA /></Sequence>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 6, background: `linear-gradient(90deg, ${NEPAL_RED}, ${NEPAL_BLUE})` }} />
    </AbsoluteFill>
  );
};
