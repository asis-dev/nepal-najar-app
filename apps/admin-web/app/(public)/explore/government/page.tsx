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
import type { PublicGovSnapshotUnit } from '@/lib/org-structure/engine';
import type { PublicGovUnitType } from '@/lib/data/government-accountability';

const typeLabels: Record<PublicGovUnitType, string> = {
  country: 'Government',
  ministry: 'Ministry',
  department: 'Department',
  division: 'Division',
  office: 'Office',
};

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
}: {
  unit: PublicGovSnapshotUnit;
  selectedId: string;
  onSelect: (id: string) => void;
  childrenByParent: Record<string, PublicGovSnapshotUnit[]>;
  level?: number;
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
          <p className="truncate text-sm font-medium">{unit.name}</p>
          <p className="truncate text-xs text-gray-500">{unit.leadTitle}</p>
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
          />
        ))}
    </div>
  );
}

export default function GovernmentPublicPage() {
  const { data: promises } = useAllPromises();
  const { stats } = usePromiseStats();
  const { data: governmentData, isLoading: governmentLoading } = useGovernmentStructure();
  const [selectedUnitId, setSelectedUnitId] = useState('country-nepal');
  const units = governmentData?.units ?? [];

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
    { label: 'Tracked offices', value: units.length.toString() },
    { label: 'Verified sources', value: verifiedCount.toString() },
    { label: 'Promises linked', value: unitPromises.length.toString() },
    { label: 'Delivered outcomes', value: deliveredCount.toString() },
  ];

  if (!selectedUnit) {
    return (
      <div className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="glass-card flex min-h-[320px] items-center justify-center p-8 text-center">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-gray-500">
                Government structure
              </p>
              <p className="mt-3 text-lg text-white">
                {governmentLoading ? 'Loading verified government structure...' : 'No government structure data available yet.'}
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
            Who&apos;s Responsible
          </>
        }
        title="Government structure, roles, and public delivery"
        description="See which ministry, department, division, or office owns each part of delivery, what they are responsible for, and what outcomes are already visible in public."
        aside={
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Verification status</p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-400">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                Last checked{' '}
                <span className="font-medium text-white">
                  {new Date(
                    governmentData?.checkedAt ??
                      selectedUnit.sourceMeta.checkedAt ??
                      new Date().toISOString()
                  ).toLocaleString()}
                </span>
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                {verifiedCount} of {units.length} sources verified from official pages
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
              <h2 className="text-lg font-semibold text-white">Institution tree</h2>
              <p className="mt-1 text-sm text-gray-500">Browse from government level down to office ownership.</p>
            </div>

            <div className="space-y-1">
              {topLevelUnits.map((unit) => (
                <TreeNode
                  key={unit.id}
                  unit={unit}
                  selectedId={selectedUnit.id}
                  onSelect={setSelectedUnitId}
                  childrenByParent={childrenByParent}
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
                    {selectedUnit.name}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-400">
                    {selectedUnit.responsibility}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-gray-300">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Lead responsibility</p>
                  <div className="mt-2 flex items-center gap-2">
                    <UserRound className="h-4 w-4 text-gray-400" />
                    <span>{selectedUnit.leadTitle}</span>
                  </div>
                  <p className="mt-1 font-medium text-white">{selectedUnit.leadName}</p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Scope</p>
                  <p className="mt-2 text-sm text-white">{selectedUnit.scope}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Promises linked</p>
                  <p className="mt-2 text-2xl font-bold text-white">{unitPromises.length}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Delivered</p>
                  <p className="mt-2 text-2xl font-bold text-white">{deliveredCount}</p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Official source check</p>
                    <div className="mt-2 flex items-center gap-2">
                      {selectedUnit.sourceMeta.sourceStatus === 'verified' ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <CircleAlert className="h-4 w-4 text-amber-400" />
                      )}
                      <p className="text-sm font-medium text-white">
                        {selectedUnit.sourceMeta.sourceStatus === 'verified'
                          ? 'Verified against official public source'
                          : 'Using curated fallback until source verification succeeds'}
                      </p>
                    </div>
                  </div>
                  <a
                    href={selectedUnit.sourceMeta.fetchedFrom}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-gray-200 transition-colors hover:bg-white/[0.08]"
                  >
                    Open source
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
                    <h3 className="text-lg font-semibold text-white">Owned work</h3>
                    <p className="mt-1 text-sm text-gray-500">Promises and tracked work currently tied to this institution.</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-300">
                    {unitPromises.length} items
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
                          {promise.category} · {promise.progress}% progress
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 flex-shrink-0 text-gray-500" />
                    </Link>
                  ))}

                  {unitPromises.length === 0 && (
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-5 text-sm text-gray-500">
                      No linked public promises are mapped to this office yet.
                    </div>
                  )}
                </div>
              </div>

              <div className="glass-card p-6">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <h3 className="text-lg font-semibold text-white">What this office has achieved</h3>
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
                  <h3 className="text-lg font-semibold text-white">Tracked responsibilities</h3>
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
                  <h3 className="text-lg font-semibold text-white">Delivery summary</h3>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 text-center">
                    <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Delivered</p>
                    <p className="mt-2 text-3xl font-bold text-white">{deliveredCount}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 text-center">
                    <p className="text-xs uppercase tracking-[0.18em] text-gray-500">In progress</p>
                    <p className="mt-2 text-3xl font-bold text-white">{inProgressCount}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 text-center">
                    <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Stalled</p>
                    <p className="mt-2 text-3xl font-bold text-white">{stalledCount}</p>
                  </div>
                </div>

                <p className="mt-5 text-sm leading-relaxed text-gray-500">
                  Public responsibility is shown by institution, not as a personal score. This page is meant to clarify ownership, ongoing work, and visible outcomes.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card px-6 py-5">
          <p className="text-sm text-gray-400">
            Total public promises currently tracked across Nepal Najar:
            <span className="ml-2 font-semibold text-white">{stats?.total ?? 0}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
