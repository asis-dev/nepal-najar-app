'use client';

import { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, FileSearch } from 'lucide-react';
import { Breadcrumb } from '@/components/public/breadcrumb';
import { useAllPromises } from '@/lib/hooks/use-promises';
import { useI18n } from '@/lib/i18n';
import type { GovernmentPromise } from '@/lib/data/promises';

/* ═══════════════════════════════════════════
   STATUS CONFIG
   ═══════════════════════════════════════════ */
const statusConfig: Record<string, { label: string; dot: string; bg: string }> = {
  not_started: { label: 'Not Started', dot: 'bg-gray-400', bg: 'bg-gray-500/15' },
  in_progress: { label: 'In Progress', dot: 'bg-emerald-400', bg: 'bg-emerald-500/15' },
  delivered: { label: 'Delivered', dot: 'bg-blue-400', bg: 'bg-blue-500/15' },
  stalled: { label: 'Stalled', dot: 'bg-red-400', bg: 'bg-red-500/15' },
};

/* ═══════════════════════════════════════════
   HIGHLIGHT MATCH
   ═══════════════════════════════════════════ */
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-blue-500/30 text-white rounded px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

/* ═══════════════════════════════════════════
   SEARCH CONTENT (with Suspense boundary)
   ═══════════════════════════════════════════ */
function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t, locale } = useI18n();
  const { data: promises, isLoading } = useAllPromises();

  const initialQuery = searchParams.get('q') || '';
  const [inputValue, setInputValue] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);

  // Debounce input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(inputValue);
      // Update URL without full navigation
      const params = new URLSearchParams();
      if (inputValue.trim()) params.set('q', inputValue.trim());
      const newUrl = inputValue.trim() ? `/search?${params.toString()}` : '/search';
      router.replace(newUrl, { scroll: false });
    }, 300);
    return () => clearTimeout(timer);
  }, [inputValue, router]);

  // Filter promises
  const results = useMemo(() => {
    if (!promises || !debouncedQuery.trim()) return [];

    const q = debouncedQuery.toLowerCase();
    return promises.filter((p) => {
      return (
        p.title.toLowerCase().includes(q) ||
        p.title_ne.includes(debouncedQuery) ||
        p.description.toLowerCase().includes(q) ||
        p.description_ne.includes(debouncedQuery) ||
        p.category.toLowerCase().includes(q) ||
        p.category_ne.includes(debouncedQuery)
      );
    });
  }, [promises, debouncedQuery]);

  return (
    <section className="public-section">
      <div className="public-shell">
        <Breadcrumb
          items={[{ label: locale === 'ne' ? 'खोज' : 'Search' }]}
        />

        {/* Search Input */}
        <div className="glass-card p-1 mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={
                locale === 'ne'
                  ? 'वचनबद्धता, विषय, वा विवरण खोज्नुहोस्...'
                  : 'Search commitments, categories, or descriptions...'
              }
              className="w-full bg-transparent text-white placeholder:text-gray-500 pl-12 pr-4 py-3.5 text-base outline-none"
              autoFocus
            />
          </div>
        </div>

        {/* Results count */}
        {debouncedQuery.trim() && !isLoading && (
          <p className="text-sm text-gray-400 mb-4">
            {results.length === 0
              ? locale === 'ne'
                ? 'कुनै नतिजा भेटिएन'
                : 'No results found'
              : locale === 'ne'
                ? `${results.length} नतिजा भेटियो`
                : `${results.length} result${results.length !== 1 ? 's' : ''} found`}
          </p>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
          </div>
        )}

        {/* Empty state - no query */}
        {!debouncedQuery.trim() && !isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FileSearch className="w-12 h-12 text-gray-600 mb-4" />
            <p className="text-gray-400 text-lg mb-1">
              {locale === 'ne'
                ? 'वचनबद्धताहरू खोज्न सुरु गर्नुहोस्'
                : 'Start searching commitments'}
            </p>
            <p className="text-gray-500 text-sm">
              {locale === 'ne'
                ? 'शीर्षक, विषय, वा विवरणले खोज्नुहोस्'
                : 'Search by title, category, or description'}
            </p>
          </div>
        )}

        {/* No results */}
        {debouncedQuery.trim() && results.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FileSearch className="w-12 h-12 text-gray-600 mb-4" />
            <p className="text-gray-400 text-lg mb-1">
              {locale === 'ne'
                ? `"${debouncedQuery}" को लागि कुनै नतिजा छैन`
                : `No results for "${debouncedQuery}"`}
            </p>
            <p className="text-gray-500 text-sm">
              {locale === 'ne'
                ? 'अर्को शब्द प्रयोग गर्नुहोस्'
                : 'Try a different search term'}
            </p>
          </div>
        )}

        {/* Results list */}
        {results.length > 0 && (
          <div className="space-y-3">
            {results.map((promise) => (
              <SearchResultCard
                key={promise.id}
                promise={promise}
                query={debouncedQuery}
                locale={locale}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   RESULT CARD
   ═══════════════════════════════════════════ */
function SearchResultCard({
  promise,
  query,
  locale,
}: {
  promise: GovernmentPromise;
  query: string;
  locale: string;
}) {
  const status = statusConfig[promise.status] || statusConfig.not_started;

  return (
    <Link
      href={`/explore/first-100-days/${promise.slug}`}
      className="block glass-card-hover p-4 group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3 className="text-white font-medium text-base group-hover:text-blue-300 transition-colors mb-0.5">
            <HighlightText
              text={locale === 'ne' ? promise.title_ne : promise.title}
              query={query}
            />
          </h3>
          {/* Bilingual subtitle */}
          <p className="text-gray-500 text-sm mb-2">
            <HighlightText
              text={locale === 'ne' ? promise.title : promise.title_ne}
              query={query}
            />
          </p>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Category badge */}
            <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] border border-white/10 px-2 py-0.5 text-xs text-gray-400">
              <HighlightText
                text={locale === 'ne' ? promise.category_ne : promise.category}
                query={query}
              />
            </span>

            {/* Status */}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs ${status.bg}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              <span className="text-gray-300">{status.label}</span>
            </span>

            {/* Evidence */}
            {promise.evidenceCount > 0 && (
              <span className="text-xs text-gray-500">
                {promise.evidenceCount} evidence
              </span>
            )}
          </div>
        </div>

        {/* Progress circle */}
        <div className="flex-shrink-0 flex flex-col items-center">
          <div className="relative w-10 h-10">
            <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90">
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="3"
              />
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke={
                  promise.progress >= 80
                    ? '#3b82f6'
                    : promise.progress >= 40
                      ? '#10b981'
                      : '#6b7280'
                }
                strokeWidth="3"
                strokeDasharray={`${(promise.progress / 100) * 94.25} 94.25`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-gray-300">
              {promise.progress}%
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ═══════════════════════════════════════════
   PAGE EXPORT (wrapped in Suspense for useSearchParams)
   ═══════════════════════════════════════════ */
export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <section className="public-section">
          <div className="public-shell">
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
            </div>
          </div>
        </section>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
