'use client';

import { useEffect, useState } from 'react';

/**
 * Nepal Najar — "The Nation at Dawn, Under Watch"
 *
 * High-altitude civic intelligence background:
 * - Deep navy-black sky base (#07111F)
 * - Dawn horizon glow (crimson → gold)
 * - 3 angular Himalayan mountain silhouettes
 * - Topographic contour lines at very low opacity
 * - Slow-drifting mist between mountain layers
 * - Sparse, still, cold stars
 * - NO moon, aurora, dust, or flashy effects
 */
export function CivicSkyBackground() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Generate deterministic stars (sparse, cold, high-altitude)
  const stars = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: ((i * 37 + 13) % 97) + 1,
    y: ((i * 23 + 7) % 45) + 2,
    size: i % 5 === 0 ? 2 : 1,
    opacity: 0.25 + ((i * 11) % 40) / 100,
  }));

  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      {/* ── Layer 1: Sky gradient ── */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(
            180deg,
            #050510 0%,
            #07111F 15%,
            #0a1628 45%,
            #0f1e35 70%,
            #152a42 85%,
            #1a3350 95%,
            #23364A 100%
          )`,
        }}
      />

      {/* ── Layer 2: Dawn horizon glow ── */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: '18%',
          background: `linear-gradient(
            180deg,
            transparent 0%,
            rgba(220, 20, 60, 0.06) 30%,
            rgba(220, 20, 60, 0.1) 55%,
            rgba(217, 164, 65, 0.08) 75%,
            rgba(217, 164, 65, 0.12) 90%,
            rgba(217, 164, 65, 0.05) 100%
          )`,
        }}
      />
      {/* Focused sunrise point */}
      <div
        className="absolute"
        style={{
          bottom: '12%',
          left: '35%',
          width: '30%',
          height: '8%',
          background: 'radial-gradient(ellipse at center, rgba(217,164,65,0.15) 0%, rgba(220,20,60,0.06) 50%, transparent 80%)',
          filter: 'blur(20px)',
        }}
      />

      {/* ── Layer 3: Topographic contour lines ── */}
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ opacity: 0.025 }}
        preserveAspectRatio="none"
        viewBox="0 0 1200 800"
      >
        <defs>
          <pattern id="contour-lines" x="0" y="0" width="200" height="100" patternUnits="userSpaceOnUse">
            <path
              d="M0,50 Q50,20 100,45 T200,50"
              fill="none"
              stroke="#DDE7F0"
              strokeWidth="0.5"
            />
            <path
              d="M0,70 Q60,40 120,65 T200,70"
              fill="none"
              stroke="#DDE7F0"
              strokeWidth="0.4"
            />
            <path
              d="M0,30 Q40,10 80,28 T200,30"
              fill="none"
              stroke="#DDE7F0"
              strokeWidth="0.3"
            />
          </pattern>
        </defs>
        <rect x="0" y="200" width="1200" height="400" fill="url(#contour-lines)" />
      </svg>

      {/* ── Layer 4: Mountain silhouettes ── */}
      <svg
        className="absolute bottom-0 left-0 w-full"
        style={{ height: '45%' }}
        viewBox="0 0 1440 500"
        preserveAspectRatio="none"
      >
        {/* Far range — faint, tall peaks */}
        <path
          d="M0,320 L80,200 L140,260 L200,150 L280,220 L340,130 L420,190 L480,100 L560,170 L640,90 L700,180 L780,110 L840,200 L920,140 L980,230 L1060,160 L1120,250 L1200,180 L1280,240 L1340,190 L1440,280 L1440,500 L0,500 Z"
          fill="#152535"
          style={{ opacity: mounted ? 1 : 0, transition: 'opacity 2s ease-out' }}
        />

        {/* Mid range — medium peaks */}
        <path
          d="M0,380 L60,320 L120,350 L200,270 L280,330 L360,250 L440,310 L500,230 L580,300 L660,220 L720,290 L800,240 L860,300 L940,260 L1020,320 L1100,270 L1160,330 L1240,280 L1320,340 L1440,300 L1440,500 L0,500 Z"
          fill="#0f1e2e"
          style={{ opacity: mounted ? 1 : 0, transition: 'opacity 1.5s ease-out 0.3s' }}
        />

        {/* Near range — dark, angular foreground */}
        <path
          d="M0,440 L80,400 L160,430 L240,380 L320,420 L400,370 L480,410 L560,360 L640,400 L720,370 L800,410 L880,380 L960,420 L1040,390 L1120,430 L1200,400 L1280,440 L1360,410 L1440,450 L1440,500 L0,500 Z"
          fill="#0a1520"
          style={{ opacity: mounted ? 1 : 0, transition: 'opacity 1s ease-out 0.6s' }}
        />

        {/* Snow caps on far peaks */}
        <defs>
          <linearGradient id="snowCap" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#DDE7F0" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#DDE7F0" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Tallest peaks get snow */}
        <path d="M475,100 L480,100 L500,130 L460,130 Z" fill="url(#snowCap)" />
        <path d="M635,90 L640,90 L660,120 L620,120 Z" fill="url(#snowCap)" />
        <path d="M335,130 L340,130 L360,155 L320,155 Z" fill="url(#snowCap)" />
        <path d="M195,150 L200,150 L218,175 L182,175 Z" fill="url(#snowCap)" />
      </svg>

      {/* ── Layer 5: Mist between mountains ── */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: '25%',
          opacity: mounted ? 1 : 0,
          transition: 'opacity 3s ease-out 1s',
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, transparent 0%, rgba(221,231,240,0.015) 40%, rgba(221,231,240,0.025) 60%, rgba(221,231,240,0.01) 100%)',
            animation: 'mist-drift 45s ease-in-out infinite',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, transparent 0%, rgba(221,231,240,0.01) 50%, rgba(221,231,240,0.02) 70%, transparent 100%)',
            animation: 'mist-drift 55s ease-in-out infinite reverse',
            transform: 'translateX(-10%)',
          }}
        />
      </div>

      {/* ── Layer 6: Stars ── */}
      <div
        className="absolute inset-0"
        style={{ opacity: mounted ? 1 : 0, transition: 'opacity 2s ease-out 0.5s' }}
      >
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute rounded-full"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: star.size,
              height: star.size,
              backgroundColor: '#DDE7F0',
              opacity: star.opacity,
            }}
          />
        ))}
      </div>
    </div>
  );
}
