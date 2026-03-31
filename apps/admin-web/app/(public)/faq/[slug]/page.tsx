import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ChevronRight, ArrowRight } from 'lucide-react';
import { createMetadata } from '@/lib/seo';
import {
  promises,
  getPromiseBySlug,
  getPromisesByCategory,
  type GovernmentPromise,
} from '@/lib/data/promises';
import { PROMISES_KNOWLEDGE, type PromiseKnowledge } from '@/lib/intelligence/knowledge-base';

/* ───────────────────────── helpers ───────────────────────── */

function categoryToSlug(cat: string): string {
  return cat.toLowerCase().replace(/\s+/g, '-');
}

function formatBudget(lakhs: number): string {
  if (lakhs >= 100000) return `NPR ${(lakhs / 100000).toFixed(1)} Crore`;
  if (lakhs >= 1000) return `NPR ${(lakhs / 1000).toFixed(1)} Arba`;
  return `NPR ${lakhs.toFixed(0)} Lakh`;
}

const STATUS_LABELS: Record<string, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  delivered: 'Delivered',
  stalled: 'Stalled',
};

const STATUS_COLORS: Record<string, string> = {
  not_started: 'bg-gray-500',
  in_progress: 'bg-blue-500',
  delivered: 'bg-green-500',
  stalled: 'bg-red-500',
};

function getKnowledge(promiseId: string): PromiseKnowledge | undefined {
  return PROMISES_KNOWLEDGE.find((k) => k.id === Number(promiseId));
}

/* ───────────────────────── FAQ generation ───────────────────────── */

interface FaqItem {
  question: string;
  answer: string;
}

function generateFaqItems(
  promise: GovernmentPromise,
  knowledge: PromiseKnowledge | undefined
): FaqItem[] {
  const items: FaqItem[] = [];
  const statusLabel = STATUS_LABELS[promise.status] || promise.status;

  // 1. Current status
  {
    const parts = [`The current status of "${promise.title}" is ${statusLabel} with ${promise.progress}% progress.`];
    if (knowledge?.currentStatus) {
      parts.push(knowledge.currentStatus);
    } else if (promise.summary) {
      parts.push(promise.summary);
    }
    if (promise.lastUpdate) {
      parts.push(`Last updated: ${promise.lastUpdate}.`);
    }
    items.push({
      question: `What is the current status of ${promise.title}?`,
      answer: parts.join(' '),
    });
  }

  // 2. Who is responsible
  {
    const parts: string[] = [];
    if (promise.actors && promise.actors.length > 0) {
      parts.push(`The responsible actors for "${promise.title}" include: ${promise.actors.join(', ')}.`);
    }
    if (knowledge?.keyMinistries && knowledge.keyMinistries.length > 0) {
      parts.push(`Key ministries involved: ${knowledge.keyMinistries.join(', ')}.`);
    }
    if (knowledge?.keyOfficials && knowledge.keyOfficials.length > 0) {
      parts.push(`Key officials: ${knowledge.keyOfficials.join(', ')}.`);
    }
    if (parts.length === 0) {
      parts.push(`Specific responsible actors for "${promise.title}" have not yet been identified in our tracking system.`);
    }
    items.push({
      question: `Who is responsible for ${promise.title}?`,
      answer: parts.join(' '),
    });
  }

  // 3. Budget
  {
    const parts: string[] = [];
    if (promise.estimatedBudgetNPR) {
      parts.push(`The estimated budget for "${promise.title}" is ${formatBudget(promise.estimatedBudgetNPR)}.`);
      if (promise.spentNPR) {
        const pct = Math.round((promise.spentNPR / promise.estimatedBudgetNPR) * 100);
        parts.push(`So far, ${formatBudget(promise.spentNPR)} (${pct}%) has been spent.`);
      }
      if (promise.fundingSource) {
        parts.push(`Funding source: ${promise.fundingSource}.`);
      }
    } else if (knowledge?.budgetRelevance) {
      parts.push(`Budget details: ${knowledge.budgetRelevance}`);
    } else {
      parts.push(`Specific budget allocation for "${promise.title}" has not been publicly disclosed or tracked yet.`);
    }
    items.push({
      question: `How much budget is allocated for ${promise.title}?`,
      answer: parts.join(' '),
    });
  }

  // 4. Geographic scope / provinces
  {
    const parts: string[] = [];
    if (promise.affectedProvinces && promise.affectedProvinces.length > 0) {
      parts.push(`"${promise.title}" affects the following provinces: ${promise.affectedProvinces.join(', ')}.`);
    } else if (promise.scope === 'national' || promise.geoScope === 'national') {
      parts.push(`"${promise.title}" is a national-scope commitment affecting all seven provinces of Nepal.`);
    } else {
      parts.push(`"${promise.title}" is a national-level commitment that impacts citizens across Nepal. Specific provincial breakdowns are not yet available.`);
    }
    if (promise.primaryLocations && promise.primaryLocations.length > 0) {
      const locs = promise.primaryLocations.map((l) => l.description || `${l.district || ''}, ${l.province}`).join('; ');
      parts.push(`Primary implementation locations: ${locs}.`);
    }
    items.push({
      question: `Which provinces are affected by ${promise.title}?`,
      answer: parts.join(' '),
    });
  }

  // 5. Progress made
  {
    const parts = [`"${promise.title}" is currently at ${promise.progress}% progress (${statusLabel}).`];
    if (knowledge?.progressIndicators) {
      parts.push(`Key progress indicators being tracked: ${knowledge.progressIndicators}.`);
    }
    if (promise.evidenceCount > 0) {
      parts.push(`There are ${promise.evidenceCount} evidence items and ${promise.sourceCount ?? 0} sources contributing to this assessment.`);
    }
    items.push({
      question: `What progress has been made on ${promise.title}?`,
      answer: parts.join(' '),
    });
  }

  // 6. Deadline
  {
    const parts: string[] = [];
    if (promise.deadline) {
      const deadlineDate = new Date(promise.deadline).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      parts.push(`The deadline for "${promise.title}" is ${deadlineDate}.`);
      const remaining = Math.ceil((new Date(promise.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (remaining > 0) {
        parts.push(`That is approximately ${remaining} days from now.`);
      } else {
        parts.push(`This deadline has already passed.`);
      }
    } else {
      parts.push(`No specific deadline has been publicly set for "${promise.title}". The RSP government's first 100 days target applies to many commitments.`);
    }
    items.push({
      question: `When is the deadline for ${promise.title}?`,
      answer: parts.join(' '),
    });
  }

  // 7. How it's tracked
  {
    const parts = [
      `Nepal Republic tracks "${promise.title}" using AI-powered intelligence gathering from multiple sources.`,
    ];
    if (knowledge?.keyAspects) {
      parts.push(`Key aspects being monitored: ${knowledge.keyAspects}.`);
    }
    if (knowledge?.stallIndicators) {
      parts.push(`Warning signs we watch for: ${knowledge.stallIndicators}.`);
    }
    parts.push(
      `The commitment has a trust level of "${promise.trustLevel}" based on ${promise.evidenceCount} evidence items from ${promise.sourceCount ?? 0} sources.`
    );
    items.push({
      question: `How is ${promise.title} being tracked?`,
      answer: parts.join(' '),
    });
  }

  // 8. Evidence (only if there's meaningful data)
  {
    const parts: string[] = [];
    if (promise.evidenceCount > 0) {
      parts.push(
        `There are currently ${promise.evidenceCount} evidence items tracked for "${promise.title}", sourced from ${promise.sourceCount ?? 0} distinct sources.`
      );
      parts.push(`The current trust level is "${promise.trustLevel}" and the data confidence is "${promise.liveDataConfidence || 'insufficient'}".`);
    } else {
      parts.push(`Evidence collection for "${promise.title}" is ongoing. No verified evidence items have been catalogued yet.`);
    }
    if (knowledge?.currentStatus) {
      parts.push(`Latest assessment: ${knowledge.currentStatus}`);
    }
    parts.push(
      `You can view the latest evidence and signals on the live tracker page.`
    );
    items.push({
      question: `What evidence exists for ${promise.title}?`,
      answer: parts.join(' '),
    });
  }

  return items;
}

/* ───────────────────────── static params ───────────────────────── */

export async function generateStaticParams() {
  return promises
    .filter((p) => p.isPublic !== false)
    .map((p) => ({ slug: p.slug }));
}

/* ───────────────────────── metadata ───────────────────────── */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const promise = getPromiseBySlug(slug);

  if (!promise) return createMetadata({ title: 'FAQ Not Found' });

  const title = `FAQ: ${promise.title}`;
  const description = `Frequently asked questions about Nepal's commitment on "${promise.title}" — status, budget, progress, responsible officials, and more.`;

  return createMetadata({
    title,
    description,
    path: `/faq/${promise.slug}`,
  });
}

/* ───────────────────────── JSON-LD ───────────────────────── */

function FaqJsonLd({
  promise,
  faqItems,
}: {
  promise: GovernmentPromise;
  faqItems: FaqItem[];
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nepalrepublic.org';
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    name: `FAQ: ${promise.title} — Nepal Republic`,
    url: `${siteUrl}/faq/${promise.slug}`,
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
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

export default async function FaqPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const promise = getPromiseBySlug(slug);
  if (!promise || promise.isPublic === false) notFound();

  const knowledge = getKnowledge(promise.id);
  const faqItems = generateFaqItems(promise, knowledge);

  const relatedPromises = getPromisesByCategory(promise.category)
    .filter((p) => p.slug !== promise.slug && p.isPublic !== false)
    .slice(0, 4);

  const statusLabel = STATUS_LABELS[promise.status] || promise.status;
  const statusColor = STATUS_COLORS[promise.status] || 'bg-gray-500';

  return (
    <>
      <FaqJsonLd promise={promise} faqItems={faqItems} />

      <div className="min-h-screen bg-gray-950">
        {/* Breadcrumb */}
        <div className="border-b border-gray-800 bg-gray-900">
          <div className="mx-auto max-w-4xl px-4 py-3">
            <nav className="flex items-center gap-1 text-sm text-gray-400">
              <Link href="/" className="hover:text-gray-100">
                Home
              </Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <Link href="/explore/first-100-days" className="hover:text-gray-100">
                Commitments
              </Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-gray-100 line-clamp-1">FAQ</span>
            </nav>
          </div>
        </div>

        <div className="mx-auto max-w-4xl px-4 py-8">
          {/* Header */}
          <header className="mb-8">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-blue-950 px-3 py-1 text-xs font-medium text-blue-300 ring-1 ring-blue-800">
                {promise.category}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-800 px-3 py-1 text-xs font-medium text-gray-300 ring-1 ring-gray-700">
                <span className={`h-2 w-2 rounded-full ${statusColor}`} />
                {statusLabel}
              </span>
              <span className="rounded-full bg-gray-800 px-3 py-1 text-xs font-medium text-gray-400 ring-1 ring-gray-700">
                {promise.progress}% complete
              </span>
            </div>

            <h1 className="mb-2 text-2xl font-bold text-white sm:text-3xl">
              FAQ: {promise.title}
            </h1>
            <p className="text-lg text-gray-400">{promise.title_ne}</p>
            <p className="mt-3 text-sm text-gray-500">
              {faqItems.length} frequently asked questions about this government commitment
            </p>
          </header>

          {/* FAQ Items */}
          <div className="space-y-4">
            {faqItems.map((item, index) => (
              <details
                key={index}
                className="group rounded-2xl border border-gray-700 bg-gray-900 shadow-sm"
                open={index === 0}
              >
                <summary className="flex cursor-pointer items-center justify-between px-6 py-5 text-left">
                  <h2 className="pr-4 text-base font-semibold text-white sm:text-lg">
                    {item.question}
                  </h2>
                  <ChevronRight className="h-5 w-5 flex-shrink-0 text-gray-400 transition-transform group-open:rotate-90" />
                </summary>
                <div className="border-t border-gray-800 px-6 py-5">
                  <p className="leading-relaxed text-gray-300">{item.answer}</p>
                </div>
              </details>
            ))}
          </div>

          {/* CTA — view live tracker */}
          <div className="mt-8 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
            <h2 className="mb-2 text-lg font-bold">View Live Tracker</h2>
            <p className="mb-4 text-sm text-blue-100">
              See real-time signals, community evidence, and AI-powered briefings
              for this commitment.
            </p>
            <Link
              href={`/explore/first-100-days/${promise.slug}`}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50"
            >
              Open Live Tracker
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Related commitments */}
          {relatedPromises.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-4 text-xl font-bold text-white">
                More {promise.category} Commitments
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {relatedPromises.map((rel) => {
                  const relStatusColor = STATUS_COLORS[rel.status] || 'bg-gray-500';
                  return (
                    <Link
                      key={rel.slug}
                      href={`/faq/${rel.slug}`}
                      className="group flex items-start gap-3 rounded-xl border border-gray-700 bg-gray-900 p-4 transition-all hover:border-blue-700 hover:shadow-sm"
                    >
                      <span
                        className={`mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${relStatusColor}`}
                      />
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-medium text-white group-hover:text-blue-400">
                          {rel.title}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-400">
                          {rel.progress}% complete
                        </p>
                      </div>
                      <ChevronRight className="ml-auto h-4 w-4 flex-shrink-0 text-gray-500 group-hover:text-blue-500" />
                    </Link>
                  );
                })}
              </div>
              <div className="mt-4 text-center">
                <Link
                  href={`/sectors/${categoryToSlug(promise.category)}`}
                  className="inline-flex items-center gap-2 text-sm font-medium text-blue-400 hover:text-blue-300"
                >
                  View all {promise.category} commitments
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </section>
          )}

          {/* Footer */}
          <div className="mt-8 border-t border-gray-800 pt-6">
            <p className="text-xs text-gray-500">
              Data sourced from RSP &quot;बाचा पत्र 2082&quot; (Citizen Contract)
              &mdash; 100 Pillars of Policy Departure. Last updated:{' '}
              {promise.lastUpdate || 'Recently'}.{' '}
              <Link
                href="/how-it-works"
                className="underline hover:text-gray-300"
              >
                How we track commitments
              </Link>
              {' · '}
              <Link
                href={`/explore/first-100-days/${promise.slug}`}
                className="underline hover:text-gray-300"
              >
                Live tracker
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
