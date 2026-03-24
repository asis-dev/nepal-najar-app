'use client';

import { useState, useEffect, useRef } from 'react';
import { ShieldCheck } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

type TruthLabel = 'unverified' | 'low' | 'moderate' | 'high' | 'verified';

interface TruthMeterProps {
  score: number; // 0-100
  label: TruthLabel;
  size?: 'sm' | 'md' | 'lg';
  factors?: {
    sourceCredibility: number;
    crossVerification: number;
    evidenceQuality: number;
    communityVerification: number;
  };
}

// ── Config ───────────────────────────────────────────────────────────────────

const LABEL_CONFIG: Record<
  TruthLabel,
  { text: string; color: string; bg: string; border: string; glow: string; barColor: string }
> = {
  unverified: {
    text: 'Unverified',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    glow: 'shadow-red-500/10',
    barColor: '#ef4444',
  },
  low: {
    text: 'Low',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    glow: 'shadow-orange-500/10',
    barColor: '#f97316',
  },
  moderate: {
    text: 'Moderate',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    glow: 'shadow-yellow-500/10',
    barColor: '#eab308',
  },
  high: {
    text: 'High',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    glow: 'shadow-emerald-500/10',
    barColor: '#10b981',
  },
  verified: {
    text: 'Verified',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    glow: 'shadow-blue-500/10',
    barColor: '#3b82f6',
  },
};

const FACTOR_LABELS = [
  { key: 'sourceCredibility' as const, label: 'Source', max: 25 },
  { key: 'crossVerification' as const, label: 'Cross-verified', max: 25 },
  { key: 'evidenceQuality' as const, label: 'Evidence', max: 25 },
  { key: 'communityVerification' as const, label: 'Community', max: 25 },
];

function getBarColor(score: number): string {
  if (score >= 81) return '#3b82f6';
  if (score >= 61) return '#10b981';
  if (score >= 41) return '#eab308';
  if (score >= 21) return '#f97316';
  return '#ef4444';
}

// ── Component ────────────────────────────────────────────────────────────────

export function TruthMeter({ score, label, size = 'md', factors }: TruthMeterProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const config = LABEL_CONFIG[label];
  const barColor = getBarColor(score);

  // Smooth animation on load
  useEffect(() => {
    const duration = 1200;
    const startTime = performance.now();

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(score * eased));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);
  }, [score]);

  // ── Small variant: inline bar only ──────────────────────────────────────
  if (size === 'sm') {
    return (
      <div
        className="inline-flex items-center gap-2 group relative"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div className="w-16 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{
              width: `${animatedScore}%`,
              backgroundColor: barColor,
              boxShadow: `0 0 6px ${barColor}40`,
            }}
          />
        </div>
        <span className={`text-[10px] font-semibold tabular-nums ${config.color}`}>
          {animatedScore}
        </span>

        {/* Tooltip */}
        {showTooltip && factors && (
          <FactorTooltip
            ref={tooltipRef}
            score={animatedScore}
            label={label}
            factors={factors}
          />
        )}
      </div>
    );
  }

  // ── Medium variant: bar with label ──────────────────────────────────────
  if (size === 'md') {
    return (
      <div
        className="relative inline-flex items-center gap-2.5"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <ShieldCheck className={`w-4 h-4 flex-shrink-0 ${config.color}`} />
        <div className="w-20 h-2 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{
              width: `${animatedScore}%`,
              backgroundColor: barColor,
              boxShadow: `0 0 6px ${barColor}40`,
            }}
          />
        </div>
        <span className={`text-xs font-semibold tabular-nums ${config.color}`}>
          {animatedScore}
        </span>
        <span
          className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${config.bg} ${config.color} ${config.border}`}
        >
          {config.text}
        </span>

        {/* Tooltip */}
        {showTooltip && factors && (
          <FactorTooltip
            ref={tooltipRef}
            score={animatedScore}
            label={label}
            factors={factors}
          />
        )}
      </div>
    );
  }

  // ── Large variant: full breakdown visible ───────────────────────────────
  return (
    <div
      className={`rounded-xl border backdrop-blur-md bg-white/[0.03] ${config.border} p-4`}
      style={{ boxShadow: `0 0 20px ${barColor}10` }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className={`w-5 h-5 ${config.color}`} />
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Truth Meter
          </span>
        </div>
        <span
          className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${config.bg} ${config.color} ${config.border}`}
        >
          {config.text}
        </span>
      </div>

      {/* Score bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{
              width: `${animatedScore}%`,
              backgroundColor: barColor,
              boxShadow: `0 0 8px ${barColor}60`,
            }}
          />
        </div>
        <span className={`text-lg font-bold tabular-nums ${config.color}`}>
          {animatedScore}
        </span>
        <span className="text-xs text-gray-600">/100</span>
      </div>

      {/* Factor breakdown */}
      {factors && (
        <div className="space-y-2">
          {FACTOR_LABELS.map(({ key, label: factorLabel, max }) => {
            const value = factors[key];
            const pct = (value / max) * 100;
            return (
              <div key={key} className="flex items-center gap-3">
                <span className="text-[10px] text-gray-500 w-24 truncate uppercase tracking-wider">
                  {factorLabel}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: barColor,
                      opacity: 0.7 + (pct / 100) * 0.3,
                    }}
                  />
                </div>
                <span className="text-[10px] font-medium text-gray-400 w-10 text-right tabular-nums">
                  {value}/{max}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Tooltip for sm/md variants ───────────────────────────────────────────────

import { forwardRef } from 'react';

const FactorTooltip = forwardRef<
  HTMLDivElement,
  {
    score: number;
    label: TruthLabel;
    factors: NonNullable<TruthMeterProps['factors']>;
  }
>(function FactorTooltip({ score, label, factors }, ref) {
  const config = LABEL_CONFIG[label];
  const barColor = getBarColor(score);

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-56 p-3 rounded-lg border backdrop-blur-xl bg-gray-900/95 border-white/10 shadow-xl"
    >
      {/* Title */}
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          Truth Score
        </span>
        <span className={`text-xs font-bold ${config.color}`}>{score}/100</span>
      </div>

      {/* Factors */}
      <div className="space-y-1.5">
        {FACTOR_LABELS.map(({ key, label: factorLabel, max }) => {
          const value = factors[key];
          const pct = (value / max) * 100;
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="text-[9px] text-gray-500 w-20 truncate">
                {factorLabel}
              </span>
              <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: barColor,
                  }}
                />
              </div>
              <span className="text-[9px] text-gray-500 w-7 text-right tabular-nums">
                {value}
              </span>
            </div>
          );
        })}
      </div>

      {/* Arrow */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gray-900/95" />
    </div>
  );
});
