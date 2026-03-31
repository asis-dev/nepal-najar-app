'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Scale, BookOpen, AlertTriangle, ExternalLink, Clock } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useConstitutionArticle } from '@/lib/hooks/use-constitution';
import { useAllPromises } from '@/lib/hooks/use-promises';
import { GhantiIcon } from '@/components/ui/ghanti-icon';

export default function ConstitutionArticlePage() {
  const { article: articleParam } = useParams<{ article: string }>();
  const articleNumber = Number(articleParam);
  const { locale } = useI18n();
  const { data: article, isLoading } = useConstitutionArticle(articleNumber);
  const { data: promises } = useAllPromises({ publicOnly: true });

  // Get linked commitments
  const linkedPromises = (promises || []).filter((p) =>
    article?.linked_promise_ids?.includes(Number(p.id)),
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-6">
        <div className="py-12 text-center text-sm text-white/30">
          {locale === 'ne' ? 'लोड हुँदैछ...' : 'Loading article...'}
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-6">
        <div className="py-12 text-center">
          <p className="text-sm text-white/40">Article {articleNumber} not found</p>
          <Link href="/constitution" className="mt-2 inline-block text-sm text-blue-400 hover:underline">
            {locale === 'ne' ? 'संविधानमा फर्कनुहोस्' : 'Back to Constitution'}
          </Link>
        </div>
      </div>
    );
  }

  const title = locale === 'ne' ? (article.article_title_ne || article.article_title) : article.article_title;
  const partTitle = locale === 'ne' ? (article.part_title_ne || article.part_title) : article.part_title;
  const body = locale === 'ne' ? (article.body_ne || article.body_en) : article.body_en;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-6">
      {/* Back nav */}
      <Link
        href="/constitution"
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/60"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {locale === 'ne' ? 'संविधानमा फर्कनुहोस्' : 'Back to Constitution'}
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-white/40 text-[11px] mb-1">
          <Scale className="h-3 w-3" />
          <span>
            {locale === 'ne' ? `भाग ${article.part_number}` : `Part ${article.part_number}`} · {partTitle}
          </span>
        </div>
        <h1 className="text-xl font-bold text-white">
          {locale === 'ne' ? `धारा ${article.article_number}` : `Article ${article.article_number}`}
        </h1>
        <h2 className="mt-1 text-base text-white/70">{title}</h2>

        {/* Tags */}
        <div className="mt-2 flex flex-wrap gap-1">
          {article.tags?.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-white/50"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Amendment badge */}
        {article.is_amended && (
          <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-medium">
              <AlertTriangle className="h-3.5 w-3.5" />
              {locale === 'ne' ? 'यो धारा संशोधित भएको छ' : 'This article has been amended'}
            </div>
            {article.amendment_note && (
              <p className="mt-1 text-xs text-white/50">{article.amendment_note}</p>
            )}
            {article.amendment_date && (
              <div className="mt-1 flex items-center gap-1 text-[10px] text-white/30">
                <Clock className="h-3 w-3" />
                {article.amendment_date}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Article text */}
      <div className="mb-6 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="flex items-center gap-2 text-xs text-white/40 mb-3">
          <BookOpen className="h-3.5 w-3.5" />
          {locale === 'ne' ? 'धाराको पाठ' : 'Article Text'}
        </div>
        <div className="prose prose-sm prose-invert max-w-none text-white/80 leading-relaxed whitespace-pre-wrap">
          {body}
        </div>
      </div>

      {/* Bilingual toggle - show the other language */}
      {article.body_ne && article.body_en && (
        <details className="mb-6 rounded-lg border border-white/[0.06]">
          <summary className="cursor-pointer p-3 text-xs text-white/40 hover:text-white/60">
            {locale === 'ne' ? 'Show English text' : 'नेपाली पाठ देखाउनुहोस्'}
          </summary>
          <div className="border-t border-white/[0.04] p-4 text-sm text-white/60 leading-relaxed whitespace-pre-wrap">
            {locale === 'ne' ? article.body_en : article.body_ne}
          </div>
        </details>
      )}

      {/* Related commitments */}
      {linkedPromises.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-medium text-white/70">
            {locale === 'ne' ? 'सम्बन्धित प्रतिबद्धता' : 'Related Commitments'}
            <span className="ml-1.5 text-white/30">({linkedPromises.length})</span>
          </h3>
          <div className="space-y-2">
            {linkedPromises.map((p) => (
              <Link
                key={p.id}
                href={`/explore/first-100-days/${p.slug || p.id}`}
                className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 transition-colors hover:bg-white/[0.05]"
              >
                <GhantiIcon
                  color={p.status === 'stalled' ? 'red' : p.status === 'in_progress' ? 'blue' : 'muted'}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-white/80">
                    {locale === 'ne' ? (p.title_ne || p.title) : p.title}
                  </p>
                  <p className="text-[10px] text-white/40">{p.category} · {p.progress}%</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between border-t border-white/[0.06] pt-4">
        {articleNumber > 1 ? (
          <Link
            href={`/constitution/${articleNumber - 1}`}
            className="text-xs text-white/40 hover:text-white/60"
          >
            ← {locale === 'ne' ? `धारा ${articleNumber - 1}` : `Article ${articleNumber - 1}`}
          </Link>
        ) : (
          <span />
        )}
        {articleNumber < 308 && (
          <Link
            href={`/constitution/${articleNumber + 1}`}
            className="text-xs text-white/40 hover:text-white/60"
          >
            {locale === 'ne' ? `धारा ${articleNumber + 1}` : `Article ${articleNumber + 1}`} →
          </Link>
        )}
      </div>
    </div>
  );
}
