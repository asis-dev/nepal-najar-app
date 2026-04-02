import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Nepal flag colors
const NEPAL_RED = '#DC143C';
const NEPAL_BLUE = '#003893';
const BELL_GOLD = '#D9A441';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const title = searchParams.get('title') || 'Track promises. Report reality. Verify truth.';
  const subtitle = searchParams.get('subtitle') || 'AI-powered civic intelligence for Nepal';
  const progress = searchParams.get('progress');
  const status = searchParams.get('status');
  const section = searchParams.get('section'); // commitments, complaints, corruption, report, proposals

  // Section-specific taglines
  const tagline = section === 'complaints'
    ? 'Report it. Route it. Resolve it.'
    : section === 'corruption'
    ? 'Follow the money. Expose the truth.'
    : section === 'report'
    ? 'AI-scored government accountability.'
    : section === 'proposals'
    ? 'Propose. Vote. Build.'
    : 'AI-powered civic intelligence for Nepal.';

  // Status colors
  const statusColor =
    status === 'in_progress' ? '#22d3ee'
    : status === 'delivered' ? '#10b981'
    : status === 'stalled' ? '#ef4444'
    : status === 'not_started' ? '#9ca3af'
    : '#60a5fa';

  const statusLabel =
    status === 'in_progress' ? 'IN PROGRESS'
    : status === 'delivered' ? 'DELIVERED'
    : status === 'stalled' ? 'STALLED'
    : status === 'not_started' ? 'NOT STARTED'
    : status ? status.toUpperCase().replace(/_/g, ' ')
    : null;

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
          background: `linear-gradient(145deg, #0a0a12 0%, ${NEPAL_BLUE}22 40%, ${NEPAL_RED}18 70%, #0a0a12 100%)`,
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
        }}
      >
        {/* Top accent line — Nepal flag gradient */}
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

        {/* Background glow */}
        <div
          style={{
            position: 'absolute',
            top: '-80px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${NEPAL_RED}20 0%, transparent 70%)`,
          }}
        />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '50px 60px',
            position: 'relative',
            zIndex: 10,
          }}
        >
          {/* Bell icon + brand */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '28px',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: `linear-gradient(135deg, ${NEPAL_RED}, ${NEPAL_BLUE})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: '24px' }}>🔔</span>
            </div>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 700,
                letterSpacing: '0.25em',
                textTransform: 'uppercase',
                color: BELL_GOLD,
              }}
            >
              NEPAL REPUBLIC
            </div>
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: title.length > 60 ? '36px' : '46px',
              fontWeight: 800,
              color: 'white',
              lineHeight: 1.15,
              maxWidth: '900px',
              marginBottom: '16px',
            }}
          >
            {title}
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: '20px',
              color: 'rgba(255,255,255,0.5)',
              maxWidth: '700px',
              lineHeight: 1.4,
            }}
          >
            {subtitle}
          </div>

          {/* Progress bar (if provided) */}
          {progress && (
            <div
              style={{
                marginTop: '36px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <div
                style={{
                  width: '280px',
                  height: '14px',
                  borderRadius: '7px',
                  background: 'rgba(255,255,255,0.08)',
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div
                  style={{
                    width: `${Math.min(100, Number(progress))}%`,
                    height: '100%',
                    borderRadius: '7px',
                    background: Number(progress) < 20
                      ? `linear-gradient(90deg, ${NEPAL_RED}, #ef4444)`
                      : Number(progress) >= 80
                      ? 'linear-gradient(90deg, #10b981, #34d399)'
                      : `linear-gradient(90deg, ${NEPAL_BLUE}, #3b82f6)`,
                    boxShadow: `0 0 12px ${Number(progress) < 20 ? NEPAL_RED : NEPAL_BLUE}80`,
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: '30px',
                  fontWeight: 800,
                  color: statusColor,
                }}
              >
                {progress}%
              </span>
            </div>
          )}

          {/* Status badge */}
          {statusLabel && (
            <div
              style={{
                marginTop: '20px',
                padding: '8px 24px',
                borderRadius: '100px',
                background: `${statusColor}20`,
                border: `1px solid ${statusColor}40`,
                color: statusColor,
                fontSize: '14px',
                fontWeight: 700,
                letterSpacing: '0.15em',
              }}
            >
              {statusLabel}
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            position: 'absolute',
            bottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'rgba(255,255,255,0.35)',
            fontSize: '14px',
          }}
        >
          <span style={{ color: BELL_GOLD }}>nepalrepublic.org</span>
          <span>·</span>
          <span>{tagline}</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
