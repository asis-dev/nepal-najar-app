import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { promises as staticPromises, computeStats, type GovernmentPromise } from '@/lib/data/promises';
import { APRIL_2026_COMMITMENTS } from '@/lib/data/seed-commitments-april-2026';
import { computeGhantiScore, shouldShowGrade, GRADE_LABELS } from '@/lib/data/ghanti-score';
import { dayInOffice, FIRST_100_DAYS } from '@/lib/intelligence/government-era';
import { isSupabaseConfigured, getSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const revalidate = 1800; // 30 min ISR

const NEPAL_RED = '#DC143C';
const NEPAL_BLUE = '#003893';
const BELL_GOLD = '#D9A441';
const BG_DARK = '#0a0e1a';

/** Grade color mapping for the image (raw hex) */
const GRADE_HEX: Record<string, string> = {
  A: '#10b981',
  B: '#3b82f6',
  C: '#eab308',
  D: '#f97316',
  F: '#ef4444',
};

/* ── Nepali numeral helper ── */
const NP_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
function toNepaliNum(n: number): string {
  return String(n)
    .split('')
    .map((d) => (/\d/.test(d) ? NP_DIGITS[Number(d)] : d))
    .join('');
}

/* ── Category translations ── */
const CATEGORY_NE: Record<string, string> = {
  Governance: 'शासन',
  'Anti-Corruption': 'भ्रष्टाचार विरोधी',
  Infrastructure: 'पूर्वाधार',
  Transport: 'यातायात',
  Energy: 'ऊर्जा',
  Technology: 'प्रविधि',
  Health: 'स्वास्थ्य',
  Education: 'शिक्षा',
  Environment: 'वातावरण',
  Economy: 'अर्थतन्त्र',
  Social: 'सामाजिक',
};

/* ── Fetch live data or fall back to static ── */
async function getPromiseData(): Promise<GovernmentPromise[]> {
  if (!isSupabaseConfigured()) {
    return [...staticPromises, ...APRIL_2026_COMMITMENTS];
  }
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('promises')
      .select('id, status, progress, category, trust_level, estimated_budget_npr, spent_npr')
      .order('id');
    if (error || !data || data.length === 0) {
      return [...staticPromises, ...APRIL_2026_COMMITMENTS];
    }
    // Map to minimal GovernmentPromise shape needed by computeStats / computeGhantiScore
    return data.map((p: Record<string, unknown>) => ({
      id: String(p.id),
      slug: '',
      title: '',
      title_ne: '',
      category: (p.category || 'Governance') as GovernmentPromise['category'],
      category_ne: '',
      status: (p.status || 'not_started') as GovernmentPromise['status'],
      progress: (p.progress ?? 0) as number,
      linkedProjects: 0,
      evidenceCount: 0,
      lastUpdate: '',
      description: '',
      description_ne: '',
      trustLevel: (p.trust_level || 'unverified') as GovernmentPromise['trustLevel'],
      signalType: 'inferred' as GovernmentPromise['signalType'],
      estimatedBudgetNPR: p.estimated_budget_npr as number | undefined,
      spentNPR: p.spent_npr as number | undefined,
    }));
  } catch {
    return [...staticPromises, ...APRIL_2026_COMMITMENTS];
  }
}

/* ── Compute "shocking" highlight stats ── */
interface Highlight {
  en: string;
  ne: string;
}

function computeHighlights(
  allPromises: GovernmentPromise[],
  stats: ReturnType<typeof computeStats>,
): Highlight[] {
  const highlights: Highlight[] = [];

  // Group by category
  const byCategory = new Map<string, GovernmentPromise[]>();
  for (const p of allPromises) {
    const cat = p.category || 'Other';
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(p);
  }

  // Find categories with 0 delivered
  const zeroDelivered: { cat: string; count: number }[] = [];
  const entries = Array.from(byCategory.entries());
  for (const [cat, proms] of entries) {
    const delivered = proms.filter((p) => p.status === 'delivered').length;
    if (delivered === 0 && proms.length >= 3) {
      zeroDelivered.push({ cat, count: proms.length });
    }
  }

  // Sort by count descending — the bigger the category with 0, the more shocking
  zeroDelivered.sort((a, b) => b.count - a.count);

  if (zeroDelivered.length > 0) {
    const top = zeroDelivered[0];
    const catNe = CATEGORY_NE[top.cat] || top.cat;
    highlights.push({
      en: `0 promises delivered in ${top.cat} (${top.count} total)`,
      ne: `${catNe}मा ० वाचा पूरा (जम्मा ${toNepaliNum(top.count)})`,
    });
  }

  // Stalled percentage
  if (stats.stalled > 0) {
    const pct = Math.round((stats.stalled / stats.total) * 100);
    highlights.push({
      en: `${stats.stalled} commitments stalled (${pct}%)`,
      ne: `${toNepaliNum(stats.stalled)} प्रतिबद्धता रोकिएको (${toNepaliNum(pct)}%)`,
    });
  }

  // Not started is shocking if high
  if (stats.notStarted > stats.total * 0.3) {
    const pct = Math.round((stats.notStarted / stats.total) * 100);
    highlights.push({
      en: `${stats.notStarted} commitments not yet started (${pct}%)`,
      ne: `${toNepaliNum(stats.notStarted)} प्रतिबद्धता सुरु भएको छैन (${toNepaliNum(pct)}%)`,
    });
  }

  // Find the worst category by avg progress
  let worstCat = '';
  let worstAvg = 100;
  for (const [cat, proms] of entries) {
    if (proms.length < 3) continue;
    const avg = Math.round(proms.reduce((s, p) => s + p.progress, 0) / proms.length);
    if (avg < worstAvg) {
      worstAvg = avg;
      worstCat = cat;
    }
  }
  if (worstCat && worstAvg < 15 && highlights.length < 3) {
    const catNe = CATEGORY_NE[worstCat] || worstCat;
    highlights.push({
      en: `${worstCat}: only ${worstAvg}% average progress`,
      ne: `${catNe}: औसत ${toNepaliNum(worstAvg)}% मात्र`,
    });
  }

  return highlights.slice(0, 3);
}

/* ── SVG progress ring ── */
function ProgressRing({
  pct,
  color,
  size,
  stroke,
}: {
  pct: number;
  color: string;
  size: number;
  stroke: number;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const arc = Math.round((pct / 100) * circ);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${arc} ${circ}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

/* ═════════════════════════════════════════════════
   MAIN HANDLER
   ═════════════════════════════════════════════════ */

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const format = searchParams.get('format') || 'square'; // square (1080x1080) | story (1080x1920)
  const locale = searchParams.get('locale') || 'en';
  const isNe = locale === 'ne';
  const isStory = format === 'story';

  const width = 1080;
  const height = isStory ? 1920 : 1080;

  // --- Data ---
  const allPromises = await getPromiseData();
  const stats = computeStats(allPromises);
  const gs = computeGhantiScore(allPromises);
  const showGrade = shouldShowGrade(gs.phase);
  const day = dayInOffice();
  const highlights = computeHighlights(allPromises, stats);

  const scoreColor = GRADE_HEX[gs.grade] || '#ef4444';
  const gradeLabel = isNe
    ? GRADE_LABELS[gs.grade]?.ne || ''
    : GRADE_LABELS[gs.grade]?.en || '';

  const dateStr = isNe
    ? `${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(new Date().getDate()).padStart(2, '0')}`
    : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // Segment bar widths
  const total = stats.total || 1;
  const barW = (n: number) => `${Math.max(2, Math.round((n / total) * 100))}%`;

  // Status breakdown rows
  const statusRows = [
    { label: isNe ? 'पूरा भयो' : 'Delivered', count: stats.delivered, color: '#10b981' },
    { label: isNe ? 'प्रगतिमा' : 'In Progress', count: stats.inProgress, color: '#22d3ee' },
    { label: isNe ? 'रोकिएको' : 'Stalled', count: stats.stalled, color: '#ef4444' },
    { label: isNe ? 'सुरु भएको छैन' : 'Not Started', count: stats.notStarted, color: '#6b7280' },
  ];

  const pad = isStory ? '80px 60px' : '56px 56px';
  const ringSize = isStory ? 260 : 220;
  const ringStroke = isStory ? 18 : 16;

  return new ImageResponse(
    (
      <div
        style={{
          width,
          height,
          display: 'flex',
          flexDirection: 'column',
          background: `linear-gradient(170deg, ${NEPAL_RED}18 0%, ${BG_DARK} 25%, ${BG_DARK} 75%, ${NEPAL_BLUE}18 100%)`,
          fontFamily: 'system-ui, sans-serif',
          padding: pad,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Top accent — Nepal gradient */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '8px',
            background: `linear-gradient(90deg, ${NEPAL_RED}, ${BELL_GOLD}, ${NEPAL_BLUE})`,
            display: 'flex',
          }}
        />

        {/* Subtle radial glow behind ring */}
        <div
          style={{
            position: 'absolute',
            top: isStory ? '28%' : '35%',
            left: '25%',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: `radial-gradient(ellipse, ${scoreColor}10 0%, transparent 70%)`,
            display: 'flex',
          }}
        />

        {/* ── DAY X header ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: isStory ? 36 : 24,
          }}
        >
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 48,
                height: 48,
                borderRadius: 12,
                background: `linear-gradient(135deg, ${NEPAL_RED}, ${NEPAL_BLUE})`,
              }}
            >
              <span style={{ fontSize: 24 }}>🔔</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  letterSpacing: '0.15em',
                  color: BELL_GOLD,
                  display: 'flex',
                }}
              >
                {isNe ? 'नेपाल रिपब्लिक' : 'NEPAL REPUBLIC'}
              </span>
              <span
                style={{
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.35)',
                  display: 'flex',
                }}
              >
                {dateStr}
              </span>
            </div>
          </div>

          {/* Day counter pill */}
          <div
            style={{
              display: 'flex',
              padding: '12px 28px',
              borderRadius: 100,
              background: `linear-gradient(135deg, ${NEPAL_RED}30, ${NEPAL_BLUE}30)`,
              border: '2px solid rgba(255,255,255,0.15)',
            }}
          >
            <span
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: '#fff',
                letterSpacing: '0.05em',
                display: 'flex',
              }}
            >
              {isNe ? `दिन ${toNepaliNum(day)} / ${toNepaliNum(FIRST_100_DAYS)}` : `DAY ${day} of ${FIRST_100_DAYS}`}
            </span>
          </div>
        </div>

        {/* ── Big hero title ── */}
        <div
          style={{
            display: 'flex',
            fontSize: isStory ? 52 : 44,
            fontWeight: 900,
            color: '#fff',
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
            marginBottom: isStory ? 48 : 32,
          }}
        >
          {isNe ? 'सरकारी जवाफदेहिता स्कोरकार्ड' : 'Government Accountability Scorecard'}
        </div>

        {/* ── Score ring + Grade ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 36,
            marginBottom: isStory ? 48 : 32,
          }}
        >
          {/* Progress ring */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: ringSize,
              height: ringSize,
              position: 'relative',
              flexShrink: 0,
            }}
          >
            <ProgressRing
              pct={gs.subScores.avgProgress}
              color={scoreColor}
              size={ringSize}
              stroke={ringStroke}
            />
            <div
              style={{
                position: 'absolute',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontSize: isStory ? 64 : 56,
                  fontWeight: 900,
                  color: '#fff',
                  display: 'flex',
                  lineHeight: 1,
                }}
              >
                {gs.subScores.avgProgress}
              </span>
              <span
                style={{
                  fontSize: 16,
                  color: 'rgba(255,255,255,0.4)',
                  display: 'flex',
                  marginTop: 2,
                }}
              >
                {isNe ? 'प्रतिशत' : '% done'}
              </span>
            </div>
          </div>

          {/* Grade + Republic Score */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              flex: 1,
            }}
          >
            {showGrade ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 20,
                    background: `${scoreColor}18`,
                    border: `3px solid ${scoreColor}50`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: 52,
                      fontWeight: 900,
                      color: scoreColor,
                      display: 'flex',
                    }}
                  >
                    {gs.grade}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span
                    style={{
                      fontSize: 24,
                      fontWeight: 800,
                      color: '#fff',
                      display: 'flex',
                    }}
                  >
                    {isNe ? 'रिपब्लिक स्कोर' : 'Republic Score'}
                  </span>
                  <span
                    style={{
                      fontSize: 16,
                      color: scoreColor,
                      fontWeight: 600,
                      display: 'flex',
                    }}
                  >
                    {gradeLabel} ({gs.score}/100)
                  </span>
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  padding: '14px 24px',
                  borderRadius: 14,
                  background: 'rgba(59,130,246,0.08)',
                  border: '1px solid rgba(59,130,246,0.2)',
                }}
              >
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: '#3b82f6',
                    display: 'flex',
                  }}
                >
                  {isNe ? gs.phaseLabel.ne : gs.phaseLabel.en}
                </span>
              </div>
            )}
            <span
              style={{
                fontSize: 16,
                color: 'rgba(255,255,255,0.5)',
                display: 'flex',
              }}
            >
              {isNe
                ? `${toNepaliNum(stats.total)} प्रतिबद्धता ट्र्याक गरिँदै`
                : `Tracking ${stats.total} government commitments`}
            </span>
          </div>
        </div>

        {/* ── Status breakdown bar ── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            marginBottom: isStory ? 40 : 28,
          }}
        >
          {/* Segmented bar */}
          <div
            style={{
              display: 'flex',
              width: '100%',
              height: 28,
              borderRadius: 14,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: barW(stats.delivered),
                height: '100%',
                backgroundColor: '#10b981',
                display: 'flex',
              }}
            />
            <div
              style={{
                width: barW(stats.inProgress),
                height: '100%',
                backgroundColor: '#22d3ee',
                display: 'flex',
              }}
            />
            <div
              style={{
                width: barW(stats.stalled),
                height: '100%',
                backgroundColor: '#ef4444',
                display: 'flex',
              }}
            />
            <div
              style={{
                width: barW(stats.notStarted),
                height: '100%',
                backgroundColor: '#374151',
                display: 'flex',
              }}
            />
          </div>

          {/* Legend row */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            {statusRows.map((s, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      backgroundColor: s.color,
                      display: 'flex',
                    }}
                  />
                  <span style={{ fontSize: 14, color: '#9ca3af', display: 'flex' }}>
                    {s.label}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: s.color,
                    display: 'flex',
                  }}
                >
                  {isNe ? toNepaliNum(s.count) : String(s.count)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Highlight shock stats ── */}
        {highlights.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              marginBottom: isStory ? 48 : 28,
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.2em',
                color: '#ef4444',
                marginBottom: 4,
                display: 'flex',
              }}
            >
              {isNe ? 'मुख्य तथ्य' : 'KEY FINDINGS'}
            </span>
            {highlights.map((h, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 20px',
                  borderRadius: 14,
                  background: 'rgba(239,68,68,0.06)',
                  border: '1px solid rgba(239,68,68,0.15)',
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: '#ef4444',
                    flexShrink: 0,
                    display: 'flex',
                  }}
                />
                <span
                  style={{
                    fontSize: 17,
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.8)',
                    display: 'flex',
                  }}
                >
                  {isNe ? h.ne : h.en}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Spacer */}
        <div style={{ display: 'flex', flex: 1 }} />

        {/* ── Footer ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: BELL_GOLD,
                display: 'flex',
              }}
            >
              nepalrepublic.org
            </span>
            <span
              style={{
                fontSize: 14,
                color: 'rgba(255,255,255,0.3)',
                display: 'flex',
              }}
            >
              {isNe
                ? 'नेपाल रिपब्लिक — AI-संचालित नागरिक जवाफदेहिता'
                : 'Nepal Republic — AI-Powered Civic Accountability'}
            </span>
          </div>

          {/* Bilingual badge */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: 2,
            }}
          >
            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.5)',
                display: 'flex',
              }}
            >
              नेपाल रिपब्लिक
            </span>
            <span
              style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.25)',
                display: 'flex',
              }}
            >
              {isNe ? 'Share · साझा गर्नुहोस्' : 'Share · साझा गर्नुहोस्'}
            </span>
          </div>
        </div>

        {/* Bottom accent */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '6px',
            background: `linear-gradient(90deg, ${NEPAL_RED}, ${BELL_GOLD}, ${NEPAL_BLUE})`,
            display: 'flex',
          }}
        />
      </div>
    ),
    {
      width,
      height,
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
        'CDN-Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
        'Vercel-CDN-Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
      },
    },
  );
}
