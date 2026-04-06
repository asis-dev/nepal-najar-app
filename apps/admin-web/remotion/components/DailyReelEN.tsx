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
import type { DailyReelData } from '../types';

/* ══════════════════════════════════════════════
   DAILY REEL (ENGLISH) — 60s, zero dead time
   Same packed structure as Nepali, English text.
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
const statusColor = (s: string) =>
  s === 'delivered' ? GREEN : s === 'in_progress' ? '#06b6d4' : s === 'stalled' ? RED_LIGHT : GRAY;

function TopBar({ data }: { data: DailyReelData }) {
  const frame = useCurrentFrame();
  const blink = Math.sin(frame * 0.35) > 0;
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, background: RED, padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100, height: 56, background: `linear-gradient(90deg, ${RED}, ${BLUE})`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <span style={{ fontSize: 22, fontWeight: 900, color: WHITE, letterSpacing: 1 }}>NEPAL REPUBLIC</span>
      <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)' }}>|</span>
      <span style={{ fontSize: 18, fontWeight: 600, color: GOLD }}>AI GOVERNMENT TRACKER</span>
    </div>
  );
}

function Hook({ data }: { data: DailyReelData }) {
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
      </div>
    </AbsoluteFill>
  );
}

function StatsFlash({ data }: { data: DailyReelData }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const stats = [
    { value: data.stats.totalSignals, label: 'SIGNALS\nTRACKED', color: '#06b6d4' },
    { value: data.stats.sourcesActive, label: 'SOURCES\nSCANNED', color: GOLD },
    { value: data.stats.commitmentsTracked, label: 'PROMISES\nTRACKED', color: RED },
  ];
  const STAT_DUR = 25;

  return (
    <AbsoluteFill>
      {stats.map((stat, i) => {
        const start = i * STAT_DUR;
        const f = frame - start;
        if (f < -3 || f > STAT_DUR + 3) return null;
        const enter = interpolate(f, [0, 4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const exit = interpolate(f, [STAT_DUR - 4, STAT_DUR], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const numScale = spring({ frame: Math.max(0, f), fps, from: 2.5, to: 1, config: { damping: 8, mass: 0.3 } });
        const countProgress = interpolate(f, [2, 18], [0, 1], { extrapolateRight: 'clamp' });
        const displayVal = Math.round(countProgress * stat.value);
        return (
          <AbsoluteFill key={i} style={{ opacity: enter * exit, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: DARK }}>
            <div style={{ width: interpolate(f, [0, 8], [0, 800], { extrapolateRight: 'clamp' }), height: 6, background: stat.color, borderRadius: 3, marginBottom: 40, boxShadow: `0 0 20px ${stat.color}60` }} />
            <div style={{ transform: `scale(${numScale})`, fontSize: 180, fontWeight: 900, color: WHITE, lineHeight: 1, fontVariantNumeric: 'tabular-nums', textShadow: `0 0 60px ${stat.color}40` }}>{displayVal.toLocaleString()}</div>
            <div style={{ marginTop: 20, fontSize: 40, fontWeight: 800, color: stat.color, textAlign: 'center', lineHeight: 1.2, letterSpacing: 4 }}>{stat.label}</div>
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
}

function ImageStories({ data }: { data: DailyReelData }) {
  const frame = useCurrentFrame();
  const stories = data.topStories.slice(0, 3);
  const STORY_DUR = 145;

  return (
    <AbsoluteFill>
      {stories.map((story, i) => {
        const start = i * STORY_DUR;
        const f = frame - start;
        if (f < -5 || f > STORY_DUR + 5) return null;
        const enter = interpolate(f, [0, 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const exit = interpolate(f, [STORY_DUR - 8, STORY_DUR], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const title = story.title || story.titleNe;
        const color = sentimentColor(story.sentiment);
        const sentLabel = story.sentiment === 'positive' ? 'POSITIVE' : story.sentiment === 'negative' ? 'NEGATIVE' : story.sentiment === 'mixed' ? 'MIXED' : 'NEUTRAL';
        const imgScale = interpolate(f, [0, STORY_DUR], [1.05, 1.15], { extrapolateRight: 'clamp' });

        return (
          <AbsoluteFill key={i} style={{ opacity: enter * exit, background: DARK }}>
            {story.imageUrl && typeof story.imageUrl === 'string' && (
              <div style={{ position: 'absolute', top: 50, left: 0, right: 0, height: 700, overflow: 'hidden' }}>
                <Img src={staticFile(story.imageUrl)} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${imgScale})`, filter: 'brightness(0.5) contrast(1.2) saturate(1.3)' }} />
                <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, rgba(0,0,0,0.3) 0%, ${DARK} 90%)` }} />
              </div>
            )}
            <div style={{ position: 'absolute', top: story.imageUrl ? 80 : 120, left: 40, display: 'flex', alignItems: 'center', gap: 12, opacity: interpolate(f, [3, 10], [0, 1], { extrapolateRight: 'clamp' }) }}>
              <div style={{ background: color, borderRadius: 12, padding: '6px 18px', fontSize: 22, fontWeight: 900, color: DARK }}>#{i + 1}</div>
              <div style={{ background: `${color}30`, borderRadius: 10, padding: '6px 14px', fontSize: 20, fontWeight: 700, color }}>{sentLabel}</div>
            </div>
            <div style={{ position: 'absolute', top: story.imageUrl ? 680 : 400, left: 40, right: 40, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 48, fontWeight: 900, color: WHITE, lineHeight: 1.2, textShadow: '0 2px 12px rgba(0,0,0,0.8)', opacity: interpolate(f, [5, 14], [0, 1], { extrapolateRight: 'clamp' }), transform: `translateY(${interpolate(f, [5, 14], [40, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) })}px)` }}>
                {title}
              </div>
              {story.summary && (
                <div style={{ fontSize: 24, fontWeight: 500, color: 'rgba(255,255,255,0.7)', lineHeight: 1.4, opacity: interpolate(f, [20, 35], [0, 1], { extrapolateRight: 'clamp' }) }}>
                  {story.summary.slice(0, 140)}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: interpolate(f, [25, 40], [0, 1], { extrapolateRight: 'clamp' }) }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: color, boxShadow: `0 0 8px ${color}` }} />
                <span style={{ fontSize: 20, color: GRAY, fontWeight: 600 }}>{story.signalCount > 0 ? `Confirmed by ${story.signalCount} sources` : 'AI Analysis'}</span>
              </div>
            </div>
            <div style={{ position: 'absolute', left: 0, top: '25%', bottom: '25%', width: 6, background: color, borderRadius: '0 3px 3px 0', boxShadow: `0 0 15px ${color}60` }} />
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
}

function QuickHeadlines({ data }: { data: DailyReelData }) {
  const frame = useCurrentFrame();
  const stories = data.topStories.slice(3, 6);
  if (stories.length === 0) return null;
  const STORY_DUR = 60;

  return (
    <AbsoluteFill>
      {stories.map((story, i) => {
        const start = i * STORY_DUR;
        const f = frame - start;
        if (f < -3 || f > STORY_DUR + 3) return null;
        const enter = interpolate(f, [0, 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const exit = interpolate(f, [STORY_DUR - 6, STORY_DUR], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const title = story.title || story.titleNe;
        const color = sentimentColor(story.sentiment);
        return (
          <AbsoluteFill key={i} style={{ opacity: enter * exit, background: DARK, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '100px 50px 120px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{ background: color, borderRadius: 10, padding: '6px 16px', fontSize: 20, fontWeight: 900, color: DARK }}>#{i + 4}</div>
              <div style={{ flex: 1, height: 3, background: `${color}40`, borderRadius: 2 }} />
            </div>
            <div style={{ fontSize: 46, fontWeight: 900, color: WHITE, lineHeight: 1.25, transform: `translateX(${interpolate(f, [0, 8], [-40, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}px)` }}>
              {title}
            </div>
            <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 6, background: color, borderRadius: '0 3px 3px 0' }} />
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
}

function CommitmentTracker({ data }: { data: DailyReelData }) {
  const frame = useCurrentFrame();
  const { statusBreakdown: sb, topMovers } = data;
  const total = 109;
  const statusItems = [
    { label: 'In Progress', count: sb.inProgress, color: '#06b6d4', icon: '🔄' },
    { label: 'Delivered', count: sb.delivered, color: GREEN, icon: '✅' },
    { label: 'Stalled', count: sb.stalled, color: RED_LIGHT, icon: '⚠️' },
    { label: 'Not Started', count: sb.notStarted, color: GRAY, icon: '⏳' },
  ];

  return (
    <AbsoluteFill style={{ background: DARK }}>
      <Sequence from={0} durationInFrames={120}>
        <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 40px', gap: 20 }}>
          <div style={{ opacity: interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' }), fontSize: 34, fontWeight: 900, color: GOLD, letterSpacing: 4 }}>109 PROMISES</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 12, justifyContent: 'center' }}>
            {statusItems.map((item, i) => {
              const delay = i * 6;
              const itemOpacity = interpolate(frame, [15 + delay, 22 + delay], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
              const countProgress = interpolate(frame, [18 + delay, 50 + delay], [0, 1], { extrapolateRight: 'clamp' });
              return (
                <div key={i} style={{ opacity: itemOpacity, width: 460, background: `${item.color}10`, border: `2px solid ${item.color}40`, borderRadius: 20, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{ fontSize: 40 }}>{item.icon}</span>
                  <div>
                    <div style={{ fontSize: 56, fontWeight: 900, color: item.color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{Math.round(countProgress * item.count)}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: WHITE, opacity: 0.8 }}>{item.label}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', fontSize: 26, fontWeight: 800, color: `${item.color}cc` }}>{Math.round(item.count / total * 100)}%</div>
                </div>
              );
            })}
          </div>
        </AbsoluteFill>
      </Sequence>
      <Sequence from={120} durationInFrames={120}>
        {(() => {
          const f2 = frame - 120;
          return (
            <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', padding: '100px 50px 120px', gap: 14 }}>
              <div style={{ opacity: interpolate(f2, [0, 8], [0, 1], { extrapolateRight: 'clamp' }), fontSize: 32, fontWeight: 900, color: GOLD, letterSpacing: 3, marginBottom: 8 }}>📊 TOP MOVERS</div>
              {topMovers.slice(0, 4).map((mover, i) => {
                const delay = i * 10;
                const barOpacity = interpolate(f2, [8 + delay, 16 + delay], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
                const barWidth = interpolate(f2, [12 + delay, 50 + delay], [0, mover.progress], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
                const color = statusColor(mover.status);
                return (
                  <div key={i} style={{ opacity: barOpacity, marginBottom: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 26, fontWeight: 700, color: WHITE, flex: 1 }}>{mover.title || mover.titleNe}</span>
                      <span style={{ fontSize: 30, fontWeight: 900, color, marginLeft: 12 }}>{Math.round(barWidth)}%</span>
                    </div>
                    <div style={{ height: 20, background: 'rgba(255,255,255,0.08)', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ width: `${barWidth}%`, height: '100%', background: `linear-gradient(90deg, ${color}, ${color}cc)`, borderRadius: 10, boxShadow: `0 0 10px ${color}40` }} />
                    </div>
                  </div>
                );
              })}
            </AbsoluteFill>
          );
        })()}
      </Sequence>
    </AbsoluteFill>
  );
}

function MinisterSpotlight({ data }: { data: DailyReelData }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pmPhoto = staticFile('images/politicians/balen-shah.jpg');
  const photoScale = spring({ frame, fps, from: 1.3, to: 1, config: { damping: 10, mass: 0.4 } });
  const headline = data.topStories[0]?.title || '';

  return (
    <AbsoluteFill style={{ background: DARK }}>
      <div style={{ position: 'absolute', top: 50, left: 0, right: 0, height: 620, overflow: 'hidden' }}>
        <div style={{ transform: `scale(${photoScale})`, width: '100%', height: '100%' }}>
          <Img src={pmPhoto} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 15%', filter: 'brightness(0.6) contrast(1.3)' }} />
        </div>
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, transparent 30%, ${DARK} 100%)` }} />
        <div style={{ position: 'absolute', top: 80, right: 30, opacity: interpolate(frame, [5, 12], [0, 1], { extrapolateRight: 'clamp' }), transform: 'rotate(-5deg)', background: RED, borderRadius: 8, padding: '8px 20px' }}>
          <span style={{ fontSize: 22, fontWeight: 900, color: WHITE, letterSpacing: 2 }}>🎯 WHO IS ACCOUNTABLE?</span>
        </div>
      </div>
      <div style={{ position: 'absolute', top: 620, left: 0, right: 0, bottom: 56, display: 'flex', flexDirection: 'column', padding: '24px 50px', gap: 12 }}>
        <div style={{ opacity: interpolate(frame, [8, 16], [0, 1], { extrapolateRight: 'clamp' }) }}>
          <div style={{ fontSize: 48, fontWeight: 900, color: WHITE }}>{data.minister.name}</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: GOLD, marginTop: 2 }}>{data.minister.role}</div>
        </div>
        <div style={{ opacity: interpolate(frame, [18, 26], [0, 1], { extrapolateRight: 'clamp' }), display: 'flex', gap: 16, marginTop: 4 }}>
          <div style={{ background: `${GREEN}15`, border: `2px solid ${GREEN}40`, borderRadius: 14, padding: '14px 20px', textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: 44, fontWeight: 900, color: GREEN }}>{data.statusBreakdown.inProgress}</div>
            <div style={{ fontSize: 18, color: GRAY, fontWeight: 600 }}>In Progress</div>
          </div>
          <div style={{ background: `${RED_LIGHT}15`, border: `2px solid ${RED_LIGHT}40`, borderRadius: 14, padding: '14px 20px', textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: 44, fontWeight: 900, color: RED_LIGHT }}>{data.statusBreakdown.stalled}</div>
            <div style={{ fontSize: 18, color: GRAY, fontWeight: 600 }}>Stalled</div>
          </div>
          <div style={{ background: `${GOLD}15`, border: `2px solid ${GOLD}40`, borderRadius: 14, padding: '14px 20px', textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: 44, fontWeight: 900, color: GOLD }}>{data.statusBreakdown.delivered}</div>
            <div style={{ fontSize: 18, color: GRAY, fontWeight: 600 }}>Delivered</div>
          </div>
        </div>
        {headline && (
          <div style={{ opacity: interpolate(frame, [35, 48], [0, 1], { extrapolateRight: 'clamp' }), background: 'rgba(255,255,255,0.05)', borderLeft: `4px solid ${RED}`, borderRadius: 8, padding: '14px 20px', marginTop: 4 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: RED, marginBottom: 2 }}>TODAY'S HEADLINE</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: WHITE, lineHeight: 1.3 }}>{headline.slice(0, 80)}</div>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
}

function ScoreReveal({ data }: { data: DailyReelData }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pulse = data.pulse;
  const pulseColor = pulse >= 70 ? GREEN : pulse >= 40 ? GOLD : RED_LIGHT;
  const isEarly = data.phase === 'early';
  const gaugeProgress = interpolate(frame, [10, 100], [0, pulse / 100], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const circumference = 2 * Math.PI * 160;
  const strokeDashoffset = circumference * (1 - gaugeProgress);
  const scoreScale = spring({ frame: Math.max(0, frame - 60), fps, from: 4, to: 1, config: { damping: 7, mass: 0.3 } });
  const scoreOpacity = interpolate(frame, [60, 66], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: DARK, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={{ fontSize: 28, fontWeight: 800, color: GOLD, letterSpacing: 6, opacity: interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' }) }}>REPUBLIC SCORE</div>
      <div style={{ position: 'relative', width: 360, height: 360, marginTop: 6 }}>
        <svg width="360" height="360" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="180" cy="180" r="160" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="18" />
          <circle cx="180" cy="180" r="160" fill="none" stroke={pulseColor} strokeWidth="18" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 20px ${pulseColor}80)` }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ opacity: scoreOpacity, transform: `scale(${scoreScale})`, fontSize: isEarly ? 80 : 140, fontWeight: 900, color: WHITE, lineHeight: 1, textShadow: `0 0 40px ${pulseColor}50` }}>
            {isEarly ? Math.round(gaugeProgress * pulse) : data.grade}
          </div>
          <div style={{ fontSize: 22, color: GRAY, fontWeight: 700, marginTop: 4 }}>{isEarly ? 'EARLY PHASE' : 'GRADE'}</div>
        </div>
      </div>
      <div style={{ opacity: interpolate(frame, [80, 95], [0, 1], { extrapolateRight: 'clamp' }), display: 'flex', gap: 24, marginTop: 8 }}>
        {data.commitmentsMoved.confirms > 0 && (
          <div style={{ background: `${GREEN}15`, border: `2px solid ${GREEN}50`, borderRadius: 14, padding: '14px 28px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, fontWeight: 900, color: GREEN }}>+{data.commitmentsMoved.confirms}</div>
            <div style={{ fontSize: 20, color: GRAY, fontWeight: 600 }}>Progress</div>
          </div>
        )}
        {data.commitmentsMoved.contradicts > 0 && (
          <div style={{ background: `${RED_LIGHT}15`, border: `2px solid ${RED_LIGHT}50`, borderRadius: 14, padding: '14px 28px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, fontWeight: 900, color: RED_LIGHT }}>-{data.commitmentsMoved.contradicts}</div>
            <div style={{ fontSize: 20, color: GRAY, fontWeight: 600 }}>Concerning</div>
          </div>
        )}
      </div>
      <div style={{ opacity: interpolate(frame, [100, 120], [0, 1], { extrapolateRight: 'clamp' }), fontSize: 34, fontWeight: 800, color: WHITE, textAlign: 'center', lineHeight: 1.4, padding: '0 40px', marginTop: 6 }}>
        {data.commitmentsMoved.contradicts > data.commitmentsMoved.confirms ? '⚠️ Concerning day' : data.commitmentsMoved.confirms > 0 ? '✅ Some progress — long way to go' : '📋 Early assessment phase'}
      </div>
    </AbsoluteFill>
  );
}

function CTA({ data }: { data: DailyReelData }) {
  const frame = useCurrentFrame();
  const pmPhoto = staticFile('images/politicians/balen-shah.jpg');
  return (
    <AbsoluteFill style={{ background: DARK, opacity: interpolate(frame, [0, 6], [0, 1], { extrapolateRight: 'clamp' }), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '80px 40px' }}>
      <div style={{ width: 110, height: 110, borderRadius: 55, overflow: 'hidden', border: `3px solid ${RED}`, boxShadow: `0 0 30px ${RED}40` }}>
        <Img src={pmPhoto} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 44, fontWeight: 900, color: WHITE }}>Nepal Republic</div>
        <div style={{ fontSize: 22, color: GOLD, fontWeight: 700, marginTop: 4 }}>Nepal's First AI Government Tracker</div>
      </div>
      <div style={{ opacity: interpolate(frame, [12, 22], [0, 1], { extrapolateRight: 'clamp' }), background: `${RED}15`, border: `2px solid ${RED}50`, borderRadius: 20, padding: '20px 32px', textAlign: 'center', marginTop: 6 }}>
        <div style={{ fontSize: 36, fontWeight: 800, color: WHITE, lineHeight: 1.3 }}>How would you grade{'\n'}this government? 🗳️</div>
        <div style={{ fontSize: 22, color: GRAY, marginTop: 10 }}>Drop your score in comments 👇</div>
      </div>
      <div style={{ opacity: interpolate(frame, [30, 42], [0, 1], { extrapolateRight: 'clamp' }), display: 'flex', gap: 14, marginTop: 6 }}>
        {['🔔 Follow', '↗ Share', '💬 Comment'].map((label, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '10px 18px', fontSize: 20, fontWeight: 700, color: WHITE }}>{label}</div>
        ))}
      </div>
      <div style={{ opacity: interpolate(frame, [45, 55], [0, 1], { extrapolateRight: 'clamp' }), fontSize: 26, fontWeight: 700, color: GOLD, marginTop: 6 }}>nepalrepublic.org</div>
    </AbsoluteFill>
  );
}

export const DailyReelEN: React.FC<{ data: DailyReelData }> = ({ data }) => {
  return (
    <AbsoluteFill style={{ background: DARK, fontFamily: "'Inter', 'Noto Sans Devanagari', system-ui, sans-serif" }}>
      <Sequence from={0} durationInFrames={90}><Hook data={data} /></Sequence>
      <Sequence from={90} durationInFrames={75}><StatsFlash data={data} /></Sequence>
      <Sequence from={165} durationInFrames={435}><ImageStories data={data} /></Sequence>
      <Sequence from={600} durationInFrames={180}><QuickHeadlines data={data} /></Sequence>
      <Sequence from={780} durationInFrames={240}><CommitmentTracker data={data} /></Sequence>
      <Sequence from={1020} durationInFrames={240}><MinisterSpotlight data={data} /></Sequence>
      <Sequence from={1260} durationInFrames={300}><ScoreReveal data={data} /></Sequence>
      <Sequence from={1560} durationInFrames={240}><CTA data={data} /></Sequence>
      <TopBar data={data} />
      <BottomBar />
    </AbsoluteFill>
  );
};
