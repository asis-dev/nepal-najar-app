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
} from 'remotion';

/* ══════════════════════════════════════════════
   ABOUT THIS APP — NEPALI VERSION
   सगर आवाजमा — नेपाली संस्करण
   ══════════════════════════════════════════════ */

const RED = '#DC143C';
const BLUE = '#003893';
const DARK = '#0a0a12';
const DARK_CARD = '#1a1f2e';
const WHITE = '#ffffff';
const GOLD = '#fbbf24';
const GREEN = '#34d399';
const GRAY = '#94a3b8';

/* ── Brand bar ── */
function BrandBar() {
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100,
      height: 52,
      background: `linear-gradient(90deg, ${RED}, ${BLUE})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    }}>
      <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 16, fontWeight: 900, color: WHITE }}>NR</span>
      </div>
      <span style={{ fontSize: 20, fontWeight: 900, color: WHITE, letterSpacing: 1 }}>नेपाल रिपब्लिक</span>
      <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)' }}>|</span>
      <span style={{ fontSize: 16, fontWeight: 700, color: GOLD }}>nepalrepublic.org</span>
    </div>
  );
}

/* ── Animated number counter ── */
function Counter({ value, frame, startFrame, suffix = '' }: { value: number; frame: number; startFrame: number; suffix?: string }) {
  const progress = interpolate(frame, [startFrame, startFrame + 40], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return <>{Math.round(value * progress)}{suffix}</>;
}

/* ── Section number badge ── */
function SectionBadge({ num, frame }: { num: string; frame: number }) {
  const { fps } = useVideoConfig();
  const scaleIn = spring({ frame, fps, from: 2, to: 1, config: { damping: 8 } });
  return (
    <div style={{
      width: 60, height: 60, borderRadius: 30,
      background: `linear-gradient(135deg, ${RED}, ${BLUE})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transform: `scale(${scaleIn})`,
      boxShadow: `0 8px 30px ${RED}40`,
      marginBottom: 20,
    }}>
      <span style={{ fontSize: 28, fontWeight: 900, color: WHITE }}>{num}</span>
    </div>
  );
}

/* ═══════════════════════════════════════
   Scene 1: INTRO — Welcome
   ═══════════════════════════════════════ */
function IntroScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const imgIn = spring({ frame, fps, from: 1.08, to: 1, config: { damping: 15, mass: 0.5 } });
  const logoIn = spring({ frame: frame - 10, fps, from: 0, to: 1, config: { damping: 10 } });
  const titleIn = spring({ frame: frame - 20, fps, from: 0, to: 1, config: { damping: 12 } });
  const subIn = spring({ frame: frame - 40, fps, from: 0, to: 1, config: { damping: 12 } });

  return (
    <AbsoluteFill style={{ background: DARK }}>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${imgIn})` }}>
        <img src={staticFile('images/promo-hero.png')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.8) 100%)' }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '0 50px' }}>
        <div style={{
          width: 120, height: 120, borderRadius: 36,
          background: `linear-gradient(135deg, ${RED}, ${BLUE})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: `scale(${logoIn})`, opacity: logoIn,
          boxShadow: `0 15px 60px ${RED}50`,
          marginBottom: 30,
        }}>
          <span style={{ fontSize: 52, fontWeight: 900, color: WHITE }}>NR</span>
        </div>

        <div style={{
          fontSize: 52, fontWeight: 900, color: WHITE, textAlign: 'center',
          opacity: titleIn, lineHeight: 1.2,
          textShadow: '0 4px 30px rgba(0,0,0,0.8)',
        }}>
          नेपाल रिपब्लिक
        </div>
        <div style={{
          fontSize: 28, fontWeight: 500, color: GOLD, textAlign: 'center',
          marginTop: 12, opacity: subIn,
          textShadow: '0 2px 20px rgba(0,0,0,0.8)',
        }}>
          AI-संचालित नागरिक प्लेटफर्म
        </div>
        <div style={{
          fontSize: 22, fontWeight: 500, color: 'rgba(255,255,255,0.7)', textAlign: 'center',
          marginTop: 6, opacity: subIn,
        }}>
          AI-powered citizen platform for Nepal
        </div>
      </div>
    </AbsoluteFill>
  );
}

/* ═══════════════════════════════════════
   Scene 2: BRIDGE — You ↔ Government
   ═══════════════════════════════════════ */
function BridgeScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleIn = spring({ frame, fps, from: 0, to: 1, config: { damping: 12 } });
  const leftIn = spring({ frame: frame - 30, fps, from: 0, to: 1, config: { damping: 10 } });
  const bridgeIn = spring({ frame: frame - 60, fps, from: 0, to: 1, config: { damping: 10 } });
  const rightIn = spring({ frame: frame - 90, fps, from: 0, to: 1, config: { damping: 10 } });
  const arrowPulse = Math.sin(frame * 0.1) * 0.1 + 1;

  return (
    <AbsoluteFill style={{ background: DARK }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 40%, ${BLUE}20 0%, transparent 55%)` }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '60px 40px' }}>
        <div style={{
          fontSize: 38, fontWeight: 900, color: WHITE, textAlign: 'center',
          marginBottom: 60, opacity: titleIn, lineHeight: 1.3,
        }}>
          नेपाल रिपब्लिक{'\n'}
          <span style={{ color: GOLD }}>तपाईं र तपाईंको{'\n'}सरकारबीच बस्छ</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 30 }}>
          {/* You */}
          <div style={{
            width: 200, padding: '30px 20px',
            background: DARK_CARD, borderRadius: 24,
            border: `2px solid ${GREEN}30`,
            textAlign: 'center',
            transform: `translateX(${(1 - leftIn) * -60}px)`, opacity: leftIn,
          }}>
            <span style={{ fontSize: 60 }}>👤</span>
            <div style={{ fontSize: 24, fontWeight: 700, color: WHITE, marginTop: 10 }}>तपाईं</div>
            <div style={{ fontSize: 16, color: GRAY, marginTop: 4 }}>सरल भाषा{'\n'}वा आवाज</div>
          </div>

          {/* Bridge arrow */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            opacity: bridgeIn, transform: `scale(${arrowPulse})`,
          }}>
            <div style={{ fontSize: 36, color: GOLD }}>⟷</div>
            <div style={{
              background: `linear-gradient(135deg, ${RED}, ${BLUE})`,
              borderRadius: 16, padding: '12px 20px',
              boxShadow: `0 8px 30px ${RED}30`,
            }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: WHITE }}>NR AI</span>
            </div>
            <div style={{ fontSize: 36, color: GOLD }}>⟷</div>
          </div>

          {/* Government */}
          <div style={{
            width: 200, padding: '30px 20px',
            background: DARK_CARD, borderRadius: 24,
            border: `2px solid ${RED}30`,
            textAlign: 'center',
            transform: `translateX(${(1 - rightIn) * 60}px)`, opacity: rightIn,
          }}>
            <span style={{ fontSize: 60 }}>🏛️</span>
            <div style={{ fontSize: 24, fontWeight: 700, color: WHITE, marginTop: 10 }}>सरकार</div>
            <div style={{ fontSize: 16, color: GRAY, marginTop: 4 }}>५८ निकाय{'\n'}८७ मार्ग</div>
          </div>
        </div>
      </div>
      <BrandBar />
    </AbsoluteFill>
  );
}

/* ═══════════════════════════════════════
   Scene 3: AI FORM FILLING
   ═══════════════════════════════════════ */
function FormFillScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerIn = spring({ frame, fps, from: 0, to: 1, config: { damping: 12 } });

  const services = [
    { icon: '🛂', name: 'पासपोर्ट निवेदन', ne: 'Passport Application', delay: 60 },
    { icon: '🚗', name: 'ड्राइभिङ लाइसेन्स', ne: 'Driving License', delay: 90 },
    { icon: '📜', name: 'जग्गा दर्ता', ne: 'Land Registration', delay: 120 },
    { icon: '🏥', name: 'अस्पताल रेफरल', ne: 'Hospital Referral', delay: 150 },
  ];

  // Form filling animation
  const formProgress = interpolate(frame, [200, 400], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const formFields = [
    { label: 'Full Name', value: 'राम बहादुर श्रेष्ठ', delay: 220 },
    { label: 'Citizenship No.', value: '73-01-74-12345', delay: 260 },
    { label: 'District', value: 'Kathmandu', delay: 300 },
    { label: 'Purpose', value: 'New Passport', delay: 340 },
  ];

  return (
    <AbsoluteFill style={{ background: DARK }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 30%, ${GREEN}12 0%, transparent 55%)` }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 44px' }}>
        <SectionBadge num="1" frame={frame} />

        <div style={{
          fontSize: 42, fontWeight: 900, color: WHITE, marginBottom: 8, opacity: headerIn,
        }}>
          AI ले तपाईंको <span style={{ color: GREEN }}>फारम भर्छ</span>
        </div>
        <div style={{ fontSize: 22, color: GRAY, marginBottom: 30, opacity: headerIn }}>
          AI fills your forms
        </div>

        {/* Service cards */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 30 }}>
          {services.map((s, i) => {
            const sIn = spring({ frame: frame - s.delay, fps, from: 0, to: 1, config: { damping: 12 } });
            return (
              <div key={i} style={{
                background: DARK_CARD, borderRadius: 16, padding: '14px 16px',
                border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', gap: 10,
                width: 220,
                transform: `scale(${sIn})`, opacity: sIn,
              }}>
                <span style={{ fontSize: 28 }}>{s.icon}</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: WHITE }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: GRAY }}>{s.ne}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Stat */}
        <div style={{
          background: `${GREEN}10`, borderRadius: 16, padding: '16px 24px',
          border: `1px solid ${GREEN}20`,
          display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24,
          opacity: headerIn,
        }}>
          <span style={{ fontSize: 44, fontWeight: 900, color: GREEN }}>
            <Counter value={95} frame={frame} startFrame={30} suffix="+" />
          </span>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: WHITE }}>सरकारी सेवाहरू</div>
            <div style={{ fontSize: 14, color: GRAY }}>Government services</div>
          </div>
        </div>

        {/* Form auto-fill animation */}
        <div style={{ background: DARK_CARD, borderRadius: 16, padding: '16px 20px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: GOLD, marginBottom: 10 }}>📝 फारम स्वतः भर्दैछ...</div>
          {formFields.map((f, i) => {
            const fIn = interpolate(frame, [f.delay, f.delay + 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            return (
              <div key={i} style={{ marginBottom: 8, opacity: fIn }}>
                <div style={{ fontSize: 11, color: GRAY, marginBottom: 2 }}>{f.label}</div>
                <div style={{
                  fontSize: 14, fontWeight: 600, color: WHITE,
                  background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '6px 10px',
                  border: `1px solid ${fIn > 0.9 ? `${GREEN}40` : 'rgba(255,255,255,0.06)'}`,
                }}>
                  {fIn > 0.5 ? f.value : ''}
                  {fIn > 0.1 && fIn < 0.9 && <span style={{ color: GOLD }}>|</span>}
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
   Scene 4: ROUTING
   ═══════════════════════════════════════ */
function RoutingScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerIn = spring({ frame, fps, from: 0, to: 1, config: { damping: 12 } });

  const authorities = [
    { icon: '🏛️', name: 'मन्त्रालय', count: '१५', delay: 40 },
    { icon: '🏢', name: 'विभाग', count: '१८', delay: 60 },
    { icon: '🏘️', name: 'नगरपालिका', count: '८', delay: 80 },
    { icon: '🏥', name: 'अस्पताल', count: '६', delay: 100 },
    { icon: '⚖️', name: 'अदालत', count: '५', delay: 120 },
    { icon: '🎓', name: 'विश्वविद्यालय', count: '६', delay: 140 },
  ];

  // Routing animation
  const routeProgress = interpolate(frame, [200, 350], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const routePulse = Math.sin(frame * 0.08) * 0.5 + 0.5;

  return (
    <AbsoluteFill style={{ background: DARK }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 40%, ${BLUE}15 0%, transparent 55%)` }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 44px' }}>
        <SectionBadge num="2" frame={frame} />

        <div style={{ fontSize: 42, fontWeight: 900, color: WHITE, marginBottom: 8, opacity: headerIn }}>
          सही डेस्कमा <span style={{ color: GOLD }}>पठाइन्छ</span>
        </div>
        <div style={{ fontSize: 22, color: GRAY, marginBottom: 30, opacity: headerIn }}>
          Routed to the right desk
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 30 }}>
          <div style={{
            background: `${BLUE}15`, borderRadius: 16, padding: '16px 24px', flex: 1,
            border: `1px solid ${BLUE}25`, textAlign: 'center',
            opacity: headerIn,
          }}>
            <div style={{ fontSize: 44, fontWeight: 900, color: GOLD }}>
              <Counter value={58} frame={frame} startFrame={20} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: WHITE }}>निकायहरू</div>
          </div>
          <div style={{
            background: `${GREEN}10`, borderRadius: 16, padding: '16px 24px', flex: 1,
            border: `1px solid ${GREEN}20`, textAlign: 'center',
            opacity: headerIn,
          }}>
            <div style={{ fontSize: 44, fontWeight: 900, color: GREEN }}>
              <Counter value={87} frame={frame} startFrame={30} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: WHITE }}>सक्रिय मार्गहरू</div>
          </div>
        </div>

        {/* Authority grid */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {authorities.map((a, i) => {
            const aIn = spring({ frame: frame - a.delay, fps, from: 0, to: 1, config: { damping: 12 } });
            return (
              <div key={i} style={{
                background: DARK_CARD, borderRadius: 14, padding: '14px 16px',
                border: '1px solid rgba(255,255,255,0.06)',
                width: 145, textAlign: 'center',
                transform: `scale(${aIn})`, opacity: aIn,
              }}>
                <span style={{ fontSize: 32 }}>{a.icon}</span>
                <div style={{ fontSize: 14, fontWeight: 700, color: WHITE, marginTop: 6 }}>{a.name}</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: GOLD, marginTop: 2 }}>{a.count}</div>
              </div>
            );
          })}
        </div>

        {/* Route animation */}
        {routeProgress > 0 && (
          <div style={{
            marginTop: 24, background: DARK_CARD, borderRadius: 14,
            padding: '14px 20px', border: `1px solid ${GREEN}25`,
            opacity: routeProgress,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: 5, background: GREEN, boxShadow: `0 0 8px ${GREEN}`, opacity: routePulse }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: GREEN }}>पठाउँदैछ: पासपोर्ट विभाग</span>
            </div>
          </div>
        )}
      </div>
      <BrandBar />
    </AbsoluteFill>
  );
}

/* ═══════════════════════════════════════
   Scene 5: DEADLINES & SLA
   ═══════════════════════════════════════ */
function DeadlineScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerIn = spring({ frame, fps, from: 0, to: 1, config: { damping: 12 } });

  const deadlines = [
    { service: 'एम्बुलेन्स पठाउने', time: '१ घण्टा', icon: '🚑', color: '#ef4444', delay: 40 },
    { service: 'प्रहरी रिपोर्ट', time: '२४ घण्टा', icon: '🚔', color: '#f59e0b', delay: 70 },
    { service: 'जन्म प्रमाणपत्र', time: '७ दिन', icon: '👶', color: '#3b82f6', delay: 100 },
    { service: 'पासपोर्ट नवीकरण', time: '२१ दिन', icon: '🛂', color: GREEN, delay: 130 },
    { service: 'जग्गा हस्तान्तरण', time: '४५ दिन', icon: '📜', color: '#8b5cf6', delay: 160 },
    { service: 'ट्रेडमार्क दर्ता', time: '९० दिन', icon: '™️', color: '#ec4899', delay: 190 },
  ];

  const warningIn = spring({ frame: frame - 250, fps, from: 0, to: 1, config: { damping: 10 } });
  const escalateIn = spring({ frame: frame - 310, fps, from: 0, to: 1, config: { damping: 10 } });

  return (
    <AbsoluteFill style={{ background: DARK }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 35%, ${GOLD}10 0%, transparent 50%)` }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 44px' }}>
        <SectionBadge num="3" frame={frame} />

        <div style={{ fontSize: 42, fontWeight: 900, color: WHITE, marginBottom: 8, opacity: headerIn }}>
          हरेक मार्गमा <span style={{ color: GOLD }}>समयसीमा</span> हुन्छ
        </div>
        <div style={{ fontSize: 22, color: GRAY, marginBottom: 30, opacity: headerIn }}>
          Every route has a deadline
        </div>

        {deadlines.map((d, i) => {
          const dIn = spring({ frame: frame - d.delay, fps, from: 0, to: 1, config: { damping: 12 } });
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14,
              opacity: dIn, transform: `translateX(${(1 - dIn) * 40}px)`,
            }}>
              <span style={{ fontSize: 28 }}>{d.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 600, color: WHITE }}>{d.service}</div>
              </div>
              <div style={{
                background: `${d.color}20`, borderRadius: 10, padding: '6px 14px',
                border: `1px solid ${d.color}30`,
              }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: d.color }}>{d.time}</span>
              </div>
            </div>
          );
        })}

        {/* Warning + Escalation */}
        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <div style={{
            flex: 1, background: `${GOLD}10`, borderRadius: 14, padding: '14px 16px',
            border: `1px solid ${GOLD}25`,
            opacity: warningIn, transform: `scale(${warningIn})`,
          }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: GOLD }}>⚠️ समयसीमा नजिक</span>
            <div style={{ fontSize: 12, color: GRAY, marginTop: 4 }}>स्वचालित चेतावनी पठाइयो</div>
          </div>
          <div style={{
            flex: 1, background: `${RED}10`, borderRadius: 14, padding: '14px 16px',
            border: `1px solid ${RED}25`,
            opacity: escalateIn, transform: `scale(${escalateIn})`,
          }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: RED }}>🚨 समयसीमा नाघ्यो</span>
            <div style={{ fontSize: 12, color: GRAY, marginTop: 4 }}>स्वचालित माथि पठाइयो</div>
          </div>
        </div>
      </div>
      <BrandBar />
    </AbsoluteFill>
  );
}

/* ═══════════════════════════════════════
   Scene 6: GOV REPLY SYSTEM
   ═══════════════════════════════════════ */
function GovReplyScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerIn = spring({ frame, fps, from: 0, to: 1, config: { damping: 12 } });

  const actions = [
    { icon: '✅', label: 'स्वीकृत', color: GREEN, delay: 60 },
    { icon: '❌', label: 'अस्वीकृत', color: '#ef4444', delay: 90 },
    { icon: '🔄', label: 'स्थिति अपडेट', color: GOLD, delay: 120 },
    { icon: '📋', label: 'थप जानकारी', color: '#3b82f6', delay: 150 },
  ];

  const logIn = spring({ frame: frame - 220, fps, from: 0, to: 1, config: { damping: 12 } });

  return (
    <AbsoluteFill style={{ background: DARK }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 40%, ${GREEN}10 0%, transparent 50%)` }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 44px' }}>
        <SectionBadge num="4" frame={frame} />

        <div style={{ fontSize: 42, fontWeight: 900, color: WHITE, marginBottom: 8, opacity: headerIn }}>
          सरकारले सिधै <span style={{ color: GREEN }}>जवाफ दिन्छ</span>
        </div>
        <div style={{ fontSize: 22, color: GRAY, marginBottom: 30, opacity: headerIn }}>
          Government responds directly
        </div>

        {/* Secure link mockup */}
        <div style={{
          background: DARK_CARD, borderRadius: 16, padding: '20px 24px',
          border: '1px solid rgba(255,255,255,0.08)',
          marginBottom: 24, opacity: headerIn,
        }}>
          <div style={{ fontSize: 14, color: GRAY, marginBottom: 8 }}>🔒 सुरक्षित जवाफ लिङ्क पठाइयो:</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: WHITE }}>पासपोर्ट विभाग</div>
          <div style={{ fontSize: 13, color: GRAY, marginTop: 4 }}>उनीहरूको तर्फबाट लगइन चाहिँदैन</div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 24 }}>
          {actions.map((a, i) => {
            const aIn = spring({ frame: frame - a.delay, fps, from: 0, to: 1, config: { damping: 10 } });
            return (
              <div key={i} style={{
                background: `${a.color}15`, borderRadius: 16, padding: '18px 24px',
                border: `1px solid ${a.color}30`,
                display: 'flex', alignItems: 'center', gap: 10,
                width: 220,
                transform: `scale(${aIn})`, opacity: aIn,
              }}>
                <span style={{ fontSize: 28 }}>{a.icon}</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: WHITE }}>{a.label}</span>
              </div>
            );
          })}
        </div>

        {/* Logged response */}
        <div style={{
          background: `${GREEN}08`, borderRadius: 14, padding: '16px 20px',
          border: `1px solid ${GREEN}20`,
          opacity: logIn, transform: `translateY(${(1 - logIn) * 20}px)`,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: GREEN, marginBottom: 6 }}>✓ जवाफ केस इतिहासमा रेकर्ड भयो</div>
          <div style={{ fontSize: 12, color: GRAY }}>हरेक कार्य रेकर्ड हुन्छ र नागरिकले देख्न सक्छ</div>
        </div>
      </div>
      <BrandBar />
    </AbsoluteFill>
  );
}

/* ═══════════════════════════════════════
   Scene 7: INTELLIGENCE ENGINE
   ═══════════════════════════════════════ */
function IntelScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerIn = spring({ frame, fps, from: 0, to: 1, config: { damping: 12 } });

  const sources = [
    { icon: '📰', label: '८०+ समाचार स्रोत', count: '८०+', delay: 40 },
    { icon: '📺', label: '१७ YouTube च्यानल', count: '१७', delay: 70 },
    { icon: '📱', label: 'सोसल मिडिया', count: '२८+', delay: 100 },
  ];

  const briefIn = spring({ frame: frame - 180, fps, from: 0, to: 1, config: { damping: 12 } });
  const scanPulse = Math.sin(frame * 0.06) * 0.3 + 0.7;

  return (
    <AbsoluteFill style={{ background: DARK }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 35%, ${RED}12 0%, transparent 50%)` }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 44px' }}>
        <div style={{
          fontSize: 16, fontWeight: 700, color: RED, textTransform: 'uppercase' as const,
          letterSpacing: 3, marginBottom: 10, opacity: headerIn,
        }}>
          Live Now
        </div>
        <div style={{ fontSize: 42, fontWeight: 900, color: WHITE, marginBottom: 8, opacity: headerIn }}>
          बुद्धिमत्ता <span style={{ color: RED }}>इन्जिन</span>
        </div>
        <div style={{ fontSize: 22, color: GRAY, marginBottom: 8, opacity: headerIn }}>
          दिनमा दुई पटक चल्छ
        </div>
        <div style={{
          fontSize: 16, color: GREEN, fontWeight: 600, marginBottom: 30,
          opacity: scanPulse,
        }}>
          ● नेपालभर स्क्यान गर्दैछ...
        </div>

        {/* Source cards */}
        {sources.map((s, i) => {
          const sIn = spring({ frame: frame - s.delay, fps, from: 0, to: 1, config: { damping: 12 } });
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 16,
              background: DARK_CARD, borderRadius: 16, padding: '18px 20px',
              marginBottom: 12,
              border: '1px solid rgba(255,255,255,0.06)',
              transform: `translateX(${(1 - sIn) * 50}px)`, opacity: sIn,
            }}>
              <span style={{ fontSize: 36 }}>{s.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: WHITE }}>{s.label}</div>
              </div>
              <span style={{ fontSize: 28, fontWeight: 900, color: GOLD }}>{s.count}</span>
            </div>
          );
        })}

        {/* Daily brief output */}
        <div style={{
          marginTop: 16, background: `${RED}08`, borderRadius: 16, padding: '18px 20px',
          border: `1px solid ${RED}20`,
          opacity: briefIn, transform: `translateY(${(1 - briefIn) * 20}px)`,
        }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: WHITE, marginBottom: 6 }}>📊 दैनिक बुद्धिमत्ता ब्रिफ</div>
          <div style={{ fontSize: 13, color: GRAY, lineHeight: 1.5 }}>
            अंग्रेजी र नेपालीमा अडियो • आज के परिवर्तन भयो • मन्त्रीहरूको अपडेट • वचन ट्र्याकिङ
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <div style={{ background: `${RED}20`, borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 700, color: RED }}>▶ EN</div>
            <div style={{ background: `${BLUE}20`, borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 700, color: '#60a5fa' }}>▶ नेपाली</div>
          </div>
        </div>
      </div>
      <BrandBar />
    </AbsoluteFill>
  );
}

/* ═══════════════════════════════════════
   Scene 8: PROMISE TRACKING
   ═══════════════════════════════════════ */
function PromiseScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerIn = spring({ frame, fps, from: 0, to: 1, config: { damping: 12 } });

  const grades = [
    { grade: 'A', label: 'पूरा भइरहेको', color: GREEN, count: 12, delay: 40 },
    { grade: 'B', label: 'प्रगतिमा', color: '#3b82f6', count: 28, delay: 60 },
    { grade: 'C', label: 'ढिलो', color: GOLD, count: 35, delay: 80 },
    { grade: 'D', label: 'अड्किएको', color: '#f97316', count: 22, delay: 100 },
    { grade: 'F', label: 'असफल', color: '#ef4444', count: 12, delay: 120 },
  ];

  return (
    <AbsoluteFill style={{ background: DARK }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 40%, ${GOLD}10 0%, transparent 50%)` }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 44px' }}>
        <div style={{
          fontSize: 16, fontWeight: 700, color: RED, textTransform: 'uppercase' as const,
          letterSpacing: 3, marginBottom: 10, opacity: headerIn,
        }}>
          Live Now
        </div>
        <div style={{ fontSize: 42, fontWeight: 900, color: WHITE, marginBottom: 8, opacity: headerIn }}>
          <span style={{ color: GOLD }}>१०९</span> वचन ट्र्याक गरिएको
        </div>
        <div style={{ fontSize: 22, color: GRAY, marginBottom: 30, opacity: headerIn }}>
          A देखि F सम्म ग्रेड
        </div>

        {/* Grade bars */}
        {grades.map((g, i) => {
          const gIn = spring({ frame: frame - g.delay, fps, from: 0, to: 1, config: { damping: 12 } });
          const barWidth = interpolate(frame, [g.delay + 10, g.delay + 50], [0, g.count / 35 * 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16,
              opacity: gIn,
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: `${g.color}20`, border: `2px solid ${g.color}50`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 28, fontWeight: 900, color: g.color }}>{g.grade}</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: WHITE, marginBottom: 4 }}>{g.label}</div>
                <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)' }}>
                  <div style={{
                    width: `${barWidth}%`, height: '100%', borderRadius: 4,
                    background: `linear-gradient(90deg, ${g.color}, ${g.color}80)`,
                  }} />
                </div>
              </div>
              <span style={{ fontSize: 22, fontWeight: 900, color: g.color, minWidth: 40, textAlign: 'right' as const }}>{g.count}</span>
            </div>
          );
        })}

        <div style={{
          marginTop: 16, display: 'flex', gap: 8,
          opacity: headerIn,
        }}>
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '8px 14px', fontSize: 13, color: GRAY }}>📊 प्रगति डेटा</div>
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '8px 14px', fontSize: 13, color: GRAY }}>📎 प्रमाण</div>
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '8px 14px', fontSize: 13, color: GRAY }}>🔗 स्रोतहरू</div>
        </div>
      </div>
      <BrandBar />
    </AbsoluteFill>
  );
}

/* ═══════════════════════════════════════
   Scene 9: ACCOUNTABILITY
   ═══════════════════════════════════════ */
function AccountabilityScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerIn = spring({ frame, fps, from: 0, to: 1, config: { damping: 12 } });

  const features = [
    { icon: '📋', label: 'रिपोर्ट कार्ड', ne: 'Report Cards', delay: 30 },
    { icon: '👤', label: 'मन्त्री स्कोरकार्ड', ne: 'Minister Scorecards', delay: 55 },
    { icon: '🏛️', label: 'मन्त्रालय प्रदर्शन', ne: 'Ministry Performance', delay: 80 },
    { icon: '📅', label: 'साप्ताहिक सारांश', ne: 'Weekly Summaries', delay: 105 },
    { icon: '🔍', label: 'खोज्न मिल्ने वाचलिस्ट', ne: 'Searchable Watchlist', delay: 130 },
  ];

  return (
    <AbsoluteFill style={{ background: DARK }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 40% 50%, ${BLUE}12 0%, transparent 50%), radial-gradient(circle at 60% 50%, ${RED}10 0%, transparent 50%)` }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 44px' }}>
        <div style={{
          fontSize: 16, fontWeight: 700, color: RED, textTransform: 'uppercase' as const,
          letterSpacing: 3, marginBottom: 10, opacity: headerIn,
        }}>
          All Live
        </div>
        <div style={{ fontSize: 42, fontWeight: 900, color: WHITE, marginBottom: 8, opacity: headerIn }}>
          पूर्ण <span style={{ color: GOLD }}>जवाफदेहिता</span>
        </div>
        <div style={{ fontSize: 22, color: GRAY, marginBottom: 40, opacity: headerIn }}>
          सबै सक्रिय र निरन्तर अपडेट हुन्छ
        </div>

        {features.map((f, i) => {
          const fIn = spring({ frame: frame - f.delay, fps, from: 0, to: 1, config: { damping: 12 } });
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 16,
              background: DARK_CARD, borderRadius: 16, padding: '18px 20px',
              marginBottom: 12,
              border: '1px solid rgba(255,255,255,0.06)',
              transform: `translateX(${(1 - fIn) * 50}px)`, opacity: fIn,
            }}>
              <span style={{ fontSize: 32 }}>{f.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: WHITE }}>{f.label}</div>
                <div style={{ fontSize: 14, color: GRAY }}>{f.ne}</div>
              </div>
              <span style={{ fontSize: 18, color: GREEN, fontWeight: 700 }}>LIVE</span>
            </div>
          );
        })}
      </div>
      <BrandBar />
    </AbsoluteFill>
  );
}

/* ═══════════════════════════════════════
   Scene 10: BETA
   ═══════════════════════════════════════ */
function BetaScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerIn = spring({ frame, fps, from: 0, to: 1, config: { damping: 12 } });

  const betaFeatures = [
    { icon: '📝', label: 'AI फारम भर्ने', ne: 'AI Form Filling', status: 'बिटा', color: GOLD, delay: 40 },
    { icon: '🔀', label: 'केस राउटिङ', ne: 'Case Routing', status: 'बिटा', color: GOLD, delay: 70 },
    { icon: '⏱️', label: 'समयसीमा लागू', ne: 'SLA Enforcement', status: 'बिटा', color: GOLD, delay: 100 },
    { icon: '🔗', label: 'पार्टनर जवाफ प्रणाली', ne: 'Partner Reply System', status: 'बिटा', color: GOLD, delay: 130 },
  ];

  const growIn = spring({ frame: frame - 200, fps, from: 0, to: 1, config: { damping: 12 } });

  return (
    <AbsoluteFill style={{ background: DARK }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 40%, ${GOLD}10 0%, transparent 50%)` }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 44px' }}>
        <div style={{
          background: `${GOLD}15`, borderRadius: 12, padding: '6px 16px',
          border: `1px solid ${GOLD}30`, alignSelf: 'flex-start',
          marginBottom: 16, opacity: headerIn,
        }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: GOLD }}>🚀 बिटामा छ</span>
        </div>

        <div style={{ fontSize: 42, fontWeight: 900, color: WHITE, marginBottom: 8, opacity: headerIn }}>
          सेवा सञ्चालन
        </div>
        <div style={{ fontSize: 22, color: GRAY, marginBottom: 30, opacity: headerIn }}>
          सक्रिय छन् र हरेक दिन बढ्दैछन्
        </div>

        {betaFeatures.map((f, i) => {
          const fIn = spring({ frame: frame - f.delay, fps, from: 0, to: 1, config: { damping: 12 } });
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 16,
              background: DARK_CARD, borderRadius: 16, padding: '18px 20px',
              marginBottom: 12,
              border: `1px solid ${GOLD}15`,
              transform: `translateX(${(1 - fIn) * 50}px)`, opacity: fIn,
            }}>
              <span style={{ fontSize: 30 }}>{f.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: WHITE }}>{f.label}</div>
                <div style={{ fontSize: 13, color: GRAY }}>{f.ne}</div>
              </div>
              <div style={{
                background: `${f.color}20`, borderRadius: 8, padding: '4px 12px',
                border: `1px solid ${f.color}30`,
              }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: f.color }}>{f.status}</span>
              </div>
            </div>
          );
        })}

        <div style={{
          marginTop: 20, background: `${GREEN}08`, borderRadius: 14, padding: '16px 20px',
          border: `1px solid ${GREEN}15`,
          opacity: growIn, transform: `translateY(${(1 - growIn) * 15}px)`,
        }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: WHITE }}>तपाईंको प्रतिक्रियाले अर्को चरण बनाउँछ</div>
          <div style={{ fontSize: 13, color: GRAY, marginTop: 4 }}>Your feedback shapes what comes next</div>
        </div>
      </div>
      <BrandBar />
    </AbsoluteFill>
  );
}

/* ═══════════════════════════════════════
   Scene 11: CTA
   ═══════════════════════════════════════ */
function CTAScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const imgIn = spring({ frame, fps, from: 1.05, to: 1, config: { damping: 15, mass: 0.5 } });
  const overlayIn = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const titleIn = spring({ frame: frame - 15, fps, from: 0, to: 1, config: { damping: 12 } });
  const btnIn = spring({ frame: frame - 50, fps, from: 0, to: 1, config: { damping: 10 } });
  const btnPulse = Math.sin(frame * 0.12) * 0.04 + 1;
  const tagIn = spring({ frame: frame - 70, fps, from: 0, to: 1, config: { damping: 12 } });

  return (
    <AbsoluteFill style={{ background: DARK }}>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${imgIn})` }}>
        <img src={staticFile('images/promo-hero.png')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.2) 30%, rgba(0,0,0,0.75) 70%, rgba(0,0,0,0.95) 100%)',
        opacity: overlayIn,
      }} />

      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '0 40px 80px', opacity: overlayIn,
      }}>
        <div style={{
          fontSize: 36, fontWeight: 900, color: WHITE, textAlign: 'center',
          marginBottom: 8, opacity: titleIn, lineHeight: 1.3,
          textShadow: '0 2px 20px rgba(0,0,0,0.8)',
        }}>
          तपाईं र तपाईंको{'\n'}सरकारबीचको AI
        </div>
        <div style={{
          fontSize: 22, fontWeight: 500, color: GRAY, textAlign: 'center',
          marginBottom: 24, opacity: titleIn,
        }}>
          AI between you and your government
        </div>

        <div style={{ transform: `scale(${btnIn * btnPulse})`, opacity: btnIn, marginBottom: 16 }}>
          <div style={{
            background: `linear-gradient(90deg, ${RED}, #b91c1c)`,
            borderRadius: 36, padding: '20px 56px',
            textAlign: 'center',
            boxShadow: `0 8px 40px ${RED}50`,
          }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: WHITE }}>
              nepalrepublic.org →
            </span>
          </div>
        </div>

        <div style={{
          fontSize: 18, fontWeight: 500, color: 'rgba(255,255,255,0.7)', textAlign: 'center',
          opacity: tagIn,
        }}>
          निःशुल्क • डाउनलोड नचाहिने • कुनै पनि डिभाइसमा
        </div>
      </div>
    </AbsoluteFill>
  );
}

/* ═══════════════════════════════════════
   MAIN COMPOSITION
   ═══════════════════════════════════════ */
export interface AboutAppNEData {}

export const AboutAppNE: React.FC<{ data: AboutAppNEData }> = () => {
  /* Nepali audio timings (SagarNeural):
     01-intro:          174f, scene=204, from=0
     02-bridge:         312f, scene=342, from=204
     03-formfill:       492f, scene=522, from=546
     04-routing:        444f, scene=474, from=1068
     05-deadlines:      441f, scene=471, from=1542
     06-govreply:       447f, scene=477, from=2013
     07-intel:          438f, scene=468, from=2490
     08-promises:       276f, scene=306, from=2958
     09-accountability: 294f, scene=324, from=3264
     10-beta:           342f, scene=372, from=3588
     11-cta:            231f, scene=261, from=3960
     Total: 4221 frames = 140.7s
  */
  return (
    <AbsoluteFill style={{ background: DARK, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      {/* ═══ VISUAL SCENES ═══ */}

      <Sequence from={0} durationInFrames={204}>
        <IntroScene />
      </Sequence>

      <Sequence from={204} durationInFrames={342}>
        <BridgeScene />
      </Sequence>

      <Sequence from={546} durationInFrames={522}>
        <FormFillScene />
      </Sequence>

      <Sequence from={1068} durationInFrames={474}>
        <RoutingScene />
      </Sequence>

      <Sequence from={1542} durationInFrames={471}>
        <DeadlineScene />
      </Sequence>

      <Sequence from={2013} durationInFrames={477}>
        <GovReplyScene />
      </Sequence>

      <Sequence from={2490} durationInFrames={468}>
        <IntelScene />
      </Sequence>

      <Sequence from={2958} durationInFrames={306}>
        <PromiseScene />
      </Sequence>

      <Sequence from={3264} durationInFrames={324}>
        <AccountabilityScene />
      </Sequence>

      <Sequence from={3588} durationInFrames={372}>
        <BetaScene />
      </Sequence>

      <Sequence from={3960} durationInFrames={261}>
        <CTAScene />
      </Sequence>

      {/* ═══ VOICEOVER — SagarNeural (Nepali) ═══ */}

      <Sequence from={0} durationInFrames={174}>
        <Audio src={staticFile('audio/about-video-ne/01-intro.mp3')} volume={1} />
      </Sequence>

      <Sequence from={204} durationInFrames={312}>
        <Audio src={staticFile('audio/about-video-ne/02-bridge.mp3')} volume={1} />
      </Sequence>

      <Sequence from={546} durationInFrames={492}>
        <Audio src={staticFile('audio/about-video-ne/03-formfill.mp3')} volume={1} />
      </Sequence>

      <Sequence from={1068} durationInFrames={444}>
        <Audio src={staticFile('audio/about-video-ne/04-routing.mp3')} volume={1} />
      </Sequence>

      <Sequence from={1542} durationInFrames={441}>
        <Audio src={staticFile('audio/about-video-ne/05-deadlines.mp3')} volume={1} />
      </Sequence>

      <Sequence from={2013} durationInFrames={447}>
        <Audio src={staticFile('audio/about-video-ne/06-govreply.mp3')} volume={1} />
      </Sequence>

      <Sequence from={2490} durationInFrames={438}>
        <Audio src={staticFile('audio/about-video-ne/07-intel.mp3')} volume={1} />
      </Sequence>

      <Sequence from={2958} durationInFrames={276}>
        <Audio src={staticFile('audio/about-video-ne/08-promises.mp3')} volume={1} />
      </Sequence>

      <Sequence from={3264} durationInFrames={294}>
        <Audio src={staticFile('audio/about-video-ne/09-accountability.mp3')} volume={1} />
      </Sequence>

      <Sequence from={3588} durationInFrames={342}>
        <Audio src={staticFile('audio/about-video-ne/10-beta.mp3')} volume={1} />
      </Sequence>

      <Sequence from={3960} durationInFrames={231}>
        <Audio src={staticFile('audio/about-video-ne/11-cta.mp3')} volume={1} />
      </Sequence>
    </AbsoluteFill>
  );
};
