import Link from 'next/link';
import type { Metadata } from 'next';
import {
  Scale,
  Fingerprint,
  Building2,
  Truck,
  Zap,
  Cpu,
  Heart,
  GraduationCap,
  Leaf,
  Banknote,
  Users,
  ChevronRight,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react';
import { createMetadata } from '@/lib/seo';
import {
  getPromisesByCategory,
  computeStats,
  type PromiseCategory,
} from '@/lib/data/promises';

export const metadata: Metadata = createMetadata({
  title: 'Nepal Government Commitment Sectors — All Policy Areas',
  description:
    'Browse all Nepal government commitment sectors: governance, infrastructure, health, energy, education and more. Track progress across 11 policy areas.',
  path: '/sectors',
});

type SectorDef = {
  category: PromiseCategory;
  slug: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  ring: string;
};

const SECTORS: SectorDef[] = [
  {
    category: 'Governance',
    slug: 'governance',
    icon: Scale,
    color: 'text-violet-600',
    bg: 'bg-violet-50 dark:bg-violet-950',
    ring: 'ring-violet-200 dark:ring-violet-800',
    description: 'Constitutional amendments, ministry restructuring, and transparency measures.',
  },
  {
    category: 'Anti-Corruption',
    slug: 'anti-corruption',
    icon: Fingerprint,
    color: 'text-red-600',
    bg: 'bg-red-50 dark:bg-red-950',
    ring: 'ring-red-200 dark:ring-red-800',
    description: 'Asset investigations, accountability mechanisms, and CIAA reforms.',
  },
  {
    category: 'Infrastructure',
    slug: 'infrastructure',
    icon: Building2,
    color: 'text-orange-600',
    bg: 'bg-orange-50 dark:bg-orange-950',
    ring: 'ring-orange-200 dark:ring-orange-800',
    description: 'Roads, bridges, public works, and capital construction commitments.',
  },
  {
    category: 'Transport',
    slug: 'transport',
    icon: Truck,
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-950',
    ring: 'ring-blue-200 dark:ring-blue-800',
    description: 'Public transit, road networks, aviation, and logistics reform.',
  },
  {
    category: 'Energy',
    slug: 'energy',
    icon: Zap,
    color: 'text-yellow-600',
    bg: 'bg-yellow-50 dark:bg-yellow-950',
    ring: 'ring-yellow-200 dark:ring-yellow-800',
    description: 'Hydropower expansion, electricity reliability, and renewable energy targets.',
  },
  {
    category: 'Technology',
    slug: 'technology',
    icon: Cpu,
    color: 'text-cyan-600',
    bg: 'bg-cyan-50 dark:bg-cyan-950',
    ring: 'ring-cyan-200 dark:ring-cyan-800',
    description: 'E-governance, broadband access, and tech-enabled public services.',
  },
  {
    category: 'Health',
    slug: 'health',
    icon: Heart,
    color: 'text-pink-600',
    bg: 'bg-pink-50 dark:bg-pink-950',
    ring: 'ring-pink-200 dark:ring-pink-800',
    description: 'Hospital upgrades, universal health coverage, and public health programs.',
  },
  {
    category: 'Education',
    slug: 'education',
    icon: GraduationCap,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50 dark:bg-indigo-950',
    ring: 'ring-indigo-200 dark:ring-indigo-800',
    description: 'School improvement, digital classrooms, and higher education access.',
  },
  {
    category: 'Environment',
    slug: 'environment',
    icon: Leaf,
    color: 'text-green-600',
    bg: 'bg-green-50 dark:bg-green-950',
    ring: 'ring-green-200 dark:ring-green-800',
    description: 'Conservation targets, pollution control, and sustainable development.',
  },
  {
    category: 'Economy',
    slug: 'economy',
    icon: Banknote,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 dark:bg-emerald-950',
    ring: 'ring-emerald-200 dark:ring-emerald-800',
    description: 'Budget discipline, investment climate, and fiscal accountability.',
  },
  {
    category: 'Social',
    slug: 'social',
    icon: Users,
    color: 'text-teal-600',
    bg: 'bg-teal-50 dark:bg-teal-950',
    ring: 'ring-teal-200 dark:ring-teal-800',
    description: 'Poverty reduction, social protection, and inclusion programs.',
  },
];

function SectorsJsonLd() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nepalnajar.com';
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Nepal Government Commitment Sectors',
    description: 'All policy sectors tracked under Nepal Najar — 11 areas of government accountability.',
    url: `${siteUrl}/sectors`,
    about: {
      '@type': 'GovernmentService',
      name: 'Nepal Government Accountability',
      serviceArea: { '@type': 'Country', name: 'Nepal' },
    },
    hasPart: SECTORS.map((s) => ({
      '@type': 'WebPage',
      name: `Nepal ${s.category} Commitments`,
      url: `${siteUrl}/sectors/${s.slug}`,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export default function SectorsIndexPage() {
  const sectorData = SECTORS.map((s) => {
    const commitments = getPromisesByCategory(s.category).filter((p) => p.isPublic !== false);
    const stats = computeStats(commitments);
    return { ...s, stats };
  });

  const totalCommitments = sectorData.reduce((sum, s) => sum + s.stats.total, 0);
  const totalDelivered = sectorData.reduce((sum, s) => sum + s.stats.delivered, 0);
  const overallRate = totalCommitments > 0 ? Math.round((totalDelivered / totalCommitments) * 100) : 0;

  const year = new Date().getFullYear();

  return (
    <>
      <SectorsJsonLd />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* Hero */}
        <div className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="mx-auto max-w-4xl px-4 py-10">
            <p className="mb-2 text-sm font-medium text-blue-600 dark:text-blue-400">Nepal Najar · Sector Tracker</p>
            <h1 className="mb-3 text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
              Nepal Government Commitments by Sector {year}
            </h1>
            <p className="mb-6 text-lg text-gray-600 dark:text-gray-400">
              Browse {totalCommitments} tracked commitments across {SECTORS.length} policy sectors — from governance reform to energy and health.
            </p>

            {/* Overall progress strip */}
            <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
              <TrendingUp className="h-6 w-6 flex-shrink-0 text-green-500" />
              <div className="flex-1">
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Overall delivery rate</span>
                  <span className="font-bold text-gray-900 dark:text-white">{overallRate}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-green-500"
                    style={{ width: `${overallRate}%` }}
                  />
                </div>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-sm font-bold text-green-600 dark:text-green-400">{totalDelivered}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">delivered</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-4xl px-4 py-8">
          {/* Sector grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {sectorData.map((s) => {
              const Icon = s.icon;
              return (
                <Link
                  key={s.slug}
                  href={`/sectors/${s.slug}`}
                  className="group rounded-2xl border border-gray-200 bg-white p-5 transition-all hover:border-blue-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-900 dark:hover:border-blue-700"
                >
                  {/* Icon + category */}
                  <div className="mb-3 flex items-start justify-between">
                    <div className={`inline-flex items-center justify-center rounded-xl p-2.5 ${s.bg} ring-1 ${s.ring}`}>
                      <Icon className={`h-5 w-5 ${s.color}`} />
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-500" />
                  </div>

                  <h2 className="mb-1 font-bold text-gray-900 group-hover:text-blue-700 dark:text-white dark:group-hover:text-blue-400">
                    {s.category}
                  </h2>
                  <p className="mb-4 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{s.description}</p>

                  {/* Stats row */}
                  <div className="flex items-center gap-3 text-xs">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{s.stats.total} commitments</span>
                    <span className="text-gray-300 dark:text-gray-600">·</span>
                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <CheckCircle2 className="h-3 w-3" />
                      {s.stats.delivered} delivered
                    </span>
                    {s.stats.inProgress > 0 && (
                      <>
                        <span className="text-gray-300 dark:text-gray-600">·</span>
                        <span className="text-blue-600 dark:text-blue-400">{s.stats.inProgress} in progress</span>
                      </>
                    )}
                  </div>

                  {/* Mini progress bar */}
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-green-500"
                      style={{ width: `${s.stats.deliveryRate}%` }}
                    />
                  </div>
                  <p className="mt-1 text-right text-xs text-gray-400 dark:text-gray-500">
                    {s.stats.deliveryRate}% delivery rate
                  </p>
                </Link>
              );
            })}
          </div>

          {/* CTA */}
          <div className="mt-10 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
            <h2 className="mb-2 text-lg font-bold">Track All Commitments</h2>
            <p className="mb-4 text-sm text-blue-100">
              Explore individual commitments with evidence, progress timelines, and accountability signals.
            </p>
            <Link
              href="/explore/first-100-days"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50 transition-colors"
            >
              Browse All Commitments
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-6 border-t border-gray-200 pt-4 dark:border-gray-700">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {totalCommitments} commitments tracked from RSP "बाचा पत्र 2082" (Citizen Contract) — 100 Pillars of Policy Departure.{' '}
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
