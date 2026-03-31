'use client';

import Link from 'next/link';
import { ChevronRight, Users } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import {
  GRADE_COLORS,
  GRADE_LABELS,
} from '@/lib/data/ghanti-score';
import {
  BODY_TYPE_LABELS,
  type GovernmentBody,
} from '@/lib/data/government-bodies';
import { translateActor } from '@/components/public/commitment-card';
import { StatusBar, StatusLegend } from './status-breakdown';

export function BodyCard({ body }: { body: GovernmentBody }) {
  const { locale, t } = useI18n();
  const isNe = locale === 'ne';

  const grade = body.score.grade;
  const gradeStyle = GRADE_COLORS[grade];
  const gradeLabel = isNe ? GRADE_LABELS[grade].ne : GRADE_LABELS[grade].en;
  const typeLabel = isNe ? BODY_TYPE_LABELS[body.type].ne : BODY_TYPE_LABELS[body.type].en;
  const insufficient = body.score.dataConfidence === 'insufficient';

  return (
    <Link
      href={`/scorecard/${body.slug}`}
      className="group block glass-card p-4 hover:bg-white/[0.04] transition-colors"
    >
      {/* Top row: grade + type badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {!insufficient ? (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold ${gradeStyle.bg} ${gradeStyle.text} flex-shrink-0`}
            >
              {grade}
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-white/[0.04] text-gray-500 flex-shrink-0">
              ?
            </span>
          )}
          <span className="text-[10px] font-medium uppercase tracking-wider text-gray-600 truncate">
            {typeLabel}
          </span>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors flex-shrink-0" />
      </div>

      {/* Body name */}
      <h3 className="text-sm font-semibold text-gray-200 mb-0.5 line-clamp-2 group-hover:text-white transition-colors">
        {isNe ? body.nameNe : body.name}
      </h3>

      {/* Description — what this body does (English only) */}
      {body.description && !isNe && (
        <p className="text-[10px] text-gray-500 line-clamp-1 mb-1.5">
          {body.description}
        </p>
      )}

      {/* Commitment count + avg progress */}
      <div className="flex items-center gap-3 text-[11px] text-gray-500 mb-3">
        <span>{body.commitmentCount} {t('scorecard.commitmentsLower')}</span>
        <span className="text-gray-700">·</span>
        <span>{body.avgProgress}% {t('scorecard.avgProgressLower')}</span>
      </div>

      {/* Status bar */}
      <StatusBar breakdown={body.statusBreakdown} total={body.commitmentCount} />
      <div className="mt-1.5">
        <StatusLegend breakdown={body.statusBreakdown} compact />
      </div>

      {/* Officials */}
      {body.officials.length > 0 && (
        <div className="mt-3 flex items-center gap-1.5 text-[10px] text-gray-600">
          <Users className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{body.officials.slice(0, 2).map((o) => translateActor(o, locale)).join(', ')}</span>
        </div>
      )}

      {/* Grade qualifier footer */}
      <div className="mt-2 pt-2 border-t border-white/[0.04]">
        {!insufficient ? (
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-medium ${gradeStyle.text}`}>
              {body.statusBreakdown.delivered} {t('scorecard.deliveredLower')} / {body.commitmentCount}
            </span>
            <span className="text-[10px] text-gray-600 group/tip relative cursor-help">
              {body.score.score}/100 *
              <span className="hidden group-hover/tip:block absolute bottom-full right-0 mb-1 w-44 p-1.5 rounded-lg bg-gray-800 border border-white/10 text-[9px] text-gray-300 leading-relaxed shadow-xl z-50">
                {t('scorecard.howWeScore')} →
              </span>
            </span>
          </div>
        ) : (
          <span className="text-[10px] text-gray-600">
            {body.statusBreakdown.delivered} {t('scorecard.deliveredLower')} / {body.commitmentCount}
          </span>
        )}
      </div>
    </Link>
  );
}
