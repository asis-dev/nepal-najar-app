import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  MapPin,
  ChevronRight,
  TrendingUp,
  CheckCircle2,
  Clock,
  Circle,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { createMetadata } from '@/lib/seo';
import {
  PROVINCES,
  getProvince,
  type Province,
} from '@/lib/seo/nepal-geo';
import {
  getPromisesByProvince,
  getPromisesBySector,
  categoryToSlug,
  CATEGORIES,
  CATEGORY_NE,
  computeStats,
  type GovernmentPromise,
} from '@/lib/seo/seo-helpers';

/* ───────────────────────── helpers ───────────────────────── */

const STATUS_CONFIG = {
  not_started: { label: 'Not Started', icon: Circle, color: 'text-gray-400', dot: 'bg-gray-300', border: 'border-l-gray-400' },
  in_progress: { label: 'In Progress', icon: Clock, color: 'text-blue-500', dot: 'bg-blue-500', border: 'border-l-blue-500' },
  delivered: { label: 'Delivered', icon: CheckCircle2, color: 'text-green-500', dot: 'bg-green-500', border: 'border-l-green-500' },
  stalled: { label: 'Stalled', icon: AlertTriangle, color: 'text-red-500', dot: 'bg-red-500', border: 'border-l-red-500' },
} as const;

function progressBarColor(status: string): string {
  switch (status) {
    case 'delivered': return 'bg-green-500';
    case 'in_progress': return 'bg-blue-500';
    case 'stalled': return 'bg-red-500';
    default: return 'bg-gray-400';
  }
}

/* ───────────────────────── static params ───────────────────────── */

export async function generateStaticParams() {
  return PROVINCES.map((p) => ({ slug: p.slug }));
}

/* ───────────────────────── metadata ───────────────────────── */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const province = getProvince(slug);
  if (!province) return createMetadata({ title: 'Province Not Found' });

  const year = new Date().getFullYear();
  const commitments = getPromisesByProvince(province.name.replace(' Province', ''));
  const stats = computeStats(commitments);

  const title = `${province.name} Government Commitments ${year}`;
  const description = `Track ${stats.total} government commitments affecting ${province.name} (${province.nameNe}). Capital: ${province.capital}. ${stats.delivered} delivered, ${stats.inProgress} in progress, ${stats.stalled} stalled.`;

  return createMetadata({ title, description, path: `/province/${slug}` });
}

/* ───────────────────────── JSON-LD ───────────────────────── */

function ProvinceJsonLd({ province, commitments }: { province: Province; commitments: GovernmentPromise[] }) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nepalrepublic.org';
  const stats = computeStats(commitments);
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${province.name} Government Commitments`,
    description: `Tracking ${stats.total} government commitments in ${province.name}, Nepal.`,
    url: `${siteUrl}/province/${province.slug}`,
    about: {
      '@type': 'AdministrativeArea',
      name: province.name,
      alternateName: province.nameNe,
      containedInPlace: { '@type': 'Country', name: 'Nepal' },
    },
    mainEntity: {
      '@type': 'ItemList',
      name: `${province.name} Commitments`,
      numberOfItems: stats.total,
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

export default async function ProvincePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const province = getProvince(slug);
  if (!province) notFound();

  const provinceName = province.name.replace(' Province', '');
  const commitments = getPromisesByProvince(provinceName);
  const stats = computeStats(commitments);
  const year = new Date().getFullYear();

  // Sector breakdown
  const sectorBreakdown = CATEGORIES.map((cat) => {
    const sectorCommitments = commitments.filter((c) => c.category === cat);
    return { category: cat, slug: categoryToSlug(cat), count: sectorCommitments.length };
  }).filter((s) => s.count > 0);

  return (
    <>
      <ProvinceJsonLd province={province} commitments={commitments} />

      <div className="min-h-screen bg-gray-950">
        {/* Breadcrumb */}
        <div className="border-b border-gray-800 bg-gray-900">
          <div className="mx-auto max-w-4xl px-4 py-3">
            <nav className="flex items-center gap-1 text-sm text-gray-400">
              <Link href="/" className="hover:text-gray-100">Home</Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <Link href="/explore/first-100-days" className="hover:text-gray-100">Commitments</Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-gray-100">{province.name}</span>
            </nav>
          </div>
        </div>

        <div className="mx-auto max-w-4xl px-4 py-8">
          {/* Header */}
          <header className="mb-8">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-950 px-3 py-1 text-xs font-medium text-blue-300 ring-1 ring-blue-800">
              <MapPin className="h-3.5 w-3.5" />
              Province
            </div>
            <h1 className="mb-1 text-2xl font-bold text-white sm:text-3xl">
              {province.name} Government Commitments {year}
            </h1>
            <p className="mb-2 text-lg text-gray-400">{province.nameNe}</p>
            <p className="text-gray-300">
              Capital: {province.capital} ({province.capitalNe}) &middot; {province.districts.length} districts
            </p>
          </header>

          {/* Stats bar */}
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div className="rounded-2xl border border-gray-700 bg-gray-900 p-4 text-center">
              <p className="text-3xl font-bold text-white">{stats.total}</p>
              <p className="text-xs text-gray-400">Total</p>
            </div>
            <div className="rounded-2xl border border-green-800 bg-green-950 p-4 text-center">
              <p className="text-3xl font-bold text-green-400">{stats.delivered}</p>
              <p className="text-xs text-green-500">Delivered</p>
            </div>
            <div className="rounded-2xl border border-blue-800 bg-blue-950 p-4 text-center">
              <p className="text-3xl font-bold text-blue-400">{stats.inProgress}</p>
              <p className="text-xs text-blue-500">In Progress</p>
            </div>
            <div className="rounded-2xl border border-gray-700 bg-gray-900 p-4 text-center">
              <p className="text-3xl font-bold text-gray-400">{stats.notStarted}</p>
              <p className="text-xs text-gray-500">Not Started</p>
            </div>
            <div className="rounded-2xl border border-red-800 bg-red-950 p-4 text-center">
              <p className="text-3xl font-bold text-red-400">{stats.stalled}</p>
              <p className="text-xs text-red-500">Stalled</p>
            </div>
          </div>

          {/* Overall progress */}
          <div className="mb-8 rounded-2xl border border-gray-700 bg-gray-900 p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-semibold text-white">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                Province Progress
              </h2>
              <span className="text-xl font-bold text-white">{stats.deliveryRate}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-green-500"
                style={{ width: `${stats.deliveryRate}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-gray-400">
              {stats.delivered} of {stats.total} commitments delivered
            </p>
          </div>

          {/* Sector breakdown */}
          {sectorBreakdown.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-4 text-xl font-bold text-white">Sectors</h2>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {sectorBreakdown.map((s) => (
                  <Link
                    key={s.slug}
                    href={`/province/${slug}/${s.slug}`}
                    className="group flex items-center justify-between rounded-xl border border-gray-700 bg-gray-900 p-3 transition-all hover:border-blue-700"
                  >
                    <div>
                      <p className="text-sm font-medium text-white group-hover:text-blue-400">{s.category}</p>
                      <p className="text-xs text-gray-400">{CATEGORY_NE[s.category]}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-300">{s.count}</span>
                      <ChevronRight className="h-3.5 w-3.5 text-gray-500 group-hover:text-blue-400" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Districts */}
          <section className="mb-8">
            <h2 className="mb-4 text-xl font-bold text-white">Districts ({province.districts.length})</h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {province.districts.map((d) => (
                <Link
                  key={d.slug}
                  href={`/district/${d.slug}`}
                  className="group flex items-center gap-3 rounded-xl border border-gray-700 bg-gray-900 p-3 transition-all hover:border-blue-700"
                >
                  <MapPin className="h-4 w-4 flex-shrink-0 text-gray-500 group-hover:text-blue-400" />
                  <div>
                    <p className="text-sm font-medium text-white group-hover:text-blue-400">{d.name}</p>
                    <p className="text-xs text-gray-400">{d.nameNe}</p>
                  </div>
                  <ChevronRight className="ml-auto h-3.5 w-3.5 text-gray-500 group-hover:text-blue-400" />
                </Link>
              ))}
            </div>
          </section>

          {/* Commitments list */}
          <section className="mb-8">
            <h2 className="mb-4 text-xl font-bold text-white">
              All Commitments ({commitments.length})
            </h2>
            <div className="space-y-2">
              {commitments.map((commitment) => {
                const s = STATUS_CONFIG[commitment.status];
                const SIcon = s.icon;
                return (
                  <Link
                    key={commitment.slug}
                    href={`/track/${categoryToSlug(commitment.category)}/${commitment.slug}`}
                    className={`group flex items-start gap-3 rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 transition-all hover:border-blue-700 border-l-2 ${s.border}`}
                  >
                    <SIcon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${s.color}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white group-hover:text-blue-400 line-clamp-1">
                        {commitment.title}
                      </p>
                      {commitment.description && (
                        <p className="mt-0.5 text-xs text-gray-400 line-clamp-1">
                          {commitment.description}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-3">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-700">
                          <div
                            className={`h-full rounded-full ${progressBarColor(commitment.status)}`}
                            style={{ width: `${commitment.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400">{commitment.progress}%</span>
                      </div>
                    </div>
                    <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-500 group-hover:text-blue-400" />
                  </Link>
                );
              })}
            </div>
          </section>

          {/* CTA */}
          <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 p-6 text-white">
            <h2 className="mb-2 text-lg font-bold">Explore More</h2>
            <p className="mb-4 text-sm text-indigo-100">
              Track government accountability across all 7 provinces of Nepal.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/explore/first-100-days"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-50"
              >
                All Commitments
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/report-card"
                className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Report Card
              </Link>
            </div>
          </div>

          <div className="mt-6 border-t border-gray-700 pt-4">
            <p className="text-xs text-gray-500">
              {stats.total} commitments tracked for {province.name} from RSP "bacha patra 2082" (Citizen Contract).{' '}
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
