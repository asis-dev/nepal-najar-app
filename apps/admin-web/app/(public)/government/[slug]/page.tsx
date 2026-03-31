import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  Building2,
  Users,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Clock,
  Circle,
  AlertTriangle,
  ChevronRight,
  Globe,
  Briefcase,
  TrendingUp,
} from 'lucide-react';
import { createMetadata } from '@/lib/seo';
import {
  publicGovUnits,
  type PublicGovUnit,
} from '@/lib/data/government-accountability';
import {
  promises,
  getPromisesByCategory,
  CATEGORY_NE,
  type GovernmentPromise,
  type PromiseCategory,
} from '@/lib/data/promises';

/* ───────────────────────── helpers ───────────────────────── */

function unitSlug(unit: PublicGovUnit): string {
  return unit.id;
}

const STATUS_CONFIG = {
  not_started: { label: 'Not Started', icon: Circle, color: 'text-gray-400' },
  in_progress: { label: 'In Progress', icon: Clock, color: 'text-blue-600' },
  delivered: { label: 'Delivered', icon: CheckCircle2, color: 'text-green-600' },
  stalled: { label: 'Stalled', icon: AlertTriangle, color: 'text-red-600' },
} as const;

function categoryToSlug(cat: PromiseCategory): string {
  return cat.toLowerCase().replace(/\s+/g, '-');
}

function getUnitCommitments(unit: PublicGovUnit): GovernmentPromise[] {
  const allForCategories = unit.promiseCategories.flatMap((cat) =>
    getPromisesByCategory(cat)
  );
  // dedupe
  const seen = new Set<string>();
  return allForCategories.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return p.isPublic !== false;
  });
}

function computeScore(commitments: GovernmentPromise[]): number {
  if (commitments.length === 0) return 0;
  const avg = commitments.reduce((sum, c) => sum + c.progress, 0) / commitments.length;
  return Math.round(avg);
}

/* ───────────────────────── static params ───────────────────────── */

export async function generateStaticParams() {
  return publicGovUnits.map((unit) => ({ slug: unitSlug(unit) }));
}

/* ───────────────────────── metadata ───────────────────────── */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const unit = publicGovUnits.find((u) => u.id === slug);

  if (!unit) return createMetadata({ title: 'Ministry Not Found' });

  const title = `${unit.name} Nepal — Commitments & Performance`;
  const description = `Track all government commitments under ${unit.name} (${unit.nameNe}). ${unit.responsibility.slice(0, 120)}`;

  return createMetadata({
    title,
    description,
    path: `/government/${slug}`,
  });
}

/* ───────────────────────── JSON-LD ───────────────────────── */

function GovUnitJsonLd({ unit, commitments }: { unit: PublicGovUnit; commitments: GovernmentPromise[] }) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nepalnajar.com';
  const delivered = commitments.filter((c) => c.status === 'delivered').length;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'GovernmentOrganization',
    name: unit.name,
    alternateName: unit.nameNe,
    description: unit.responsibility,
    url: `${siteUrl}/government/${unit.id}`,
    sameAs: unit.sourceUrl,
    numberOfEmployees: undefined,
    areaServed: { '@type': 'Country', name: 'Nepal' },
    knowsAbout: unit.promiseCategories.join(', '),
    potentialAction: {
      '@type': 'ViewAction',
      name: `View ${unit.name} Commitments`,
      target: `${siteUrl}/government/${unit.id}`,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/* ───────────────────────── page ───────────────────────── */

export default async function GovernmentUnitPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const unit = publicGovUnits.find((u) => u.id === slug);
  if (!unit) notFound();

  const parentUnit = unit.parentId
    ? publicGovUnits.find((u) => u.id === unit.parentId)
    : null;

  const childUnits = publicGovUnits.filter((u) => u.parentId === unit.id);

  const commitments = getUnitCommitments(unit);
  const score = computeScore(commitments);
  const delivered = commitments.filter((c) => c.status === 'delivered').length;
  const inProgress = commitments.filter((c) => c.status === 'in_progress').length;
  const notStarted = commitments.filter((c) => c.status === 'not_started').length;
  const stalled = commitments.filter((c) => c.status === 'stalled').length;

  return (
    <>
      <GovUnitJsonLd unit={unit} commitments={commitments} />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* Breadcrumb */}
        <div className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="mx-auto max-w-4xl px-4 py-3">
            <nav className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
              <Link href="/" className="hover:text-gray-900 dark:hover:text-gray-100">Home</Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <Link href="/explore/government" className="hover:text-gray-900 dark:hover:text-gray-100">Government</Link>
              {parentUnit && (
                <>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <Link
                    href={`/government/${parentUnit.id}`}
                    className="hover:text-gray-900 dark:hover:text-gray-100"
                  >
                    {parentUnit.name}
                  </Link>
                </>
              )}
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-gray-900 dark:text-gray-100">{unit.name}</span>
            </nav>
          </div>
        </div>

        <div className="mx-auto max-w-4xl px-4 py-8">
          {/* Header */}
          <header className="mb-8">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium capitalize text-indigo-700 ring-1 ring-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:ring-indigo-800">
              <Building2 className="h-3.5 w-3.5" />
              {unit.type}
            </div>
            <h1 className="mb-1 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">{unit.name}</h1>
            <p className="mb-3 text-lg text-gray-500 dark:text-gray-400">{unit.nameNe}</p>
            <p className="leading-relaxed text-gray-700 dark:text-gray-300">{unit.responsibility}</p>
            {unit.sourceUrl && (
              <a
                href={unit.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
              >
                <Globe className="h-3.5 w-3.5" />
                Official Website
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </header>

          {/* Leadership */}
          <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
              <Users className="h-5 w-5 text-indigo-500" />
              Leadership
            </h2>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900">
                <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{unit.leadName}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{unit.leadTitle}</p>
                <p className="text-sm text-gray-400 dark:text-gray-500">{unit.leadTitleNe}</p>
              </div>
            </div>
          </div>

          {/* Performance overview */}
          <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Performance Overview
            </h2>
            <div className="mb-4">
              <div className="mb-1 flex items-end justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Average Progress</span>
                <span className="text-3xl font-bold text-gray-900 dark:text-white">{score}%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all"
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div>
                <p className="text-xl font-bold text-green-600">{delivered}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Delivered</p>
              </div>
              <div>
                <p className="text-xl font-bold text-blue-600">{inProgress}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">In Progress</p>
              </div>
              <div>
                <p className="text-xl font-bold text-gray-400">{notStarted}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Not Started</p>
              </div>
              <div>
                <p className="text-xl font-bold text-red-500">{stalled}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Stalled</p>
              </div>
            </div>
          </div>

          {/* Scope & categories */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Scope</h3>
              <p className="text-gray-900 dark:text-white">{unit.scope}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{unit.scopeNe}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Sectors</h3>
              <div className="flex flex-wrap gap-1.5">
                {unit.promiseCategories.map((cat) => (
                  <Link
                    key={cat}
                    href={`/sectors/${categoryToSlug(cat)}`}
                    className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300"
                  >
                    {cat}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Child units */}
          {childUnits.length > 0 && (
            <section className="mb-6">
              <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">Departments & Offices</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {childUnits.map((child) => (
                  <Link
                    key={child.id}
                    href={`/government/${child.id}`}
                    className="group flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-indigo-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:hover:border-indigo-700"
                  >
                    <Building2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-indigo-500" />
                    <div>
                      <p className="font-medium text-gray-900 text-sm group-hover:text-indigo-700 dark:text-white dark:group-hover:text-indigo-400">
                        {child.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{child.type}</p>
                    </div>
                    <ChevronRight className="ml-auto h-4 w-4 flex-shrink-0 text-gray-400 group-hover:text-indigo-500" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Commitments list */}
          {commitments.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
                Commitments ({commitments.length})
              </h2>
              <div className="space-y-3">
                {commitments.slice(0, 12).map((commitment) => {
                  const s = STATUS_CONFIG[commitment.status];
                  const SIcon = s.icon;
                  return (
                    <Link
                      key={commitment.slug}
                      href={`/track/${categoryToSlug(commitment.category)}/${commitment.slug}`}
                      className="group flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-blue-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:hover:border-blue-700"
                    >
                      <SIcon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${s.color}`} />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 text-sm group-hover:text-blue-700 dark:text-white dark:group-hover:text-blue-400">
                          {commitment.title}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{commitment.title_ne}</p>
                        <div className="mt-2 flex items-center gap-3">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-green-500"
                              style={{ width: `${commitment.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{commitment.progress}%</span>
                        </div>
                      </div>
                      <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400 group-hover:text-blue-500" />
                    </Link>
                  );
                })}
              </div>
              {commitments.length > 12 && (
                <div className="mt-4 text-center">
                  <Link
                    href="/explore/first-100-days"
                    className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400"
                  >
                    View all {commitments.length} commitments
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </section>
          )}

          {/* Tracked projects */}
          {unit.trackedProjects.length > 0 && (
            <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
                <Briefcase className="h-5 w-5 text-purple-500" />
                Key Projects
              </h2>
              <ul className="space-y-2">
                {unit.trackedProjects.map((project) => (
                  <li key={project} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-400" />
                    {project}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* CTA */}
          <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 p-6 text-white">
            <h2 className="mb-2 text-lg font-bold">Stay Informed</h2>
            <p className="mb-4 text-indigo-100 text-sm">
              Get daily briefings on {unit.name} progress and accountability signals.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/explore/government"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors"
              >
                Government Overview
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/report-card"
                className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
              >
                Full Report Card
              </Link>
            </div>
          </div>

          <div className="mt-6 border-t border-gray-200 pt-4 dark:border-gray-700">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Data sourced from official government publications and Nepal Najar intelligence network.{' '}
              <a
                href={unit.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-gray-600"
              >
                Official source
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
