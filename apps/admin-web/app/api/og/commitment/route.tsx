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
    case 'in_progress':
      return { color: '#22d3ee', label: 'IN PROGRESS' };
    case 'delivered':
      return { color: '#10b981', label: 'DELIVERED' };
    case 'stalled':
      return { color: '#ef4444', label: 'STALLED' };
    case 'not_started':
    default:
      return { color: '#9ca3af', label: 'NOT STARTED' };
  }
}

/**
 * Build an SVG path for a circular arc segment.
 * cx, cy = center; r = radius; startDeg / endDeg in degrees (0 = top).
 */
function describeArc(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
): string {
  const toRad = (d: number) => ((d - 90) * Math.PI) / 180;
  const x1 = cx + r * Math.cos(toRad(startDeg));
  const y1 = cy + r * Math.sin(toRad(startDeg));
  const x2 = cx + r * Math.cos(toRad(endDeg));
  const y2 = cy + r * Math.sin(toRad(endDeg));
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const id = searchParams.get('id');
  const lang = searchParams.get('lang') || 'en';

  // Look up commitment by slug first, then by ID
  const commitment = id
    ? getPromiseBySlug(id) || getPromiseById(id)
    : null;

  // If not found, return a generic branded card
  if (!commitment) {
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
            background: `linear-gradient(145deg, ${BG_DARK} 0%, ${NEPAL_BLUE}22 40%, ${NEPAL_RED}18 70%, ${BG_DARK} 100%)`,
            fontFamily: 'system-ui, sans-serif',
            position: 'relative',
          }}
        >
          {/* Top accent line */}
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
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '24px',
            }}
          >
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '20px',
                background: `linear-gradient(135deg, ${NEPAL_RED}, ${NEPAL_BLUE})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: '48px' }}>🔔</span>
            </div>
            <div
              style={{
                fontSize: '42px',
                fontWeight: 800,
                letterSpacing: '0.2em',
                color: BELL_GOLD,
              }}
            >
              NEPAL REPUBLIC
            </div>
            <div
              style={{
                fontSize: '24px',
                color: 'rgba(255,255,255,0.5)',
              }}
            >
              Track promises. Report reality.
            </div>
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: '36px',
              color: 'rgba(255,255,255,0.35)',
              fontSize: '18px',
              display: 'flex',
            }}
          >
            nepalrepublic.org
          </div>
        </div>
      ),
      {
        width: 1080,
        height: 1080,
        headers: {
          'Cache-Control': 'public, max-age=3600',
        },
      },
    );
  }

  const title =
    lang === 'ne' && commitment.title_ne
      ? commitment.title_ne
      : commitment.title;
  const progress = commitment.progress;
  const { color: statusColor, label: statusLabel } = getStatusConfig(
    commitment.status,
  );
  const category =
    lang === 'ne' && commitment.category_ne
      ? commitment.category_ne
      : commitment.category;

  // Circular arc SVG parameters
  const arcCx = 150;
  const arcCy = 150;
  const arcR = 120;
  const trackWidth = 16;
  const progressAngle = Math.max(1, (progress / 100) * 360);

  // Choose arc color based on progress
  const arcColor =
    progress >= 80
      ? '#10b981'
      : progress >= 40
        ? '#3b82f6'
        : progress >= 20
          ? '#f59e0b'
          : '#ef4444';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: `linear-gradient(160deg, ${BG_DARK} 0%, #0d1225 30%, ${NEPAL_BLUE}15 60%, ${NEPAL_RED}10 85%, ${BG_DARK} 100%)`,
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
          padding: '0',
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

        {/* Background glow */}
        <div
          style={{
            position: 'absolute',
            top: '200px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${NEPAL_RED}12 0%, transparent 70%)`,
          }}
        />

        {/* ─── Header: Brand ─── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            marginTop: '56px',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: `linear-gradient(135deg, ${NEPAL_RED}, ${NEPAL_BLUE})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: '28px' }}>🔔</span>
          </div>
          <div
            style={{
              fontSize: '20px',
              fontWeight: 700,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: BELL_GOLD,
            }}
          >
            NEPAL REPUBLIC
          </div>
        </div>

        {/* ─── Middle: Circular Progress + Title ─── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '40px',
            padding: '0 60px',
          }}
        >
          {/* Circular progress ring */}
          <div
            style={{
              width: '300px',
              height: '300px',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="300"
              height="300"
              viewBox="0 0 300 300"
              style={{ position: 'absolute', top: 0, left: 0 }}
            >
              {/* Background track */}
              <circle
                cx={arcCx}
                cy={arcCy}
                r={arcR}
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={trackWidth}
              />
              {/* Progress arc */}
              {progress > 0 && (
                <path
                  d={describeArc(arcCx, arcCy, arcR, 0, progressAngle)}
                  fill="none"
                  stroke={arcColor}
                  strokeWidth={trackWidth}
                  strokeLinecap="round"
                />
              )}
            </svg>
            {/* Center text */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '72px',
                  fontWeight: 900,
                  color: arcColor,
                  lineHeight: 1,
                }}
              >
                {progress}%
              </div>
              <div
                style={{
                  fontSize: '16px',
                  color: 'rgba(255,255,255,0.4)',
                  marginTop: '4px',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                progress
              </div>
            </div>
          </div>

          {/* Commitment title */}
          <div
            style={{
              fontSize: title.length > 80 ? '30px' : title.length > 50 ? '36px' : '42px',
              fontWeight: 800,
              color: 'white',
              lineHeight: 1.2,
              textAlign: 'center',
              maxWidth: '900px',
            }}
          >
            {title}
          </div>

          {/* Status badge + category */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            {/* Status badge */}
            <div
              style={{
                padding: '10px 28px',
                borderRadius: '100px',
                background: `${statusColor}20`,
                border: `2px solid ${statusColor}50`,
                color: statusColor,
                fontSize: '16px',
                fontWeight: 700,
                letterSpacing: '0.15em',
              }}
            >
              {statusLabel}
            </div>
            {/* Category */}
            <div
              style={{
                padding: '10px 28px',
                borderRadius: '100px',
                background: 'rgba(255,255,255,0.06)',
                border: '2px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.6)',
                fontSize: '16px',
                fontWeight: 600,
                letterSpacing: '0.05em',
              }}
            >
              {category}
            </div>
          </div>
        </div>

        {/* ─── Footer ─── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '44px',
            fontSize: '18px',
          }}
        >
          <span style={{ color: BELL_GOLD, fontWeight: 700 }}>
            nepalrepublic.org
          </span>
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>
            Track promises. Report reality.
          </span>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1080,
      headers: {
        'Cache-Control': 'public, max-age=3600',
      },
    },
  );
}
