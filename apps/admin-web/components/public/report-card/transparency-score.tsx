'use client';

import { Shield } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { TransparencyScore } from '@/lib/hooks/use-accountability';

interface TransparencyScoreProps {
  score: TransparencyScore;
}

const SUB_SCORES = [
  { key: 'sourceHealth', color: '#10b981', labelKey: 'accountability.sourceHealth' },
  { key: 'govPortalStatus', color: '#3b82f6', labelKey: 'accountability.govPortalStatus' },
  { key: 'dataFreshness', color: '#8b5cf6', labelKey: 'accountability.dataFreshness' },
  { key: 'promiseCoverage', color: '#f59e0b', labelKey: 'accountability.promiseCoverage' },
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

export function TransparencyScoreSection({ score }: TransparencyScoreProps) {
  const { t } = useI18n();

  const scoreColor = getScoreColor(score.overall);
  const grade = getGradeConfig(score.overall);

  // SVG ring
  const size = 160;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score.overall / 100) * circumference;
  const dashOffset = circumference - progress;

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-2 mb-5">
        <Shield className="w-5 h-5 text-primary-400" />
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          {t('accountability.transparencyScore')}
        </h3>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Ring */}
        <div className="relative flex-shrink-0">
          <svg width={size} height={size} className="transform -rotate-90">
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
            <span className="text-4xl font-bold text-white">{score.overall}</span>
            <span className="text-xs text-gray-500">/100</span>
          </div>
        </div>

        {/* Grade + Sub-scores */}
        <div className="flex-1 w-full">
          {/* Grade badge */}
          <div className="flex items-center gap-2 mb-4">
            <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold ${grade.bg} ${grade.text}`}>
              {grade.letter} — {t(grade.labelKey)}
            </span>
          </div>

          {/* Sub-scores */}
          <div className="space-y-2.5">
            {SUB_SCORES.map(({ key, color, labelKey }) => {
              const value = score[key];
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-[10px] text-gray-500 w-32 truncate uppercase tracking-wider">
                    {t(labelKey)}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: `${value}%`,
                        backgroundColor: color,
                        boxShadow: `0 0 6px ${color}40`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-400 w-8 text-right tabular-nums">
                    {value}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
