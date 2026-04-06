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
   VIRAL REEL — Political news TikTok style
   Design rules:
   - Frame 0 MUST have face + text visible
   - Minimum text size 44px
   - Fill the screen, zero dead space
   - Bold colors, high contrast
   - Story readable without sound
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

/* ── Breaking News Top Bar (persistent) ── */
function TopBar({ data }: { data: DailyScorecardData }) {
  const frame = useCurrentFrame();
  const blink = Math.sin(frame * 0.35) > 0;

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
      background: RED,
      padding: '14px 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 12, height: 12, borderRadius: 6,
          background: WHITE, opacity: blink ? 1 : 0.3,
        }} />
        <span style={{ fontSize: 20, fontWeight: 900, color: WHITE, letterSpacing: 3 }}>
          LIVE
        </span>
      </div>
      <span style={{ fontSize: 18, fontWeight: 700, color: WHITE, opacity: 0.9 }}>
        DAY {data.dayNumber}
      </span>
      <span style={{ fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
        nepalrepublic.org
      </span>
    </div>
  );
}

/* ── Bottom brand bar (persistent) ── */
function BottomBar() {
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100,
      height: 56,
      background: `linear-gradient(90deg, ${RED}, ${BLUE})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
    }}>
      <span style={{ fontSize: 22, fontWeight: 900, color: WHITE, letterSpacing: 1 }}>
        NEPAL REPUBLIC
      </span>
      <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)' }}>|</span>
      <span style={{ fontSize: 18, fontWeight: 600, color: GOLD }}>
        AI GOVERNMENT TRACKER
      </span>
    </div>
  );
}

/* ══════════════════════════════════════════════
   HOOK (0-3s): Face + provocative question
   THE SCROLL STOPPER — no fade-in, instant
   ══════════════════════════════════════════════ */
function Hook({ data }: { data: DailyScorecardData }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pmPhoto = staticFile('images/politicians/balen-shah.jpg');

  // Text slam — spring from big to normal
  const textScale = spring({ frame: Math.max(0, frame - 5), fps, from: 1.4, to: 1, config: { damping: 9, mass: 0.3 } });
  const textOpacity = interpolate(frame, [5, 10], [0, 1], { extrapolateRight: 'clamp' });

  // Day counter counts up fast
  const dayProgress = interpolate(frame, [10, 30], [0, 1], { extrapolateRight: 'clamp' });
  const displayDay = Math.round(dayProgress * data.dayNumber);

  return (
    <AbsoluteFill>
      {/* PM Photo — fills top 45% of screen, visible from FRAME 0 */}
      <div style={{
        position: 'absolute', top: 50, left: 0, right: 0,
        height: 750,
        overflow: 'hidden',
      }}>
        <Img src={pmPhoto} style={{
          width: '100%', height: '100%',
          objectFit: 'cover', objectPosition: 'center 20%',
          filter: 'brightness(0.7) contrast(1.2)',
        }} />
        {/* Gradient overlay for text readability */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.1) 40%, ${DARK} 95%)`,
        }} />

        {/* Name + role overlay on photo */}
        <div style={{
          position: 'absolute', bottom: 120, left: 40, right: 40,
        }}>
          <div style={{
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            borderLeft: `4px solid ${RED}`,
            borderRadius: 8,
            padding: '12px 20px',
            display: 'inline-flex', flexDirection: 'column',
          }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: WHITE }}>
              PM बालेन शाह
            </span>
            <span style={{ fontSize: 18, color: GOLD, fontWeight: 600 }}>
              प्रधानमन्त्री • RSP
            </span>
          </div>
        </div>
      </div>

      {/* Bottom half: Day counter + question */}
      <div style={{
        position: 'absolute', bottom: 80, left: 0, right: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 16,
        padding: '0 40px',
      }}>
        {/* DAY counter — big and bold */}
        <div style={{
          display: 'flex', alignItems: 'baseline', gap: 8,
          opacity: interpolate(frame, [3, 8], [0, 1], { extrapolateRight: 'clamp' }),
        }}>
          <span style={{
            fontSize: 160, fontWeight: 900, color: WHITE,
            lineHeight: 1, fontVariantNumeric: 'tabular-nums',
            textShadow: `0 0 40px ${RED}60`,
          }}>
            {displayDay}
          </span>
          <span style={{
            fontSize: 56, fontWeight: 800, color: RED,
          }}>
            दिन
          </span>
        </div>

        {/* Provocative question — slams in */}
        <div style={{
          opacity: textOpacity,
          transform: `scale(${textScale})`,
          fontSize: 52, fontWeight: 900, color: WHITE,
          textAlign: 'center', lineHeight: 1.25,
          textShadow: '0 4px 20px rgba(0,0,0,0.8)',
        }}>
          सरकारले आज{'\n'}के गर्यो? 🤔
        </div>

        {/* Swipe up hint */}
        <div style={{
          opacity: interpolate(frame, [40, 55], [0, 1], { extrapolateRight: 'clamp' }),
          fontSize: 20, color: GRAY, fontWeight: 600,
        }}>
          हेर्नुहोस् 👇
        </div>
      </div>
    </AbsoluteFill>
  );
}

/* ══════════════════════════════════════════════
   STATS FLASH (3-6.5s): Fast counter reveal
   Numbers fill the screen, no tiny cards
   ══════════════════════════════════════════════ */
function StatsFlash({ data }: { data: DailyScorecardData }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Show one stat at a time, full screen
  const stats = [
    { value: data.stats.totalSignals, label: 'SIGNALS\nTRACKED', labelNe: 'संकेत ट्र्याक', color: '#06b6d4' },
    { value: data.stats.sourcesActive, label: 'SOURCES\nSCANNED', labelNe: 'स्रोत स्क्यान', color: GOLD },
    { value: data.stats.commitmentsTracked, label: 'PROMISES\nWATCHED', labelNe: 'प्रतिबद्धता', color: RED },
  ];

  const STAT_DUR = 35; // ~1.2s per stat

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
          <AbsoluteFill key={i} style={{
            opacity: enter * exit,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: DARK,
          }}>
            {/* Colored accent bar */}
            <div style={{
              width: interpolate(f, [0, 10], [0, 800], { extrapolateRight: 'clamp' }),
              height: 6, background: stat.color, borderRadius: 3,
              marginBottom: 40, boxShadow: `0 0 20px ${stat.color}60`,
            }} />

            {/* Giant number */}
            <div style={{
              transform: `scale(${numScale})`,
              fontSize: 180, fontWeight: 900, color: WHITE,
              lineHeight: 1, fontVariantNumeric: 'tabular-nums',
              textShadow: `0 0 60px ${stat.color}40`,
            }}>
              {displayVal.toLocaleString()}
            </div>

            {/* Label */}
            <div style={{
              marginTop: 20,
              fontSize: 40, fontWeight: 800, color: stat.color,
              textAlign: 'center', lineHeight: 1.2,
              letterSpacing: 4,
              opacity: interpolate(f, [8, 16], [0, 1], { extrapolateRight: 'clamp' }),
            }}>
              {stat.label}
            </div>

            {/* Nepali label */}
            <div style={{
              marginTop: 12,
              fontSize: 30, fontWeight: 600, color: GRAY,
              opacity: interpolate(f, [12, 20], [0, 1], { extrapolateRight: 'clamp' }),
            }}>
              {stat.labelNe}
            </div>
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
}

/* ══════════════════════════════════════════════
   HEADLINES (6.5-18s): Full-screen one at a time
   Big text, sentiment color block, no tiny cards
   ══════════════════════════════════════════════ */
function Headlines({ data }: { data: DailyScorecardData }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const stories = data.topStories.slice(0, 5);
  const STORY_DUR = 70; // ~2.3s per story

  return (
    <AbsoluteFill>
      {stories.map((story, i) => {
        const start = i * STORY_DUR;
        const f = frame - start;
        if (f < -5 || f > STORY_DUR + 5) return null;

        const enter = interpolate(f, [0, 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const exit = interpolate(f, [STORY_DUR - 8, STORY_DUR], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const slideY = interpolate(f, [0, 10], [60, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });

        const title = story.titleNe || story.title;
        const color = sentimentColor(story.sentiment);
        const sentLabel = story.sentiment === 'positive' ? 'सकारात्मक' : story.sentiment === 'negative' ? 'नकारात्मक' : story.sentiment === 'mixed' ? 'मिश्रित' : 'तटस्थ';

        return (
          <AbsoluteFill key={i} style={{
            opacity: enter * exit,
            background: DARK,
            display: 'flex', flexDirection: 'column',
            justifyContent: 'center',
            padding: '100px 50px 120px',
          }}>
            {/* Story number + colored bar */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 16,
              marginBottom: 30,
            }}>
              <div style={{
                background: color,
                borderRadius: 12,
                padding: '8px 20px',
                fontSize: 24, fontWeight: 900, color: DARK,
              }}>
                #{i + 1}
              </div>
              <div style={{
                background: `${color}25`,
                borderRadius: 10,
                padding: '8px 18px',
                fontSize: 22, fontWeight: 700, color,
              }}>
                {sentLabel}
              </div>
              <div style={{ flex: 1, height: 3, background: `${color}40`, borderRadius: 2 }} />
            </div>

            {/* Headline — BIG */}
            <div style={{
              transform: `translateY(${slideY}px)`,
              fontSize: 56, fontWeight: 900, color: WHITE,
              lineHeight: 1.25,
              textShadow: '0 2px 10px rgba(0,0,0,0.5)',
            }}>
              {title}
            </div>

            {/* Source count */}
            <div style={{
              marginTop: 30,
              opacity: interpolate(f, [15, 25], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: 4,
                background: color, boxShadow: `0 0 8px ${color}`,
              }} />
              <span style={{ fontSize: 22, color: GRAY, fontWeight: 600 }}>
                {story.signalCount} स्रोतबाट पुष्टि
              </span>
            </div>

            {/* Left accent bar */}
            <div style={{
              position: 'absolute', left: 0, top: '20%', bottom: '20%',
              width: 6, background: color,
              borderRadius: '0 3px 3px 0',
              boxShadow: `0 0 15px ${color}60`,
            }} />
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
}

/* ══════════════════════════════════════════════
   SCORE REVEAL (18-25s): Dramatic score
   ══════════════════════════════════════════════ */
function ScoreReveal({ data }: { data: DailyScorecardData }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pulse = data.pulse;
  const pulseColor = pulse >= 70 ? GREEN : pulse >= 40 ? GOLD : RED_LIGHT;
  const isEarly = data.phase === 'early';

  // Gauge fills up
  const gaugeProgress = interpolate(frame, [10, 80], [0, pulse / 100], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const circumference = 2 * Math.PI * 160;
  const strokeDashoffset = circumference * (1 - gaugeProgress);

  // Score slams in
  const scoreScale = spring({ frame: Math.max(0, frame - 50), fps, from: 4, to: 1, config: { damping: 7, mass: 0.3 } });
  const scoreOpacity = interpolate(frame, [50, 55], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{
      background: DARK,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 20,
    }}>
      {/* Label */}
      <div style={{
        fontSize: 28, fontWeight: 800, color: GOLD, letterSpacing: 6,
        opacity: interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' }),
      }}>
        REPUBLIC SCORE
      </div>

      {/* Circular gauge — large */}
      <div style={{ position: 'relative', width: 380, height: 380, marginTop: 10 }}>
        <svg width="380" height="380" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="190" cy="190" r="160" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="18" />
          <circle
            cx="190" cy="190" r="160" fill="none"
            stroke={pulseColor}
            strokeWidth="18"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 20px ${pulseColor}80)` }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            opacity: scoreOpacity, transform: `scale(${scoreScale})`,
            fontSize: isEarly ? 80 : 140, fontWeight: 900, color: WHITE,
            lineHeight: 1, textShadow: `0 0 40px ${pulseColor}50`,
          }}>
            {isEarly ? Math.round(gaugeProgress * pulse) : data.grade}
          </div>
          <div style={{ fontSize: 22, color: GRAY, fontWeight: 700, marginTop: 4 }}>
            {isEarly ? 'EARLY PHASE' : 'GRADE'}
          </div>
        </div>
      </div>

      {/* Movement stats */}
      <div style={{
        opacity: interpolate(frame, [70, 85], [0, 1], { extrapolateRight: 'clamp' }),
        display: 'flex', gap: 24, marginTop: 16,
      }}>
        {data.commitmentsMoved.confirms > 0 && (
          <div style={{
            background: `${GREEN}15`, border: `2px solid ${GREEN}50`,
            borderRadius: 16, padding: '16px 32px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 52, fontWeight: 900, color: GREEN }}>+{data.commitmentsMoved.confirms}</div>
            <div style={{ fontSize: 20, color: GRAY, fontWeight: 600 }}>प्रगतिमा</div>
          </div>
        )}
        {data.commitmentsMoved.contradicts > 0 && (
          <div style={{
            background: `${RED_LIGHT}15`, border: `2px solid ${RED_LIGHT}50`,
            borderRadius: 16, padding: '16px 32px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 52, fontWeight: 900, color: RED_LIGHT }}>-{data.commitmentsMoved.contradicts}</div>
            <div style={{ fontSize: 20, color: GRAY, fontWeight: 600 }}>चिन्ताजनक</div>
          </div>
        )}
      </div>

      {/* Verdict text */}
      <div style={{
        opacity: interpolate(frame, [85, 100], [0, 1], { extrapolateRight: 'clamp' }),
        fontSize: 36, fontWeight: 800, color: WHITE,
        textAlign: 'center', lineHeight: 1.4,
        padding: '0 40px', marginTop: 10,
      }}>
        {data.commitmentsMoved.contradicts > data.commitmentsMoved.confirms
          ? '⚠️ चिन्ताजनक दिन — सरकारलाई ध्यान दिनुपर्छ'
          : data.commitmentsMoved.confirms > 0
          ? '✅ केही प्रगति — तर अझै धेरै बाँकी छ'
          : '📋 अझै प्रारम्भिक चरणमा'}
      </div>
    </AbsoluteFill>
  );
}

/* ══════════════════════════════════════════════
   CTA (25-32s): Engagement ending
   ══════════════════════════════════════════════ */
function CTA({ data }: { data: DailyScorecardData }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pmPhoto = staticFile('images/politicians/balen-shah.jpg');
  const mainOpacity = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{
      background: DARK,
      opacity: mainOpacity,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 20, padding: '80px 40px',
    }}>
      {/* Small PM photo */}
      <div style={{
        width: 120, height: 120, borderRadius: 60,
        overflow: 'hidden', border: `3px solid ${RED}`,
        boxShadow: `0 0 30px ${RED}40`,
      }}>
        <Img src={pmPhoto} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>

      {/* Brand */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, fontWeight: 900, color: WHITE }}>
          नेपाल रिपब्लिक
        </div>
        <div style={{ fontSize: 24, color: GOLD, fontWeight: 700, marginTop: 4 }}>
          Nepal Republic
        </div>
      </div>

      {/* Engagement question */}
      <div style={{
        opacity: interpolate(frame, [15, 28], [0, 1], { extrapolateRight: 'clamp' }),
        background: `${RED}15`,
        border: `2px solid ${RED}50`,
        borderRadius: 20,
        padding: '24px 36px',
        textAlign: 'center',
        marginTop: 10,
      }}>
        <div style={{ fontSize: 38, fontWeight: 800, color: WHITE, lineHeight: 1.3 }}>
          सरकारलाई कति अंक{'\n'}दिनुहुन्छ? 🗳️
        </div>
        <div style={{ fontSize: 22, color: GRAY, marginTop: 12 }}>
          कमेन्टमा भन्नुहोस् 👇
        </div>
      </div>

      {/* Action buttons */}
      <div style={{
        opacity: interpolate(frame, [35, 50], [0, 1], { extrapolateRight: 'clamp' }),
        display: 'flex', gap: 16, marginTop: 8,
      }}>
        {['🔔 फलो', '↗ शेयर', '💬 कमेन्ट'].map((label, i) => (
          <div key={i} style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 12,
            padding: '10px 20px',
            fontSize: 20, fontWeight: 700, color: WHITE,
          }}>
            {label}
          </div>
        ))}
      </div>

      {/* URL */}
      <div style={{
        opacity: interpolate(frame, [50, 65], [0, 1], { extrapolateRight: 'clamp' }),
        fontSize: 26, fontWeight: 700, color: GOLD, marginTop: 8,
      }}>
        nepalrepublic.org
      </div>
    </AbsoluteFill>
  );
}

/* ══════════════════════════════════════════════
   MAIN COMPOSITION
   ══════════════════════════════════════════════ */
export const DailyScorecard: React.FC<{ data: DailyScorecardData }> = ({ data }) => {
  return (
    <AbsoluteFill style={{
      background: DARK,
      fontFamily: "'Noto Sans Devanagari', 'Inter', system-ui, sans-serif",
    }}>
      {/* Hook: 0-3s (0-90) */}
      <Sequence from={0} durationInFrames={90}>
        <Hook data={data} />
      </Sequence>

      {/* Stats flash: 3-6.5s (90-195) */}
      <Sequence from={90} durationInFrames={105}>
        <StatsFlash data={data} />
      </Sequence>

      {/* Headlines: 6.5-18s (195-545) — 5 stories × 70 frames */}
      <Sequence from={195} durationInFrames={350}>
        <Headlines data={data} />
      </Sequence>

      {/* Score: 18-25s (545-750) */}
      <Sequence from={545} durationInFrames={205}>
        <ScoreReveal data={data} />
      </Sequence>

      {/* CTA: 25-32s (750-960) */}
      <Sequence from={750} durationInFrames={210}>
        <CTA data={data} />
      </Sequence>

      {/* Persistent top bar */}
      <TopBar data={data} />

      {/* Persistent bottom bar */}
      <BottomBar />
    </AbsoluteFill>
  );
};
