import type { Metadata } from 'next';
import { createMetadata } from '@/lib/seo';
import { getSupabase } from '@/lib/supabase/server';

interface Props {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}

function slugifyName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function compactText(value?: string, max = 180) {
  const text = (value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  try {
    const db = getSupabase();
    const { data } = await db
      .from('government_roster')
      .select('name, name_ne, title, title_ne, ministry')
      .eq('is_current', true);

    const minister = (data || []).find((m) => slugifyName(String(m.name || '')) === slug);
    if (!minister) {
      return createMetadata({ title: 'Minister Not Found', path: `/ministers/${slug}` });
    }

    const name = String(minister.name_ne || minister.name || 'Cabinet Minister');
    const title = String(minister.title_ne || minister.title || 'Minister');
    const ministry = String(minister.ministry || '');
    const pageTitle = `${name} — ${title}`;
    const subtitle = ministry
      ? `${title} · ${ministry} · AI-tracked activity`
      : `${title} · AI-tracked activity`;
    const description = compactText(
      `${pageTitle}. Weekly accountability signals, commitment ownership, and evidence from public sources.`,
      220,
    );

    return createMetadata({
      title: pageTitle,
      description,
      path: `/ministers/${slug}`,
      ogImage: `/api/og/minister?slug=${encodeURIComponent(slug)}&format=card`,
    });
  } catch {
    return createMetadata({
      title: 'Cabinet Minister',
      description: 'Track weekly minister activity and accountability signals on Nepal Republic.',
      path: `/ministers/${slug}`,
      ogImage: '/api/og?section=report',
    });
  }
}

export default function MinisterDetailLayout({ children }: Props) {
  return children;
}
