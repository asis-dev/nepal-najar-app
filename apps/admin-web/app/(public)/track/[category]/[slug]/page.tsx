import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  CheckCircle2,
  Clock,
  Circle,
  AlertTriangle,
  ArrowRight,
  Calendar,
  Building2,
  Truck,
  Cpu,
  Heart,
  Zap,
  GraduationCap,
  Leaf,
  Scale,
  Fingerprint,
  Banknote,
  TrendingUp,
  Briefcase,
  Users,
  ExternalLink,
  ChevronRight,
  Activity,
} from 'lucide-react';
import { createMetadata } from '@/lib/seo';
import {
  promises,
  getPromiseBySlug,
  getPromisesByCategory,
  CATEGORY_NE,
  type GovernmentPromise,
  type PromiseCategory,
} from '@/lib/data/promises';

/* ───────────────────────── helpers ───────────────────────── */

function categoryToSlug(cat: PromiseCategory): string {
  return cat.toLowerCase().replace(/\s+/g, '-');
}

function slugToCategory(slug: string): PromiseCategory | undefined {
  const categories: PromiseCategory[] = [
    'Governance', 'Anti-Corruption', 'Infrastructure', 'Transport',
    'Energy', 'Technology', 'Health', 'Education', 'Environment',
    'Economy', 'Social',
  ];
  return categories.find((c) => categoryToSlug(c) === slug);
}

const STATUS_CONFIG = {
  not_started: {
    label: 'Not Started',
    labelNe: 'सुरु भएको छैन',
    icon: Circle,
    color: 'text-gray-400',
    bg: 'bg-gray-100 dark:bg-gray-800',
    border: 'border-gray-200 dark:border-gray-700',
  },
  in_progress: {
    label: 'In Progress',
    labelNe: 'प्रगतिमा',
    icon: Clock,
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-950',
    border: 'border-blue-200 dark:border-blue-800',
  },
  delivered: {
    label: 'Delivered',
    labelNe: 'पूरा भयो',
    icon: CheckCircle2,
    color: 'text-green-600',
    bg: 'bg-green-50 dark:bg-green-950',
    border: 'border-green-200 dark:border-green-800',
  },
  stalled: {
    label: 'Stalled',
    labelNe: 'रोकिएको',
    icon: AlertTriangle,
    color: 'text-red-600',
    bg: 'bg-red-50 dark:bg-red-950',
    border: 'border-red-200 dark:border-red-800',
  },
} as const;

const CATEGORY_ICONS: Record<PromiseCategory, React.ComponentType<{ className?: string }>> = {
  Governance: Scale,
  'Anti-Corruption': Fingerprint,
  Infrastructure: Building2,
  Transport: Truck,
  Energy: Zap,
  Technology: Cpu,
  Health: Heart,
  Education: GraduationCap,
  Environment: Leaf,
  Economy: Banknote,
  Social: Users,
};

function formatBudget(lakhs: number): string {
  if (lakhs >= 100000) return `NPR ${(lakhs / 100000).toFixed(1)} Crore`;
  if (lakhs >= 1000) return `NPR ${(lakhs / 1000).toFixed(1)} Arba`;
  return `NPR ${lakhs.toFixed(0)} Lakh`;
}

/* ───────────────────────── static params ───────────────────────── */

export async function generateStaticParams() {
  return promises
    .filter((p) => p.isPublic !== false)
    .map((p) => ({
      category: categoryToSlug(p.category),
      slug: p.slug,
    }));
}

/* ───────────────────────── metadata ───────────────────────── */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const promise = getPromiseBySlug(slug);

  if (!promise) return createMetadata({ title: 'Commitment Not Found' });

  const year = new Date().getFullYear();
  const title = `Nepal ${promise.title} Progress ${year}`;
  const description =
    promise.summary ||
    `Track Nepal's commitment on "${promise.title}" — current status: ${promise.status.replace('_', ' ')}, ${promise.progress}% progress. ${promise.description.slice(0, 120)}`;

  const ogParams = new URLSearchParams({
    title: promise.title_ne,
    subtitle: promise.title,
    progress: String(promise.progress),
    status: promise.status,
  });

  return createMetadata({
    title,
    description,
    path: `/track/${categoryToSlug(promise.category)}/${promise.slug}`,
    ogImage: `/api/og?${ogParams.toString()}`,
  });
}

/* ───────────────────────── JSON-LD ───────────────────────── */

function CommitmentJsonLd({ promise }: { promise: GovernmentPromise }) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nepalnajar.com';
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `Nepal ${promise.title} Progress Update ${new Date().getFullYear()}`,
    description: promise.summary || promise.description,
    url: `${siteUrl}/track/${categoryToSlug(promise.category)}/${promise.slug}`,
    dateModified: promise.lastUpdate || new Date().toISOString().split('T')[0],
    inLanguage: 'en',
    about: {
      '@type': 'GovernmentService',
      name: promise.title,
      alternateName: promise.title_ne,
      serviceArea: { '@type': 'Country', name: 'Nepal' },
    },
    publisher: {
      '@type': 'Organization',
      name: 'Nepal Najar',
      url: siteUrl,
    },
    keywords: [
      'Nepal', promise.category, promise.title, 'government commitment',
      'Nepal progress', 'accountability', promise.title_ne,
    ].join(', '),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

/* ───────────────────────── progress bar ───────────────────────── */

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
      <div
        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

/* ───────────────────────── page ───────────────────────── */

export default async function CommitmentTrackPage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category: categorySlug, slug } = await params;

  const promise = getPromiseBySlug(slug);
  if (!promise || promise.isPublic === false) notFound();

  // Validate category matches
  if (categoryToSlug(promise.category) !== categorySlug) notFound();

  const status = STATUS_CONFIG[promise.status];
  const StatusIcon = status.icon;
  const CategoryIcon = CATEGORY_ICONS[promise.category];

  const relatedPromises = getPromisesByCategory(promise.category)
    .filter((p) => p.slug !== promise.slug && p.isPublic !== false)
    .slice(0, 4);

  const year = new Date().getFullYear();

  return (
    <>
      <CommitmentJsonLd promise={promise} />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* Breadcrumb */}
        <div className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="mx-auto max-w-4xl px-4 py-3">
            <nav className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
              <Link href="/" className="hover:text-gray-900 dark:hover:text-gray-100">Home</Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <Link href="/explore/first-100-days" className="hover:text-gray-900 dark:hover:text-gray-100">Commitments</Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <Link
                href={`/sectors/${categoryToSlug(promise.category)}`}
                className="hover:text-gray-900 dark:hover:text-gray-100"
              >
                {promise.category}
              </Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-gray-900 dark:text-gray-100 line-clamp-1">{promise.title}</span>
            </nav>
          </div>
        </div>

        <div className="mx-auto max-w-4xl px-4 py-8">
          {/* Header */}
          <header className="mb-8">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Link
                href={`/sectors/${categoryToSlug(promise.category)}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:ring-blue-800"
              >
                <CategoryIcon className="h-3.5 w-3.5" />
                {promise.category}
              </Link>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ${status.bg} ${status.color} ${status.border}`}
              >
                <StatusIcon className="h-3.5 w-3.5" />
                {status.label}
              </span>
              {promise.scope && promise.scope !== 'unknown' && (
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400 capitalize">
                  {promise.scope}
                </span>
              )}
            </div>

            <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
              Nepal {promise.title} Progress {year}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">{promise.title_ne}</p>
          </header>

          {/* Progress card */}
          <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Overall Progress</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{promise.progress}%</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</p>
                <p className={`text-lg font-semibold ${status.color}`}>{status.label}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{status.labelNe}</p>
              </div>
            </div>
            <ProgressBar value={promise.progress} />

            {promise.deadline && (
              <div className="mt-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Calendar className="h-4 w-4" />
                <span>Deadline: {new Date(promise.deadline).toLocaleDateString('en-NP', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
            )}
          </div>

          {/* Stats grid */}
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
              <Activity className="mb-2 h-5 w-5 text-blue-500" />
              <p className="text-xl font-bold text-gray-900 dark:text-white">{promise.evidenceCount}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Evidence Items</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
              <TrendingUp className="mb-2 h-5 w-5 text-green-500" />
              <p className="text-xl font-bold text-gray-900 dark:text-white">{promise.sourceCount ?? 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Sources</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
              <Briefcase className="mb-2 h-5 w-5 text-purple-500" />
              <p className="text-xl font-bold text-gray-900 dark:text-white">{promise.linkedProjects}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Linked Projects</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
              <div className={`mb-2 h-5 w-5 rounded-full ${promise.trustLevel === 'verified' ? 'bg-green-500' : promise.trustLevel === 'partial' ? 'bg-yellow-500' : 'bg-gray-400'}`} />
              <p className="text-xl font-bold capitalize text-gray-900 dark:text-white">{promise.trustLevel}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Trust Level</p>
            </div>
          </div>

          {/* Description */}
          <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">About This Commitment</h2>
            <p className="mb-3 leading-relaxed text-gray-700 dark:text-gray-300">{promise.description}</p>
            {promise.description_ne && (
              <p className="leading-relaxed text-gray-500 dark:text-gray-400">{promise.description_ne}</p>
            )}
          </section>

          {/* Budget & actors */}
          {(promise.estimatedBudgetNPR || (promise.actors && promise.actors.length > 0)) && (
            <section className="mb-6 grid gap-4 sm:grid-cols-2">
              {promise.estimatedBudgetNPR && (
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                  <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
                    <Banknote className="h-5 w-5 text-green-500" />
                    Budget
                  </h3>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatBudget(promise.estimatedBudgetNPR)}
                  </p>
                  {promise.spentNPR && (
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Spent: {formatBudget(promise.spentNPR)} ({Math.round((promise.spentNPR / promise.estimatedBudgetNPR) * 100)}%)
                    </p>
                  )}
                  {promise.fundingSource && (
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Source: {promise.fundingSource}</p>
                  )}
                </div>
              )}

              {promise.actors && promise.actors.length > 0 && (
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                  <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
                    <Users className="h-5 w-5 text-blue-500" />
                    Responsible Actors
                  </h3>
                  <ul className="space-y-1.5">
                    {promise.actors.map((actor) => (
                      <li key={actor} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                        {actor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {/* Geographic scope */}
          {promise.affectedProvinces && promise.affectedProvinces.length > 0 && (
            <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">Geographic Scope</h2>
              <div className="flex flex-wrap gap-2">
                {promise.affectedProvinces.map((province) => (
                  <span
                    key={province}
                    className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  >
                    {province}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* CTA — explore live */}
          <div className="mb-8 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
            <h2 className="mb-2 text-lg font-bold">Track Live Updates</h2>
            <p className="mb-4 text-blue-100 text-sm">
              See real-time signals, community evidence, and AI-powered briefings on this commitment.
            </p>
            <Link
              href={`/explore/first-100-days/${promise.slug}`}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50 transition-colors"
            >
              View Live Tracker
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Related commitments */}
          {relatedPromises.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
                More {promise.category} Commitments
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {relatedPromises.map((rel) => {
                  const relStatus = STATUS_CONFIG[rel.status];
                  const RelStatusIcon = relStatus.icon;
                  return (
                    <Link
                      key={rel.slug}
                      href={`/track/${categoryToSlug(rel.category)}/${rel.slug}`}
                      className="group flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-blue-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:hover:border-blue-700"
                    >
                      <RelStatusIcon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${relStatus.color}`} />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 line-clamp-2 text-sm group-hover:text-blue-700 dark:text-white dark:group-hover:text-blue-400">
                          {rel.title}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{rel.progress}% complete</p>
                      </div>
                      <ChevronRight className="ml-auto h-4 w-4 flex-shrink-0 text-gray-400 group-hover:text-blue-500" />
                    </Link>
                  );
                })}
              </div>
              <div className="mt-4 text-center">
                <Link
                  href={`/sectors/${categoryToSlug(promise.category)}`}
                  className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  View all {promise.category} commitments
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </section>
          )}

          {/* Footer context */}
          <div className="mt-8 border-t border-gray-200 pt-6 dark:border-gray-700">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Data sourced from RSP "बाचा पत्र 2082" (Citizen Contract) — 100 Pillars of Policy Departure.
              Last updated: {promise.lastUpdate || 'Recently'}.{' '}
              <Link href="/how-it-works" className="underline hover:text-gray-600 dark:hover:text-gray-300">
                How we track commitments
              </Link>
              {' · '}
              <Link href={`/explore/first-100-days/${promise.slug}`} className="inline-flex items-center gap-1 underline hover:text-gray-600 dark:hover:text-gray-300">
                Live tracker <ExternalLink className="h-3 w-3" />
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
