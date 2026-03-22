'use client';

import { Star, BarChart3, Loader2 } from 'lucide-react';
import { useWardScorecard, type WardReportTopic } from '@/lib/hooks/use-ward-reports';
import { useI18n } from '@/lib/i18n';

/* ═══════════════════════════════════════════
   TOPIC CONFIG
   ═══════════════════════════════════════════ */
const TOPIC_META: Record<WardReportTopic, { icon: string; label: string; label_ne: string }> = {
  roads: { icon: '\u{1F6E3}\uFE0F', label: 'Roads', label_ne: '\u0938\u0921\u0915' },
  water: { icon: '\u{1F4A7}', label: 'Water', label_ne: '\u092A\u093E\u0928\u0940' },
  electricity: { icon: '\u26A1', label: 'Electricity', label_ne: '\u092C\u093F\u091C\u0941\u0932\u0940' },
  health: { icon: '\u{1F3E5}', label: 'Health', label_ne: '\u0938\u094D\u0935\u093E\u0938\u094D\u0925\u094D\u092F' },
  education: { icon: '\u{1F4DA}', label: 'Education', label_ne: '\u0936\u093F\u0915\u094D\u0937\u093E' },
  sanitation: { icon: '\u{1F6BF}', label: 'Sanitation', label_ne: '\u0938\u0930\u0938\u092B\u093E\u0907' },
  internet: { icon: '\u{1F4F6}', label: 'Internet', label_ne: '\u0907\u0928\u094D\u091F\u0930\u0928\u0947\u091F' },
  safety: { icon: '\u{1F512}', label: 'Safety', label_ne: '\u0938\u0941\u0930\u0915\u094D\u0937\u093E' },
  employment: { icon: '\u{1F4BC}', label: 'Employment', label_ne: '\u0930\u094B\u091C\u0917\u093E\u0930\u0940' },
  other: { icon: '\u{1F4E6}', label: 'Other', label_ne: '\u0905\u0928\u094D\u092F' },
};

function getRatingColor(rating: number): string {
  if (rating >= 4) return 'text-emerald-400';
  if (rating >= 3) return 'text-amber-400';
  return 'text-red-400';
}

function getRatingBg(rating: number): string {
  if (rating >= 4) return 'bg-emerald-500/15';
  if (rating >= 3) return 'bg-amber-500/15';
  return 'bg-red-500/15';
}

interface WardScorecardProps {
  province: string | null;
  district?: string | null;
  onRateClick?: () => void;
}

export function WardScorecard({ province, district, onRateClick }: WardScorecardProps) {
  const { locale } = useI18n();
  const isNe = locale === 'ne';
  const { data: scorecard, isLoading } = useWardScorecard(province, district);

  if (!province) return null;

  if (isLoading) {
    return (
      <div className="glass-card p-6 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
      </div>
    );
  }

  const hasData = scorecard && scorecard.length > 0;

  return (
    <div className="glass-card p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary-400" />
          {isNe ? '\u0935\u093E\u0930\u094D\u0921 \u0938\u094D\u0915\u094B\u0930\u0915\u093E\u0930\u094D\u0921' : 'Ward Scorecard'}
        </h3>
        {onRateClick && (
          <button
            onClick={onRateClick}
            className="text-xs text-primary-400 hover:text-primary-300 transition-colors px-3 py-1.5 rounded-lg bg-primary-500/10 border border-primary-500/20 hover:bg-primary-500/15"
          >
            {isNe ? '\u0930\u0947\u091F \u0917\u0930\u094D\u0928\u0941\u0939\u094B\u0938\u094D' : 'Rate your area'}
          </button>
        )}
      </div>

      {!hasData ? (
        <div className="text-center py-6">
          <p className="text-sm text-gray-500 mb-3">
            {isNe
              ? '\u092F\u0938 \u0915\u094D\u0937\u0947\u0924\u094D\u0930\u0915\u094B \u0932\u093E\u0917\u093F \u0905\u0939\u093F\u0932\u0947\u0938\u092E\u094D\u092E \u0915\u0941\u0928\u0948 \u0930\u093F\u092A\u094B\u0930\u094D\u091F \u091B\u0948\u0928\u0964'
              : 'No reports yet for this area.'}
          </p>
          {onRateClick && (
            <button
              onClick={onRateClick}
              className="text-sm text-primary-400 hover:text-primary-300 transition-colors"
            >
              {isNe ? '\u092A\u0939\u093F\u0932\u094B \u0930\u093F\u092A\u094B\u0930\u094D\u091F \u092C\u0928\u094D\u0928\u0941\u0939\u094B\u0938\u094D' : 'Be the first to report'}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {scorecard!.map((item) => {
            const meta = TOPIC_META[item.topic];
            return (
              <div
                key={item.topic}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
              >
                {/* Icon */}
                <span className="text-lg flex-shrink-0">{meta.icon}</span>

                {/* Name */}
                <span className="text-sm text-gray-300 flex-1 min-w-0 truncate">
                  {isNe ? meta.label_ne : meta.label}
                </span>

                {/* Stars */}
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-3.5 h-3.5 ${
                        s <= Math.round(item.averageRating)
                          ? `${getRatingColor(item.averageRating)} fill-current`
                          : 'text-gray-700'
                      }`}
                    />
                  ))}
                </div>

                {/* Average */}
                <span className={`text-sm font-bold tabular-nums w-8 text-right ${getRatingColor(item.averageRating)}`}>
                  {item.averageRating.toFixed(1)}
                </span>

                {/* Report count */}
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${getRatingBg(item.averageRating)} ${getRatingColor(item.averageRating)}`}>
                  {item.reportCount}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
