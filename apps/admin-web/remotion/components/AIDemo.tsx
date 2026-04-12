import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  spring,
  Sequence,
  useVideoConfig,
  Img,
  staticFile,
} from 'remotion';

/* ══════════════════════════════════════════════
   AI DEMO REEL — 45s marketing showcase
   Visually rich with background images per scene

   Timeline (1350 frames @ 30fps):
   0-4s     (0-120)      Hook — "Nepal Republic AI understands you"
   4-11s    (120-330)     Demo 1 — health
   11-18s   (330-540)     Demo 2 — infrastructure
   18-25s   (540-750)     Demo 3 — corruption
   25-32s   (750-960)     Demo 4 — abroad
   32-39s   (960-1170)    Demo 5 — greeting
   39-45s   (1170-1350)   CTA
   ══════════════════════════════════════════════ */

const RED = '#DC143C';
const BLUE = '#003893';
const DARK = '#0a0a12';
const WHITE = '#ffffff';
const GOLD = '#fbbf24';
const GREEN = '#34d399';
const GRAY = '#94a3b8';

export interface AIDemoData {
  demos: {
    userInput: string;
    aiResponse: string;
    category: string;
    categoryNe: string;
    options: string[];
    emoji: string;
    imageUrl?: string;
  }[];
}

const DEFAULT_DEMOS: AIDemoData['demos'] = [
  {
    userInput: 'mero pet dukhyo',
    aiResponse: 'तपाईंलाई अस्पताल वा डाक्टर चाहिन्छ?',
    category: 'Health Triage',
    categoryNe: 'स्वास्थ्य सेवा',
    options: ['Bir Hospital', 'TUTH Hospital', "Kanti Children's", 'Pharmacy'],
    emoji: '🏥',
  },
  {
    userInput: 'ghar ma pani aayena',
    aiResponse: 'पानी नआएको समस्या वडामा रिपोर्ट गरौं।',
    category: 'Infrastructure',
    categoryNe: 'पूर्वाधार उजुरी',
    options: ['वडामा रिपोर्ट', 'हटलाइन कल', 'ट्र्याक गर्नुहोस्'],
    emoji: '🚰',
  },
  {
    userInput: 'police le paisa magyo',
    aiResponse: 'भ्रष्टाचार उजुरी CIAA मा दिन सकिन्छ।',
    category: 'Anti-Corruption',
    categoryNe: 'भ्रष्टाचार उजुरी',
    options: ['CIAA उजुरी', 'हटलाइन: 107', 'गोप्य रिपोर्ट'],
    emoji: '⚖️',
  },
  {
    userInput: 'bidesh jaanu cha',
    aiResponse: 'कस्तो सेवा चाहिन्छ?',
    category: 'Smart Routing',
    categoryNe: 'बुद्धिमान मार्गदर्शन',
    options: ['पासपोर्ट', 'श्रम अनुमति', 'भिसा', 'NOC'],
    emoji: '✈️',
  },
  {
    userInput: 'namaste',
    aiResponse: 'नमस्ते! कसरी मद्दत गर्न सक्छु?',
    category: 'Smart Greeting',
    categoryNe: 'अभिवादन',
    options: ['सरकारी सेवा', 'समस्या रिपोर्ट', 'स्वास्थ्य', 'अन्य'],
    emoji: '🙏',
  },
];

/* ── Persistent top bar ── */
function TopBar() {
  const frame = useCurrentFrame();
  const blink = Math.sin(frame * 0.35) > 0;
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
      background: `linear-gradient(90deg, ${RED}, ${RED}ee)`,
      padding: '14px 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      backdropFilter: 'blur(10px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 12, height: 12, borderRadius: 6, background: WHITE, opacity: blink ? 1 : 0.3 }} />
        <span style={{ fontSize: 20, fontWeight: 900, color: WHITE, letterSpacing: 3 }}>AI DEMO</span>
      </div>
      <span style={{ fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>nepalrepublic.org</span>
    </div>
  );
}

function BottomBar() {
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100,
      height: 60, background: `linear-gradient(90deg, ${RED}, ${BLUE})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
    }}>
      <span style={{ fontSize: 24, fontWeight: 900, color: WHITE, letterSpacing: 2 }}>NEPAL REPUBLIC</span>
      <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)' }}>|</span>
      <span style={{ fontSize: 20, fontWeight: 700, color: GOLD }}>AI-POWERED 🤖</span>
    </div>
  );
}

/* ── Animated gradient background ── */
function AnimatedBG({ color1, color2 }: { color1: string; color2: string }) {
  const frame = useCurrentFrame();
  const angle = interpolate(frame, [0, 210], [135, 180], { extrapolateRight: 'clamp' });
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: `linear-gradient(${angle}deg, ${color1} 0%, ${DARK} 40%, ${color2}33 100%)`,
    }} />
  );
}

/* ── HOOK (0-4s) — dramatic intro ── */
function Hook() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const iconIn = spring({ frame, fps, from: 3, to: 1, config: { damping: 8, mass: 0.3 } });
  const titleIn = spring({ frame: frame - 10, fps, from: 0, to: 1, config: { damping: 12 } });
  const subIn = spring({ frame: frame - 25, fps, from: 0, to: 1, config: { damping: 12 } });
  const tagIn = spring({ frame: frame - 45, fps, from: 0, to: 1, config: { damping: 12 } });
  const flashOpacity = interpolate(frame, [0, 3, 10], [0.5, 0.3, 0], { extrapolateRight: 'clamp' });

  // Pulsing glow behind icon
  const glowPulse = Math.sin(frame * 0.1) * 0.3 + 0.7;

  return (
    <AbsoluteFill style={{ background: DARK }}>
      <TopBar />
      {/* Radial gradient background */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(circle at 50% 45%, ${RED}25 0%, transparent 60%), radial-gradient(circle at 30% 70%, ${BLUE}20 0%, transparent 50%)`,
      }} />
      {/* Red flash */}
      <div style={{ position: 'absolute', inset: 0, background: RED, opacity: flashOpacity }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: 60 }}>
        {/* Glowing AI icon */}
        <div style={{
          fontSize: 120, textAlign: 'center',
          transform: `scale(${iconIn})`, opacity: iconIn,
          filter: `drop-shadow(0 0 ${40 * glowPulse}px ${RED}88)`,
        }}>
          🤖
        </div>

        <div style={{
          fontSize: 58, fontWeight: 900, color: WHITE, textAlign: 'center',
          transform: `translateY(${(1 - titleIn) * 50}px)`, opacity: titleIn,
          marginTop: 30, lineHeight: 1.2,
          textShadow: `0 0 40px ${RED}60`,
        }}>
          Nepal Republic AI
        </div>

        <div style={{
          fontSize: 40, fontWeight: 700, color: GOLD, textAlign: 'center',
          transform: `translateY(${(1 - subIn) * 30}px)`, opacity: subIn,
          marginTop: 24,
        }}>
          तपाईंको भाषा बुझ्छ 🇳🇵
        </div>

        <div style={{
          display: 'flex', gap: 16, marginTop: 32,
          opacity: tagIn, transform: `translateY(${(1 - tagIn) * 20}px)`,
        }}>
          {['Nepali', 'English', 'Romanized'].map((lang) => (
            <div key={lang} style={{
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 20, padding: '8px 20px',
              fontSize: 22, fontWeight: 600, color: WHITE,
              backdropFilter: 'blur(4px)',
            }}>
              {lang}
            </div>
          ))}
        </div>

        {/* "Watch 5 real demos" teaser */}
        <div style={{
          marginTop: 50, opacity: interpolate(frame, [60, 80], [0, 1], { extrapolateRight: 'clamp' }),
          fontSize: 26, fontWeight: 500, color: GRAY, textAlign: 'center',
        }}>
          ▼ ५ वटा उदाहरण हेर्नुहोस् ▼
        </div>
      </div>
      <BottomBar />
    </AbsoluteFill>
  );
}

/* ── Single Demo Scene (7s each) — visually rich ── */
function DemoScene({ demo, index }: { demo: AIDemoData['demos'][0]; index: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Scene-specific accent colors
  const accentColors = ['#ef4444', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6'];
  const accent = accentColors[index % accentColors.length];

  // Background image handling
  const hasImage = Boolean(demo.imageUrl);

  // Typing effect
  const typingProgress = interpolate(frame, [10, 55], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const visibleChars = Math.floor(typingProgress * demo.userInput.length);
  const typedText = demo.userInput.slice(0, visibleChars);
  const cursorBlink = Math.sin(frame * 0.4) > 0;

  // AI response
  const responseIn = spring({ frame: frame - 65, fps, from: 0, to: 1, config: { damping: 12 } });

  // Category badge
  const badgeIn = spring({ frame: frame - 80, fps, from: 0, to: 1, config: { damping: 15 } });

  // Options staggered
  const optionStarts = demo.options.map((_, i) => 100 + i * 10);

  // Scene entry zoom
  const sceneZoom = interpolate(frame, [0, 10], [1.05, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: DARK, transform: `scale(${sceneZoom})` }}>
      {/* Background image or gradient */}
      {hasImage ? (
        <>
          <Img src={demo.imageUrl!} style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', filter: 'brightness(0.25) blur(3px) saturate(1.3)',
            transform: `scale(${interpolate(frame, [0, 210], [1.0, 1.08], { extrapolateRight: 'clamp' })})`,
          }} />
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${DARK}cc 0%, ${DARK}88 30%, ${DARK}bb 70%, ${DARK} 100%)` }} />
        </>
      ) : (
        <AnimatedBG color1={accent} color2={BLUE} />
      )}

      <TopBar />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '80px 40px 80px' }}>
        {/* Demo number + emoji */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24,
          opacity: interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' }),
        }}>
          <div style={{
            background: accent, borderRadius: 16, width: 48, height: 48,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 900, color: WHITE,
            boxShadow: `0 4px 20px ${accent}66`,
          }}>
            {index + 1}
          </div>
          <span style={{ fontSize: 50 }}>{demo.emoji}</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: GRAY, letterSpacing: 3 }}>
            DEMO {index + 1}/5
          </span>
        </div>

        {/* User input — chat bubble */}
        <div style={{
          background: 'rgba(30,41,59,0.9)', borderRadius: 28, padding: '24px 32px',
          marginBottom: 24, maxWidth: '88%',
          marginLeft: 'auto',
          border: '2px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 16, background: '#64748b',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16,
            }}>👤</div>
            <span style={{ fontSize: 16, fontWeight: 700, color: GRAY }}>You</span>
          </div>
          <div style={{ fontSize: 38, fontWeight: 600, color: WHITE, lineHeight: 1.4 }}>
            {typedText}
            {cursorBlink && typingProgress < 1 && (
              <span style={{ color: GOLD, fontWeight: 300 }}>|</span>
            )}
          </div>
        </div>

        {/* AI response — chat bubble */}
        <div style={{
          background: `linear-gradient(135deg, ${RED}18, ${BLUE}18)`,
          borderRadius: 28, padding: '24px 32px',
          marginBottom: 24, maxWidth: '88%',
          border: `2px solid ${accent}44`,
          backdropFilter: 'blur(8px)',
          boxShadow: `0 8px 32px ${accent}22`,
          transform: `translateY(${(1 - responseIn) * 40}px)`,
          opacity: responseIn,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 16,
              background: `linear-gradient(135deg, ${RED}, ${BLUE})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16,
            }}>🤖</div>
            <span style={{ fontSize: 16, fontWeight: 700, color: GOLD }}>Nepal Republic AI</span>
          </div>
          <div style={{ fontSize: 34, fontWeight: 600, color: WHITE, lineHeight: 1.4 }}>
            {demo.aiResponse}
          </div>
        </div>

        {/* Category badge */}
        <div style={{
          display: 'flex', justifyContent: 'center', marginBottom: 20,
          transform: `scale(${badgeIn})`, opacity: badgeIn,
        }}>
          <div style={{
            background: `linear-gradient(90deg, ${accent}, ${accent}cc)`,
            borderRadius: 24, padding: '10px 28px',
            display: 'flex', alignItems: 'center', gap: 10,
            boxShadow: `0 4px 20px ${accent}44`,
          }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: WHITE }}>
              → {demo.categoryNe}
            </span>
          </div>
        </div>

        {/* Options */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center',
          padding: '0 10px',
        }}>
          {demo.options.map((opt, i) => {
            const optIn = spring({ frame: frame - optionStarts[i], fps, from: 0, to: 1, config: { damping: 12 } });
            return (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.95)', borderRadius: 28, padding: '12px 24px',
                fontSize: 22, fontWeight: 700, color: DARK,
                transform: `scale(${optIn})`, opacity: optIn,
                boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
              }}>
                {opt}
              </div>
            );
          })}
        </div>
      </div>

      <BottomBar />
    </AbsoluteFill>
  );
}

/* ── CTA (39-45s) — epic ending ── */
function CTA() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scaleIn = spring({ frame, fps, from: 0.5, to: 1, config: { damping: 8, mass: 0.3 } });
  const urlIn = spring({ frame: frame - 25, fps, from: 0, to: 1, config: { damping: 12 } });
  const tagIn = spring({ frame: frame - 45, fps, from: 0, to: 1, config: { damping: 12 } });
  const btnIn = spring({ frame: frame - 65, fps, from: 0, to: 1, config: { damping: 10 } });
  const flashOpacity = interpolate(frame, [0, 5, 15], [0.4, 0.2, 0], { extrapolateRight: 'clamp' });
  const btnPulse = Math.sin(frame * 0.15) * 0.05 + 1;

  return (
    <AbsoluteFill style={{ background: DARK }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(circle at 50% 50%, ${RED}30 0%, transparent 60%), radial-gradient(circle at 70% 30%, ${BLUE}25 0%, transparent 50%)`,
      }} />
      <div style={{ position: 'absolute', inset: 0, background: RED, opacity: flashOpacity }} />
      <TopBar />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: 60 }}>
        <div style={{
          fontSize: 60, fontWeight: 900, color: WHITE, textAlign: 'center',
          transform: `scale(${scaleIn})`, lineHeight: 1.2,
          textShadow: `0 0 40px ${RED}50`,
        }}>
          आज नै{'\n'}प्रयोग गर्नुहोस् 🚀
        </div>

        <div style={{
          fontSize: 48, fontWeight: 800, color: GOLD, textAlign: 'center',
          marginTop: 40, transform: `translateY(${(1 - urlIn) * 30}px)`, opacity: urlIn,
          textShadow: `0 0 20px ${GOLD}40`,
        }}>
          nepalrepublic.org
        </div>

        <div style={{
          fontSize: 30, fontWeight: 600, color: WHITE, textAlign: 'center',
          marginTop: 30, opacity: tagIn, lineHeight: 1.6,
        }}>
          🇳🇵 AI-powered civic assistant{'\n'}
          <span style={{ color: GRAY }}>for every Nepali citizen</span>
        </div>

        {/* CTA buttons */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 16, marginTop: 50,
          transform: `scale(${btnIn * btnPulse})`, opacity: btnIn,
        }}>
          <div style={{
            background: `linear-gradient(90deg, ${RED}, #b91c1c)`,
            borderRadius: 40, padding: '20px 60px',
            fontSize: 32, fontWeight: 900, color: WHITE, textAlign: 'center',
            boxShadow: `0 8px 30px ${RED}66`,
          }}>
            🔔 Try Now — Free
          </div>
          <div style={{
            fontSize: 20, fontWeight: 600, color: GRAY, textAlign: 'center',
          }}>
            No signup needed • Works instantly
          </div>
        </div>
      </div>

      <BottomBar />
    </AbsoluteFill>
  );
}

/* ── MAIN COMPOSITION ── */
export const AIDemo: React.FC<{ data: AIDemoData }> = ({ data }) => {
  const demos = data?.demos?.length ? data.demos : DEFAULT_DEMOS;

  return (
    <AbsoluteFill style={{ background: DARK }}>
      <Sequence from={0} durationInFrames={120}>
        <Hook />
      </Sequence>
      {demos.map((demo, i) => (
        <Sequence key={i} from={120 + i * 210} durationInFrames={210}>
          <DemoScene demo={demo} index={i} />
        </Sequence>
      ))}
      <Sequence from={1170} durationInFrames={180}>
        <CTA />
      </Sequence>
    </AbsoluteFill>
  );
};
