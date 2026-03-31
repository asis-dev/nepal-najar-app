'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, BookOpen, Scale, AlertTriangle, ChevronDown, ChevronRight, FileText } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useConstitutionArticles, type ConstitutionArticleSummary } from '@/lib/hooks/use-constitution';

// ── Part color mapping ────────────────────────────────────────────────────

const PART_COLORS: Record<number, string> = {
  1: 'border-slate-500/30',
  2: 'border-blue-500/30',
  3: 'border-emerald-500/30',
  4: 'border-purple-500/30',
  5: 'border-amber-500/30',
  6: 'border-rose-500/30',
  7: 'border-red-500/30',
  8: 'border-indigo-500/30',
  9: 'border-indigo-500/30',
  10: 'border-amber-500/30',
  11: 'border-cyan-500/30',
};

function getPartColor(part: number): string {
  return PART_COLORS[part] || 'border-white/10';
}

// ── Tag badge component ──────────────────────────────────────────────────

function TagBadge({ tag }: { tag: string }) {
  return (
    <span className="inline-block rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-white/50">
      {tag}
    </span>
  );
}

// ── Article card ─────────────────────────────────────────────────────────

function ArticleCard({ article, locale }: { article: ConstitutionArticleSummary; locale: string }) {
  const title = locale === 'ne' ? article.article_title_ne : article.article_title;
  const linkedCount = article.linked_promise_ids?.length || 0;

  return (
    <Link
      href={`/constitution/${article.article_number}`}
      className={`block border-l-2 ${getPartColor(article.part_number)} bg-white/[0.02] p-3 transition-colors hover:bg-white/[0.05]`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="shrink-0 rounded bg-white/[0.08] px-1.5 py-0.5 text-[11px] font-medium text-white/60">
              {article.article_number}
            </span>
            <h3 className="truncate text-sm font-medium text-white/90">{title}</h3>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {article.tags?.slice(0, 3).map((tag) => (
              <TagBadge key={tag} tag={tag} />
            ))}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {linkedCount > 0 && (
            <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] text-blue-400">
              {linkedCount} commitment{linkedCount !== 1 ? 's' : ''}
            </span>
          )}
          {article.is_amended && (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-400">
              amended
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ── Main page ────────────────────────────────────────────────────────────

export default function ConstitutionPage() {
  const { locale } = useI18n();
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [expandedParts, setExpandedParts] = useState<Set<number>>(new Set());

  const { data: articles, isLoading } = useConstitutionArticles({
    search: search || undefined,
    tag: selectedTag || undefined,
  });

  // Group by part
  const grouped = useMemo(() => {
    if (!articles) return [];
    const parts = new Map<number, { title: string; titleNe: string; articles: ConstitutionArticleSummary[] }>();
    for (const a of articles) {
      if (!parts.has(a.part_number)) {
        parts.set(a.part_number, {
          title: a.part_title,
          titleNe: a.part_title_ne,
          articles: [],
        });
      }
      parts.get(a.part_number)!.articles.push(a);
    }
    return Array.from(parts.entries()).sort((a, b) => a[0] - b[0]);
  }, [articles]);

  // Collect all unique tags
  const allTags = useMemo(() => {
    if (!articles) return [];
    const tags = new Set<string>();
    for (const a of articles) {
      for (const t of a.tags || []) tags.add(t);
    }
    return Array.from(tags).sort();
  }, [articles]);

  const togglePart = (part: number) => {
    setExpandedParts((prev) => {
      const next = new Set(prev);
      if (next.has(part)) next.delete(part);
      else next.add(part);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedParts(new Set(grouped.map(([p]) => p)));
  };

  const totalArticles = articles?.length || 0;
  const amendedCount = articles?.filter((a) => a.is_amended).length || 0;
  const linkedCount = articles?.filter((a) => (a.linked_promise_ids?.length || 0) > 0).length || 0;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-white/50 text-xs mb-2">
          <Scale className="h-3.5 w-3.5" />
          <span>{locale === 'ne' ? 'नेपालको संविधान' : "Nepal's Constitution"}</span>
        </div>
        <h1 className="text-2xl font-bold text-white">
          {locale === 'ne' ? 'संविधान २०७२' : 'Constitution of Nepal, 2015'}
        </h1>
        <p className="mt-1 text-sm text-white/50">
          {locale === 'ne'
            ? `${totalArticles} धारा · ${amendedCount} संशोधित · ${linkedCount} प्रतिबद्धतासँग जोडिएको`
            : `${totalArticles} articles · ${amendedCount} amended · ${linkedCount} linked to commitments`}
        </p>
      </div>

      {/* Stats strip */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-white/[0.04] p-3 text-center">
          <div className="text-lg font-bold text-white">{totalArticles}</div>
          <div className="text-[10px] text-white/40">{locale === 'ne' ? 'धारा' : 'Articles'}</div>
        </div>
        <div className="rounded-lg bg-white/[0.04] p-3 text-center">
          <div className="text-lg font-bold text-amber-400">{amendedCount}</div>
          <div className="text-[10px] text-white/40">{locale === 'ne' ? 'संशोधित' : 'Amended'}</div>
        </div>
        <div className="rounded-lg bg-white/[0.04] p-3 text-center">
          <div className="text-lg font-bold text-blue-400">{linkedCount}</div>
          <div className="text-[10px] text-white/40">{locale === 'ne' ? 'जोडिएको' : 'Linked'}</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={locale === 'ne' ? 'धारा खोज्नुहोस्...' : 'Search articles...'}
          className="w-full rounded-lg border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:border-blue-500/50 focus:outline-none"
        />
      </div>

      {/* Tag filters */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        <button
          onClick={() => setSelectedTag(null)}
          className={`rounded-full px-2.5 py-1 text-[11px] transition-colors ${
            !selectedTag ? 'bg-blue-500/20 text-blue-400' : 'bg-white/[0.06] text-white/40 hover:text-white/60'
          }`}
        >
          {locale === 'ne' ? 'सबै' : 'All'}
        </button>
        {allTags.slice(0, 12).map((tag) => (
          <button
            key={tag}
            onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
            className={`rounded-full px-2.5 py-1 text-[11px] transition-colors ${
              selectedTag === tag ? 'bg-blue-500/20 text-blue-400' : 'bg-white/[0.06] text-white/40 hover:text-white/60'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Expand all button */}
      <div className="mb-3 flex justify-end">
        <button onClick={expandAll} className="text-[11px] text-white/40 hover:text-white/60">
          {locale === 'ne' ? 'सबै विस्तार गर्नुहोस्' : 'Expand all'}
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="py-12 text-center text-sm text-white/30">
          {locale === 'ne' ? 'लोड हुँदैछ...' : 'Loading constitution...'}
        </div>
      )}

      {/* Grouped articles */}
      <div className="space-y-2">
        {grouped.map(([partNum, { title, titleNe, articles: partArticles }]) => {
          const isExpanded = expandedParts.has(partNum);
          return (
            <div key={partNum} className="overflow-hidden rounded-lg border border-white/[0.06]">
              <button
                onClick={() => togglePart(partNum)}
                className="flex w-full items-center gap-3 bg-white/[0.03] p-3 text-left transition-colors hover:bg-white/[0.05]"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-white/40" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-white/40" />
                )}
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] text-white/40">
                    {locale === 'ne' ? `भाग ${partNum}` : `Part ${partNum}`}
                  </span>
                  <h2 className="truncate text-sm font-medium text-white/80">
                    {locale === 'ne' ? titleNe : title}
                  </h2>
                </div>
                <span className="shrink-0 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-white/40">
                  {partArticles.length}
                </span>
              </button>
              {isExpanded && (
                <div className="divide-y divide-white/[0.04]">
                  {partArticles.map((article) => (
                    <ArticleCard key={article.id} article={article} locale={locale} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {!isLoading && totalArticles === 0 && (
        <div className="py-12 text-center">
          <FileText className="mx-auto mb-3 h-8 w-8 text-white/20" />
          <p className="text-sm text-white/40">
            {locale === 'ne' ? 'कुनै धारा फेला परेन' : 'No articles found'}
          </p>
        </div>
      )}
    </div>
  );
}
