import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  Hash,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  Clock,
  Circle,
  AlertTriangle,
  TrendingUp,
  Tag,
} from 'lucide-react';
import { createMetadata } from '@/lib/seo';
import {
  getAllTopics,
  getPublicPromises,
  categoryToSlug,
  CATEGORY_NE,
  type TopicPage as TopicData,
} from '@/lib/seo/seo-helpers';
import { promises, type GovernmentPromise } from '@/lib/data/promises';
import { PROMISES_KNOWLEDGE } from '@/lib/intelligence/knowledge-base';

/* ───────────────────────── helpers ───────────────────────── */

const STATUS_CONFIG = {
  not_started: { label: 'Not Started', icon: Circle, color: 'text-gray-400', bar: 'bg-gray-400' },
  in_progress: { label: 'In Progress', icon: Clock, color: 'text-blue-500', bar: 'bg-blue-500' },
  delivered: { label: 'Delivered', icon: CheckCircle2, color: 'text-green-500', bar: 'bg-green-500' },
  stalled: { label: 'Stalled', icon: AlertTriangle, color: 'text-red-500', bar: 'bg-red-500' },
} as const;

function getTopicCommitments(topic: TopicData): GovernmentPromise[] {
  const pub = getPublicPromises();
  const idSet = new Set(topic.commitmentIds.map(String));
  return pub.filter((p) => idSet.has(String(p.id)));
}

function computeScore(commitments: GovernmentPromise[]): number {
  if (commitments.length === 0) return 0;
  return Math.round(commitments.reduce((sum, c) => sum + c.progress, 0) / commitments.length);
}

function formatTopicName(keyword: string): string {
  return keyword
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ───────────────────────── static params ───────────────────────── */

export async function generateStaticParams() {
  return getAllTopics().map((t) => ({ keyword: t.slug }));
}

/* ───────────────────────── metadata ───────────────────────── */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ keyword: string }>;
}): Promise<Metadata> {
  const { keyword } = await params;
  const topic = getAllTopics().find((t) => t.slug === keyword);

  if (!topic) return createMetadata({ title: 'Topic Not Found' });

  const displayName = formatTopicName(topic.keyword);
  const title = `Nepal ${displayName} — Government Commitments & Progress 2026`;
  const description = `${topic.commitmentIds.length} government commitments related to ${displayName.toLowerCase()} in Nepal. Track progress, status, and accountability on Nepal Republic.`;

  return createMetadata({
    title,
    description,
    path: `/topics/${keyword}`,
  });
}

/* ───────────────────────── JSON-LD ───────────────────────── */

function TopicJsonLd({ topic, commitments }: { topic: TopicData; commitments: GovernmentPromise[] }) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nepalrepublic.org';
  const displayName = formatTopicName(topic.keyword);
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${displayName} — Nepal Government Commitments`,
    url: `${siteUrl}/topics/${topic.slug}`,
    description: `Government commitments related to ${displayName.toLowerCase()} in Nepal`,
    about: {
      '@type': 'Thing',
      name: displayName,
    },
    numberOfItems: commitments.length,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: commitments.length,
      itemListElement: commitments.slice(0, 20).map((c, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: c.title,
        url: `${siteUrl}/track/${categoryToSlug(c.category)}/${c.slug}`,
      })),
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

export default async function TopicPage({
  params,
}: {
  params: Promise<{ keyword: string }>;
}) {
  const { keyword } = await params;
  const topic = getAllTopics().find((t) => t.slug === keyword);
  if (!topic) notFound();

  const commitments = getTopicCommitments(topic);
  const displayName = formatTopicName(topic.keyword);
  const score = computeScore(commitments);
  const delivered = commitments.filter((c) => c.status === 'delivered').length;
  const inProgress = commitments.filter((c) => c.status === 'in_progress').length;
  const notStarted = commitments.filter((c) => c.status === 'not_started').length;
  const stalled = commitments.filter((c) => c.status === 'stalled').length;

  // Group commitments by category
  const byCategory = commitments.reduce<Record<string, GovernmentPromise[]>>((acc, c) => {
    const cat = c.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(c);
    return acc;
  }, {});

  // Find related topics (share at least one commitment)
  const allTopics = getAllTopics();
  const commitmentIdSet = new Set(topic.commitmentIds.map(String));
  const relatedTopics = allTopics
    .filter(
      (t) =>
        t.slug !== topic.slug &&
        t.commitmentIds.some((id) => commitmentIdSet.has(String(id)))
    )
    .slice(0, 12);

  return (
    <>
      <TopicJsonLd topic={topic} commitments={commitments} />

      <div className="min-h-screen bg-gray-950">
        {/* Breadcrumb */}
        <div className="border-b border-gray-800 bg-gray-900">
          <div className="mx-auto max-w-4xl px-4 py-3">
            <nav className="flex items-center gap-1 text-sm text-gray-400">
              <Link href="/" className="hover:text-gray-100">Home</Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <Link href="/explore/first-100-days" className="hover:text-gray-100">Commitments</Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-gray-100">{displayName}</span>
            </nav>
          </div>
        </div>

        <div className="mx-auto max-w-4xl px-4 py-8">
          {/* Header */}
          <header className="mb-8">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-950 px-3 py-1 text-xs font-medium text-emerald-300 ring-1 ring-emerald-800">
              <Hash className="h-3.5 w-3.5" />
              Topic
            </div>
            <h1 className="mb-2 text-2xl font-bold text-white sm:text-3xl">{displayName}</h1>
            <p className="text-gray-400">
              {commitments.length} government commitment{commitments.length !== 1 ? 's' : ''} related to{' '}
              <span className="text-gray-200">{displayName.toLowerCase()}</span> in Nepal.
            </p>
          </header>

          {/* Performance Overview */}
          <div className="mb-6 rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-white">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Progress Overview
            </h2>
            <div className="mb-4">
              <div className="mb-1 flex items-end justify-between">
                <span className="text-sm text-gray-400">Average Progress</span>
                <span className="text-3xl font-bold text-white">{score}%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-gray-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all"
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div>
                <p className="text-xl font-bold text-green-500">{delivered}</p>
                <p className="text-xs text-gray-400">Delivered</p>
              </div>
              <div>
                <p className="text-xl font-bold text-blue-500">{inProgress}</p>
                <p className="text-xs text-gray-400">In Progress</p>
              </div>
              <div>
                <p className="text-xl font-bold text-gray-400">{notStarted}</p>
                <p className="text-xs text-gray-400">Not Started</p>
              </div>
              <div>
                <p className="text-xl font-bold text-red-500">{stalled}</p>
                <p className="text-xs text-gray-400">Stalled</p>
              </div>
            </div>
          </div>

          {/* Commitments grouped by category */}
          {Object.entries(byCategory)
            .sort(([, a], [, b]) => b.length - a.length)
            .map(([category, catCommitments]) => (
              <section key={category} className="mb-6">
                <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-white">
                  <Link
                    href={`/sectors/${categoryToSlug(category)}`}
                    className="hover:text-blue-400"
                  >
                    {category}
                  </Link>
                  {CATEGORY_NE[category] && (
                    <span className="text-sm font-normal text-gray-500">
                      ({CATEGORY_NE[category]})
                    </span>
                  )}
                  <span className="ml-auto text-sm font-normal text-gray-400">
                    {catCommitments.length} commitment{catCommitments.length !== 1 ? 's' : ''}
                  </span>
                </h2>
                <div className="space-y-3">
                  {catCommitments.map((commitment) => {
                    const s = STATUS_CONFIG[commitment.status];
                    const SIcon = s.icon;
                    return (
                      <Link
                        key={commitment.slug}
                        href={`/track/${categoryToSlug(commitment.category)}/${commitment.slug}`}
                        className="group flex items-start gap-3 rounded-xl border border-gray-700 bg-gray-900 p-4 transition-all hover:border-blue-700 hover:shadow-sm"
                      >
                        <SIcon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${s.color}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white group-hover:text-blue-400">
                            {commitment.title}
                          </p>
                          {commitment.title_ne && (
                            <p className="mt-0.5 text-xs text-gray-500">{commitment.title_ne}</p>
                          )}
                          <div className="mt-2 flex items-center gap-3">
                            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-700">
                              <div
                                className={`h-full rounded-full ${s.bar}`}
                                style={{ width: `${commitment.progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-400">{commitment.progress}%</span>
                            <span className={`text-xs ${s.color}`}>{s.label}</span>
                          </div>
                        </div>
                        <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-600 group-hover:text-blue-500" />
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}

          {/* Related Topics */}
          {relatedTopics.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
                <Tag className="h-5 w-5 text-emerald-500" />
                Related Topics
              </h2>
              <div className="flex flex-wrap gap-2">
                {relatedTopics.map((rt) => (
                  <Link
                    key={rt.slug}
                    href={`/topics/${rt.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-gray-800 px-3 py-1.5 text-sm text-gray-300 ring-1 ring-gray-700 transition-colors hover:bg-gray-700 hover:text-white"
                  >
                    <Hash className="h-3 w-3 text-emerald-500" />
                    {formatTopicName(rt.keyword)}
                    <span className="text-xs text-gray-500">({rt.commitmentIds.length})</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* CTA */}
          <div className="mt-8 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 p-6 text-white">
            <h2 className="mb-2 text-lg font-bold">Explore More</h2>
            <p className="mb-4 text-sm text-indigo-100">
              Dive deeper into Nepal&apos;s government commitments and track accountability across sectors.
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
                Full Report Card
              </Link>
            </div>
          </div>

          <div className="mt-6 border-t border-gray-800 pt-4">
            <p className="text-xs text-gray-500">
              Data sourced from official government publications and Nepal Republic intelligence network.
              Topics are automatically extracted from commitment data and knowledge base.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
