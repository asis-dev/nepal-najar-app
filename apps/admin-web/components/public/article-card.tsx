'use client';

import { ExternalLink, CheckCircle2, XCircle, Minus } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { CardActions } from '@/components/public/card-actions';
import type { MockNewsArticle } from '@/lib/data/promises';

interface ArticleCardProps {
  article: MockNewsArticle;
}

const SOURCE_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  news: { bg: 'bg-blue-500/15', text: 'text-blue-400' },
  government: { bg: 'bg-purple-500/15', text: 'text-purple-400' },
  international: { bg: 'bg-cyan-500/15', text: 'text-cyan-400' },
  social: { bg: 'bg-pink-500/15', text: 'text-pink-400' },
};

const CLASSIFICATION_STYLES: Record<string, { border: string; icon: React.ElementType; text: string; label: string; label_ne: string }> = {
  confirms: {
    border: 'border-l-emerald-500/50',
    icon: CheckCircle2,
    text: 'text-emerald-400',
    label: 'Confirms',
    label_ne: 'पुष्टि गर्छ',
  },
  contradicts: {
    border: 'border-l-red-500/50',
    icon: XCircle,
    text: 'text-red-400',
    label: 'Contradicts',
    label_ne: 'खण्डन गर्छ',
  },
  neutral: {
    border: 'border-l-gray-500/30',
    icon: Minus,
    text: 'text-gray-500',
    label: 'Neutral',
    label_ne: 'तटस्थ',
  },
};

function getRelativeTime(dateStr: string, locale: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (locale === 'ne') {
    if (diffHours < 1) return 'अहिले';
    if (diffHours < 24) return `${diffHours} घण्टा अगाडि`;
    if (diffDays === 1) return 'हिजो';
    if (diffDays < 7) return `${diffDays} दिन अगाडि`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} हप्ता अगाडि`;
    return `${Math.floor(diffDays / 30)} महिना अगाडि`;
  }

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

export function ArticleCard({ article }: ArticleCardProps) {
  const { locale } = useI18n();
  const sourceColor = SOURCE_TYPE_COLORS[article.source_type] ?? SOURCE_TYPE_COLORS.news;
  const classification = CLASSIFICATION_STYLES[article.classification] ?? CLASSIFICATION_STYLES.neutral;
  const ClassIcon = classification.icon;

  const headline = locale === 'ne' ? article.headline_ne : article.headline;
  const excerpt = locale === 'ne' ? article.excerpt_ne : article.excerpt;
  const relativeTime = getRelativeTime(article.published_at, locale);

  return (
    <a
      href={article.source_url}
      target="_blank"
      rel="noopener noreferrer"
      className={`block glass-card-hover border-l-2 ${classification.border} p-4 transition-all duration-200`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Source badge */}
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium ${sourceColor.bg} ${sourceColor.text}`}>
            {article.source_name}
          </span>
          {/* Classification */}
          <span className={`inline-flex items-center gap-1 text-[10px] ${classification.text}`}>
            <ClassIcon className="w-3 h-3" />
            {locale === 'ne' ? classification.label_ne : classification.label}
          </span>
        </div>
        <span className="text-[10px] text-gray-600 whitespace-nowrap flex-shrink-0">
          {relativeTime}
        </span>
      </div>

      {/* Headline */}
      <h4 className="text-sm font-medium text-gray-200 mb-2 line-clamp-2 group-hover:text-white transition-colors">
        {headline}
      </h4>

      {/* Excerpt */}
      <p className="text-xs text-gray-500 line-clamp-2 mb-3">
        {excerpt}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        {/* Confidence */}
        <div className="flex items-center gap-2">
          <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-primary-500/50"
              style={{ width: `${article.confidence * 100}%` }}
            />
          </div>
          <span className="text-[9px] text-gray-600">
            {Math.round(article.confidence * 100)}%
          </span>
        </div>

        <div className="flex items-center gap-2">
          <CardActions
            shareTitle={headline || article.headline}
            shareUrl={article.source_url}
            shareText={excerpt || article.excerpt}
            size="sm"
          />
          <span className="text-[10px] text-primary-400 flex items-center gap-1">
            {locale === 'ne' ? 'पूरा पढ्नुहोस्' : 'Read full article'}
            <ExternalLink className="w-3 h-3" />
          </span>
        </div>
      </div>
    </a>
  );
}
