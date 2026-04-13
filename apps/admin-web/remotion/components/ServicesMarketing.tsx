import React from 'react';
import {
  AbsoluteFill,
  Audio,
  staticFile,
  useCurrentFrame,
  interpolate,
  spring,
  Sequence,
  useVideoConfig,
  Easing,
} from 'remotion';

/* ══════════════════════════════════════════════
   SERVICES MARKETING REEL — 50s promo video
   "Your government services, simplified."

   Recreates the REAL Nepal Republic UI —
   dark theme, red/blue branding, bilingual text,
   voice search, AI advisor, case tracking.

   Timeline (1500 frames @ 30fps):
   0-3s     (0-90)        Hook — attention grabber
   3-7s     (90-210)      Pain — the old way
   7-14s    (210-420)     Landing page mockup
   14-22s   (420-660)     AI advisor demo
   22-30s   (660-900)     Case tracking
   30-38s   (900-1140)    Services breadth
   38-44s   (1140-1320)   Social proof
   44-50s   (1320-1500)   CTA
   ══════════════════════════════════════════════ */

const RED = '#DC143C';
const BLUE = '#003893';
const DARK = '#0a0a12';
const DARK_SURFACE = '#111827';
const DARK_CARD = '#1a1f2e';
const WHITE = '#ffffff';
const GOLD = '#fbbf24';
const GREEN = '#34d399';
const GRAY = '#94a3b8';
const RED_GLOW = 'rgba(220,20,60,0.15)';
const BLUE_GLOW = 'rgba(0,56,147,0.12)';

/* ── Phone frame — matches real app look ── */
function PhoneFrame({
  children,
  scale = 1,
  glow = false,
}: {
  children: React.ReactNode;
  scale?: number;
  glow?: boolean;
}) {
  return (
    <div
      style={{
        width: 370 * scale,
        height: 760 * scale,
        borderRadius: 44 * scale,
        border: '3px solid rgba(255,255,255,0.1)',
        background: DARK,
        overflow: 'hidden',
        boxShadow: glow
          ? `0 30px 80px rgba(0,0,0,0.7), 0 0 80px ${RED}20, 0 0 120px ${BLUE}15`
          : '0 30px 80px rgba(0,0,0,0.6)',
        position: 'relative',
      }}
    >
      {/* Status bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 44 * scale,
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `0 ${24 * scale}px`,
          background: 'rgba(10,10,18,0.9)',
        }}
      >
        <span style={{ fontSize: 13 * scale, fontWeight: 600, color: WHITE }}>9:41</span>
        <div style={{ display: 'flex', gap: 4 * scale, alignItems: 'center' }}>
          <div style={{ width: 16 * scale, height: 10 * scale, borderRadius: 2, border: '1px solid rgba(255,255,255,0.5)' }}>
            <div style={{ width: '70%', height: '100%', background: WHITE, borderRadius: 1 }} />
          </div>
        </div>
      </div>
      {/* Dynamic island */}
      <div
        style={{
          position: 'absolute',
          top: 6 * scale,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 120 * scale,
          height: 32 * scale,
          borderRadius: 20 * scale,
          background: '#000',
          zIndex: 30,
        }}
      />
      <div style={{ paddingTop: 44 * scale, height: '100%', overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}

/* ── Real NR top nav bar ── */
function AppNavBar({ scale = 1 }: { scale?: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: `${10 * scale}px ${16 * scale}px`,
        background: DARK,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div
        style={{
          width: 30 * scale,
          height: 30 * scale,
          borderRadius: 10 * scale,
          background: `linear-gradient(135deg, ${RED}, ${BLUE})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 8 * scale,
        }}
      >
        <span style={{ fontSize: 13 * scale, fontWeight: 900, color: WHITE }}>NR</span>
      </div>
      <span style={{ fontSize: 14 * scale, fontWeight: 800, color: WHITE }}>Nepal</span>
      <span style={{ fontSize: 14 * scale, fontWeight: 800, color: RED, marginLeft: 1 }}>Republic</span>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', gap: 12 * scale }}>
        <div style={{ width: 24 * scale, height: 24 * scale, borderRadius: 6 * scale, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 12 * scale, color: GRAY }}>🔍</span>
        </div>
        <div style={{ width: 24 * scale, height: 24 * scale, borderRadius: 6 * scale, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 11 * scale, color: GRAY }}>🌐</span>
        </div>
      </div>
    </div>
  );
}

/* ── Brand bar ── */
function BrandBar() {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        height: 52,
        background: `linear-gradient(90deg, ${RED}, ${BLUE})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          background: 'rgba(255,255,255,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 900, color: WHITE }}>NR</span>
      </div>
      <span style={{ fontSize: 20, fontWeight: 900, color: WHITE, letterSpacing: 1 }}>NEPAL REPUBLIC</span>
      <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)' }}>|</span>
      <span style={{ fontSize: 16, fontWeight: 700, color: GOLD }}>nepalrepublic.org</span>
    </div>
  );
}

/* ═══════════════════════════════════════
   Scene 1: HOOK (0-3s) — attention grabber
   ═══════════════════════════════════════ */
function HookScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const textScale = spring({ frame, fps, from: 1.4, to: 1, config: { damping: 8, mass: 0.3 } });
  const textOpacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
  const subIn = spring({ frame: frame - 25, fps, from: 0, to: 1, config: { damping: 12 } });
  const flashOpacity = interpolate(frame, [0, 5, 15], [0.5, 0.2, 0], { extrapolateRight: 'clamp' });
  const bgShift = interpolate(frame, [0, 90], [0, 20], { extrapolateRight: 'clamp' });

  // Nepali flag colors pulsing
  const pulse = Math.sin(frame * 0.08) * 0.15 + 0.35;

  return (
    <AbsoluteFill style={{ background: DARK }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% ${35 + bgShift}%, ${RED}${Math.round(pulse * 255).toString(16).padStart(2, '0')} 0%, transparent 65%)` }} />
      <div style={{ position: 'absolute', inset: 0, background: RED, opacity: flashOpacity }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '0 50px' }}>
        <div style={{
          fontSize: 64, fontWeight: 900, color: WHITE, textAlign: 'center',
          lineHeight: 1.15,
          transform: `scale(${textScale})`, opacity: textOpacity,
          textShadow: `0 4px 40px ${RED}50`,
        }}>
          Ever wasted{'\n'}a full day{'\n'}at a{'\n'}
          <span style={{ color: RED }}>sarkari office?</span>
        </div>

        <div style={{
          fontSize: 34, fontWeight: 600, color: GOLD, textAlign: 'center',
          marginTop: 30, lineHeight: 1.4,
          transform: `translateY(${(1 - subIn) * 30}px)`, opacity: subIn,
        }}>
          Never again.
        </div>
      </div>
      <BrandBar />
    </AbsoluteFill>
  );
}

/* ═══════════════════════════════════════
   Scene 2: PAIN POINT (3-7s)
   ═══════════════════════════════════════ */
function PainScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const items = [
    { icon: '😤', text: 'Hours in queues at sarkari offices', ne: 'सरकारी कार्यालयमा घण्टौं लाइन', delay: 0 },
    { icon: '📋', text: 'Wrong documents? Come back tomorrow.', ne: 'गलत कागजात? भोलि आउनुस्।', delay: 18 },
    { icon: '🤷', text: '"Which counter do I go to?"', ne: '"कुन काउन्टरमा जाने?"', delay: 36 },
    { icon: '💸', text: 'Brokers charging hidden fees', ne: 'दलालले लुकाइएको शुल्क लिने', delay: 54 },
  ];

  const titleIn = spring({ frame, fps, from: 0, to: 1, config: { damping: 12 } });
  const crossIn = interpolate(frame, [90, 110], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: DARK }}>
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${DARK} 0%, #1a0505 100%)` }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '80px 44px' }}>
        <div style={{
          fontSize: 44, fontWeight: 900, color: '#ef4444', textAlign: 'center',
          marginBottom: 50, opacity: titleIn,
          textShadow: '0 0 25px rgba(239,68,68,0.3)',
        }}>
          We've all been there.
        </div>

        {items.map((item, i) => {
          const itemIn = spring({ frame: frame - item.delay - 10, fps, from: 0, to: 1, config: { damping: 12 } });
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 16,
              marginBottom: 24,
              transform: `translateX(${(1 - itemIn) * 50}px)`, opacity: itemIn,
            }}>
              <span style={{ fontSize: 40, lineHeight: 1 }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: 24, fontWeight: 600, color: 'rgba(255,255,255,0.9)', lineHeight: 1.3 }}>{item.text}</div>
                <div style={{ fontSize: 16, fontWeight: 500, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{item.ne}</div>
              </div>
            </div>
          );
        })}

        {/* X cross-out */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: crossIn,
        }}>
          <div style={{
            fontSize: 380, fontWeight: 900, color: `${RED}40`,
            transform: `scale(${0.5 + crossIn * 0.5}) rotate(-12deg)`,
          }}>✕</div>
        </div>
      </div>
      <BrandBar />
    </AbsoluteFill>
  );
}

/* ═══════════════════════════════════════
   Scene 3: REAL LANDING PAGE (7-14s)
   ═══════════════════════════════════════ */
function LandingScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const phoneIn = spring({ frame, fps, from: 0.85, to: 1, config: { damping: 12 } });
  const phoneOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  // Typing animation in search bar
  const searchText = 'How do I get a driving lic...';
  const typingProgress = interpolate(frame, [40, 100], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const visibleChars = Math.floor(typingProgress * searchText.length);
  const typedText = searchText.slice(0, visibleChars);
  const cursorBlink = Math.sin(frame * 0.4) > 0;

  // Quick tags appear
  const tagsIn = spring({ frame: frame - 110, fps, from: 0, to: 1, config: { damping: 12 } });

  // Score ring
  const scoreProgress = interpolate(frame, [60, 130], [0, 76], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Title text
  const titleIn = spring({ frame: frame - 5, fps, from: 0, to: 1, config: { damping: 15 } });

  return (
    <AbsoluteFill style={{ background: DARK }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 35%, ${BLUE}18 0%, transparent 55%)` }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '50px 30px 80px' }}>
        <div style={{
          fontSize: 36, fontWeight: 900, color: WHITE, textAlign: 'center',
          marginBottom: 8, opacity: titleIn,
        }}>
          This is Nepal Republic
        </div>
        <div style={{
          fontSize: 22, fontWeight: 500, color: GRAY, textAlign: 'center',
          marginBottom: 28, opacity: titleIn,
        }}>
          Your AI-powered citizen platform
        </div>

        <div style={{ transform: `scale(${phoneIn})`, opacity: phoneOpacity }}>
          <PhoneFrame scale={1.1} glow>
            <AppNavBar scale={1.1} />
            <div style={{ padding: '12px 16px' }}>
              {/* Hero text */}
              <div style={{ textAlign: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: WHITE, lineHeight: 1.3 }}>
                  AI-powered citizen platform for Nepal.
                </div>
                <div style={{ fontSize: 11, color: GRAY, marginTop: 4, lineHeight: 1.3 }}>
                  From everyday services to national accountability
                </div>
              </div>

              {/* Day counter + scanned badge */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '3px 10px', fontSize: 11, color: GRAY, fontWeight: 600 }}>Day 19</div>
                <div style={{ background: `${GREEN}15`, borderRadius: 12, padding: '3px 10px', fontSize: 11, color: GREEN, fontWeight: 600 }}>1.6K scanned</div>
              </div>

              {/* Audio player bar */}
              <div style={{ background: 'rgba(220,20,60,0.12)', borderRadius: 12, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 16, background: RED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 14, color: WHITE }}>▶</span>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: WHITE }}>Learn about the Nepal Republic app</div>
                  <div style={{ fontSize: 10, color: GRAY }}>▸ Listen now</div>
                </div>
              </div>

              {/* "What can I help you with?" */}
              <div style={{ fontSize: 18, fontWeight: 800, color: WHITE, textAlign: 'center', marginBottom: 10 }}>
                What can I help you with?
              </div>

              {/* Voice search bar — exact replica */}
              <div style={{
                background: 'rgba(30,20,25,0.6)',
                border: `2px solid ${RED}50`,
                borderRadius: 28, padding: '12px 16px',
                display: 'flex', alignItems: 'center',
                marginBottom: 12,
                boxShadow: `0 0 20px ${RED}15`,
              }}>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: typingProgress > 0 ? WHITE : 'rgba(255,255,255,0.35)' }}>
                  {typingProgress > 0 ? typedText : 'How do I get a driving lic...'}
                  {cursorBlink && typingProgress > 0 && typingProgress < 1 && <span style={{ color: GOLD }}>|</span>}
                </span>
                <div style={{
                  width: 36, height: 36, borderRadius: 18,
                  background: 'rgba(255,255,255,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 18 }}>🎤</span>
                </div>
              </div>

              {/* Quick tags */}
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center',
                opacity: tagsIn, transform: `translateY(${(1 - tagsIn) * 10}px)`,
              }}>
                {['Passport', 'Citizenship', 'License', 'Go abroad', 'Business', 'Tax filing'].map((tag, i) => (
                  <div key={i} style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 14, padding: '4px 12px',
                    fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.7)',
                  }}>{tag}</div>
                ))}
              </div>

              {/* Score widget */}
              <div style={{
                marginTop: 14, background: DARK_CARD, borderRadius: 16,
                padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14,
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ position: 'relative', width: 52, height: 52 }}>
                  <svg width="52" height="52" viewBox="0 0 52 52">
                    <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
                    <circle cx="26" cy="26" r="22" fill="none" stroke={GREEN} strokeWidth="5"
                      strokeDasharray={`${2 * Math.PI * 22}`}
                      strokeDashoffset={`${2 * Math.PI * 22 * (1 - scoreProgress / 100)}`}
                      strokeLinecap="round"
                      transform="rotate(-90 26 26)"
                    />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: WHITE }}>
                    {Math.round(scoreProgress)}%
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <span style={{ fontSize: 10, color: GREEN }}>● 70 moving</span>
                    <span style={{ fontSize: 10, color: '#ef4444' }}>● 13 stuck</span>
                  </div>
                  <span style={{ fontSize: 10, color: GOLD }}>● 26 waiting</span>
                </div>
              </div>
            </div>
          </PhoneFrame>
        </div>
      </div>
      <BrandBar />
    </AbsoluteFill>
  );
}

/* ═══════════════════════════════════════
   Scene 4: AI ADVISOR DEMO (14-22s)
   ═══════════════════════════════════════ */
function AdvisorDemoScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // "मलाई पासपोर्ट नवीकरण गर्नुपर्छ" typing
  const userTextNe = 'मलाई पासपोर्ट नवीकरण गर्नुपर्छ';
  const userTextEn = 'I need to renew my passport';
  const typingProgress = interpolate(frame, [20, 65], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const visibleChars = Math.floor(typingProgress * userTextEn.length);
  const typedText = userTextEn.slice(0, visibleChars);
  const cursorBlink = Math.sin(frame * 0.4) > 0;

  // AI response
  const aiIn = spring({ frame: frame - 75, fps, from: 0, to: 1, config: { damping: 12 } });

  // Service match card
  const serviceIn = spring({ frame: frame - 100, fps, from: 0, to: 1, config: { damping: 10 } });

  // Document checklist
  const docs = [
    { text: 'Old passport', status: 'ready', delay: 125 },
    { text: 'Citizenship certificate', status: 'ready', delay: 135 },
    { text: 'Passport photos (2)', status: 'missing', delay: 145 },
    { text: 'Application form', status: 'ready', delay: 155 },
  ];

  // Start button
  const btnIn = spring({ frame: frame - 170, fps, from: 0, to: 1, config: { damping: 10 } });
  const btnPulse = Math.sin(frame * 0.12) * 0.03 + 1;

  // Header
  const headerIn = spring({ frame, fps, from: 0, to: 1, config: { damping: 15 } });

  return (
    <AbsoluteFill style={{ background: DARK }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 30%, ${GREEN}10 0%, transparent 55%)` }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '50px 30px 80px' }}>
        <div style={{ fontSize: 36, fontWeight: 900, color: WHITE, textAlign: 'center', marginBottom: 6, opacity: headerIn }}>
          Just ask. In any language.
        </div>
        <div style={{ fontSize: 20, fontWeight: 500, color: GRAY, textAlign: 'center', marginBottom: 24, opacity: headerIn }}>
          AI understands Nepali, English, or Romanized
        </div>

        <PhoneFrame scale={1.08} glow>
          <AppNavBar scale={1.08} />
          <div style={{ padding: '8px 14px' }}>
            {/* Advisor header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '6px 0' }}>
              <span style={{ fontSize: 16 }}>⭕</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: WHITE }}>Service Advisor</div>
                <div style={{ fontSize: 10, color: GRAY }}>Tell us what you need, we'll show you the steps</div>
              </div>
            </div>

            {/* "What can I help you with?" */}
            <div style={{ fontSize: 16, fontWeight: 800, color: WHITE, textAlign: 'center', marginBottom: 6 }}>
              What can I help you with?
            </div>
            <div style={{ fontSize: 11, color: GRAY, textAlign: 'center', marginBottom: 10 }}>
              Passport, license, hospital, bills — tell me what you need
            </div>

            {/* Search input with typed text */}
            <div style={{
              background: 'rgba(30,20,25,0.6)',
              border: `2px solid ${RED}50`,
              borderRadius: 24, padding: '10px 14px',
              display: 'flex', alignItems: 'center', gap: 8,
              marginBottom: 10,
            }}>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: WHITE }}>
                {typedText}
                {cursorBlink && typingProgress < 1 && <span style={{ color: GOLD }}>|</span>}
              </span>
              <div style={{ width: 32, height: 32, borderRadius: 16, background: RED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: WHITE }}>Go</span>
              </div>
              <div style={{ width: 32, height: 32, borderRadius: 16, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 14 }}>🎤</span>
              </div>
            </div>

            {/* AI response bubble */}
            <div style={{
              background: 'rgba(255,255,255,0.04)',
              borderRadius: 14, padding: '10px 12px',
              marginBottom: 8,
              border: '1px solid rgba(255,255,255,0.06)',
              transform: `translateY(${(1 - aiIn) * 15}px)`, opacity: aiIn,
            }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4 }}>
                I'll help you renew your passport. Here's what you need to know:
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                <span style={{ fontSize: 9, background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '2px 8px', color: GRAY }}>🔊 Listen</span>
              </div>
            </div>

            {/* Service match card */}
            <div style={{
              background: DARK_CARD,
              borderRadius: 14, padding: '12px 14px',
              border: '1px solid rgba(255,255,255,0.08)',
              transform: `translateY(${(1 - serviceIn) * 15}px)`, opacity: serviceIn,
              marginBottom: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 10, background: `${GOLD}20`, color: GOLD, borderRadius: 6, padding: '1px 6px', fontWeight: 700 }}>① </span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: WHITE }}>Passport Renewal</div>
                  <div style={{ fontSize: 10, color: GRAY }}>पासपोर्ट नवीकरण</div>
                </div>
              </div>

              {/* Document checklist */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 8 }}>
                {docs.map((doc, i) => {
                  const dIn = spring({ frame: frame - doc.delay, fps, from: 0, to: 1, config: { damping: 12 } });
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      opacity: dIn, transform: `translateX(${(1 - dIn) * 15}px)`,
                    }}>
                      <span style={{ fontSize: 11, color: doc.status === 'ready' ? GREEN : '#ef4444' }}>
                        {doc.status === 'ready' ? '✓' : '○'}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.75)' }}>{doc.text}</span>
                    </div>
                  );
                })}
              </div>

              {/* Info row */}
              <div style={{ display: 'flex', gap: 10, fontSize: 10, color: GRAY, marginBottom: 8 }}>
                <span>💰 NPR 5,000</span>
                <span>⏱️ 3 weeks</span>
                <span>📍 Dept. of Passports</span>
              </div>

              {/* Start button */}
              <div style={{
                transform: `scale(${btnIn * btnPulse})`, opacity: btnIn,
              }}>
                <div style={{
                  background: `linear-gradient(90deg, ${RED}, #b91c1c)`,
                  borderRadius: 10, padding: '10px 16px',
                  textAlign: 'center',
                  boxShadow: `0 3px 15px ${RED}40`,
                }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: WHITE }}>
                    Start this step →
                  </span>
                </div>
              </div>
            </div>
          </div>
        </PhoneFrame>
      </div>
      <BrandBar />
    </AbsoluteFill>
  );
}

/* ═══════════════════════════════════════
   Scene 5: CASE TRACKING (22-30s)
   ═══════════════════════════════════════ */
function TrackingScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerIn = spring({ frame, fps, from: 0, to: 1, config: { damping: 12 } });
  const progress = interpolate(frame, [25, 120], [0, 60], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Compact case list items (matches real My Cases page)
  const cases = [
    {
      icon: '🛂', title: 'Passport Renewal', titleNe: 'पासपोर्ट नवीकरण',
      status: 'in_progress', statusColor: GOLD, statusText: 'In Progress',
      nextAction: 'Visit Department of Passports', progress: 60, step: '3/5', delay: 30,
    },
    {
      icon: '🚗', title: 'Driving License Trial', titleNe: 'सवारी चालक अनुमतिपत्र',
      status: 'collecting_docs', statusColor: '#3b82f6', statusText: 'Collecting Docs',
      nextAction: 'Upload medical report', progress: 20, step: '1/4', delay: 55,
    },
    {
      icon: '💡', title: 'NEA Electricity Bill', titleNe: 'बिजुली बिल भुक्तानी',
      status: 'completed', statusColor: GREEN, statusText: 'Completed ✓',
      nextAction: 'Payment confirmed', progress: 100, step: '3/3', delay: 80,
    },
  ];

  // Expand animation for first case
  const expandIn = spring({ frame: frame - 130, fps, from: 0, to: 1, config: { damping: 12 } });

  return (
    <AbsoluteFill style={{ background: DARK }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 55%, ${BLUE}15 0%, transparent 55%)` }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '50px 30px 80px' }}>
        <div style={{ fontSize: 36, fontWeight: 900, color: WHITE, textAlign: 'center', marginBottom: 6, opacity: headerIn }}>
          Track every case
        </div>
        <div style={{ fontSize: 20, fontWeight: 500, color: GRAY, textAlign: 'center', marginBottom: 24, opacity: headerIn }}>
          Know exactly where things stand
        </div>

        <PhoneFrame scale={1.08} glow>
          <AppNavBar scale={1.08} />
          <div style={{ padding: '8px 14px' }}>
            {/* Page title */}
            <div style={{ fontSize: 18, fontWeight: 800, color: WHITE, marginBottom: 12 }}>My Cases</div>

            {/* Case list — compact rows */}
            {cases.map((c, i) => {
              const cIn = spring({ frame: frame - c.delay, fps, from: 0, to: 1, config: { damping: 12 } });
              const isFirst = i === 0;
              const showExpanded = isFirst && expandIn > 0.1;

              return (
                <div key={i} style={{
                  background: DARK_CARD,
                  borderRadius: 12, padding: '10px 12px',
                  marginBottom: 8,
                  border: `1px solid ${isFirst ? `${GOLD}25` : 'rgba(255,255,255,0.06)'}`,
                  transform: `translateY(${(1 - cIn) * 20}px)`, opacity: cIn,
                }}>
                  {/* Compact row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Status dot */}
                    <div style={{
                      width: 10, height: 10, borderRadius: 5,
                      background: c.statusColor,
                      boxShadow: `0 0 6px ${c.statusColor}50`,
                    }} />
                    <span style={{ fontSize: 18 }}>{c.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: WHITE }}>{c.title}</div>
                      <div style={{ fontSize: 9, color: GRAY }}>{c.nextAction}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 9, fontWeight: 600, color: c.statusColor }}>{c.statusText}</div>
                      <div style={{ fontSize: 9, color: GRAY }}>Step {c.step}</div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ marginTop: 6, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
                    <div style={{
                      width: `${isFirst ? progress : c.progress}%`,
                      height: '100%', borderRadius: 2,
                      background: c.status === 'completed'
                        ? `linear-gradient(90deg, ${GREEN}, #059669)`
                        : `linear-gradient(90deg, ${RED}, ${GOLD})`,
                    }} />
                  </div>

                  {/* Expanded detail for first case */}
                  {showExpanded && (
                    <div style={{ marginTop: 8, opacity: expandIn, transform: `translateY(${(1 - expandIn) * 10}px)` }}>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                        <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '6px 8px' }}>
                          <div style={{ fontSize: 8, color: GRAY, marginBottom: 2 }}>Next Action</div>
                          <div style={{ fontSize: 10, fontWeight: 600, color: WHITE }}>Visit Dept. of Passports with documents</div>
                        </div>
                        <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '6px 8px' }}>
                          <div style={{ fontSize: 8, color: GRAY, marginBottom: 2 }}>Documents</div>
                          <div style={{ fontSize: 10, color: GREEN }}>✓ 3 ready</div>
                          <div style={{ fontSize: 10, color: '#ef4444' }}>○ 1 missing</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <div style={{ background: `${RED}15`, borderRadius: 6, padding: '4px 10px', fontSize: 9, fontWeight: 700, color: RED }}>Advance step</div>
                        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 6, padding: '4px 10px', fontSize: 9, fontWeight: 600, color: GRAY }}>Track status</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </PhoneFrame>
      </div>
      <BrandBar />
    </AbsoluteFill>
  );
}

/* ═══════════════════════════════════════
   Scene 6: SERVICES BREADTH (30-38s)
   ═══════════════════════════════════════ */
function ServicesBreadthScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headerIn = spring({ frame, fps, from: 0, to: 1, config: { damping: 12 } });

  // Real categories from the app with exact icons
  const categories = [
    { icon: '🪪', name: 'Identity & Documents', ne: 'नागरिकता र कागजात', count: '13 services', color: '#3b82f6' },
    { icon: '🚗', name: 'Transport & License', ne: 'यातायात र लाइसेन्स', count: '10 services', color: '#f59e0b' },
    { icon: '🧾', name: 'Tax & PAN', ne: 'कर र प्यान', count: '7 services', color: '#f97316' },
    { icon: '🏥', name: 'Health & Hospitals', ne: 'स्वास्थ्य र अस्पताल', count: '10 services', color: '#10b981' },
    { icon: '💡', name: 'Utilities & Bills', ne: 'उपयोगिता र बिल', count: '10 services', color: '#8b5cf6' },
    { icon: '🏢', name: 'Business Registration', ne: 'व्यवसाय दर्ता', count: '8 services', color: '#ec4899' },
    { icon: '📜', name: 'Land & Property', ne: 'जग्गा र सम्पत्ति', count: '6 services', color: '#14b8a6' },
    { icon: '🏦', name: 'Banking', ne: 'बैंकिङ', count: '5 services', color: '#06b6d4' },
    { icon: '🎓', name: 'Education', ne: 'शिक्षा', count: '4 services', color: '#6366f1' },
    { icon: '⚖️', name: 'Legal & Courts', ne: 'कानुनी र अदालत', count: '4 services', color: '#a855f7' },
  ];

  return (
    <AbsoluteFill style={{ background: DARK }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 30% 40%, ${RED}12 0%, transparent 50%), radial-gradient(circle at 70% 60%, ${BLUE}12 0%, transparent 50%)` }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '50px 36px' }}>
        <div style={{ fontSize: 44, fontWeight: 900, color: WHITE, textAlign: 'center', marginBottom: 8, opacity: headerIn }}>
          Every government service.
        </div>
        <div style={{ fontSize: 26, fontWeight: 600, color: GOLD, textAlign: 'center', marginBottom: 40, opacity: headerIn }}>
          नेपालका सबै सरकारी सेवा।
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
          {categories.map((cat, i) => {
            const catIn = spring({ frame: frame - 15 - i * 7, fps, from: 0, to: 1, config: { damping: 12 } });
            return (
              <div key={i} style={{
                width: 220, padding: '16px 14px',
                background: DARK_CARD,
                border: `1px solid ${cat.color}25`,
                borderRadius: 16,
                display: 'flex', alignItems: 'center', gap: 12,
                transform: `scale(${catIn})`, opacity: catIn,
              }}>
                <span style={{ fontSize: 30 }}>{cat.icon}</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: WHITE, lineHeight: 1.2 }}>{cat.name}</div>
                  <div style={{ fontSize: 11, color: GRAY }}>{cat.ne}</div>
                  <div style={{ fontSize: 10, color: cat.color, fontWeight: 600, marginTop: 2 }}>{cat.count}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <BrandBar />
    </AbsoluteFill>
  );
}

/* ═══════════════════════════════════════
   Scene 7: SOCIAL PROOF (38-44s)
   ═══════════════════════════════════════ */
function SocialProofScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stats = [
    { number: '70+', label: 'Government services mapped', labelNe: 'सरकारी सेवाहरू', icon: '🏛️', delay: 10 },
    { number: '10', label: 'Service categories', labelNe: 'सेवा श्रेणीहरू', icon: '📂', delay: 28 },
    { number: '24/7', label: 'AI advisor — voice & text', labelNe: 'एआई सल्लाहकार', icon: '🤖', delay: 46 },
    { number: 'FREE', label: 'No fees, no brokers', labelNe: 'निःशुल्क, दलाल छैन', icon: '🇳🇵', delay: 64 },
  ];

  const headerIn = spring({ frame, fps, from: 0, to: 1, config: { damping: 12 } });

  return (
    <AbsoluteFill style={{ background: DARK }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 40%, ${GOLD}10 0%, transparent 50%)` }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '60px 44px' }}>
        <div style={{
          fontSize: 44, fontWeight: 900, color: WHITE, textAlign: 'center',
          marginBottom: 10, opacity: headerIn, lineHeight: 1.2,
        }}>
          Built for{'\n'}
          <span style={{ color: GOLD }}>every Nepali citizen</span>
        </div>
        <div style={{
          fontSize: 24, fontWeight: 500, color: GRAY, textAlign: 'center',
          marginBottom: 50, opacity: headerIn,
        }}>
          प्रत्येक नेपाली नागरिकका लागि
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%' }}>
          {stats.map((stat, i) => {
            const sIn = spring({ frame: frame - stat.delay, fps, from: 0, to: 1, config: { damping: 10 } });
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 20,
                background: DARK_CARD,
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 20, padding: '20px 24px',
                transform: `translateX(${(1 - sIn) * 60}px)`, opacity: sIn,
              }}>
                <span style={{ fontSize: 36 }}>{stat.icon}</span>
                <div style={{
                  fontSize: 38, fontWeight: 900, color: GOLD,
                  minWidth: 90,
                }}>
                  {stat.number}
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{stat.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: GRAY }}>{stat.labelNe}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <BrandBar />
    </AbsoluteFill>
  );
}

/* ═══════════════════════════════════════
   Scene 8: CTA (44-50s)
   ═══════════════════════════════════════ */
function CTAScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoIn = spring({ frame, fps, from: 2, to: 1, config: { damping: 8, mass: 0.3 } });
  const titleIn = spring({ frame: frame - 15, fps, from: 0, to: 1, config: { damping: 12 } });
  const urlIn = spring({ frame: frame - 35, fps, from: 0, to: 1, config: { damping: 12 } });
  const btnIn = spring({ frame: frame - 55, fps, from: 0, to: 1, config: { damping: 10 } });
  const tagIn = spring({ frame: frame - 75, fps, from: 0, to: 1, config: { damping: 12 } });
  const flashOpacity = interpolate(frame, [0, 5, 15], [0.25, 0.12, 0], { extrapolateRight: 'clamp' });
  const btnPulse = Math.sin(frame * 0.12) * 0.04 + 1;

  // Floating particles
  const particles = Array.from({ length: 6 }, (_, i) => ({
    x: 150 + Math.sin(frame * 0.02 + i * 1.5) * 300,
    y: 200 + Math.cos(frame * 0.015 + i * 2) * 500,
    size: 3 + i * 0.5,
    opacity: 0.15 + Math.sin(frame * 0.04 + i) * 0.1,
    color: i % 2 === 0 ? RED : GOLD,
  }));

  return (
    <AbsoluteFill style={{ background: DARK }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(circle at 50% 40%, ${RED}25 0%, transparent 55%), radial-gradient(circle at 30% 65%, ${BLUE}18 0%, transparent 50%)`,
      }} />
      <div style={{ position: 'absolute', inset: 0, background: RED, opacity: flashOpacity }} />

      {/* Floating particles */}
      {particles.map((p, i) => (
        <div key={i} style={{
          position: 'absolute', left: p.x, top: p.y,
          width: p.size, height: p.size, borderRadius: p.size,
          background: p.color, opacity: p.opacity,
        }} />
      ))}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: 50 }}>
        {/* NR Logo */}
        <div style={{
          width: 110, height: 110, borderRadius: 34,
          background: `linear-gradient(135deg, ${RED}, ${BLUE})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: `scale(${logoIn})`, opacity: logoIn,
          boxShadow: `0 12px 50px ${RED}50, 0 0 80px ${BLUE}20`,
          marginBottom: 30,
        }}>
          <span style={{ fontSize: 48, fontWeight: 900, color: WHITE }}>NR</span>
        </div>

        <div style={{
          fontSize: 48, fontWeight: 900, color: WHITE, textAlign: 'center',
          lineHeight: 1.2, opacity: titleIn,
          textShadow: `0 0 40px ${RED}30`,
        }}>
          Stop wasting{'\n'}days.{'\n'}
          <span style={{ color: GOLD }}>Start in 2 minutes.</span>
        </div>

        <div style={{
          fontSize: 24, fontWeight: 500, color: GRAY, textAlign: 'center',
          marginTop: 12, opacity: titleIn,
        }}>
          दिन बर्बाद गर्न छोड्नुहोस्।
        </div>

        <div style={{
          fontSize: 40, fontWeight: 800, color: GOLD, textAlign: 'center',
          marginTop: 40,
          transform: `translateY(${(1 - urlIn) * 20}px)`, opacity: urlIn,
          textShadow: `0 0 20px ${GOLD}25`,
        }}>
          nepalrepublic.org
        </div>

        {/* CTA button */}
        <div style={{
          marginTop: 40,
          transform: `scale(${btnIn * btnPulse})`, opacity: btnIn,
        }}>
          <div style={{
            background: `linear-gradient(90deg, ${RED}, #b91c1c)`,
            borderRadius: 36, padding: '20px 56px',
            textAlign: 'center',
            boxShadow: `0 8px 40px ${RED}50`,
          }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: WHITE }}>
              Try it FREE →
            </span>
          </div>
        </div>

        <div style={{
          fontSize: 20, fontWeight: 500, color: GRAY, textAlign: 'center',
          marginTop: 20, opacity: tagIn, lineHeight: 1.5,
        }}>
          Works on any device • No download needed{'\n'}
          🇳🇵 Made for Nepal
        </div>
      </div>
      <BrandBar />
    </AbsoluteFill>
  );
}

/* ═══════════════════════════════════════
   MAIN COMPOSITION
   ═══════════════════════════════════════ */
export interface ServicesMarketingData {}

export const ServicesMarketing: React.FC<{ data: ServicesMarketingData }> = () => {
  return (
    <AbsoluteFill style={{ background: DARK, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      {/* ═══ VISUAL SCENES ═══ */}

      {/* 0-3s: Hook */}
      <Sequence from={0} durationInFrames={90}>
        <HookScene />
      </Sequence>

      {/* 3-7s: Pain */}
      <Sequence from={90} durationInFrames={120}>
        <PainScene />
      </Sequence>

      {/* 7-14s: Real landing page */}
      <Sequence from={210} durationInFrames={210}>
        <LandingScene />
      </Sequence>

      {/* 14-22s: AI advisor demo */}
      <Sequence from={420} durationInFrames={240}>
        <AdvisorDemoScene />
      </Sequence>

      {/* 22-30s: Case tracking */}
      <Sequence from={660} durationInFrames={240}>
        <TrackingScene />
      </Sequence>

      {/* 30-38s: Services breadth */}
      <Sequence from={900} durationInFrames={240}>
        <ServicesBreadthScene />
      </Sequence>

      {/* 38-44s: Social proof */}
      <Sequence from={1140} durationInFrames={180}>
        <SocialProofScene />
      </Sequence>

      {/* 44-50s: CTA */}
      <Sequence from={1320} durationInFrames={180}>
        <CTAScene />
      </Sequence>

      {/* ═══ VOICEOVER AUDIO ═══ */}

      {/* Hook narration — starts at 0.3s, gives visuals a moment */}
      <Sequence from={9} durationInFrames={81}>
        <Audio src={staticFile('audio/promo/01-hook.mp3')} volume={1} />
      </Sequence>

      {/* Pain narration */}
      <Sequence from={95} durationInFrames={115}>
        <Audio src={staticFile('audio/promo/02-pain.mp3')} volume={1} />
      </Sequence>

      {/* Landing page narration */}
      <Sequence from={220} durationInFrames={200}>
        <Audio src={staticFile('audio/promo/03-landing.mp3')} volume={1} />
      </Sequence>

      {/* Advisor demo narration */}
      <Sequence from={430} durationInFrames={230}>
        <Audio src={staticFile('audio/promo/04-advisor.mp3')} volume={1} />
      </Sequence>

      {/* Case tracking narration */}
      <Sequence from={670} durationInFrames={230}>
        <Audio src={staticFile('audio/promo/05-tracking.mp3')} volume={1} />
      </Sequence>

      {/* Services breadth narration */}
      <Sequence from={910} durationInFrames={230}>
        <Audio src={staticFile('audio/promo/06-services.mp3')} volume={1} />
      </Sequence>

      {/* Social proof narration */}
      <Sequence from={1150} durationInFrames={170}>
        <Audio src={staticFile('audio/promo/07-proof.mp3')} volume={1} />
      </Sequence>

      {/* CTA narration (English) */}
      <Sequence from={1330} durationInFrames={90}>
        <Audio src={staticFile('audio/promo/08-cta.mp3')} volume={1} />
      </Sequence>

      {/* CTA narration (Nepali — plays after English) */}
      <Sequence from={1420} durationInFrames={80}>
        <Audio src={staticFile('audio/promo/09-hook-ne.mp3')} volume={1} />
      </Sequence>
    </AbsoluteFill>
  );
};
