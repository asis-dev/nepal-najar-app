'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  MapPin,
  Target,
  Link2,
  Globe,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  Circle,
  AlertTriangle,
  Building2,
  Truck,
  Cpu,
  Heart,
  Zap,
  GraduationCap,
  Leaf,
  Scale,
  Fingerprint,
  Briefcase,
  Users,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { usePreferencesStore } from '@/lib/stores/preferences';
import { useAllPromises } from '@/lib/hooks/use-promises';
import { categorizePromises } from '@/lib/utils/geo-relevance';
import type { GovernmentPromise, PromiseStatus } from '@/lib/data/promises';

/* ═══════════════════════════════════════════════
   STATUS CONFIG
   ═══════════════════════════════════════════════ */
const statusStyleConfig: Record<PromiseStatus, { bg: string; text: string; dot: string }> = {
  not_started: { bg: 'bg-gray-500/15', text: 'text-gray-400', dot: 'bg-gray-400' },
  in_progress: { bg: 'bg-blue-500/15', text: 'text-blue-400', dot: 'bg-blue-400' },
  delivered: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  stalled: { bg: 'bg-red-500/15', text: 'text-red-400', dot: 'bg-red-400' },
};

const statusLabelKeys: Record<PromiseStatus, string> = {
  not_started: 'commitment.notStarted',
  in_progress: 'commitment.inProgress',
  delivered: 'commitment.delivered',
  stalled: 'commitment.stalled',
};

const categoryIcons: Record<string, React.ElementType> = {
  Infrastructure: Building2,
  Transport: Truck,
  Technology: Cpu,
  Health: Heart,
  Environment: Leaf,
  Energy: Zap,
  Education: GraduationCap,
  'Anti-Corruption': Fingerprint,
  Governance: Scale,
  Economy: Briefcase,
  Social: Users,
};

const categoryColors: Record<string, string> = {
  Infrastructure: 'text-blue-400',
  Transport: 'text-amber-400',
  Technology: 'text-cyan-400',
  Health: 'text-rose-400',
  Environment: 'text-emerald-400',
  Energy: 'text-yellow-400',
  Education: 'text-purple-400',
  'Anti-Corruption': 'text-orange-400',
  Governance: 'text-indigo-400',
  Economy: 'text-teal-400',
  Social: 'text-pink-400',
};

/* ═══════════════════════════════════════════════
   PROMISE CARD
   ═══════════════════════════════════════════════ */
function PromiseCard({
  promise,
  accent,
  relevanceReason,
}: {
  promise: GovernmentPromise;
  accent: 'green' | 'blue' | 'gray';
  relevanceReason: string;
}) {
  const { t, locale } = useI18n();
  const status = statusStyleConfig[promise.status];
  const CategoryIcon = categoryIcons[promise.category] || Circle;
  const categoryColor = categoryColors[promise.category] || 'text-gray-400';

  const accentBorder =
    accent === 'green'
      ? 'border-l-emerald-500/60'
      : accent === 'blue'
        ? 'border-l-blue-500/60'
        : 'border-l-gray-500/40';

  const accentReasonBg =
    accent === 'green'
      ? 'bg-emerald-500/10 text-emerald-400'
      : accent === 'blue'
        ? 'bg-blue-500/10 text-blue-400'
        : 'bg-gray-500/10 text-gray-400';

  return (
    <Link
      href={`/explore/first-100-days/${promise.slug}`}
      className={`block glass-card border-l-4 ${accentBorder} p-4 hover:bg-white/[0.04] transition-all duration-200 group`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white group-hover:text-primary-300 transition-colors line-clamp-2">
            {locale === 'ne' ? promise.title_ne : promise.title}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
            {locale === 'ne' ? promise.title : promise.title_ne}
          </p>
        </div>
        {/* Status badge */}
        <span className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${status.bg} ${status.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          {t(statusLabelKeys[promise.status])}
        </span>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary-500 to-cyan-500 transition-all"
            style={{ width: `${promise.progress}%` }}
          />
        </div>
        <span className="text-[10px] font-mono text-gray-500 tabular-nums">{promise.progress}%</span>
      </div>

      {/* Category & Relevance */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`inline-flex items-center gap-1 text-[10px] ${categoryColor}`}>
          <CategoryIcon className="w-3 h-3" />
          {promise.category}
        </span>
        <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full ${accentReasonBg}`}>
          <MapPin className="w-2.5 h-2.5" />
          {relevanceReason}
        </span>
      </div>
    </Link>
  );
}

/* ═══════════════════════════════════════════════
   SET LOCATION PROMPT
   ═══════════════════════════════════════════════ */
function SetLocationPrompt() {
  const { t } = useI18n();
  const { setShowPicker } = usePreferencesStore();

  return (
    <div className="glass-card p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-cyan-500 flex items-center justify-center mx-auto mb-4 shadow-glow-sm">
        <MapPin className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">
        {t('affectsMe.title')}
      </h2>
      <p className="text-sm text-gray-400 mb-6 max-w-md mx-auto">
        {t('affectsMe.setLocation')}
      </p>
      <button
        onClick={() => setShowPicker(true)}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-cyan-500 text-white font-semibold text-sm hover:shadow-glow transition-all duration-200"
      >
        <MapPin className="w-4 h-4" />
        {t('affectsMe.changeLocation')}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SECTION
   ═══════════════════════════════════════════════ */
function RelevanceSection({
  title,
  icon: Icon,
  iconColor,
  promises,
  accent,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  promises: Array<GovernmentPromise & { relevanceReason: string }>;
  accent: 'green' | 'blue' | 'gray';
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (promises.length === 0) return null;

  return (
    <div className="mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 mb-3 group"
      >
        <div className="flex items-center gap-2.5">
          <Icon className={`w-5 h-5 ${iconColor}`} />
          <h2 className="text-lg font-bold text-white">
            {title}
          </h2>
          <span className="text-xs text-gray-500 bg-white/[0.06] px-2 py-0.5 rounded-full tabular-nums">
            {promises.length}
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </button>

      {isOpen && (
        <div className="space-y-2">
          {promises.map((p) => (
            <PromiseCard
              key={p.id}
              promise={p}
              accent={accent}
              relevanceReason={p.relevanceReason}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════ */
export default function AffectsMePage() {
  const { t, locale } = useI18n();
  const { province, district, hasSetHometown, setShowPicker } = usePreferencesStore();
  const { data: allPromises, isLoading } = useAllPromises();

  const { direct, indirect, other } = useMemo(() => {
    if (!allPromises) return { direct: [], indirect: [], other: [] };
    return categorizePromises(allPromises, province, district);
  }, [allPromises, province, district]);

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
          {t('affectsMe.title')}
        </h1>

        {hasSetHometown && province ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-sm text-primary-400">
              <MapPin className="w-4 h-4" />
              {t('affectsMe.basedOn')}: {locale === 'ne' ? t(`province.${province}`) : province}
              {district && `, ${district}`}
            </span>
            <button
              onClick={() => setShowPicker(true)}
              className="text-xs text-gray-500 hover:text-primary-400 underline underline-offset-2 transition-colors"
            >
              {t('affectsMe.changeLocation')}
            </button>
          </div>
        ) : null}
      </div>

      {/* If no hometown set, show the prompt */}
      {!hasSetHometown ? (
        <SetLocationPrompt />
      ) : isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="glass-card p-4 animate-pulse">
              <div className="h-4 bg-white/[0.06] rounded w-3/4 mb-2" />
              <div className="h-2 bg-white/[0.06] rounded w-1/2 mb-3" />
              <div className="h-1.5 bg-white/[0.06] rounded w-full" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Summary strip */}
          <div className="glass-card p-4 mb-6 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-white font-semibold">{direct.length}</span>
              <span className="text-xs text-gray-400">{t('affectsMe.direct')}</span>
            </div>
            <div className="w-px h-4 bg-np-border" />
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-white font-semibold">{indirect.length}</span>
              <span className="text-xs text-gray-400">{t('affectsMe.indirect')}</span>
            </div>
            <div className="w-px h-4 bg-np-border" />
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-white font-semibold">{other.length}</span>
              <span className="text-xs text-gray-400">{t('affectsMe.otherAreas')}</span>
            </div>
          </div>

          {/* Sections */}
          <RelevanceSection
            title={t('affectsMe.direct')}
            icon={Target}
            iconColor="text-emerald-400"
            promises={direct}
            accent="green"
            defaultOpen={true}
          />

          <RelevanceSection
            title={t('affectsMe.indirect')}
            icon={Link2}
            iconColor="text-blue-400"
            promises={indirect}
            accent="blue"
            defaultOpen={true}
          />

          <RelevanceSection
            title={t('affectsMe.otherAreas')}
            icon={Globe}
            iconColor="text-gray-400"
            promises={other}
            accent="gray"
            defaultOpen={false}
          />
        </>
      )}
    </div>
  );
}
