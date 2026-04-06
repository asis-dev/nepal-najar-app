import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
  Easing,
  Img,
  staticFile,
} from 'remotion';
import type { DailyScorecardData } from '../types';

/* ══════════════════════════════════════════════
   ENGLISH DAILY SCORECARD — Viral Reel
   Same visual system as Nepali, English text
   ══════════════════════════════════════════════ */

const RED = '#DC143C';
const BLUE = '#003893';
const DARK = '#0a0a12';
const WHITE = '#ffffff';
const GOLD = '#fbbf24';
const GREEN = '#34d399';
const RED_LIGHT = '#f87171';
const GRAY = '#94a3b8';

const sentimentColor = (s: string) =>
  s === 'positive' ? GREEN : s === 'negative' ? RED_LIGHT : s === 'mixed' ? GOLD : GRAY;

function TopBar({ data }: { data: DailyScorecardData }) {
  const frame = useCurrentFrame();
  const blink = Math.sin(frame * 0.35) > 0;
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
      background: RED, padding: '14px 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 12, height: 12, borderRadius: 6, background: WHITE, opacity: blink ? 1 : 0.3 }} />
        <span style={{ fontSize: 20, fontWeight: 900, color: WHITE, letterSpacing: 3 }}>LIVE</span>
      </div>
      <span style={{ fontSize: 18, fontWeight: 700, color: WHITE }}>DAY {data.dayNumber}</span>
      <span style={{ fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>nepalrepublic.org</span>
    </div>
  );
}

function BottomBar() {
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100,
      height: 56, background: `linear-gradient(90deg, ${RED}, ${BLUE})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
    }}>
      <span style={{ fontSize: 22, fontWeight: 900, color: WHITE, letterSpacing: 1 }}>NEPAL REPUBLIC</span>
      <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)' }}>|</span>
      <span style={{ fontSize: 18, fontWeight: 600, color: GOLD }}>AI GOVERNMENT TRACKER</span>
    </div>
  );
}

/* ── HOOK ── */
function Hook({ data }: { data: DailyScorecardData }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pmPhoto = staticFile('images/politicians/balen-shah.jpg');
  const textScale = spring({ frame: Math.max(0, frame - 5), fps, from: 1.4, to: 1, config: { damping: 9, mass: 0.3 } });
  const textOpacity = interpolate(frame, [5, 10], [0, 1], { extrapolateRight: 'clamp' });
  const dayProgress = interpolate(frame, [10, 30], [0, 1], { extrapolateRight: 'clamp' });
  const displayDay = Math.round(dayProgress * data.dayNumber);

  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', top: 50, left: 0, right: 0, height: 750, overflow: 'hidden' }}>
        <Img src={pmPhoto} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%', filter: 'brightness(0.7) contrast(1.2)' }} />
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.1) 40%, ${DARK} 95%)` }} />
        <div style={{ position: 'absolute', bottom: 120, left: 40, right: 40 }}>
          <div style={{ background: 'rgba(0,0,0,0.7)', borderLeft: `4px solid ${RED}`, borderRadius: 8, padding: '12px 20px', display: 'inline-flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: WHITE }}>PM Balen Shah</span>
            <span style={{ fontSize: 18, color: GOLD, fontWeight: 600 }}>Prime Minister • RSP Government</span>
          </div>
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 80, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '0 40px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, opacity: interpolate(frame, [3, 8], [0, 1], { extrapolateRight: 'clamp' }) }}>
          <span style={{ fontSize: 140, fontWeight: 900, color: WHITE, lineHeight: 1, fontVariantNumeric: 'tabular-nums', textShadow: `0 0 40px ${RED}60` }}>{displayDay}</span>
          <span style={{ fontSize: 48, fontWeight: 800, color: RED }}>DAYS</span>
        </div>
        <div style={{ opacity: textOpacity, transform: `scale(${textScale})`, fontSize: 48, fontWeight: 900, color: WHITE, textAlign: 'center', lineHeight: 1.25, textShadow: '0 4px 20px rgba(0,0,0,0.8)' }}>
          What has the{'\n'}government done? 🤔
        </div>
        <div style={{ opacity: interpolate(frame, [40, 55], [0, 1], { extrapolateRight: 'clamp' }), fontSize: 20, color: GRAY, fontWeight: 600 }}>
          Watch below 👇
        </div>
      </div>
    </AbsoluteFill>
  );
}

/* ── STATS FLASH ── */
function StatsFlash({ data }: { data: DailyScorecardData }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const stats = [
    { value: data.stats.totalSignals, label: 'SIGNALS\nTRACKED', color: '#06b6d4' },
    { value: data.stats.sourcesActive, label: 'NEWS SOURCES\nSCANNED DAILY', color: GOLD },
    { value: data.stats.commitmentsTracked, label: 'GOVERNMENT\nPROMISES TRACKED', color: RED },
  ];
  const STAT_DUR = 35;

  return (
    <AbsoluteFill>
      {stats.map((stat, i) => {
        const start = i * STAT_DUR;
        const f = frame - start;
        if (f < -5 || f > STAT_DUR + 5) return null;
        const enter = interpolate(f, [0, 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const exit = interpolate(f, [STAT_DUR - 6, STAT_DUR], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const numScale = spring({ frame: Math.max(0, f), fps, from: 2.5, to: 1, config: { damping: 8, mass: 0.3 } });
        const countProgress = interpolate(f, [3, 25], [0, 1], { extrapolateRight: 'clamp' });
        const displayVal = Math.round(countProgress * stat.value);

        return (
          <AbsoluteFill key={i} style={{ opacity: enter * exit, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: DARK }}>
            <div style={{ width: interpolate(f, [0, 10], [0, 800], { extrapolateRight: 'clamp' }), height: 6, background: stat.color, borderRadius: 3, marginBottom: 40, boxShadow: `0 0 20px ${stat.color}60` }} />
            <div style={{ transform: `scale(${numScale})`, fontSize: 180, fontWeight: 900, color: WHITE, lineHeight: 1, fontVariantNumeric: 'tabular-nums', textShadow: `0 0 60px ${stat.color}40` }}>
              {displayVal.toLocaleString()}
            </div>
            <div style={{ marginTop: 20, fontSize: 40, fontWeight: 800, color: stat.color, textAlign: 'center', lineHeight: 1.2, letterSpacing: 4, opacity: interpolate(f, [8, 16], [0, 1], { extrapolateRight: 'clamp' }) }}>
              {stat.label}
            </div>
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
}

/* ── HEADLINES ── */
function Headlines({ data }: { data: DailyScorecardData }) {
  const frame = useCurrentFrame();
  const stories = data.topStories.slice(0, 5);
  const STORY_DUR = 70;

  return (
    <AbsoluteFill>
      {stories.map((story, i) => {
        const start = i * STORY_DUR;
        const f = frame - start;
        if (f < -5 || f > STORY_DUR + 5) return null;
        const enter = interpolate(f, [0, 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const exit = interpolate(f, [STORY_DUR - 8, STORY_DUR], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const slideY = interpolate(f, [0, 10], [60, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
        const title = story.title || story.titleNe;
        const color = sentimentColor(story.sentiment);
        const sentLabel = story.sentiment === 'positive' ? 'POSITIVE' : story.sentiment === 'negative' ? 'NEGATIVE' : story.sentiment === 'mixed' ? 'MIXED' : 'NEUTRAL';

        return (
          <AbsoluteFill key={i} style={{ opacity: enter * exit, background: DARK, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '100px 50px 120px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 30 }}>
              <div style={{ background: color, borderRadius: 12, padding: '8px 20px', fontSize: 24, fontWeight: 900, color: DARK }}>#{i + 1}</div>
              <div style={{ background: `${color}25`, borderRadius: 10, padding: '8px 18px', fontSize: 22, fontWeight: 700, color }}>{sentLabel}</div>
              <div style={{ flex: 1, height: 3, background: `${color}40`, borderRadius: 2 }} />
            </div>
            <div style={{ transform: `translateY(${slideY}px)`, fontSize: 52, fontWeight: 900, color: WHITE, lineHeight: 1.25, textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
              {title}
            </div>
            <div style={{ marginTop: 30, opacity: interpolate(f, [15, 25], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }), display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: 4, background: color, boxShadow: `0 0 8px ${color}` }} />
              <span style={{ fontSize: 22, color: GRAY, fontWeight: 600 }}>Confirmed by {story.signalCount} sources</span>
            </div>
            <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 6, background: color, borderRadius: '0 3px 3px 0', boxShadow: `0 0 15px ${color}60` }} />
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
}

/* ── SCORE REVEAL ── */
function ScoreReveal({ data }: { data: DailyScorecardData }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pulse = data.pulse;
  const pulseColor = pulse >= 70 ? GREEN : pulse >= 40 ? GOLD : RED_LIGHT;
  const isEarly = data.phase === 'early';
  const gaugeProgress = interpolate(frame, [10, 80], [0, pulse / 100], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const circumference = 2 * Math.PI * 160;
  const strokeDashoffset = circumference * (1 - gaugeProgress);
  const scoreScale = spring({ frame: Math.max(0, frame - 50), fps, from: 4, to: 1, config: { damping: 7, mass: 0.3 } });
  const scoreOpacity = interpolate(frame, [50, 55], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: DARK, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
      <div style={{ fontSize: 28, fontWeight: 800, color: GOLD, letterSpacing: 6, opacity: interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' }) }}>REPUBLIC SCORE</div>
      <div style={{ position: 'relative', width: 380, height: 380, marginTop: 10 }}>
        <svg width="380" height="380" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="190" cy="190" r="160" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="18" />
          <circle cx="190" cy="190" r="160" fill="none" stroke={pulseColor} strokeWidth="18" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 20px ${pulseColor}80)` }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ opacity: scoreOpacity, transform: `scale(${scoreScale})`, fontSize: isEarly ? 80 : 140, fontWeight: 900, color: WHITE, lineHeight: 1, textShadow: `0 0 40px ${pulseColor}50` }}>
            {isEarly ? Math.round(gaugeProgress * pulse) : data.grade}
          </div>
          <div style={{ fontSize: 22, color: GRAY, fontWeight: 700, marginTop: 4 }}>{isEarly ? 'EARLY PHASE' : 'GRADE'}</div>
        </div>
      </div>
      <div style={{ opacity: interpolate(frame, [70, 85], [0, 1], { extrapolateRight: 'clamp' }), display: 'flex', gap: 24, marginTop: 16 }}>
        {data.commitmentsMoved.confirms > 0 && (
          <div style={{ background: `${GREEN}15`, border: `2px solid ${GREEN}50`, borderRadius: 16, padding: '16px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: 52, fontWeight: 900, color: GREEN }}>+{data.commitmentsMoved.confirms}</div>
            <div style={{ fontSize: 20, color: GRAY, fontWeight: 600 }}>Progress</div>
          </div>
        )}
        {data.commitmentsMoved.contradicts > 0 && (
          <div style={{ background: `${RED_LIGHT}15`, border: `2px solid ${RED_LIGHT}50`, borderRadius: 16, padding: '16px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: 52, fontWeight: 900, color: RED_LIGHT }}>-{data.commitmentsMoved.contradicts}</div>
            <div style={{ fontSize: 20, color: GRAY, fontWeight: 600 }}>Concerning</div>
          </div>
        )}
      </div>
      <div style={{ opacity: interpolate(frame, [85, 100], [0, 1], { extrapolateRight: 'clamp' }), fontSize: 36, fontWeight: 800, color: WHITE, textAlign: 'center', lineHeight: 1.4, padding: '0 40px', marginTop: 10 }}>
        {data.commitmentsMoved.contradicts > data.commitmentsMoved.confirms
          ? '⚠️ Concerning day — government needs attention'
          : data.commitmentsMoved.confirms > 0
          ? '✅ Some progress — but still a long way to go'
          : '📋 Still in the early assessment phase'}
      </div>
    </AbsoluteFill>
  );
}

/* ── CTA ── */
function CTA({ data }: { data: DailyScorecardData }) {
  const frame = useCurrentFrame();
  const pmPhoto = staticFile('images/politicians/balen-shah.jpg');

  return (
    <AbsoluteFill style={{ background: DARK, opacity: interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' }), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '80px 40px' }}>
      <div style={{ width: 120, height: 120, borderRadius: 60, overflow: 'hidden', border: `3px solid ${RED}`, boxShadow: `0 0 30px ${RED}40` }}>
        <Img src={pmPhoto} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, fontWeight: 900, color: WHITE }}>Nepal Republic</div>
        <div style={{ fontSize: 22, color: GOLD, fontWeight: 700, marginTop: 4 }}>Nepal's First AI Government Tracker</div>
      </div>
      <div style={{ opacity: interpolate(frame, [15, 28], [0, 1], { extrapolateRight: 'clamp' }), background: `${RED}15`, border: `2px solid ${RED}50`, borderRadius: 20, padding: '24px 36px', textAlign: 'center', marginTop: 10 }}>
        <div style={{ fontSize: 38, fontWeight: 800, color: WHITE, lineHeight: 1.3 }}>How would you grade{'\n'}this government? 🗳️</div>
        <div style={{ fontSize: 22, color: GRAY, marginTop: 12 }}>Drop your score in comments 👇</div>
      </div>
      <div style={{ opacity: interpolate(frame, [35, 50], [0, 1], { extrapolateRight: 'clamp' }), display: 'flex', gap: 16, marginTop: 8 }}>
        {['🔔 Follow', '↗ Share', '💬 Comment'].map((label, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '10px 20px', fontSize: 20, fontWeight: 700, color: WHITE }}>{label}</div>
        ))}
      </div>
      <div style={{ opacity: interpolate(frame, [50, 65], [0, 1], { extrapolateRight: 'clamp' }), fontSize: 26, fontWeight: 700, color: GOLD, marginTop: 8 }}>nepalrepublic.org</div>
    </AbsoluteFill>
  );
}

export const DailyScorecardEN: React.FC<{ data: DailyScorecardData }> = ({ data }) => {
  return (
    <AbsoluteFill style={{ background: DARK, fontFamily: "'Inter', 'Noto Sans Devanagari', system-ui, sans-serif" }}>
      <Sequence from={0} durationInFrames={90}><Hook data={data} /></Sequence>
      <Sequence from={90} durationInFrames={105}><StatsFlash data={data} /></Sequence>
      <Sequence from={195} durationInFrames={350}><Headlines data={data} /></Sequence>
      <Sequence from={545} durationInFrames={205}><ScoreReveal data={data} /></Sequence>
      <Sequence from={750} durationInFrames={210}><CTA data={data} /></Sequence>
      <TopBar data={data} />
      <BottomBar />
    </AbsoluteFill>
  );
};
