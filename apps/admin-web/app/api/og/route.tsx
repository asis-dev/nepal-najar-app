import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const title = searchParams.get('title') || 'Nepal Najar';
  const subtitle = searchParams.get('subtitle') || "Nepal's national report card, in public view";
  const progress = searchParams.get('progress');
  const status = searchParams.get('status');

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
          background: 'linear-gradient(135deg, #0a0e1a 0%, #0f1629 50%, #0a0e1a 100%)',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
        }}
      >
        {/* Ambient glow */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)',
          }}
        />

        {/* Bottom glow */}
        <div
          style={{
            position: 'absolute',
            bottom: '-100px',
            right: '20%',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)',
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
            padding: '60px',
            position: 'relative',
            zIndex: 10,
          }}
        >
          {/* Mountain icon */}
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(6,182,212,0.2))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '30px',
              boxShadow: '0 0 40px rgba(59,130,246,0.3)',
            }}
          >
            <span style={{ fontSize: '40px' }}>🏔️</span>
          </div>

          {/* Brand */}
          <div
            style={{
              fontSize: '20px',
              fontWeight: 700,
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: '#60a5fa',
              marginBottom: '16px',
            }}
          >
            NEPAL NAJAR
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: '48px',
              fontWeight: 800,
              color: 'white',
              lineHeight: 1.2,
              maxWidth: '900px',
              marginBottom: '16px',
            }}
          >
            {title}
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: '22px',
              color: 'rgba(255,255,255,0.5)',
              maxWidth: '700px',
            }}
          >
            {subtitle}
          </div>

          {/* Progress bar (if provided) */}
          {progress && (
            <div
              style={{
                marginTop: '40px',
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
              }}
            >
              <div
                style={{
                  width: '300px',
                  height: '12px',
                  borderRadius: '6px',
                  background: 'rgba(255,255,255,0.1)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${progress}%`,
                    height: '100%',
                    borderRadius: '6px',
                    background: 'linear-gradient(90deg, #2563eb, #06b6d4)',
                    boxShadow: '0 0 15px rgba(59,130,246,0.5)',
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: '28px',
                  fontWeight: 700,
                  color: '#22d3ee',
                }}
              >
                {progress}%
              </span>
            </div>
          )}

          {/* Status badge (if provided) */}
          {status && (
            <div
              style={{
                marginTop: '24px',
                padding: '8px 24px',
                borderRadius: '100px',
                background:
                  status === 'active'
                    ? 'rgba(16,185,129,0.2)'
                    : status === 'completed'
                      ? 'rgba(59,130,246,0.2)'
                      : status === 'suspended'
                        ? 'rgba(245,158,11,0.2)'
                        : 'rgba(156,163,175,0.2)',
                color:
                  status === 'active'
                    ? '#6ee7b7'
                    : status === 'completed'
                      ? '#93c5fd'
                      : status === 'suspended'
                        ? '#fcd34d'
                        : '#d1d5db',
                fontSize: '16px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              {status}
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            position: 'absolute',
            bottom: '30px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'rgba(255,255,255,0.3)',
            fontSize: '14px',
          }}
        >
          <span>nepalnajar.com</span>
          <span>·</span>
          <span>Nepal&apos;s national report card</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
