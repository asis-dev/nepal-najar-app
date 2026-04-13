import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  spring,
  Sequence,
  useVideoConfig,
} from 'remotion';

/* ══════════════════════════════════════════════
   APP WALKTHROUGH — 40s Facebook demo video
   Shows the actual app experience step by step

   Timeline (1200 frames @ 30fps):
   0-3s     (0-90)        Hook — "Government services, simplified"
   3-9s     (90-270)      Step 1 — Open advisor, type question
   9-15s    (270-450)     Step 2 — AI responds with full guide
   15-21s   (450-630)     Step 3 — Start task, auto-fills documents
   21-27s   (630-810)     Step 4 — Track progress
   27-33s   (810-990)     Step 5 — Services showcase
   33-40s   (990-1200)    CTA
   ══════════════════════════════════════════════ */

const RED = '#DC143C';
const BLUE = '#003893';
const DARK = '#0a0a12';
const DARK_SURFACE = '#111827';
const WHITE = '#ffffff';
const GOLD = '#fbbf24';
const GREEN = '#34d399';
const GRAY = '#94a3b8';

/* ── Step indicator ── */
function StepBadge({ step, total, label }: { step: number; total: number; label: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      marginBottom: 20,
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 28,
        background: `linear-gradient(135deg, ${RED}, ${BLUE})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24, fontWeight: 900, color: WHITE,
        boxShadow: `0 4px 20px ${RED}50`,
      }}>
        {step}/{total}
      </div>
      <span style={{ fontSize: 26, fontWeight: 700, color: GOLD }}>{label}</span>
    </div>
  );
}

/* ── Phone mockup ── */
function PhoneMockup({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      width: 400, height: 740,
      borderRadius: 44, border: '3px solid rgba(255,255,255,0.12)',
      background: DARK_SURFACE, overflow: 'hidden',
      boxShadow: `0 25px 70px rgba(0,0,0,0.5), 0 0 50px ${BLUE}10`,
      position: 'relative',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: 140, height: 26, borderRadius: '0 0 14px 14px',
        background: '#000', zIndex: 10,
      }} />
      {children}
    </div>
  );
}

/* ── Brand bar ── */
function BrandBar() {
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100,
      height: 52, background: `linear-gradient(90deg, ${RED}, ${BLUE})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    }}>
      <span style={{ fontSize: 20, fontWeight: 900, color: WHITE, letterSpacing: 1.5 }}>NEPAL REPUBLIC</span>
      <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>|</span>
      <span style={{ fontSize: 16, fontWeight: 700, color: GOLD }}>nepalrepublic.org</span>
    </div>
  );
}

/* ── Scene 1: HOOK ── */
function HookScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logoIn = spring({ frame, fps, from: 2.5, to: 1, config: { damping: 7, mass: 0.3 } });
  const titleIn = spring({ frame: frame - 15, fps, from: 0, to: 1, config: { damping: 12 } });
  const subIn = spring({ frame: frame - 30, fps, from: 0, to: 1, config: { damping: 12 } });
  const tagIn = spring({ frame: frame - 50, fps, from: 0, to: 1, config: { damping: 12 } });
  const flashOpacity = interpolate(frame, [0, 5, 12], [0.5, 0.2, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: DARK }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(circle at 50% 40%, ${RED}25 0%, transparent 55%), radial-gradient(circle at 70% 70%, ${BLUE}20 0%, transparent 50%)`,
      }} />
      <div style={{ position: 'absolute', inset: 0, background: RED, opacity: flashOpacity }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: 60 }}>
        {/* Logo */}
        <div style={{
          width: 120, height: 120, borderRadius: 36,
          background: `linear-gradient(135deg, ${RED}, ${BLUE})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: `scale(${logoIn})`, opacity: logoIn,
          boxShadow: `0 12px 50px ${RED}50`,
        }}>
          <span style={{ fontSize: 52, fontWeight: 900, color: WHITE }}>NR</span>
        </div>

        <div style={{
          fontSize: 50, fontWeight: 900, color: WHITE, textAlign: 'center',
          lineHeight: 1.25, marginTop: 30,
          opacity: titleIn,
        }}>
          Government services,{'\n'}simplified.
        </div>

        <div style={{
          fontSize: 28, fontWeight: 600, color: GRAY, textAlign: 'center',
          marginTop: 20, opacity: subIn,
        }}>
          Here's how it works →
        </div>

        {/* 5 step dots */}
        <div style={{
          display: 'flex', gap: 10, marginTop: 40, opacity: tagIn,
        }}>
          {[1, 2, 3, 4, 5].map(n => (
            <div key={n} style={{
              width: 12, height: 12, borderRadius: 6,
              background: 'rgba(255,255,255,0.3)',
            }} />
          ))}
        </div>
      </div>
      <BrandBar />
    </AbsoluteFill>
  );
}

/* ── Scene 2: Ask the advisor ── */
function AskAdvisorScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const phoneIn = spring({ frame, fps, from: 0.8, to: 1, config: { damping: 12 } });

  // Type "I need to renew my passport"
  const userText = 'I need to renew my passport';
  const typingProgress = interpolate(frame, [30, 80], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const visibleChars = Math.floor(typingProgress * userText.length);
  const typedText = userText.slice(0, visibleChars);
  const cursorBlink = Math.sin(frame * 0.4) > 0;

  // Quick suggestions appear first
  const suggestIn = spring({ frame: frame - 10, fps, from: 0, to: 1, config: { damping: 12 } });

  return (
    <AbsoluteFill style={{ background: DARK }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(circle at 50% 60%, ${BLUE}15 0%, transparent 50%)`,
      }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '50px 40px 70px' }}>
        <StepBadge step={1} total={5} label="Ask anything" />

        <PhoneMockup>
          <div style={{ padding: '36px 16px 16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* App header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{
                width: 24, height: 24, borderRadius: 6,
                background: `linear-gradient(135deg, ${RED}, ${BLUE})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 900, color: WHITE,
              }}>NR</div>
              <span style={{ fontSize: 13, fontWeight: 600, color: WHITE }}>Nepal Services Directory</span>
            </div>

            <div style={{
              fontSize: 18, fontWeight: 700, color: WHITE, textAlign: 'center',
              marginBottom: 14,
            }}>
              What can I help you with?
            </div>

            {/* Input box */}
            <div style={{
              background: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: '14px 16px',
              border: `2px solid ${RED}50`,
              marginBottom: 14,
              transform: `scale(${phoneIn})`,
            }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: WHITE }}>
                {typedText}
                {cursorBlink && typingProgress < 1 && (
                  <span style={{ color: GOLD }}>|</span>
                )}
                {typingProgress === 0 && (
                  <span style={{ color: GRAY }}>Report a broken road near me...</span>
                )}
              </div>
            </div>

            {/* Quick suggestion chips */}
            <div style={{
              display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center',
              marginBottom: 20, opacity: suggestIn,
            }}>
              {['Passport', 'Citizenship', 'License', 'Report'].map(s => (
                <div key={s} style={{
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 12, padding: '6px 14px',
                  fontSize: 12, fontWeight: 600, color: GRAY,
                }}>
                  {s}
                </div>
              ))}
            </div>

            {/* Service categories grid */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '0 4px' }}>
              {[
                { icon: '🪪', name: 'Identity', count: '13' },
                { icon: '🚗', name: 'Transport', count: '10' },
                { icon: '📊', name: 'Tax', count: '7' },
                { icon: '🏥', name: 'Health', count: '10' },
                { icon: '💡', name: 'Utilities', count: '10' },
                { icon: '🏦', name: 'Banking', count: '5' },
              ].map((cat, i) => {
                const cIn = spring({ frame: frame - 5 - i * 5, fps, from: 0, to: 1, config: { damping: 12 } });
                return (
                  <div key={i} style={{
                    width: '30%', padding: '10px 8px',
                    background: 'rgba(255,255,255,0.04)', borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.06)',
                    opacity: cIn, transform: `scale(${cIn})`,
                  }}>
                    <span style={{ fontSize: 20 }}>{cat.icon}</span>
                    <div style={{ fontSize: 11, fontWeight: 600, color: WHITE, marginTop: 2 }}>{cat.name}</div>
                    <div style={{ fontSize: 9, color: GRAY }}>{cat.count} services</div>
                  </div>
                );
              })}
            </div>
          </div>
        </PhoneMockup>
      </div>
      <BrandBar />
    </AbsoluteFill>
  );
}

/* ── Scene 3: AI responds ── */
function AIResponseScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const items = [
    { icon: '📄', label: 'Old passport + copies', delay: 30 },
    { icon: '📸', label: '2 passport photos', delay: 45 },
    { icon: '🪪', label: 'Citizenship certificate', delay: 60 },
    { icon: '💰', label: 'Fee: NPR 5,000', delay: 75 },
    { icon: '⏱️', label: 'Processing: ~3 weeks', delay: 90 },
    { icon: '📍', label: 'Dept. of Passports, Tripureshwor', delay: 105 },
  ];

  const headerIn = spring({ frame, fps, from: 0, to: 1, config: { damping: 12 } });
  const aiIn = spring({ frame: frame - 10, fps, from: 0, to: 1, config: { damping: 12 } });

  return (
    <AbsoluteFill style={{ background: DARK }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(circle at 50% 40%, ${GREEN}10 0%, transparent 50%)`,
      }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '50px 40px 70px' }}>
        <StepBadge step={2} total={5} label="Get instant answers" />

        <PhoneMockup>
          <div style={{ padding: '36px 16px 16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* User message (small, at top) */}
            <div style={{
              background: 'rgba(30,41,59,0.8)', borderRadius: 14, padding: '10px 14px',
              marginBottom: 10, marginLeft: 'auto', maxWidth: '80%',
            }}>
              <div style={{ fontSize: 13, color: WHITE }}>I need to renew my passport</div>
            </div>

            {/* AI response card */}
            <div style={{
              background: `linear-gradient(135deg, ${RED}10, ${BLUE}10)`,
              borderRadius: 16, padding: '14px 16px',
              border: `1px solid ${GREEN}25`,
              opacity: aiIn, transform: `translateY(${(1 - aiIn) * 15}px)`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 14 }}>🤖</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: GOLD }}>AI Advisor</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, color: WHITE, marginBottom: 12 }}>
                Here's everything you need for passport renewal:
              </div>

              {/* Checklist */}
              {items.map((item, i) => {
                const iIn = spring({ frame: frame - item.delay, fps, from: 0, to: 1, config: { damping: 12 } });
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6,
                    opacity: iIn, transform: `translateX(${(1 - iIn) * 15}px)`,
                  }}>
                    <span style={{ fontSize: 14 }}>{item.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.85)' }}>
                      {item.label}
                    </span>
                    <span style={{ fontSize: 12, color: GREEN, marginLeft: 'auto' }}>✓</span>
                  </div>
                );
              })}
            </div>

            {/* Routing badge */}
            <div style={{
              marginTop: 10, display: 'flex', justifyContent: 'center',
              opacity: interpolate(frame, [120, 140], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            }}>
              <div style={{
                background: `${GREEN}15`, border: `1px solid ${GREEN}30`,
                borderRadius: 12, padding: '8px 16px',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{ fontSize: 14, color: GREEN }}>✓</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: GREEN }}>
                  Routed to Dept. of Passports
                </span>
              </div>
            </div>
          </div>
        </PhoneMockup>
      </div>
      <BrandBar />
    </AbsoluteFill>
  );
}

/* ── Scene 4: Start & track ── */
function TrackScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = interpolate(frame, [30, 140], [0, 60], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const steps = [
    { label: 'Documents collected', done: true, delay: 40 },
    { label: 'Application submitted', done: true, delay: 60 },
    { label: 'Payment confirmed', done: true, delay: 80 },
    { label: 'Under review', done: false, active: true, delay: 100 },
    { label: 'Ready for pickup', done: false, active: false, delay: 120 },
  ];

  return (
    <AbsoluteFill style={{ background: DARK }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(circle at 50% 50%, ${GREEN}12 0%, transparent 50%)`,
      }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '50px 40px 70px' }}>
        <StepBadge step={3} total={5} label="Track progress" />

        <PhoneMockup>
          <div style={{ padding: '36px 20px 16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Task header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
              background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: '12px 14px',
            }}>
              <span style={{ fontSize: 28 }}>🛂</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: WHITE }}>Passport Renewal</div>
                <div style={{ fontSize: 11, color: GRAY }}>Dept. of Passports</div>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: GREEN }}>{Math.round(progress)}%</div>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{
              height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.08)',
              overflow: 'hidden', marginBottom: 24,
            }}>
              <div style={{
                height: '100%', borderRadius: 4,
                background: `linear-gradient(90deg, ${GREEN}, ${GREEN}cc)`,
                width: `${progress}%`,
              }} />
            </div>

            {/* Timeline */}
            {steps.map((step, i) => {
              const sIn = spring({ frame: frame - step.delay, fps, from: 0, to: 1, config: { damping: 12 } });
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 2,
                  opacity: sIn,
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20 }}>
                    <div style={{
                      width: 16, height: 16, borderRadius: 8,
                      background: step.done ? GREEN : step.active ? GOLD : 'rgba(255,255,255,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, color: DARK, fontWeight: 900,
                    }}>
                      {step.done ? '✓' : step.active ? '●' : ''}
                    </div>
                    {i < steps.length - 1 && (
                      <div style={{
                        width: 2, height: 24,
                        background: step.done ? `${GREEN}40` : 'rgba(255,255,255,0.08)',
                      }} />
                    )}
                  </div>
                  <span style={{
                    fontSize: 13, fontWeight: step.done || step.active ? 600 : 400,
                    color: step.done ? WHITE : step.active ? GOLD : GRAY,
                  }}>
                    {step.label}
                    {step.active && (
                      <span style={{
                        display: 'inline-block', marginLeft: 6,
                        width: 6, height: 6, borderRadius: 3,
                        background: GOLD,
                        opacity: Math.sin(frame * 0.15) * 0.5 + 0.5,
                      }} />
                    )}
                  </span>
                </div>
              );
            })}

            {/* Notification preview */}
            <div style={{
              marginTop: 'auto', padding: '10px 14px',
              background: `${BLUE}15`, border: `1px solid ${BLUE}30`,
              borderRadius: 12, marginBottom: 8,
              opacity: interpolate(frame, [140, 160], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: WHITE }}>🔔 You'll be notified at every step</div>
              <div style={{ fontSize: 10, color: GRAY }}>SMS + in-app notifications</div>
            </div>
          </div>
        </PhoneMockup>
      </div>
      <BrandBar />
    </AbsoluteFill>
  );
}

/* ── Scene 5: More services ── */
function MoreServicesScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerIn = spring({ frame, fps, from: 0, to: 1, config: { damping: 12 } });

  const services = [
    { icon: '🛂', name: 'Passport', sub: 'New & renewal' },
    { icon: '🪪', name: 'Citizenship', sub: 'Certificate' },
    { icon: '🚗', name: 'Driving License', sub: 'New, renewal, trial' },
    { icon: '🏥', name: 'Hospital OPD', sub: 'Appointments' },
    { icon: '💡', name: 'Electricity Bill', sub: 'NEA payments' },
    { icon: '📊', name: 'PAN Card', sub: 'Tax registration' },
    { icon: '🚰', name: 'Water Bill', sub: 'KUKL payments' },
    { icon: '🏠', name: 'Land Registration', sub: 'Property transfer' },
    { icon: '📱', name: '+ 60 more', sub: 'All services →' },
  ];

  return (
    <AbsoluteFill style={{ background: DARK }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(circle at 30% 40%, ${RED}12 0%, transparent 50%), radial-gradient(circle at 70% 60%, ${BLUE}12 0%, transparent 50%)`,
      }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '50px 40px 70px' }}>
        <StepBadge step={4} total={5} label="70+ services" />

        <div style={{
          fontSize: 38, fontWeight: 900, color: WHITE, textAlign: 'center',
          marginBottom: 8, opacity: headerIn,
        }}>
          Everything in{'\n'}one place
        </div>
        <div style={{
          fontSize: 22, fontWeight: 500, color: GRAY, textAlign: 'center',
          marginBottom: 30, opacity: headerIn,
        }}>
          Documents • Fees • Steps • Offices
        </div>

        {/* Services grid */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center',
          maxWidth: 900,
        }}>
          {services.map((svc, i) => {
            const sIn = spring({ frame: frame - 15 - i * 7, fps, from: 0, to: 1, config: { damping: 12 } });
            const isLast = i === services.length - 1;
            return (
              <div key={i} style={{
                width: 260, padding: '18px 20px',
                background: isLast ? `${RED}15` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${isLast ? `${RED}30` : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 18,
                display: 'flex', alignItems: 'center', gap: 14,
                transform: `scale(${sIn})`, opacity: sIn,
              }}>
                <span style={{ fontSize: 30 }}>{svc.icon}</span>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: isLast ? GOLD : WHITE }}>{svc.name}</div>
                  <div style={{ fontSize: 12, color: GRAY }}>{svc.sub}</div>
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

/* ── Scene 6: CTA ── */
function CTAScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoIn = spring({ frame, fps, from: 2, to: 1, config: { damping: 8, mass: 0.3 } });
  const titleIn = spring({ frame: frame - 15, fps, from: 0, to: 1, config: { damping: 12 } });
  const urlIn = spring({ frame: frame - 35, fps, from: 0, to: 1, config: { damping: 12 } });
  const btnIn = spring({ frame: frame - 55, fps, from: 0, to: 1, config: { damping: 10 } });
  const tagIn = spring({ frame: frame - 75, fps, from: 0, to: 1, config: { damping: 12 } });
  const btnPulse = Math.sin(frame * 0.12) * 0.05 + 1;

  // Step dots — all filled
  const dotsIn = spring({ frame: frame - 90, fps, from: 0, to: 1, config: { damping: 12 } });

  return (
    <AbsoluteFill style={{ background: DARK }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(circle at 50% 45%, ${RED}28 0%, transparent 60%), radial-gradient(circle at 30% 70%, ${BLUE}20 0%, transparent 50%)`,
      }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: 60 }}>
        <StepBadge step={5} total={5} label="Get started" />

        <div style={{
          width: 100, height: 100, borderRadius: 30,
          background: `linear-gradient(135deg, ${RED}, ${BLUE})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: `scale(${logoIn})`, boxShadow: `0 10px 40px ${RED}50`,
          marginBottom: 30,
        }}>
          <span style={{ fontSize: 44, fontWeight: 900, color: WHITE }}>NR</span>
        </div>

        <div style={{
          fontSize: 46, fontWeight: 900, color: WHITE, textAlign: 'center',
          lineHeight: 1.25, opacity: titleIn,
        }}>
          Your government{'\n'}services assistant.
        </div>

        <div style={{
          fontSize: 40, fontWeight: 800, color: GOLD, textAlign: 'center',
          marginTop: 30,
          transform: `translateY(${(1 - urlIn) * 20}px)`, opacity: urlIn,
        }}>
          nepalrepublic.org
        </div>

        <div style={{
          marginTop: 40,
          transform: `scale(${btnIn * btnPulse})`, opacity: btnIn,
        }}>
          <div style={{
            background: `linear-gradient(90deg, ${RED}, #b91c1c)`,
            borderRadius: 36, padding: '20px 56px',
            textAlign: 'center',
            boxShadow: `0 8px 40px ${RED}60`,
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
          Free to use • Works on any device{'\n'}
          🇳🇵 Made for Nepal
        </div>

        {/* Completed step dots */}
        <div style={{ display: 'flex', gap: 8, marginTop: 30, opacity: dotsIn }}>
          {[1, 2, 3, 4, 5].map(n => (
            <div key={n} style={{
              width: 10, height: 10, borderRadius: 5,
              background: GREEN,
            }} />
          ))}
        </div>
      </div>
      <BrandBar />
    </AbsoluteFill>
  );
}

/* ── MAIN COMPOSITION ── */
export interface AppWalkthroughData {}

export const AppWalkthrough: React.FC<{ data: AppWalkthroughData }> = () => {
  return (
    <AbsoluteFill style={{ background: DARK }}>
      {/* 0-3s: Hook */}
      <Sequence from={0} durationInFrames={90}>
        <HookScene />
      </Sequence>

      {/* 3-9s: Ask advisor */}
      <Sequence from={90} durationInFrames={180}>
        <AskAdvisorScene />
      </Sequence>

      {/* 9-15s: AI responds */}
      <Sequence from={270} durationInFrames={180}>
        <AIResponseScene />
      </Sequence>

      {/* 15-21s: Track */}
      <Sequence from={450} durationInFrames={180}>
        <TrackScene />
      </Sequence>

      {/* 21-27s: More services */}
      <Sequence from={630} durationInFrames={180}>
        <MoreServicesScene />
      </Sequence>

      {/* 27-40s: CTA */}
      <Sequence from={810} durationInFrames={390}>
        <CTAScene />
      </Sequence>
    </AbsoluteFill>
  );
};
