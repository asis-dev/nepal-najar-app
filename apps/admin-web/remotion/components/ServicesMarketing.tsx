import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  spring,
  Sequence,
  useVideoConfig,
  Easing,
} from 'remotion';

/* ══════════════════════════════════════════════
   SERVICES MARKETING REEL — 45s Facebook ad
   "Stop wasting days. Start in 2 minutes."

   Focus: Passport renewal as hero example,
   then show breadth of services.

   Timeline (1350 frames @ 30fps):
   0-3s     (0-90)        Hook — "Renewing your passport?"
   3-8s     (90-240)      Pain — the old way (queues, confusion)
   8-16s    (240-480)     Demo — AI advisor + task creation
   16-22s   (480-660)     Task tracking mockup
   22-30s   (660-900)     Services breadth showcase
   30-38s   (900-1140)    Social proof / stats
   38-45s   (1140-1350)   CTA
   ══════════════════════════════════════════════ */

const RED = '#DC143C';
const BLUE = '#003893';
const DARK = '#0a0a12';
const DARK_SURFACE = '#111827';
const WHITE = '#ffffff';
const GOLD = '#fbbf24';
const GREEN = '#34d399';
const GRAY = '#94a3b8';

/* ── Phone frame mockup ── */
function PhoneFrame({ children, scale = 1 }: { children: React.ReactNode; scale?: number }) {
  return (
    <div style={{
      width: 380 * scale,
      height: 780 * scale,
      borderRadius: 48 * scale,
      border: `4px solid rgba(255,255,255,0.15)`,
      background: DARK_SURFACE,
      overflow: 'hidden',
      boxShadow: `0 30px 80px rgba(0,0,0,0.6), 0 0 60px ${RED}15`,
      position: 'relative',
    }}>
      {/* Notch */}
      <div style={{
        position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: 160 * scale, height: 28 * scale, borderRadius: `0 0 ${16 * scale}px ${16 * scale}px`,
        background: '#000', zIndex: 10,
      }} />
      {children}
    </div>
  );
}

/* ── Persistent branding bar ── */
function BrandBar() {
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100,
      height: 56, background: `linear-gradient(90deg, ${RED}, ${BLUE})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
    }}>
      <span style={{ fontSize: 22, fontWeight: 900, color: WHITE, letterSpacing: 1.5 }}>NEPAL REPUBLIC</span>
      <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)' }}>|</span>
      <span style={{ fontSize: 18, fontWeight: 700, color: GOLD }}>nepalrepublic.org</span>
    </div>
  );
}

/* ── Scene 1: HOOK (0-3s) — scroll-stopper ── */
function HookScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const textScale = spring({ frame, fps, from: 1.3, to: 1, config: { damping: 8, mass: 0.4 } });
  const textOpacity = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' });
  const subIn = spring({ frame: frame - 20, fps, from: 0, to: 1, config: { damping: 12 } });
  const emojiIn = spring({ frame: frame - 35, fps, from: 3, to: 1, config: { damping: 6, mass: 0.2 } });
  const flashOpacity = interpolate(frame, [0, 4, 12], [0.6, 0.3, 0], { extrapolateRight: 'clamp' });
  const bgShift = interpolate(frame, [0, 90], [0, 15], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: DARK }}>
      {/* Dramatic gradient BG */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse at 50% ${40 + bgShift}%, ${RED}35 0%, transparent 65%)`,
      }} />
      <div style={{ position: 'absolute', inset: 0, background: RED, opacity: flashOpacity }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '0 50px' }}>
        {/* Passport emoji — bounces in */}
        <div style={{
          fontSize: 120, textAlign: 'center',
          transform: `scale(${emojiIn})`, opacity: emojiIn,
          filter: `drop-shadow(0 0 30px ${RED}60)`,
        }}>
          🛂
        </div>

        {/* Main hook text */}
        <div style={{
          fontSize: 54, fontWeight: 900, color: WHITE, textAlign: 'center',
          lineHeight: 1.25, marginTop: 30,
          transform: `scale(${textScale})`, opacity: textOpacity,
          textShadow: `0 4px 30px ${RED}40`,
        }}>
          Renewing your{'\n'}Nepali passport?
        </div>

        {/* Sub hook */}
        <div style={{
          fontSize: 34, fontWeight: 600, color: GOLD, textAlign: 'center',
          marginTop: 24,
          transform: `translateY(${(1 - subIn) * 25}px)`, opacity: subIn,
        }}>
          There's a better way.
        </div>
      </div>
      <BrandBar />
    </AbsoluteFill>
  );
}

/* ── Scene 2: PAIN POINT (3-8s) — old way ── */
function PainScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const items = [
    { icon: '😤', text: 'Hours in line at the passport office', delay: 0 },
    { icon: '📋', text: 'Wrong documents? Start over.', delay: 20 },
    { icon: '🤷', text: '"Which counter do I go to?"', delay: 40 },
    { icon: '💸', text: 'Brokers charging extra fees', delay: 60 },
  ];

  const titleIn = spring({ frame, fps, from: 0, to: 1, config: { damping: 12 } });

  // Red X that crosses it all out at the end
  const crossIn = interpolate(frame, [110, 130], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: DARK }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(180deg, ${DARK} 0%, #1a0000 100%)`,
      }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '80px 50px' }}>
        {/* Title */}
        <div style={{
          fontSize: 42, fontWeight: 900, color: '#ef4444', textAlign: 'center',
          marginBottom: 50, opacity: titleIn,
          textShadow: '0 0 20px rgba(239,68,68,0.3)',
        }}>
          The old way...
        </div>

        {/* Pain items */}
        {items.map((item, i) => {
          const itemIn = spring({ frame: frame - item.delay - 10, fps, from: 0, to: 1, config: { damping: 12 } });
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 20,
              marginBottom: 28,
              transform: `translateX(${(1 - itemIn) * 60}px)`, opacity: itemIn,
            }}>
              <span style={{ fontSize: 48 }}>{item.icon}</span>
              <span style={{ fontSize: 28, fontWeight: 600, color: 'rgba(255,255,255,0.85)', lineHeight: 1.3 }}>
                {item.text}
              </span>
            </div>
          );
        })}

        {/* Big red X crossing it out */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: crossIn,
        }}>
          <div style={{
            fontSize: 400, fontWeight: 900, color: `${RED}50`,
            transform: `scale(${0.5 + crossIn * 0.5}) rotate(-15deg)`,
          }}>
            ✕
          </div>
        </div>
      </div>
      <BrandBar />
    </AbsoluteFill>
  );
}

/* ── Scene 3: AI ADVISOR DEMO (8-16s) — the magic ── */
function AdvisorDemoScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Typing "I need to renew my passport"
  const userText = 'I need to renew my passport';
  const typingProgress = interpolate(frame, [15, 55], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const visibleChars = Math.floor(typingProgress * userText.length);
  const typedText = userText.slice(0, visibleChars);
  const cursorBlink = Math.sin(frame * 0.4) > 0;

  // AI response appears
  const aiIn = spring({ frame: frame - 65, fps, from: 0, to: 1, config: { damping: 12 } });

  // Checklist items appear
  const checkItems = [
    { text: 'Documents you need', icon: '📄', delay: 95 },
    { text: 'Fees: NPR 5,000', icon: '💰', delay: 110 },
    { text: 'Processing: 3 weeks', icon: '⏱️', delay: 125 },
    { text: 'Nearest office found', icon: '📍', delay: 140 },
  ];

  // Start task button
  const btnIn = spring({ frame: frame - 160, fps, from: 0, to: 1, config: { damping: 10 } });
  const btnPulse = Math.sin(frame * 0.12) * 0.04 + 1;

  const headerIn = spring({ frame, fps, from: 0, to: 1, config: { damping: 15 } });

  return (
    <AbsoluteFill style={{ background: DARK }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(circle at 50% 30%, ${BLUE}20 0%, transparent 60%)`,
      }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 40px 80px' }}>
        {/* "The Nepal Republic way" header */}
        <div style={{
          fontSize: 36, fontWeight: 900, color: GREEN, textAlign: 'center',
          marginBottom: 30, opacity: headerIn,
        }}>
          ✨ The new way
        </div>

        {/* Phone mockup with app */}
        <PhoneFrame scale={1.05}>
          <div style={{ padding: '40px 20px 20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Mini app header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '0 4px',
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: `linear-gradient(135deg, ${RED}, ${BLUE})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 900, color: WHITE,
              }}>NR</div>
              <span style={{ fontSize: 14, fontWeight: 700, color: WHITE }}>Nepal Republic</span>
              <span style={{ fontSize: 11, color: GRAY, marginLeft: 'auto' }}>Services</span>
            </div>

            {/* "What can I help you with?" */}
            <div style={{
              fontSize: 16, fontWeight: 700, color: WHITE, textAlign: 'center',
              marginBottom: 12,
            }}>
              What can I help you with?
            </div>

            {/* User input bubble */}
            <div style={{
              background: 'rgba(30,41,59,0.9)', borderRadius: 16, padding: '12px 16px',
              marginBottom: 12, marginLeft: 'auto', maxWidth: '85%',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: WHITE, lineHeight: 1.4 }}>
                {typedText}
                {cursorBlink && typingProgress < 1 && (
                  <span style={{ color: GOLD, fontWeight: 300 }}>|</span>
                )}
              </div>
            </div>

            {/* AI response */}
            <div style={{
              background: `linear-gradient(135deg, ${RED}15, ${BLUE}15)`,
              borderRadius: 16, padding: '12px 16px',
              marginBottom: 12, maxWidth: '90%',
              border: `1px solid ${GREEN}30`,
              transform: `translateY(${(1 - aiIn) * 20}px)`, opacity: aiIn,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 12 }}>🤖</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: GOLD }}>AI Advisor</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, color: WHITE, lineHeight: 1.4 }}>
                I'll help you renew your passport. Here's everything you need:
              </div>
            </div>

            {/* Checklist */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0 4px' }}>
              {checkItems.map((item, i) => {
                const cIn = spring({ frame: frame - item.delay, fps, from: 0, to: 1, config: { damping: 12 } });
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    opacity: cIn, transform: `translateX(${(1 - cIn) * 20}px)`,
                  }}>
                    <span style={{ fontSize: 16 }}>{item.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.85)' }}>
                      {item.text}
                    </span>
                    <span style={{ fontSize: 14, color: GREEN, marginLeft: 'auto' }}>✓</span>
                  </div>
                );
              })}
            </div>

            {/* Start task button */}
            <div style={{
              marginTop: 'auto', marginBottom: 8,
              transform: `scale(${btnIn * btnPulse})`, opacity: btnIn,
            }}>
              <div style={{
                background: `linear-gradient(90deg, ${RED}, #b91c1c)`,
                borderRadius: 12, padding: '12px 20px',
                textAlign: 'center',
                boxShadow: `0 4px 20px ${RED}40`,
              }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: WHITE }}>
                  🚀 Start my passport renewal
                </span>
              </div>
            </div>
          </div>
        </PhoneFrame>
      </div>
      <BrandBar />
    </AbsoluteFill>
  );
}

/* ── Scene 4: TASK TRACKING (16-22s) ── */
function TrackingScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerIn = spring({ frame, fps, from: 0, to: 1, config: { damping: 12 } });

  // Progress animation
  const progress = interpolate(frame, [20, 120], [0, 75], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const steps = [
    { label: 'Documents collected', done: true, delay: 30 },
    { label: 'Application submitted', done: true, delay: 50 },
    { label: 'Payment confirmed', done: true, delay: 70 },
    { label: 'Processing...', done: false, delay: 90 },
    { label: 'Ready for pickup', done: false, delay: 110 },
  ];

  return (
    <AbsoluteFill style={{ background: DARK }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(circle at 50% 60%, ${BLUE}20 0%, transparent 55%)`,
      }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 50px' }}>
        <div style={{
          fontSize: 40, fontWeight: 900, color: WHITE, textAlign: 'center',
          marginBottom: 15, opacity: headerIn,
        }}>
          Track every step
        </div>
        <div style={{
          fontSize: 26, fontWeight: 500, color: GRAY, textAlign: 'center',
          marginBottom: 40, opacity: headerIn,
        }}>
          Know exactly where your application is
        </div>

        {/* Phone with tracking UI */}
        <PhoneFrame scale={1.05}>
          <div style={{ padding: '40px 20px 20px', height: '100%' }}>
            {/* Task header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
            }}>
              <span style={{ fontSize: 28 }}>🛂</span>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: WHITE }}>Passport Renewal</div>
                <div style={{ fontSize: 12, color: GRAY }}>Department of Passports</div>
              </div>
            </div>

            {/* Progress ring */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 24,
            }}>
              <div style={{ position: 'relative', width: 100, height: 100 }}>
                <svg width="100" height="100" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke={GREEN} strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 42}`}
                    strokeDashoffset={`${2 * Math.PI * 42 * (1 - progress / 100)}`}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, fontWeight: 900, color: WHITE,
                }}>
                  {Math.round(progress)}%
                </div>
              </div>
            </div>

            {/* Timeline steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: '0 10px' }}>
              {steps.map((step, i) => {
                const sIn = spring({ frame: frame - step.delay, fps, from: 0, to: 1, config: { damping: 12 } });
                const isDone = step.done;
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    opacity: sIn,
                    marginBottom: 6,
                  }}>
                    {/* Timeline line + dot */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20 }}>
                      <div style={{
                        width: 16, height: 16, borderRadius: 8,
                        background: isDone ? GREEN : 'rgba(255,255,255,0.2)',
                        border: isDone ? 'none' : '2px solid rgba(255,255,255,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, color: DARK, fontWeight: 900,
                      }}>
                        {isDone ? '✓' : ''}
                      </div>
                      {i < steps.length - 1 && (
                        <div style={{
                          width: 2, height: 28,
                          background: isDone ? `${GREEN}50` : 'rgba(255,255,255,0.1)',
                        }} />
                      )}
                    </div>
                    <div style={{
                      fontSize: 14, fontWeight: isDone ? 600 : 500,
                      color: isDone ? WHITE : GRAY,
                      paddingTop: 0,
                    }}>
                      {step.label}
                      {!isDone && i === 3 && (
                        <span style={{
                          display: 'inline-block', marginLeft: 6,
                          width: 8, height: 8, borderRadius: 4,
                          background: GOLD,
                          opacity: Math.sin(frame * 0.15) * 0.5 + 0.5,
                        }} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </PhoneFrame>
      </div>
      <BrandBar />
    </AbsoluteFill>
  );
}

/* ── Scene 5: SERVICES BREADTH (22-30s) ── */
function ServicesBreadthScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerIn = spring({ frame, fps, from: 0, to: 1, config: { damping: 12 } });

  const categories = [
    { icon: '🛂', name: 'Passport', color: '#ef4444' },
    { icon: '🪪', name: 'Citizenship', color: '#3b82f6' },
    { icon: '🚗', name: 'License', color: '#f59e0b' },
    { icon: '🏥', name: 'Hospital', color: '#10b981' },
    { icon: '💡', name: 'Electricity', color: '#8b5cf6' },
    { icon: '🏦', name: 'Banking', color: '#06b6d4' },
    { icon: '🏠', name: 'Land & Property', color: '#ec4899' },
    { icon: '📊', name: 'Tax & PAN', color: '#f97316' },
    { icon: '⚖️', name: 'Legal', color: '#14b8a6' },
    { icon: '🎓', name: 'Education', color: '#6366f1' },
    { icon: '🚰', name: 'Water', color: '#0ea5e9' },
    { icon: '📱', name: '70+ more', color: RED },
  ];

  return (
    <AbsoluteFill style={{ background: DARK }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(circle at 30% 50%, ${RED}15 0%, transparent 50%), radial-gradient(circle at 70% 50%, ${BLUE}15 0%, transparent 50%)`,
      }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 40px' }}>
        <div style={{
          fontSize: 44, fontWeight: 900, color: WHITE, textAlign: 'center',
          marginBottom: 10, opacity: headerIn,
        }}>
          Not just passports.
        </div>
        <div style={{
          fontSize: 30, fontWeight: 600, color: GOLD, textAlign: 'center',
          marginBottom: 50, opacity: headerIn,
        }}>
          Every government service.
        </div>

        {/* Services grid */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center',
          padding: '0 10px',
        }}>
          {categories.map((cat, i) => {
            const catIn = spring({ frame: frame - 20 - i * 8, fps, from: 0, to: 1, config: { damping: 12 } });
            return (
              <div key={i} style={{
                width: 200, padding: '20px 16px',
                background: `${cat.color}12`,
                border: `1px solid ${cat.color}30`,
                borderRadius: 20,
                display: 'flex', alignItems: 'center', gap: 12,
                transform: `scale(${catIn})`, opacity: catIn,
              }}>
                <span style={{ fontSize: 32 }}>{cat.icon}</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: WHITE }}>
                  {cat.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <BrandBar />
    </AbsoluteFill>
  );
}

/* ── Scene 6: SOCIAL PROOF (30-38s) ── */
function SocialProofScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stats = [
    { number: '70+', label: 'Government services', delay: 10 },
    { number: '10', label: 'Service categories', delay: 30 },
    { number: '24/7', label: 'AI advisor available', delay: 50 },
    { number: 'FREE', label: 'Free to use', delay: 70 },
  ];

  const headerIn = spring({ frame, fps, from: 0, to: 1, config: { damping: 12 } });

  return (
    <AbsoluteFill style={{ background: DARK }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(circle at 50% 40%, ${GOLD}12 0%, transparent 50%)`,
      }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '60px 50px' }}>
        <div style={{
          fontSize: 44, fontWeight: 900, color: WHITE, textAlign: 'center',
          marginBottom: 60, opacity: headerIn, lineHeight: 1.3,
        }}>
          Built for{'\n'}
          <span style={{ color: GOLD }}>every Nepali citizen</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 30, width: '100%' }}>
          {stats.map((stat, i) => {
            const sIn = spring({ frame: frame - stat.delay, fps, from: 0, to: 1, config: { damping: 10 } });
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 24,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 24, padding: '24px 32px',
                transform: `translateX(${(1 - sIn) * 80}px)`, opacity: sIn,
              }}>
                <div style={{
                  fontSize: 42, fontWeight: 900, color: GOLD,
                  minWidth: 100, textAlign: 'center',
                }}>
                  {stat.number}
                </div>
                <div style={{
                  fontSize: 24, fontWeight: 600, color: 'rgba(255,255,255,0.8)',
                }}>
                  {stat.label}
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

/* ── Scene 7: CTA (38-45s) ── */
function CTAScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoIn = spring({ frame, fps, from: 2, to: 1, config: { damping: 8, mass: 0.3 } });
  const titleIn = spring({ frame: frame - 15, fps, from: 0, to: 1, config: { damping: 12 } });
  const urlIn = spring({ frame: frame - 30, fps, from: 0, to: 1, config: { damping: 12 } });
  const btnIn = spring({ frame: frame - 50, fps, from: 0, to: 1, config: { damping: 10 } });
  const tagIn = spring({ frame: frame - 70, fps, from: 0, to: 1, config: { damping: 12 } });
  const flashOpacity = interpolate(frame, [0, 5, 15], [0.3, 0.15, 0], { extrapolateRight: 'clamp' });
  const btnPulse = Math.sin(frame * 0.12) * 0.05 + 1;

  return (
    <AbsoluteFill style={{ background: DARK }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(circle at 50% 45%, ${RED}30 0%, transparent 60%), radial-gradient(circle at 30% 70%, ${BLUE}20 0%, transparent 50%)`,
      }} />
      <div style={{ position: 'absolute', inset: 0, background: RED, opacity: flashOpacity }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: 60 }}>
        {/* NR Logo */}
        <div style={{
          width: 100, height: 100, borderRadius: 30,
          background: `linear-gradient(135deg, ${RED}, ${BLUE})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: `scale(${logoIn})`, opacity: logoIn,
          boxShadow: `0 10px 40px ${RED}50`,
          marginBottom: 30,
        }}>
          <span style={{ fontSize: 44, fontWeight: 900, color: WHITE }}>NR</span>
        </div>

        <div style={{
          fontSize: 52, fontWeight: 900, color: WHITE, textAlign: 'center',
          lineHeight: 1.2, opacity: titleIn,
          textShadow: `0 0 30px ${RED}40`,
        }}>
          Stop wasting days.{'\n'}
          <span style={{ color: GOLD }}>Start in 2 minutes.</span>
        </div>

        <div style={{
          fontSize: 44, fontWeight: 800, color: GOLD, textAlign: 'center',
          marginTop: 40,
          transform: `translateY(${(1 - urlIn) * 20}px)`, opacity: urlIn,
          textShadow: `0 0 15px ${GOLD}30`,
        }}>
          nepalrepublic.org
        </div>

        {/* CTA button */}
        <div style={{
          marginTop: 50,
          transform: `scale(${btnIn * btnPulse})`, opacity: btnIn,
        }}>
          <div style={{
            background: `linear-gradient(90deg, ${RED}, #b91c1c)`,
            borderRadius: 40, padding: '22px 64px',
            textAlign: 'center',
            boxShadow: `0 8px 40px ${RED}60`,
          }}>
            <span style={{ fontSize: 30, fontWeight: 900, color: WHITE }}>
              Try it FREE →
            </span>
          </div>
        </div>

        <div style={{
          fontSize: 22, fontWeight: 500, color: GRAY, textAlign: 'center',
          marginTop: 24, opacity: tagIn, lineHeight: 1.5,
        }}>
          Free to use • Works on any device{'\n'}
          🇳🇵 Made for Nepal
        </div>
      </div>
      <BrandBar />
    </AbsoluteFill>
  );
}

/* ── MAIN COMPOSITION ── */
export interface ServicesMarketingData {}

export const ServicesMarketing: React.FC<{ data: ServicesMarketingData }> = () => {
  return (
    <AbsoluteFill style={{ background: DARK }}>
      {/* 0-3s: Hook */}
      <Sequence from={0} durationInFrames={90}>
        <HookScene />
      </Sequence>

      {/* 3-8s: Pain */}
      <Sequence from={90} durationInFrames={150}>
        <PainScene />
      </Sequence>

      {/* 8-16s: AI advisor demo */}
      <Sequence from={240} durationInFrames={240}>
        <AdvisorDemoScene />
      </Sequence>

      {/* 16-22s: Task tracking */}
      <Sequence from={480} durationInFrames={180}>
        <TrackingScene />
      </Sequence>

      {/* 22-30s: Services breadth */}
      <Sequence from={660} durationInFrames={240}>
        <ServicesBreadthScene />
      </Sequence>

      {/* 30-38s: Social proof */}
      <Sequence from={900} durationInFrames={240}>
        <SocialProofScene />
      </Sequence>

      {/* 38-45s: CTA */}
      <Sequence from={1140} durationInFrames={210}>
        <CTAScene />
      </Sequence>
    </AbsoluteFill>
  );
};
