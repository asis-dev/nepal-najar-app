import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  CheckCircle2,
  Clock,
  Circle,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import { createMetadata } from '@/lib/seo';
import {
  getPublicPromises,
  getPromisesByStatus,
  categoryToSlug,
  CATEGORIES,
  CATEGORY_NE,
  STATUSES,
  STATUS_META,
  computeStats,
} from '@/lib/seo/seo-helpers';
import { type GovernmentPromise, type PromiseCategory } from '@/lib/data/promises';

/* ───────────────────────── config ───────────────────────── */

const STATUS_CONFIG = {
  not_started: { icon: Circle, color: 'text-gray-400', dot: 'bg-gray-400', border: 'border-gray-600', accent: 'gray' },
  in_progress: { icon: Clock, color: 'text-blue-400', dot: 'bg-blue-500', border: 'border-blue-600', accent: 'blue' },
  delivered: { icon: CheckCircle2, color: 'text-green-400', dot: 'bg-green-500', border: 'border-green-600', accent: 'green' },
  stalled: { icon: AlertTriangle, color: 'text-red-400', dot: 'bg-red-500', border: 'border-red-600', accent: 'red' },
} as const;

type StatusKey = keyof typeof STATUS_CONFIG;

/* ───────────────────────── static params ───────────────────────── */

export async function generateStaticParams() {
  return STATUSES.map((status) => ({ status }));
}

/* ───────────────────────── metadata ───────────────────────── */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ status: string }>;
}): Promise<Metadata> {
  const { status } = await params;
  const meta = STATUS_META[status];
  if (!meta) return createMetadata({ title: 'Status Not Found' });

  const commitments = getPromisesByStatus(status);
  const year = new Date().getFullYear();
  const title = `${meta.label} Government Commitments — Nepal Republic ${year}`;
  const description = `${meta.description}. ${commitments.length} commitments currently ${meta.label.toLowerCase()}.`;

  return createMetadata({
    title,
    description,
    path: `/status/${status}`,
  });
}

/* ───────────────────────── JSON-LD ───────────────────────── */

function StatusJsonLd({ status, commitments }: { status: string; commitments: GovernmentPromise[] }) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nepalrepublic.org';
  const meta = STATUS_META[status];
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${meta?.label ?? status} Government Commitments — Nepal`,
    description: meta?.description,
    url: `${siteUrl}/status/${status}`,
    numberOfItems: commitments.length,
    itemListElement: commitments.slice(0, 20).map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.title,
      url: `${siteUrl}/track/${categoryToSlug(c.category)}/${c.slug}`,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/* ───────────────────────── page ───────────────────────── */

export default async function StatusPage({
  params,
}: {
  params: Promise<{ status: string }>;
}) {
  const { status } = await params;

  if (!STATUSES.includes(status as StatusKey)) notFound();

  const meta = STATUS_META[status];
  const config = STATUS_CONFIG[status as StatusKey];
  const commitments = getPromisesByStatus(status);
  const allPublic = getPublicPromises();
  const allStats = computeStats(allPublic);
  const stats = computeStats(commitments);
  const StatusIcon = config.icon;
  const year = new Date().getFullYear();

  // Group by category
  const byCategory = new Map<PromiseCategory, GovernmentPromise[]>();
  for (const c of commitments) {
    const list = byCategory.get(c.category) || [];
    list.push(c);
    byCategory.set(c.category, list);
  }
  // Sort categories by count descending
  const sortedCategories = Array.from(byCategory.entries()).sort(
    (a, b) => b[1].length - a[1].length
  );

  // Average progress
  const avgProgress =
    commitments.length > 0
      ? Math.round(commitments.reduce((sum, c) => sum + (c.progress ?? 0), 0) / commitments.length)
      : 0;

  return (
    <>
      <StatusJsonLd status={status} commitments={commitments} />

      <div className="min-h-screen bg-gray-950">
        {/* Breadcrumb */}
        <div className="border-b border-gray-800 bg-gray-900">
          <div className="mx-auto max-w-4xl px-4 py-3">
            <nav className="flex items-center gap-1 text-sm text-gray-400">
              <Link href="/" className="hover:text-gray-100">Home</Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <Link href="/explore/first-100-days" className="hover:text-gray-100">Commitments</Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-gray-100">{meta.label}</span>
            </nav>
          </div>
        </div>

        <div className="mx-auto max-w-4xl px-4 py-8">
          {/* Hero */}
          <header className="mb-8">
            <div className="mb-4 inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-4 py-3">
              <StatusIcon className={`h-8 w-8 ${config.color}`} />
            </div>
            <h1 className="mb-2 text-3xl font-bold text-white sm:text-4xl">
              {meta.label} Government Commitments {year}
            </h1>
            <p className="mb-1 text-lg text-gray-400">{meta.labelNe}</p>
            <p className="leading-relaxed text-gray-300">{meta.description}</p>
          </header>

          {/* Stats bar */}
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-gray-700 bg-gray-900 p-4 text-center shadow-sm">
              <p className="text-3xl font-bold text-white">{commitments.length}</p>
              <p className="text-xs text-gray-400">Commitments</p>
            </div>
            <div className="rounded-2xl border border-gray-700 bg-gray-900 p-4 text-center">
              <p className="text-3xl font-bold text-white">{avgProgress}%</p>
              <p className="text-xs text-gray-400">Avg Progress</p>
            </div>
            <div className="rounded-2xl border border-gray-700 bg-gray-900 p-4 text-center">
              <p className="text-3xl font-bold text-white">{sortedCategories.length}</p>
              <p className="text-xs text-gray-400">Sectors</p>
            </div>
            <div className="rounded-2xl border border-gray-700 bg-gray-900 p-4 text-center">
              <p className="text-3xl font-bold text-white">
                {allStats.total > 0 ? Math.round((commitments.length / allStats.total) * 100) : 0}%
              </p>
              <p className="text-xs text-gray-400">of All Commitments</p>
            </div>
          </div>

          {/* Category breakdown */}
          <div className="mb-8 rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-white">
              <BarChart3 className="h-5 w-5 text-blue-400" />
              Category Breakdown
            </h2>
            <div className="space-y-3">
              {sortedCategories.map(([category, items]) => {
                const pct = Math.round((items.length / commitments.length) * 100);
                return (
                  <div key={category}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <Link
                        href={`/sectors/${categoryToSlug(category)}`}
                        className="font-medium text-gray-200 hover:text-blue-400"
                      >
                        {category}
                      </Link>
                      <span className="text-gray-400">
                        {items.length} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-700">
                      <div
                        className={`h-full rounded-full ${
                          status === 'delivered'
                            ? 'bg-green-500'
                            : status === 'in_progress'
                              ? 'bg-blue-500'
                              : status === 'stalled'
                                ? 'bg-red-500'
                                : 'bg-gray-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Commitments grouped by category */}
          {sortedCategories.map(([category, items]) => (
            <section key={category} className="mb-6">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-white">
                <span className="text-gray-400">{CATEGORY_NE[category]}</span>
                <span>{category}</span>
                <span className="ml-1 rounded-full bg-gray-800 px-2 py-0.5 text-sm font-normal text-gray-400">
                  {items.length}
                </span>
                <Link
                  href={`/sectors/${categoryToSlug(category)}/${status}`}
                  className="ml-auto text-xs text-blue-400 hover:text-blue-300"
                >
                  View sector × status
                </Link>
              </h2>
              <div className="space-y-2">
                {items.map((commitment) => (
                  <Link
                    key={commitment.slug}
                    href={`/track/${categoryToSlug(commitment.category)}/${commitment.slug}`}
                    className={`group flex items-start gap-3 rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 transition-all hover:border-blue-700 hover:shadow-sm border-l-4 ${config.border}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white group-hover:text-blue-400 line-clamp-1">
                        {commitment.title}
                      </p>
                      {commitment.description && (
                        <p className="mt-0.5 text-xs text-gray-400 line-clamp-1">
                          {commitment.description}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      {/* Progress bar */}
                      <div className="hidden sm:flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-700">
                          <div
                            className={`h-full rounded-full ${
                              status === 'delivered'
                                ? 'bg-green-500'
                                : status === 'in_progress'
                                  ? 'bg-blue-500'
                                  : status === 'stalled'
                                    ? 'bg-red-500'
                                    : 'bg-gray-500'
                            }`}
                            style={{ width: `${commitment.progress ?? 0}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">{commitment.progress ?? 0}%</span>
                      <ChevronRight className="h-4 w-4 text-gray-600 group-hover:text-blue-400" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}

          {/* Other statuses */}
          <section className="mb-8">
            <h2 className="mb-4 text-xl font-bold text-white">Other Statuses</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {STATUSES.filter((s) => s !== status).map((s) => {
                const sMeta = STATUS_META[s];
                const sConf = STATUS_CONFIG[s];
                const sCount = getPromisesByStatus(s).length;
                const SIcon = sConf.icon;
                return (
                  <Link
                    key={s}
                    href={`/status/${s}`}
                    className="group flex items-center gap-3 rounded-xl border border-gray-700 bg-gray-900 p-3 transition-all hover:border-gray-600 hover:shadow-sm"
                  >
                    <SIcon className={`h-5 w-5 ${sConf.color}`} />
                    <div>
                      <p className="text-sm font-medium text-white">{sMeta.label}</p>
                      <p className="text-xs text-gray-400">{sCount} commitments</p>
                    </div>
                    <ChevronRight className="ml-auto h-3.5 w-3.5 text-gray-600 group-hover:text-gray-400" />
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Footer */}
          <div className="border-t border-gray-700 pt-4">
            <p className="text-xs text-gray-500">
              {commitments.length} {meta.label.toLowerCase()} commitments tracked from RSP "बाचा पत्र 2082" (Citizen Contract).{' '}
              <Link href="/how-it-works" className="underline hover:text-gray-300">
                How we track
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
