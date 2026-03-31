import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
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
  ALL_DISTRICTS,
  getDistrict,
  getProvince,
} from '@/lib/seo/nepal-geo';
import {
  getPromisesByProvince,
  categoryToSlug,
  slugToCategory,
  CATEGORIES,
  CATEGORY_NE,
  computeStats,
  type GovernmentPromise,
} from '@/lib/seo/seo-helpers';

/* ───────────────────────── helpers ───────────────────────── */

const STATUS_CONFIG = {
  not_started: { label: 'Not Started', icon: Circle, color: 'text-gray-400', border: 'border-l-gray-400' },
  in_progress: { label: 'In Progress', icon: Clock, color: 'text-blue-500', border: 'border-l-blue-500' },
  delivered: { label: 'Delivered', icon: CheckCircle2, color: 'text-green-500', border: 'border-l-green-500' },
  stalled: { label: 'Stalled', icon: AlertTriangle, color: 'text-red-500', border: 'border-l-red-500' },
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
  const params: { slug: string; sector: string }[] = [];
  for (const district of ALL_DISTRICTS) {
    for (const cat of CATEGORIES) {
      params.push({ slug: district.slug, sector: categoryToSlug(cat) });
    }
  }
  return params;
}

/* ───────────────────────── metadata ───────────────────────── */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; sector: string }>;
}): Promise<Metadata> {
  const { slug, sector } = await params;
  const district = getDistrict(slug);
  const category = slugToCategory(sector);

  if (!district || !category) return createMetadata({ title: 'Not Found' });

  const province = getProvince(district.province);
  const year = new Date().getFullYear();
  const provinceName = province ? province.name.replace(' Province', '') : '';
  const commitments = getPromisesByProvince(provinceName).filter((c) => c.category === category);
  const stats = computeStats(commitments);

  const title = `${category} in ${district.name}, ${province?.name || ''} ${year}`;
  const description = `${stats.total} ${category.toLowerCase()} commitments affecting ${district.name} district (${district.nameNe}), ${province?.name || ''}. ${stats.delivered} delivered, ${stats.inProgress} in progress.`;

  return createMetadata({ title, description, path: `/district/${slug}/${sector}` });
}

/* ───────────────────────── page ───────────────────────── */

export default async function DistrictSectorPage({
  params,
}: {
  params: Promise<{ slug: string; sector: string }>;
}) {
  const { slug, sector } = await params;
  const district = getDistrict(slug);
  const category = slugToCategory(sector);

  if (!district || !category) notFound();

  const province = getProvince(district.province);
  if (!province) notFound();

  const provinceName = province.name.replace(' Province', '');
  const commitments = getPromisesByProvince(provinceName).filter((c) => c.category === category);
  const stats = computeStats(commitments);
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Breadcrumb */}
      <div className="border-b border-gray-800 bg-gray-900">
        <div className="mx-auto max-w-4xl px-4 py-3">
          <nav className="flex items-center gap-1 text-sm text-gray-400">
            <Link href="/" className="hover:text-gray-100">Home</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href={`/province/${province.slug}`} className="hover:text-gray-100">{province.name}</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href={`/district/${slug}`} className="hover:text-gray-100">{district.name}</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-gray-100">{category}</span>
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="mb-1 text-2xl font-bold text-white sm:text-3xl">
            {category} in {district.name}, {province.name} {year}
          </h1>
          <p className="mb-2 text-lg text-gray-400">
            {CATEGORY_NE[category]} &middot; {district.nameNe}
          </p>
          <p className="text-gray-300">
            {stats.total} {category.toLowerCase()} commitments tracked for {district.name} district.
          </p>
        </header>

        {/* Stats bar */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
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
          <div className="rounded-2xl border border-red-800 bg-red-950 p-4 text-center">
            <p className="text-3xl font-bold text-red-400">{stats.stalled}</p>
            <p className="text-xs text-red-500">Stalled</p>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-8 rounded-2xl border border-gray-700 bg-gray-900 p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold text-white">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Sector Progress
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

        {/* Commitments list */}
        {commitments.length > 0 ? (
          <section className="mb-8">
            <h2 className="mb-4 text-xl font-bold text-white">
              Commitments ({commitments.length})
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
        ) : (
          <div className="mb-8 rounded-2xl border border-gray-700 bg-gray-900 p-8 text-center">
            <p className="text-gray-400">No {category.toLowerCase()} commitments specifically targeting {district.name} at this time.</p>
          </div>
        )}

        {/* Navigation links */}
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/district/${slug}`}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:border-blue-700"
          >
            <ArrowRight className="h-4 w-4 rotate-180" />
            Back to {district.name}
          </Link>
          <Link
            href={`/province/${province.slug}/${sector}`}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:border-blue-700"
          >
            {category} in {province.name}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href={`/sectors/${sector}`}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:border-blue-700"
          >
            All {category}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-6 border-t border-gray-700 pt-4">
          <p className="text-xs text-gray-500">
            {stats.total} {category.toLowerCase()} commitments tracked for {district.name}, {province.name}.{' '}
            <Link href="/how-it-works" className="underline hover:text-gray-300">
              How we track
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
