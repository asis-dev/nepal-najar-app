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
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { useAllPromises, usePromiseStats } from '@/lib/hooks/use-promises';
import {
  publicGovUnits,
  type PublicGovUnit,
  type PublicGovUnitType,
} from '@/lib/data/government-accountability';

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
  unit: PublicGovUnit;
  selectedId: string;
  onSelect: (id: string) => void;
  childrenByParent: Record<string, PublicGovUnit[]>;
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
  const [selectedUnitId, setSelectedUnitId] = useState('country-nepal');

  const selectedUnit =
    publicGovUnits.find((unit) => unit.id === selectedUnitId) ?? publicGovUnits[0];

  const childrenByParent = useMemo(() => {
    const groups: Record<string, PublicGovUnit[]> = {};
    for (const unit of publicGovUnits) {
      if (!unit.parentId) continue;
      groups[unit.parentId] ??= [];
      groups[unit.parentId].push(unit);
    }
    return groups;
  }, []);

  const topLevelUnits = publicGovUnits.filter((unit) => !unit.parentId);

  const unitPromises = (promises ?? []).filter((promise) =>
    selectedUnit.promiseCategories.includes(promise.category)
  );

  const deliveredCount = unitPromises.filter((promise) => promise.status === 'delivered').length;
  const inProgressCount = unitPromises.filter((promise) => promise.status === 'in_progress').length;
  const stalledCount = unitPromises.filter((promise) => promise.status === 'stalled').length;

  const publicStats = [
    { label: 'Tracked offices', value: publicGovUnits.length.toString() },
    { label: 'Promises linked', value: unitPromises.length.toString() },
    { label: 'Delivered outcomes', value: deliveredCount.toString() },
    { label: 'In progress', value: inProgressCount.toString() },
  ];

  return (
    <div className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs uppercase tracking-[0.18em] text-gray-300">
            <ShieldCheck className="h-4 w-4" />
            Who&apos;s Responsible
          </div>
          <h1 className="text-4xl font-display font-bold tracking-tight text-white sm:text-5xl">
            Government structure, roles, and public delivery
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-400 sm:text-lg">
            See which ministry, department, division, or office owns each part of delivery, what they are responsible for, and what outcomes are already visible in public.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {publicStats.map((stat) => (
            <div key={stat.label} className="glass-card px-5 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500">{stat.label}</p>
              <p className="mt-2 text-3xl font-bold text-white">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.35fr]">
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
