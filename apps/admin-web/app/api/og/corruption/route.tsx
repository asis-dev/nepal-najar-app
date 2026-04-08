import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const BG_DARK = '#0a0e1a';
const NEPAL_RED = '#DC143C';
const NEPAL_BLUE = '#003893';

/* ── Status config for image rendering ── */
const STATUS_CFG: Record<string, { color: string; label: string; labelNe: string }> = {
  alleged:             { color: '#94a3b8', label: 'ALLEGED', labelNe: 'आरोपित' },
  under_investigation: { color: '#f59e0b', label: 'UNDER INVESTIGATION', labelNe: 'अनुसन्धानमा' },
  charged:             { color: '#f97316', label: 'CHARGED', labelNe: 'अभियुक्त' },
  trial:               { color: '#a855f7', label: 'ON TRIAL', labelNe: 'मुद्दा विचाराधीन' },
  convicted:           { color: '#ef4444', label: 'CONVICTED', labelNe: 'दोषी ठहर' },
  acquitted:           { color: '#22c55e', label: 'ACQUITTED', labelNe: 'सफाइ पाएको' },
  asset_recovery:      { color: '#06b6d4', label: 'ASSET RECOVERY', labelNe: 'सम्पत्ति असुली' },
  closed:              { color: '#71717a', label: 'CLOSED', labelNe: 'बन्द' },
};

const SEVERITY_CFG: Record<string, { color: string; label: string }> = {
  minor: { color: '#eab308', label: 'MINOR' },
  major: { color: '#f97316', label: 'MAJOR' },
  mega:  { color: '#ef4444', label: 'MEGA' },
};

const TYPE_LABELS: Record<string, string> = {
  bribery: 'Bribery', embezzlement: 'Embezzlement', nepotism: 'Nepotism',
  money_laundering: 'Money Laundering', land_grab: 'Land Grab',
  procurement_fraud: 'Procurement Fraud', tax_evasion: 'Tax Evasion',
  abuse_of_authority: 'Abuse of Authority', kickback: 'Kickback', other: 'Other',
};

function formatAmount(amount: number | null): string {
  if (!amount) return '';
  if (amount >= 1_00_00_00_000) return `${(amount / 1_00_00_00_000).toFixed(1)} Arab`;
  if (amount >= 1_00_00_000) return `${(amount / 1_00_00_000).toFixed(1)} Crore`;
  if (amount >= 1_00_000) return `${(amount / 1_00_000).toFixed(1)} Lakh`;
  return amount.toLocaleString();
}

const NPR_TO_USD = 133.5;
function formatUsd(npr: number): string {
  const usd = npr / NPR_TO_USD;
  if (usd >= 1_000_000_000) return `$${(usd / 1_000_000_000).toFixed(1)}B`;
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(0)}K`;
  return `$${usd.toFixed(0)}`;
}

/** Renders the NR brand logo block — matches the RepublicMark component exactly */
function BrandBar({ isNe, size = 'md' }: { isNe: boolean; size?: 'sm' | 'md' | 'lg' }) {
  const logoSize = size === 'lg' ? 52 : size === 'md' ? 44 : 36;
  const fontSize = size === 'lg' ? 17 : size === 'md' ? 15 : 13;
  const nameSize = size === 'lg' ? 22 : size === 'md' ? 18 : 16;
  const subSize = size === 'lg' ? 12 : size === 'md' ? 11 : 10;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size === 'lg' ? 16 : 12 }}>
      {/* NR monogram — red-to-blue gradient like the app */}
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

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const slug = searchParams.get('slug') || searchParams.get('id');
  const lang = searchParams.get('lang') || 'en';
  const format = searchParams.get('format') || 'story';
  const mode = searchParams.get('mode') || 'case'; // 'case' or 'dashboard'
  const isNe = lang === 'ne';
  const isStory = format === 'story';
  const isCard = format === 'card';
  const width = isCard ? 1200 : 1080;
  const height = isStory ? 1920 : isCard ? 630 : 1080;

  // ── DASHBOARD MODE: render corruption summary overview ──
  if (mode === 'dashboard') {
    return renderDashboard(width, height, isNe, isStory, isCard);
  }

  // ── CASE MODE: render specific case ──
  if (!slug) {
    return renderDashboard(width, height, isNe, isStory, isCard);
  }

  const supabase = getSupabase();
  const { data: caseData } = await supabase
    .from('corruption_cases')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (!caseData) {
    return renderDashboard(width, height, isNe, isStory, isCard);
  }

  // Count entities and evidence
  const [{ count: entityCount }, { count: evidenceCount }, { count: timelineCount }] = await Promise.all([
    supabase.from('case_entities').select('id', { count: 'exact', head: true }).eq('case_id', caseData.id),
    supabase.from('corruption_evidence').select('id', { count: 'exact', head: true }).eq('case_id', caseData.id),
    supabase.from('corruption_timeline').select('id', { count: 'exact', head: true }).eq('case_id', caseData.id),
  ]);

  const title = isNe && caseData.title_ne ? caseData.title_ne : caseData.title;
  const summary = isNe && caseData.summary_ne ? caseData.summary_ne : caseData.summary;
  const statusCfg = STATUS_CFG[caseData.status] || STATUS_CFG.alleged;
  const severityCfg = caseData.severity ? SEVERITY_CFG[caseData.severity] : null;
  const typeLabel = TYPE_LABELS[caseData.corruption_type] || caseData.corruption_type;
  const amount = caseData.estimated_amount_npr;

  // Key figures from entities
  const { data: entities } = await supabase
    .from('case_entities')
    .select('name, role')
    .eq('case_id', caseData.id)
    .limit(4);
  const keyFigures = (entities || []).filter(e => e.name).slice(0, 3);

  // ── Padding / sizing helpers based on format ──
  const pad = isStory ? '60px 56px' : isCard ? '32px 40px' : '50px';
  const titleMax = isCard ? 80 : 100;
  const summaryMax = isCard ? 120 : 200;
  const titleSize = isStory ? 44 : isCard ? 28 : 36;
  const amountSize = isStory ? 44 : isCard ? 26 : 34;
  const badgeFont = isCard ? 11 : 14;
  const badgePad = isCard ? '5px 12px' : '8px 18px';
  const summaryFont = isStory ? 19 : isCard ? 13 : 16;

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
        {/* Top red accent */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: isCard ? 4 : 6, background: `linear-gradient(90deg, ${NEPAL_RED}, #ef4444, ${NEPAL_RED})`, display: 'flex' }} />

        <div style={{ display: 'flex', flexDirection: 'column', padding: pad, flex: 1 }}>

          {/* ── Brand header ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isStory ? 40 : isCard ? 16 : 28 }}>
            <BrandBar isNe={isNe} size={isCard ? 'sm' : 'lg'} />
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: isCard ? '6px 14px' : '10px 20px', borderRadius: 24,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
            }}>
              <span style={{ fontSize: isCard ? 10 : 13, fontWeight: 700, color: '#ef4444', letterSpacing: 2 }}>
                {isNe ? 'भ्रष्टाचार सारांश' : 'CORRUPTION SUMMARY'}
              </span>
            </div>
          </div>

          {/* ── Card: mirrors app glass-card ── */}
          <div style={{
            display: 'flex', flexDirection: isCard ? 'row' : 'column',
            ...(isCard ? { flex: 1 } : {}),
            padding: isStory ? '40px 36px' : isCard ? '20px 24px' : '32px 28px', borderRadius: isCard ? 16 : 24,
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            gap: isCard ? 28 : 0,
          }}>
            {/* Left side (or full width for non-card) */}
            <div style={{ display: 'flex', flexDirection: 'column', ...(isCard ? { flex: 1 } : {}) }}>
              {/* Status + severity + type badges — like the app */}
              <div style={{ display: 'flex', alignItems: 'center', gap: isCard ? 6 : 10, marginBottom: isStory ? 24 : isCard ? 10 : 16, flexWrap: 'wrap' as const }}>
                <div style={{
                  display: 'flex', alignItems: 'center', padding: badgePad, borderRadius: 10,
                  background: `${statusCfg.color}18`, border: `1.5px solid ${statusCfg.color}40`,
                }}>
                  <span style={{ fontSize: badgeFont, fontWeight: 700, color: statusCfg.color, letterSpacing: 1 }}>
                    {isNe ? statusCfg.labelNe : statusCfg.label}
                  </span>
                </div>
                {severityCfg && (
                  <div style={{
                    display: 'flex', alignItems: 'center', padding: badgePad, borderRadius: 10,
                    background: `${severityCfg.color}12`, border: `1px solid ${severityCfg.color}30`,
                  }}>
                    <span style={{ fontSize: isCard ? 10 : 13, fontWeight: 600, color: severityCfg.color }}>{severityCfg.label}</span>
                  </div>
                )}
                <div style={{
                  display: 'flex', alignItems: 'center', padding: isCard ? '5px 10px' : '8px 16px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                }}>
                  <span style={{ fontSize: isCard ? 10 : 13, color: '#9ca3af', fontWeight: 500 }}>{typeLabel}</span>
                </div>
              </div>

              {/* Title */}
              <div style={{ display: 'flex', marginBottom: isStory ? 20 : isCard ? 8 : 14 }}>
                <span style={{ fontSize: titleSize, fontWeight: 800, color: '#ffffff', lineHeight: 1.25 }}>
                  {title.length > titleMax ? title.slice(0, titleMax - 3) + '...' : title}
                </span>
              </div>

              {/* Amount — red, with USD */}
              {amount != null && amount > 0 && (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: isCard ? 6 : 10, marginBottom: isStory ? 20 : isCard ? 8 : 14 }}>
                  <span style={{ fontSize: amountSize, fontWeight: 900, color: '#ef4444' }}>
                    रू {formatAmount(amount)}
                  </span>
                  <span style={{ fontSize: isCard ? 13 : 16, color: '#6b7280' }}>({formatUsd(amount)})</span>
                </div>
              )}

              {/* Summary */}
              {summary && (
                <div style={{ display: 'flex', marginBottom: isStory ? 28 : isCard ? 0 : 20 }}>
                  <span style={{ fontSize: summaryFont, color: '#9ca3af', lineHeight: 1.7 }}>
                    {summary.length > summaryMax ? summary.slice(0, summaryMax - 3) + '...' : summary}
                  </span>
                </div>
              )}

              {/* Key figures — only in non-card or if card has room */}
              {!isCard && keyFigures.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: isStory ? 28 : 20 }}>
                  <span style={{ fontSize: 11, color: '#6b7280', letterSpacing: 2, textTransform: 'uppercase' as const, fontWeight: 600 }}>
                    {isNe ? 'मुख्य व्यक्ति' : 'KEY FIGURES'}
                  </span>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
                    {keyFigures.map((e, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '6px 14px', borderRadius: 8,
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                      }}>
                        <span style={{ fontSize: 14, color: '#e5e7eb', fontWeight: 600 }}>{e.name}</span>
                        {e.role && <span style={{ fontSize: 11, color: '#6b7280' }}>({e.role})</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Spacer */}
              {!isCard && <div style={{ display: 'flex', flex: 1 }} />}
            </div>

            {/* Right side for card: stats column */}
            {isCard ? (
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8, width: 280 }}>
                {/* 3 stats stacked vertically for card */}
                {[
                  { value: entityCount || 0, label: isNe ? 'संलग्न' : 'Entities', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
                  { value: evidenceCount || 0, label: isNe ? 'प्रमाण' : 'Evidence', color: '#a855f7', bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.2)' },
                  { value: timelineCount || 0, label: isNe ? 'घटनाक्रम' : 'Events', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
                ].map((stat, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10, flex: 1,
                    padding: '10px 16px', borderRadius: 12,
                    background: stat.bg, border: `1px solid ${stat.border}`,
                  }}>
                    <span style={{ fontSize: 26, fontWeight: 800, color: stat.color }}>{stat.value}</span>
                    <span style={{ fontSize: 10, color: `${stat.color}90`, textTransform: 'uppercase' as const, letterSpacing: 1.5, fontWeight: 600 }}>
                      {stat.label}
                    </span>
                  </div>
                ))}
                {/* Key figures compact for card */}
                {keyFigures.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                    <span style={{ fontSize: 9, color: '#6b7280', letterSpacing: 1.5, textTransform: 'uppercase' as const, fontWeight: 600 }}>
                      {isNe ? 'मुख्य व्यक्ति' : 'KEY FIGURES'}
                    </span>
                    {keyFigures.slice(0, 2).map((e, i) => (
                      <span key={i} style={{ fontSize: 11, color: '#d1d5db', fontWeight: 500 }}>
                        {e.name}{e.role ? ` (${e.role})` : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* 3-column stats — non-card layout */
              <div style={{ display: 'flex', gap: 14, marginBottom: isStory ? 24 : 16 }}>
                {[
                  { value: entityCount || 0, label: isNe ? 'संलग्न' : 'Entities', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
                  { value: evidenceCount || 0, label: isNe ? 'प्रमाण' : 'Evidence', color: '#a855f7', bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.2)' },
                  { value: timelineCount || 0, label: isNe ? 'घटनाक्रम' : 'Events', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
                ].map((stat, i) => (
                  <div key={i} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1,
                    padding: isStory ? '24px 16px' : '18px 14px', borderRadius: 16,
                    background: stat.bg, border: `1px solid ${stat.border}`,
                  }}>
                    <span style={{ fontSize: isStory ? 36 : 28, fontWeight: 800, color: stat.color }}>{stat.value}</span>
                    <span style={{ fontSize: 10, color: `${stat.color}90`, marginTop: 4, textTransform: 'uppercase' as const, letterSpacing: 1.5, fontWeight: 600 }}>
                      {stat.label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Footer: date — non-card only */}
            {!isCard && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: '#4b5563' }}>
                  Updated {new Date(caseData.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            )}
          </div>

          {/* ── Bottom brand + CTA ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: isStory ? 32 : isCard ? 12 : 20 }}>
            <span style={{ fontSize: isCard ? 11 : 13, color: '#4b5563' }}>nepalrepublic.org/corruption</span>
            <span style={{ fontSize: isCard ? 11 : 13, fontWeight: 700, color: '#ef4444', letterSpacing: 1 }}>
              {isNe ? 'पैसा पछ्याउनुहोस्' : 'FOLLOW THE MONEY'}
            </span>
          </div>
        </div>

        {/* Bottom accent */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: isCard ? 3 : 4, background: `linear-gradient(90deg, ${NEPAL_RED}, #ef4444, ${NEPAL_RED})`, display: 'flex' }} />
      </div>
    ),
    { width, height },
  );
}

/* ══════════════════════════════════════════════════════════════
   Dashboard mode: overall corruption summary
   Mirrors the app's corruption tab layout with 3-column grid
   ══════════════════════════════════════════════════════════════ */
async function renderDashboard(width: number, height: number, isNe: boolean, isStory: boolean, isCard = false) {
  const supabase = getSupabase();

  const [
    { count: totalCases },
    { data: amountData },
    { data: byStatusData },
    { count: totalEntities },
    { count: signalCount },
  ] = await Promise.all([
    supabase.from('corruption_cases').select('id', { count: 'exact', head: true }),
    supabase.from('corruption_cases').select('estimated_amount_npr'),
    supabase.from('corruption_cases').select('status, estimated_amount_npr'),
    supabase.from('case_entities').select('id', { count: 'exact', head: true }),
    supabase.from('intelligence_signals').select('id', { count: 'exact', head: true }),
  ]);

  const totalAmount = (amountData || []).reduce((sum, r) => sum + (r.estimated_amount_npr || 0), 0);
  const total = totalCases || 0;
  const entities = totalEntities || 0;
  const signals = signalCount || 0;

  // Aggregate by status — same grouping as the app's feed-island
  const statusCounts: Record<string, number> = {};
  const statusAmounts: Record<string, number> = {};
  for (const r of byStatusData || []) {
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    statusAmounts[r.status] = (statusAmounts[r.status] || 0) + (r.estimated_amount_npr || 0);
  }

  // 3 groups matching app layout: Investigating (alleged+under_investigation+charged), On Trial, Convicted
  const investigating = (statusCounts['under_investigation'] || 0) + (statusCounts['alleged'] || 0) + (statusCounts['charged'] || 0);
  const investigatingAmt = (statusAmounts['under_investigation'] || 0) + (statusAmounts['alleged'] || 0) + (statusAmounts['charged'] || 0);
  const onTrial = statusCounts['trial'] || 0;
  const onTrialAmt = statusAmounts['trial'] || 0;
  const convicted = statusCounts['convicted'] || 0;
  const convictedAmt = statusAmounts['convicted'] || 0;

  // ── Padding / sizing helpers based on format ──
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
        {/* Top accent */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: isCard ? 4 : 6, background: `linear-gradient(90deg, ${NEPAL_RED}, #ef4444, ${NEPAL_RED})`, display: 'flex' }} />

        <div style={{ display: 'flex', flexDirection: 'column', padding: dPad, flex: 1 }}>

          {/* ── Brand header ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isStory ? 50 : isCard ? 14 : 32 }}>
            <BrandBar isNe={isNe} size={isCard ? 'sm' : 'lg'} />
            {isCard && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14 }}>🛡️</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#fca5a5' }}>
                  {isNe ? 'भ्रष्टाचार सारांश' : 'Corruption Summary'}
                </span>
              </div>
            )}
          </div>

          {/* ── Section label: non-card only ── */}
          {!isCard && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: isStory ? 32 : 20 }}>
              <span style={{ fontSize: isStory ? 22 : 18 }}>🛡️</span>
              <span style={{ fontSize: isStory ? 26 : 22, fontWeight: 800, color: '#fca5a5' }}>
                {isNe ? 'भ्रष्टाचार सारांश' : 'Corruption Summary'}
              </span>
            </div>
          )}

          {/* ── CARD: horizontal layout — amount left, 3 statuses right ── */}
          {isCard ? (
            <div style={{ display: 'flex', flex: 1, gap: 24 }}>
              {/* Left: amount + stats */}
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
                {/* Total amount */}
                <div style={{
                  display: 'flex', flexDirection: 'column',
                  marginBottom: 14,
                  padding: '16px 24px', borderRadius: 14,
                  background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: 36, fontWeight: 900, color: '#ef4444', letterSpacing: -1 }}>
                      रू {formatAmount(totalAmount)}
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#6b7280' }}>
                      ({formatUsd(totalAmount)})
                    </span>
                  </div>
                  <span style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                    {total} {isNe ? 'घटनामा' : 'cases exposed'}
                  </span>
                </div>

                {/* Key stats row */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6, flex: 1,
                    padding: '8px 12px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                  }}>
                    <span style={{ fontSize: 11 }}>👤</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#e5e7eb' }}>{entities}</span>
                    <span style={{ fontSize: 9, color: '#6b7280' }}>{isNe ? 'व्यक्ति' : 'tracked'}</span>
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6, flex: 1,
                    padding: '8px 12px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                  }}>
                    <span style={{ fontSize: 11 }}>📡</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#e5e7eb' }}>{signals.toLocaleString()}+</span>
                    <span style={{ fontSize: 9, color: '#6b7280' }}>{isNe ? 'स्रोत' : 'scanned'}</span>
                  </div>
                </div>
              </div>

              {/* Right: 3 status columns */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {[
                  { count: investigating, amt: investigatingAmt, label: isNe ? 'अनुसन्धानमा' : 'Investigating', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
                  { count: onTrial, amt: onTrialAmt, label: isNe ? 'विचाराधीन' : 'On Trial', color: '#a855f7', bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.2)' },
                  { count: convicted, amt: convictedAmt, label: isNe ? 'दोषी' : 'Convicted', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
                ].map((s, i) => (
                  <div key={i} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    padding: '20px 22px', borderRadius: 16,
                    background: s.bg, border: `1px solid ${s.border}`,
                    width: 120,
                  }}>
                    <span style={{ fontSize: 36, fontWeight: 800, color: s.color }}>{s.count}</span>
                    <span style={{ fontSize: 9, fontWeight: 600, color: `${s.color}B0`, textTransform: 'uppercase' as const, letterSpacing: 1, marginTop: 4, textAlign: 'center' as const }}>
                      {s.label}
                    </span>
                    {s.amt > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 600, color: `${s.color}80`, marginTop: 4 }}>
                        रू {formatAmount(s.amt)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* ── NON-CARD (story / square): vertical layout, centered ── */
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
              {/* Total amount — centered, with USD */}
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                marginBottom: isStory ? 48 : 22,
                padding: isStory ? '48px 40px' : '24px 32px', borderRadius: 24,
                background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)',
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <span style={{ fontSize: isStory ? 72 : 46, fontWeight: 900, color: '#ef4444', letterSpacing: -1 }}>
                    रू {formatAmount(totalAmount)}
                  </span>
                  <span style={{ fontSize: isStory ? 26 : 18, fontWeight: 700, color: '#6b7280' }}>
                    ({formatUsd(totalAmount)})
                  </span>
                </div>
                <span style={{ fontSize: isStory ? 18 : 13, color: '#6b7280', marginTop: 10 }}>
                  {total} {isNe ? 'घटनामा' : 'cases exposed'}
                </span>
              </div>

              {/* Key stats row */}
              <div style={{ display: 'flex', gap: isStory ? 16 : 10, marginBottom: isStory ? 48 : 22 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flex: 1,
                  padding: isStory ? '20px 16px' : '10px 14px', borderRadius: 16,
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                }}>
                  <span style={{ fontSize: isStory ? 18 : 12 }}>👤</span>
                  <span style={{ fontSize: isStory ? 18 : 12, fontWeight: 700, color: '#e5e7eb' }}>{entities}</span>
                  <span style={{ fontSize: isStory ? 15 : 10, color: '#6b7280' }}>
                    {isNe ? 'व्यक्ति ट्र्याक' : 'persons tracked'}
                  </span>
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flex: 1,
                  padding: isStory ? '20px 16px' : '10px 14px', borderRadius: 16,
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                }}>
                  <span style={{ fontSize: isStory ? 18 : 12 }}>📡</span>
                  <span style={{ fontSize: isStory ? 18 : 12, fontWeight: 700, color: '#e5e7eb' }}>{signals.toLocaleString()}+</span>
                  <span style={{ fontSize: isStory ? 15 : 10, color: '#6b7280' }}>
                    {isNe ? 'स्रोत स्क्यान' : 'sources scanned'}
                  </span>
                </div>
              </div>

              {/* 3-column status breakdown — fixed height, no flex stretch */}
              <div style={{ display: 'flex', gap: isStory ? 20 : 14 }}>
                {[
                  { count: investigating, amt: investigatingAmt, label: isNe ? 'अनुसन्धानमा' : 'Under Investigation', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
                  { count: onTrial, amt: onTrialAmt, label: isNe ? 'मुद्दा विचाराधीन' : 'On Trial', color: '#a855f7', bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.2)' },
                  { count: convicted, amt: convictedAmt, label: isNe ? 'दोषी ठहर' : 'Convicted', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
                ].map((s, i) => (
                  <div key={i} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    flex: 1, borderRadius: 24,
                    padding: isStory ? '44px 20px' : '24px 16px',
                    background: s.bg, border: `1px solid ${s.border}`,
                  }}>
                    <span style={{ fontSize: isStory ? 64 : 44, fontWeight: 800, color: s.color }}>{s.count}</span>
                    <span style={{ fontSize: isStory ? 13 : 10, fontWeight: 600, color: `${s.color}B0`, textTransform: 'uppercase' as const, letterSpacing: 1, marginTop: 8, textAlign: 'center' as const }}>
                      {s.label}
                    </span>
                    {s.amt > 0 && (
                      <span style={{ fontSize: isStory ? 15 : 11, fontWeight: 600, color: `${s.color}80`, marginTop: 8 }}>
                        रू {formatAmount(s.amt)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Sources ── */}
          <div style={{ display: 'flex', marginBottom: isStory ? 24 : isCard ? 8 : 16, marginTop: isCard ? 10 : 0 }}>
            <span style={{ fontSize: isCard ? 9 : 11, color: '#374151' }}>
              Sources: CIAA, Parliament Records, Kathmandu Post, Republica, OnlineKhabar + 70 more
            </span>
          </div>

          {/* ── Bottom: URL + CTA ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: isCard ? 11 : 14, color: '#4b5563' }}>nepalrepublic.org/corruption</span>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: isCard ? '6px 14px' : '10px 20px', borderRadius: 24,
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            }}>
              <span style={{ fontSize: isCard ? 10 : 13, fontWeight: 700, color: '#ef4444', letterSpacing: 1 }}>
                {isNe ? 'पैसा पछ्याउनुहोस्' : 'FOLLOW THE MONEY'}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom accent */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: isCard ? 3 : 4, background: `linear-gradient(90deg, ${NEPAL_RED}, #ef4444, ${NEPAL_RED})`, display: 'flex' }} />
      </div>
    ),
    { width, height },
  );
}
