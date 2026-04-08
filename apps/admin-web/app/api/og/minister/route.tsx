import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';
import { PROMISES_KNOWLEDGE } from '@/lib/intelligence/knowledge-base';

export const runtime = 'nodejs';

const BG_DARK = '#0a0e1a';
const NEPAL_RED = '#DC143C';
const NEPAL_BLUE = '#003893';

/** Decode HTML entities like &#39; &amp; etc */
function decodeEntities(str: string): string {
  return str
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/* ── Activity Pulse ── */
interface PulseLevel {
  emoji: string;
  label: string;
  labelNe: string;
  color: string;
  pulseValue: number;
}

function getActivityPulse(stats: {
  totalSignals: number;
  confirming: number;
  contradicting: number;
  directMentions: number;
}): PulseLevel {
  const pulse = Math.min(100,
    stats.confirming * 3 +
    stats.contradicting * 2 +
    stats.directMentions * 1.5 +
    Math.max(0, stats.totalSignals - stats.confirming - stats.contradicting) * 1
  );

  if (pulse >= 25) return {
    emoji: '🔥', label: 'On Fire', labelNe: 'कर्मठ',
    color: '#f97316', pulseValue: Math.min(100, Math.round(pulse)),
  };
  if (pulse >= 12) return {
    emoji: '⚡', label: 'Active', labelNe: 'सक्रिय',
    color: '#22c55e', pulseValue: Math.round(pulse),
  };
  if (pulse >= 4) return {
    emoji: '📡', label: 'Moderate', labelNe: 'सामान्य',
    color: '#eab308', pulseValue: Math.round(pulse),
  };
  if (pulse >= 1) return {
    emoji: '💤', label: 'Quiet', labelNe: 'शान्त',
    color: '#6b7280', pulseValue: Math.round(pulse),
  };
  return {
    emoji: '👻', label: 'Ghost', labelNe: 'लापता',
    color: '#374151', pulseValue: 0,
  };
}

const HAS_DEVANAGARI = /[\u0900-\u097F]/;

function normalizeTitles(title: string | null, titleNe: string | null): { title: string; titleNe?: string } {
  const t = (title || '') as string;
  const tNe = (titleNe || '') as string;
  if (HAS_DEVANAGARI.test(t)) {
    return { title: tNe && !HAS_DEVANAGARI.test(tNe) ? tNe : t.slice(0, 200), titleNe: t };
  }
  return { title: t || 'Update', titleNe: tNe || undefined };
}

function nameVariants(name: string, nameNe?: string | null): string[] {
  const parts = name.toLowerCase().trim().split(/\s+/);
  const variants = [name.toLowerCase().trim()];
  if (parts.length >= 2) variants.push(parts[parts.length - 1]);
  const aliasMatch = name.match(/\(([^)]+)\)/);
  if (aliasMatch) variants.push(aliasMatch[1].toLowerCase().trim());
  if (nameNe) variants.push(nameNe.trim());
  return variants;
}

/** NR brand bar — matches the corruption OG style exactly */
function BrandBar({ isNe, size = 'md' }: { isNe: boolean; size?: 'sm' | 'md' | 'lg' }) {
  const logoSize = size === 'lg' ? 52 : size === 'md' ? 44 : 36;
  const fontSize = size === 'lg' ? 17 : size === 'md' ? 15 : 13;
  const nameSize = size === 'lg' ? 22 : size === 'md' ? 18 : 16;
  const subSize = size === 'lg' ? 12 : size === 'md' ? 11 : 10;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size === 'lg' ? 16 : 12 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: logoSize, height: logoSize, borderRadius: logoSize * 0.22,
        background: `linear-gradient(135deg, ${NEPAL_RED} 0%, ${NEPAL_BLUE} 100%)`,
      }}>
        <span style={{ fontSize, fontWeight: 900, color: '#ffffff', letterSpacing: -0.5 }}>NR</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <span style={{ fontSize: nameSize, fontWeight: 700, color: '#ffffff' }}>
            {isNe ? 'नेपाल' : 'Nepal'}
          </span>
          <span style={{ fontSize: nameSize, fontWeight: 800, color: NEPAL_RED }}>
            {isNe ? 'रिपब्लिक' : 'Republic'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
          <div style={{ width: 6, height: 6, borderRadius: 3, background: '#10b981', display: 'flex' }} />
          <span style={{ fontSize: subSize, color: '#6b7280', letterSpacing: 1.5, textTransform: 'uppercase' as const, fontWeight: 600 }}>
            {isNe ? 'एआई नागरिक बुद्धिमत्ता' : 'AI CIVIC INTELLIGENCE'}
          </span>
        </div>
      </div>
    </div>
  );
}

const CLASSIFICATION_COLORS: Record<string, string> = {
  confirms: '#22c55e',
  contradicts: '#ef4444',
  context: '#3b82f6',
  neutral: '#6b7280',
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const slug = searchParams.get('slug') || searchParams.get('id');
  const lang = searchParams.get('lang') || 'en';
  const format = searchParams.get('format') || 'story';
  const mode = searchParams.get('mode') || 'profile';
  const isNe = lang === 'ne';
  const isStory = format === 'story';
  const isCard = format === 'card';
  const width = isCard ? 1200 : 1080;
  const height = isStory ? 1920 : isCard ? 630 : 1080;

  // ── DASHBOARD MODE: cabinet overview ──
  if (mode === 'dashboard') {
    return renderCabinetDashboard(width, height, isNe, isStory, isCard);
  }

  if (!slug) {
    return renderCabinetDashboard(width, height, isNe, isStory, isCard);
  }

  const supabase = getSupabase();

  // Fetch minister + recent signals in parallel
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [rosterRes, signalsRes] = await Promise.all([
    supabase
      .from('government_roster')
      .select('name, name_ne, title, title_ne, ministry, ministry_slug, appointed_date, metadata')
      .eq('is_current', true)
      .order('ministry_slug'),
    supabase
      .from('intelligence_signals')
      .select('id, title, title_ne, url, source_id, signal_type, discovered_at, matched_promise_ids, classification')
      .gte('discovered_at', cutoff)
      .gte('relevance_score', 0.2)
      .order('discovered_at', { ascending: false })
      .limit(2000),
  ]);

  const roster = rosterRes.data || [];
  const allSignals = signalsRes.data || [];

  const minister = roster.find(m => {
    const s = m.name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
    return s === slug;
  });

  if (!minister) {
    return renderCabinetDashboard(width, height, isNe, isStory, isCard);
  }

  // Match signals to this minister via title-based word matching
  const variants = nameVariants(minister.name, minister.name_ne);

  const titleToCommitmentIds = new Map<string, number[]>();
  for (const k of PROMISES_KNOWLEDGE) {
    for (const official of k.keyOfficials) {
      const key = official.toLowerCase();
      if (!titleToCommitmentIds.has(key)) titleToCommitmentIds.set(key, []);
      titleToCommitmentIds.get(key)!.push(k.id);
    }
  }
  const ownedCommitmentIds = titleToCommitmentIds.get(minister.title?.toLowerCase() || '') || [];

  const matchedSignalIds = new Set<string>();

  for (const s of allSignals) {
    const haystack = [s.title, s.title_ne].filter(Boolean).join(' ').toLowerCase();
    if (variants.some(v => v.length >= 4 && haystack.includes(v))) {
      matchedSignalIds.add(s.id);
    }
  }

  const commitmentToSignals = new Map<number, Set<string>>();
  for (const s of allSignals) {
    const matched = s.matched_promise_ids;
    if (!Array.isArray(matched)) continue;
    for (const id of matched) {
      if (!commitmentToSignals.has(id)) commitmentToSignals.set(id, new Set());
      commitmentToSignals.get(id)!.add(s.id);
    }
  }
  for (const cid of ownedCommitmentIds) {
    const sids = commitmentToSignals.get(cid);
    if (!sids) continue;
    for (const sid of sids) matchedSignalIds.add(sid);
  }

  const signalById = new Map(allSignals.map(s => [s.id, s]));
  const matchedSignals = [...matchedSignalIds].map(id => signalById.get(id)!).filter(Boolean);

  const confirming = matchedSignals.filter(s => s.classification === 'confirms').length;
  const contradicting = matchedSignals.filter(s => s.classification === 'contradicts').length;
  const directMentions = matchedSignals.length;
  const totalSignals = matchedSignals.length;

  const pulse = getActivityPulse({ totalSignals, confirming, contradicting, directMentions });

  const topSignals = matchedSignals.slice(0, isCard ? 3 : isStory ? 5 : 3).map(s => {
    const norm = normalizeTitles(s.title, s.title_ne);
    return {
      title: decodeEntities(isNe ? (norm.titleNe || norm.title) : norm.title),
      classification: s.classification,
    };
  });

  const daysInOffice = minister.appointed_date
    ? Math.floor((Date.now() - new Date(minister.appointed_date).getTime()) / 86400000)
    : null;

  const ministerName = isNe ? (minister.name_ne || minister.name) : minister.name;
  const ministerTitle = isNe ? (minister.title_ne || minister.title) : minister.title;

  // ── Sizing helpers ──
  const pad = isStory ? '60px 56px' : isCard ? '28px 36px' : '50px';
  const nameFontSize = isStory ? 48 : isCard ? 32 : 36;
  const titleFontSize = isStory ? 24 : isCard ? 16 : 18;

  return new ImageResponse(
    (
      <div
        style={{
          width, height, display: 'flex', flexDirection: 'column',
          background: BG_DARK,
          fontFamily: 'system-ui, sans-serif',
          position: 'relative', overflow: 'hidden',
        }}
      >
        {/* Top accent — blue for ministers */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: isCard ? 4 : 6, background: `linear-gradient(90deg, ${NEPAL_BLUE}, #3b82f6, ${NEPAL_BLUE})`, display: 'flex' }} />

        <div style={{ display: 'flex', flexDirection: 'column', padding: pad, flex: 1 }}>

          {/* ── Brand header ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isStory ? 40 : isCard ? 16 : 28 }}>
            <BrandBar isNe={isNe} size={isCard ? 'sm' : 'lg'} />
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: isCard ? '8px 16px' : '10px 20px', borderRadius: 24,
              background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)',
            }}>
              <span style={{ fontSize: isCard ? 13 : 15, fontWeight: 700, color: '#3b82f6', letterSpacing: 2 }}>
                {isNe ? 'मन्त्री प्रोफाइल' : 'MINISTER PROFILE'}
              </span>
            </div>
          </div>

          {/* ── Content: card layout for card format, column for others ── */}
          <div style={{
            display: 'flex', flexDirection: isCard ? 'row' : 'column', flex: 1,
            gap: isCard ? 28 : 0,
          }}>
            {/* Left / Main: Minister info */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              {/* Name + title */}
              <div style={{ display: 'flex', flexDirection: 'column', marginBottom: isStory ? 24 : isCard ? 10 : 18 }}>
                <span style={{ fontSize: nameFontSize, fontWeight: 800, color: '#e5e7eb', lineHeight: 1.2 }}>
                  {ministerName}
                </span>
                <span style={{ fontSize: titleFontSize, color: '#9ca3af', fontWeight: 500, marginTop: isCard ? 4 : 8 }}>
                  {ministerTitle}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: isCard ? 4 : 6 }}>
                  <span style={{ fontSize: isCard ? 13 : 16, color: '#6b7280' }}>
                    {minister.ministry}
                  </span>
                  {daysInOffice !== null && (
                    <span style={{ fontSize: isCard ? 12 : 14, color: '#4b5563' }}>
                      · {daysInOffice} {isNe ? 'दिन' : 'days'}
                    </span>
                  )}
                </div>
              </div>

              {/* Activity Pulse + stats row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: isCard ? 14 : 16, marginBottom: isStory ? 32 : isCard ? 14 : 20, flexWrap: 'wrap' as const }}>
                {/* Pulse badge */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: isCard ? '10px 18px' : '14px 24px', borderRadius: 14,
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${pulse.color}33`,
                }}>
                  <span style={{ fontSize: isCard ? 24 : 32 }}>{pulse.emoji}</span>
                  <span style={{ color: pulse.color, fontSize: isCard ? 22 : 28, fontWeight: 800 }}>
                    {pulse.pulseValue}
                  </span>
                  <span style={{ color: pulse.color, fontSize: isCard ? 12 : 14, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 1 }}>
                    {isNe ? pulse.labelNe : pulse.label}
                  </span>
                </div>

                {/* Stats pills */}
                {[
                  { value: totalSignals, label: isNe ? 'सिग्नल' : 'Signals', color: '#3b82f6' },
                  { value: confirming, label: isNe ? 'पुष्टि' : 'Confirms', color: '#22c55e' },
                  { value: contradicting, label: isNe ? 'विरोध' : 'Contradicts', color: '#ef4444' },
                ].map((stat, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: isCard ? '8px 14px' : '10px 16px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <span style={{ color: stat.color, fontSize: isCard ? 18 : 22, fontWeight: 800 }}>
                      {stat.value}
                    </span>
                    <span style={{ color: '#9ca3af', fontSize: isCard ? 12 : 13 }}>
                      {stat.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Key headlines — this week's activity */}
              {topSignals.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: isCard ? 6 : 12 }}>
                  <span style={{
                    color: '#9ca3af', fontSize: isCard ? 13 : 16, fontWeight: 600,
                    textTransform: 'uppercase' as const, letterSpacing: 1.5,
                    marginBottom: isCard ? 2 : 6,
                  }}>
                    {isNe ? '📰 यस हप्ता' : '📰 THIS WEEK'}
                  </span>
                  {topSignals.map((signal, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      borderRadius: isCard ? 10 : 14, padding: isCard ? '10px 14px' : '16px 20px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}>
                      <div style={{
                        width: 7, height: 7, borderRadius: '50%',
                        marginTop: isCard ? 6 : 8, flexShrink: 0,
                        background: CLASSIFICATION_COLORS[signal.classification] || '#6b7280',
                        display: 'flex',
                      }} />
                      <span style={{
                        color: '#e5e7eb', fontSize: isCard ? 15 : isStory ? 20 : 17,
                        lineHeight: 1.4, flex: 1, fontWeight: 500,
                      }}>
                        {signal.title.length > (isCard ? 65 : 90) ? signal.title.slice(0, isCard ? 62 : 87) + '...' : signal.title}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {topSignals.length === 0 && !isCard && (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', padding: isStory ? '60px 0' : '40px 0', color: '#4b5563', fontSize: 16,
                }}>
                  <span style={{ fontSize: 48, marginBottom: 12 }}>💤</span>
                  <span>{isNe ? 'यस हप्ता कुनै गतिविधि छैन' : 'No activity this week'}</span>
                </div>
              )}

              {/* Commitments + Summary stats for story format */}
              {isStory && (
                <div style={{ display: 'flex', gap: 16, marginTop: 40 }}>
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1,
                    padding: '28px 16px', borderRadius: 20,
                    background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
                  }}>
                    <span style={{ fontSize: 52, fontWeight: 800, color: '#3b82f6' }}>{ownedCommitmentIds.length}</span>
                    <span style={{ fontSize: 15, fontWeight: 600, color: 'rgba(59,130,246,0.8)', textTransform: 'uppercase' as const, letterSpacing: 1.5, marginTop: 6 }}>
                      {isNe ? 'प्रतिबद्धता' : 'Commitments'}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1,
                    padding: '28px 16px', borderRadius: 20,
                    background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)',
                  }}>
                    <span style={{ fontSize: 52, fontWeight: 800, color: '#22c55e' }}>{confirming}</span>
                    <span style={{ fontSize: 15, fontWeight: 600, color: 'rgba(34,197,94,0.8)', textTransform: 'uppercase' as const, letterSpacing: 1.5, marginTop: 6 }}>
                      {isNe ? 'पुष्टि' : 'Confirmed'}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1,
                    padding: '28px 16px', borderRadius: 20,
                    background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
                  }}>
                    <span style={{ fontSize: 52, fontWeight: 800, color: '#ef4444' }}>{contradicting}</span>
                    <span style={{ fontSize: 15, fontWeight: 600, color: 'rgba(239,68,68,0.8)', textTransform: 'uppercase' as const, letterSpacing: 1.5, marginTop: 6 }}>
                      {isNe ? 'विरोध' : 'Contradicted'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Right side for card: commitments + key stats */}
            {isCard && (
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10, width: 170 }}>
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '20px 16px', borderRadius: 16,
                  background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
                }}>
                  <span style={{ fontSize: 36, fontWeight: 800, color: '#3b82f6' }}>{ownedCommitmentIds.length}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(59,130,246,0.8)', textTransform: 'uppercase' as const, letterSpacing: 1, marginTop: 4 }}>
                    {isNe ? 'प्रतिबद्धता' : 'Commitments'}
                  </span>
                </div>
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '16px 14px', borderRadius: 16,
                  background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)',
                }}>
                  <span style={{ fontSize: 28, fontWeight: 800, color: '#22c55e' }}>{confirming}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(34,197,94,0.8)', textTransform: 'uppercase' as const, letterSpacing: 1, marginTop: 2 }}>
                    {isNe ? 'पुष्टि' : 'Confirmed'}
                  </span>
                </div>
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '16px 14px', borderRadius: 16,
                  background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
                }}>
                  <span style={{ fontSize: 28, fontWeight: 800, color: '#ef4444' }}>{contradicting}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(239,68,68,0.8)', textTransform: 'uppercase' as const, letterSpacing: 1, marginTop: 2 }}>
                    {isNe ? 'विरोध' : 'Contradicted'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ── Bottom: URL + date ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: isStory ? 40 : isCard ? 14 : 20 }}>
            <span style={{ fontSize: isCard ? 13 : 16, color: '#6b7280', fontWeight: 500 }}>nepalrepublic.org/ministers</span>
            <span style={{ fontSize: isCard ? 12 : 14, color: '#6b7280' }}>
              {isNe ? 'यो हप्ता' : 'This week'} · {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Bottom accent */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: isCard ? 3 : 4, background: `linear-gradient(90deg, ${NEPAL_BLUE}, #3b82f6, ${NEPAL_BLUE})`, display: 'flex' }} />
      </div>
    ),
    { width, height },
  );
}

/* ══════════════════════════════════════════════════════════════
   Cabinet Dashboard mode: overview of all ministers
   Same visual style as corruption dashboard card
   ══════════════════════════════════════════════════════════════ */
async function renderCabinetDashboard(width: number, height: number, isNe: boolean, isStory: boolean, isCard = false) {
  const supabase = getSupabase();

  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [rosterRes, signalsRes] = await Promise.all([
    supabase
      .from('government_roster')
      .select('name, name_ne, title, title_ne, ministry, ministry_slug')
      .eq('is_current', true),
    supabase
      .from('intelligence_signals')
      .select('id, title, title_ne, classification, matched_promise_ids')
      .gte('discovered_at', cutoff)
      .gte('relevance_score', 0.2)
      .order('discovered_at', { ascending: false })
      .limit(2000),
  ]);

  const roster = rosterRes.data || [];
  const allSignals = signalsRes.data || [];
  const totalMinisters = roster.length;

  // Count signals per minister + collect top headlines
  interface MinisterStats {
    name: string; nameNe?: string; title: string;
    signals: number; confirming: number; contradicting: number;
    topHeadlines: { title: string; classification: string }[];
  }
  const ministerSignalCounts: MinisterStats[] = [];
  let totalWeeklySignals = 0;
  let activeCount = 0;

  for (const m of roster) {
    const variants = nameVariants(m.name, m.name_ne);
    const matched = new Set<string>();

    for (const s of allSignals) {
      const haystack = [s.title, s.title_ne].filter(Boolean).join(' ').toLowerCase();
      if (variants.some(v => v.length >= 4 && haystack.includes(v))) matched.add(s.id);
    }

    const matchedArr = [...matched].map(id => allSignals.find(s => s.id === id)!).filter(Boolean);
    const conf = matchedArr.filter(s => s.classification === 'confirms').length;
    const contra = matchedArr.filter(s => s.classification === 'contradicts').length;

    // Collect top headlines for this minister
    const topHeadlines = matchedArr.slice(0, 3).map(s => {
      const norm = normalizeTitles(s.title, s.title_ne);
      return { title: decodeEntities(isNe ? (norm.titleNe || norm.title) : norm.title), classification: s.classification };
    });

    ministerSignalCounts.push({
      name: m.name, nameNe: m.name_ne, title: m.title,
      signals: matched.size, confirming: conf, contradicting: contra,
      topHeadlines,
    });

    totalWeeklySignals += matched.size;
    if (matched.size > 0) activeCount++;
  }

  const quietCount = totalMinisters - activeCount;
  const sorted = [...ministerSignalCounts].sort((a, b) => b.signals - a.signals);
  const topMinister = sorted[0];

  const dPad = isStory ? '60px 56px' : isCard ? '28px 36px' : '50px';

  return new ImageResponse(
    (
      <div
        style={{
          width, height, display: 'flex', flexDirection: 'column',
          background: BG_DARK,
          fontFamily: 'system-ui, sans-serif',
          position: 'relative', overflow: 'hidden',
        }}
      >
        {/* Top accent — blue */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: isCard ? 4 : 6, background: `linear-gradient(90deg, ${NEPAL_BLUE}, #3b82f6, ${NEPAL_BLUE})`, display: 'flex' }} />

        <div style={{ display: 'flex', flexDirection: 'column', padding: dPad, flex: 1 }}>

          {/* ── Brand header ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isStory ? 50 : isCard ? 14 : 32 }}>
            <BrandBar isNe={isNe} size={isCard ? 'sm' : 'lg'} />
            {isCard && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14 }}>🏛️</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#93c5fd' }}>
                  {isNe ? 'मन्त्रिपरिषद्' : 'Cabinet Ministers'}
                </span>
              </div>
            )}
          </div>

          {/* Section label — non-card */}
          {!isCard && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: isStory ? 32 : 20 }}>
              <span style={{ fontSize: isStory ? 22 : 18 }}>🏛️</span>
              <span style={{ fontSize: isStory ? 26 : 22, fontWeight: 800, color: '#93c5fd' }}>
                {isNe ? 'मन्त्रिपरिषद् — साप्ताहिक गतिविधि' : 'Cabinet Ministers — Weekly Activity'}
              </span>
            </div>
          )}

          {/* ── CARD: horizontal layout ── */}
          {isCard ? (
            <div style={{ display: 'flex', flex: 1, gap: 20 }}>
              {/* Left: stats summary */}
              <div style={{ display: 'flex', flexDirection: 'column', width: 340, justifyContent: 'center' }}>
                {/* Total ministers + weekly signals */}
                <div style={{
                  display: 'flex', flexDirection: 'column',
                  marginBottom: 12,
                  padding: '16px 22px', borderRadius: 14,
                  background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.15)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <span style={{ fontSize: 38, fontWeight: 900, color: '#3b82f6' }}>
                      {totalMinisters}
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#9ca3af' }}>
                      {isNe ? 'मन्त्री ट्र्याक' : 'ministers tracked'}
                    </span>
                  </div>
                  <span style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>
                    {totalWeeklySignals} {isNe ? 'संकेत यो हप्ता' : 'signals this week'}
                  </span>
                </div>

                {/* Active vs quiet */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6, flex: 1,
                    padding: '8px 12px', borderRadius: 10,
                    background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)',
                  }}>
                    <span style={{ fontSize: 13 }}>⚡</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#22c55e' }}>{activeCount}</span>
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>{isNe ? 'सक्रिय' : 'active'}</span>
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6, flex: 1,
                    padding: '8px 12px', borderRadius: 10,
                    background: 'rgba(107,114,128,0.06)', border: '1px solid rgba(107,114,128,0.15)',
                  }}>
                    <span style={{ fontSize: 13 }}>👻</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#6b7280' }}>{quietCount}</span>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>{isNe ? 'शान्त' : 'quiet'}</span>
                  </div>
                </div>

                {/* Top 3 ministers ranked */}
                {sorted.slice(0, 3).map((m, i) => {
                  const p = getActivityPulse({ totalSignals: m.signals, confirming: m.confirming, contradicting: m.contradicting, directMentions: m.signals });
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 12px', borderRadius: 10, marginBottom: 5,
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                    }}>
                      <span style={{ fontSize: 16 }}>{p.emoji}</span>
                      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#e5e7eb' }}>
                          {isNe ? (m.nameNe || m.name) : m.name}
                        </span>
                      </div>
                      <span style={{ fontSize: 15, fontWeight: 800, color: p.color }}>{p.pulseValue}</span>
                    </div>
                  );
                })}
              </div>

              {/* Right: top signal headlines this week */}
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
                <span style={{
                  color: '#9ca3af', fontSize: 13, fontWeight: 600,
                  textTransform: 'uppercase' as const, letterSpacing: 1.5,
                  marginBottom: 10,
                }}>
                  {isNe ? '📰 यस हप्ताको मुख्य गतिविधि' : '📰 KEY ACTIVITY THIS WEEK'}
                </span>
                {(() => {
                  const headlines: { minister: string; title: string; classification: string }[] = [];
                  for (const m of sorted) {
                    if (m.topHeadlines.length === 0) continue;
                    const h = m.topHeadlines[0];
                    headlines.push({ minister: isNe ? (m.nameNe || m.name) : m.name, title: h.title, classification: h.classification });
                    if (headlines.length >= 4) break;
                  }
                  return headlines.map((h, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      borderRadius: 12, padding: '10px 14px', marginBottom: 6,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}>
                      <div style={{
                        width: 7, height: 7, borderRadius: '50%',
                        marginTop: 6, flexShrink: 0, display: 'flex',
                        background: CLASSIFICATION_COLORS[h.classification] || '#6b7280',
                      }} />
                      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 14, color: '#e5e7eb', lineHeight: 1.4, fontWeight: 500 }}>
                          {h.title.length > 55 ? h.title.slice(0, 52) + '...' : h.title}
                        </span>
                        <span style={{ fontSize: 11, color: '#6b7280', marginTop: 3, fontWeight: 500 }}>
                          — {h.minister}
                        </span>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          ) : (
            /* ── NON-CARD: vertical layout ── */
            <>
              {/* Total ministers + signals box */}
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                marginBottom: isStory ? 32 : 22,
                padding: isStory ? '32px 40px' : '24px 32px', borderRadius: 20,
                background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.15)',
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <span style={{ fontSize: isStory ? 60 : 46, fontWeight: 900, color: '#3b82f6', letterSpacing: -1 }}>
                    {totalMinisters}
                  </span>
                  <span style={{ fontSize: isStory ? 22 : 18, fontWeight: 700, color: '#6b7280' }}>
                    {isNe ? 'मन्त्री ट्र्याक' : 'ministers tracked'}
                  </span>
                </div>
                <span style={{ fontSize: isStory ? 15 : 13, color: '#6b7280', marginTop: 8 }}>
                  {totalWeeklySignals} {isNe ? 'संकेत यो हप्ता' : 'signals this week'}
                </span>
              </div>

              {/* Active / Quiet row */}
              <div style={{ display: 'flex', gap: isStory ? 14 : 10, marginBottom: isStory ? 32 : 22 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flex: 1,
                  padding: isStory ? '14px 16px' : '10px 14px', borderRadius: 12,
                  background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)',
                }}>
                  <span style={{ fontSize: isStory ? 14 : 12 }}>⚡</span>
                  <span style={{ fontSize: isStory ? 14 : 12, fontWeight: 700, color: '#22c55e' }}>{activeCount}</span>
                  <span style={{ fontSize: isStory ? 12 : 10, color: '#6b7280' }}>
                    {isNe ? 'सक्रिय' : 'active this week'}
                  </span>
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flex: 1,
                  padding: isStory ? '14px 16px' : '10px 14px', borderRadius: 12,
                  background: 'rgba(107,114,128,0.06)', border: '1px solid rgba(107,114,128,0.15)',
                }}>
                  <span style={{ fontSize: isStory ? 14 : 12 }}>👻</span>
                  <span style={{ fontSize: isStory ? 14 : 12, fontWeight: 700, color: '#6b7280' }}>{quietCount}</span>
                  <span style={{ fontSize: isStory ? 12 : 10, color: '#4b5563' }}>
                    {isNe ? 'शान्त/लापता' : 'quiet / ghost'}
                  </span>
                </div>
              </div>

              {/* Top ministers with headlines */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: isStory ? 16 : 12, marginBottom: isStory ? 40 : 28 }}>
                <span style={{ fontSize: isStory ? 15 : 13, color: '#9ca3af', letterSpacing: 2, textTransform: 'uppercase' as const, fontWeight: 600 }}>
                  {isNe ? 'शीर्ष गतिविधि यो हप्ता' : 'TOP ACTIVITY THIS WEEK'}
                </span>
                {sorted.filter(m => m.signals > 0).slice(0, isStory ? 5 : 3).map((m, i) => {
                  const p = getActivityPulse({ totalSignals: m.signals, confirming: m.confirming, contradicting: m.contradicting, directMentions: m.signals });
                  const headline = m.topHeadlines[0];
                  return (
                    <div key={i} style={{
                      display: 'flex', flexDirection: 'column',
                      padding: isStory ? '20px 22px' : '14px 18px', borderRadius: 16,
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    }}>
                      {/* Minister row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <span style={{ fontSize: isStory ? 26 : 20 }}>{p.emoji}</span>
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                          <span style={{ fontSize: isStory ? 20 : 16, fontWeight: 700, color: '#e5e7eb' }}>
                            {isNe ? (m.nameNe || m.name) : m.name}
                          </span>
                          <span style={{ fontSize: isStory ? 13 : 11, color: '#9ca3af' }}>
                            {m.title}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: isStory ? 22 : 18, fontWeight: 800, color: p.color }}>{p.pulseValue}</span>
                          <span style={{ fontSize: isStory ? 14 : 12, color: '#22c55e', fontWeight: 600 }}>{m.confirming}✓</span>
                          <span style={{ fontSize: isStory ? 14 : 12, color: '#ef4444', fontWeight: 600 }}>{m.contradicting}✗</span>
                        </div>
                      </div>
                      {/* Top headline for this minister */}
                      {headline && (
                        <div style={{
                          display: 'flex', alignItems: 'flex-start', gap: 10,
                          marginTop: 10, paddingTop: 10,
                          borderTop: '1px solid rgba(255,255,255,0.06)',
                        }}>
                          <div style={{
                            width: 7, height: 7, borderRadius: '50%',
                            marginTop: 7, flexShrink: 0, display: 'flex',
                            background: CLASSIFICATION_COLORS[headline.classification] || '#6b7280',
                          }} />
                          <span style={{
                            fontSize: isStory ? 17 : 14, color: '#d1d5db', lineHeight: 1.4, fontWeight: 500,
                          }}>
                            {headline.title.length > 80 ? headline.title.slice(0, 77) + '...' : headline.title}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', flex: 1 }} />
            </>
          )}

          {/* ── Bottom: URL + CTA ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: isCard ? 12 : 0 }}>
            <span style={{ fontSize: isCard ? 13 : 16, color: '#6b7280', fontWeight: 500 }}>nepalrepublic.org/ministers</span>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: isCard ? '8px 18px' : '12px 24px', borderRadius: 24,
              background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)',
            }}>
              <span style={{ fontSize: isCard ? 13 : 15, fontWeight: 700, color: '#3b82f6', letterSpacing: 1.5 }}>
                {isNe ? 'जवाफदेहिता ट्र्याक गर्नुहोस्' : 'TRACK ACCOUNTABILITY'}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom accent */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: isCard ? 3 : 4, background: `linear-gradient(90deg, ${NEPAL_BLUE}, #3b82f6, ${NEPAL_BLUE})`, display: 'flex' }} />
      </div>
    ),
    { width, height },
  );
}
