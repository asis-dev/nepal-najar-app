import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

const NEPAL_RED = '#DC143C';
const NEPAL_BLUE = '#003893';
const BELL_GOLD = '#D9A441';

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
  dashboard:   { accent: '#22d3ee', emoji: '🇳🇵', label: 'LIVE DASHBOARD',   tagline: 'AI-powered civic intelligence for Nepal' },
};

const DEFAULT_THEME = { accent: '#22d3ee', emoji: '🔔', label: '', tagline: 'AI-powered civic intelligence for Nepal' };

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const title = searchParams.get('title') || 'Nepal Republic';
  const subtitle = searchParams.get('subtitle') || '';
  const progress = searchParams.get('progress');
  const status = searchParams.get('status');
  const section = searchParams.get('section');
  const stats = searchParams.get('stats'); // e.g. "109 commitments|435 corruption cases|80+ sources"

  const theme = (section && SECTION_THEMES[section]) || DEFAULT_THEME;
  const isDefault = !searchParams.get('title');

  // Status colors
  const statusColor =
    status === 'in_progress' ? '#22d3ee'
    : status === 'delivered' ? '#10b981'
    : status === 'stalled' ? '#ef4444'
    : status === 'not_started' ? '#6b7280'
    : status === 'alleged' ? '#f59e0b'
    : status === 'under_investigation' ? '#f97316'
    : status === 'charged' ? '#ef4444'
    : status === 'convicted' ? '#dc2626'
    : status === 'acquitted' ? '#10b981'
    : '#60a5fa';

  const statusLabel =
    status === 'in_progress' ? 'IN PROGRESS'
    : status === 'delivered' ? 'DELIVERED'
    : status === 'stalled' ? 'STALLED'
    : status === 'not_started' ? 'NOT STARTED'
    : status === 'alleged' ? 'ALLEGED'
    : status === 'under_investigation' ? 'UNDER INVESTIGATION'
    : status === 'charged' ? 'CHARGED'
    : status === 'convicted' ? 'CONVICTED'
    : status === 'acquitted' ? 'ACQUITTED'
    : status ? status.toUpperCase().replace(/_/g, ' ')
    : null;

  const progressNum = progress ? Math.min(100, Number(progress)) : 0;

  const bgGradient = section === 'corruption'
    ? `linear-gradient(160deg, #0c0506 0%, #1c0808 30%, #2a0a0a 60%, #0c0506 100%)`
    : section === 'commitments'
    ? `linear-gradient(160deg, #060810 0%, #0a1020 40%, #081018 70%, #060810 100%)`
    : section === 'ministers'
    ? `linear-gradient(160deg, #060810 0%, #0c1428 50%, #060810 100%)`
    : `linear-gradient(160deg, #08080f 0%, #0c1020 40%, #100a14 70%, #08080f 100%)`;

  const titleSize = title.length > 80 ? 30 : title.length > 50 ? 36 : 44;

  // Parse stats into items
  const statItems = stats ? stats.split('|').slice(0, 4) : [];

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: bgGradient,
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '5px',
            background: `linear-gradient(90deg, ${NEPAL_RED}, ${BELL_GOLD}, ${NEPAL_BLUE})`,
          }}
        />

        {/* Subtle glow behind content */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '700px',
            height: '400px',
            borderRadius: '50%',
            background: `radial-gradient(ellipse, ${theme.accent}08 0%, transparent 70%)`,
          }}
        />

        {/* Main centered content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '50px 80px',
            maxWidth: '1100px',
          }}
        >
          {/* Brand + section label row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '24px',
            }}
          >
            {/* Bell logo */}
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: `linear-gradient(135deg, ${NEPAL_RED}, ${NEPAL_BLUE})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: '18px' }}>🔔</span>
            </div>
            <span
              style={{
                fontSize: '14px',
                fontWeight: 700,
                letterSpacing: '0.2em',
                color: BELL_GOLD,
              }}
            >
              NEPAL REPUBLIC
            </span>
            {/* Section pill */}
            {theme.label ? (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.15em',
                  color: theme.accent,
                  padding: '3px 12px',
                  borderRadius: '100px',
                  background: `${theme.accent}15`,
                  border: `1px solid ${theme.accent}30`,
                  marginLeft: '4px',
                }}
              >
                {theme.label}
              </span>
            ) : null}
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: `${titleSize}px`,
              fontWeight: 800,
              color: 'white',
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
              marginBottom: subtitle ? '12px' : '0px',
            }}
          >
            {title}
          </div>

          {/* Subtitle */}
          {subtitle ? (
            <div
              style={{
                fontSize: '18px',
                color: 'rgba(255,255,255,0.5)',
                lineHeight: 1.4,
                display: 'flex',
              }}
            >
              {subtitle}
            </div>
          ) : null}

          {/* Progress bar (commitments) */}
          {progress ? (
            <div
              style={{
                marginTop: '28px',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <div
                style={{
                  fontSize: '48px',
                  fontWeight: 800,
                  color: statusColor,
                  display: 'flex',
                }}
              >
                {`${progressNum}%`}
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    width: '280px',
                    height: '12px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(255,255,255,0.08)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      width: `${progressNum}%`,
                      height: '12px',
                      borderRadius: '6px',
                      backgroundColor: statusColor,
                    }}
                  />
                </div>
                <div
                  style={{
                    display: 'flex',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    color: statusColor,
                  }}
                >
                  {statusLabel || 'PROGRESS'}
                </div>
              </div>
            </div>
          ) : null}

          {/* Status badge (when no progress) */}
          {statusLabel && !progress ? (
            <div
              style={{
                marginTop: '20px',
                display: 'flex',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  padding: '6px 20px',
                  borderRadius: '100px',
                  backgroundColor: `${statusColor}18`,
                  border: `1px solid ${statusColor}30`,
                  color: statusColor,
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.15em',
                }}
              >
                {statusLabel}
              </div>
            </div>
          ) : null}

          {/* Stats row (for dashboard shares) */}
          {statItems.length > 0 ? (
            <div
              style={{
                marginTop: '32px',
                display: 'flex',
                flexDirection: 'row',
                gap: '24px',
              }}
            >
              {statItems.map((stat, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '12px 20px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.7)',
                    }}
                  >
                    {stat.trim()}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            position: 'absolute',
            bottom: '22px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'rgba(255,255,255,0.3)',
            fontSize: '13px',
          }}
        >
          <span style={{ color: BELL_GOLD }}>nepalrepublic.org</span>
          <span style={{ display: 'flex' }}>·</span>
          <span style={{ display: 'flex' }}>{theme.tagline}</span>
        </div>

        {/* Bottom accent */}
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
