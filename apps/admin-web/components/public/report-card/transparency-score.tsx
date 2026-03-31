'use client';

import { Shield } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { TransparencyScore } from '@/lib/hooks/use-accountability';

interface TransparencyScoreProps {
  score: TransparencyScore;
  /** Compact horizontal layout for mobile — ring + bars side by side */
  compact?: boolean;
}

const SUB_SCORES = [
  { key: 'sourceHealth', color: '#10b981', labelKey: 'accountability.sourceHealth', explain: 'Are our news sources working?' },
  { key: 'govPortalStatus', color: '#3b82f6', labelKey: 'accountability.govPortalStatus', explain: 'Are government websites accessible?' },
  { key: 'dataFreshness', color: '#8b5cf6', labelKey: 'accountability.dataFreshness', explain: 'How recent is our data?' },
  { key: 'promiseCoverage', color: '#f59e0b', labelKey: 'accountability.promiseCoverage', explain: 'How many promises have evidence?' },
] as const;

function getScoreColor(score: number): string {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#3b82f6';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

function getGradeConfig(score: number): { letter: string; labelKey: string; bg: string; text: string } {
  if (score >= 90) return { letter: 'A+', labelKey: 'accountability.gradeExcellent', bg: 'bg-emerald-500/15', text: 'text-emerald-400' };
  if (score >= 80) return { letter: 'A', labelKey: 'accountability.gradeVeryGood', bg: 'bg-emerald-500/15', text: 'text-emerald-400' };
  if (score >= 70) return { letter: 'B', labelKey: 'accountability.gradeGood', bg: 'bg-blue-500/15', text: 'text-blue-400' };
  if (score >= 60) return { letter: 'C+', labelKey: 'accountability.gradeFair', bg: 'bg-blue-500/15', text: 'text-blue-400' };
  if (score >= 50) return { letter: 'C', labelKey: 'accountability.gradeAverage', bg: 'bg-amber-500/15', text: 'text-amber-400' };
  if (score >= 40) return { letter: 'D', labelKey: 'accountability.gradeBelowAvg', bg: 'bg-amber-500/15', text: 'text-amber-400' };
  return { letter: 'F', labelKey: 'accountability.gradePoor', bg: 'bg-red-500/15', text: 'text-red-400' };
}

export function TransparencyScoreSection({ score, compact = false }: TransparencyScoreProps) {
  const { t } = useI18n();

  const scoreColor = getScoreColor(score.overall);
  const grade = getGradeConfig(score.overall);

  /* ══════════════════════════════════════════════
     COMPACT — mobile: small ring + thin bars inline
     ══════════════════════════════════════════════ */
  if (compact) {
    const s = 64;
    const w = 5;
    const r = (s - w) / 2;
    const c = 2 * Math.PI * r;
    const d = c - (score.overall / 100) * c;

    return (
      <div className="glass-card p-2.5">
        <div className="flex items-center gap-3">
          {/* Mini ring */}
          <div className="relative flex-shrink-0" style={{ width: s, height: s }}>
            <svg viewBox={`0 0 ${s} ${s}`} className="w-full h-full -rotate-90">
              <circle cx={s / 2} cy={s / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={w} />
              <circle cx={s / 2} cy={s / 2} r={r} fill="none" stroke={scoreColor} strokeWidth={w} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={d} style={{ transition: 'stroke-dashoffset 1.5s ease-out' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-sm font-bold text-white">{score.overall}</span>
              <span className="text-[7px] text-gray-500 leading-none">/100</span>
            </div>
          </div>

          {/* Grade + thin bars */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`inline-flex rounded px-1.5 py-px text-[9px] font-bold ${grade.bg} ${grade.text}`}>
                {grade.letter}
              </span>
              <span className="text-[9px] text-gray-500">{t(grade.labelKey)}</span>
            </div>
            <div className="space-y-[3px]">
              {SUB_SCORES.map(({ key, color, labelKey }) => (
                <div key={key} className="flex items-center gap-1">
                  <span className="text-[8px] text-gray-500 w-[82px] truncate leading-none">{t(labelKey)}</span>
                  <div className="flex-1 h-[3px] rounded-full bg-white/[0.06] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${score[key]}%`, backgroundColor: color }} />
                  </div>
                  <span className="text-[8px] text-gray-500 w-4 text-right tabular-nums leading-none">{score[key]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════
     FULL — desktop: original layout restored exactly
     ══════════════════════════════════════════════ */
  const size = 144;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score.overall / 100) * circumference;
  const dashOffset = circumference - progress;

  return (
    <div className="glass-card p-5 sm:p-6">
      <div className="mb-1 flex items-center gap-2">
        <Shield className="w-5 h-5 text-primary-400" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-300">
          {t('accountability.transparencyScore')}
        </h3>
      </div>
      <p className="text-xs text-gray-500 mb-5">
        How much can we actually verify about government promises?
      </p>

      <div className="grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center">
        <div className="mx-auto w-full max-w-[144px]">
          <div className="relative aspect-square">
          <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90 transform">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={strokeWidth}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={scoreColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{
                transition: 'stroke-dashoffset 1.5s ease-out',
                filter: `drop-shadow(0 0 8px ${scoreColor}40)`,
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-white sm:text-4xl">{score.overall}</span>
            <span className="text-xs text-gray-500">/100</span>
          </div>
        </div>
        </div>

        <div className="w-full min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className={`inline-flex rounded-lg px-3 py-1 text-xs font-bold ${grade.bg} ${grade.text}`}>
              {grade.letter}
            </span>
            <span className="text-sm font-medium text-gray-300">
              {t(grade.labelKey)}
            </span>
          </div>

          <div className="space-y-3">
            {SUB_SCORES.map(({ key, color, labelKey, explain }) => {
              const value = score[key];
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-0.5">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-gray-400">
                        {t(labelKey)}
                      </span>
                      <span className="text-[10px] text-gray-600 ml-2">
                        — {explain}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-gray-400 tabular-nums">
                      {value}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: `${value}%`,
                        backgroundColor: color,
                        boxShadow: `0 0 6px ${color}40`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
