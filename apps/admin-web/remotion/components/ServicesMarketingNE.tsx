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
   SERVICES MARKETING REEL — NEPALI VERSION
   नेपाली संस्करण — सगर आवाजमा
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

/* ── Phone frame ── */
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
      <div
        style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: 44 * scale, zIndex: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: `0 ${24 * scale}px`,
          background: 'rgba(10,10,18,0.9)',
        }}
      >
        <span style={{ fontSize: 13 * scale, fontWeight: 600, color: WHITE }}>९:४१</span>
        <div style={{ display: 'flex', gap: 4 * scale, alignItems: 'center' }}>
          <div style={{ width: 16 * scale, height: 10 * scale, borderRadius: 2, border: '1px solid rgba(255,255,255,0.5)' }}>
            <div style={{ width: '70%', height: '100%', background: WHITE, borderRadius: 1 }} />
          </div>
        </div>
      </div>
      <div
        style={{
          position: 'absolute', top: 6 * scale, left: '50%',
          transform: 'translateX(-50%)',
          width: 120 * scale, height: 32 * scale,
          borderRadius: 20 * scale, background: '#000', zIndex: 30,
        }}
      />
      <div style={{ paddingTop: 44 * scale, height: '100%', overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}

/* ── NR nav bar — Nepali language selected ── */
function AppNavBarNE({ scale = 1 }: { scale?: number }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center',
        padding: `${10 * scale}px ${16 * scale}px`,
        background: DARK,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div
        style={{
          width: 30 * scale, height: 30 * scale, borderRadius: 10 * scale,
          background: `linear-gradient(135deg, ${RED}, ${BLUE})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginRight: 8 * scale,
        }}
      >
        <span style={{ fontSize: 13 * scale, fontWeight: 900, color: WHITE }}>NR</span>
      </div>
      <span style={{ fontSize: 14 * scale, fontWeight: 800, color: WHITE }}>नेपाल</span>
      <span style={{ fontSize: 14 * scale, fontWeight: 800, color: RED, marginLeft: 4 }}>रिपब्लिक</span>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', gap: 8 * scale, alignItems: 'center' }}>
        <div style={{ width: 24 * scale, height: 24 * scale, borderRadius: 6 * scale, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 12 * scale, color: GRAY }}>🔍</span>
        </div>
        {/* Language toggle — Nepali SELECTED */}
        <div style={{
          display: 'flex', borderRadius: 8 * scale, overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.15)',
        }}>
          <div style={{
            padding: `${2 * scale}px ${8 * scale}px`,
            background: 'rgba(255,255,255,0.06)',
            fontSize: 10 * scale, fontWeight: 600, color: 'rgba(255,255,255,0.4)',
          }}>EN</div>
          <div style={{
            padding: `${2 * scale}px ${8 * scale}px`,
            background: `${RED}30`,
            fontSize: 10 * scale, fontWeight: 800, color: WHITE,
            borderLeft: `1px solid ${RED}50`,
          }}>ने</div>
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
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100,
        height: 52,
        background: `linear-gradient(90deg, ${RED}, ${BLUE})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      }}
    >
      <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 16, fontWeight: 900, color: WHITE }}>NR</span>
      </div>
      <span style={{ fontSize: 20, fontWeight: 900, color: WHITE, letterSpacing: 1 }}>नेपाल रिपब्लिक</span>
      <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)' }}>|</span>
      <span style={{ fontSize: 16, fontWeight: 700, color: GOLD }}>nepalrepublic.org</span>
    </div>
  );
}

/* ═══════════════════════════════════════
   Scene 1: HOOK
   ═══════════════════════════════════════ */
function HookScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const imgIn = spring({ frame, fps, from: 1.08, to: 1, config: { damping: 15, mass: 0.5 } });
  const textScale = spring({ frame: frame - 5, fps, from: 1.4, to: 1, config: { damping: 8, mass: 0.3 } });
  const textOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const subIn = spring({ frame: frame - 25, fps, from: 0, to: 1, config: { damping: 12 } });

  return (
    <AbsoluteFill style={{ background: DARK }}>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${imgIn})` }}>
        <img src={staticFile('images/promo-hero.png')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.15) 60%, rgba(0,0,0,0.7) 100%)' }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'center', padding: '120px 50px 0' }}>
        <div style={{
          fontSize: 52, fontWeight: 900, color: WHITE, textAlign: 'center',
          lineHeight: 1.2,
          transform: `scale(${textScale})`, opacity: textOpacity,
          textShadow: '0 4px 30px rgba(0,0,0,0.8)',
        }}>
          सरकारी कार्यालयमा{'\n'}पूरा दिन बर्बाद?
        </div>
        <div style={{
          fontSize: 36, fontWeight: 600, color: GOLD, textAlign: 'center',
          marginTop: 30,
          transform: `translateY(${(1 - subIn) * 30}px)`, opacity: subIn,
          textShadow: '0 2px 20px rgba(0,0,0,0.8)',
        }}>
          अब पर्दैन।
        </div>
      </div>
    </AbsoluteFill>
  );
}

/* ═══════════════════════════════════════
   Scene 2: PAIN POINT
   ═══════════════════════════════════════ */
function PainScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const items = [
    { icon: '😤', text: 'सरकारी कार्यालयमा घण्टौं लाइन', delay: 0 },
    { icon: '📋', text: 'गलत कागजात? भोलि आउनुस्।', delay: 18 },
    { icon: '🤷', text: '"कुन काउन्टरमा जाने?"', delay: 36 },
    { icon: '💸', text: 'दलालले लुकाइएको शुल्क लिने', delay: 54 },
  ];

  const titleIn = spring({ frame, fps, from: 0, to: 1, config: { damping: 12 } });
  const crossIn = interpolate(frame, [120, 150], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: DARK }}>
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${DARK} 0%, #1a0505 100%)` }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '80px 44px' }}>
        <div style={{
          fontSize: 44, fontWeight: 900, color: '#ef4444', textAlign: 'center',
          marginBottom: 50, opacity: titleIn,
          textShadow: '0 0 25px rgba(239,68,68,0.3)',
        }}>
          हामी सबैले भोगेका छौं।
        </div>

        {items.map((item, i) => {
          const itemIn = spring({ frame: frame - item.delay - 10, fps, from: 0, to: 1, config: { damping: 12 } });
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 16,
              marginBottom: 28,
              transform: `translateX(${(1 - itemIn) * 50}px)`, opacity: itemIn,
            }}>
              <span style={{ fontSize: 40, lineHeight: 1 }}>{item.icon}</span>
              <div style={{ fontSize: 28, fontWeight: 600, color: 'rgba(255,255,255,0.9)', lineHeight: 1.4 }}>{item.text}</div>
            </div>
          );
        })}

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
   Scene 3: LANDING PAGE — Nepali UI
   ═══════════════════════════════════════ */
function LandingScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const phoneIn = spring({ frame, fps, from: 0.85, to: 1, config: { damping: 12 } });
  const phoneOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  const searchText = 'मलाई ड्राइभिङ लाइसेन्स चाहिन्छ...';
  const typingProgress = interpolate(frame, [40, 100], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const visibleChars = Math.floor(typingProgress * searchText.length);
  const typedText = searchText.slice(0, visibleChars);
  const cursorBlink = Math.sin(frame * 0.4) > 0;

  const tagsIn = spring({ frame: frame - 110, fps, from: 0, to: 1, config: { damping: 12 } });
  const scoreProgress = interpolate(frame, [60, 130], [0, 76], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const titleIn = spring({ frame: frame - 5, fps, from: 0, to: 1, config: { damping: 15 } });

  return (
    <AbsoluteFill style={{ background: DARK }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 35%, ${BLUE}18 0%, transparent 55%)` }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '30px 20px 60px' }}>
        <div style={{ fontSize: 36, fontWeight: 900, color: WHITE, textAlign: 'center', marginBottom: 6, opacity: titleIn }}>
          यो हो नेपाल रिपब्लिक
        </div>
        <div style={{ fontSize: 22, fontWeight: 500, color: GRAY, textAlign: 'center', marginBottom: 16, opacity: titleIn }}>
          तपाईंको AI-संचालित नागरिक प्लेटफर्म
        </div>

        <div style={{ transform: `scale(${phoneIn})`, opacity: phoneOpacity }}>
          <PhoneFrame scale={1.35} glow>
            <AppNavBarNE scale={1.35} />
            <div style={{ padding: '12px 16px' }}>
              <div style={{ textAlign: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: WHITE, lineHeight: 1.3 }}>
                  नेपालको लागि AI-संचालित नागरिक प्लेटफर्म।
                </div>
                <div style={{ fontSize: 11, color: GRAY, marginTop: 4, lineHeight: 1.3 }}>
                  दैनिक सेवादेखि राष्ट्रिय जवाफदेहीसम्म
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '3px 10px', fontSize: 11, color: GRAY, fontWeight: 600 }}>दिन १९</div>
                <div style={{ background: `${GREEN}15`, borderRadius: 12, padding: '3px 10px', fontSize: 11, color: GREEN, fontWeight: 600 }}>१.६K स्क्यान</div>
              </div>

              <div style={{ background: 'rgba(220,20,60,0.12)', borderRadius: 12, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 16, background: RED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 14, color: WHITE }}>▶</span>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: WHITE }}>नेपाल रिपब्लिक बारे जान्नुहोस्</div>
                  <div style={{ fontSize: 10, color: GRAY }}>▸ सुन्नुहोस्</div>
                </div>
              </div>

              <div style={{ fontSize: 18, fontWeight: 800, color: WHITE, textAlign: 'center', marginBottom: 10 }}>
                म तपाईंलाई कसरी मद्दत गर्न सक्छु?
              </div>

              <div style={{
                background: 'rgba(30,20,25,0.6)',
                border: `2px solid ${RED}50`,
                borderRadius: 28, padding: '12px 16px',
                display: 'flex', alignItems: 'center',
                marginBottom: 12,
                boxShadow: `0 0 20px ${RED}15`,
              }}>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: typingProgress > 0 ? WHITE : 'rgba(255,255,255,0.35)' }}>
                  {typingProgress > 0 ? typedText : 'मलाई ड्राइभिङ लाइसेन्स चाहिन्छ...'}
                  {cursorBlink && typingProgress > 0 && typingProgress < 1 && <span style={{ color: GOLD }}>|</span>}
                </span>
                <div style={{ width: 36, height: 36, borderRadius: 18, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 18 }}>🎤</span>
                </div>
              </div>

              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center',
                opacity: tagsIn, transform: `translateY(${(1 - tagsIn) * 10}px)`,
              }}>
                {['पासपोर्ट', 'नागरिकता', 'लाइसेन्स', 'विदेश जाने', 'व्यापार', 'कर'].map((tag, i) => (
                  <div key={i} style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 14, padding: '4px 12px',
                    fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.7)',
                  }}>{tag}</div>
                ))}
              </div>

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
                    <span style={{ fontSize: 10, color: GREEN }}>● ७० चलिरहेको</span>
                    <span style={{ fontSize: 10, color: '#ef4444' }}>● १३ अड्किएको</span>
                  </div>
                  <span style={{ fontSize: 10, color: GOLD }}>● २६ पर्खिरहेको</span>
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
   Scene 4: AI ADVISOR DEMO — Nepali
   ═══════════════════════════════════════ */
function AdvisorDemoScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const userText = 'मलाई पासपोर्ट नवीकरण गर्नुपर्छ';
  const typingProgress = interpolate(frame, [20, 65], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const visibleChars = Math.floor(typingProgress * userText.length);
  const typedText = userText.slice(0, visibleChars);
  const cursorBlink = Math.sin(frame * 0.4) > 0;

  const aiIn = spring({ frame: frame - 75, fps, from: 0, to: 1, config: { damping: 12 } });
  const serviceIn = spring({ frame: frame - 100, fps, from: 0, to: 1, config: { damping: 10 } });

  const docs = [
    { text: 'पुरानो पासपोर्ट', status: 'ready', delay: 135 },
    { text: 'नागरिकता प्रमाणपत्र', status: 'ready', delay: 145 },
    { text: 'पासपोर्ट फोटो (२)', status: 'missing', delay: 155 },
    { text: 'निवेदन फारम', status: 'ready', delay: 165 },
  ];

  const btnIn = spring({ frame: frame - 190, fps, from: 0, to: 1, config: { damping: 10 } });
  const btnPulse = Math.sin(frame * 0.12) * 0.03 + 1;
  const headerIn = spring({ frame, fps, from: 0, to: 1, config: { damping: 15 } });

  return (
    <AbsoluteFill style={{ background: DARK }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 30%, ${GREEN}10 0%, transparent 55%)` }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '30px 20px 60px' }}>
        <div style={{ fontSize: 36, fontWeight: 900, color: WHITE, textAlign: 'center', marginBottom: 6, opacity: headerIn }}>
          बस सोध्नुहोस्। नेपालीमा।
        </div>
        <div style={{ fontSize: 20, fontWeight: 500, color: GRAY, textAlign: 'center', marginBottom: 14, opacity: headerIn }}>
          AI ले नेपाली, अंग्रेजी दुवै बुझ्छ
        </div>

        <PhoneFrame scale={1.35} glow>
          <AppNavBarNE scale={1.35} />
          <div style={{ padding: '8px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '6px 0' }}>
              <span style={{ fontSize: 16 }}>⭕</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: WHITE }}>सेवा सल्लाहकार</div>
                <div style={{ fontSize: 10, color: GRAY }}>तपाईंलाई के चाहिन्छ भन्नुहोस्</div>
              </div>
            </div>

            <div style={{ fontSize: 16, fontWeight: 800, color: WHITE, textAlign: 'center', marginBottom: 6 }}>
              म तपाईंलाई कसरी मद्दत गर्न सक्छु?
            </div>
            <div style={{ fontSize: 11, color: GRAY, textAlign: 'center', marginBottom: 10 }}>
              पासपोर्ट, लाइसेन्स, अस्पताल, बिल — भन्नुहोस्
            </div>

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

            <div style={{
              background: 'rgba(255,255,255,0.04)',
              borderRadius: 14, padding: '10px 12px',
              marginBottom: 8,
              border: '1px solid rgba(255,255,255,0.06)',
              transform: `translateY(${(1 - aiIn) * 15}px)`, opacity: aiIn,
            }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4 }}>
                म तपाईंको पासपोर्ट नवीकरण गर्न मद्दत गर्छु। तपाईंलाई यो चाहिन्छ:
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                <span style={{ fontSize: 9, background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '2px 8px', color: GRAY }}>🔊 सुन्नुहोस्</span>
              </div>
            </div>

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
                  <div style={{ fontSize: 13, fontWeight: 700, color: WHITE }}>पासपोर्ट नवीकरण</div>
                  <div style={{ fontSize: 10, color: GRAY }}>Passport Renewal</div>
                </div>
              </div>

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

              <div style={{ display: 'flex', gap: 10, fontSize: 10, color: GRAY, marginBottom: 8 }}>
                <span>💰 रु. ५,०००</span>
                <span>⏱️ ३ हप्ता</span>
                <span>📍 पासपोर्ट विभाग</span>
              </div>

              <div style={{ transform: `scale(${btnIn * btnPulse})`, opacity: btnIn }}>
                <div style={{
                  background: `linear-gradient(90deg, ${RED}, #b91c1c)`,
                  borderRadius: 10, padding: '10px 16px',
                  textAlign: 'center',
                  boxShadow: `0 3px 15px ${RED}40`,
                }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: WHITE }}>
                    यो चरण सुरु गर्नुहोस् →
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
   Scene 5: FORM FILL & SUBMIT
   ═══════════════════════════════════════ */
function FormFillScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleIn = spring({ frame, fps, from: 0, to: 1, config: { damping: 12 } });

  const steps = [
    { icon: '📝', label: 'फारम स्वतः भर्छ', en: 'Auto-fills your forms', delay: 10 },
    { icon: '📤', label: 'निवेदन पेश गर्छ', en: 'Submits your application', delay: 40 },
    { icon: '🏛️', label: 'सही कार्यालयमा पठाउँछ', en: 'Routes to the right office', delay: 70 },
  ];

  return (
    <AbsoluteFill style={{ background: DARK }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 30%, ${BLUE}30 0%, transparent 60%), radial-gradient(circle at 70% 70%, ${RED}15 0%, transparent 50%)` }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '80px 44px' }}>
        <div style={{
          fontSize: 42, fontWeight: 900, color: WHITE, textAlign: 'center',
          marginBottom: 60, opacity: titleIn,
          textShadow: `0 0 25px ${BLUE}30`,
        }}>
          AI ले <span style={{ color: GOLD }}>सबै गर्छ</span>
        </div>

        {steps.map((step, i) => {
          const itemIn = spring({ frame: frame - step.delay, fps, from: 0, to: 1, config: { damping: 12 } });
          const checkIn = spring({ frame: frame - step.delay - 25, fps, from: 0, to: 1, config: { damping: 8 } });
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 20,
              marginBottom: 36,
              transform: `translateX(${(1 - itemIn) * 60}px)`, opacity: itemIn,
            }}>
              <div style={{
                width: 72, height: 72, borderRadius: 20,
                background: `linear-gradient(135deg, ${DARK_CARD}, ${DARK_SURFACE})`,
                border: `2px solid ${checkIn > 0.5 ? GREEN : 'rgba(255,255,255,0.1)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 32,
                boxShadow: checkIn > 0.5 ? `0 0 20px ${GREEN}30` : 'none',
              }}>
                {checkIn > 0.5 ? <span style={{ color: GREEN, fontSize: 30, fontWeight: 900 }}>✓</span> : step.icon}
              </div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 700, color: WHITE }}>{step.label}</div>
                <div style={{ fontSize: 18, color: GRAY, marginTop: 4 }}>{step.en}</div>
              </div>
            </div>
          );
        })}
      </div>
      <BrandBar />
    </AbsoluteFill>
  );
}

/* ═══════════════════════════════════════
   Scene 6: CASE TRACKING — Nepali
   ═══════════════════════════════════════ */
function TrackingScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerIn = spring({ frame, fps, from: 0, to: 1, config: { damping: 12 } });
  const progress = interpolate(frame, [25, 120], [0, 60], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const cases = [
    {
      icon: '🛂', title: 'पासपोर्ट नवीकरण',
      status: 'in_progress', statusColor: GOLD, statusText: 'प्रगतिमा',
      nextAction: 'पासपोर्ट विभागमा जानुहोस्', progress: 60, step: '३/५', delay: 30,
    },
    {
      icon: '🚗', title: 'सवारी चालक अनुमतिपत्र',
      status: 'collecting_docs', statusColor: '#3b82f6', statusText: 'कागजात सङ्कलन',
      nextAction: 'मेडिकल रिपोर्ट अपलोड गर्नुहोस्', progress: 20, step: '१/४', delay: 55,
    },
    {
      icon: '💡', title: 'बिजुली बिल भुक्तानी',
      status: 'completed', statusColor: GREEN, statusText: 'सम्पन्न ✓',
      nextAction: 'भुक्तानी पुष्टि भयो', progress: 100, step: '३/३', delay: 80,
    },
  ];

  const expandIn = spring({ frame: frame - 130, fps, from: 0, to: 1, config: { damping: 12 } });

  return (
    <AbsoluteFill style={{ background: DARK }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 55%, ${BLUE}15 0%, transparent 55%)` }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '30px 20px 60px' }}>
        <div style={{ fontSize: 36, fontWeight: 900, color: WHITE, textAlign: 'center', marginBottom: 6, opacity: headerIn }}>
          हरेक केस ट्र्याक गर्नुहोस्
        </div>
        <div style={{ fontSize: 20, fontWeight: 500, color: GRAY, textAlign: 'center', marginBottom: 14, opacity: headerIn }}>
          कहाँ पुगेको छ ठ्याक्कै थाहा पाउनुहोस्
        </div>

        <PhoneFrame scale={1.35} glow>
          <AppNavBarNE scale={1.35} />
          <div style={{ padding: '8px 14px' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: WHITE, marginBottom: 12 }}>मेरा केसहरू</div>

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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 5, background: c.statusColor, boxShadow: `0 0 6px ${c.statusColor}50` }} />
                    <span style={{ fontSize: 18 }}>{c.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: WHITE }}>{c.title}</div>
                      <div style={{ fontSize: 9, color: GRAY }}>{c.nextAction}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 9, fontWeight: 600, color: c.statusColor }}>{c.statusText}</div>
                      <div style={{ fontSize: 9, color: GRAY }}>चरण {c.step}</div>
                    </div>
                  </div>

                  <div style={{ marginTop: 6, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
                    <div style={{
                      width: `${isFirst ? progress : c.progress}%`,
                      height: '100%', borderRadius: 2,
                      background: c.status === 'completed'
                        ? `linear-gradient(90deg, ${GREEN}, #059669)`
                        : `linear-gradient(90deg, ${RED}, ${GOLD})`,
                    }} />
                  </div>

                  {showExpanded && (
                    <div style={{ marginTop: 8, opacity: expandIn, transform: `translateY(${(1 - expandIn) * 10}px)` }}>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                        <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '6px 8px' }}>
                          <div style={{ fontSize: 8, color: GRAY, marginBottom: 2 }}>अर्को कदम</div>
                          <div style={{ fontSize: 10, fontWeight: 600, color: WHITE }}>कागजातसहित पासपोर्ट विभागमा जानुहोस्</div>
                        </div>
                        <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '6px 8px' }}>
                          <div style={{ fontSize: 8, color: GRAY, marginBottom: 2 }}>कागजातहरू</div>
                          <div style={{ fontSize: 10, color: GREEN }}>✓ ३ तयार</div>
                          <div style={{ fontSize: 10, color: '#ef4444' }}>○ १ बाँकी</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <div style={{ background: `${RED}15`, borderRadius: 6, padding: '4px 10px', fontSize: 9, fontWeight: 700, color: RED }}>अगाडि बढ्नुहोस्</div>
                        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 6, padding: '4px 10px', fontSize: 9, fontWeight: 600, color: GRAY }}>स्थिति हेर्नुहोस्</div>
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
   Scene 7: SERVICES BREADTH — Nepali
   ═══════════════════════════════════════ */
function ServicesBreadthScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headerIn = spring({ frame, fps, from: 0, to: 1, config: { damping: 12 } });

  const categories = [
    { icon: '🪪', name: 'नागरिकता र कागजात', en: 'Identity & Documents', count: '१३ सेवा', color: '#3b82f6' },
    { icon: '🚗', name: 'यातायात र लाइसेन्स', en: 'Transport & License', count: '१० सेवा', color: '#f59e0b' },
    { icon: '🧾', name: 'कर र प्यान', en: 'Tax & PAN', count: '७ सेवा', color: '#f97316' },
    { icon: '🏥', name: 'स्वास्थ्य र अस्पताल', en: 'Health & Hospitals', count: '१० सेवा', color: '#10b981' },
    { icon: '💡', name: 'उपयोगिता र बिल', en: 'Utilities & Bills', count: '१० सेवा', color: '#8b5cf6' },
    { icon: '🏢', name: 'व्यवसाय दर्ता', en: 'Business Registration', count: '८ सेवा', color: '#ec4899' },
    { icon: '📜', name: 'जग्गा र सम्पत्ति', en: 'Land & Property', count: '६ सेवा', color: '#14b8a6' },
    { icon: '🏦', name: 'बैंकिङ', en: 'Banking', count: '५ सेवा', color: '#06b6d4' },
    { icon: '🎓', name: 'शिक्षा', en: 'Education', count: '४ सेवा', color: '#6366f1' },
    { icon: '⚖️', name: 'कानुनी र अदालत', en: 'Legal & Courts', count: '४ सेवा', color: '#a855f7' },
  ];

  return (
    <AbsoluteFill style={{ background: DARK }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 30% 40%, ${RED}12 0%, transparent 50%), radial-gradient(circle at 70% 60%, ${BLUE}12 0%, transparent 50%)` }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '50px 36px' }}>
        <div style={{ fontSize: 44, fontWeight: 900, color: WHITE, textAlign: 'center', marginBottom: 8, opacity: headerIn }}>
          सबै सरकारी सेवा।
        </div>
        <div style={{ fontSize: 26, fontWeight: 600, color: GOLD, textAlign: 'center', marginBottom: 40, opacity: headerIn }}>
          Every government service.
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
                  <div style={{ fontSize: 14, fontWeight: 700, color: WHITE, lineHeight: 1.2 }}>{cat.name}</div>
                  <div style={{ fontSize: 11, color: GRAY }}>{cat.en}</div>
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
   Scene 8: SOCIAL PROOF — Nepali
   ═══════════════════════════════════════ */
function SocialProofScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stats = [
    { number: '७०+', label: 'सरकारी सेवाहरू म्याप गरिएको', labelEn: 'Government services mapped', icon: '🏛️', delay: 10 },
    { number: '१०', label: 'सेवा श्रेणीहरू', labelEn: 'Service categories', icon: '📂', delay: 28 },
    { number: 'निःशुल्क', label: 'कुनै शुल्क छैन, दलाल छैन', labelEn: 'No fees, no brokers', icon: '🇳🇵', delay: 46 },
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
          प्रत्येक{'\n'}
          <span style={{ color: GOLD }}>नेपाली नागरिकका लागि</span>
        </div>
        <div style={{
          fontSize: 24, fontWeight: 500, color: GRAY, textAlign: 'center',
          marginBottom: 50, opacity: headerIn,
        }}>
          Built for every Nepali citizen
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
                <div style={{ fontSize: 34, fontWeight: 900, color: GOLD, minWidth: 90 }}>
                  {stat.number}
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{stat.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: GRAY }}>{stat.labelEn}</div>
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
   Scene 9: CTA — Nepali
   ═══════════════════════════════════════ */
function CTAScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const imgIn = spring({ frame, fps, from: 1.05, to: 1, config: { damping: 15, mass: 0.5 } });
  const overlayIn = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const btnIn = spring({ frame: frame - 40, fps, from: 0, to: 1, config: { damping: 10 } });
  const btnPulse = Math.sin(frame * 0.12) * 0.04 + 1;
  const tagIn = spring({ frame: frame - 60, fps, from: 0, to: 1, config: { damping: 12 } });

  return (
    <AbsoluteFill style={{ background: DARK }}>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${imgIn})` }}>
        <img src={staticFile('images/promo-hero.png')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.75) 80%, rgba(0,0,0,0.92) 100%)',
        opacity: overlayIn,
      }} />

      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '0 40px 80px', opacity: overlayIn,
      }}>
        <div style={{ transform: `scale(${btnIn * btnPulse})`, opacity: btnIn, marginBottom: 20 }}>
          <div style={{
            background: `linear-gradient(90deg, ${RED}, #b91c1c)`,
            borderRadius: 36, padding: '20px 56px',
            textAlign: 'center',
            boxShadow: `0 8px 40px ${RED}50`,
          }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: WHITE }}>
              निःशुल्क प्रयोग गर्नुहोस् →
            </span>
          </div>
        </div>

        <div style={{
          fontSize: 20, fontWeight: 500, color: 'rgba(255,255,255,0.8)', textAlign: 'center',
          opacity: tagIn, lineHeight: 1.5,
        }}>
          कुनै पनि डिभाइसमा • डाउनलोड आवश्यक छैन
        </div>
      </div>
    </AbsoluteFill>
  );
}

/* ═══════════════════════════════════════
   MAIN COMPOSITION
   ═══════════════════════════════════════ */
export interface ServicesMarketingNEData {}

export const ServicesMarketingNE: React.FC<{ data: ServicesMarketingNEData }> = () => {
  return (
    <AbsoluteFill style={{ background: DARK, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      {/* ═══ VISUAL SCENES ═══ */}

      <Sequence from={0} durationInFrames={213}>
        <HookScene />
      </Sequence>

      <Sequence from={213} durationInFrames={223}>
        <PainScene />
      </Sequence>

      <Sequence from={436} durationInFrames={239}>
        <LandingScene />
      </Sequence>

      <Sequence from={675} durationInFrames={325}>
        <AdvisorDemoScene />
      </Sequence>

      <Sequence from={1000} durationInFrames={201}>
        <FormFillScene />
      </Sequence>

      <Sequence from={1201} durationInFrames={233}>
        <TrackingScene />
      </Sequence>

      <Sequence from={1434} durationInFrames={222}>
        <ServicesBreadthScene />
      </Sequence>

      <Sequence from={1656} durationInFrames={180}>
        <SocialProofScene />
      </Sequence>

      <Sequence from={1836} durationInFrames={189}>
        <CTAScene />
      </Sequence>

      {/* ═══ VOICEOVER — SagarNeural, per-scene ═══ */}

      <Sequence from={0} durationInFrames={183}>
        <Audio src={staticFile('audio/promo-ne/01-hook.mp3')} volume={1} />
      </Sequence>

      <Sequence from={213} durationInFrames={193}>
        <Audio src={staticFile('audio/promo-ne/02-pain.mp3')} volume={1} />
      </Sequence>

      <Sequence from={436} durationInFrames={209}>
        <Audio src={staticFile('audio/promo-ne/03-landing.mp3')} volume={1} />
      </Sequence>

      <Sequence from={675} durationInFrames={295}>
        <Audio src={staticFile('audio/promo-ne/04-advisor.mp3')} volume={1} />
      </Sequence>

      <Sequence from={1000} durationInFrames={171}>
        <Audio src={staticFile('audio/promo-ne/05-formfill.mp3')} volume={1} />
      </Sequence>

      <Sequence from={1201} durationInFrames={203}>
        <Audio src={staticFile('audio/promo-ne/06-tracking.mp3')} volume={1} />
      </Sequence>

      <Sequence from={1434} durationInFrames={192}>
        <Audio src={staticFile('audio/promo-ne/07-services.mp3')} volume={1} />
      </Sequence>

      <Sequence from={1656} durationInFrames={150}>
        <Audio src={staticFile('audio/promo-ne/08-proof.mp3')} volume={1} />
      </Sequence>

      <Sequence from={1836} durationInFrames={159}>
        <Audio src={staticFile('audio/promo-ne/09-cta.mp3')} volume={1} />
      </Sequence>
    </AbsoluteFill>
  );
};
