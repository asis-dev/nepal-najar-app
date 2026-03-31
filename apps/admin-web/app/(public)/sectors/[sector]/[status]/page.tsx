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
} from 'lucide-react';
import { createMetadata } from '@/lib/seo';
import {
  getPublicPromises,
  getPromisesByStatus,
  getPromisesBySector,
  categoryToSlug,
  slugToCategory,
  CATEGORIES,
  CATEGORY_NE,
  STATUSES,
  STATUS_META,
  computeStats,
} from '@/lib/seo/seo-helpers';
import { type GovernmentPromise, type PromiseCategory } from '@/lib/data/promises';

/* ───────────────────────── config ───────────────────────── */

const STATUS_CONFIG = {
  not_started: { icon: Circle, color: 'text-gray-400', dot: 'bg-gray-400', border: 'border-gray-600', barColor: 'bg-gray-500' },
  in_progress: { icon: Clock, color: 'text-blue-400', dot: 'bg-blue-500', border: 'border-blue-600', barColor: 'bg-blue-500' },
  delivered: { icon: CheckCircle2, color: 'text-green-400', dot: 'bg-green-500', border: 'border-green-600', barColor: 'bg-green-500' },
  stalled: { icon: AlertTriangle, color: 'text-red-400', dot: 'bg-red-500', border: 'border-red-600', barColor: 'bg-red-500' },
} as const;

type StatusKey = keyof typeof STATUS_CONFIG;

/* ───────────────────────── static params ───────────────────────── */

export async function generateStaticParams() {
  const params: { sector: string; status: string }[] = [];
  for (const cat of CATEGORIES) {
    for (const status of STATUSES) {
      params.push({ sector: categoryToSlug(cat), status });
    }
  }
  return params;
}

/* ───────────────────────── metadata ───────────────────────── */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sector: string; status: string }>;
}): Promise<Metadata> {
  const { sector, status } = await params;
  const category = slugToCategory(sector);
  const statusMeta = STATUS_META[status];

  if (!category || !statusMeta) return createMetadata({ title: 'Not Found' });

  const year = new Date().getFullYear();
  const commitments = getPromisesBySector(category).filter((p) => p.status === status);
  const title = `${statusMeta.label} ${category} Commitments — Nepal ${year}`;
  const description = `${commitments.length} ${category.toLowerCase()} commitments that are ${statusMeta.label.toLowerCase()}. ${statusMeta.description}.`;

  return createMetadata({
    title,
    description,
    path: `/sectors/${sector}/${status}`,
  });
}

/* ───────────────────────── JSON-LD ───────────────────────── */

function SectorStatusJsonLd({
  category,
  status,
  commitments,
}: {
  category: PromiseCategory;
  status: string;
  commitments: GovernmentPromise[];
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nepalrepublic.org';
  const statusMeta = STATUS_META[status];
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${statusMeta?.label} ${category} Commitments — Nepal`,
    description: `${category} government commitments that are ${statusMeta?.label.toLowerCase()}`,
    url: `${siteUrl}/sectors/${categoryToSlug(category)}/${status}`,
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

export default async function SectorStatusPage({
  params,
}: {
  params: Promise<{ sector: string; status: string }>;
}) {
  const { sector, status } = await params;

  const category = slugToCategory(sector);
  if (!category || !STATUSES.includes(status as StatusKey)) notFound();

  const statusMeta = STATUS_META[status];
  const config = STATUS_CONFIG[status as StatusKey];
  const sectorCommitments = getPromisesBySector(category);
  const commitments = sectorCommitments.filter((p) => p.status === status);
  const sectorStats = computeStats(sectorCommitments);
  const StatusIcon = config.icon;
  const year = new Date().getFullYear();

  // Average progress for filtered set
  const avgProgress =
    commitments.length > 0
      ? Math.round(commitments.reduce((sum, c) => sum + (c.progress ?? 0), 0) / commitments.length)
      : 0;

  // Status breakdown for the sector (to show context)
  const statusBreakdown = STATUSES.map((s) => ({
    status: s,
    label: STATUS_META[s].label,
    count: sectorCommitments.filter((c) => c.status === s).length,
    config: STATUS_CONFIG[s],
    active: s === status,
  }));

  return (
    <>
      <SectorStatusJsonLd category={category} status={status} commitments={commitments} />

      <div className="min-h-screen bg-gray-950">
        {/* Breadcrumb */}
        <div className="border-b border-gray-800 bg-gray-900">
          <div className="mx-auto max-w-4xl px-4 py-3">
            <nav className="flex items-center gap-1 text-sm text-gray-400">
              <Link href="/" className="hover:text-gray-100">Home</Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <Link href="/explore/first-100-days" className="hover:text-gray-100">Commitments</Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <Link href={`/sectors/${sector}`} className="hover:text-gray-100">{category}</Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-gray-100">{statusMeta.label}</span>
            </nav>
          </div>
        </div>

        <div className="mx-auto max-w-4xl px-4 py-8">
          {/* Hero */}
          <header className="mb-8">
            <div className="mb-4 inline-flex items-center gap-3 rounded-2xl bg-gray-900 px-4 py-3">
              <StatusIcon className={`h-7 w-7 ${config.color}`} />
            </div>
            <h1 className="mb-2 text-3xl font-bold text-white sm:text-4xl">
              {statusMeta.label} {category} Commitments {year}
            </h1>
            <p className="mb-1 text-lg text-gray-400">
              {CATEGORY_NE[category]} — {statusMeta.labelNe}
            </p>
            <p className="leading-relaxed text-gray-300">
              {commitments.length} {category.toLowerCase()} commitments that are currently {statusMeta.label.toLowerCase()}.{' '}
              {statusMeta.description}.
            </p>
          </header>

          {/* Stats bar */}
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className={`rounded-2xl border ${config.border} bg-gray-900 p-4 text-center shadow-sm`}>
              <p className="text-3xl font-bold text-white">{commitments.length}</p>
              <p className="text-xs text-gray-400">{statusMeta.label}</p>
            </div>
            <div className="rounded-2xl border border-gray-700 bg-gray-900 p-4 text-center">
              <p className="text-3xl font-bold text-white">{avgProgress}%</p>
              <p className="text-xs text-gray-400">Avg Progress</p>
            </div>
            <div className="rounded-2xl border border-gray-700 bg-gray-900 p-4 text-center">
              <p className="text-3xl font-bold text-white">{sectorStats.total}</p>
              <p className="text-xs text-gray-400">Total in {category}</p>
            </div>
            <div className="rounded-2xl border border-gray-700 bg-gray-900 p-4 text-center">
              <p className="text-3xl font-bold text-white">
                {sectorStats.total > 0 ? Math.round((commitments.length / sectorStats.total) * 100) : 0}%
              </p>
              <p className="text-xs text-gray-400">of Sector</p>
            </div>
          </div>

          {/* Sector status breakdown (context) */}
          <div className="mb-8 rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-white">
              <TrendingUp className="h-5 w-5 text-blue-400" />
              {category} Status Breakdown
            </h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {statusBreakdown.map((sb) => {
                const SIcon = sb.config.icon;
                return (
                  <Link
                    key={sb.status}
                    href={`/sectors/${sector}/${sb.status}`}
                    className={`flex items-center gap-2 rounded-xl border p-3 transition-all ${
                      sb.active
                        ? `${sb.config.border} bg-gray-800`
                        : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                    }`}
                  >
                    <SIcon className={`h-4 w-4 ${sb.config.color}`} />
                    <div>
                      <p className="text-lg font-bold text-white">{sb.count}</p>
                      <p className="text-xs text-gray-400">{sb.label}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Commitment list */}
          {commitments.length > 0 ? (
            <section className="mb-8">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-white">
                <StatusIcon className={`h-5 w-5 ${config.color}`} />
                {statusMeta.label} Commitments
                <span className="ml-1 rounded-full bg-gray-800 px-2 py-0.5 text-sm font-normal text-gray-400">
                  {commitments.length}
                </span>
              </h2>
              <div className="space-y-2">
                {commitments.map((commitment) => (
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
                      <div className="hidden sm:flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-700">
                          <div
                            className={`h-full rounded-full ${config.barColor}`}
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
          ) : (
            <div className="mb-8 rounded-2xl border border-gray-700 bg-gray-900 p-8 text-center">
              <StatusIcon className={`mx-auto mb-3 h-10 w-10 ${config.color}`} />
              <p className="text-lg font-semibold text-white">No {statusMeta.label.toLowerCase()} commitments</p>
              <p className="mt-1 text-sm text-gray-400">
                There are currently no {category.toLowerCase()} commitments with {statusMeta.label.toLowerCase()} status.
              </p>
            </div>
          )}

          {/* Navigation links */}
          <div className="mb-8 grid gap-3 sm:grid-cols-2">
            <Link
              href={`/sectors/${sector}`}
              className="flex items-center gap-3 rounded-xl border border-gray-700 bg-gray-900 p-4 transition-all hover:border-gray-600 hover:shadow-sm"
            >
              <div>
                <p className="text-sm font-medium text-white">All {category} Commitments</p>
                <p className="text-xs text-gray-400">{sectorStats.total} commitments across all statuses</p>
              </div>
              <ChevronRight className="ml-auto h-4 w-4 text-gray-600" />
            </Link>
            <Link
              href={`/status/${status}`}
              className="flex items-center gap-3 rounded-xl border border-gray-700 bg-gray-900 p-4 transition-all hover:border-gray-600 hover:shadow-sm"
            >
              <div>
                <p className="text-sm font-medium text-white">All {statusMeta.label} Commitments</p>
                <p className="text-xs text-gray-400">{getPromisesByStatus(status).length} commitments across all sectors</p>
              </div>
              <ChevronRight className="ml-auto h-4 w-4 text-gray-600" />
            </Link>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-700 pt-4">
            <p className="text-xs text-gray-500">
              {commitments.length} {statusMeta.label.toLowerCase()} {category.toLowerCase()} commitments tracked from RSP "बाचा पत्र 2082" (Citizen Contract).{' '}
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
