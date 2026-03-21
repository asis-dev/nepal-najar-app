/**
 * RSS Feed Collector
 * Fetches and parses RSS/Atom feeds from news sites
 * More reliable than HTML scraping for news sources
 */
import { getSupabase } from '@/lib/supabase/server';

interface RSSItem {
  title: string;
  link: string;
  description?: string;
  pubDate?: string;
  author?: string;
  categories?: string[];
}

interface RSSSource {
  id: string;
  name: string;
  feedUrl: string;
  relatedPromiseIds: number[];
}

// Nepal news RSS feeds
export const RSS_FEEDS: RSSSource[] = [
  // ✅ Confirmed working (English)
  {
    id: 'rss-kathmandu-post',
    name: 'Kathmandu Post',
    feedUrl: 'https://kathmandupost.com/rss',
    relatedPromiseIds: [],
  },
  {
    id: 'rss-online-khabar-en',
    name: 'Online Khabar (EN)',
    feedUrl: 'https://english.onlinekhabar.com/feed',
    relatedPromiseIds: [],
  },
  {
    id: 'rss-khabarhub-en',
    name: 'Khabarhub (EN)',
    feedUrl: 'https://english.khabarhub.com/feed/',
    relatedPromiseIds: [],
  },
  {
    id: 'rss-ratopati-en',
    name: 'Ratopati (EN)',
    feedUrl: 'https://english.ratopati.com/feed',
    relatedPromiseIds: [],
  },
  // ✅ Confirmed working (Nepali)
  {
    id: 'rss-setopati-ne',
    name: 'Setopati (NE)',
    feedUrl: 'https://setopati.com/feed',
    relatedPromiseIds: [],
  },
];

function parseXML(xml: string): RSSItem[] {
  const items: RSSItem[] = [];

  // Simple regex-based XML parsing (no dependency needed)
  // Match both RSS <item> and Atom <entry> formats
  const itemRegex =
    /<item>([\s\S]*?)<\/item>|<entry>([\s\S]*?)<\/entry>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1] || match[2] || '';

    const title = extractTag(block, 'title');
    const link =
      extractTag(block, 'link') || extractAttr(block, 'link', 'href');
    const description =
      extractTag(block, 'description') ||
      extractTag(block, 'summary') ||
      extractTag(block, 'content');
    const pubDate =
      extractTag(block, 'pubDate') ||
      extractTag(block, 'published') ||
      extractTag(block, 'updated');
    const author =
      extractTag(block, 'author') || extractTag(block, 'dc:creator');

    // Extract categories
    const categories: string[] = [];
    const catRegex =
      /<category[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/category>/gi;
    let catMatch;
    while ((catMatch = catRegex.exec(block)) !== null) {
      categories.push(catMatch[1].trim());
    }

    if (title && link) {
      items.push({
        title: cleanCDATA(title),
        link: cleanCDATA(link),
        description: description
          ? cleanCDATA(description).slice(0, 1000)
          : undefined,
        pubDate: pubDate || undefined,
        author: author ? cleanCDATA(author) : undefined,
        categories: categories.length > 0 ? categories : undefined,
      });
    }
  }

  return items;
}

function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp(
    `<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`,
    'i',
  );
  const match = regex.exec(xml);
  return match ? match[1].trim() : null;
}

function extractAttr(
  xml: string,
  tag: string,
  attr: string,
): string | null {
  const regex = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 'i');
  const match = regex.exec(xml);
  return match ? match[1] : null;
}

function cleanCDATA(text: string): string {
  return text
    .replace(/<!\[CDATA\[/g, '')
    .replace(/\]\]>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim();
}

export async function collectRSS(
  source: RSSSource,
): Promise<{
  items: RSSItem[];
  errors: string[];
}> {
  const errors: string[] = [];

  try {
    const res = await fetch(source.feedUrl, {
      headers: {
        'User-Agent':
          'NepalNajar/2.0 (intelligence-engine; +https://nepalnajar.com)',
        Accept:
          'application/rss+xml, application/xml, text/xml, application/atom+xml',
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      errors.push(`${source.name}: HTTP ${res.status}`);
      return { items: [], errors };
    }

    const xml = await res.text();
    const items = parseXML(xml);

    return { items, errors };
  } catch (err) {
    errors.push(
      `${source.name}: ${err instanceof Error ? err.message : 'unknown error'}`,
    );
    return { items: [], errors };
  }
}

export async function collectAllRSS(): Promise<{
  totalItems: number;
  newItems: number;
  errors: string[];
}> {
  const supabase = getSupabase();
  let totalItems = 0;
  let newItems = 0;
  const allErrors: string[] = [];

  for (const source of RSS_FEEDS) {
    const { items, errors } = await collectRSS(source);
    allErrors.push(...errors);
    totalItems += items.length;

    for (const item of items) {
      // Upsert as intelligence signal
      const { error } = await supabase
        .from('intelligence_signals')
        .upsert(
          {
            source_id: source.id,
            signal_type: 'article',
            external_id: item.link,
            title: item.title,
            content: item.description || null,
            url: item.link,
            author: item.author || null,
            published_at: item.pubDate
              ? new Date(item.pubDate).toISOString()
              : null,
            discovered_at: new Date().toISOString(),
            language: 'en',
            media_type: 'text',
            metadata: { categories: item.categories || [] },
          },
          {
            onConflict: 'source_id,external_id',
            ignoreDuplicates: true,
          },
        );

      if (!error) newItems++;
    }

    // Update source last_checked
    await supabase.from('intelligence_sources').upsert(
      {
        id: source.id,
        name: source.name,
        source_type: 'rss' as const,
        url: source.feedUrl,
        related_promise_ids: source.relatedPromiseIds,
        is_active: true,
        last_checked_at: new Date().toISOString(),
        ...(items.length > 0
          ? { last_found_at: new Date().toISOString() }
          : {}),
      },
      { onConflict: 'id' },
    );

    // Be polite
    await new Promise((r) => setTimeout(r, 500));
  }

  return { totalItems, newItems, errors: allErrors };
}
