'use client';

import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import {
  computeNajarIndex,
  GRADE_LABELS,
  GRADE_COLORS,
  type NajarIndex,
} from '@/lib/data/najar-index';

interface NajarIndexDialProps {
  variant?: 'full' | 'compact';
}

const SUB_SCORE_KEYS = [
  'deliveryRate',
  'avgProgress',
  'trustScore',
  'budgetUtilization',
  'citizenSentiment',
] as const;

const SUB_SCORE_COLORS = {
  deliveryRate: '#10b981',
  avgProgress: '#3b82f6',
  trustScore: '#8b5cf6',
  budgetUtilization: '#f59e0b',
  citizenSentiment: '#06b6d4',
};

function getScoreColor(score: number): string {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#3b82f6';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

export function NajarIndexDial({ variant = 'full' }: NajarIndexDialProps) {
  const { t, locale } = useI18n();
  const isNe = locale === 'ne';

  const index: NajarIndex = useMemo(() => computeNajarIndex(), []);

  // Data confidence gate — show "insufficient data" instead of misleading score
  if (index.dataConfidence === 'insufficient') {
    return (
      <div className="glass-card p-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
            {isNe ? 'नजर सूचकांक' : 'Najar Index'}
          </h3>
          <span className="text-[8px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400/80 border border-amber-500/20">
            Beta
          </span>
        </div>
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <p className="text-sm text-gray-400 mb-1">
            {isNe ? 'अपर्याप्त प्रमाणित डाटा' : 'Insufficient Verified Data'}
          </p>
          <p className="text-xs text-gray-600">
            {isNe
              ? `${index.verifiedDataPoints}/5 प्रमाणित डाटा बिन्दुहरू — स्कोर अर्थपूर्ण हुन कम्तिमा ५ चाहिन्छ`
              : `${index.verifiedDataPoints}/5 verified data points — need at least 5 for a meaningful score`}
          </p>
        </div>
      </div>
    );
  }

  const gradeStyle = GRADE_COLORS[index.grade];
  const gradeLabel = isNe ? GRADE_LABELS[index.grade].ne : GRADE_LABELS[index.grade].en;
  const scoreColor = getScoreColor(index.score);

  // SVG ring calculations
  const size = variant === 'compact' ? 120 : 160;
  const strokeWidth = variant === 'compact' ? 8 : 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (index.score / 100) * circumference;
  const dashOffset = circumference - progress;

  const ChangeIcon = index.change > 0 ? TrendingUp : index.change < 0 ? TrendingDown : Minus;
  const changeColor = index.change > 0 ? 'text-emerald-400' : index.change < 0 ? 'text-red-400' : 'text-gray-400';

  if (variant === 'compact') {
    return (
      <div className="glass-card p-4 flex items-center gap-4">
        {/* Mini ring */}
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
              style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-white">{index.score}</span>
            <span className="text-[9px] text-gray-500 uppercase tracking-wider">/100</span>
          </div>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 uppercase tracking-wider mb-0.5">
            {t('najarIndex.title')}
            <span className="text-[7px] font-semibold px-1 py-px rounded bg-amber-500/15 text-amber-400/80 border border-amber-500/20">β</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${gradeStyle.bg} ${gradeStyle.text}`}>
              {index.grade} — {gradeLabel}
            </span>
          </div>
          <div className={`flex items-center gap-1 text-xs ${changeColor}`}>
            <ChangeIcon className="w-3 h-3" />
            <span>{index.change > 0 ? '+' : ''}{index.change} {t('najarIndex.change')}</span>
          </div>
        </div>
      </div>
    );
  }

  // Full variant
  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          {t('najarIndex.governanceScore')}
        </h3>
        <span className="text-[8px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400/80 border border-amber-500/20">
          Beta
        </span>
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
            <span className="text-4xl font-bold text-white">{index.score}</span>
            <span className="text-xs text-gray-500">/100</span>
          </div>
        </div>

        {/* Grade + Change + Sub-scores */}
        <div className="flex-1 w-full">
          {/* Grade badge + change */}
          <div className="flex items-center gap-3 mb-4">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold ${gradeStyle.bg} ${gradeStyle.text} ${gradeStyle.glow}`}
            >
              {t('najarIndex.grade')}: {index.grade} — {gradeLabel}
            </span>
            <span className={`flex items-center gap-1 text-xs ${changeColor}`}>
              <ChangeIcon className="w-3.5 h-3.5" />
              {index.change > 0 ? '+' : ''}{index.change} {t('najarIndex.change')}
            </span>
          </div>

          {/* Sub-scores */}
          <div className="space-y-2">
            {SUB_SCORE_KEYS.map((key) => (
              <div key={key} className="flex items-center gap-3">
                <span className="text-[10px] text-gray-500 w-28 truncate uppercase tracking-wider">
                  {t(`najarIndex.${key}`)}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: `${index.subScores[key]}%`,
                      backgroundColor: SUB_SCORE_COLORS[key],
                      boxShadow: `0 0 6px ${SUB_SCORE_COLORS[key]}40`,
                    }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-400 w-8 text-right tabular-nums">
                  {index.subScores[key]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
