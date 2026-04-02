import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Nepal flag colors
const NEPAL_RED = '#DC143C';
const NEPAL_BLUE = '#003893';
const BELL_GOLD = '#D9A441';

// Section-specific accent colors & emoji
const SECTION_THEMES: Record<string, { accent: string; emoji: string; label: string; tagline: string }> = {
  commitments: { accent: '#22d3ee', emoji: '📊', label: 'COMMITMENT TRACKER', tagline: 'Tracking government promises with AI-backed evidence' },
  corruption:  { accent: '#ef4444', emoji: '🔍', label: 'CORRUPTION WATCH',  tagline: 'Follow the money. Expose the truth.' },
  complaints:  { accent: '#f59e0b', emoji: '📢', label: 'CIVIC COMPLAINTS',  tagline: 'Report it. Route it. Resolve it.' },
  report:      { accent: '#8b5cf6', emoji: '📋', label: 'REPORT CARD',       tagline: 'AI-scored government accountability' },
  proposals:   { accent: '#10b981', emoji: '💡', label: 'PROPOSALS',         tagline: 'Propose. Vote. Build.' },
  ministers:   { accent: '#3b82f6', emoji: '👤', label: 'MINISTER PROFILE',  tagline: 'Tracking ministerial activity & commitments' },
  articles:    { accent: '#60a5fa', emoji: '📰', label: 'NEWS INTELLIGENCE', tagline: 'AI-verified news coverage of government activity' },
  stories:     { accent: '#d946ef', emoji: '📡', label: 'DAILY BRIEF',      tagline: 'AI-curated daily intelligence on Nepal' },
  scorecard:   { accent: '#8b5cf6', emoji: '📊', label: 'SCORECARD',        tagline: 'AI-scored government accountability' },
};

const DEFAULT_THEME = { accent: '#22d3ee', emoji: '🔔', label: '', tagline: 'AI-powered civic intelligence for Nepal' };

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const title = searchParams.get('title') || 'Track promises. Report reality. Verify truth.';
  const subtitle = searchParams.get('subtitle') || '';
  const progress = searchParams.get('progress');
  const status = searchParams.get('status');
  const section = searchParams.get('section');

  const theme = (section && SECTION_THEMES[section]) || DEFAULT_THEME;
  const isGeneric = !searchParams.get('title'); // no specific page content

  // Status colors & labels
  const statusColor =
    status === 'in_progress' ? '#22d3ee'
    : status === 'delivered' ? '#10b981'
    : status === 'stalled' ? '#ef4444'
    : status === 'not_started' ? '#6b7280'
    // Corruption statuses
    : status === 'alleged' ? '#f59e0b'
    : status === 'under_investigation' ? '#f97316'
    : status === 'charged' ? '#ef4444'
    : status === 'convicted' ? '#dc2626'
    : status === 'acquitted' ? '#10b981'
    : '#60a5fa';

  const statusLabel =
    status === 'in_progress' ? 'IN PROGRESS'
    : status === 'delivered' ? '✅ DELIVERED'
    : status === 'stalled' ? '⚠️ STALLED'
    : status === 'not_started' ? 'NOT STARTED'
    : status === 'alleged' ? 'ALLEGED'
    : status === 'under_investigation' ? 'UNDER INVESTIGATION'
    : status === 'charged' ? 'CHARGED'
    : status === 'convicted' ? 'CONVICTED'
    : status === 'acquitted' ? 'ACQUITTED'
    : status ? status.toUpperCase().replace(/_/g, ' ')
    : null;

  const progressNum = progress ? Math.min(100, Number(progress)) : 0;

  // Background gradient changes per section
  const bgGradient = section === 'corruption'
    ? `linear-gradient(145deg, #0a0808 0%, #1a0505 30%, ${NEPAL_RED}15 60%, #0a0808 100%)`
    : section === 'commitments'
    ? `linear-gradient(145deg, #080a12 0%, ${NEPAL_BLUE}18 40%, #06b6d415 70%, #080a12 100%)`
    : section === 'ministers'
    ? `linear-gradient(145deg, #080a12 0%, ${NEPAL_BLUE}20 50%, #080a12 100%)`
    : `linear-gradient(145deg, #0a0a12 0%, ${NEPAL_BLUE}15 40%, ${NEPAL_RED}10 70%, #0a0a12 100%)`;

  // Progress bar gradient
  const progressGradient = progressNum < 20
    ? `linear-gradient(90deg, ${NEPAL_RED}, #ef4444)`
    : progressNum >= 80
    ? 'linear-gradient(90deg, #059669, #10b981)'
    : progressNum >= 50
    ? 'linear-gradient(90deg, #2563eb, #06b6d4)'
    : `linear-gradient(90deg, ${NEPAL_BLUE}, #3b82f6)`;

  // Determine font sizes based on title length
  const titleSize = title.length > 80 ? 32 : title.length > 50 ? 38 : 46;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: bgGradient,
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Top accent line — Nepal flag gradient */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '6px',
            background: `linear-gradient(90deg, ${NEPAL_RED}, ${BELL_GOLD}, ${NEPAL_BLUE})`,
          }}
        />

        {/* Large decorative accent circle */}
        <div
          style={{
            position: 'absolute',
            top: '-200px',
            right: '-100px',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${theme.accent}12 0%, transparent 70%)`,
          }}
        />

        {/* Small decorative dots pattern (top-right) */}
        <div
          style={{
            position: 'absolute',
            top: '40px',
            right: '50px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            opacity: 0.15,
          }}
        >
          {[0, 1, 2].map((row) => (
            <div key={row} style={{ display: 'flex', gap: '8px' }}>
              {[0, 1, 2, 3].map((col) => (
                <div
                  key={col}
                  style={{
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    background: theme.accent,
                  }}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Main content area — left-aligned for more editorial feel */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            flex: 1,
            padding: '60px 70px',
            position: 'relative',
            zIndex: 10,
          }}
        >
          {/* Section label pill */}
          {theme.label && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '20px',
              }}
            >
              <span style={{ fontSize: '18px' }}>{theme.emoji}</span>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.2em',
                  color: theme.accent,
                  padding: '4px 14px',
                  borderRadius: '100px',
                  background: `${theme.accent}15`,
                  border: `1px solid ${theme.accent}30`,
                }}
              >
                {theme.label}
              </span>
            </div>
          )}

          {/* Title — large, bold, left-aligned */}
          <div
            style={{
              fontSize: `${titleSize}px`,
              fontWeight: 800,
              color: 'white',
              lineHeight: 1.2,
              maxWidth: '950px',
              letterSpacing: '-0.02em',
            }}
          >
            {title}
          </div>

          {/* Subtitle — metadata line */}
          {subtitle && (
            <div
              style={{
                marginTop: '16px',
                fontSize: '18px',
                color: 'rgba(255,255,255,0.55)',
                lineHeight: 1.5,
                maxWidth: '800px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {subtitle}
            </div>
          )}

          {/* Progress bar + percentage (for commitments) */}
          {progress && (
            <div
              style={{
                marginTop: '32px',
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
              }}
            >
              {/* Big percentage number */}
              <div
                style={{
                  fontSize: '56px',
                  fontWeight: 800,
                  color: statusColor,
                  lineHeight: 1,
                  letterSpacing: '-0.03em',
                }}
              >
                {progress}%
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  flex: 1,
                  maxWidth: '400px',
                }}
              >
                {/* Progress bar */}
                <div
                  style={{
                    width: '100%',
                    height: '16px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.06)',
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div
                    style={{
                      width: `${progressNum}%`,
                      height: '100%',
                      borderRadius: '8px',
                      background: progressGradient,
                      boxShadow: `0 0 20px ${statusColor}50`,
                    }}
                  />
                </div>
                {/* Status label under progress bar */}
                {statusLabel && (
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.15em',
                      color: statusColor,
                    }}
                  >
                    {statusLabel}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Status badge (when no progress bar) */}
          {statusLabel && !progress && (
            <div
              style={{
                marginTop: '24px',
                display: 'flex',
              }}
            >
              <div
                style={{
                  padding: '8px 20px',
                  borderRadius: '100px',
                  background: `${statusColor}18`,
                  border: `1.5px solid ${statusColor}35`,
                  color: statusColor,
                  fontSize: '13px',
                  fontWeight: 700,
                  letterSpacing: '0.15em',
                }}
              >
                {statusLabel}
              </div>
            </div>
          )}
        </div>

        {/* Bottom bar — brand + tagline */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 70px 28px',
            position: 'relative',
            zIndex: 10,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            {/* Bell icon */}
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: `linear-gradient(135deg, ${NEPAL_RED}, ${NEPAL_BLUE})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: '16px' }}>🔔</span>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  letterSpacing: '0.15em',
                  color: BELL_GOLD,
                }}
              >
                NEPAL REPUBLIC
              </span>
              <span
                style={{
                  fontSize: '11px',
                  color: 'rgba(255,255,255,0.35)',
                  letterSpacing: '0.05em',
                }}
              >
                nepalrepublic.org
              </span>
            </div>
          </div>

          <div
            style={{
              fontSize: '13px',
              color: 'rgba(255,255,255,0.3)',
              maxWidth: '400px',
              textAlign: 'right',
            }}
          >
            {theme.tagline}
          </div>
        </div>

        {/* Bottom accent line */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: `linear-gradient(90deg, ${NEPAL_RED}80, ${BELL_GOLD}60, ${NEPAL_BLUE}80)`,
          }}
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
