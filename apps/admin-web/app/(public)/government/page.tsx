import Link from 'next/link';
import type { Metadata } from 'next';
import { Building2, ChevronRight, Users, TrendingUp, CheckCircle2, Globe } from 'lucide-react';
import { createMetadata } from '@/lib/seo';
import {
  publicGovUnits,
  type PublicGovUnit,
  type PublicGovUnitType,
} from '@/lib/data/government-accountability';
import {
  promises,
  getPromisesByCategory,
  type GovernmentPromise,
} from '@/lib/data/promises';

export const metadata: Metadata = createMetadata({
  title: 'Nepal Government Bodies — Ministries & Accountability',
  description:
    'Track all Nepal government ministries and bodies on commitment delivery. See performance scores, leadership, and policy progress across all departments.',
  path: '/government',
});

const TYPE_LABELS: Record<PublicGovUnitType, string> = {
  country: 'National Government',
  ministry: 'Ministry',
  department: 'Department',
  division: 'Division',
  office: 'Office',
};

const TYPE_ORDER: PublicGovUnitType[] = ['country', 'ministry', 'department', 'division', 'office'];

function getUnitCommitments(unit: PublicGovUnit): GovernmentPromise[] {
  const allForCategories = unit.promiseCategories.flatMap((cat) =>
    getPromisesByCategory(cat)
  );
  const seen = new Set<string>();
  return allForCategories.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return p.isPublic !== false;
  });
}

function computeScore(commitments: GovernmentPromise[]): number {
  if (commitments.length === 0) return 0;
  return Math.round(commitments.reduce((sum, c) => sum + c.progress, 0) / commitments.length);
}

function GovernmentJsonLd() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nepalnajar.com';
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Nepal Government Bodies — Accountability Tracker',
    description: 'All Nepal government ministries and bodies tracked for commitment delivery.',
    url: `${siteUrl}/government`,
    about: {
      '@type': 'GovernmentOrganization',
      name: 'Government of Nepal',
      areaServed: { '@type': 'Country', name: 'Nepal' },
    },
    hasPart: publicGovUnits.map((u) => ({
      '@type': 'WebPage',
      name: u.name,
      url: `${siteUrl}/government/${u.id}`,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export default function GovernmentIndexPage() {
  // Pre-compute stats for each unit
  const unitsWithStats = publicGovUnits.map((unit) => {
    const commitments = getUnitCommitments(unit);
    const score = computeScore(commitments);
    const delivered = commitments.filter((c) => c.status === 'delivered').length;
    const inProgress = commitments.filter((c) => c.status === 'in_progress').length;
    return { unit, commitments, score, delivered, inProgress };
  });

  // Group by type
  const grouped = TYPE_ORDER.reduce<Record<string, typeof unitsWithStats>>(
    (acc, type) => {
      acc[type] = unitsWithStats.filter((u) => u.unit.type === type);
      return acc;
    },
    {}
  );

  const totalUnits = publicGovUnits.length;
  const topUnits = [...unitsWithStats].sort((a, b) => b.score - a.score).slice(0, 3);

  const year = new Date().getFullYear();

  return (
    <>
      <GovernmentJsonLd />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* Hero */}
        <div className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="mx-auto max-w-4xl px-4 py-10">
            <p className="mb-2 text-sm font-medium text-blue-600 dark:text-blue-400">Nepal Najar · Government Tracker</p>
            <h1 className="mb-3 text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
              Nepal Government Bodies {year}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Tracking {totalUnits} government bodies on commitment delivery — ministries, departments, and national offices.
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-4xl px-4 py-8">
          {/* Top performers */}
          {topUnits.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Top Performing Bodies
              </h2>
              <div className="grid gap-3 sm:grid-cols-3">
                {topUnits.map(({ unit, score, delivered, commitments }) => (
                  <Link
                    key={unit.id}
                    href={`/government/${unit.id}`}
                    className="group rounded-2xl border border-gray-200 bg-white p-4 transition-all hover:border-green-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:hover:border-green-700"
                  >
                    <Building2 className="mb-2 h-5 w-5 text-indigo-500" />
                    <p className="mb-1 font-semibold text-gray-900 text-sm group-hover:text-green-700 dark:text-white dark:group-hover:text-green-400 line-clamp-2">
                      {unit.name}
                    </p>
                    <div className="flex items-end justify-between">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {delivered}/{commitments.length} delivered
                      </p>
                      <p className="text-xl font-bold text-green-600 dark:text-green-400">{score}%</p>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-green-500"
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Grouped by type */}
          {TYPE_ORDER.map((type) => {
            const units = grouped[type];
            if (!units || units.length === 0) return null;
            return (
              <section key={type} className="mb-8">
                <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
                  {TYPE_LABELS[type]}
                  <span className="ml-2 text-sm font-normal text-gray-400">({units.length})</span>
                </h2>
                <div className="space-y-2">
                  {units.map(({ unit, score, delivered, inProgress, commitments }) => (
                    <Link
                      key={unit.id}
                      href={`/government/${unit.id}`}
                      className="group flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-indigo-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:hover:border-indigo-700"
                    >
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900">
                        <Building2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-gray-900 group-hover:text-indigo-700 dark:text-white dark:group-hover:text-indigo-400">
                              {unit.name}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{unit.nameNe}</p>
                          </div>
                          {commitments.length > 0 && (
                            <div className="flex-shrink-0 text-right">
                              <p className="text-lg font-bold text-gray-900 dark:text-white">{score}%</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">progress</p>
                            </div>
                          )}
                        </div>

                        {commitments.length > 0 && (
                          <div className="mt-2">
                            <div className="mb-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-green-500"
                                style={{ width: `${score}%` }}
                              />
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                                {delivered} delivered
                              </span>
                              {inProgress > 0 && (
                                <span>{inProgress} in progress</span>
                              )}
                              <span>{commitments.length} total</span>
                            </div>
                          </div>
                        )}

                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
                          {unit.responsibility}
                        </p>

                        {unit.leadName && (
                          <p className="mt-1 flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                            <Users className="h-3 w-3" />
                            {unit.leadName} · {unit.leadTitle}
                          </p>
                        )}
                      </div>

                      <ChevronRight className="mt-1 h-4 w-4 flex-shrink-0 text-gray-400 group-hover:text-indigo-500" />
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}

          {/* CTA */}
          <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 p-6 text-white">
            <h2 className="mb-2 text-lg font-bold">Full Accountability Report</h2>
            <p className="mb-4 text-sm text-indigo-100">
              Get a comprehensive breakdown of government performance, sector by sector.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/report-card"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors"
              >
                View Report Card
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Link
                href="/sectors"
                className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
              >
                Browse by Sector
              </Link>
            </div>
          </div>

          <div className="mt-6 border-t border-gray-200 pt-4 dark:border-gray-700">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Data sourced from official government publications and Nepal Najar intelligence network.{' '}
              <Link href="/how-it-works" className="underline hover:text-gray-600 dark:hover:text-gray-300">
                How we track
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
