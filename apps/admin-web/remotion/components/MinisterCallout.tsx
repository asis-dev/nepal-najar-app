import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
  Easing,
} from 'remotion';

const NEPAL_RED = '#DC143C';
const NEPAL_BLUE = '#003893';
const DARK_BG = '#0a0a0f';
const CARD_BG = '#141420';
const GOLD = '#f59e0b';
const GREEN = '#22c55e';
const RED_ACCENT = '#ef4444';
const WHITE = '#ffffff';
const GRAY = '#9ca3af';

export interface MinisterCalloutData {
  dayNumber: number;
  minister: {
    name: string;
    nameNe: string;
    role: string;
    roleNe: string;
  };
  commitments: { titleNe: string; status: 'done' | 'progress' | 'stalled' | 'not_started'; progress: number }[];
  signalCount: number;
  topHeadline: string;
}

/* ── Hook / Question ── */
function HookQuestion({ data }: { data: MinisterCalloutData }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({ frame: Math.max(0, frame - 10), fps, from: 0.7, to: 1, config: { damping: 10 } });

  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, ${NEPAL_RED}30 0%, ${DARK_BG} 70%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 30, padding: '0 60px' }}>
      <div style={{ opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' }), transform: `scale(${scale})`, fontSize: 48, fontWeight: 900, color: WHITE, textAlign: 'center', lineHeight: 1.3 }}>
        यो मन्त्रीले {data.dayNumber} दिनमा के गरे? 🤔
      </div>
      <div style={{ opacity: interpolate(frame, [40, 55], [0, 1], { extrapolateRight: 'clamp' }), width: 200, height: 4, background: NEPAL_RED, borderRadius: 2 }} />
    </AbsoluteFill>
  );
}

/* ── Minister Reveal ── */
function MinisterReveal({ data }: { data: MinisterCalloutData }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const nameScale = spring({ frame: Math.max(0, frame - 10), fps, from: 1.5, to: 1, config: { damping: 8 } });
  const nameOpacity = interpolate(frame, [10, 25], [0, 1], { extrapolateRight: 'clamp' });
  const roleOpacity = interpolate(frame, [35, 45], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: DARK_BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '0 60px' }}>
      {/* Minister avatar placeholder — large circle with initials */}
      <div style={{
        width: 180, height: 180, borderRadius: 90,
        background: `linear-gradient(135deg, ${NEPAL_BLUE}, ${NEPAL_RED})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 72, fontWeight: 900, color: WHITE,
        opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' }),
        border: `4px solid ${GOLD}`,
      }}>
        {data.minister.nameNe.charAt(0)}
      </div>

      {/* Name */}
      <div style={{ opacity: nameOpacity, transform: `scale(${nameScale})`, fontSize: 44, fontWeight: 900, color: WHITE, textAlign: 'center' }}>
        {data.minister.nameNe}
      </div>

      {/* Role */}
      <div style={{ opacity: roleOpacity, fontSize: 26, color: GOLD, fontWeight: 600, textAlign: 'center', maxWidth: 700 }}>
        {data.minister.roleNe}
      </div>

      {/* Signal count */}
      <div style={{
        opacity: interpolate(frame, [50, 60], [0, 1], { extrapolateRight: 'clamp' }),
        fontSize: 22, color: GRAY, marginTop: 10,
      }}>
        📡 {data.signalCount} संकेत ट्र्याक गरिएको
      </div>
    </AbsoluteFill>
  );
}

/* ── Commitment Checklist ── */
function CommitmentChecklist({ data }: { data: MinisterCalloutData }) {
  const frame = useCurrentFrame();
  const commitments = data.commitments.slice(0, 5);

  const statusIcon = (s: string) => s === 'done' ? '✅' : s === 'progress' ? '🔄' : s === 'stalled' ? '❌' : '⏳';
  const statusCol = (s: string) => s === 'done' ? GREEN : s === 'progress' ? '#3b82f6' : s === 'stalled' ? RED_ACCENT : GRAY;

  return (
    <AbsoluteFill style={{ background: DARK_BG, display: 'flex', flexDirection: 'column', padding: '100px 50px', justifyContent: 'center', gap: 20 }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: WHITE, marginBottom: 16, opacity: interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' }) }}>
        📋 प्रतिबद्धता प्रगति
      </div>

      {commitments.map((c, i) => {
        const delay = 10 + i * 20;
        const opacity = interpolate(frame, [delay, delay + 10], [0, 1], { extrapolateRight: 'clamp' });
        const slideX = interpolate(frame, [delay, delay + 12], [-400, 0], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
        const progressWidth = interpolate(frame, [delay + 5, delay + 25], [0, c.progress], { extrapolateRight: 'clamp' });
        const color = statusCol(c.status);

        // Stamp effect for the status icon
        const stampScale = spring({ frame: Math.max(0, frame - delay - 12), fps: 30, from: 2, to: 1, config: { damping: 8 } });
        const stampOpacity = interpolate(frame, [delay + 12, delay + 16], [0, 1], { extrapolateRight: 'clamp' });

        return (
          <div key={i} style={{ opacity, transform: `translateX(${slideX}px)`, background: CARD_BG, borderRadius: 16, padding: '16px 24px', borderLeft: `4px solid ${color}`, display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Status stamp */}
            <div style={{ fontSize: 36, opacity: stampOpacity, transform: `scale(${stampScale})`, flexShrink: 0 }}>
              {statusIcon(c.status)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 22, color: WHITE, fontWeight: 600, lineHeight: 1.3, marginBottom: 8 }}>
                {c.titleNe}
              </div>
              <div style={{ height: 8, background: '#1f1f2e', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${progressWidth}%`, height: '100%', background: color, borderRadius: 4 }} />
              </div>
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>
              {Math.round(progressWidth)}%
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

/* ── Verdict ── */
function Verdict({ data }: { data: MinisterCalloutData }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const done = data.commitments.filter(c => c.status === 'done').length;
  const progress = data.commitments.filter(c => c.status === 'progress').length;
  const stalled = data.commitments.filter(c => c.status === 'stalled').length;
  const total = data.commitments.length;

  const verdictScale = spring({ frame: Math.max(0, frame - 20), fps, from: 2, to: 1, config: { damping: 8, mass: 0.5 } });
  const glowIntensity = interpolate(Math.sin(frame * 0.15), [-1, 1], [20, 50]);

  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, ${NEPAL_RED}25 0%, ${DARK_BG} 70%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '0 60px' }}>
      {/* Stats row */}
      <div style={{ display: 'flex', gap: 24, opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' }) }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 52, fontWeight: 900, color: GREEN }}>{done}</div>
          <div style={{ fontSize: 18, color: GRAY }}>पूरा</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 52, fontWeight: 900, color: '#3b82f6' }}>{progress}</div>
          <div style={{ fontSize: 18, color: GRAY }}>प्रगतिमा</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 52, fontWeight: 900, color: RED_ACCENT }}>{stalled}</div>
          <div style={{ fontSize: 18, color: GRAY }}>रोकिएको</div>
        </div>
      </div>

      {/* Verdict text */}
      <div style={{ opacity: interpolate(frame, [20, 35], [0, 1], { extrapolateRight: 'clamp' }), transform: `scale(${verdictScale})`, fontSize: 36, fontWeight: 800, color: WHITE, textAlign: 'center', lineHeight: 1.4, marginTop: 20 }}>
        {stalled > done ? `चिन्ताजनक — ${stalled} प्रतिबद्धता रोकिएको छ` : done > 0 ? `${done}/{total} पूरा — प्रगति देखिँदैछ` : `अझै प्रारम्भिक चरणमा`}
      </div>

      {/* CTA */}
      <div style={{ marginTop: 30, background: `${NEPAL_RED}20`, border: `2px solid ${NEPAL_RED}`, borderRadius: 20, padding: '14px 40px', fontSize: 30, fontWeight: 800, color: WHITE, boxShadow: `0 0 ${glowIntensity}px ${NEPAL_RED}60`, opacity: interpolate(frame, [40, 50], [0, 1], { extrapolateRight: 'clamp' }) }}>
        nepalrepublic.org
      </div>
    </AbsoluteFill>
  );
}

export const MinisterCallout: React.FC<{ data: MinisterCalloutData }> = ({ data }) => {
  return (
    <AbsoluteFill style={{ background: DARK_BG, fontFamily: "'Noto Sans Devanagari', 'Inter', system-ui, sans-serif" }}>
      <Sequence from={0} durationInFrames={90}><HookQuestion data={data} /></Sequence>
      <Sequence from={90} durationInFrames={120}><MinisterReveal data={data} /></Sequence>
      <Sequence from={210} durationInFrames={360}><CommitmentChecklist data={data} /></Sequence>
      <Sequence from={570} durationInFrames={330}><Verdict data={data} /></Sequence>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 6, background: `linear-gradient(90deg, ${NEPAL_RED}, ${NEPAL_BLUE})` }} />
    </AbsoluteFill>
  );
};
