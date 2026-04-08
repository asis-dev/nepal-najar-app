import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { getPromiseById, getPromiseBySlug } from '@/lib/data/promises';

export const runtime = 'edge';

const NEPAL_RED = '#DC143C';
const NEPAL_BLUE = '#003893';
const BELL_GOLD = '#D9A441';
const BG_DARK = '#0a0e1a';

function getStatusConfig(status: string) {
  switch (status) {
    case 'in_progress': return { color: '#22d3ee', label: 'IN PROGRESS', labelNe: 'प्रगतिमा' };
    case 'delivered': return { color: '#10b981', label: 'DELIVERED', labelNe: 'पूरा भयो' };
    case 'stalled': return { color: '#ef4444', label: 'STALLED', labelNe: 'रोकिएको' };
    default: return { color: '#9ca3af', label: 'NOT STARTED', labelNe: 'सुरु भएको छैन' };
  }
}

function scoreToGrade(progress: number): string {
  if (progress >= 80) return 'A';
  if (progress >= 60) return 'B';
  if (progress >= 40) return 'C';
  if (progress >= 20) return 'D';
  return 'F';
}

const GRADE_COLORS: Record<string, string> = {
  A: '#10b981', B: '#3b82f6', C: '#f59e0b', D: '#f97316', F: '#ef4444',
};

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const toRad = (d: number) => ((d - 90) * Math.PI) / 180;
  const x1 = cx + r * Math.cos(toRad(startDeg));
  const y1 = cy + r * Math.sin(toRad(startDeg));
  const x2 = cx + r * Math.cos(toRad(endDeg));
  const y2 = cy + r * Math.sin(toRad(endDeg));
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

const GOV_START = new Date('2026-03-26T00:00:00+05:45').getTime();
function daysSinceStart(): number {
  return Math.max(0, Math.floor((Date.now() - GOV_START) / (1000 * 60 * 60 * 24)));
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const id = searchParams.get('id');
  const lang = searchParams.get('lang') || 'en';
  const format = searchParams.get('format') || 'square'; // 'story' = 1080x1920, 'square' = 1080x1080
  const isNe = lang === 'ne';
  const isStory = format === 'story';
  const width = 1080;
  const height = isStory ? 1920 : 1080;

  const commitment = id ? getPromiseBySlug(id) || getPromiseById(id) : null;

  if (!commitment) {
    return new ImageResponse(
      (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(145deg, ${BG_DARK} 0%, ${NEPAL_BLUE}22 40%, ${NEPAL_RED}18 70%, ${BG_DARK} 100%)`, fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ fontSize: '42px', fontWeight: 800, letterSpacing: '0.2em', color: BELL_GOLD, display: 'flex' }}>NEPAL REPUBLIC</div>
          <div style={{ fontSize: '24px', color: 'rgba(255,255,255,0.5)', display: 'flex', marginTop: '16px' }}>nepalrepublic.org</div>
        </div>
      ),
      { width, height, headers: { 'Cache-Control': 'public, max-age=3600' } },
    );
  }

  const title = isNe && commitment.title_ne ? commitment.title_ne : commitment.title;
  const progress = commitment.progress;
  const status = getStatusConfig(commitment.status);
  const category = isNe && commitment.category_ne ? commitment.category_ne : commitment.category;
  const grade = scoreToGrade(progress);
  const gradeColor = GRADE_COLORS[grade];
  const actors = (commitment.actors || []).slice(0, 2);
  const evidenceCount = commitment.evidenceCount || 0;
  const days = daysSinceStart();
  const summary = isNe && commitment.summary_ne ? commitment.summary_ne : (commitment.summary || '');
  const shortSummary = summary.length > 120 ? summary.slice(0, 117) + '...' : summary;

  const arcCx = 130, arcCy = 130, arcR = 105;
  const progressAngle = Math.max(1, (progress / 100) * 360);
  const arcColor = progress >= 80 ? '#10b981' : progress >= 40 ? '#3b82f6' : progress >= 20 ? '#f59e0b' : '#ef4444';

  const dateStr = isNe
    ? `${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(new Date().getDate()).padStart(2, '0')}`
    : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const titleSize = title.length > 80 ? 30 : title.length > 50 ? 38 : 46;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'space-between',
          background: `linear-gradient(180deg, #060810 0%, #0a1020 30%, #081018 60%, #060810 100%)`,
          fontFamily: 'system-ui, sans-serif', position: 'relative',
          padding: isStory ? '80px 60px' : '50px 60px',
        }}
      >
        {/* Top accent */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '8px', background: `linear-gradient(90deg, ${NEPAL_RED}, ${BELL_GOLD}, ${NEPAL_BLUE})`, display: 'flex' }} />

        {/* Glow */}
        <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)', width: '800px', height: '800px', borderRadius: '50%', background: `radial-gradient(ellipse, ${arcColor}10 0%, transparent 70%)`, display: 'flex' }} />

        {/* ── Header: Brand + Date ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: `linear-gradient(135deg, ${NEPAL_RED}, ${NEPAL_BLUE})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '24px' }}>🔔</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '0.2em', color: BELL_GOLD, display: 'flex' }}>{isNe ? 'नेपाल रिपब्लिक' : 'NEPAL REPUBLIC'}</span>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', display: 'flex' }}>{isNe ? 'प्रतिबद्धता ट्र्याकर' : 'COMMITMENT TRACKER'}</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', display: 'flex' }}>{dateStr}</span>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.25)', display: 'flex' }}>{isNe ? `दिन ${days}` : `Day ${days}`}</span>
          </div>
        </div>

        {/* ── Center content ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isStory ? '36px' : '24px', flex: 1, justifyContent: 'center' }}>

          {/* Progress ring + Grade badge side by side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
            {/* Progress ring */}
            <div style={{ width: '260px', height: '260px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="260" height="260" viewBox="0 0 260 260">
                <circle cx={arcCx} cy={arcCy} r={arcR} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={14} />
                {progress > 0 && <path d={describeArc(arcCx, arcCy, arcR, 0, progressAngle)} fill="none" stroke={arcColor} strokeWidth={14} strokeLinecap="round" />}
              </svg>
              <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ fontSize: '64px', fontWeight: 900, color: arcColor, lineHeight: 1, display: 'flex' }}>{progress}%</div>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', display: 'flex' }}>{isNe ? 'प्रगति' : 'PROGRESS'}</div>
              </div>
            </div>

            {/* Grade badge */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '100px', height: '100px', borderRadius: '24px', background: `${gradeColor}20`, border: `3px solid ${gradeColor}60`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '60px', fontWeight: 900, color: gradeColor, display: 'flex' }}>{grade}</span>
              </div>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', display: 'flex' }}>{isNe ? 'ग्रेड' : 'GRADE'}</span>
            </div>
          </div>

          {/* Title */}
          <div style={{ fontSize: `${titleSize}px`, fontWeight: 800, color: 'white', lineHeight: 1.2, textAlign: 'center', maxWidth: '900px', display: 'flex' }}>{title}</div>

          {/* Status + Category pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px 24px', borderRadius: '100px', background: `${status.color}18`, border: `1.5px solid ${status.color}40`, color: status.color, fontSize: '15px', fontWeight: 700, letterSpacing: '0.12em', display: 'flex' }}>
              {isNe ? status.labelNe : status.label}
            </div>
            <div style={{ padding: '10px 24px', borderRadius: '100px', background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: '15px', fontWeight: 600, display: 'flex' }}>
              {category}
            </div>
          </div>

          {/* Summary snippet */}
          {shortSummary ? (
            <div style={{ fontSize: '18px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, textAlign: 'center', maxWidth: '850px', fontStyle: 'italic', display: 'flex' }}>
              &ldquo;{shortSummary}&rdquo;
            </div>
          ) : null}

          {/* Stats row */}
          <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
            {/* Evidence */}
            <div style={{ padding: '14px 24px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', minWidth: '120px' }}>
              <span style={{ fontSize: '28px', fontWeight: 800, color: '#60a5fa', display: 'flex' }}>{String(evidenceCount)}</span>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', display: 'flex' }}>{isNe ? 'प्रमाण' : 'EVIDENCE'}</span>
            </div>
            {/* Sources */}
            <div style={{ padding: '14px 24px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', minWidth: '120px' }}>
              <span style={{ fontSize: '28px', fontWeight: 800, color: '#a78bfa', display: 'flex' }}>{String(commitment.sourceCount || 0)}</span>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', display: 'flex' }}>{isNe ? 'स्रोतहरू' : 'SOURCES'}</span>
            </div>
            {/* Day */}
            <div style={{ padding: '14px 24px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', minWidth: '120px' }}>
              <span style={{ fontSize: '28px', fontWeight: 800, color: '#fbbf24', display: 'flex' }}>{String(days)}</span>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', display: 'flex' }}>{isNe ? 'दिन' : 'DAYS'}</span>
            </div>
          </div>

          {/* Actors */}
          {actors.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)', display: 'flex' }}>{isNe ? 'जिम्मेवार:' : 'Responsible:'}</span>
              {actors.map((a, i) => (
                <span key={i} style={{ fontSize: '14px', color: 'rgba(255,255,255,0.55)', fontWeight: 600, display: 'flex' }}>{a}{i < actors.length - 1 ? ',' : ''}</span>
              ))}
            </div>
          ) : null}
        </div>

        {/* ── Footer ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', padding: '14px 40px', borderRadius: '100px', background: `linear-gradient(135deg, ${NEPAL_RED}dd, ${NEPAL_BLUE}dd)`, border: '1px solid rgba(255,255,255,0.2)' }}>
            <span style={{ color: 'white', fontSize: '18px', fontWeight: 700, letterSpacing: '0.08em', display: 'flex' }}>nepalrepublic.org</span>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px', display: 'flex' }}>
            {isNe ? 'नागरिक समस्या रिपोर्ट · वाचा ट्र्याक · सत्य प्रमाणित' : 'Report civic issues · Track promises · Verify truth'}
          </span>
        </div>

        {/* Bottom accent */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px', background: `linear-gradient(90deg, ${NEPAL_RED}80, ${BELL_GOLD}60, ${NEPAL_BLUE}80)`, display: 'flex' }} />
      </div>
    ),
    { width, height, headers: { 'Cache-Control': 'public, max-age=3600' } },
  );
}
