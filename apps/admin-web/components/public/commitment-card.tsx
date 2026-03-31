'use client';

import { Heart, Share, ChevronRight, Newspaper, Users, Building2 } from 'lucide-react';
import { GhantiIcon } from '@/components/ui/ghanti-icon';
import { TruthMeter } from '@/components/public/truth-meter';
import { VoteWidget } from '@/components/public/vote-widget';
import { useI18n } from '@/lib/i18n';
import { commitmentShareText, shareOrCopy } from '@/lib/utils/share';
import type { GovernmentPromise, PromiseStatus } from '@/lib/data/promises';

// ── Official title translations ──────────────────────────────────────────────

export const OFFICIAL_TITLE_NE: Record<string, string> = {
  'Prime Minister': 'प्रधानमन्त्री',
  'Finance Minister': 'अर्थमन्त्री',
  'Law Minister': 'कानूनमन्त्री',
  'Home Minister': 'गृहमन्त्री',
  'Education Minister': 'शिक्षामन्त्री',
  'Energy Minister': 'ऊर्जामन्त्री',
  'Health Minister': 'स्वास्थ्यमन्त्री',
  'Commerce Minister': 'वाणिज्यमन्त्री',
  'ICT Minister': 'सञ्चारमन्त्री',
  'Agriculture Minister': 'कृषिमन्त्री',
  'Foreign Minister': 'परराष्ट्रमन्त्री',
  'Tourism Minister': 'पर्यटनमन्त्री',
  'Chief Secretary': 'मुख्य सचिव',
  'Cabinet Secretary': 'मन्त्रिपरिषद् सचिव',
  'Speaker of Parliament': 'सभामुख',
  'NPC Vice Chair': 'राष्ट्रिय योजना आयोग उपाध्यक्ष',
  'PM': 'प्रम',
  'CIAA Chief': 'अख्तियार प्रमुख',
  'NRB Governor': 'राष्ट्र बैंक गभर्नर',
  'NEA MD': 'विद्युत प्राधिकरण प्रबन्ध निर्देशक',
  'CAAN DG': 'नागरिक उड्डयन महानिर्देशक',
  'Attorney General': 'महान्यायाधिवक्ता',
};

/** Translate an actor name to Nepali if a known title exists */
export function translateActor(name: string, locale: string): string {
  if (locale !== 'ne') return name;
  return OFFICIAL_TITLE_NE[name] ?? name;
}

// ── Actor helpers ────────────────────────────────────────────────────────────

const ORG_PREFIXES = ['Ministry of', 'Department of', 'Office of', 'District ', 'Provincial '];
const ORG_NAMES = new Set([
  'Federal Parliament', 'Supreme Court', 'Judicial Council',
  'Election Commission', 'Public Service Commission',
  'CIAA', 'NEA', 'KUKL', 'CAAN', 'PPMO', 'NPC', 'NRB', 'NTA', 'NTB',
  'SEBON', 'NEPSE', 'NARC', 'HITP', 'NITC', 'CTEVT', 'CDC', 'ERO',
  'IBN', 'TEPC', 'NRNA', 'DOED', 'DOR', 'DWSS', 'DOA', 'DHM', 'UGC',
  'MOCIT', 'MOHP', 'MOLMAC', 'IRD', 'SSF',
  'Nepal Rastra Bank', 'Investment Board Nepal', 'Social Security Fund',
  'Health Insurance Board', 'Electricity Regulatory Commission',
  'Truth and Reconciliation Commission', 'National Dalit Commission',
  'National Sports Council', 'Inland Revenue Department',
  'Attorney General Office', 'Survey Department',
  'Kathmandu Metropolitan City', 'Autonomous Civil Service Transfer Board',
]);

function isOrganization(actor: string): boolean {
  if (ORG_NAMES.has(actor)) return true;
  return ORG_PREFIXES.some((p) => actor.startsWith(p));
}

/** Days since RSP government took office (March 26, 2026) */
const GOV_START = new Date('2026-03-26T00:00:00+05:45').getTime();
function daysSinceStart(): number {
  return Math.max(0, Math.floor((Date.now() - GOV_START) / (1000 * 60 * 60 * 24)));
}

/** Split actors into people and orgs, return top 2 people only. Translates titles when locale is 'ne'. */
function splitActors(actors: string[], locale = 'en'): { people: string[]; orgs: string[] } {
  const people: string[] = [];
  const orgs: string[] = [];
  for (const a of actors) {
    if (isOrganization(a)) orgs.push(a);
    else people.push(translateActor(a, locale));
  }
  return { people: people.slice(0, 2), orgs: orgs.slice(0, 2) };
}

// ── Types ────────────────────────────────────────────────────────────────────

type ExtendedStatus = PromiseStatus | 'partially_delivered';

export interface CommitmentCardProps {
  commitment: GovernmentPromise;
  summary?: string;
  signalCount?: number;
  truthScore?: number;
  truthLabel?: 'unverified' | 'low' | 'moderate' | 'high' | 'verified';
  isTrending?: boolean;
  isNew?: boolean;
  hasEvidence?: boolean;
  statusChanged?: boolean;
  hasBudget?: boolean;
  hasVideo?: boolean;
  hasOfficialStatement?: boolean;
  isContradicted?: boolean;
  isWatched?: boolean;
  blocker?: string;
  assignedTo?: string;
  department?: string;
  compact?: boolean; // mobile compact mode
  onWatch?: () => void;
  onClick?: () => void;
}

// ── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  ExtendedStatus,
  { labelKey: string; dotColor: string; barColor: string; barGlow: string }
> = {
  not_started: {
    labelKey: 'commitment.notStarted',
    dotColor: 'bg-gray-400',
    barColor: 'bg-gray-400/60',
    barGlow: '',
  },
  in_progress: {
    labelKey: 'commitment.inProgress',
    dotColor: 'bg-emerald-400',
    barColor: 'bg-emerald-400',
    barGlow: 'shadow-[0_0_6px_rgba(16,185,129,0.4)]',
  },
  stalled: {
    labelKey: 'commitment.stalled',
    dotColor: 'bg-red-400',
    barColor: 'bg-red-400',
    barGlow: 'shadow-[0_0_6px_rgba(239,68,68,0.4)]',
  },
  delivered: {
    labelKey: 'commitment.delivered',
    dotColor: 'bg-blue-400',
    barColor: 'bg-blue-400',
    barGlow: 'shadow-[0_0_6px_rgba(59,130,246,0.4)]',
  },
  partially_delivered: {
    labelKey: 'commitment.partial',
    dotColor: 'bg-yellow-400',
    barColor: 'bg-yellow-400',
    barGlow: 'shadow-[0_0_6px_rgba(234,179,8,0.4)]',
  },
};

// ── Grade helpers ────────────────────────────────────────────────────────────

function getGrade(progress: number): string {
  if (progress >= 80) return 'A';
  if (progress >= 60) return 'B';
  if (progress >= 40) return 'C';
  if (progress >= 20) return 'D';
  return 'F';
}

const GRADE_BADGE_COLORS: Record<string, string> = {
  A: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  B: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  C: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  D: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  F: 'bg-red-500/20 text-red-400 border-red-500/30',
};

// ── Component ────────────────────────────────────────────────────────────────

export function CommitmentCard({
  commitment,
  summary,
  signalCount = 0,
  truthScore = 0,
  truthLabel = 'unverified',
  isTrending = false,
  isNew = false,
  hasEvidence = false,
  statusChanged = false,
  hasBudget = false,
  hasVideo = false,
  hasOfficialStatement = false,
  isContradicted = false,
  isWatched = false,
  blocker,
  assignedTo,
  department,
  compact = false,
  onWatch,
  onClick,
}: CommitmentCardProps) {
  const { locale, t } = useI18n();
  const status = (commitment.status as ExtendedStatus) ?? 'not_started';
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.not_started;
  const progress = Math.min(100, Math.max(0, commitment.progress ?? 0));
  const grade = getGrade(progress);

  // Resolve display summary: prefer AI summary, fall back to static data
  const displaySummary = summary || commitment.summary || commitment.description || null;

  /* ── COMPACT MODE (mobile) ── */
  if (compact) {
    return (
      <div
        role="article"
        onClick={onClick}
        className={`glass-card-interactive p-3 flex flex-col gap-1.5 group card-border-${status.replace('_', '-')}`}
      >
        {/* Row 1: Status + Category + Grade */}
        <div className="flex items-center gap-2">
          <GhantiIcon status={status === 'partially_delivered' ? 'default' : status} size="xs" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            {t(cfg.labelKey)}
          </span>
          <span className="text-gray-600">&middot;</span>
          <span className="text-[10px] text-gray-500 truncate">{locale === 'ne' && commitment.category_ne ? commitment.category_ne : commitment.category}</span>
          <span className={`ml-auto flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold border ${GRADE_BADGE_COLORS[grade]}`}>
            {grade}
          </span>
        </div>

        {/* Row 2: Title (1 line) */}
        <h3 className="text-sm font-semibold text-white leading-snug line-clamp-1 group-hover:text-primary-300 transition-colors">
          {commitment.title}
        </h3>

        {/* Row 3: Actors (people + orgs separated) */}
        {commitment.actors && commitment.actors.length > 0 && (() => {
          const { people, orgs } = splitActors(commitment.actors, locale);
          return (
            <div className="flex items-center gap-2 mt-0.5 min-w-0 overflow-hidden">
              {people.length > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-400 truncate">
                  <Users className="w-2.5 h-2.5 flex-shrink-0" />
                  {people.join(', ')}
                </span>
              )}
              {orgs.length > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-600 truncate">
                  <Building2 className="w-2.5 h-2.5 flex-shrink-0" />
                  {orgs.join(', ')}
                </span>
              )}
            </div>
          );
        })()}

        {/* Row 3b: Summary (1 line) */}
        {displaySummary && (
          <p className="text-xs leading-relaxed text-gray-400 italic line-clamp-1">
            &ldquo;{displaySummary}&rdquo;
          </p>
        )}

        {/* Row 4: Progress bar (2px) + % + day count + icons inline */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-0.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-200 ease-out ${cfg.barColor}${status === 'stalled' ? ' progress-stalled' : ''}${status === 'delivered' ? ' progress-delivered' : ''}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[10px] font-semibold tabular-nums text-gray-300">
            {progress}%
          </span>
          {daysSinceStart() > 0 && (
            <span className="text-[9px] text-gray-600 tabular-nums">
              {t('commitment.day')}{daysSinceStart()}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
            <Newspaper className="w-3 h-3" />
            <span className="tabular-nums">{signalCount}</span>
          </span>
          {isTrending && (
            <span className="text-xs leading-none">{'\uD83D\uDD25'}</span>
          )}
          {/* Truth meter: just the colored dot */}
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
            truthLabel === 'verified' ? 'bg-emerald-400' :
            truthLabel === 'high' ? 'bg-blue-400' :
            truthLabel === 'moderate' ? 'bg-amber-400' :
            truthLabel === 'low' ? 'bg-red-400' : 'bg-gray-500'
          }`} title={truthLabel} />
        </div>

        {/* Row 5: Blocker (1 line, stalled only) */}
        {status === 'stalled' && blocker && (
          <div className="flex items-center gap-1 text-[10px] text-red-400/90 leading-snug">
            <span className="flex-shrink-0">{'\u26D4'}</span>
            <span className="line-clamp-1">{blocker}</span>
          </div>
        )}

        {/* Row 6: Vote + Watch + Arrow (same row, smaller) */}
        <div className="flex items-center justify-between pt-0.5">
          <div className="flex items-center gap-1.5">
            <VoteWidget promiseId={commitment.id} variant="compact" />
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {onWatch && (
              <button
                onClick={(e) => { e.stopPropagation(); onWatch(); }}
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium transition-all ${
                  isWatched ? 'text-rose-400 bg-rose-500/15' : 'text-gray-500'
                }`}
              >
                <Heart className={`w-3 h-3 ${isWatched ? 'fill-current' : ''}`} />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                const displayTitle = locale === 'ne' && commitment.title_ne ? commitment.title_ne : commitment.title;
                const text = commitmentShareText({ title: displayTitle, progress: commitment.progress, status: commitment.status, locale });
                const fullUrl = `${window.location.origin}/explore/first-100-days/${commitment.slug}`;
                shareOrCopy({ title: text, text, url: fullUrl });
              }}
              className="p-1 rounded text-gray-500 hover:text-gray-300 hover:bg-white/[0.06] transition-all"
              aria-label="Share"
            >
              <Share className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onClick?.(); }}
              className="p-1 rounded text-gray-500 hover:text-white transition-all"
              aria-label={t('commitment.viewDetails')}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── FULL MODE (desktop) ── */
  return (
    <div
      role="article"
      onClick={onClick}
      className={`glass-card-interactive p-4 sm:p-5 flex flex-col gap-3 group md:hover:translate-y-[-1px] relative card-border-${status.replace('_', '-')}`}
    >
      {/* Grade badge — top right */}
      <span className={`absolute top-3 right-3 flex items-center justify-center w-8 h-8 rounded-lg border text-sm font-bold ${GRADE_BADGE_COLORS[grade]}`}>
        {grade}
      </span>

      {/* ── Row 1: Status ── */}
      <div className="flex items-center gap-2">
        <GhantiIcon status={status === 'partially_delivered' ? 'default' : status} size="sm" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          {t(cfg.labelKey)}
        </span>
      </div>

      {/* ── Row 2: Title ── */}
      <h3 className="text-[15px] sm:text-base font-semibold text-white leading-snug line-clamp-2 group-hover:text-primary-300 transition-colors">
        {commitment.title}
      </h3>

      {/* ── Row 3: Category + Department ── */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <span>{locale === 'ne' && commitment.category_ne ? commitment.category_ne : commitment.category}</span>
        {department && (
          <>
            <span className="text-gray-600">&middot;</span>
            <span className="text-gray-500 truncate">{department}</span>
          </>
        )}
      </div>

      {/* ── Row 4: Actors / Assigned to ── */}
      {commitment.actors && commitment.actors.length > 0 && (() => {
        const { people, orgs } = splitActors(commitment.actors, locale);
        return (
          <div className="flex items-center gap-3 text-[11px] min-w-0">
            {people.length > 0 && (
              <span className="inline-flex items-center gap-1 text-gray-400 truncate">
                <Users className="w-3 h-3 flex-shrink-0" />
                {people.join(', ')}
              </span>
            )}
            {orgs.length > 0 && (
              <span className="inline-flex items-center gap-1 text-gray-600 truncate">
                <Building2 className="w-3 h-3 flex-shrink-0" />
                {orgs.join(', ')}
              </span>
            )}
          </div>
        );
      })()}
      {assignedTo && !(commitment.actors && commitment.actors.length > 0) && (
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
          <Users className="w-3 h-3" />
          <span className="truncate">{assignedTo}</span>
        </div>
      )}

      {/* ── Row 5: Progress bar ── */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-200 ease-out ${cfg.barColor} ${cfg.barGlow}${status === 'stalled' ? ' progress-stalled' : ''}${status === 'delivered' ? ' progress-delivered' : ''}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[11px] font-semibold tabular-nums text-gray-300 w-8 text-right">
          {progress}%
        </span>
      </div>
      {progress === 0 && status === 'not_started' && (
        <p className="text-[10px] text-gray-500">{t('commitment.noProgressYet')}</p>
      )}

      {/* ── Row 6: AI Summary ── */}
      {displaySummary && (
        <p className="text-[13px] leading-relaxed text-gray-400 italic line-clamp-2">
          &ldquo;{displaySummary}&rdquo;
        </p>
      )}

      {/* ── Row 7: Blocker (stalled only) ── */}
      {status === 'stalled' && blocker && (
        <div className="flex items-start gap-1.5 text-[11px] text-red-400/90 leading-snug">
          <span className="flex-shrink-0 mt-px">{'\u26D4'}</span>
          <span className="line-clamp-2">{blocker}</span>
        </div>
      )}

      {/* ── Row 8: Icon strip + Actions ── */}
      <div className="flex items-center justify-between mt-auto pt-1">
        {/* Signal icons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Truth score — always show */}
          <TruthMeter score={truthScore} label={truthLabel} size="sm" />

          {/* Source count — always show */}
          <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
            <Newspaper className="w-3.5 h-3.5" />
            <span className="tabular-nums">{signalCount}</span>
          </span>

          {/* Conditional signal icons */}
          {isTrending && (
            <span className="text-sm leading-none" title={t('commitment.tooltipTrending')}>{'\uD83D\uDD25'}</span>
          )}
          {isNew && (
            <span className="text-sm leading-none" title={t('commitment.tooltipNewActivity')}>{'\u26A1'}</span>
          )}
          {statusChanged && !isNew && (
            <span className="text-sm leading-none" title={t('commitment.tooltipStatusChanged')}>{'\u26A1'}</span>
          )}
          {hasBudget && (
            <span className="text-sm leading-none" title={t('commitment.tooltipBudget')}>{'\uD83D\uDCB0'}</span>
          )}
          {hasEvidence && (
            <span className="text-sm leading-none" title={t('commitment.tooltipEvidence')}>{'\uD83D\uDCF8'}</span>
          )}
          {hasVideo && (
            <span className="text-sm leading-none" title={t('commitment.tooltipVideo')}>{'\uD83D\uDCFA'}</span>
          )}
          {hasOfficialStatement && (
            <span className="text-sm leading-none" title={t('commitment.tooltipOfficial')}>{'\uD83C\uDFDB\uFE0F'}</span>
          )}
          {isContradicted && (
            <span className="text-sm leading-none" title={t('commitment.tooltipDisagree')}>{'\u26A0\uFE0F'}</span>
          )}

          {/* Citizen pulse vote — subtle, secondary weight */}
          <div className="border-l border-white/[0.06] pl-2 ml-0.5">
            <VoteWidget promiseId={commitment.id} variant="compact" />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Follow button */}
          {onWatch && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onWatch();
              }}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-all ${
                isWatched
                  ? 'text-rose-400 bg-rose-500/15'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]'
              }`}
              title={isWatched ? t('commitment.following') : t('commitment.follow')}
            >
              <Heart
                className={`w-3.5 h-3.5 ${isWatched ? 'fill-current' : ''}`}
              />
              <span className="hidden sm:inline">
                {isWatched ? t('commitment.following') : t('commitment.follow')}
              </span>
            </button>
          )}

          {/* Share button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              const displayTitle = locale === 'ne' && commitment.title_ne ? commitment.title_ne : commitment.title;
              const text = commitmentShareText({ title: displayTitle, progress: commitment.progress, status: commitment.status, locale });
              const fullUrl = `${window.location.origin}/explore/first-100-days/${commitment.slug}`;
              shareOrCopy({ title: text, text, url: fullUrl });
            }}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/[0.06] transition-all"
            aria-label="Share"
          >
            <Share className="w-3.5 h-3.5" />
          </button>

          {/* Navigate arrow */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.06] transition-all"
            aria-label={t('commitment.viewDetails')}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
