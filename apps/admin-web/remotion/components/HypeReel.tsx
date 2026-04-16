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
import type { HypeReelData } from '../types';

/* ══════════════════════════════════════════════════════════════
   HYPE REEL — 15s viral short-form video

   ONE trending story. Maximum drama. Comment bait.
   Designed for Facebook Reels / TikTok / YouTube Shorts.

   Timeline (450 frames @ 30fps):
   0-2.5s   (0-75)      HOOK — explosive headline, red flash, shake
   2.5-6s   (75-180)     FACTS — 2-3 rapid-fire fact slams
   6-9.5s   (180-285)    GRADE — letter grade dramatic reveal
   9.5-12s  (285-360)    QUESTION — comment bait, provocative
   12-15s   (360-450)    CTA — follow + branding
   ══════════════════════════════════════════════════════════════ */

const RED = '#DC143C';
const BLUE = '#003893';
const DARK = '#08080f';
const WHITE = '#ffffff';
const GOLD = '#fbbf24';
const GREEN = '#22c55e';
const RED_LIGHT = '#ef4444';
const CYAN = '#06b6d4';

const categoryAccent = (cat: HypeReelData['category']) => {
  switch (cat) {
    case 'breaking': return RED;
    case 'scandal': return '#f97316';
    case 'progress': return GREEN;
    case 'failure': return RED_LIGHT;
    case 'milestone': return GOLD;
    default: return RED;
  }
};

const categoryLabel = (cat: HypeReelData['category']) => {
  switch (cat) {
    case 'breaking': return 'BREAKING';
    case 'scandal': return 'SCANDAL';
    case 'progress': return 'PROGRESS';
    case 'failure': return 'FAILURE';
    case 'milestone': return 'MILESTONE';
    default: return 'UPDATE';
  }
};

const categoryLabelNe = (cat: HypeReelData['category']) => {
  switch (cat) {
    case 'breaking': return 'ब्रेकिङ';
    case 'scandal': return 'विवाद';
    case 'progress': return 'प्रगति';
    case 'failure': return 'असफलता';
    case 'milestone': return 'उपलब्धि';
    default: return 'अपडेट';
  }
};

const gradeColor = (grade: string) => {
  if (grade === 'A' || grade === 'A+') return GREEN;
  if (grade === 'B' || grade === 'B+' || grade === 'B-') return CYAN;
  if (grade === 'C' || grade === 'C+' || grade === 'C-') return GOLD;
  if (grade === 'D' || grade === 'D+' || grade === 'D-') return '#f97316';
  return RED_LIGHT; // F
};

/* ── Persistent top ticker ── */
function TopTicker({ data }: { data: HypeReelData }) {
  const frame = useCurrentFrame();
  const accent = categoryAccent(data.category);
  const opacity = interpolate(frame, [8, 15], [0, 1], { extrapolateRight: 'clamp' });
  const blink = Math.sin(frame * 0.4) > 0;

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 200,
      opacity,
      background: `linear-gradient(90deg, ${accent}, ${accent}cc)`,
      padding: '12px 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 10, height: 10, borderRadius: 5,
          background: WHITE, opacity: blink ? 1 : 0.3,
          boxShadow: blink ? '0 0 8px white' : 'none',
        }} />
        <span style={{ fontSize: 18, fontWeight: 900, color: WHITE, letterSpacing: 3 }}>
          {categoryLabel(data.category)}
        </span>
      </div>
      <span style={{ fontSize: 16, fontWeight: 700, color: WHITE }}>
        DAY {data.dayNumber}
      </span>
    </div>
  );
}

/* ── Persistent bottom bar ── */
function BottomBar() {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [10, 18], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 200,
      opacity,
      height: 52,
      background: `linear-gradient(90deg, ${DARK}, ${RED}40, ${BLUE}40, ${DARK})`,
      borderTop: `2px solid ${RED}60`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
    }}>
      <span style={{ fontSize: 18, fontWeight: 900, color: WHITE, letterSpacing: 2 }}>
        NEPAL REPUBLIC
      </span>
      <span style={{ fontSize: 14, color: GOLD, fontWeight: 700 }}>
        nepalrepublic.org
      </span>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   SECTION 1: HOOK (0-2.5s, frames 0-75)

   TACTIC: Face-first. Frame 0 already shows a face.
   When someone scrolls Facebook, they see:
   - A real person's face (STOPS the scroll)
   - Bold text on top of the face (they READ it)
   - Slow zoom = motion = algorithm knows it's video

   NO fade-in. NO flash. The face is THERE from frame 0.
   ══════════════════════════════════════════════════ */
function HookSection({ data }: { data: HypeReelData }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const accent = categoryAccent(data.category);

  // Face image — default to PM Balen Shah
  const faceImg = staticFile(data.hook.faceImage || 'images/politicians/balen-shah.jpg');

  // Slow cinematic zoom on the face (Ken Burns) — STARTS from frame 0
  const faceZoom = interpolate(frame, [0, 75], [1.0, 1.12], { extrapolateRight: 'clamp' });

  // Headline slams in at frame 3 (not 0 — give 0.1s for face to register)
  const headlineScale = spring({
    frame: Math.max(0, frame - 3),
    fps,
    from: 1.8, to: 1,
    config: { damping: 7, mass: 0.2 },
  });
  const headlineOpacity = interpolate(frame, [3, 8], [0, 1], { extrapolateRight: 'clamp' });

  // Category badge — appears with headline
  const badgeOpacity = interpolate(frame, [1, 5], [0, 1], { extrapolateRight: 'clamp' });
  const badgeSlide = interpolate(frame, [1, 5], [-20, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  // Person name tag — slides in from left
  const nameOpacity = interpolate(frame, [12, 18], [0, 1], { extrapolateRight: 'clamp' });
  const nameSlide = interpolate(frame, [12, 18], [-30, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  // English subtitle fades in
  const enOpacity = interpolate(frame, [25, 35], [0, 1], { extrapolateRight: 'clamp' });

  // Day badge
  const dayOpacity = interpolate(frame, [5, 10], [0, 1], { extrapolateRight: 'clamp' });

  const faceName = data.hook.faceName || 'PM Balen Shah';
  const faceNameNe = data.hook.faceNameNe || 'प्रम बालेन शाह';
  const faceRole = data.hook.faceRole || '';

  return (
    <AbsoluteFill>
      {/* ── FACE — full screen, visible from FRAME 0 ── */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <Img
          src={faceImg}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center 15%',
            filter: 'brightness(0.45) contrast(1.3) saturate(1.1)',
            transform: `scale(${faceZoom})`,
          }}
        />
        {/* Dark gradient overlays — keep face visible but text readable */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 25%, rgba(0,0,0,0.2) 50%, ${DARK} 88%)`,
        }} />
        {/* Accent color tint */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(135deg, ${accent}20 0%, transparent 50%)`,
        }} />
      </div>

      {/* ── Category badge — top left ── */}
      <div style={{
        position: 'absolute', top: 80, left: 30,
        opacity: badgeOpacity,
        transform: `translateY(${badgeSlide}px)`,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: `${accent}dd`,
          borderRadius: 10,
          padding: '8px 20px',
          boxShadow: `0 4px 20px ${accent}50`,
        }}>
          <span style={{ fontSize: 22 }}>{data.hook.emoji}</span>
          <span style={{
            fontSize: 18, fontWeight: 900, color: WHITE,
            letterSpacing: 3, textTransform: 'uppercase',
          }}>
            {categoryLabel(data.category)}
          </span>
        </div>
      </div>

      {/* ── Day counter — top right ── */}
      <div style={{
        position: 'absolute', top: 80, right: 30,
        opacity: dayOpacity,
      }}>
        <div style={{
          background: `${DARK}cc`,
          border: `2px solid ${accent}50`,
          borderRadius: 12,
          padding: '6px 16px',
          textAlign: 'center',
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: WHITE, lineHeight: 1 }}>
            {data.dayNumber}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: accent, letterSpacing: 2 }}>
            DAYS
          </div>
        </div>
      </div>

      {/* ── Person name tag — left side ── */}
      <div style={{
        position: 'absolute', top: 160, left: 30,
        opacity: nameOpacity,
        transform: `translateX(${nameSlide}px)`,
      }}>
        <div style={{
          background: `${DARK}bb`,
          borderLeft: `4px solid ${accent}`,
          borderRadius: 8,
          padding: '10px 20px',
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: WHITE }}>{faceNameNe}</div>
          {faceRole && (
            <div style={{ fontSize: 14, fontWeight: 600, color: GOLD }}>{faceRole}</div>
          )}
        </div>
      </div>

      {/* ── MAIN HEADLINE — on the face, bottom half ── */}
      <div style={{
        position: 'absolute', bottom: 200, left: 0, right: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '0 36px',
        opacity: headlineOpacity,
        transform: `scale(${headlineScale})`,
      }}>
        <div style={{
          fontSize: data.hook.textNe.length > 35 ? 48 : data.hook.textNe.length > 25 ? 56 : 64,
          fontWeight: 900,
          color: WHITE,
          textAlign: 'center',
          lineHeight: 1.15,
          textShadow: `0 0 30px rgba(0,0,0,0.9), 0 4px 15px rgba(0,0,0,0.8), 0 0 60px ${accent}30`,
          maxWidth: 950,
        }}>
          {data.hook.textNe}
        </div>

        {/* English subtitle — smaller, below */}
        <div style={{
          marginTop: 12,
          opacity: enOpacity,
        }}>
          <div style={{
            fontSize: 22,
            fontWeight: 600,
            color: `${WHITE}88`,
            textAlign: 'center',
            lineHeight: 1.3,
            textShadow: '0 2px 10px rgba(0,0,0,0.8)',
          }}>
            {data.hook.textEn}
          </div>
        </div>
      </div>

      {/* ── Accent bar at bottom ── */}
      <div style={{
        position: 'absolute', bottom: 170, left: 40, right: 40,
        height: 3,
        background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
        opacity: interpolate(frame, [15, 25], [0, 0.6], { extrapolateRight: 'clamp' }),
      }} />
    </AbsoluteFill>
  );
}

/* ══════════════════════════════════════════════════
   SECTION 2: FACTS (2.5-6s, frames 75-180)
   Rapid-fire fact slams — 2-3 cards
   ══════════════════════════════════════════════════ */
function FactsSection({ data }: { data: HypeReelData }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const accent = categoryAccent(data.category);
  const facts = data.facts.slice(0, 3);
  const FACT_DUR = Math.floor(105 / facts.length); // split evenly

  return (
    <AbsoluteFill style={{
      background: `radial-gradient(ellipse at 50% 50%, ${accent}08 0%, ${DARK} 70%)`,
    }}>
      {facts.map((fact, i) => {
        const start = i * FACT_DUR;
        const f = frame - start;
        if (f < -5 || f > FACT_DUR + 5) return null;

        const enter = interpolate(f, [0, 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const exit = interpolate(f, [FACT_DUR - 6, FACT_DUR], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

        // Alternate slide direction
        const slideDir = i % 2 === 0 ? 1 : -1;
        const slideX = interpolate(f, [0, 8], [200 * slideDir, 0], {
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
          easing: Easing.out(Easing.cubic),
        });

        // Impact shake on entry
        const impactShake = f > 0 && f < 10
          ? Math.sin(f * 3) * interpolate(f, [0, 10], [6, 0], { extrapolateRight: 'clamp' })
          : 0;

        // Highlight number scale
        const highlightScale = fact.highlight
          ? spring({ frame: Math.max(0, f - 4), fps, from: 2.0, to: 1, config: { damping: 6, mass: 0.2 } })
          : 1;

        // Flash on entry
        const factFlash = interpolate(f, [0, 2, 6], [0.3, 0.15, 0], {
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
        });

        return (
          <AbsoluteFill key={i} style={{
            opacity: enter * exit,
            transform: `translateX(${slideX + impactShake}px)`,
          }}>
            {/* Flash */}
            <AbsoluteFill style={{ background: accent, opacity: factFlash }} />

            {/* Fact number indicator */}
            <div style={{
              position: 'absolute', top: 90, left: 40,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              {facts.map((_, j) => (
                <div key={j} style={{
                  width: j === i ? 40 : 12, height: 6,
                  borderRadius: 3,
                  background: j === i ? accent : `${WHITE}30`,
                  transition: 'width 0.2s',
                }} />
              ))}
            </div>

            {/* Main content — centered */}
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: '0 50px',
            }}>
              {/* Highlight number/phrase — HUGE */}
              {fact.highlight && (
                <div style={{
                  fontSize: 120,
                  fontWeight: 900,
                  color: accent,
                  lineHeight: 1,
                  transform: `scale(${highlightScale})`,
                  textShadow: `0 0 40px ${accent}50`,
                  marginBottom: 20,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {fact.highlight}
                </div>
              )}

              {/* Nepali text */}
              <div style={{
                fontSize: fact.highlight ? 40 : 52,
                fontWeight: 800,
                color: WHITE,
                textAlign: 'center',
                lineHeight: 1.3,
                textShadow: '0 2px 15px rgba(0,0,0,0.8)',
                maxWidth: 900,
              }}>
                {fact.textNe}
              </div>

              {/* English subtitle */}
              <div style={{
                fontSize: 22,
                fontWeight: 600,
                color: `${WHITE}70`,
                textAlign: 'center',
                lineHeight: 1.3,
                marginTop: 14,
                maxWidth: 800,
              }}>
                {fact.textEn}
              </div>
            </div>

            {/* Side accent bar */}
            <div style={{
              position: 'absolute',
              [i % 2 === 0 ? 'left' : 'right']: 0,
              top: '20%', bottom: '20%',
              width: 6,
              background: accent,
              borderRadius: i % 2 === 0 ? '0 3px 3px 0' : '3px 0 0 3px',
              boxShadow: `0 0 20px ${accent}60`,
            }} />
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
}

/* ══════════════════════════════════════════════════
   SECTION 3: GRADE REVEAL (6-9.5s, frames 180-285)
   Letter grade drops in with impact
   ══════════════════════════════════════════════════ */
function GradeSection({ data }: { data: HypeReelData }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const accent = categoryAccent(data.category);

  const grade = data.grade || 'C';
  const gc = gradeColor(grade);

  // "GOVERNMENT GRADE" text
  const labelOpacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
  const labelSlide = interpolate(frame, [0, 10], [-30, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  // Grade letter — drops from top with dramatic bounce
  const gradeScale = spring({
    frame: Math.max(0, frame - 15),
    fps,
    from: 4.0, to: 1,
    config: { damping: 5, mass: 0.3 },
  });
  const gradeOpacity = interpolate(frame, [15, 22], [0, 1], { extrapolateRight: 'clamp' });
  const gradeY = interpolate(frame, [15, 22], [-200, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  // Impact shake when grade lands
  const impactFrame = frame - 22;
  const impactShake = impactFrame > 0 && impactFrame < 12
    ? Math.sin(impactFrame * 3.5) * interpolate(impactFrame, [0, 12], [10, 0], { extrapolateRight: 'clamp' })
    : 0;

  // Flash on grade impact
  const impactFlash = interpolate(frame, [20, 23, 30], [0, 0.4, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // Grade change indicator
  const changeOpacity = interpolate(frame, [40, 50], [0, 1], { extrapolateRight: 'clamp' });
  const changeArrow = data.gradeChange === 'down' ? '▼' : data.gradeChange === 'up' ? '▲' : '—';
  const changeColor = data.gradeChange === 'down' ? RED_LIGHT : data.gradeChange === 'up' ? GREEN : GOLD;

  // Glow pulse
  const glowPulse = Math.sin(frame * 0.15) * 0.3 + 0.7;

  return (
    <AbsoluteFill style={{
      background: DARK,
      transform: `translateX(${impactShake}px)`,
    }}>
      {/* Radial glow behind grade */}
      <div style={{
        position: 'absolute',
        top: '25%', left: '15%', right: '15%', bottom: '35%',
        background: `radial-gradient(circle, ${gc}20 0%, transparent 70%)`,
        opacity: gradeOpacity * glowPulse,
      }} />

      {/* Impact flash */}
      <AbsoluteFill style={{ background: gc, opacity: impactFlash }} />

      {/* "सरकारको ग्रेड" label */}
      <div style={{
        position: 'absolute', top: 180, left: 0, right: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        opacity: labelOpacity,
        transform: `translateY(${labelSlide}px)`,
      }}>
        <div style={{
          fontSize: 20, fontWeight: 800, color: `${WHITE}60`,
          letterSpacing: 6, textTransform: 'uppercase',
        }}>
          GOVERNMENT GRADE
        </div>
        <div style={{
          fontSize: 36, fontWeight: 900, color: GOLD,
        }}>
          सरकारको ग्रेड
        </div>
      </div>

      {/* THE GRADE — massive, center */}
      <div style={{
        position: 'absolute', top: '32%', left: 0, right: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        opacity: gradeOpacity,
        transform: `translateY(${gradeY}px) scale(${gradeScale})`,
      }}>
        <div style={{
          fontSize: 280,
          fontWeight: 900,
          color: gc,
          lineHeight: 1,
          textShadow: `0 0 80px ${gc}50, 0 0 160px ${gc}25, 0 8px 40px rgba(0,0,0,0.9)`,
        }}>
          {grade}
        </div>
      </div>

      {/* Grade change indicator */}
      {data.gradeChange && data.gradeChange !== 'same' && data.previousGrade && (
        <div style={{
          position: 'absolute', top: '68%', left: 0, right: 0,
          display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16,
          opacity: changeOpacity,
        }}>
          <div style={{
            fontSize: 32, fontWeight: 800, color: `${WHITE}50`,
            textDecoration: 'line-through',
          }}>
            {data.previousGrade}
          </div>
          <div style={{
            fontSize: 36, fontWeight: 900, color: changeColor,
          }}>
            {changeArrow}
          </div>
          <div style={{
            fontSize: 42, fontWeight: 900, color: gc,
          }}>
            {grade}
          </div>
        </div>
      )}

      {/* Horizontal accent lines */}
      <div style={{
        position: 'absolute', top: '80%', left: 40, right: 40,
        display: 'flex', gap: 4,
        opacity: interpolate(frame, [50, 65], [0, 1], { extrapolateRight: 'clamp' }),
      }}>
        {['A', 'B', 'C', 'D', 'F'].map((g) => (
          <div key={g} style={{
            flex: 1, height: 8, borderRadius: 4,
            background: g === grade ? gc : `${WHITE}15`,
            boxShadow: g === grade ? `0 0 12px ${gc}60` : 'none',
          }} />
        ))}
      </div>
      <div style={{
        position: 'absolute', top: 'calc(80% + 16px)', left: 40, right: 40,
        display: 'flex', justifyContent: 'space-between',
        opacity: interpolate(frame, [55, 70], [0, 1], { extrapolateRight: 'clamp' }),
      }}>
        {['A', 'B', 'C', 'D', 'F'].map((g) => (
          <span key={g} style={{
            fontSize: 16, fontWeight: 700,
            color: g === grade ? gc : `${WHITE}30`,
          }}>{g}</span>
        ))}
      </div>
    </AbsoluteFill>
  );
}

/* ══════════════════════════════════════════════════
   SECTION 4: QUESTION (9.5-12s, frames 285-360)
   Comment bait — provocative question
   ══════════════════════════════════════════════════ */
function QuestionSection({ data }: { data: HypeReelData }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const accent = categoryAccent(data.category);

  // Typing effect for Nepali question
  const chars = data.questionNe.length;
  const typedChars = Math.round(interpolate(frame, [5, 40], [0, chars], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  }));
  const displayText = data.questionNe.slice(0, typedChars);
  const showCursor = frame < 45 && Math.sin(frame * 0.5) > 0;

  // Comment emoji animation
  const emojiScale = spring({
    frame: Math.max(0, frame - 35),
    fps,
    from: 0, to: 1,
    config: { damping: 6, mass: 0.2 },
  });

  // English subtitle
  const enOpacity = interpolate(frame, [40, 50], [0, 1], { extrapolateRight: 'clamp' });

  // Floating reaction emojis
  const reactions = ['🤔', '😡', '👏', '💬', '🔥'];
  const reactionStart = 45;

  return (
    <AbsoluteFill style={{
      background: `radial-gradient(ellipse at 50% 60%, ${accent}10 0%, ${DARK} 60%)`,
    }}>
      {/* "तपाईंको विचार?" prompt */}
      <div style={{
        position: 'absolute', top: 160, left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
        opacity: interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' }),
      }}>
        <div style={{
          fontSize: 22, fontWeight: 800, color: accent,
          letterSpacing: 4, textTransform: 'uppercase',
        }}>
          YOUR THOUGHTS?
        </div>
      </div>

      {/* Main question — Nepali with typing effect */}
      <div style={{
        position: 'absolute', top: '28%', left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
        padding: '0 50px',
      }}>
        <div style={{
          fontSize: data.questionNe.length > 40 ? 44 : 54,
          fontWeight: 900,
          color: WHITE,
          textAlign: 'center',
          lineHeight: 1.3,
          maxWidth: 900,
          textShadow: '0 2px 15px rgba(0,0,0,0.8)',
        }}>
          {displayText}
          {showCursor && (
            <span style={{ color: accent, fontSize: 56 }}>|</span>
          )}
        </div>
      </div>

      {/* English subtitle */}
      <div style={{
        position: 'absolute', top: '55%', left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
        padding: '0 60px',
        opacity: enOpacity,
      }}>
        <div style={{
          fontSize: 24, fontWeight: 600, color: `${WHITE}60`,
          textAlign: 'center', lineHeight: 1.3,
        }}>
          {data.questionEn}
        </div>
      </div>

      {/* Comment emoji — big center */}
      <div style={{
        position: 'absolute', top: '68%', left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
        transform: `scale(${emojiScale})`,
      }}>
        <div style={{
          fontSize: 80, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))',
        }}>
          💬
        </div>
      </div>

      {/* Floating reaction emojis */}
      {reactions.map((emoji, i) => {
        const rFrame = frame - reactionStart - i * 4;
        if (rFrame < 0) return null;
        const rOpacity = interpolate(rFrame, [0, 5, 20, 30], [0, 1, 1, 0], {
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
        });
        const rY = interpolate(rFrame, [0, 30], [0, -80], {
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
        });
        const xOffset = (i - 2) * 120;

        return (
          <div key={i} style={{
            position: 'absolute',
            bottom: 200,
            left: `calc(50% + ${xOffset}px)`,
            opacity: rOpacity,
            transform: `translateY(${rY}px)`,
            fontSize: 36,
          }}>
            {emoji}
          </div>
        );
      })}

      {/* "Comment below" text */}
      <div style={{
        position: 'absolute', bottom: 100, left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
        opacity: interpolate(frame, [50, 60], [0, 1], { extrapolateRight: 'clamp' }),
      }}>
        <div style={{
          fontSize: 20, fontWeight: 700, color: accent,
          letterSpacing: 2,
          padding: '8px 24px',
          border: `2px solid ${accent}40`,
          borderRadius: 12,
        }}>
          कमेन्ट गर्नुहोस् 👇
        </div>
      </div>
    </AbsoluteFill>
  );
}

/* ══════════════════════════════════════════════════
   SECTION 5: CTA (12-15s, frames 360-450)
   Follow + branding
   ══════════════════════════════════════════════════ */
function CTASection({ data }: { data: HypeReelData }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const accent = categoryAccent(data.category);

  // Logo slam
  const logoScale = spring({
    frame: Math.max(0, frame - 3),
    fps,
    from: 2.5, to: 1,
    config: { damping: 6, mass: 0.2 },
  });

  // Follow button pulse
  const btnPulse = Math.sin(frame * 0.2) * 0.05 + 1;

  // Bell emoji bounce
  const bellBounce = spring({
    frame: Math.max(0, frame - 10),
    fps,
    from: 0, to: 1,
    config: { damping: 4, mass: 0.2 },
  });

  // Notification bell ring
  const bellRotate = frame > 15 && frame < 35
    ? Math.sin((frame - 15) * 1.5) * interpolate(frame, [15, 35], [15, 0], { extrapolateRight: 'clamp' })
    : 0;

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(180deg, ${DARK} 0%, ${RED}15 50%, ${BLUE}15 100%)`,
    }}>
      {/* Nepal Republic logo area */}
      <div style={{
        position: 'absolute', top: '22%', left: 0, right: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
        transform: `scale(${logoScale})`,
      }}>
        {/* Bell emoji */}
        <div style={{
          fontSize: 80,
          transform: `scale(${bellBounce}) rotate(${bellRotate}deg)`,
          filter: 'drop-shadow(0 4px 20px rgba(251,191,36,0.4))',
        }}>
          🔔
        </div>
        <div style={{
          fontSize: 52, fontWeight: 900, color: WHITE,
          letterSpacing: 3,
          textShadow: `0 0 30px ${RED}40`,
        }}>
          NEPAL REPUBLIC
        </div>
        <div style={{
          fontSize: 28, fontWeight: 700, color: GOLD,
        }}>
          नेपाल रिपब्लिक
        </div>
      </div>

      {/* Tagline */}
      <div style={{
        position: 'absolute', top: '52%', left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
        padding: '0 60px',
        opacity: interpolate(frame, [15, 25], [0, 1], { extrapolateRight: 'clamp' }),
      }}>
        <div style={{
          fontSize: 26, fontWeight: 600, color: `${WHITE}70`,
          textAlign: 'center', lineHeight: 1.4,
        }}>
          AI-powered government accountability
          {'\n'}
          सरकारको जवाफदेहिता ट्र्याकर
        </div>
      </div>

      {/* Follow button */}
      <div style={{
        position: 'absolute', top: '68%', left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
        opacity: interpolate(frame, [25, 35], [0, 1], { extrapolateRight: 'clamp' }),
      }}>
        <div style={{
          background: `linear-gradient(135deg, ${RED}, ${RED}dd)`,
          borderRadius: 20,
          padding: '16px 48px',
          transform: `scale(${btnPulse})`,
          boxShadow: `0 4px 30px ${RED}40`,
        }}>
          <span style={{ fontSize: 28, fontWeight: 900, color: WHITE, letterSpacing: 2 }}>
            FOLLOW गर्नुहोस्
          </span>
        </div>
      </div>

      {/* Daily updates promise */}
      <div style={{
        position: 'absolute', bottom: 120, left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
        opacity: interpolate(frame, [40, 55], [0, 1], { extrapolateRight: 'clamp' }),
      }}>
        <div style={{
          fontSize: 18, fontWeight: 600, color: `${WHITE}50`,
          letterSpacing: 2,
        }}>
          DAILY UPDATES AT 7AM NPT
        </div>
      </div>
    </AbsoluteFill>
  );
}

/* ══════════════════════════════════════════════════
   MAIN COMPOSITION
   ══════════════════════════════════════════════════ */
export const HypeReel: React.FC<{ data: HypeReelData }> = ({ data }) => {
  return (
    <AbsoluteFill style={{ background: DARK, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Section 1: HOOK (0-2.5s) */}
      <Sequence from={0} durationInFrames={75}>
        <HookSection data={data} />
      </Sequence>

      {/* Section 2: FACTS (2.5-6s) */}
      <Sequence from={75} durationInFrames={105}>
        <FactsSection data={data} />
      </Sequence>

      {/* Section 3: GRADE (6-9.5s) */}
      <Sequence from={180} durationInFrames={105}>
        <GradeSection data={data} />
      </Sequence>

      {/* Section 4: QUESTION (9.5-12s) */}
      <Sequence from={285} durationInFrames={75}>
        <QuestionSection data={data} />
      </Sequence>

      {/* Section 5: CTA (12-15s) */}
      <Sequence from={360} durationInFrames={90}>
        <CTASection data={data} />
      </Sequence>

      {/* Persistent overlays */}
      <TopTicker data={data} />
      <BottomBar />
    </AbsoluteFill>
  );
};
