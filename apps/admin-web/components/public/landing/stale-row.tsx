import Link from 'next/link';
import type { GovernmentPromise } from '@/lib/data/promises';

export function StaleRow({
  commitment,
  locale,
}: {
  commitment: GovernmentPromise;
  locale: string;
}) {
  const title = locale === 'ne' && commitment.title_ne ? commitment.title_ne : commitment.title;
  const category = locale === 'ne' && commitment.category_ne ? commitment.category_ne : commitment.category;
  return (
    <Link
      href={`/explore/first-100-days/${commitment.slug}`}
      className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3 transition-colors duration-300 hover:bg-white/[0.04]"
    >
      <span className="min-w-0 truncate text-sm text-gray-400">{title}</span>
      <span className="shrink-0 text-[10px] uppercase tracking-wider text-gray-600">
        {category}
      </span>
    </Link>
  );
}
