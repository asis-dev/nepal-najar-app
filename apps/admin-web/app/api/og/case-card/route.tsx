import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const BG_DARK = '#0a0e1a';
const NEPAL_RED = '#DC143C';
const NEPAL_BLUE = '#003893';

/* ── Reaction emoji mapping ── */
const REACTION_EMOJI: Record<string, string> = {
  angry: '\uD83D\uDE21',
  shocked: '\uD83D\uDE31',
  sad: '\uD83D\uDE22',
  clap: '\uD83D\uDC4F',
  eyes: '\uD83D\uDC40',
};

/* ── Status config ── */
const STATUS_CFG: Record<string, { color: string; label: string; labelNe: string }> = {
  alleged:             { color: '#94a3b8', label: 'ALLEGED', labelNe: '\u0906\u0930\u094B\u092A\u093F\u0924' },
  under_investigation: { color: '#f59e0b', label: 'UNDER INVESTIGATION', labelNe: '\u0905\u0928\u0941\u0938\u0928\u094D\u0927\u093E\u0928\u092E\u093E' },
  charged:             { color: '#f97316', label: 'CHARGED', labelNe: '\u0905\u092D\u093F\u092F\u0941\u0915\u094D\u0924' },
  trial:               { color: '#a855f7', label: 'ON TRIAL', labelNe: '\u092E\u0941\u0926\u094D\u0926\u093E \u0935\u093F\u091A\u093E\u0930\u093E\u0927\u0940\u0928' },
  convicted:           { color: '#ef4444', label: 'CONVICTED', labelNe: '\u0926\u094B\u0937\u0940 \u0920\u0939\u0930' },
  acquitted:           { color: '#22c55e', label: 'ACQUITTED', labelNe: '\u0938\u092B\u093E\u0907 \u092A\u093E\u090F\u0915\u094B' },
  asset_recovery:      { color: '#06b6d4', label: 'ASSET RECOVERY', labelNe: '\u0938\u092E\u094D\u092A\u0924\u094D\u0924\u093F \u0905\u0938\u0941\u0932\u0940' },
  closed:              { color: '#71717a', label: 'CLOSED', labelNe: '\u092C\u0928\u094D\u0926' },
};

const SEVERITY_CFG: Record<string, { color: string; label: string }> = {
  minor: { color: '#eab308', label: 'MINOR' },
  major: { color: '#f97316', label: 'MAJOR' },
  mega:  { color: '#ef4444', label: 'MEGA' },
};

const TYPE_LABELS: Record<string, string> = {
  bribery: 'BRIBERY', embezzlement: 'EMBEZZLEMENT', nepotism: 'NEPOTISM',
  money_laundering: 'MONEY LAUNDERING', land_grab: 'LAND GRAB',
  procurement_fraud: 'PROCUREMENT FRAUD', tax_evasion: 'TAX EVASION',
  abuse_of_authority: 'ABUSE OF AUTHORITY', kickback: 'KICKBACK', other: 'OTHER',
};

const TYPE_EMOJI: Record<string, string> = {
  bribery: '\uD83D\uDCB0', embezzlement: '\uD83D\uDCB8', nepotism: '\uD83D\uDC65',
  money_laundering: '\uD83E\uDDFC', land_grab: '\uD83C\uDFD7\uFE0F',
  procurement_fraud: '\uD83D\uDCC4', tax_evasion: '\uD83D\uDCCA',
  abuse_of_authority: '\u2696\uFE0F', kickback: '\uD83D\uDD04', other: '\u26A0\uFE0F',
};

function formatAmount(amount: number | null): string {
  if (!amount) return '';
  if (amount >= 1_00_00_00_000) return `${(amount / 1_00_00_00_000).toFixed(1)} Arab`;
  if (amount >= 1_00_00_000) return `${(amount / 1_00_00_000).toFixed(1)} Crore`;
  if (amount >= 1_00_000) return `${(amount / 1_00_000).toFixed(1)} Lakh`;
  return amount.toLocaleString();
}

/**
 * GET /api/og/case-card?slug=case-slug
 *
 * Generates a 1080x1080 square shareable image for a corruption case.
 * Optimized for WhatsApp/Viber/Facebook sharing — the "viral unit".
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const slug = searchParams.get('slug');

  if (!slug) {
    return new Response('slug query parameter is required', { status: 400 });
  }

  const supabase = getSupabase();

  // Fetch case data
  const { data: caseData } = await supabase
    .from('corruption_cases')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (!caseData) {
    return new Response('Case not found', { status: 404 });
  }

  // Fetch reaction counts
  const { data: reactions } = await supabase
    .from('corruption_reactions')
    .select('reaction')
    .eq('case_slug', slug);

  const reactionCounts: Record<string, number> = {};
  let totalReactions = 0;
  for (const r of reactions || []) {
    reactionCounts[r.reaction] = (reactionCounts[r.reaction] ?? 0) + 1;
    totalReactions++;
  }

  // Fetch comment count
  const { count: commentCount } = await supabase
    .from('corruption_comments')
    .select('id', { count: 'exact', head: true })
    .eq('case_slug', slug)
    .eq('is_approved', true);

  // Fetch evidence count
  const { count: evidenceCount } = await supabase
    .from('corruption_evidence')
    .select('id', { count: 'exact', head: true })
    .eq('case_id', caseData.id);

  const title = caseData.title_ne || caseData.title;
  const statusCfg = STATUS_CFG[caseData.status] || STATUS_CFG.alleged;
  const severityCfg = caseData.severity ? SEVERITY_CFG[caseData.severity] : null;
  const typeLabel = TYPE_LABELS[caseData.corruption_type] || 'OTHER';
  const typeEmoji = TYPE_EMOJI[caseData.corruption_type] || '\u26A0\uFE0F';
  const amount = caseData.estimated_amount_npr;

  // Build reaction display — top 3 reactions
  const sortedReactions = Object.entries(reactionCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  return new ImageResponse(
    (
      <div
        style={{
          width: 1080,
          height: 1080,
          display: 'flex',
          flexDirection: 'column',
          background: BG_DARK,
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Red alert header bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            padding: '28px 50px',
            background: `linear-gradient(135deg, ${NEPAL_RED} 0%, #b91c1c 100%)`,
          }}
        >
          <span style={{ fontSize: 36 }}>{typeEmoji}</span>
          <span
            style={{
              fontSize: 28,
              fontWeight: 900,
              color: '#ffffff',
              letterSpacing: 4,
            }}
          >
            {typeLabel} CASE
          </span>
          <span style={{ fontSize: 36 }}>{typeEmoji}</span>
        </div>

        {/* Main content area */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            padding: '44px 56px',
          }}
        >
          {/* Status + severity badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 24px',
                borderRadius: 14,
                background: `${statusCfg.color}18`,
                border: `2px solid ${statusCfg.color}50`,
              }}
            >
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: statusCfg.color,
                  letterSpacing: 2,
                }}
              >
                {statusCfg.label}
              </span>
            </div>
            {severityCfg && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 20px',
                  borderRadius: 14,
                  background: `${severityCfg.color}12`,
                  border: `2px solid ${severityCfg.color}30`,
                }}
              >
                <span style={{ fontSize: 16, fontWeight: 700, color: severityCfg.color }}>
                  {severityCfg.label}
                </span>
              </div>
            )}
            {(evidenceCount ?? 0) > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 20px',
                  borderRadius: 14,
                  background: 'rgba(168,85,247,0.08)',
                  border: '2px solid rgba(168,85,247,0.25)',
                }}
              >
                <span style={{ fontSize: 16, fontWeight: 700, color: '#a855f7' }}>
                  {evidenceCount} Evidence
                </span>
              </div>
            )}
          </div>

          {/* Title */}
          <div style={{ display: 'flex', marginBottom: 32 }}>
            <span
              style={{
                fontSize: title.length > 80 ? 34 : title.length > 50 ? 40 : 48,
                fontWeight: 900,
                color: '#ffffff',
                lineHeight: 1.25,
                letterSpacing: -0.5,
              }}
            >
              {title.length > 100 ? title.slice(0, 97) + '...' : title}
            </span>
          </div>

          {/* Amount — THE hero stat */}
          {amount != null && amount > 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '32px 40px',
                borderRadius: 24,
                background: 'rgba(239,68,68,0.06)',
                border: '2px solid rgba(239,68,68,0.2)',
                marginBottom: 32,
              }}
            >
              <span style={{ fontSize: 14, color: '#6b7280', letterSpacing: 3, fontWeight: 700, marginBottom: 8 }}>
                ESTIMATED AMOUNT
              </span>
              <span
                style={{
                  fontSize: 72,
                  fontWeight: 900,
                  color: '#ef4444',
                  letterSpacing: -1,
                }}
              >
                {'\u0930\u0942 '}{formatAmount(amount)}
              </span>
            </div>
          ) : (
            /* If no amount, show summary instead */
            caseData.summary && (
              <div style={{ display: 'flex', marginBottom: 32 }}>
                <span
                  style={{
                    fontSize: 22,
                    color: '#9ca3af',
                    lineHeight: 1.6,
                  }}
                >
                  {(caseData.summary_ne || caseData.summary).slice(0, 180)}{(caseData.summary_ne || caseData.summary).length > 180 ? '...' : ''}
                </span>
              </div>
            )
          )}

          {/* Spacer */}
          <div style={{ display: 'flex', flex: 1 }} />

          {/* Reaction bar — social proof */}
          {totalReactions > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 24,
                padding: '20px 32px',
                borderRadius: 18,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                marginBottom: 24,
              }}
            >
              {sortedReactions.map(([reaction, count]) => (
                <div
                  key={reaction}
                  style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  <span style={{ fontSize: 28 }}>{REACTION_EMOJI[reaction] || reaction}</span>
                  <span style={{ fontSize: 22, fontWeight: 700, color: '#d1d5db' }}>
                    {count}
                  </span>
                </div>
              ))}
              {(commentCount ?? 0) > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                  <span style={{ fontSize: 22 }}>{'\uD83D\uDCAC'}</span>
                  <span style={{ fontSize: 20, fontWeight: 600, color: '#9ca3af' }}>
                    {commentCount} comments
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom brand bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '24px 56px',
            background: 'rgba(255,255,255,0.02)',
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {/* NR Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 44,
                height: 44,
                borderRadius: 10,
                background: `linear-gradient(135deg, ${NEPAL_RED} 0%, ${NEPAL_BLUE} 100%)`,
              }}
            >
              <span style={{ fontSize: 16, fontWeight: 900, color: '#ffffff' }}>NR</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex' }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#ffffff' }}>Nepal</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: NEPAL_RED }}>Republic</span>
              </div>
              <span style={{ fontSize: 10, color: '#6b7280', letterSpacing: 1.5 }}>
                AI CIVIC INTELLIGENCE
              </span>
            </div>
          </div>

          {/* URL */}
          <span style={{ fontSize: 18, fontWeight: 600, color: '#6b7280' }}>
            nepalrepublic.org/corruption/{slug}
          </span>
        </div>

        {/* Bottom accent */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 5,
            background: `linear-gradient(90deg, ${NEPAL_RED}, #ef4444, ${NEPAL_RED})`,
            display: 'flex',
          }}
        />
      </div>
    ),
    { width: 1080, height: 1080 },
  );
}
