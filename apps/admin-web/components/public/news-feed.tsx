'use client';

import { useState } from 'react';
import { Newspaper, Loader2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { ArticleCard } from './article-card';
import type { MockNewsArticle } from '@/lib/data/promises';

interface NewsFeedProps {
  articles: MockNewsArticle[];
  loading?: boolean;
  title?: string;
  emptyMessage?: string;
  /** How many to show initially */
  initialCount?: number;
  /** How many to load per "Load More" click */
  batchSize?: number;
}

export function NewsFeed({
  articles,
  loading = false,
  title,
  emptyMessage,
  initialCount = 5,
  batchSize = 5,
}: NewsFeedProps) {
  const { locale } = useI18n();
  const [visibleCount, setVisibleCount] = useState(initialCount);

  const visibleArticles = articles.slice(0, visibleCount);
  const hasMore = visibleCount < articles.length;

  const defaultTitle = locale === 'ne' ? 'सम्बन्धित समाचार' : 'Related News';
  const defaultEmpty = locale === 'ne' ? 'कुनै समाचार भेटिएन' : 'No news articles found';
  const loadMoreLabel = locale === 'ne' ? 'थप लोड गर्नुहोस्' : 'Load More';

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Newspaper className="w-4 h-4 text-primary-400" />
        <h3 className="text-base font-semibold text-gray-200">
          {title || defaultTitle}
        </h3>
        {articles.length > 0 && (
          <span className="text-xs text-gray-600 ml-auto">
            {articles.length} {locale === 'ne' ? 'लेख' : 'articles'}
          </span>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && articles.length === 0 && (
        <div className="glass-card p-8 text-center">
          <Newspaper className="w-8 h-8 text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500">{emptyMessage || defaultEmpty}</p>
        </div>
      )}

      {/* Article list */}
      {!loading && visibleArticles.length > 0 && (
        <div className="space-y-3">
          {visibleArticles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}

      {/* Load More */}
      {hasMore && (
        <button
          onClick={() => setVisibleCount((c) => c + batchSize)}
          className="w-full mt-4 py-3 rounded-xl text-sm text-gray-400 hover:text-gray-200 border border-white/10 hover:border-white/20 hover:bg-white/[0.03] transition-all duration-200"
        >
          {loadMoreLabel} ({articles.length - visibleCount} {locale === 'ne' ? 'बाँकी' : 'remaining'})
        </button>
      )}
    </div>
  );
}
