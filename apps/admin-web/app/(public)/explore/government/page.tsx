'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  ExternalLink,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { useAllPromises, usePromiseStats } from '@/lib/hooks/use-promises';
import { useGovernmentStructure } from '@/lib/hooks/use-government-structure';
import { PublicPageHero } from '@/components/public/page-hero';
import { useI18n } from '@/lib/i18n';
import type { PublicGovSnapshotUnit } from '@/lib/org-structure/engine';
import type { PublicGovUnitType } from '@/lib/data/government-accountability';

const typeStyles: Record<PublicGovUnitType, string> = {
  country: 'border-blue-500/20 bg-blue-500/10 text-blue-300',
  ministry: 'border-red-500/20 bg-red-500/10 text-red-300',
  department: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
  division: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
  office: 'border-white/10 bg-white/[0.04] text-gray-300',
};

const achievementStyles = {
  delivered: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
  in_progress: 'border-blue-500/20 bg-blue-500/10 text-blue-300',
  planned: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
};

function TreeNode({
  unit,
  selectedId,
  onSelect,
  childrenByParent,
  level = 0,
  locale,
  t,
  typeLabels,
}: {
  unit: PublicGovSnapshotUnit;
  selectedId: string;
  onSelect: (id: string) => void;
  childrenByParent: Record<string, PublicGovSnapshotUnit[]>;
  level?: number;
  locale: string;
  t: (key: string) => string;
  typeLabels: Record<PublicGovUnitType, string>;
}) {
  const children = childrenByParent[unit.id] ?? [];
  const [expanded, setExpanded] = useState(level < 1);
  const isSelected = unit.id === selectedId;

  return (
    <div>
      <button
        onClick={() => onSelect(unit.id)}
        className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition-colors ${
          isSelected ? 'bg-white/[0.08] text-white' : 'text-gray-300 hover:bg-white/[0.04]'
        }`}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
      >
        <span
          className="flex h-6 w-6 items-center justify-center text-gray-500"
          onClick={(event) => {
            event.stopPropagation();
            if (children.length > 0) setExpanded((value) => !value);
          }}
        >
          {children.length > 0 ? (
            expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
          ) : (
            <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{locale === 'ne' ? unit.nameNe : unit.name}</p>
          <p className="truncate text-xs text-gray-500">{locale === 'ne' ? unit.leadTitleNe : unit.leadTitle}</p>
        </div>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${typeStyles[unit.type]}`}>
          {typeLabels[unit.type]}
        </span>
      </button>

      {expanded &&
        children.map((child) => (
          <TreeNode
            key={child.id}
            unit={child}
            selectedId={selectedId}
            onSelect={onSelect}
            childrenByParent={childrenByParent}
            level={level + 1}
            locale={locale}
            t={t}
            typeLabels={typeLabels}
          />
        ))}
    </div>
  );
}

export default function GovernmentPublicPage() {
  const { locale, t } = useI18n();
  const { data: promises } = useAllPromises();
  const { stats } = usePromiseStats();
  const { data: governmentData, isLoading: governmentLoading } = useGovernmentStructure();
  const [selectedUnitId, setSelectedUnitId] = useState('country-nepal');
  const units = governmentData?.units ?? [];

  const typeLabels: Record<PublicGovUnitType, string> = {
    country: t('gov.typeCountry'),
    ministry: t('gov.typeMinistry'),
    department: t('gov.typeDepartment'),
    division: t('gov.typeDivision'),
    office: t('gov.typeOffice'),
  };

  const selectedUnit =
    units.find((unit) => unit.id === selectedUnitId) ?? units[0];

  const childrenByParent = useMemo(() => {
    const groups: Record<string, PublicGovSnapshotUnit[]> = {};
    for (const unit of units) {
      if (!unit.parentId) continue;
      groups[unit.parentId] ??= [];
      groups[unit.parentId].push(unit);
    }
    return groups;
  }, [units]);

  const topLevelUnits = units.filter((unit) => !unit.parentId);

  const unitPromises = (promises ?? []).filter((promise) =>
    selectedUnit?.promiseCategories.includes(promise.category)
  );

  const deliveredCount = unitPromises.filter((promise) => promise.status === 'delivered').length;
  const inProgressCount = unitPromises.filter((promise) => promise.status === 'in_progress').length;
  const stalledCount = unitPromises.filter((promise) => promise.status === 'stalled').length;
  const verifiedCount = units.filter((unit) => unit.sourceMeta.sourceStatus === 'verified').length;

  const publicStats = [
    { label: t('gov.trackedOffices'), value: units.length.toString() },
    { label: t('gov.verifiedSources'), value: verifiedCount.toString() },
    { label: t('gov.promisesLinked'), value: unitPromises.length.toString() },
    { label: t('gov.deliveredOutcomes'), value: deliveredCount.toString() },
  ];

  if (!selectedUnit) {
    return (
      <div className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="glass-card flex min-h-[320px] items-center justify-center p-8 text-center">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-gray-500">
                {t('gov.govStructure')}
              </p>
              <p className="mt-3 text-lg text-white">
                {governmentLoading ? t('gov.loading') : t('gov.noData')}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="public-page">
      <PublicPageHero
        eyebrow={
          <>
            <ShieldCheck className="h-4 w-4" />
            {t('gov.whosResponsible')}
          </>
        }
        title={t('gov.pageTitle')}
        description={t('gov.pageDesc')}
        aside={
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-gray-500">{t('gov.verificationStatus')}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-400">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                {t('gov.lastChecked')}{' '}
                <span className="font-medium text-white">
                  {new Date(
                    governmentData?.checkedAt ??
                      selectedUnit.sourceMeta.checkedAt ??
                      new Date().toISOString()
                  ).toLocaleString()}
                </span>
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                {verifiedCount} of {units.length} {t('gov.sourcesVerified')}
              </span>
            </div>
          </div>
        }
        stats={
          publicStats.map((stat) => (
            <div key={stat.label} className="glass-card px-5 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500">{stat.label}</p>
              <p className="mt-2 text-3xl font-bold text-white">{stat.value}</p>
            </div>
          ))
        }
      />

      <div className="public-shell space-y-8">
        <div className="public-panel-grid">
          <div className="glass-card p-4">
            <div className="mb-3 px-2">
              <h2 className="text-lg font-semibold text-white">{t('gov.institutionTree')}</h2>
              <p className="mt-1 text-sm text-gray-500">{t('gov.browseDesc')}</p>
            </div>

            <div className="space-y-1">
              {topLevelUnits.map((unit) => (
                <TreeNode
                  key={unit.id}
                  unit={unit}
                  selectedId={selectedUnit.id}
                  onSelect={setSelectedUnitId}
                  childrenByParent={childrenByParent}
                  locale={locale}
                  t={t}
                  typeLabels={typeLabels}
                />
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass-card p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${typeStyles[selectedUnit.type]}`}>
                    {typeLabels[selectedUnit.type]}
                  </div>
                  <h2 className="mt-3 text-3xl font-display font-bold text-white">
                    {locale === 'ne' ? selectedUnit.nameNe : selectedUnit.name}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-400">
                    {locale === 'ne' ? selectedUnit.responsibilityNe : selectedUnit.responsibility}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-gray-300">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-500">{t('gov.leadResponsibility')}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <UserRound className="h-4 w-4 text-gray-400" />
                    <span>{locale === 'ne' ? selectedUnit.leadTitleNe : selectedUnit.leadTitle}</span>
                  </div>
                  <p className="mt-1 font-medium text-white">{locale === 'ne' ? selectedUnit.leadNameNe : selectedUnit.leadName}</p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-500">{t('gov.scope')}</p>
                  <p className="mt-2 text-sm text-white">{locale === 'ne' ? selectedUnit.scopeNe : selectedUnit.scope}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-500">{t('gov.promisesLinked')}</p>
                  <p className="mt-2 text-2xl font-bold text-white">{unitPromises.length}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-500">{t('gov.delivered')}</p>
                  <p className="mt-2 text-2xl font-bold text-white">{deliveredCount}</p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-gray-500">{t('gov.sourceCheck')}</p>
                    <div className="mt-2 flex items-center gap-2">
                      {selectedUnit.sourceMeta.sourceStatus === 'verified' ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <CircleAlert className="h-4 w-4 text-amber-400" />
                      )}
                      <p className="text-sm font-medium text-white">
                        {selectedUnit.sourceMeta.sourceStatus === 'verified'
                          ? t('gov.verified')
                          : t('gov.fallback')}
                      </p>
                    </div>
                  </div>
                  <a
                    href={selectedUnit.sourceMeta.fetchedFrom}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-gray-200 transition-colors hover:bg-white/[0.08]"
                  >
                    {t('gov.openSource')}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
                {(selectedUnit.sourceMeta.pageTitle || selectedUnit.sourceMeta.snippet) && (
                  <div className="mt-3 space-y-2">
                    {selectedUnit.sourceMeta.pageTitle && (
                      <p className="text-sm font-medium text-white">
                        {selectedUnit.sourceMeta.pageTitle}
                      </p>
                    )}
                    {selectedUnit.sourceMeta.snippet && (
                      <p className="text-sm leading-relaxed text-gray-400">
                        {selectedUnit.sourceMeta.snippet}
                      </p>
                    )}
                  </div>
                )}
                {selectedUnit.sourceMeta.matchedTerms.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedUnit.sourceMeta.matchedTerms.map((term) => (
                      <span
                        key={term}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-gray-300"
                      >
                        {term}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="glass-card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{t('gov.ownedWork')}</h3>
                    <p className="mt-1 text-sm text-gray-500">{t('gov.ownedWorkDesc')}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-300">
                    {unitPromises.length} {t('gov.items')}
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  {unitPromises.slice(0, 6).map((promise) => (
                    <Link
                      key={promise.id}
                      href={`/explore/first-100-days/${promise.slug}`}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 transition-colors hover:bg-white/[0.05]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{promise.title}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {promise.category} · {promise.progress}% {t('gov.progress')}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 flex-shrink-0 text-gray-500" />
                    </Link>
                  ))}

                  {unitPromises.length === 0 && (
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-5 text-sm text-gray-500">
                      {t('gov.noLinkedPromises')}
                    </div>
                  )}
                </div>
              </div>

              <div className="glass-card p-6">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <h3 className="text-lg font-semibold text-white">{t('gov.achievements')}</h3>
                </div>

                <div className="mt-5 space-y-3">
                  {selectedUnit.achievements.map((achievement) => (
                    <div
                      key={achievement.title}
                      className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-white">{achievement.title}</p>
                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${achievementStyles[achievement.status]}`}>
                          {achievement.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-gray-400">{achievement.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <div className="glass-card p-6">
                <div className="flex items-center gap-2">
                  <BriefcaseBusiness className="h-5 w-5 text-gray-300" />
                  <h3 className="text-lg font-semibold text-white">{t('gov.trackedResponsibilities')}</h3>
                </div>
                <ul className="mt-4 space-y-3 text-sm text-gray-400">
                  {selectedUnit.trackedProjects.map((item) => (
                    <li key={item} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="glass-card p-6">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-gray-300" />
                  <h3 className="text-lg font-semibold text-white">{t('gov.deliverySummary')}</h3>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 text-center">
                    <p className="text-xs uppercase tracking-[0.18em] text-gray-500">{t('gov.delivered')}</p>
                    <p className="mt-2 text-3xl font-bold text-white">{deliveredCount}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 text-center">
                    <p className="text-xs uppercase tracking-[0.18em] text-gray-500">{t('gov.inProgress')}</p>
                    <p className="mt-2 text-3xl font-bold text-white">{inProgressCount}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 text-center">
                    <p className="text-xs uppercase tracking-[0.18em] text-gray-500">{t('gov.stalled')}</p>
                    <p className="mt-2 text-3xl font-bold text-white">{stalledCount}</p>
                  </div>
                </div>

                <p className="mt-5 text-sm leading-relaxed text-gray-500">
                  {t('gov.publicResponsibility')}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card px-6 py-5">
          <p className="text-sm text-gray-400">
            {t('gov.totalPromisesTracked')}
            <span className="ml-2 font-semibold text-white">{stats?.total ?? 0}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
