'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Users, Building2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { ShareMenu } from '@/components/public/share-menu';
import { useGovernmentBody } from '@/lib/hooks/use-government-bodies';
import {
  GRADE_COLORS,
  GRADE_LABELS,
  type GhantiScore,
} from '@/lib/data/ghanti-score';
import { BODY_TYPE_LABELS, translateOrg } from '@/lib/data/government-bodies';
import { translateActor } from '@/components/public/commitment-card';
import { CommitmentCard } from '@/components/public/commitment-card';
import { StatusBar, StatusLegend } from '@/components/public/scorecard/status-breakdown';
import type { GovernmentPromise, PromiseStatus } from '@/lib/data/promises';

/* ═══════════════════════════════════════════════
   SUB-SCORE DISPLAY
   ═══════════════════════════════════════════════ */

const SUB_SCORE_KEYS = [
  'deliveryRate',
  'avgProgress',
  'trustScore',
  'budgetUtilization',
  'citizenSentiment',
] as const;

const SUB_SCORE_COLORS: Record<string, string> = {
  deliveryRate: '#10b981',
  avgProgress: '#3b82f6',
  trustScore: '#8b5cf6',
  budgetUtilization: '#f59e0b',
  citizenSentiment: '#06b6d4',
};

const SUB_SCORE_LABELS: Record<string, string> = {
  deliveryRate: 'scorecard.subDeliveryRate',
  avgProgress: 'scorecard.subAvgProgress',
  trustScore: 'scorecard.subTrustScore',
  budgetUtilization: 'scorecard.subBudgetUse',
  citizenSentiment: 'scorecard.subCitizenVoice',
};

function getScoreColor(score: number): string {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#3b82f6';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

/* ═══════════════════════════════════════════════
   STATUS FILTER TABS
   ═══════════════════════════════════════════════ */

type StatusFilter = 'all' | PromiseStatus;

const STATUS_TABS: { value: StatusFilter; labelKey: string }[] = [
  { value: 'all', labelKey: 'scorecard.filterAll' },
  { value: 'in_progress', labelKey: 'scorecard.filterInProgress' },
  { value: 'not_started', labelKey: 'scorecard.filterNotStarted' },
  { value: 'stalled', labelKey: 'scorecard.filterStalled' },
  { value: 'delivered', labelKey: 'scorecard.filterDelivered' },
];

/* ═══════════════════════════════════════════════
   PAGE COMPONENT
   ═══════════════════════════════════════════════ */

export default function BodyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { locale, t } = useI18n();
  const isNe = locale === 'ne';

  const { body, bodyPromises, isLoading } = useGovernmentBody(slug);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  if (isLoading) {
    return (
      <section className="public-section pt-8">
        <div className="public-shell">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-white/[0.04] rounded w-48" />
            <div className="h-8 bg-white/[0.04] rounded w-96" />
            <div className="h-40 bg-white/[0.04] rounded" />
          </div>
        </div>
      </section>
    );
  }

  if (!body) {
    return (
      <section className="public-section pt-8">
        <div className="public-shell text-center py-16">
          <p className="text-gray-500 mb-4">{t('scorecard.bodyNotFound')}</p>
          <Link href="/scorecard" className="text-sm text-blue-400 hover:text-blue-300">
            {t('scorecard.backToScorecard')}
          </Link>
        </div>
      </section>
    );
  }

  const grade = body.score.grade;
  const gradeStyle = GRADE_COLORS[grade];
  const gradeLabel = isNe ? GRADE_LABELS[grade].ne : GRADE_LABELS[grade].en;
  const typeLabel = isNe ? BODY_TYPE_LABELS[body.type].ne : BODY_TYPE_LABELS[body.type].en;
  // Note: gradeLabel and typeLabel use data objects with {en,ne} — left as-is
  const insufficient = body.score.dataConfidence === 'insufficient';
  const promises = bodyPromises as GovernmentPromise[];

  const filteredPromises =
    statusFilter === 'all'
      ? promises
      : promises.filter((p) => p.status === statusFilter);

  return (
    <>
      {/* ── Header ── */}
      <section className="public-section pt-6 sm:pt-8 pb-0">
        <div className="public-shell">
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/scorecard"
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {t('scorecard.backToScorecard')}
            </Link>
            <ShareMenu
              shareUrl={`/scorecard/${slug}`}
              shareTitle={isNe ? body.nameNe : body.name}
              shareText={isNe
                ? `${body.nameNe} — ग्रेड ${grade} · ${body.avgProgress}% प्रगति`
                : `${body.name} — Grade ${grade} · ${body.avgProgress}% avg progress`}
              ogParams={{
                ogTitle: isNe ? body.nameNe : body.name,
                ogSubtitle: isNe
                  ? `${typeLabel} · ग्रेड ${grade} · ${body.avgProgress}% औसत प्रगति`
                  : `${typeLabel} · Grade ${grade} · ${body.avgProgress}% avg progress`,
                ogSection: 'scorecard',
                ogProgress: body.avgProgress,
                ogLocale: locale,
                ogFacts: isNe ? [
                  `ग्रेड ${grade}`,
                  `${body.commitmentCount} प्रतिबद्धता ट्र्याक`,
                  `${body.avgProgress}% औसत प्रगति`,
                ].join('|') : [
                  `Grade ${grade}`,
                  `${body.commitmentCount} commitments tracked`,
                  `${body.avgProgress}% average progress`,
                ].join('|'),
              }}
              size="sm"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-6">
            {/* Name + meta */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-medium uppercase tracking-wider text-gray-600">
                  {typeLabel}
                </span>
                {!insufficient && (
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-bold ${gradeStyle.bg} ${gradeStyle.text} ${gradeStyle.glow}`}
                  >
                    {grade}
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">
                {isNe ? body.nameNe : body.name}
              </h1>
              <p className="text-sm text-gray-500">
                {body.commitmentCount} {t('scorecard.commitmentsTracked')}
              </p>

              {/* Officials */}
              {body.officials.length > 0 && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500">
                  <Users className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{body.officials.map((o) => translateActor(o, locale)).join(', ')}</span>
                </div>
              )}

              {/* Includes */}
              {body.includes.length > 1 && (
                <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-gray-600">
                  <Building2 className="w-3 h-3 flex-shrink-0" />
                  <span className="line-clamp-1">
                    {t('scorecard.includes')} {body.includes.map((inc) => translateOrg(inc, locale)).join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Score + Status Overview ── */}
      <section className="public-section pt-0 pb-0">
        <div className="public-shell">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {/* Score Dial */}
            <div className="glass-card p-5">
              {insufficient ? (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-400 mb-1">
                    {t('scorecard.insufficientData')}
                  </p>
                  <p className="text-xs text-gray-600">
                    {body.score.verifiedDataPoints}/5{' '}
                    {t('scorecard.verifiedDataPoints')}
                  </p>
                </div>
              ) : (
                <ScoreDial score={body.score} isNe={isNe} />
              )}
            </div>

            {/* Status Breakdown */}
            <div className="glass-card p-5">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                {t('scorecard.statusBreakdown')}
              </h3>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {([
                  { key: 'in_progress', labelKey: 'scorecard.filterInProgress', color: 'text-emerald-400' },
                  { key: 'not_started', labelKey: 'scorecard.filterNotStarted', color: 'text-gray-400' },
                  { key: 'stalled', labelKey: 'scorecard.filterStalled', color: 'text-red-400' },
                  { key: 'delivered', labelKey: 'scorecard.filterDelivered', color: 'text-blue-400' },
                ] as const).map(({ key, labelKey, color }) => (
                  <div key={key} className="p-2 rounded-lg bg-white/[0.02]">
                    <div className={`text-lg font-bold ${color}`}>
                      {body.statusBreakdown[key]}
                    </div>
                    <div className="text-[10px] text-gray-600">{t(labelKey)}</div>
                  </div>
                ))}
              </div>
              <StatusBar breakdown={body.statusBreakdown} total={body.commitmentCount} />
              <div className="mt-2">
                <div className="text-xs text-gray-500">
                  {body.avgProgress}% {t('scorecard.avgProgress')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Commitments List ── */}
      <section className="public-section pt-0">
        <div className="public-shell">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
            {t('scorecard.commitments')}
          </h2>

          {/* Status filter tabs */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {STATUS_TABS.map((tab) => {
              const count =
                tab.value === 'all'
                  ? promises.length
                  : promises.filter((p) => p.status === tab.value).length;
              if (tab.value !== 'all' && count === 0) return null;
              return (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    statusFilter === tab.value
                      ? 'bg-white/10 text-white'
                      : 'bg-white/[0.03] text-gray-500 hover:bg-white/[0.06]'
                  }`}
                >
                  {t(tab.labelKey)} ({count})
                </button>
              );
            })}
          </div>

          {/* Cards */}
          <div className="space-y-2">
            {filteredPromises.map((promise) => (
              <CommitmentCard
                key={promise.id}
                commitment={promise}
                compact
                onClick={() => router.push(`/explore/first-100-days/${promise.id}`)}
              />
            ))}
          </div>

          {filteredPromises.length === 0 && (
            <div className="text-center py-8 text-gray-600 text-sm">
              {t('scorecard.noCommitmentsFilter')}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

/* ═══════════════════════════════════════════════
   SCORE DIAL (inline, accepts pre-computed score)
   ═══════════════════════════════════════════════ */

function ScoreDial({ score, isNe }: { score: GhantiScore; isNe: boolean }) {
  const { t } = useI18n();
  const gradeStyle = GRADE_COLORS[score.grade];
  const gradeLabel = isNe ? GRADE_LABELS[score.grade].ne : GRADE_LABELS[score.grade].en;
  const scoreColor = getScoreColor(score.score);

  const size = 120;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score.score / 100) * circumference;
  const dashOffset = circumference - progress;

  return (
    <div className="flex items-center gap-4">
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
            style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white">{score.score}</span>
          <span className="text-[9px] text-gray-500">/100</span>
        </div>
      </div>

      {/* Sub-scores */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold ${gradeStyle.bg} ${gradeStyle.text}`}
          >
            {score.grade} — {gradeLabel}
          </span>
        </div>
        <div className="space-y-1.5">
          {SUB_SCORE_KEYS.map((key) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-[9px] text-gray-500 w-20 truncate">
                {t(SUB_SCORE_LABELS[key])}
              </span>
              <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${score.subScores[key]}%`,
                    backgroundColor: SUB_SCORE_COLORS[key],
                  }}
                />
              </div>
              <span className="text-[9px] text-gray-500 w-6 text-right tabular-nums">
                {score.subScores[key]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

