import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { promises as staticPromises } from '@/lib/data/promises';
import { APRIL_2026_COMMITMENTS } from '@/lib/data/seed-commitments-april-2026';
import { computeGhantiScore, shouldShowGrade } from '@/lib/data/ghanti-score';
import { dayInOffice, FIRST_100_DAYS } from '@/lib/intelligence/government-era';
import { isSupabaseConfigured, getSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const revalidate = 900; // 15 min

const NEPAL_RED = '#DC143C';
const NEPAL_BLUE = '#003893';
const BG_DARK = '#0a0e1a';
const BELL_GOLD = '#D9A441';

const NP_DIGITS = ['\u0966', '\u0967', '\u0968', '\u0969', '\u096A', '\u096B', '\u096C', '\u096D', '\u096E', '\u096F'];
function toNp(n: number): string {
  return String(n).split('').map(d => /\d/.test(d) ? NP_DIGITS[Number(d)] : d).join('');
}

const STATUS_COLORS: Record<string, string> = {
  delivered: '#10b981',
  in_progress: '#3b82f6',
  stalled: '#ef4444',
  not_started: '#6b7280',
};

const GRADE_HEX: Record<string, string> = {
  A: '#10b981', B: '#3b82f6', C: '#eab308', D: '#f97316', F: '#ef4444',
};

interface PromiseRow {
  id: string; title: string; title_ne?: string; category: string;
  status: string; progress: number; sentiment?: string;
}

async function fetchData() {
  let promises: PromiseRow[] = [];
  let topStory: { title: string; titleNe?: string; summary?: string; sentiment?: string } | null = null;

  if (isSupabaseConfigured()) {
    try {
      const sb = getSupabase();
      const { data } = await sb.from('promises').select('id, title, title_ne, category, status, progress').order('id');
      if (data?.length) promises = data.map((p: any) => ({ ...p, id: String(p.id) }));

      // Get latest daily brief for top story
      const { data: briefs } = await sb
        .from('daily_briefs')
        .select('top_stories')
        .order('created_at', { ascending: false })
        .limit(1);
      if (briefs?.[0]?.top_stories?.[0]) {
        const s = briefs[0].top_stories[0];
        topStory = { title: s.title, titleNe: s.titleNe || s.title_ne, summary: s.summary, sentiment: s.sentiment };
      }
    } catch { /* fallback below */ }
  }

  if (!promises.length) {
    promises = [...staticPromises, ...APRIL_2026_COMMITMENTS].map(p => ({
      id: p.id, title: p.title, title_ne: p.title_ne, category: p.category,
      status: p.status, progress: p.progress,
    }));
  }

  const stats = {
    total: promises.length,
    delivered: promises.filter(p => p.status === 'delivered').length,
    inProgress: promises.filter(p => p.status === 'in_progress').length,
    stalled: promises.filter(p => p.status === 'stalled').length,
    notStarted: promises.filter(p => p.status === 'not_started').length,
    avgProgress: Math.round(promises.reduce((s, p) => s + (p.progress || 0), 0) / promises.length),
  };

  const { grade, score, phase } = computeGhantiScore(promises as any);
  const showGrade = shouldShowGrade(phase);
  const day = dayInOffice();
  const daysLeft = Math.max(0, FIRST_100_DAYS - day);

  // Find worst promise for slide 4
  const stalledPromises = promises.filter(p => p.status === 'stalled' || p.progress === 0);
  const worstPromise = stalledPromises.sort((a, b) => a.progress - b.progress)[0] || promises[0];

  return { promises, stats, grade, score, showGrade, day, daysLeft, topStory, worstPromise };
}

/**
 * GET /api/og/carousel?slide=1 (1-5)
 *
 * Generates Facebook carousel slides — 5 images, 1080x1080 each.
 * Designed for peak Nepal engagement (7-11 PM), Nepali-first, bold text.
 */
export async function GET(request: NextRequest) {
  const slide = parseInt(request.nextUrl.searchParams.get('slide') || '1');
  if (slide < 1 || slide > 5) {
    return new Response('slide must be 1-5', { status: 400 });
  }

  const data = await fetchData();
  const dateStr = new Date().toLocaleDateString('ne-NP', { year: 'numeric', month: 'long', day: 'numeric' });

  const slides: Record<number, () => JSX.Element> = {
    1: () => <SlideHook data={data} dateStr={dateStr} />,
    2: () => <SlideScore data={data} />,
    3: () => <SlideTopStory data={data} />,
    4: () => <SlidePromiseCheck data={data} />,
    5: () => <SlideCTA data={data} />,
  };

  return new ImageResponse(slides[slide](), {
    width: 1080,
    height: 1080,
    headers: { 'Cache-Control': 'public, max-age=900, s-maxage=900' },
  });
}

/* ═══ SLIDE 1: HOOK ═══ */
function SlideHook({ data, dateStr }: { data: Awaited<ReturnType<typeof fetchData>>; dateStr: string }) {
  const headline = data.topStory?.titleNe || data.topStory?.title || '\u0906\u091C\u0915\u094B \u0938\u0930\u0915\u093E\u0930 \u0938\u094D\u0915\u094B\u0930\u0915\u093E\u0930\u094D\u0921';
  const emoji = data.topStory?.sentiment === 'negative' ? '\uD83D\uDEA8'
    : data.topStory?.sentiment === 'positive' ? '\u26A1' : '\uD83D\uDD34';

  return (
    <div style={{ width: 1080, height: 1080, display: 'flex', flexDirection: 'column', background: BG_DARK, fontFamily: 'system-ui', position: 'relative', overflow: 'hidden' }}>
      {/* Top gradient bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: `linear-gradient(90deg, ${NEPAL_RED}, ${BELL_GOLD}, ${NEPAL_BLUE})`, display: 'flex' }} />

      {/* Day pill */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 60 }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 40px', borderRadius: 50, background: `linear-gradient(135deg, ${NEPAL_RED}, #b91c1c)` }}>
          <span style={{ fontSize: 36, fontWeight: 900, color: '#fff', letterSpacing: 3 }}>
            {emoji} DAY {data.day} of {FIRST_100_DAYS}
          </span>
        </div>
      </div>

      {/* Date */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
        <span style={{ fontSize: 22, color: '#6b7280' }}>{dateStr}</span>
      </div>

      {/* Main headline */}
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', padding: '0 80px' }}>
        <span style={{
          fontSize: headline.length > 60 ? 42 : 52,
          fontWeight: 900,
          color: '#ffffff',
          textAlign: 'center',
          lineHeight: 1.3,
          letterSpacing: -0.5,
        }}>
          {headline}
        </span>
      </div>

      {/* Quick stats bar */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 40, marginBottom: 40 }}>
        <StatPill label="\u092A\u0942\u0930\u093E" value={toNp(data.stats.delivered)} color="#10b981" />
        <StatPill label="\u0905\u0932\u092A\u0924\u094D\u0930" value={toNp(data.stats.stalled)} color="#ef4444" />
        <StatPill label="\u0938\u0941\u0930\u0941 \u0928\u092D\u090F\u0915\u094B" value={toNp(data.stats.notStarted)} color="#6b7280" />
      </div>

      {/* Swipe indicator */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0 36px' }}>
        <span style={{ fontSize: 22, color: '#9ca3af', fontWeight: 600 }}>Swipe \u2192 \u0939\u0947\u0930\u094D\u0928\u0941\u0939\u094B\u0938\u094D</span>
      </div>

      {/* Bottom gradient */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, ${NEPAL_RED}, ${BELL_GOLD}, ${NEPAL_BLUE})`, display: 'flex' }} />
    </div>
  );
}

/* ═══ SLIDE 2: SCORE ═══ */
function SlideScore({ data }: { data: Awaited<ReturnType<typeof fetchData>> }) {
  const gradeColor = data.showGrade ? (GRADE_HEX[data.grade?.charAt(0) || 'C'] || '#eab308') : '#6b7280';
  const pct = data.stats.avgProgress;
  const circumference = 2 * Math.PI * 140;
  const dashoffset = circumference * (1 - pct / 100);

  return (
    <div style={{ width: 1080, height: 1080, display: 'flex', flexDirection: 'column', background: BG_DARK, fontFamily: 'system-ui', position: 'relative', overflow: 'hidden', alignItems: 'center' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: `linear-gradient(90deg, ${NEPAL_RED}, ${BELL_GOLD}, ${NEPAL_BLUE})`, display: 'flex' }} />

      {/* Title */}
      <div style={{ display: 'flex', marginTop: 56 }}>
        <span style={{ fontSize: 28, fontWeight: 800, color: '#9ca3af', letterSpacing: 4 }}>
          \u0938\u0930\u0915\u093E\u0930 \u0938\u094D\u0915\u094B\u0930\u0915\u093E\u0930\u094D\u0921
        </span>
      </div>

      {/* Progress ring + grade */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 40, position: 'relative' }}>
        <svg width="320" height="320" viewBox="0 0 320 320">
          <circle cx="160" cy="160" r="140" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="18" />
          <circle cx="160" cy="160" r="140" fill="none" stroke={gradeColor} strokeWidth="18"
            strokeDasharray={`${circumference}`} strokeDashoffset={`${dashoffset}`}
            strokeLinecap="round" transform="rotate(-90 160 160)" />
        </svg>
        <div style={{ position: 'absolute', top: 80, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: 80, fontWeight: 900, color: gradeColor }}>
            {data.showGrade ? data.grade : `${pct}%`}
          </span>
          <span style={{ fontSize: 20, color: '#9ca3af', marginTop: -4 }}>
            {data.showGrade ? 'Republic Score' : '\u0914\u0938\u0924 \u092A\u094D\u0930\u0917\u0924\u093F'}
          </span>
        </div>
      </div>

      {/* Status breakdown */}
      <div style={{ display: 'flex', gap: 20, marginTop: 48, flexWrap: 'wrap', justifyContent: 'center', padding: '0 60px' }}>
        <StatusCard label="\u092A\u0942\u0930\u093E \u092D\u092F\u094B" labelEn="Delivered" count={data.stats.delivered} color="#10b981" />
        <StatusCard label="\u0938\u0941\u0930\u0941 \u092D\u092F\u094B" labelEn="In Progress" count={data.stats.inProgress} color="#3b82f6" />
        <StatusCard label="\u0905\u0932\u092A\u0924\u094D\u0930" labelEn="Stalled" count={data.stats.stalled} color="#ef4444" />
        <StatusCard label="\u0938\u0941\u0930\u0941 \u0928\u092D\u090F\u0915\u094B" labelEn="Not Started" count={data.stats.notStarted} color="#6b7280" />
      </div>

      {/* Total */}
      <div style={{ display: 'flex', marginTop: 'auto', marginBottom: 48 }}>
        <span style={{ fontSize: 22, color: '#6b7280' }}>
          \u091C\u092E\u094D\u092E\u093E {toNp(data.stats.total)} \u0935\u091A\u0928 \u091F\u094D\u0930\u094D\u092F\u093E\u0915 \u0917\u0930\u094D\u0926\u0948
        </span>
      </div>

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, ${NEPAL_RED}, ${BELL_GOLD}, ${NEPAL_BLUE})`, display: 'flex' }} />
    </div>
  );
}

/* ═══ SLIDE 3: TOP STORY ═══ */
function SlideTopStory({ data }: { data: Awaited<ReturnType<typeof fetchData>> }) {
  const story = data.topStory;
  const title = story?.titleNe || story?.title || '\u0906\u091C \u0915\u0941\u0928\u0948 \u0920\u0942\u0932\u094B \u0916\u092C\u0930 \u0906\u090F\u0928';
  const summary = story?.summary || '';
  const sentimentEmoji = story?.sentiment === 'negative' ? '\uD83D\uDEA8' : story?.sentiment === 'positive' ? '\u2705' : '\uD83D\uDCF0';
  const sentimentColor = story?.sentiment === 'negative' ? '#ef4444' : story?.sentiment === 'positive' ? '#10b981' : '#3b82f6';

  return (
    <div style={{ width: 1080, height: 1080, display: 'flex', flexDirection: 'column', background: BG_DARK, fontFamily: 'system-ui', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: `linear-gradient(90deg, ${NEPAL_RED}, ${BELL_GOLD}, ${NEPAL_BLUE})`, display: 'flex' }} />

      {/* Label */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 56 }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 32px', borderRadius: 30, background: `${sentimentColor}15`, border: `2px solid ${sentimentColor}40` }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: sentimentColor, letterSpacing: 3 }}>
            {sentimentEmoji} \u0906\u091C\u0915\u094B \u092E\u0941\u0916\u094D\u092F \u0916\u092C\u0930
          </span>
        </div>
      </div>

      {/* Story title */}
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', padding: '0 80px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32 }}>
          <span style={{
            fontSize: title.length > 60 ? 40 : 50,
            fontWeight: 900, color: '#ffffff', textAlign: 'center', lineHeight: 1.3,
          }}>
            {title}
          </span>
          {summary && (
            <span style={{ fontSize: 24, color: '#9ca3af', textAlign: 'center', lineHeight: 1.5 }}>
              {summary.slice(0, 150)}{summary.length > 150 ? '...' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Source tag */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 56 }}>
        <span style={{ fontSize: 18, color: '#6b7280' }}>Nepal Republic AI Intelligence</span>
      </div>

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, ${NEPAL_RED}, ${BELL_GOLD}, ${NEPAL_BLUE})`, display: 'flex' }} />
    </div>
  );
}

/* ═══ SLIDE 4: PROMISE CHECK ═══ */
function SlidePromiseCheck({ data }: { data: Awaited<ReturnType<typeof fetchData>> }) {
  const p = data.worstPromise;
  const title = p?.title_ne || p?.title || '';
  const progress = p?.progress || 0;
  const daysLeft = data.daysLeft;

  return (
    <div style={{ width: 1080, height: 1080, display: 'flex', flexDirection: 'column', background: BG_DARK, fontFamily: 'system-ui', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: `linear-gradient(90deg, ${NEPAL_RED}, ${BELL_GOLD}, ${NEPAL_BLUE})`, display: 'flex' }} />

      {/* Label */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 56 }}>
        <div style={{ display: 'flex', padding: '12px 32px', borderRadius: 30, background: 'rgba(239,68,68,0.1)', border: '2px solid rgba(239,68,68,0.3)' }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: '#ef4444', letterSpacing: 3 }}>
            \u26A0\uFE0F \u0935\u091A\u0928 vs \u0935\u093E\u0938\u094D\u0924\u0935\u093F\u0915\u0924\u093E
          </span>
        </div>
      </div>

      {/* Promise title */}
      <div style={{ display: 'flex', padding: '48px 80px 0', justifyContent: 'center' }}>
        <span style={{ fontSize: 38, fontWeight: 900, color: '#ffffff', textAlign: 'center', lineHeight: 1.3 }}>
          &ldquo;{title.slice(0, 80)}&rdquo;
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 48, padding: '0 100px' }}>
        <div style={{ display: 'flex', width: '100%', height: 40, borderRadius: 20, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <div style={{
            display: 'flex', width: `${Math.max(progress, 3)}%`, height: '100%', borderRadius: 20,
            background: progress > 50 ? '#3b82f6' : progress > 20 ? '#f97316' : '#ef4444',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: 12 }}>
          <span style={{ fontSize: 18, color: '#6b7280' }}>{toNp(0)}%</span>
          <span style={{ fontSize: 24, fontWeight: 900, color: progress < 20 ? '#ef4444' : '#f97316' }}>
            {toNp(progress)}% \u092E\u093E\u0924\u094D\u0930
          </span>
          <span style={{ fontSize: 18, color: '#6b7280' }}>{toNp(100)}%</span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 60, marginTop: 56 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: 56, fontWeight: 900, color: '#ef4444' }}>{toNp(daysLeft)}</span>
          <span style={{ fontSize: 18, color: '#9ca3af' }}>\u0926\u093F\u0928 \u092C\u093E\u0901\u0915\u0940</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: 56, fontWeight: 900, color: '#f97316' }}>{toNp(100 - progress)}%</span>
          <span style={{ fontSize: 18, color: '#9ca3af' }}>\u0915\u093E\u092E \u092C\u093E\u0901\u0915\u0940</span>
        </div>
      </div>

      {/* Spacer */}
      <div style={{ display: 'flex', flex: 1 }} />

      {/* Question */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 56 }}>
        <span style={{ fontSize: 24, color: '#d1d5db', fontWeight: 600 }}>
          \u092A\u0942\u0930\u093E \u0939\u0941\u0928\u094D\u091B \u0915\u093F \u0928\u0939\u0941\u0928\u094D\u091B?
        </span>
      </div>

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, ${NEPAL_RED}, ${BELL_GOLD}, ${NEPAL_BLUE})`, display: 'flex' }} />
    </div>
  );
}

/* ═══ SLIDE 5: CTA ═══ */
function SlideCTA({ data }: { data: Awaited<ReturnType<typeof fetchData>> }) {
  return (
    <div style={{ width: 1080, height: 1080, display: 'flex', flexDirection: 'column', background: BG_DARK, fontFamily: 'system-ui', position: 'relative', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: `linear-gradient(90deg, ${NEPAL_RED}, ${BELL_GOLD}, ${NEPAL_BLUE})`, display: 'flex' }} />

      {/* Question */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        <span style={{ fontSize: 60, fontWeight: 900, color: '#ffffff', textAlign: 'center', lineHeight: 1.3 }}>
          \u0924\u092A\u093E\u0908\u0902\u0915\u094B
        </span>
        <span style={{ fontSize: 60, fontWeight: 900, color: BELL_GOLD, textAlign: 'center', lineHeight: 1.3 }}>
          \u0935\u093F\u091A\u093E\u0930 \u0915\u0947 \u091B?
        </span>
      </div>

      {/* Comment CTA */}
      <div style={{ display: 'flex', marginTop: 48, padding: '20px 48px', borderRadius: 50, background: `linear-gradient(135deg, ${NEPAL_RED}, ${NEPAL_BLUE})` }}>
        <span style={{ fontSize: 28, fontWeight: 800, color: '#ffffff', letterSpacing: 2 }}>
          Comment \u0917\u0930\u094D\u0928\u0941\u0939\u094B\u0938\u094D \uD83D\uDC47
        </span>
      </div>

      {/* Follow CTA */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 56, gap: 12 }}>
        <span style={{ fontSize: 22, color: '#9ca3af' }}>Track all {data.stats.total} promises at</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 10, background: `linear-gradient(135deg, ${NEPAL_RED}, ${NEPAL_BLUE})` }}>
            <span style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>NR</span>
          </div>
          <span style={{ fontSize: 28, fontWeight: 800, color: '#ffffff' }}>nepalrepublic.org</span>
        </div>
        <span style={{ fontSize: 20, color: '#6b7280' }}>\u0928\u0947\u092A\u093E\u0932 \u0930\u093F\u092A\u092C\u094D\u0932\u093F\u0915</span>
      </div>

      {/* Follow button */}
      <div style={{ display: 'flex', marginTop: 40, padding: '16px 60px', borderRadius: 40, border: `2px solid ${BELL_GOLD}`, background: `${BELL_GOLD}10` }}>
        <span style={{ fontSize: 24, fontWeight: 800, color: BELL_GOLD, letterSpacing: 3 }}>
          FOLLOW \u0917\u0930\u094D\u0928\u0941\u0939\u094B\u0938\u094D
        </span>
      </div>

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, ${NEPAL_RED}, ${BELL_GOLD}, ${NEPAL_BLUE})`, display: 'flex' }} />
    </div>
  );
}

/* ── Shared sub-components ── */

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 20px', borderRadius: 20, background: `${color}10`, border: `1px solid ${color}30` }}>
      <span style={{ fontSize: 28, fontWeight: 900, color }}>{value}</span>
      <span style={{ fontSize: 16, color: '#9ca3af' }}>{label}</span>
    </div>
  );
}

function StatusCard({ label, labelEn, count, color }: { label: string; labelEn: string; count: number; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 28px', borderRadius: 20, background: `${color}08`, border: `1px solid ${color}20`, minWidth: 160 }}>
      <span style={{ fontSize: 44, fontWeight: 900, color }}>{toNp(count)}</span>
      <span style={{ fontSize: 16, fontWeight: 600, color: '#d1d5db', marginTop: 4 }}>{label}</span>
      <span style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{labelEn}</span>
    </div>
  );
}
